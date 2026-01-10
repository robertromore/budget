import { CategoryMatcher } from "$lib/server/import/matchers/category-matcher";
import { PayeeMatcher } from "$lib/server/import/matchers/payee-matcher";
import { PayeeAliasService } from "$lib/server/domains/payees/alias-service";
import { getCategoryAliasService } from "$lib/server/domains/categories/alias-service";
import { db } from "$lib/server/db";
import { payees, categories } from "$lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ImportRow } from "$lib/types/import";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Minimum confidence threshold for using a category alias
// A single dismissal (0.25 reduction) drops a 1.0 alias to 0.75, below this threshold
const CATEGORY_ALIAS_MIN_CONFIDENCE = 0.9;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rows, workspaceId } = (await request.json()) as {
      rows: ImportRow[];
      workspaceId?: number;
    };

    console.log(`[CategoryInfer] Received request: ${rows?.length || 0} rows, workspaceId=${workspaceId}`);

    if (!rows || !Array.isArray(rows)) {
      return json({ error: "Invalid request: rows array required" }, { status: 400 });
    }

    if (!workspaceId) {
      console.warn("[CategoryInfer] No workspaceId provided - category alias checks will be skipped!");
    }

    // Initialize matchers and services
    const categoryMatcher = new CategoryMatcher();
    const payeeMatcher = new PayeeMatcher();
    const aliasService = workspaceId ? new PayeeAliasService() : null;
    const categoryAliasService = workspaceId ? getCategoryAliasService() : null;

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

    // Reverse lookup: category name (lowercase) -> category ID
    const categoryNameToId = new Map<string, number>();
    for (const [id, name] of categoryMap) {
      categoryNameToId.set(name.toLowerCase(), id);
    }

    // Track payee-to-category mappings to ensure consistency within this import
    const payeeCategoryMap = new Map<string, { categoryName: string; categoryId?: number; confidence?: number }>();

    // Track alias matches to apply consistently (raw string -> payee info)
    const aliasMatchCache = new Map<
      string,
      { payeeId: number; payeeName: string; defaultCategoryId: number | null } | null
    >();

    // Track category alias matches (raw string -> category info with confidence)
    const categoryAliasCache = new Map<
      string,
      { categoryId: number; categoryName: string; confidence: number } | null
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
                updates["inferredCategoryId"] = aliasMatch.defaultCategoryId;
                updates["categoryFromPayeeDefault"] = true;
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
          const rawPayeeString = (updates["originalPayee"] || data["originalPayee"] || originalPayee || normalizedPayee) as string;

          // Check if we've already assigned a category to this payee in this import
          if (normalizedPayee && payeeCategoryMap.has(normalizedPayee)) {
            const existingMatch = payeeCategoryMap.get(normalizedPayee)!;
            updates["category"] = existingMatch.categoryName;
            updates["inferredCategory"] = existingMatch.categoryName;
            if (existingMatch.categoryId) {
              updates["inferredCategoryId"] = existingMatch.categoryId;
            }
            if (existingMatch.confidence !== undefined) {
              updates["categoryConfidence"] = existingMatch.confidence;
            }
          } else {
            // First time seeing this payee - check category aliases first (respects dismissals)
            let foundCategoryFromAlias = false;

            if (categoryAliasService && workspaceId && rawPayeeString) {
              // Check cache first
              let aliasMatch = categoryAliasCache.get(rawPayeeString);
              if (aliasMatch === undefined) {
                // Not in cache, look up
                const match = await categoryAliasService.matchWithAlias(rawPayeeString, workspaceId);
                if (match.found && match.categoryId) {
                  if (match.confidence >= CATEGORY_ALIAS_MIN_CONFIDENCE) {
                    const categoryName = categoryMap.get(match.categoryId);
                    if (categoryName) {
                      aliasMatch = {
                        categoryId: match.categoryId,
                        categoryName,
                        confidence: match.confidence,
                      };
                    } else {
                      aliasMatch = null;
                    }
                  } else {
                    // Alias found but confidence too low (user dismissed it)
                    console.log(
                      `[CategoryInfer] Skipping low-confidence alias for "${rawPayeeString}": ` +
                      `confidence ${match.confidence.toFixed(2)} < ${CATEGORY_ALIAS_MIN_CONFIDENCE}`
                    );
                    aliasMatch = null;
                  }
                } else {
                  // No alias found
                  aliasMatch = null;
                }
                categoryAliasCache.set(rawPayeeString, aliasMatch);
              }

              if (aliasMatch) {
                updates["category"] = aliasMatch.categoryName;
                updates["inferredCategory"] = aliasMatch.categoryName;
                updates["inferredCategoryId"] = aliasMatch.categoryId;
                updates["categoryConfidence"] = aliasMatch.confidence;
                updates["categoryMatchedByAlias"] = true;
                foundCategoryFromAlias = true;

                // Remember this payee-category mapping
                if (normalizedPayee) {
                  payeeCategoryMap.set(normalizedPayee, {
                    categoryName: aliasMatch.categoryName,
                    categoryId: aliasMatch.categoryId,
                    confidence: aliasMatch.confidence,
                  });
                }
              }
            }

            // Fall back to keyword matching if no alias found or confidence too low
            if (!foundCategoryFromAlias) {
              console.log(`[CategoryInfer] Keyword matching for row, rawPayeeString="${rawPayeeString}", normalizedPayee="${normalizedPayee}"`);

              const description = (updates["notes"] || data["notes"] || data["description"]) as string;

              // Build category array for the matcher
              const categoriesForMatcher = Array.from(categoryMap.entries()).map(([id, name]) => ({
                id,
                name,
              }));

              // Try to find a matching category using keyword patterns against actual categories
              const match = categoryMatcher.findBestMatch(
                {
                  payeeName: normalizedPayee,
                  description,
                },
                categoriesForMatcher as any
              );

              let suggestedCategoryId: number | undefined;
              let suggestedCategoryName: string | null = null;

              if (match.category && match.score >= 0.7) {
                // Found a direct match with user's categories
                suggestedCategoryId = match.category.id;
                suggestedCategoryName = match.category.name;
                console.log(`[CategoryInfer] Keyword matcher found category: "${suggestedCategoryName}" (ID: ${suggestedCategoryId}) with score ${match.score}`);
              } else {
                // Fall back to pattern-based suggestion (returns hardcoded category names)
                suggestedCategoryName = categoryMatcher.suggestCategoryName({
                  ...(normalizedPayee && { payeeName: normalizedPayee }),
                  ...(description && { description }),
                });

                if (suggestedCategoryName) {
                  console.log(`[CategoryInfer] Keyword matcher suggested pattern: "${suggestedCategoryName}"`);
                  // Try to find matching category ID
                  suggestedCategoryId = categoryNameToId.get(suggestedCategoryName.toLowerCase());
                  if (!suggestedCategoryId) {
                    // Try partial matching
                    const suggestedLower = suggestedCategoryName.toLowerCase();
                    for (const [name, id] of categoryNameToId) {
                      // Check if names overlap (e.g., "auto" matches "auto & transport")
                      const words1 = suggestedLower.split(/[&\s]+/).filter(w => w.length > 2);
                      const words2 = name.split(/[&\s]+/).filter(w => w.length > 2);
                      const hasOverlap = words1.some(w1 => words2.some(w2 => w1.includes(w2) || w2.includes(w1)));
                      if (hasOverlap) {
                        suggestedCategoryId = id;
                        // Update name to actual category name
                        const actualName = categoryMap.get(id);
                        if (actualName) suggestedCategoryName = actualName;
                        console.log(`[CategoryInfer] Partial match: pattern "${suggestedCategoryName}" -> category ID ${id}`);
                        break;
                      }
                    }
                    if (!suggestedCategoryId) {
                      console.log(`[CategoryInfer] No category ID found for pattern "${suggestedCategoryName}". Available:`,
                        Array.from(categoryNameToId.keys()).slice(0, 5));
                    }
                  }
                }
              }

              if (suggestedCategoryName && suggestedCategoryId) {
                // Check if user has dismissed this category for this payee string
                let isDismissed = false;
                if (categoryAliasService && workspaceId && rawPayeeString) {
                  isDismissed = await categoryAliasService.isCategoryDismissed(
                    rawPayeeString,
                    suggestedCategoryId,
                    workspaceId,
                    CATEGORY_ALIAS_MIN_CONFIDENCE
                  );
                  if (isDismissed) {
                    console.log(
                      `[CategoryInfer] Category "${suggestedCategoryName}" was previously dismissed for "${rawPayeeString}"`
                    );
                  }
                }

                if (!isDismissed) {
                  updates["category"] = suggestedCategoryName;
                  updates["inferredCategory"] = suggestedCategoryName;
                  updates["inferredCategoryId"] = suggestedCategoryId;
                  // Remember this payee-category mapping
                  if (normalizedPayee) {
                    payeeCategoryMap.set(normalizedPayee, {
                      categoryName: suggestedCategoryName,
                      categoryId: suggestedCategoryId
                    });
                  }
                }
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
