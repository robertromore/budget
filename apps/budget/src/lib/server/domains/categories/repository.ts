import {db} from "$lib/server/db";
import {getCurrentTimestamp} from "$lib/utils/dates";
import {categories, transactions} from "$lib/schema";
import {envelopeAllocations} from "$lib/schema/budgets/envelope-allocations";
import {budgets} from "$lib/schema/budgets";
import {eq, and, isNull, like, inArray, sql, count, desc} from "drizzle-orm";
import type {Category, NewCategory, CategoryType, TaxCategory, SpendingPriority, IncomeReliability} from "$lib/schema/categories";
import {NotFoundError} from "$lib/server/shared/types/errors";
import type {CategoryTreeNode} from "$lib/types/categories";

export interface UpdateCategoryData {
  name?: string | undefined;
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

export interface CategoryStats {
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  lastTransactionDate: string | null;
}

export interface CategoryWithStats extends Category {
  stats: CategoryStats;
}

export interface CategoryBudgetSummary {
  budgetId: number;
  budgetName: string;
  budgetSlug: string;
  envelopeId: number;
  allocatedAmount: number;
  spentAmount: number;
  availableAmount: number;
  rolloverAmount: number;
  deficitAmount: number;
  status: string;
  lastCalculated: string | null;
}

export interface CategoryWithBudgets extends Category {
  budgets: CategoryBudgetSummary[];
}

export interface CategoryWithChildren extends Category {
  children: Category[];
}

/**
 * Repository for category database operations
 */
export class CategoryRepository {
  /**
   * Create a new category
   */
  async create(data: NewCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(data)
      .returning();

    if (!category) {
      throw new Error("Failed to create category");
    }

    return category;
  }

