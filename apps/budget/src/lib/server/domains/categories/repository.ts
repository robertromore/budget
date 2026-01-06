import { categories, transactions } from "$lib/schema";
import { budgets } from "$lib/schema/budgets";
import { envelopeAllocations } from "$lib/schema/budgets/envelope-allocations";
import type {
  Category,
  CategoryType,
  IncomeReliability,
  NewCategory,
  SpendingPriority,
  TaxCategory,
} from "$lib/schema/categories";
import { categoryGroupMemberships, categoryGroups } from "$lib/schema/category-groups";
import { db } from "$lib/server/db";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import type { CategoryTreeNode } from "$lib/types/categories";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

export interface UpdateCategoryData {
  name?: string | undefined;
  slug?: string | undefined;
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
  deletedAt?: string | null | undefined;
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

export interface CategoryWithGroup extends Category {
  groupId: number | null;
  groupName: string | null;
  groupColor: string | null;
  groupIcon: string | null;
}

/**
 * Repository for category database operations
 */
export class CategoryRepository extends BaseRepository<
  typeof categories,
  Category,
  NewCategory,
  UpdateCategoryData
> {
  constructor() {
    super(db, categories, "Category");
  }
  /**
   * Create a new category
   */
  override async create(data: NewCategory, workspaceId?: number): Promise<Category> {
    if (workspaceId === undefined) {
      throw new ValidationError("workspaceId is required for category creation");
    }

    const [category] = await db
      .insert(categories)
      .values({ ...data, workspaceId })
      .returning();

    if (!category) {
      throw new Error("Failed to create category");
    }

    return category;
  }

  /**
   * Find category by ID with workspaceId filtering
   */
  override async findById(id: number, workspaceId?: number): Promise<Category | null> {
    if (workspaceId === undefined) {
      throw new ValidationError("workspaceId is required for category lookup");
    }

    const result = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.workspaceId, workspaceId)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find category by slug with workspaceId filtering
   */
  override async findBySlug(slug: string, workspaceId?: number): Promise<Category | null> {
    if (workspaceId === undefined) {
      throw new ValidationError("workspaceId is required for category lookup");
    }

    const { isNull } = await import("drizzle-orm");

    const result = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.slug, slug),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Check if slug exists (including deleted categories)
   * @deprecated Use isSlugUnique() inherited from BaseRepository instead
   */
  async slugExists(slug: string, workspaceId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.workspaceId, workspaceId)))
      .limit(1);

    return !!result;
  }

  /**
   * Find all active categories (without pagination)
   */
  async findAllCategories(workspaceId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(and(eq(categories.workspaceId, workspaceId), isNull(categories.deletedAt)))
      .orderBy(categories.name);
  }

  /**
   * Update category
   */
  override async update(
    id: number,
    data: UpdateCategoryData,
    workspaceId?: number
  ): Promise<Category> {
    if (workspaceId === undefined) {
      throw new ValidationError("workspaceId is required for category update");
    }

    const [category] = await db
      .update(categories)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      )
      .returning();

    if (!category) {
      throw new NotFoundError("Category", id);
    }

    return category;
  }

  /**
   * Soft delete category with slug archiving
   */
  override async softDelete(id: number, workspaceId?: number): Promise<Category> {
    // Get existing entity
    const entity = await this.findById(id, workspaceId);
    if (!entity) {
      throw new NotFoundError("Category", id);
    }

    const slug = entity.slug;
    const timestamp = Date.now();
    const archivedSlug = `${slug}-deleted-${timestamp}`;

    // Update with archived slug and deletedAt
    return await this.update(
      id,
      {
        slug: archivedSlug,
        deletedAt: getCurrentTimestamp(),
      },
      workspaceId
    );
  }

  /**
   * Bulk soft delete categories with slug archiving
   * Returns the number of categories deleted
   */
  async bulkDeleteCategories(ids: number[], workspaceId: number): Promise<number> {
    if (ids.length === 0) return 0;

    // Get existing entities to access their slugs
    const entities = await db
      .select()
      .from(categories)
      .where(
        and(
          inArray(categories.id, ids),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      );

    if (entities.length === 0) return 0;

    // Delete each entity with slug modification
    const timestamp = Date.now();
    let deletedCount = 0;

    for (const entity of entities) {
      const slug = entity.slug;
      const id = entity.id;
      const archivedSlug = `${slug}-deleted-${timestamp}`;

      try {
        await this.update(
          id,
          {
            slug: archivedSlug,
            deletedAt: getCurrentTimestamp(),
          },
          workspaceId
        );
        deletedCount++;
      } catch (error) {
        // Continue with other entities
        console.error(`Failed to delete category ${id}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * Search categories by name
   */
  async search(query: string, workspaceId: number): Promise<Category[]> {
    if (!query.trim()) {
      return this.findAllCategories(workspaceId);
    }

    const { isNull } = await import("drizzle-orm");
    const { like } = await import("drizzle-orm");

    return await db
      .select()
      .from(categories)
      .where(
        and(
          like(categories.name, `%${query}%`),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      )
      .limit(50)
      .orderBy(categories.name);
  }

  /**
   * Find categories used in account transactions
   */
  async findByAccountTransactions(accountId: number, workspaceId: number): Promise<Category[]> {
    const categoryIds = await db
      .selectDistinct({ categoryId: transactions.categoryId })
      .from(transactions)
      .where(and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)));

    if (categoryIds.length === 0) return [];

    const validCategoryIds = categoryIds
      .filter((item) => item.categoryId !== null)
      .map((item) => item.categoryId!);

    if (validCategoryIds.length === 0) return [];

    return await db
      .select()
      .from(categories)
      .where(
        and(
          inArray(categories.id, validCategoryIds),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      )
      .orderBy(categories.name);
  }

  /**
   * Get category statistics
   */
  async getStats(id: number, workspaceId: number): Promise<CategoryStats> {
    const [stats] = await db
      .select({
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        averageAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
        lastTransactionDate: sql<string | null>`MAX(${transactions.date})`,
      })
      .from(transactions)
      .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)));

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
  async findAllWithStats(workspaceId: number): Promise<CategoryWithStats[]> {
    const categoriesData = await this.findAllCategories(workspaceId);

    const categoriesWithStats: CategoryWithStats[] = [];

    for (const category of categoriesData) {
      const stats = await this.getStats(category.id, workspaceId);
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
    workspaceId: number,
    limit: number = 10,
    accountId?: number
  ): Promise<CategoryWithStats[]> {
    let whereCondition = and(isNull(transactions.deletedAt));

    if (accountId) {
      whereCondition = and(whereCondition, eq(transactions.accountId, accountId));
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

    const categoryIds = topCategoryIds.map((item) => item.categoryId!);

    const categoriesData = await db
      .select()
      .from(categories)
      .where(
        and(
          inArray(categories.id, categoryIds),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      );

    const categoriesWithStats: CategoryWithStats[] = [];

    for (const category of categoriesData) {
      const stats = await this.getStats(category.id, workspaceId);
      categoriesWithStats.push({
        ...category,
        stats,
      });
    }

    // Sort by total amount (descending)
    return categoriesWithStats.sort(
      (a, b) => Math.abs(b.stats.totalAmount) - Math.abs(a.stats.totalAmount)
    );
  }

  // exists() inherited from BaseRepository

  /**
   * Check if category has associated transactions
   */
  async hasTransactions(id: number, workspaceId: number): Promise<boolean> {
    const [result] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)))
      .limit(1);

    return !!result;
  }

  /**
   * Get category transaction count
   */
  async getTransactionCount(id: number, workspaceId: number): Promise<number> {
    const [result] = await db
      .select({ count: count(transactions.id) })
      .from(transactions)
      .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)));

    return result?.count || 0;
  }

  /**
   * Get budget summary for a category
   */
  async getBudgetSummary(
    categoryId: number,
    workspaceId: number
  ): Promise<CategoryBudgetSummary[]> {
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

    return results.map((r) => ({
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
  async findByIdWithBudgets(id: number, workspaceId: number): Promise<CategoryWithBudgets | null> {
    const category = await this.findById(id, workspaceId);
    if (!category) return null;

    const budgetSummaries = await this.getBudgetSummary(id, workspaceId);

    return {
      ...category,
      budgets: budgetSummaries,
    };
  }

  /**
   * Get all categories with budget data
   */
  async findAllWithBudgets(workspaceId: number): Promise<CategoryWithBudgets[]> {
    const allCategories = await this.findAllCategories(workspaceId);

    const categoriesWithBudgets = await Promise.all(
      allCategories.map(async (category) => {
        const budgetSummaries = await this.getBudgetSummary(category.id, workspaceId);
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
  async findRootCategories(workspaceId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.workspaceId, workspaceId),
          isNull(categories.parentId),
          isNull(categories.deletedAt)
        )
      )
      .orderBy(categories.displayOrder, categories.name);
  }

  /**
   * Find direct children of a category
   */
  async findChildren(parentId: number, workspaceId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.parentId, parentId),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      )
      .orderBy(categories.displayOrder, categories.name);
  }

  /**
   * Find category with its direct children
   */
  async findWithChildren(id: number, workspaceId: number): Promise<CategoryWithChildren | null> {
    const category = await this.findById(id, workspaceId);
    if (!category) return null;

    const children = await this.findChildren(id, workspaceId);

    return {
      ...category,
      children,
    };
  }

  /**
   * Build full category hierarchy tree
   */
  async getHierarchyTree(workspaceId: number): Promise<CategoryTreeNode[]> {
    const allCategories = await this.findAllCategories(workspaceId);

    // Create a map for quick lookup
    const categoryMap = new Map<number, CategoryTreeNode>();

    // Initialize all categories as tree nodes
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        ...cat,
        children: [],
      });
    });

    // Build the tree
    const rootNodes: CategoryTreeNode[] = [];

    allCategories.forEach((cat) => {
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
  async hasChildren(id: number, workspaceId: number): Promise<boolean> {
    const [result] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.parentId, id),
          eq(categories.workspaceId, workspaceId),
          isNull(categories.deletedAt)
        )
      )
      .limit(1);

    return !!result;
  }

  /**
   * Get all descendant IDs of a category (recursive)
   */
  async getDescendantIds(id: number, workspaceId: number): Promise<number[]> {
    const children = await this.findChildren(id, workspaceId);
    let descendantIds: number[] = children.map((c) => c.id);

    for (const child of children) {
      const childDescendants = await this.getDescendantIds(child.id, workspaceId);
      descendantIds = [...descendantIds, ...childDescendants];
    }

    return descendantIds;
  }

  /**
   * Find all categories with their assigned group information
   */
  async findAllWithGroups(workspaceId: number): Promise<CategoryWithGroup[]> {
    const results = await db
      .select({
        // Category fields
        id: categories.id,
        seq: categories.seq,
        slug: categories.slug,
        name: categories.name,
        notes: categories.notes,
        parentId: categories.parentId,
        categoryType: categories.categoryType,
        categoryIcon: categories.categoryIcon,
        categoryColor: categories.categoryColor,
        isActive: categories.isActive,
        displayOrder: categories.displayOrder,
        isTaxDeductible: categories.isTaxDeductible,
        taxCategory: categories.taxCategory,
        deductiblePercentage: categories.deductiblePercentage,
        isSeasonal: categories.isSeasonal,
        seasonalMonths: categories.seasonalMonths,
        expectedMonthlyMin: categories.expectedMonthlyMin,
        expectedMonthlyMax: categories.expectedMonthlyMax,
        spendingPriority: categories.spendingPriority,
        incomeReliability: categories.incomeReliability,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        deletedAt: categories.deletedAt,
        // Group fields
        groupId: categoryGroups.id,
        groupName: categoryGroups.name,
        groupColor: categoryGroups.groupColor,
        groupIcon: categoryGroups.groupIcon,
      })
      .from(categories)
      .leftJoin(categoryGroupMemberships, eq(categories.id, categoryGroupMemberships.categoryId))
      .leftJoin(categoryGroups, eq(categoryGroupMemberships.categoryGroupId, categoryGroups.id))
      .where(and(eq(categories.workspaceId, workspaceId), isNull(categories.deletedAt)))
      .orderBy(categories.name);

    return results.map((row) => ({
      id: row.id,
      seq: row.seq,
      slug: row.slug,
      name: row.name,
      notes: row.notes,
      workspaceId: workspaceId,
      parentId: row.parentId,
      categoryType: row.categoryType,
      categoryIcon: row.categoryIcon,
      categoryColor: row.categoryColor,
      isActive: row.isActive,
      displayOrder: row.displayOrder,
      isTaxDeductible: row.isTaxDeductible,
      taxCategory: row.taxCategory,
      deductiblePercentage: row.deductiblePercentage,
      isSeasonal: row.isSeasonal,
      seasonalMonths: row.seasonalMonths,
      expectedMonthlyMin: row.expectedMonthlyMin,
      expectedMonthlyMax: row.expectedMonthlyMax,
      spendingPriority: row.spendingPriority,
      incomeReliability: row.incomeReliability,
      dateCreated: row.createdAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      groupId: row.groupId,
      groupName: row.groupName,
      groupColor: row.groupColor,
      groupIcon: row.groupIcon,
    }));
  }
}
