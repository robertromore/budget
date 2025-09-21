import { and, eq, like, desc, asc, isNull, sql, between } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  budgets,
  budgetAccounts,
  budgetCategories,
  budgetPeriods,
  budgetAllocations,
  type Budget,
  type NewBudget,
  type BudgetAccount,
  type NewBudgetAccount,
  type BudgetCategory,
  type NewBudgetCategory,
  type BudgetPeriod,
  type NewBudgetPeriod,
  type BudgetAllocation,
  type NewBudgetAllocation
} from "$lib/schema/budgets";
import { accounts } from "$lib/schema/accounts";
import { categories } from "$lib/schema/categories";
import { transactions } from "$lib/schema/transactions";
import type {
  BudgetFilters,
  PeriodFilters,
  AllocationFilters,
  PaginationParams,
  PaginatedResult,
  BudgetWithRelations,
  BudgetCategoryWithCategory,
  BudgetAllocationWithTransaction
} from "./types";

export class BudgetRepository {
  // Budget CRUD operations
  async createBudget(data: NewBudget): Promise<Budget> {
    const [budget] = await db.insert(budgets).values({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    if (!budget) {
      throw new Error("Failed to create budget");
    }

    return budget;
  }

  async getBudgetById(id: number): Promise<Budget | null> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)));

    return budget || null;
  }

  async getBudgetByIdWithRelations(id: number): Promise<BudgetWithRelations | null> {
    const budget = await this.getBudgetById(id);
    if (!budget) return null;

    // Get associated accounts
    const budgetAccountsList = await db
      .select({
        account: accounts
      })
      .from(budgetAccounts)
      .innerJoin(accounts, eq(budgetAccounts.accountId, accounts.id))
      .where(eq(budgetAccounts.budgetId, id));

    // Get associated categories with category details
    const budgetCategoriesList = await db
      .select({
        budgetCategory: budgetCategories,
        category: categories
      })
      .from(budgetCategories)
      .innerJoin(categories, eq(budgetCategories.categoryId, categories.id))
      .where(eq(budgetCategories.budgetId, id));

    // Get periods
    const periodsList = await db
      .select()
      .from(budgetPeriods)
      .where(eq(budgetPeriods.budgetId, id))
      .orderBy(desc(budgetPeriods.startDate));

    // Get recent allocations
    const allocationsList = await db
      .select({
        allocation: budgetAllocations,
        transaction: transactions
      })
      .from(budgetAllocations)
      .innerJoin(transactions, eq(budgetAllocations.transactionId, transactions.id))
      .where(eq(budgetAllocations.budgetId, id))
      .orderBy(desc(budgetAllocations.createdAt))
      .limit(10);

    return {
      ...budget,
      accounts: budgetAccountsList.map(item => item.account),
      categories: budgetCategoriesList.map(item => ({
        ...item.budgetCategory,
        category: item.category
      })) as BudgetCategoryWithCategory[],
      periods: periodsList,
      allocations: allocationsList.map(item => ({
        ...item.allocation,
        transaction: item.transaction
      })) as BudgetAllocationWithTransaction[]
    };
  }

  async getBudgets(
    filters: BudgetFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<Budget>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = pagination;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [isNull(budgets.deletedAt)];

    if (filters.type) {
      whereConditions.push(eq(budgets.type, filters.type));
    }

    if (filters.enforcement) {
      whereConditions.push(eq(budgets.enforcement, filters.enforcement));
    }

    if (filters.isActive !== undefined) {
      whereConditions.push(eq(budgets.isActive, filters.isActive));
    }

    if (filters.search) {
      whereConditions.push(
        like(budgets.name, `%${filters.search}%`)
      );
    }

    // Account and category filters require joins
    let query = db.select().from(budgets);

    if (filters.accountId) {
      query = query
        .innerJoin(budgetAccounts, eq(budgets.id, budgetAccounts.budgetId))
        .where(and(
          ...whereConditions,
          eq(budgetAccounts.accountId, filters.accountId)
        )) as any;
    } else if (filters.categoryId) {
      query = query
        .innerJoin(budgetCategories, eq(budgets.id, budgetCategories.budgetId))
        .where(and(
          ...whereConditions,
          eq(budgetCategories.categoryId, filters.categoryId)
        )) as any;
    } else {
      query = query.where(and(...whereConditions)) as any;
    }

    // Add sorting
    const sortColumn = budgets[sortBy as keyof typeof budgets] || budgets.createdAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const results = await query
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(budgets)
      .where(and(...whereConditions));

    const totalPages = Math.ceil(count / limit);

    return {
      data: results.map((r: any) => r.budget || r) as Budget[],
      total: count,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async updateBudget(id: number, data: Partial<NewBudget>): Promise<void> {
    await db
      .update(budgets)
      .set({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .where(eq(budgets.id, id));
  }

  async deleteBudget(id: number): Promise<void> {
    await db
      .update(budgets)
      .set({
        deletedAt: new Date().toISOString()
      })
      .where(eq(budgets.id, id));
  }

  // Budget account associations
  async addAccountToBudget(budgetId: number, accountId: number): Promise<void> {
    await db.insert(budgetAccounts).values({
      budgetId,
      accountId,
      createdAt: new Date().toISOString()
    });
  }

  async removeAccountFromBudget(budgetId: number, accountId: number): Promise<void> {
    await db
      .delete(budgetAccounts)
      .where(and(
        eq(budgetAccounts.budgetId, budgetId),
        eq(budgetAccounts.accountId, accountId)
      ));
  }

  async getBudgetAccounts(budgetId: number): Promise<BudgetAccount[]> {
    return await db
      .select()
      .from(budgetAccounts)
      .where(eq(budgetAccounts.budgetId, budgetId));
  }

  // Budget category associations
  async addCategoryToBudget(
    budgetId: number,
    categoryId: number,
    allocatedAmount: number = 0
  ): Promise<void> {
    await db.insert(budgetCategories).values({
      budgetId,
      categoryId,
      allocatedAmount,
      createdAt: new Date().toISOString()
    });
  }

  async updateBudgetCategoryAllocation(
    budgetId: number,
    categoryId: number,
    allocatedAmount: number
  ): Promise<void> {
    await db
      .update(budgetCategories)
      .set({ allocatedAmount })
      .where(and(
        eq(budgetCategories.budgetId, budgetId),
        eq(budgetCategories.categoryId, categoryId)
      ));
  }

  async removeCategoryFromBudget(budgetId: number, categoryId: number): Promise<void> {
    await db
      .delete(budgetCategories)
      .where(and(
        eq(budgetCategories.budgetId, budgetId),
        eq(budgetCategories.categoryId, categoryId)
      ));
  }

  async getBudgetCategories(budgetId: number): Promise<BudgetCategoryWithCategory[]> {
    const results = await db
      .select({
        budgetCategory: budgetCategories,
        category: categories
      })
      .from(budgetCategories)
      .innerJoin(categories, eq(budgetCategories.categoryId, categories.id))
      .where(eq(budgetCategories.budgetId, budgetId));

    return results.map(item => ({
      ...item.budgetCategory,
      category: item.category
    }));
  }

  // Budget periods
  async createBudgetPeriod(data: NewBudgetPeriod): Promise<BudgetPeriod> {
    const [period] = await db.insert(budgetPeriods).values({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    if (!period) {
      throw new Error("Failed to create budget period");
    }

    return period;
  }

  async getBudgetPeriods(
    filters: PeriodFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<BudgetPeriod>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "startDate",
      sortOrder = "desc"
    } = pagination;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    if (filters.budgetId) {
      whereConditions.push(eq(budgetPeriods.budgetId, filters.budgetId));
    }

    if (filters.status) {
      whereConditions.push(eq(budgetPeriods.status, filters.status));
    }

    if (filters.startDate && filters.endDate) {
      whereConditions.push(
        between(budgetPeriods.startDate, filters.startDate, filters.endDate)
      );
    }

    // Execute query
    const sortColumn = budgetPeriods[sortBy as keyof typeof budgetPeriods] || budgetPeriods.startDate;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const results = await db
      .select()
      .from(budgetPeriods)
      .where(and(...whereConditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(budgetPeriods)
      .where(and(...whereConditions));

    const totalPages = Math.ceil(count / limit);

    return {
      data: results,
      total: count,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async updateBudgetPeriod(id: number, data: Partial<NewBudgetPeriod>): Promise<void> {
    await db
      .update(budgetPeriods)
      .set({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .where(eq(budgetPeriods.id, id));
  }

  async deleteBudgetPeriod(id: number): Promise<void> {
    await db
      .delete(budgetPeriods)
      .where(eq(budgetPeriods.id, id));
  }

  // Budget allocations
  async createBudgetAllocation(data: NewBudgetAllocation): Promise<BudgetAllocation> {
    const [allocation] = await db.insert(budgetAllocations).values({
      ...data,
      createdAt: new Date().toISOString()
    }).returning();

    if (!allocation) {
      throw new Error("Failed to create budget allocation");
    }

    return allocation;
  }

  async getBudgetAllocations(
    filters: AllocationFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<BudgetAllocationWithTransaction>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = pagination;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    if (filters.budgetId) {
      whereConditions.push(eq(budgetAllocations.budgetId, filters.budgetId));
    }

    if (filters.transactionId) {
      whereConditions.push(eq(budgetAllocations.transactionId, filters.transactionId));
    }

    if (filters.periodId) {
      whereConditions.push(eq(budgetAllocations.periodId, filters.periodId));
    }

    if (filters.assignmentType) {
      whereConditions.push(eq(budgetAllocations.assignmentType, filters.assignmentType));
    }

    // Execute query with transaction join
    const sortColumn = budgetAllocations[sortBy as keyof typeof budgetAllocations] || budgetAllocations.createdAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const results = await db
      .select({
        allocation: budgetAllocations,
        transaction: transactions
      })
      .from(budgetAllocations)
      .innerJoin(transactions, eq(budgetAllocations.transactionId, transactions.id))
      .where(and(...whereConditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(budgetAllocations)
      .where(and(...whereConditions));

    const totalPages = Math.ceil(count / limit);

    return {
      data: results.map(item => ({
        ...item.allocation,
        transaction: item.transaction
      })),
      total: count,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async updateBudgetAllocation(id: number, data: Partial<NewBudgetAllocation>): Promise<void> {
    await db
      .update(budgetAllocations)
      .set(data)
      .where(eq(budgetAllocations.id, id));
  }

  async deleteBudgetAllocation(id: number): Promise<void> {
    await db
      .delete(budgetAllocations)
      .where(eq(budgetAllocations.id, id));
  }

  // Utility methods for budget calculations
  async getBudgetSpending(budgetId: number, periodId?: number): Promise<number> {
    const whereConditions = [eq(budgetAllocations.budgetId, budgetId)];

    if (periodId) {
      whereConditions.push(eq(budgetAllocations.periodId, periodId));
    }

    const [result] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${budgetAllocations.allocatedAmount}), 0)`
      })
      .from(budgetAllocations)
      .where(and(...whereConditions));

    return result?.total || 0;
  }

  async getTransactionAllocations(transactionId: number): Promise<BudgetAllocation[]> {
    return await db
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.transactionId, transactionId));
  }

  async getTotalAllocatedForTransaction(transactionId: number): Promise<number> {
    const [result] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${budgetAllocations.allocatedAmount}), 0)`
      })
      .from(budgetAllocations)
      .where(eq(budgetAllocations.transactionId, transactionId));

    return result?.total || 0;
  }
}