  /**
   * Find category by ID
   */
  async findById(id: number): Promise<Category | null> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    return category || null;
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category | null> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), isNull(categories.deletedAt)))
      .limit(1);

    return category || null;
  }

  /**
   * Check if slug exists (including deleted categories)
   */
  async slugExists(slug: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    return !!result;
  }

  /**
   * Find all active categories
   */
  async findAll(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(categories.name);
  }

  /**
   * Update category
   */
  async update(id: number, data: UpdateCategoryData): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .returning();

    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Soft delete category
   */
  async softDelete(id: number): Promise<Category> {
    // First, get the current category to access its slug
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    if (!existingCategory) {
      throw new NotFoundError("Category", id);
    }

    // Append timestamp to slug to free it up for future use
    const timestamp = Date.now();
    const archivedSlug = `${existingCategory.slug}-deleted-${timestamp}`;

    const [category] = await db
      .update(categories)
      .set({
        slug: archivedSlug,
        deletedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .returning();

    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Bulk soft delete categories
   */
  async bulkDelete(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    // Get existing categories to access their slugs
    const existingCategories = await db
      .select()
      .from(categories)
      .where(and(
        inArray(categories.id, ids),
        isNull(categories.deletedAt)
      ));

    // Delete each category with slug modification
    const timestamp = Date.now();
    const deletedCategories = [];

    for (const category of existingCategories) {
      const archivedSlug = `${category.slug}-deleted-${timestamp}`;
      const [deleted] = await db
        .update(categories)
        .set({
          slug: archivedSlug,
          deletedAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(categories.id, category.id))
        .returning({id: categories.id});

      if (deleted) {
        deletedCategories.push(deleted);
      }
    }

    return deletedCategories.length;
  }

  /**
   * Search categories by name
   */
  async search(query: string): Promise<Category[]> {
    if (!query.trim()) {
      return this.findAll();
    }

    return await db
      .select()
      .from(categories)
      .where(and(
        like(categories.name, `%${query}%`),
        isNull(categories.deletedAt)
      ))
      .orderBy(categories.name)
      .limit(50);
  }

  /**
   * Find categories used in account transactions
   */
  async findByAccountTransactions(accountId: number): Promise<Category[]> {
    const categoryIds = await db
      .selectDistinct({categoryId: transactions.categoryId})
      .from(transactions)
      .where(and(
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt)
      ));

    if (categoryIds.length === 0) return [];

    const validCategoryIds = categoryIds
      .filter(item => item.categoryId !== null)
      .map(item => item.categoryId!);

    if (validCategoryIds.length === 0) return [];

    return await db
      .select()
      .from(categories)
      .where(and(
        inArray(categories.id, validCategoryIds),
        isNull(categories.deletedAt)
      ))
      .orderBy(categories.name);
  }

  /**
   * Get category statistics
   */
  async getStats(id: number): Promise<CategoryStats> {
    const [stats] = await db
      .select({
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        averageAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
        lastTransactionDate: sql<string | null>`MAX(${transactions.date})`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.categoryId, id),
        isNull(transactions.deletedAt)
      ));

    return {
      transactionCount: stats?.transactionCount || 0,
      totalAmount: stats?.totalAmount || 0,
      averageAmount: stats?.averageAmount || 0,
      lastTransactionDate: stats?.lastTransactionDate || null,
    };
  }

  /**
   * Get categories with statistics
   */
  async findAllWithStats(): Promise<CategoryWithStats[]> {
    const categoriesData = await this.findAll();

    const categoriesWithStats: CategoryWithStats[] = [];

    for (const category of categoriesData) {
      const stats = await this.getStats(category.id);
      categoriesWithStats.push({
        ...category,
        stats,
      });
    }

    return categoriesWithStats;
  }

  /**
   * Get top categories by transaction amount
   */
  async getTopCategories(
    limit: number = 10,
    accountId?: number
  ): Promise<CategoryWithStats[]> {
    let whereCondition = and(isNull(transactions.deletedAt));

    if (accountId) {
      whereCondition = and(
        whereCondition,
        eq(transactions.accountId, accountId)
      );
    }

    const topCategoryIds = await db
      .select({
        categoryId: transactions.categoryId,
        totalAmount: sql<number>`ABS(SUM(${transactions.amount}))`,
      })
      .from(transactions)
      .where(whereCondition)
      .groupBy(transactions.categoryId)
      .having(sql`${transactions.categoryId} IS NOT NULL`)
      .orderBy(sql`ABS(SUM(${transactions.amount})) DESC`)
      .limit(limit);

    if (topCategoryIds.length === 0) return [];

    const categoryIds = topCategoryIds.map(item => item.categoryId!);

    const categoriesData = await db
      .select()
      .from(categories)
      .where(and(
        inArray(categories.id, categoryIds),
        isNull(categories.deletedAt)
      ));

    const categoriesWithStats: CategoryWithStats[] = [];

    for (const category of categoriesData) {
      const stats = await this.getStats(category.id);
      categoriesWithStats.push({
        ...category,
        stats,
      });
    }

    // Sort by total amount (descending)
    return categoriesWithStats.sort((a, b) =>
      Math.abs(b.stats.totalAmount) - Math.abs(a.stats.totalAmount)
    );
  }

  /**
   * Check if category exists and is active
   */
  async exists(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: categories.id})
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    return !!result;
  }

  /**
   * Check if category has associated transactions
   */
  async hasTransactions(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: transactions.id})
      .from(transactions)
      .where(and(
        eq(transactions.categoryId, id),
        isNull(transactions.deletedAt)
      ))
      .limit(1);

    return !!result;
  }

  /**
   * Get category transaction count
   */
  async getTransactionCount(id: number): Promise<number> {
    const [result] = await db
      .select({count: count(transactions.id)})
      .from(transactions)
      .where(and(
        eq(transactions.categoryId, id),
        isNull(transactions.deletedAt)
      ));

    return result?.count || 0;
  }

  /**
   * Get budget summary for a category
   */
  async getBudgetSummary(categoryId: number): Promise<CategoryBudgetSummary[]> {
    const results = await db
      .select({
        budgetId: budgets.id,
        budgetName: budgets.name,
        budgetSlug: budgets.slug,
        envelopeId: envelopeAllocations.id,
        allocatedAmount: envelopeAllocations.allocatedAmount,
        spentAmount: envelopeAllocations.spentAmount,
        availableAmount: envelopeAllocations.availableAmount,
        rolloverAmount: envelopeAllocations.rolloverAmount,
        deficitAmount: envelopeAllocations.deficitAmount,
        status: envelopeAllocations.status,
        lastCalculated: envelopeAllocations.lastCalculated,
      })
      .from(envelopeAllocations)
      .leftJoin(budgets, eq(envelopeAllocations.budgetId, budgets.id))
      .where(eq(envelopeAllocations.categoryId, categoryId))
      .orderBy(desc(envelopeAllocations.updatedAt));

    return results.map(r => ({
      budgetId: r.budgetId!,
      budgetName: r.budgetName!,
      budgetSlug: r.budgetSlug!,
      envelopeId: r.envelopeId,
      allocatedAmount: r.allocatedAmount,
      spentAmount: r.spentAmount,
      availableAmount: r.availableAmount,
      rolloverAmount: r.rolloverAmount,
      deficitAmount: r.deficitAmount,
      status: r.status,
      lastCalculated: r.lastCalculated,
    }));
  }

  /**
   * Get category with budget data
   */
  async findByIdWithBudgets(id: number): Promise<CategoryWithBudgets | null> {
    const category = await this.findById(id);
    if (!category) return null;

    const budgetSummaries = await this.getBudgetSummary(id);

    return {
      ...category,
      budgets: budgetSummaries,
    };
  }

  /**
   * Get all categories with budget data
   */
  async findAllWithBudgets(): Promise<CategoryWithBudgets[]> {
    const allCategories = await this.findAll();

    const categoriesWithBudgets = await Promise.all(
      allCategories.map(async (category) => {
        const budgetSummaries = await this.getBudgetSummary(category.id);
        return {
          ...category,
          budgets: budgetSummaries,
        };
      })
    );

    return categoriesWithBudgets;
  }

  /**
   * Find all root categories (no parent)
   */
  async findRootCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(and(
        isNull(categories.parentId),
        isNull(categories.deletedAt)
      ))
      .orderBy(categories.displayOrder, categories.name);
  }

  /**
   * Find direct children of a category
   */
  async findChildren(parentId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.parentId, parentId),
        isNull(categories.deletedAt)
      ))
      .orderBy(categories.displayOrder, categories.name);
  }

  /**
   * Find category with its direct children
   */
  async findWithChildren(id: number): Promise<CategoryWithChildren | null> {
    const category = await this.findById(id);
    if (!category) return null;

    const children = await this.findChildren(id);

    return {
      ...category,
      children,
    };
  }

  /**
   * Build full category hierarchy tree
   */
  async getHierarchyTree(): Promise<CategoryTreeNode[]> {
    const allCategories = await this.findAll();

    // Create a map for quick lookup
    const categoryMap = new Map<number, CategoryTreeNode>();

    // Initialize all categories as tree nodes
    allCategories.forEach(cat => {
      categoryMap.set(cat.id, {
        ...cat,
        children: [],
      });
    });

    // Build the tree
    const rootNodes: CategoryTreeNode[] = [];

    allCategories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;

      if (cat.parentId === null) {
        // Root category
        rootNodes.push(node);
      } else {
        // Child category
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not found or deleted, treat as root
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }

  /**
   * Check if category has children
   */
  async hasChildren(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: categories.id})
      .from(categories)
      .where(and(
        eq(categories.parentId, id),
        isNull(categories.deletedAt)
      ))
      .limit(1);

    return !!result;
  }

  /**
   * Get all descendant IDs of a category (recursive)
   */
  async getDescendantIds(id: number): Promise<number[]> {
    const children = await this.findChildren(id);
    let descendantIds: number[] = children.map(c => c.id);

    for (const child of children) {
      const childDescendants = await this.getDescendantIds(child.id);
      descendantIds = [...descendantIds, ...childDescendants];
    }

    return descendantIds;
  }
}