import type {
  AmountType,
  CategoryAlias,
  CategoryAliasMatch,
  CategoryAliasStats,
  CategoryAliasTrigger,
  CategoryAliasWithCategory,
} from "$lib/schema/category-aliases";
import { CategoryAliasRepository } from "./alias-repository";

/**
 * Category Alias Service
 *
 * Business logic layer for category alias management.
 * Handles recording, matching, and managing category aliases across the system.
 *
 * Category aliases are mappings from raw imported strings (e.g., "AMAZON PRIME*123")
 * to category IDs, enabling the system to remember category assignments and apply
 * them to subsequent imports with high confidence.
 *
 * Integration with SmartCategoryService:
 * - Category aliases are checked FIRST before ML scoring
 * - An alias match returns confidence >= 0.75
 * - This takes priority over historical patterns and ML predictions
 */
export class CategoryAliasService {
  private repository: CategoryAliasRepository;

  constructor() {
    this.repository = new CategoryAliasRepository();
  }

  /**
   * Record an alias from an import operation.
   * Called when a user assigns a category during import.
   */
  async recordAliasFromImport(
    rawString: string,
    categoryId: number,
    workspaceId: number,
    options?: {
      payeeId?: number;
      accountId?: number;
      amountType?: AmountType;
      wasAiSuggested?: boolean;
    }
  ): Promise<CategoryAlias> {
    // Check if alias already exists
    const existing = await this.repository.findByRawString(rawString, workspaceId);

    if (existing) {
      // If mapping to the same category, just increment count
      if (existing.categoryId === categoryId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }

      // If mapping to different category, update the alias
      return await this.repository.update(
        existing.id,
        { categoryId, amountType: options?.amountType },
        workspaceId
      );
    }

    // Create new alias
    const trigger: CategoryAliasTrigger = options?.wasAiSuggested
      ? "ai_accepted"
      : "import_confirmation";

    return await this.repository.create(
      {
        rawString,
        categoryId,
        payeeId: options?.payeeId,
        trigger,
        sourceAccountId: options?.accountId,
        amountType: options?.amountType || "any",
        confidence: options?.wasAiSuggested ? 0.85 : 1.0,
      },
      workspaceId
    );
  }

  /**
   * Record an alias from a transaction edit.
   * Called when a user changes a category on an existing transaction.
   */
  async recordAliasFromTransactionEdit(
    rawString: string,
    categoryId: number,
    workspaceId: number,
    options?: {
      payeeId?: number;
      amountType?: AmountType;
    }
  ): Promise<CategoryAlias> {
    const existing = await this.repository.findByRawString(rawString, workspaceId);

    if (existing) {
      if (existing.categoryId === categoryId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }
      return await this.repository.update(existing.id, { categoryId }, workspaceId);
    }

    return await this.repository.create(
      {
        rawString,
        categoryId,
        payeeId: options?.payeeId,
        trigger: "transaction_edit",
        amountType: options?.amountType || "any",
      },
      workspaceId
    );
  }

  /**
   * Create a manual alias (user explicitly creates mapping).
   */
  async createManualAlias(
    rawString: string,
    categoryId: number,
    workspaceId: number,
    options?: {
      payeeId?: number;
      amountType?: AmountType;
    }
  ): Promise<CategoryAlias> {
    const existing = await this.repository.findByRawString(rawString, workspaceId);

    if (existing) {
      if (existing.categoryId === categoryId) {
        return existing;
      }
      return await this.repository.update(existing.id, { categoryId }, workspaceId);
    }

    return await this.repository.create(
      {
        rawString,
        categoryId,
        payeeId: options?.payeeId,
        trigger: "manual_creation",
        amountType: options?.amountType || "any",
        confidence: 1.0,
      },
      workspaceId
    );
  }

  /**
   * Bulk record aliases from import completion.
   * Called when user confirms and completes an import operation.
   */
  async bulkRecordAliases(
    records: Array<{
      rawString: string;
      categoryId: number;
      payeeId?: number | null;
      sourceAccountId?: number;
      amountType?: AmountType;
      wasAiSuggested?: boolean;
    }>,
    workspaceId: number
  ): Promise<{ created: number; updated: number }> {
    // Filter out duplicates - keep the last occurrence for each rawString
    const uniqueRecords = new Map<string, (typeof records)[0]>();
    for (const record of records) {
      uniqueRecords.set(record.rawString.toLowerCase().trim(), record);
    }

    return await this.repository.bulkCreate(
      Array.from(uniqueRecords.values()).map((record) => ({
        rawString: record.rawString,
        categoryId: record.categoryId,
        payeeId: record.payeeId ?? undefined,
        trigger: "bulk_import" as CategoryAliasTrigger,
        sourceAccountId: record.sourceAccountId,
        amountType: record.amountType,
        wasAiSuggested: record.wasAiSuggested,
      })),
      workspaceId
    );
  }

  /**
   * Find a category by alias (raw string lookup).
   * Returns the matched category ID if found.
   */
  async findCategoryByAlias(
    rawString: string,
    workspaceId: number,
    context?: { payeeId?: number; amountType?: AmountType }
  ): Promise<CategoryAliasMatch | null> {
    return await this.repository.findBestMatch(rawString, workspaceId, context);
  }

