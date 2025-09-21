import {db} from "$lib/server/db";
import {categories, transactions} from "$lib/schema";
import {eq, and, isNull, like, inArray, sql, count, sum} from "drizzle-orm";
import type {Category, NewCategory} from "$lib/schema/categories";
import {NotFoundError} from "$lib/server/shared/types/errors";

export interface UpdateCategoryData {
  name?: string;
  notes?: string | null;
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
        updatedAt: new Date().toISOString(),
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
    const [category] = await db
      .update(categories)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

    const result = await db
      .update(categories)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        inArray(categories.id, ids),
        isNull(categories.deletedAt)
      ))
      .returning({id: categories.id});

    return result.length;
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
}