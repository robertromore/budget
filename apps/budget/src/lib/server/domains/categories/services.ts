import {CategoryRepository, type UpdateCategoryData, type CategoryStats, type CategoryWithStats} from "./repository";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {InputSanitizer} from "$lib/server/shared/validation";
import type {Category, NewCategory, CategoryType, TaxCategory, SpendingPriority, IncomeReliability} from "$lib/schema/categories";

export interface CreateCategoryData {
  name: string;
  notes?: string | null;
}

export interface CategoryAnalytics {
  totalSpent: number;
  averageTransaction: number;
  transactionCount: number;
  monthlyAverage: number;
  trend: "increasing" | "decreasing" | "stable";
}

/**
 * Service for category business logic
 */
export class CategoryService {
  constructor(
    private repository: CategoryRepository = new CategoryRepository()
  ) {}

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    // Validate and sanitize input
    if (!data.name?.trim()) {
      throw new ValidationError("Category name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid category name");
    }

    const sanitizedNotes = data.notes
      ? InputSanitizer.sanitizeDescription(data.notes)
      : null;

    // Check for duplicate names (case-insensitive)
    await this.validateUniqueCategoryName(sanitizedName);

    // Generate unique slug
    let baseSlug = this.generateSlug(sanitizedName);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness (only checking active categories since deleted ones have modified slugs)
    while (await this.repository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newCategory: NewCategory = {
      name: sanitizedName,
      slug,
      notes: sanitizedNotes,
    };

    return await this.repository.create(newCategory);
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    if (!slug?.trim()) {
      throw new ValidationError("Invalid category slug");
    }

    const category = await this.repository.findBySlug(slug);
    if (!category) {
      throw new NotFoundError("Category", slug);
    }

    return category;
  }

  /**
   * Get category by ID with statistics
   */
  async getCategoryWithStats(id: number): Promise<CategoryWithStats> {
    const category = await this.getCategoryById(id);
    const stats = await this.repository.getStats(id);

    return {
      ...category,
      stats,
    };
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    return await this.repository.findAll();
  }

  /**
   * Get all categories with statistics
   */
  async getAllCategoriesWithStats(): Promise<CategoryWithStats[]> {
    return await this.repository.findAllWithStats();
  }

  /**
   * Update category
   */
  async updateCategory(id: number, data: UpdateCategoryData): Promise<Category> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    // Verify category exists
    await this.getCategoryById(id);

    const updateData: UpdateCategoryData = {};

