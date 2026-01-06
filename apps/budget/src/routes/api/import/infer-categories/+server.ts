import { CategoryMatcher } from "$lib/server/import/matchers/category-matcher";
import { PayeeMatcher } from "$lib/server/import/matchers/payee-matcher";
import { PayeeAliasService } from "$lib/server/domains/payees/alias-service";
import { db } from "$lib/server/db";
import { payees, categories } from "$lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ImportRow } from "$lib/types/import";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rows, workspaceId } = (await request.json()) as {
      rows: ImportRow[];
      workspaceId?: number;
    };

    if (!rows || !Array.isArray(rows)) {
      return json({ error: "Invalid request: rows array required" }, { status: 400 });
    }

    // Initialize matchers and services
    const categoryMatcher = new CategoryMatcher();
    const payeeMatcher = new PayeeMatcher();
    const aliasService = workspaceId ? new PayeeAliasService() : null;

    // Pre-fetch payees and categories for the workspace if workspaceId is provided
    let payeeMap = new Map<number, { name: string; defaultCategoryId: number | null }>();
    let categoryMap = new Map<number, string>();

    if (workspaceId) {
      // Fetch all active payees
      const workspacePayees = await db
        .select({
          id: payees.id,
          name: payees.name,
          defaultCategoryId: payees.defaultCategoryId,
        })
        .from(payees)
        .where(and(eq(payees.workspaceId, workspaceId), isNull(payees.deletedAt)));

      for (const p of workspacePayees) {
        if (p.name) {
          payeeMap.set(p.id, { name: p.name, defaultCategoryId: p.defaultCategoryId });
        }
      }

      // Fetch all active categories
      const workspaceCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
        })
        .from(categories)
        .where(and(eq(categories.workspaceId, workspaceId), isNull(categories.deletedAt)));

      for (const c of workspaceCategories) {
        if (c.name) {
          categoryMap.set(c.id, c.name);
        }
      }
    }

    // Track payee-to-category mappings to ensure consistency within this import
    const payeeCategoryMap = new Map<string, string>();

    // Track alias matches to apply consistently (raw string -> payee info)
    const aliasMatchCache = new Map<
      string,
      { payeeId: number; payeeName: string; defaultCategoryId: number | null } | null
    >();

    // Process each row: check aliases, normalize payee names, and infer categories
    const updatedRows = await Promise.all(
      rows.map(async (row) => {
        const data = row.normalizedData;
        const updates: Record<string, any> = {};

        // Get the original payee from the data
        const originalPayee = data["payee"] as string | undefined;

        if (originalPayee && typeof originalPayee === "string") {
          // First, check if we have an alias for this exact string
          let aliasMatch: { payeeId: number; payeeName: string; defaultCategoryId: number | null } | null =
            null;

          if (aliasService && workspaceId) {
            // Check cache first
            if (aliasMatchCache.has(originalPayee)) {
              aliasMatch = aliasMatchCache.get(originalPayee)!;
            } else {
              // Look up alias
              const match = await aliasService.matchWithAlias(originalPayee, workspaceId);
              if (match.found && match.payeeId) {
                const payeeInfo = payeeMap.get(match.payeeId);
                if (payeeInfo) {
                  aliasMatch = {
                    payeeId: match.payeeId,
                    payeeName: payeeInfo.name,
                    defaultCategoryId: payeeInfo.defaultCategoryId,
                  };
                }
              }
              // Cache the result (even if null)
              aliasMatchCache.set(originalPayee, aliasMatch);
            }
          }

          if (aliasMatch) {
            // Use the alias match - set the payee name and ID
            updates["payee"] = aliasMatch.payeeName;
            updates["payeeId"] = aliasMatch.payeeId;
            updates["originalPayee"] = originalPayee;
            updates["matchedByAlias"] = true;

            // If no category is set and the payee has a default category, use it
            const hasCategory =
              data["category"] &&
              typeof data["category"] === "string" &&
              data["category"].trim().length > 0;

            if (!hasCategory && aliasMatch.defaultCategoryId) {
              const categoryName = categoryMap.get(aliasMatch.defaultCategoryId);
              if (categoryName) {
                updates["category"] = categoryName;
                updates["categoryId"] = aliasMatch.defaultCategoryId;
                updates["inferredCategory"] = categoryName;
              }
            }
          } else {
            // No alias found - normalize payee name and extract details
            const { name, details } = payeeMatcher.normalizePayeeName(originalPayee);
            updates["payee"] = name;
            updates["originalPayee"] = originalPayee;

            // Append details to notes/description if present
            if (details) {
              const existingNotes = (data["notes"] || data["description"] || "") as string;
              updates["payeeDetails"] = details;
              if (existingNotes) {
                updates["notes"] = `${existingNotes} (${details})`;
              } else {
                updates["notes"] = details;
              }
            }
          }
        }

        // Infer category if no explicit category is provided (and not already set from alias)
        const hasCategory =
          (updates["category"] || data["category"]) &&
          typeof (updates["category"] || data["category"]) === "string" &&
          (updates["category"] || data["category"]).trim().length > 0;

        if (
          !hasCategory &&
          (updates["payee"] || data["payee"] || data["notes"] || data["description"])
        ) {
          const normalizedPayee = (updates["payee"] || data["payee"]) as string;

          // Check if we've already assigned a category to this payee in this import
          if (normalizedPayee && payeeCategoryMap.has(normalizedPayee)) {
            const existingCategory = payeeCategoryMap.get(normalizedPayee)!;
            updates["category"] = existingCategory;
            updates["inferredCategory"] = existingCategory;
          } else {
            // First time seeing this payee, suggest a category
            const description = (updates["notes"] || data["notes"] || data["description"]) as string;
            const suggestedCategoryName = categoryMatcher.suggestCategoryName({
              ...(normalizedPayee && { payeeName: normalizedPayee }),
              ...(description && { description }),
            });

            if (suggestedCategoryName) {
              updates["category"] = suggestedCategoryName;
              updates["inferredCategory"] = suggestedCategoryName;
              // Remember this payee-category mapping
              if (normalizedPayee) {
                payeeCategoryMap.set(normalizedPayee, suggestedCategoryName);
              }
            }
          }
        }

        // Only return modified row if there were updates
        if (Object.keys(updates).length > 0) {
          return {
            ...row,
            normalizedData: {
              ...data,
              ...updates,
            },
          };
        }

        return row;
      })
    );

    return json({ rows: updatedRows });
  } catch (error) {
    console.error("Data enrichment error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to enrich import data",
      },
      { status: 500 }
    );
  }
};
