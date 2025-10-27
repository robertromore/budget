import { CategoryMatcher } from '$lib/server/import/matchers/category-matcher';
import { PayeeMatcher } from '$lib/server/import/matchers/payee-matcher';
import type { ImportRow } from '$lib/types/import';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({request}) => {
  try {
    const {rows} = (await request.json()) as {rows: ImportRow[]};

    if (!rows || !Array.isArray(rows)) {
      return json({error: 'Invalid request: rows array required'}, {status: 400});
    }

    // Initialize matchers
    const categoryMatcher = new CategoryMatcher();
    const payeeMatcher = new PayeeMatcher();

    // Track payee-to-category mappings to ensure consistency
    const payeeCategoryMap = new Map<string, string>();

    // Process each row: normalize payee names and infer categories
    const updatedRows = rows.map((row) => {
      const data = row.normalizedData;
      const updates: Record<string, any> = {};

      // Normalize payee name and extract details
      if (data['payee'] && typeof data['payee'] === 'string') {
        const originalPayee = data['payee'] as string;
        const {name, details} = payeeMatcher.normalizePayeeName(originalPayee);
        // console.log(`[Payee Normalization] Original: "${originalPayee}" -> Normalized: "${name}"`);
        updates['payee'] = name;
        updates['originalPayee'] = originalPayee; // Keep original for reference

        // Append details to notes/description if present
        if (details) {
          const existingNotes = (data['notes'] || data['description'] || '') as string;
          updates['payeeDetails'] = details;
          if (existingNotes) {
            updates['notes'] = `${existingNotes} (${details})`;
          } else {
            updates['notes'] = details;
          }
        }
      }

      // Infer category if no explicit category is provided
      // Check for undefined, null, or empty string
      const hasCategory = data['category'] && typeof data['category'] === 'string' && data['category'].trim().length > 0;

      if (!hasCategory && (updates['payee'] || data['payee'] || data['notes'] || data['description'])) {
        const normalizedPayee = (updates['payee'] || data['payee']) as string;

        // Check if we've already assigned a category to this payee
        if (normalizedPayee && payeeCategoryMap.has(normalizedPayee)) {
          const existingCategory = payeeCategoryMap.get(normalizedPayee)!;
          // console.log(`[Inference] Using cached category for "${normalizedPayee}": ${existingCategory}`);
          updates['category'] = existingCategory;
          updates['inferredCategory'] = existingCategory;
        } else {
          // First time seeing this payee, suggest a category
          const description = (updates['notes'] || data['notes'] || data['description']) as string;
          const suggestedCategoryName = categoryMatcher.suggestCategoryName({
            ...(normalizedPayee && { payeeName: normalizedPayee }),
            ...(description && { description }),
          });

          if (suggestedCategoryName) {
            // console.log(`[Inference] NEW category for "${normalizedPayee}": ${suggestedCategoryName}`);
            updates['category'] = suggestedCategoryName;
            updates['inferredCategory'] = suggestedCategoryName;
            // Remember this payee-category mapping
            if (normalizedPayee) {
              payeeCategoryMap.set(normalizedPayee, suggestedCategoryName);
            }
          } else {
            // console.log(`[Inference] No suggestion for "${normalizedPayee}", leaving uncategorized`);
            // No suggestion found - leave it without a category (don't set "Uncategorized")
            // The UI will display it as uncategorized/empty, but we don't store that as data
          }
        }
      }
      // If category exists in CSV, preserve it - don't overwrite

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
    });

    return json({rows: updatedRows});
  } catch (error) {
    console.error('Data enrichment error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to enrich import data',
      },
      {status: 500}
    );
  }
};
