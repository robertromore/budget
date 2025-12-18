import { categories as categoryTable } from "$lib/schema/categories";
import { payees as payeeTable } from "$lib/schema/payees";
import { db } from "$lib/server/db";
import { CategoryMatcher } from "$lib/server/import/matchers/category-matcher";
import { PayeeMatcher } from "$lib/server/import/matchers/payee-matcher";
import type {
  CategoryPreview,
  ImportPreviewData,
  ImportRow,
  PayeePreview,
} from "$lib/types/import";
import { json } from "@sveltejs/kit";
import { isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rows } = (await request.json()) as { rows: ImportRow[] };

    if (!rows || !Array.isArray(rows)) {
      return json({ error: "Invalid request: rows array required" }, { status: 400 });
    }

    // Get all existing payees and categories
    const [existingPayees, existingCategories] = await Promise.all([
      db.select().from(payeeTable).where(isNull(payeeTable.deletedAt)),
      db.select().from(categoryTable).where(isNull(categoryTable.deletedAt)),
    ]);

    // Initialize matchers
    const payeeMatcher = new PayeeMatcher();
    const categoryMatcher = new CategoryMatcher();

    // Analyze rows to find unique payees and categories
    const payeeMap = new Map<string, { occurrences: number; source: "import" | "inferred" }>();
    const categoryMap = new Map<string, { occurrences: number; source: "import" | "inferred" }>();

    for (const row of rows) {
      const data = row.normalizedData;

      // Infer category if not explicitly provided
      if (!data.category && (data.payee || data.notes)) {
        const suggestedCategoryName = categoryMatcher.suggestCategoryName({
          payeeName: data.payee,
          description: data.notes,
        });
        if (suggestedCategoryName) {
          data.inferredCategory = suggestedCategoryName;
        }
      }

      // Track payees - normalize the name first
      if (data.payee && typeof data.payee === "string") {
        const normalized = payeeMatcher.normalizePayeeName(data.payee);
        const payeeName = normalized.name;
        if (payeeName) {
          const current = payeeMap.get(payeeName) || { occurrences: 0, source: "import" as const };
          payeeMap.set(payeeName, {
            ...current,
            occurrences: current.occurrences + 1,
          });
        }
      }

      // Track categories (skip "Uncategorized" as it's just a placeholder for no category)
      if (data.category && typeof data.category === "string") {
        const categoryName = data.category.trim();
        if (categoryName && categoryName.toLowerCase() !== "uncategorized") {
          const current = categoryMap.get(categoryName) || {
            occurrences: 0,
            source: "import" as const,
          };
          categoryMap.set(categoryName, {
            ...current,
            occurrences: current.occurrences + 1,
          });
        }
      }

      // Track inferred categories (from payee/description)
      // Skip "Uncategorized" as it's just a placeholder
      if (data.inferredCategory && typeof data.inferredCategory === "string" && !data.category) {
        const categoryName = data.inferredCategory.trim();
        if (categoryName && categoryName.toLowerCase() !== "uncategorized") {
          const current = categoryMap.get(categoryName) || {
            occurrences: 0,
            source: "inferred" as const,
          };
          categoryMap.set(categoryName, {
            source: "inferred",
            occurrences: current.occurrences + 1,
          });
        }
      }
    }

    // Build payee previews
    const payeePreviews: PayeePreview[] = Array.from(payeeMap.entries())
      .map(([name, info]) => {
        // Use fuzzy matcher to find existing payees
        const cleanedName = payeeMatcher.cleanPayeeName(name);
        const match = payeeMatcher.findBestMatch(cleanedName, existingPayees);

        // Only consider it existing if match confidence is medium or higher
        const existing =
          match.payee &&
          (match.confidence === "exact" ||
            match.confidence === "high" ||
            match.confidence === "medium")
            ? match.payee
            : undefined;

        return {
          name,
          source: info.source,
          occurrences: info.occurrences,
          selected: !existing, // Auto-select new entities, deselect existing
          ...(existing && {
            existing: {
              id: existing.id,
              name: existing.name || name,
            },
          }),
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences); // Sort by most used first

    // Build category previews
    const categoryPreviews: CategoryPreview[] = Array.from(categoryMap.entries())
      .map(([name, info]) => {
        // Use fuzzy matcher to find existing categories
        const match = categoryMatcher.findBestMatch({ categoryName: name }, existingCategories);

        // Consider it existing if a match was found
        const existing = match.category || undefined;

        return {
          name,
          source: info.source,
          occurrences: info.occurrences,
          selected: !existing, // Auto-select new entities, deselect existing
          ...(existing && {
            existing: {
              id: existing.id,
              name: existing.name || name,
            },
          }),
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences); // Sort by most used first

    // Calculate transaction stats
    const validRows = rows.filter((r) => r.validationStatus === "valid");
    const duplicateRows = rows.filter((r) => r.validationStatus === "duplicate");
    const invalidRows = rows.filter((r) => r.validationStatus === "invalid");

    const previewData: ImportPreviewData = {
      payees: payeePreviews,
      categories: categoryPreviews,
      transactions: {
        total: rows.length,
        valid: validRows.length,
        duplicates: duplicateRows.length,
        errors: invalidRows.length,
      },
    };

    return json(previewData);
  } catch (error) {
    console.error("Entity preview error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to generate entity preview",
      },
      { status: 500 }
    );
  }
};