  /**
   * Get all aliases for a specific category.
   */
  async getAliasesForCategory(categoryId: number, workspaceId: number): Promise<CategoryAlias[]> {
    return await this.repository.findByCategoryId(categoryId, workspaceId);
  }

  /**
   * Get all aliases in a workspace with category details.
   */
  async getAllAliasesWithCategories(workspaceId: number): Promise<CategoryAliasWithCategory[]> {
    return await this.repository.findAllWithCategories(workspaceId);
  }

  /**
   * Get a single alias by ID.
   */
  async getAlias(id: number, workspaceId: number): Promise<CategoryAlias | null> {
    return await this.repository.findById(id, workspaceId);
  }

  /**
   * Update an alias's raw string or category mapping.
   */
  async updateAlias(
    id: number,
    data: { rawString?: string; categoryId?: number; amountType?: AmountType },
    workspaceId: number
  ): Promise<CategoryAlias> {
    return await this.repository.update(id, data, workspaceId);
  }

  /**
   * Delete an alias.
   */
  async deleteAlias(id: number, workspaceId: number): Promise<void> {
    await this.repository.softDelete(id, workspaceId);
  }

  /**
   * Delete all aliases for a category.
   * Useful when deleting a category.
   */
  async deleteAliasesForCategory(categoryId: number, workspaceId: number): Promise<number> {
    return await this.repository.bulkDeleteByCategoryId(categoryId, workspaceId);
  }

  /**
   * Merge aliases when categories are merged.
   * Moves all aliases from source category to target category.
   */
  async mergeAliases(
    sourceCategoryId: number,
    targetCategoryId: number,
    workspaceId: number
  ): Promise<number> {
    return await this.repository.mergeAliases(sourceCategoryId, targetCategoryId, workspaceId);
  }

  /**
   * Get statistics about aliases in a workspace.
   */
  async getStats(workspaceId: number): Promise<CategoryAliasStats> {
    return await this.repository.getStats(workspaceId);
  }

  /**
   * Match with alias - entry point for SmartCategoryService integration.
   *
   * This method is designed to be called FIRST before ML scoring.
   * An alias match provides high confidence (0.75-1.0) and takes priority.
   *
   * @param rawString - The raw payee/description string from import
   * @param workspaceId - The workspace ID
   * @param context - Optional context (payeeId, amountType) for better matching
   * @returns Match result with categoryId and confidence if found
   */
  async matchWithAlias(
    rawString: string,
    workspaceId: number,
    context?: { payeeId?: number; amountType?: AmountType }
  ): Promise<{
    found: boolean;
    categoryId?: number;
    confidence: number;
    matchedOn?: "exact" | "normalized" | "payee_context";
  }> {
    const match = await this.findCategoryByAlias(rawString, workspaceId, context);

    if (match) {
      // Increment match count for tracking
      await this.repository.incrementMatchCount(match.aliasId);

      return {
        found: true,
        categoryId: match.categoryId,
        confidence: match.confidence,
        matchedOn: match.matchedOn,
      };
    }

    return { found: false, confidence: 0 };
  }

  /**
   * Record when a user accepts an AI category suggestion.
   * Creates an alias with slightly lower initial confidence.
   */
  async recordAiAcceptance(
    rawString: string,
    categoryId: number,
    workspaceId: number,
    options?: {
      payeeId?: number;
      amountType?: AmountType;
      aiConfidence?: number;
    }
  ): Promise<CategoryAlias> {
    const existing = await this.repository.findByRawString(rawString, workspaceId);

    if (existing) {
      // AI suggestion matches existing alias - boost confidence
      if (existing.categoryId === categoryId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }
      // AI suggestion differs from existing - user is overriding
      return await this.repository.update(existing.id, { categoryId }, workspaceId);
    }

    // Start with AI confidence, default 0.85
    const confidence = options?.aiConfidence ? Math.min(options.aiConfidence, 0.9) : 0.85;

    return await this.repository.create(
      {
        rawString,
        categoryId,
        payeeId: options?.payeeId,
        trigger: "ai_accepted",
        amountType: options?.amountType || "any",
        confidence,
      },
      workspaceId
    );
  }

  /**
   * Get aliases for multiple raw strings (batch lookup for import preview).
   * Returns a map of rawString → CategoryAliasMatch for found aliases.
   */
  async batchFindAliases(
    rawStrings: string[],
    workspaceId: number,
    context?: { amountType?: AmountType }
  ): Promise<Map<string, CategoryAliasMatch>> {
    const results = new Map<string, CategoryAliasMatch>();

    for (const rawString of rawStrings) {
      const match = await this.findCategoryByAlias(rawString, workspaceId, context);
      if (match) {
        results.set(rawString, match);
      }
    }

    return results;
  }
}

// Singleton instance for easy access
let aliasServiceInstance: CategoryAliasService | null = null;

export function getCategoryAliasService(): CategoryAliasService {
  if (!aliasServiceInstance) {
    aliasServiceInstance = new CategoryAliasService();
  }
  return aliasServiceInstance;
}
