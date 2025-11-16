import type {
  Category,
  CategoryType,
  IncomeReliability,
  NewCategory,
  SpendingPriority,
  TaxCategory,
} from "$lib/schema/categories";
import { ConflictError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { defaultCategories } from "./default-categories";
import {
  CategoryRepository,
  type CategoryStats,
  type CategoryWithGroup,
  type CategoryWithStats,
  type UpdateCategoryData,
} from "./repository";

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
  constructor(private repository: CategoryRepository) {}

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData, workspaceId: number): Promise<Category> {
    // Validate and sanitize input
    if (!data.name?.trim()) {
      throw new ValidationError("Category name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid category name");
    }

    const sanitizedNotes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : null;

    // Validate parent if provided
    if (data.parentId !== undefined && data.parentId !== null) {
      await this.validateParentAssignment(data.parentId, workspaceId);
    }

    // Check for duplicate names (case-insensitive)
    await this.validateUniqueCategoryName(sanitizedName, workspaceId);

    // Generate unique slug
    let baseSlug = this.generateSlug(sanitizedName);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness (only checking active categories since deleted ones have modified slugs)
    while (await this.repository.findBySlug(slug, workspaceId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newCategory: NewCategory = {
      name: sanitizedName,
      slug,
      notes: sanitizedNotes,
      parentId: data.parentId ?? null,
      categoryType: data.categoryType ?? "expense",
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

    return await this.repository.create(newCategory, workspaceId);
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number, workspaceId: number): Promise<Category> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    const category = await this.repository.findById(id, workspaceId);
    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string, workspaceId: number): Promise<Category> {
    if (!slug?.trim()) {
      throw new ValidationError("Invalid category slug");
    }

    const category = await this.repository.findBySlug(slug, workspaceId);
    if (!category) {
      throw new NotFoundError("Category", slug);
    }

    return category;
  }

  /**
   * Get category by ID with statistics
   */
  async getCategoryWithStats(id: number, workspaceId: number): Promise<CategoryWithStats> {
    const category = await this.getCategoryById(id, workspaceId);
    const stats = await this.repository.getStats(id, workspaceId);

    return {
      ...category,
      stats,
    };
  }

  /**
   * Get all categories
   */
  async getAllCategories(workspaceId: number): Promise<Category[]> {
    return await this.repository.findAllCategories(workspaceId);
  }

  /**
   * Get all categories with statistics
   */
  async getAllCategoriesWithStats(workspaceId: number): Promise<CategoryWithStats[]> {
    return await this.repository.findAllWithStats(workspaceId);
  }

  /**
   * Get all categories with their assigned group information
   */
  async getAllCategoriesWithGroups(workspaceId: number): Promise<CategoryWithGroup[]> {
    return await this.repository.findAllWithGroups(workspaceId);
  }

  /**
   * Update category
   */
  async updateCategory(
    id: number,
    data: UpdateCategoryData,
    workspaceId: number
  ): Promise<Category> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    // Verify category exists
    await this.getCategoryById(id, workspaceId);

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
      await this.validateUniqueCategoryName(sanitizedName, workspaceId, id);
      updateData.name = sanitizedName;
    }

    // Validate and sanitize notes if provided
    if (data.notes !== undefined) {
      updateData.notes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : null;
    }

    // Validate and handle parentId if provided
    if (data.parentId !== undefined) {
      await this.validateParentAssignment(data.parentId, workspaceId, id);
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

    return await this.repository.update(id, updateData, workspaceId);
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(
    id: number,
    workspaceId: number,
    options: { force?: boolean } = {}
  ): Promise<Category> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    // Verify category exists
    await this.getCategoryById(id, workspaceId);

    // Check for associated transactions unless force delete
    if (!options.force) {
      const hasTransactions = await this.repository.hasTransactions(id, workspaceId);
      if (hasTransactions) {
        throw new ConflictError(
          "Cannot delete category with associated transactions. Use force delete or reassign transactions first."
        );
      }
    }

    return await this.repository.softDelete(id, workspaceId);
  }

  /**
   * Bulk delete categories
   */
  async bulkDeleteCategories(
    ids: number[],
    workspaceId: number,
    options: { force?: boolean } = {}
  ): Promise<{ deletedCount: number; errors: string[] }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("No category IDs provided");
    }

    const validIds = ids.filter((id) => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid category IDs provided");
    }

    const errors: string[] = [];
    const deleteableIds: number[] = [];

    // Validate each category and check for conflicts
    for (const id of validIds) {
      try {
        await this.getCategoryById(id, workspaceId);

        if (!options.force) {
          const hasTransactions = await this.repository.hasTransactions(id, workspaceId);
          if (hasTransactions) {
            errors.push(`Category ${id}: Has associated transactions`);
            continue;
          }
        }

        deleteableIds.push(id);
      } catch (error) {
        errors.push(`Category ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    const deletedCount =
      deleteableIds.length > 0
        ? await this.repository.bulkDeleteCategories(deleteableIds, workspaceId)
        : 0;

    return { deletedCount, errors };
  }

  /**
   * Bulk update category display order
   */
  async bulkUpdateDisplayOrder(
    updates: Array<{ id: number; displayOrder: number }>,
    workspaceId: number
  ): Promise<{ updatedCount: number; errors: string[] }> {
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
        await this.getCategoryById(update.id, workspaceId);

        // Update display order
        await this.repository.update(update.id, { displayOrder: update.displayOrder }, workspaceId);
        updatedCount++;
      } catch (error) {
        errors.push(
          `Category ${update.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return { updatedCount, errors };
  }

  /**
   * Search categories
   */
  async searchCategories(query: string, workspaceId: number): Promise<Category[]> {
    const sanitizedQuery = query?.trim() || "";
    return await this.repository.search(sanitizedQuery, workspaceId);
  }

  /**
   * Get categories used in account transactions
   */
  async getCategoriesByAccount(accountId: number, workspaceId: number): Promise<Category[]> {
    if (!accountId || accountId <= 0) {
      throw new ValidationError("Invalid account ID");
    }

    return await this.repository.findByAccountTransactions(accountId, workspaceId);
  }

  /**
   * Get top categories by spending
   */
  async getTopCategories(
    workspaceId: number,
    limit: number = 10,
    accountId?: number
  ): Promise<CategoryWithStats[]> {
    if (limit <= 0 || limit > 100) {
      throw new ValidationError("Limit must be between 1 and 100");
    }

    if (accountId && accountId <= 0) {
      throw new ValidationError("Invalid account ID");
    }

    return await this.repository.getTopCategories(workspaceId, limit, accountId);
  }

  /**
   * Verify category exists
   */
  async verifyCategoryExists(id: number, workspaceId: number): Promise<boolean> {
    if (!id || id <= 0) return false;
    const category = await this.repository.findById(id, workspaceId);
    return category !== null;
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(id: number, workspaceId: number): Promise<CategoryStats> {
    await this.getCategoryById(id, workspaceId); // Verify exists
    return await this.repository.getStats(id, workspaceId);
  }

  /**
   * Get category analytics with trends
   */
  async getCategoryAnalytics(id: number, workspaceId: number): Promise<CategoryAnalytics> {
    const stats = await this.repository.getStats(id, workspaceId);

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
  async mergeCategories(sourceId: number, targetId: number, workspaceId: number): Promise<void> {
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new ValidationError("Invalid category IDs for merge operation");
    }

    // Verify both categories exist
    await this.getCategoryById(sourceId, workspaceId);
    await this.getCategoryById(targetId, workspaceId);

    // Note: Transaction reassignment would be handled by TransactionService
    // This is a placeholder for the merge operation business logic
    throw new Error("Category merge functionality not yet implemented");
  }

  /**
   * Get category usage summary
   */
  async getCategoryUsageSummary(workspaceId: number): Promise<{
    totalCategories: number;
    categoriesWithTransactions: number;
    averageTransactionsPerCategory: number;
    topCategory: CategoryWithStats | null;
  }> {
    const allCategories = await this.repository.findAllCategories(workspaceId);
    const categoriesWithStats = await this.repository.findAllWithStats(workspaceId);

    const categoriesWithTransactions = categoriesWithStats.filter(
      (cat) => cat.stats.transactionCount > 0
    );

    const totalTransactions = categoriesWithStats.reduce(
      (sum, cat) => sum + cat.stats.transactionCount,
      0
    );

    const topCategory =
      categoriesWithStats.length > 0
        ? categoriesWithStats.reduce((top, cat) =>
            Math.abs(cat.stats.totalAmount) > Math.abs(top.stats.totalAmount) ? cat : top
          )
        : null;

    return {
      totalCategories: allCategories.length,
      categoriesWithTransactions: categoriesWithTransactions.length,
      averageTransactionsPerCategory:
        categoriesWithTransactions.length > 0
          ? totalTransactions / categoriesWithTransactions.length
          : 0,
      topCategory: topCategory && topCategory.stats.transactionCount > 0 ? topCategory : null,
    };
  }

  /**
   * Get category by ID with budget data
   */
  async getCategoryByIdWithBudgets(id: number, workspaceId: number) {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    const category = await this.repository.findByIdWithBudgets(id, workspaceId);
    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Get category by slug with budget data
   */
  async getCategoryBySlugWithBudgets(slug: string, workspaceId: number) {
    if (!slug?.trim()) {
      throw new ValidationError("Invalid category slug");
    }

    const category = await this.repository.findBySlug(slug, workspaceId);
    if (!category) {
      throw new NotFoundError("Category", slug);
    }

    const budgetSummaries = await this.repository.getBudgetSummary(category.id, workspaceId);

    return {
      ...category,
      budgets: budgetSummaries,
    };
  }

  /**
   * Get all categories with budget data
   */
  async getAllCategoriesWithBudgets(workspaceId: number) {
    return await this.repository.findAllWithBudgets(workspaceId);
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(workspaceId: number) {
    return await this.repository.findRootCategories(workspaceId);
  }

  /**
   * Get children of a category
   */
  async getCategoryChildren(parentId: number, workspaceId: number) {
    if (!parentId || parentId <= 0) {
      throw new ValidationError("Invalid parent category ID");
    }

    await this.getCategoryById(parentId, workspaceId);
    return await this.repository.findChildren(parentId, workspaceId);
  }

  /**
   * Get category with its children
   */
  async getCategoryWithChildren(id: number, workspaceId: number) {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    const category = await this.repository.findWithChildren(id, workspaceId);
    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Get full category hierarchy tree
   */
  async getCategoryHierarchyTree(workspaceId: number) {
    return await this.repository.getHierarchyTree(workspaceId);
  }

  /**
   * Set category parent (with circular reference validation)
   */
  async setCategoryParent(categoryId: number, parentId: number | null, workspaceId: number) {
    if (!categoryId || categoryId <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    // Verify category exists
    await this.getCategoryById(categoryId, workspaceId);

    // If setting a parent, validate it
    if (parentId !== null) {
      if (parentId <= 0) {
        throw new ValidationError("Invalid parent category ID");
      }

      // Verify parent exists
      await this.getCategoryById(parentId, workspaceId);

      // Prevent self-reference
      if (categoryId === parentId) {
        throw new ValidationError("Category cannot be its own parent");
      }

      // Prevent circular reference
      const descendantIds = await this.repository.getDescendantIds(categoryId, workspaceId);
      if (descendantIds.includes(parentId)) {
        throw new ValidationError("Cannot set parent: This would create a circular reference");
      }
    }

    // Update the parent
    return await this.repository.update(categoryId, { parentId }, workspaceId);
  }

  /**
   * Check if category has children
   */
  async categoryHasChildren(id: number, workspaceId: number): Promise<boolean> {
    if (!id || id <= 0) return false;
    return await this.repository.hasChildren(id, workspaceId);
  }

  /**
   * Get descendant IDs of a category
   */
  async getCategoryDescendantIds(id: number, workspaceId: number): Promise<number[]> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    await this.getCategoryById(id, workspaceId);
    return await this.repository.getDescendantIds(id, workspaceId);
  }

  /**
   * Validate parent assignment before create/update
   */
  private async validateParentAssignment(
    parentId: number | null | undefined,
    workspaceId: number,
    categoryId?: number
  ): Promise<void> {
    if (parentId === null || parentId === undefined) return;

    if (parentId <= 0) {
      throw new ValidationError("Invalid parent category ID");
    }

    // Verify parent exists
    await this.getCategoryById(parentId, workspaceId);

    // If updating, check for circular reference
    if (categoryId) {
      if (categoryId === parentId) {
        throw new ValidationError("Category cannot be its own parent");
      }

      const descendantIds = await this.repository.getDescendantIds(categoryId, workspaceId);
      if (descendantIds.includes(parentId)) {
        throw new ValidationError("Cannot set parent: This would create a circular reference");
      }
    }
  }

  /**
   * Private: Validate unique category name
   */
  private async validateUniqueCategoryName(
    name: string,
    workspaceId: number,
    excludeId?: number
  ): Promise<void> {
    const existingCategories = await this.repository.findAllCategories(workspaceId);

    const duplicate = existingCategories.find(
      (category) => category.name?.toLowerCase() === name.toLowerCase() && category.id !== excludeId
    );

    if (duplicate) {
      throw new ConflictError(`Category with name "${name}" already exists`);
    }
  }

  /**
   * Seed default popular categories
   * Only creates categories that don't already exist (by slug)
   * @param slugs - Optional array of slugs to seed. If not provided, seeds all default categories.
   */
  async seedDefaultCategories(
    workspaceId: number,
    slugs?: string[]
  ): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Filter categories if specific slugs are provided
    const categoriesToSeed = slugs
      ? defaultCategories.filter((cat) => slugs.includes(cat.slug))
      : defaultCategories;

    for (const defaultCategory of categoriesToSeed) {
      try {
        // Check if category with this slug already exists
        const existing = await this.repository.findBySlug(defaultCategory.slug, workspaceId);

        if (existing) {
          skipped++;
          continue;
        }

        // Create the category
        await this.repository.create(
          {
            ...defaultCategory,
            // These will be set by the database
            dateCreated: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            deletedAt: undefined,
          },
          workspaceId
        );

        created++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to create "${defaultCategory.name}": ${message}`);
      }
    }

    return { created, skipped, errors };
  }

  /**
   * Get list of available default categories (for preview)
   */
  async getAvailableDefaultCategories(): Promise<typeof defaultCategories> {
    return defaultCategories;
  }

  /**
   * Check which default categories are already installed
   */
  async getDefaultCategoriesStatus(workspaceId: number): Promise<{
    total: number;
    installed: number;
    available: number;
    categories: Array<{
      name: string;
      slug: string;
      categoryType: string;
      installed: boolean;
    }>;
  }> {
    const existingCategories = await this.repository.findAllCategories(workspaceId);
    const existingSlugs = new Set(existingCategories.map((c) => c.slug));

    const categories = defaultCategories.map((dc) => ({
      name: dc.name ?? "",
      slug: dc.slug,
      categoryType: dc.categoryType ?? "expense",
      installed: existingSlugs.has(dc.slug),
    }));

    const installedCount = categories.filter((c) => c.installed).length;

    return {
      total: defaultCategories.length,
      installed: installedCount,
      available: defaultCategories.length - installedCount,
      categories,
    };
  }
}