    // Validate and sanitize name if provided
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new ValidationError("Category name cannot be empty");
      }

      const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
      if (!sanitizedName) {
        throw new ValidationError("Invalid category name");
      }

      // Check for duplicate names (excluding current category)
      await this.validateUniqueCategoryName(sanitizedName, id);
      updateData.name = sanitizedName;
    }

    // Validate and sanitize notes if provided
    if (data.notes !== undefined) {
      updateData.notes = data.notes
        ? InputSanitizer.sanitizeDescription(data.notes)
        : null;
    }

    // Handle all other category fields
    if (data.categoryType !== undefined) {
      updateData.categoryType = data.categoryType;
    }

    if (data.categoryIcon !== undefined) {
      updateData.categoryIcon = data.categoryIcon;
    }

    if (data.categoryColor !== undefined) {
      updateData.categoryColor = data.categoryColor;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.displayOrder !== undefined) {
      updateData.displayOrder = data.displayOrder;
    }

    if (data.isTaxDeductible !== undefined) {
      updateData.isTaxDeductible = data.isTaxDeductible;
    }

    if (data.taxCategory !== undefined) {
      updateData.taxCategory = data.taxCategory;
    }

    if (data.deductiblePercentage !== undefined) {
      updateData.deductiblePercentage = data.deductiblePercentage;
    }

    if (data.isSeasonal !== undefined) {
      updateData.isSeasonal = data.isSeasonal;
    }

    if (data.seasonalMonths !== undefined) {
      updateData.seasonalMonths = data.seasonalMonths;
    }

    if (data.expectedMonthlyMin !== undefined) {
      updateData.expectedMonthlyMin = data.expectedMonthlyMin;
    }

    if (data.expectedMonthlyMax !== undefined) {
      updateData.expectedMonthlyMax = data.expectedMonthlyMax;
    }

    if (data.spendingPriority !== undefined) {
      updateData.spendingPriority = data.spendingPriority;
    }

    if (data.incomeReliability !== undefined) {
      updateData.incomeReliability = data.incomeReliability;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    return await this.repository.update(id, updateData);
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(id: number, options: {force?: boolean} = {}): Promise<Category> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    // Verify category exists
    await this.getCategoryById(id);

    // Check for associated transactions unless force delete
    if (!options.force) {
      const hasTransactions = await this.repository.hasTransactions(id);
      if (hasTransactions) {
        throw new ConflictError(
          "Cannot delete category with associated transactions. Use force delete or reassign transactions first."
        );
      }
    }

    return await this.repository.softDelete(id);
  }

  /**
   * Bulk delete categories
   */
  async bulkDeleteCategories(
    ids: number[],
    options: {force?: boolean} = {}
  ): Promise<{deletedCount: number; errors: string[]}> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("No category IDs provided");
    }

    const validIds = ids.filter(id => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid category IDs provided");
    }

    const errors: string[] = [];
    const deleteableIds: number[] = [];

    // Validate each category and check for conflicts
    for (const id of validIds) {
      try {
        await this.getCategoryById(id);

        if (!options.force) {
          const hasTransactions = await this.repository.hasTransactions(id);
          if (hasTransactions) {
            errors.push(`Category ${id}: Has associated transactions`);
            continue;
          }
        }

        deleteableIds.push(id);
      } catch (error) {
        errors.push(`Category ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const deletedCount = deleteableIds.length > 0
      ? await this.repository.bulkDelete(deleteableIds)
      : 0;

    return {deletedCount, errors};
  }

  /**
   * Bulk update category display order
   */
  async bulkUpdateDisplayOrder(
    updates: Array<{id: number; displayOrder: number}>
  ): Promise<{updatedCount: number; errors: string[]}> {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ValidationError("No category updates provided");
    }

    const errors: string[] = [];
    let updatedCount = 0;

    // Process each update
    for (const update of updates) {
      try {
        if (!update.id || update.id <= 0) {
          errors.push(`Invalid category ID: ${update.id}`);
          continue;
        }

        if (update.displayOrder < 0) {
          errors.push(`Category ${update.id}: Display order must be non-negative`);
          continue;
        }

        // Verify category exists
        await this.getCategoryById(update.id);

        // Update display order
        await this.repository.update(update.id, {displayOrder: update.displayOrder});
        updatedCount++;
      } catch (error) {
        errors.push(`Category ${update.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {updatedCount, errors};
  }

  /**
   * Search categories
   */
  async searchCategories(query: string): Promise<Category[]> {
    const sanitizedQuery = query?.trim() || '';
    return await this.repository.search(sanitizedQuery);
  }

  /**
   * Get categories used in account transactions
   */
  async getCategoriesByAccount(accountId: number): Promise<Category[]> {
    if (!accountId || accountId <= 0) {
      throw new ValidationError("Invalid account ID");
    }

    return await this.repository.findByAccountTransactions(accountId);
  }

  /**
   * Get top categories by spending
   */
  async getTopCategories(
    limit: number = 10,
    accountId?: number
  ): Promise<CategoryWithStats[]> {
    if (limit <= 0 || limit > 100) {
      throw new ValidationError("Limit must be between 1 and 100");
    }

    if (accountId && accountId <= 0) {
      throw new ValidationError("Invalid account ID");
    }

    return await this.repository.getTopCategories(limit, accountId);
  }

  /**
   * Verify category exists
   */
  async verifyCategoryExists(id: number): Promise<boolean> {
    if (!id || id <= 0) return false;
    return await this.repository.exists(id);
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(id: number): Promise<CategoryStats> {
    await this.getCategoryById(id); // Verify exists
    return await this.repository.getStats(id);
  }

  /**
   * Get category analytics with trends
   */
  async getCategoryAnalytics(id: number): Promise<CategoryAnalytics> {
    const stats = await this.getCategoryStats(id);

    // Calculate monthly average (assuming data spans multiple months)
    const monthlyAverage = stats.totalAmount / Math.max(1, 12); // Simplified calculation

    // Determine trend (this would need more sophisticated analysis in real implementation)
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (stats.totalAmount > monthlyAverage * 6) {
      trend = "increasing";
    } else if (stats.totalAmount < monthlyAverage * 3) {
      trend = "decreasing";
    }

    return {
      totalSpent: Math.abs(stats.totalAmount),
      averageTransaction: stats.averageAmount,
      transactionCount: stats.transactionCount,
      monthlyAverage: Math.abs(monthlyAverage),
      trend,
    };
  }

  /**
   * Merge two categories (move all transactions from source to target)
   */
  async mergeCategories(sourceId: number, targetId: number): Promise<void> {
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new ValidationError("Invalid category IDs for merge operation");
    }

    // Verify both categories exist
    await this.getCategoryById(sourceId);
    await this.getCategoryById(targetId);

    // Note: Transaction reassignment would be handled by TransactionService
    // This is a placeholder for the merge operation business logic
    throw new Error("Category merge functionality not yet implemented");
  }

  /**
   * Get category usage summary
   */
  async getCategoryUsageSummary(): Promise<{
    totalCategories: number;
    categoriesWithTransactions: number;
    averageTransactionsPerCategory: number;
    topCategory: CategoryWithStats | null;
  }> {
    const allCategories = await this.repository.findAll();
    const categoriesWithStats = await this.repository.findAllWithStats();

    const categoriesWithTransactions = categoriesWithStats.filter(
      cat => cat.stats.transactionCount > 0
    );

    const totalTransactions = categoriesWithStats.reduce(
      (sum, cat) => sum + cat.stats.transactionCount,
      0
    );

    const topCategory = categoriesWithStats.length > 0
      ? categoriesWithStats.reduce((top, cat) =>
          Math.abs(cat.stats.totalAmount) > Math.abs(top.stats.totalAmount) ? cat : top
        )
      : null;

    return {
      totalCategories: allCategories.length,
      categoriesWithTransactions: categoriesWithTransactions.length,
      averageTransactionsPerCategory: categoriesWithTransactions.length > 0
        ? totalTransactions / categoriesWithTransactions.length
        : 0,
      topCategory: topCategory && topCategory.stats.transactionCount > 0 ? topCategory : null,
    };
  }

  /**
   * Get category by ID with budget data
   */
  async getCategoryByIdWithBudgets(id: number) {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    const category = await this.repository.findByIdWithBudgets(id);
    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Get category by slug with budget data
   */
  async getCategoryBySlugWithBudgets(slug: string) {
    if (!slug?.trim()) {
      throw new ValidationError("Invalid category slug");
    }

    const category = await this.repository.findBySlug(slug);
    if (!category) {
      throw new NotFoundError("Category", slug);
    }

    const budgetSummaries = await this.repository.getBudgetSummary(category.id);

    return {
      ...category,
      budgets: budgetSummaries,
    };
  }

  /**
   * Get all categories with budget data
   */
  async getAllCategoriesWithBudgets() {
    return await this.repository.findAllWithBudgets();
  }

  /**
   * Private: Validate unique category name
   */
  private async validateUniqueCategoryName(name: string, excludeId?: number): Promise<void> {
    const existingCategories = await this.repository.findAll();

    const duplicate = existingCategories.find(category =>
      category.name?.toLowerCase() === name.toLowerCase() &&
      category.id !== excludeId
    );

    if (duplicate) {
      throw new ConflictError(`Category with name "${name}" already exists`);
    }
  }
}