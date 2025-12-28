import type {
  AmountType,
  CategoryAlias,
  CategoryAliasMatch,
  CategoryAliasStats,
  CategoryAliasTrigger,
  CategoryAliasWithCategory,
} from "$lib/schema/category-aliases";

/**
 * Input type for creating a category alias.
 * Omits workspaceId since it's passed as a separate parameter.
 */
type CreateCategoryAliasInput = {
  rawString: string;
  categoryId: number;
  payeeId?: number | null;
  trigger: CategoryAliasTrigger;
  confidence?: number;
  matchCount?: number;
  amountType?: AmountType;
  sourceAccountId?: number;
  lastMatchedAt?: string;
};
import { categories, categoryAliases, payees } from "$lib/schema";
import { db } from "$lib/server/db";
import { NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

/**
 * Repository for category alias database operations.
 *
 * Manages the mapping of raw imported strings to category IDs.
 * Used during imports to remember user-confirmed category mappings
 * and provide high-confidence suggestions for subsequent imports.
 */
export class CategoryAliasRepository {
  /**
   * Normalize a raw string for consistent matching.
   * Converts to lowercase, trims whitespace, and removes extra spaces.
   */
  private normalizeString(raw: string): string {
    return raw.toLowerCase().trim().replace(/\s+/g, " ");
  }

  /**
   * Create a new alias
   */
  async create(data: CreateCategoryAliasInput, workspaceId: number): Promise<CategoryAlias> {
    const normalizedString = this.normalizeString(data.rawString);
    const now = getCurrentTimestamp();

    const [alias] = await db
      .insert(categoryAliases)
      .values({
        ...data,
        workspaceId,
        normalizedString,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!alias) {
      throw new Error("Failed to create category alias");
    }

    return alias;
  }

  /**
   * Find an alias by ID
   */
  async findById(id: number, workspaceId: number): Promise<CategoryAlias | null> {
    const [result] = await db
      .select()
      .from(categoryAliases)
      .where(
        and(
          eq(categoryAliases.id, id),
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find an alias by exact raw string match
   */
  async findByRawString(rawString: string, workspaceId: number): Promise<CategoryAlias | null> {
    const [result] = await db
      .select()
      .from(categoryAliases)
      .where(
        and(
          eq(categoryAliases.rawString, rawString),
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find aliases by normalized string (may return multiple)
   */
  async findByNormalizedString(normalized: string, workspaceId: number): Promise<CategoryAlias[]> {
    return await db
      .select()
      .from(categoryAliases)
      .where(
        and(
          eq(categoryAliases.normalizedString, normalized),
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt)
        )
      );
  }

  /**
   * Find all aliases for a specific category
   */
  async findByCategoryId(categoryId: number, workspaceId: number): Promise<CategoryAlias[]> {
    return await db
      .select()
      .from(categoryAliases)
      .where(
        and(
          eq(categoryAliases.categoryId, categoryId),
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt)
        )
      )
      .orderBy(desc(categoryAliases.matchCount));
  }

  /**
   * Find all aliases for a specific payee (useful for payee-context matching)
   */
  async findByPayeeId(payeeId: number, workspaceId: number): Promise<CategoryAlias[]> {
    return await db
      .select()
      .from(categoryAliases)
      .where(
        and(
          eq(categoryAliases.payeeId, payeeId),
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt)
        )
      )
      .orderBy(desc(categoryAliases.matchCount));
  }

  /**
   * Find all aliases for a workspace
   */
  async findAll(workspaceId: number): Promise<CategoryAlias[]> {
    return await db
      .select()
      .from(categoryAliases)
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)))
      .orderBy(desc(categoryAliases.matchCount));
  }

  /**
   * Find all aliases with category details
   */
  async findAllWithCategories(workspaceId: number): Promise<CategoryAliasWithCategory[]> {
    const results = await db
      .select({
        alias: categoryAliases,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          categoryType: categories.categoryType,
        },
        payee: {
          id: payees.id,
          name: payees.name,
        },
      })
      .from(categoryAliases)
      .innerJoin(categories, eq(categoryAliases.categoryId, categories.id))
      .leftJoin(payees, eq(categoryAliases.payeeId, payees.id))
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)))
      .orderBy(desc(categoryAliases.matchCount));

    return results.map((r) => ({
      ...r.alias,
      category: r.category,
      payee: r.payee,
    }));
  }

  /**
   * Update an alias
   */
  async update(
    id: number,
    data: Partial<Pick<CategoryAlias, "categoryId" | "rawString" | "amountType">>,
    workspaceId: number
  ): Promise<CategoryAlias> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("CategoryAlias", id);
    }

    const updateData: Partial<CategoryAlias> = {
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    // If rawString changed, update normalized too
    if (data.rawString) {
      updateData.normalizedString = this.normalizeString(data.rawString);
    }

    const [updated] = await db
      .update(categoryAliases)
      .set(updateData)
      .where(and(eq(categoryAliases.id, id), eq(categoryAliases.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update category alias");
    }

    return updated;
  }

  /**
   * Soft delete an alias
   */
  async softDelete(id: number, workspaceId: number): Promise<void> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("CategoryAlias", id);
    }

    await db
      .update(categoryAliases)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(categoryAliases.id, id), eq(categoryAliases.workspaceId, workspaceId)));
  }

  /**
   * Bulk create aliases, handling duplicates by updating match count
   */
  async bulkCreate(
    aliases: Array<{
      rawString: string;
      categoryId: number;
      payeeId?: number | null;
      trigger?: CategoryAliasTrigger;
      amountType?: AmountType;
      sourceAccountId?: number;
      wasAiSuggested?: boolean;
    }>,
    workspaceId: number
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const now = getCurrentTimestamp();

    for (const aliasData of aliases) {
      const existing = await this.findByRawString(aliasData.rawString, workspaceId);

      if (existing) {
        // Update existing alias - increment match count
        // If category changed, update it (user override takes precedence)
        await db
          .update(categoryAliases)
          .set({
            matchCount: existing.matchCount + 1,
            categoryId: aliasData.categoryId, // Update to new category if changed
            payeeId: aliasData.payeeId ?? existing.payeeId,
            amountType: aliasData.amountType ?? existing.amountType,
            lastMatchedAt: now,
            updatedAt: now,
            // Boost confidence slightly on repeated confirmations, cap at 1.0
            confidence: Math.min(existing.confidence + 0.05, 1.0),
          })
          .where(eq(categoryAliases.id, existing.id));
        updated++;
      } else {
        // Create new alias
        // AI-suggested aliases start with slightly lower confidence
        const initialConfidence = aliasData.wasAiSuggested ? 0.85 : 1.0;
        const trigger: CategoryAliasTrigger = aliasData.wasAiSuggested
          ? "ai_accepted"
          : aliasData.trigger || "import_confirmation";

        await db.insert(categoryAliases).values({
          workspaceId,
          rawString: aliasData.rawString,
          normalizedString: this.normalizeString(aliasData.rawString),
          categoryId: aliasData.categoryId,
          payeeId: aliasData.payeeId,
          trigger,
          sourceAccountId: aliasData.sourceAccountId,
          amountType: aliasData.amountType || "any",
          confidence: initialConfidence,
          matchCount: 1,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Bulk delete all aliases for a category
   */
  async bulkDeleteByCategoryId(categoryId: number, workspaceId: number): Promise<number> {
    const result = await db
      .update(categoryAliases)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(
        and(
          eq(categoryAliases.categoryId, categoryId),
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt)
        )
      );

    return result.rowsAffected || 0;
  }

  /**
   * Find best match for a raw string.
   * First tries exact match, then normalized match.
   * Optionally uses payee context for better matching.
   */
  async findBestMatch(
    rawString: string,
    workspaceId: number,
    context?: { payeeId?: number; amountType?: AmountType }
  ): Promise<CategoryAliasMatch | null> {
    // First try exact match
    const exactMatch = await this.findByRawString(rawString, workspaceId);
    if (exactMatch) {
      // Check if amount type matches (if specified in alias)
      if (
        context?.amountType &&
        exactMatch.amountType !== "any" &&
        exactMatch.amountType !== context.amountType
      ) {
        // Don't return if amount type doesn't match
      } else {
        return {
          categoryId: exactMatch.categoryId,
          confidence: exactMatch.confidence,
          aliasId: exactMatch.id,
          matchedOn: "exact",
        };
      }
    }

    // Then try normalized match
    const normalized = this.normalizeString(rawString);
    const normalizedMatches = await this.findByNormalizedString(normalized, workspaceId);

    if (normalizedMatches.length > 0) {
      // Filter by amount type if specified
      let filteredMatches = normalizedMatches;
      if (context?.amountType) {
        const typeFiltered = normalizedMatches.filter(
          (m) => m.amountType === "any" || m.amountType === context.amountType
        );
        if (typeFiltered.length > 0) {
          filteredMatches = typeFiltered;
        }
      }

      // Return the most used alias for this normalized string
      const bestMatch = filteredMatches[0];
      return {
        categoryId: bestMatch.categoryId,
        confidence: bestMatch.confidence * 0.9, // Slightly lower confidence for normalized
        aliasId: bestMatch.id,
        matchedOn: "normalized",
      };
    }

    // Finally, if payee context provided, check payee-specific aliases
    if (context?.payeeId) {
      const payeeAliases = await this.findByPayeeId(context.payeeId, workspaceId);
      if (payeeAliases.length > 0) {
        // Filter by amount type if specified
        let filtered = payeeAliases;
        if (context.amountType) {
          const typeFiltered = payeeAliases.filter(
            (m) => m.amountType === "any" || m.amountType === context.amountType
          );
          if (typeFiltered.length > 0) {
            filtered = typeFiltered;
          }
        }

        // Return the most used alias for this payee (lower confidence since not exact match)
        const bestMatch = filtered[0];
        return {
          categoryId: bestMatch.categoryId,
          confidence: bestMatch.confidence * 0.75, // Lower confidence for payee-context match
          aliasId: bestMatch.id,
          matchedOn: "payee_context",
        };
      }
    }

    return null;
  }

  /**
   * Increment match count for an alias (called when alias is used)
   */
  async incrementMatchCount(id: number): Promise<void> {
    await db
      .update(categoryAliases)
      .set({
        matchCount: sql`${categoryAliases.matchCount} + 1`,
        lastMatchedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        // Slight confidence boost on successful matches, cap at 1.0
        confidence: sql`MIN(${categoryAliases.confidence} + 0.01, 1.0)`,
      })
      .where(eq(categoryAliases.id, id));
  }

  /**
   * Move aliases from one category to another (for merging categories)
   */
  async mergeAliases(
    sourceCategoryId: number,
    targetCategoryId: number,
    workspaceId: number
  ): Promise<number> {
    const result = await db
      .update(categoryAliases)
      .set({
        categoryId: targetCategoryId,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(categoryAliases.categoryId, sourceCategoryId),
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt)
        )
      );

    return result.rowsAffected || 0;
  }

  /**
   * Get statistics about aliases for a workspace
   */
  async getStats(workspaceId: number): Promise<CategoryAliasStats> {
    // Total aliases count
    const [totalResult] = await db
      .select({ total: count() })
      .from(categoryAliases)
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)));

    const totalAliases = totalResult?.total || 0;

    // Unique categories with aliases
    const [uniqueCategoriesResult] = await db
      .select({ uniqueCategories: sql<number>`COUNT(DISTINCT ${categoryAliases.categoryId})` })
      .from(categoryAliases)
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)));

    const uniqueCategories = uniqueCategoriesResult?.uniqueCategories || 0;

    // Total match count
    const [totalMatchesResult] = await db
      .select({ totalMatches: sql<number>`SUM(${categoryAliases.matchCount})` })
      .from(categoryAliases)
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)));

    const totalMatches = totalMatchesResult?.totalMatches || 0;

    // Most used aliases (top 10)
    const mostUsedResults = await db
      .select({
        id: categoryAliases.id,
        rawString: categoryAliases.rawString,
        categoryName: categories.name,
        matchCount: categoryAliases.matchCount,
      })
      .from(categoryAliases)
      .innerJoin(categories, eq(categoryAliases.categoryId, categories.id))
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)))
      .orderBy(desc(categoryAliases.matchCount))
      .limit(10);

    // Recently created (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const [recentResult] = await db
      .select({ recentCount: count() })
      .from(categoryAliases)
      .where(
        and(
          eq(categoryAliases.workspaceId, workspaceId),
          isNull(categoryAliases.deletedAt),
          sql`${categoryAliases.createdAt} >= ${thirtyDaysAgoStr}`
        )
      );

    const recentlyCreated = recentResult?.recentCount || 0;

    // Count by trigger
    const byTriggerResults = await db
      .select({
        trigger: categoryAliases.trigger,
        count: count(),
      })
      .from(categoryAliases)
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)))
      .groupBy(categoryAliases.trigger);

    const byTrigger = byTriggerResults.reduce(
      (acc, row) => {
        acc[row.trigger as CategoryAliasTrigger] = row.count;
        return acc;
      },
      {} as Record<CategoryAliasTrigger, number>
    );

    // Count by amount type
    const byAmountTypeResults = await db
      .select({
        amountType: categoryAliases.amountType,
        count: count(),
      })
      .from(categoryAliases)
      .where(and(eq(categoryAliases.workspaceId, workspaceId), isNull(categoryAliases.deletedAt)))
      .groupBy(categoryAliases.amountType);

    const byAmountType = byAmountTypeResults.reduce(
      (acc, row) => {
        if (row.amountType) {
          acc[row.amountType as AmountType] = row.count;
        }
        return acc;
      },
      {} as Record<AmountType, number>
    );

    return {
      totalAliases,
      uniqueCategories,
      aliasesPerCategory: uniqueCategories > 0 ? totalAliases / uniqueCategories : 0,
      totalMatches,
      mostUsedAliases: mostUsedResults.map((r) => ({
        id: r.id,
        rawString: r.rawString,
        categoryName: r.categoryName || "Unknown",
        matchCount: r.matchCount,
      })),
      recentlyCreated,
      byTrigger,
      byAmountType,
    };
  }
}
