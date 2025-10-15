import {CategoryRepository, type UpdateCategoryData, type CategoryStats, type CategoryWithStats} from "./repository";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {InputSanitizer} from "$lib/server/shared/validation";
import type {Category, NewCategory, CategoryType, TaxCategory, SpendingPriority, IncomeReliability} from "$lib/schema/categories";

export interface CreateCategoryData {
  name: string;
  notes?: string | null | undefined;
  parentId?: number | null | undefined;
  categoryType?: CategoryType | undefined;
  categoryIcon?: string | null | undefined;
  categoryColor?: string | null | undefined;
  isActive?: boolean | undefined;
  displayOrder?: number | undefined;
  isTaxDeductible?: boolean | undefined;
  taxCategory?: TaxCategory | null | undefined;
  deductiblePercentage?: number | null | undefined;
  isSeasonal?: boolean | undefined;
  seasonalMonths?: string[] | null | undefined;
  expectedMonthlyMin?: number | null | undefined;
  expectedMonthlyMax?: number | null | undefined;
  spendingPriority?: SpendingPriority | null | undefined;
  incomeReliability?: IncomeReliability | null | undefined;
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
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class CategoryService {
  constructor(
    private repository: CategoryRepository
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

    // Validate parent if provided
    if (data.parentId !== undefined && data.parentId !== null) {
      await this.validateParentAssignment(data.parentId);
    }

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
      parentId: data.parentId ?? null,
      categoryType: data.categoryType ?? 'expense',
      categoryIcon: data.categoryIcon ?? null,
      categoryColor: data.categoryColor ?? null,
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
      isTaxDeductible: data.isTaxDeductible ?? false,
      taxCategory: data.taxCategory ?? null,
      deductiblePercentage: data.deductiblePercentage ?? null,
      isSeasonal: data.isSeasonal ?? false,
      seasonalMonths: data.seasonalMonths ?? null,
      expectedMonthlyMin: data.expectedMonthlyMin ?? null,
      expectedMonthlyMax: data.expectedMonthlyMax ?? null,
      spendingPriority: data.spendingPriority ?? null,
      incomeReliability: data.incomeReliability ?? null,
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
    return await this.repository.findAllCategories();
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

    // Validate and handle parentId if provided
    if (data.parentId !== undefined) {
      await this.validateParentAssignment(data.parentId, id);
      updateData.parentId = data.parentId;
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
      ? await this.repository.bulkDeleteCategories(deleteableIds)
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
    const allCategories = await this.repository.findAllCategories();
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
   * Get root categories (no parent)
   */
  async getRootCategories() {
    return await this.repository.findRootCategories();
  }

  /**
   * Get children of a category
   */
  async getCategoryChildren(parentId: number) {
    if (!parentId || parentId <= 0) {
      throw new ValidationError("Invalid parent category ID");
    }

    await this.getCategoryById(parentId);
    return await this.repository.findChildren(parentId);
  }

  /**
   * Get category with its children
   */
  async getCategoryWithChildren(id: number) {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    const category = await this.repository.findWithChildren(id);
    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Get full category hierarchy tree
   */
  async getCategoryHierarchyTree() {
    return await this.repository.getHierarchyTree();
  }

  /**
   * Set category parent (with circular reference validation)
   */
  async setCategoryParent(categoryId: number, parentId: number | null) {
    if (!categoryId || categoryId <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    // Verify category exists
    await this.getCategoryById(categoryId);

    // If setting a parent, validate it
    if (parentId !== null) {
      if (parentId <= 0) {
        throw new ValidationError("Invalid parent category ID");
      }

      // Verify parent exists
      await this.getCategoryById(parentId);

      // Prevent self-reference
      if (categoryId === parentId) {
        throw new ValidationError("Category cannot be its own parent");
      }

      // Prevent circular reference
      const descendantIds = await this.repository.getDescendantIds(categoryId);
      if (descendantIds.includes(parentId)) {
        throw new ValidationError(
          "Cannot set parent: This would create a circular reference"
        );
      }
    }

    // Update the parent
    return await this.repository.update(categoryId, {parentId});
  }

  /**
   * Check if category has children
   */
  async categoryHasChildren(id: number): Promise<boolean> {
    if (!id || id <= 0) return false;
    return await this.repository.hasChildren(id);
  }

  /**
   * Get descendant IDs of a category
   */
  async getCategoryDescendantIds(id: number): Promise<number[]> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    await this.getCategoryById(id);
    return await this.repository.getDescendantIds(id);
  }

  /**
   * Validate parent assignment before create/update
   */
  private async validateParentAssignment(
    parentId: number | null | undefined,
    categoryId?: number
  ): Promise<void> {
    if (parentId === null || parentId === undefined) return;

    if (parentId <= 0) {
      throw new ValidationError("Invalid parent category ID");
    }

    // Verify parent exists
    await this.getCategoryById(parentId);

    // If updating, check for circular reference
    if (categoryId) {
      if (categoryId === parentId) {
        throw new ValidationError("Category cannot be its own parent");
      }

      const descendantIds = await this.repository.getDescendantIds(categoryId);
      if (descendantIds.includes(parentId)) {
        throw new ValidationError(
          "Cannot set parent: This would create a circular reference"
        );
      }
    }
  }

  /**
   * Private: Validate unique category name
   */
  private async validateUniqueCategoryName(name: string, excludeId?: number): Promise<void> {
    const existingCategories = await this.repository.findAllCategories();

    const duplicate = existingCategories.find(category =>
      category.name?.toLowerCase() === name.toLowerCase() &&
      category.id !== excludeId
    );

    if (duplicate) {
      throw new ConflictError(`Category with name "${name}" already exists`);
    }
  }
}