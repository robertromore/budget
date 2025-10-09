import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {db} from '$lib/server/db';
import {payees as payeeTable} from '$lib/schema/payees';
import {categories as categoryTable} from '$lib/schema/categories';
import type {ImportRow, PayeePreview, CategoryPreview, ImportPreviewData} from '$lib/types/import';
import {isNull} from 'drizzle-orm';
import {CategoryMatcher} from '$lib/server/import/matchers/category-matcher';

export const POST: RequestHandler = async ({request}) => {
  try {
    const {rows} = await request.json() as {rows: ImportRow[]};

    if (!rows || !Array.isArray(rows)) {
      return json({error: 'Invalid request: rows array required'}, {status: 400});
    }

    // Get all existing payees and categories
    const [existingPayees, existingCategories] = await Promise.all([
      db.select().from(payeeTable).where(isNull(payeeTable.deletedAt)),
      db.select().from(categoryTable).where(isNull(categoryTable.deletedAt)),
    ]);

    // Initialize category matcher for inference
    const categoryMatcher = new CategoryMatcher();

    // Analyze rows to find unique payees and categories
    const payeeMap = new Map<string, {occurrences: number; source: 'import' | 'inferred'}>();
    const categoryMap = new Map<string, {occurrences: number; source: 'import' | 'inferred'}>();

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

      // Track payees
      if (data.payee && typeof data.payee === 'string') {
        const payeeName = data.payee.trim();
        if (payeeName) {
          const current = payeeMap.get(payeeName) || {occurrences: 0, source: 'import' as const};
          payeeMap.set(payeeName, {
            ...current,
            occurrences: current.occurrences + 1,
          });
        }
      }

      // Track categories
      if (data.category && typeof data.category === 'string') {
        const categoryName = data.category.trim();
        if (categoryName) {
          const current = categoryMap.get(categoryName) || {occurrences: 0, source: 'import' as const};
          categoryMap.set(categoryName, {
            ...current,
            occurrences: current.occurrences + 1,
          });
        }
      }

      // Track inferred categories (from payee/description)
      if (data.inferredCategory && typeof data.inferredCategory === 'string' && !data.category) {
        const categoryName = data.inferredCategory.trim();
        if (categoryName) {
          const current = categoryMap.get(categoryName) || {occurrences: 0, source: 'inferred' as const};
          categoryMap.set(categoryName, {
            source: 'inferred',
            occurrences: current.occurrences + 1,
          });
        }
      }
    }

    // Build payee previews
    const payeePreviews: PayeePreview[] = Array.from(payeeMap.entries())
      .map(([name, info]) => {
        const existing = existingPayees.find(
          (p) => p.name?.toLowerCase() === name.toLowerCase()
        );

        return {
          name,
          source: info.source,
          occurrences: info.occurrences,
          selected: !existing, // Auto-select new entities, deselect existing
          existing: existing
            ? {
                id: existing.id,
                name: existing.name || name,
              }
            : undefined,
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences); // Sort by most used first

    // Build category previews
    const categoryPreviews: CategoryPreview[] = Array.from(categoryMap.entries())
      .map(([name, info]) => {
        const existing = existingCategories.find(
          (c) => c.name?.toLowerCase() === name.toLowerCase()
        );

        return {
          name,
          source: info.source,
          occurrences: info.occurrences,
          selected: !existing, // Auto-select new entities, deselect existing
          existing: existing
            ? {
                id: existing.id,
                name: existing.name || name,
              }
            : undefined,
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences); // Sort by most used first

    // Calculate transaction stats
    const validRows = rows.filter((r) => r.validationStatus === 'valid');
    const duplicateRows = rows.filter((r) => r.validationStatus === 'duplicate');
    const invalidRows = rows.filter((r) => r.validationStatus === 'invalid');

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
    console.error('Entity preview error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate entity preview',
      },
      {status: 500}
    );
  }
};
