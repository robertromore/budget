import { and, eq, like, desc, asc, isNull, sql, between } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  budgets,
  budgetGroups,
  budgetGroupMemberships,
  budgetPeriodTemplates,
  budgetPeriodInstances,
  budgetAccounts,
  budgetCategories,
  budgetTransactions,
  type Budget,
  type NewBudget,
  type BudgetGroup,
  type NewBudgetGroup,
  type BudgetGroupMembership,
  type NewBudgetGroupMembership,
  type BudgetPeriodTemplate,
  type NewBudgetPeriodTemplate,
  type BudgetPeriodInstance,
  type NewBudgetPeriodInstance,
  type BudgetAccount,
  type NewBudgetAccount,
  type BudgetCategory,
  type NewBudgetCategory,
  type BudgetTransaction,
  type NewBudgetTransaction
} from "$lib/schema/budgets";
import { accounts } from "$lib/schema/accounts";
import { categories } from "$lib/schema/categories";
import { transactions } from "$lib/schema/transactions";
import type {
  BudgetFilters,
  PeriodFilters,
  TransactionFilters,
  PaginationParams,
  PaginatedResult,
  BudgetWithRelations,
  BudgetCategoryWithCategory,
  BudgetTransactionWithTransaction
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
      .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
      .limit(1);

    return budget || null;
  }

  async getBudgetByIdWithRelations(id: number): Promise<BudgetWithRelations | null> {
    const budget = await this.getBudgetById(id);
    if (!budget) return null;

    // Get related accounts
    const accountsList = await db
      .select({
        account: accounts
      })
      .from(budgetAccounts)
      .innerJoin(accounts, eq(budgetAccounts.accountId, accounts.id))
      .where(eq(budgetAccounts.budgetId, id));

    // Get related categories with category details
    const categoriesList = await db
      .select({
        budgetCategory: budgetCategories,
        category: categories
      })
      .from(budgetCategories)
      .innerJoin(categories, eq(budgetCategories.categoryId, categories.id))
      .where(eq(budgetCategories.budgetId, id));

    // Get period templates
    const templatesList = await db
      .select()
      .from(budgetPeriodTemplates)
      .where(eq(budgetPeriodTemplates.budgetId, id))
      .orderBy(desc(budgetPeriodTemplates.createdAt));

    // Get period instances
    const instancesList = await db
      .select()
      .from(budgetPeriodInstances)
      .innerJoin(budgetPeriodTemplates, eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id))
      .where(eq(budgetPeriodTemplates.budgetId, id))
      .orderBy(desc(budgetPeriodInstances.createdAt));

    // Get recent budget transactions
    const transactionsList = await db
      .select({
        budgetTransaction: budgetTransactions,
        transaction: transactions
      })
      .from(budgetTransactions)
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
      .where(eq(budgetTransactions.budgetId, id))
      .orderBy(desc(budgetTransactions.createdAt))
      .limit(10);

    return {
      ...budget,
      accounts: accountsList.map(item => item.account),
      categories: categoriesList.map(item => ({
        ...item.budgetCategory,
        category: item.category
      })),
      periodTemplates: templatesList,
      periodInstances: instancesList.map(item => item.budget_period_instances),
      transactions: transactionsList.map(item => ({
        ...item.budgetTransaction,
        transaction: item.transaction
      })) as BudgetTransactionWithTransaction[]
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

    if (filters.scope) {
      whereConditions.push(eq(budgets.scope, filters.scope));
    }

    if (filters.status) {
      whereConditions.push(eq(budgets.status, filters.status));
    }

    if (filters.enforcementLevel) {
      whereConditions.push(eq(budgets.enforcementLevel, filters.enforcementLevel));
    }

    if (filters.search) {
      whereConditions.push(like(budgets.name, `%${filters.search}%`));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgets)
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`);

    const count = countResult[0]?.count || 0;

    // Get paginated results
    const validSortColumns = ['id', 'name', 'type', 'status', 'createdAt', 'updatedAt'] as const;
    const sortKey = (sortBy && validSortColumns.includes(sortBy as any)) ? sortBy as typeof validSortColumns[number] : 'createdAt';
    const sortColumn = sortKey === 'id' ? budgets.id :
                       sortKey === 'name' ? budgets.name :
                       sortKey === 'type' ? budgets.type :
                       sortKey === 'status' ? budgets.status :
                       sortKey === 'updatedAt' ? budgets.updatedAt :
                       budgets.createdAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const results = await db
      .select()
      .from(budgets)
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

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

  // Budget Groups
  async createBudgetGroup(data: NewBudgetGroup): Promise<BudgetGroup> {
    const [group] = await db.insert(budgetGroups).values({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    if (!group) {
      throw new Error("Failed to create budget group");
    }

    return group;
  }

  async getBudgetGroupById(id: number): Promise<BudgetGroup | null> {
    const [group] = await db
      .select()
      .from(budgetGroups)
      .where(eq(budgetGroups.id, id))
      .limit(1);

    return group || null;
  }

  // Budget Period Templates
  async createBudgetPeriodTemplate(data: NewBudgetPeriodTemplate): Promise<BudgetPeriodTemplate> {
    const [template] = await db.insert(budgetPeriodTemplates).values({
      ...data,
      createdAt: new Date().toISOString()
    }).returning();

    if (!template) {
      throw new Error("Failed to create budget period template");
    }

    return template;
  }

  async getBudgetPeriodTemplateById(id: number): Promise<BudgetPeriodTemplate | null> {
    const [template] = await db
      .select()
      .from(budgetPeriodTemplates)
      .where(eq(budgetPeriodTemplates.id, id))
      .limit(1);

    return template || null;
  }

  async getBudgetPeriodTemplates(budgetId: number): Promise<BudgetPeriodTemplate[]> {
    return await db
      .select()
      .from(budgetPeriodTemplates)
      .where(eq(budgetPeriodTemplates.budgetId, budgetId))
      .orderBy(desc(budgetPeriodTemplates.createdAt));
  }

  async updateBudgetPeriodTemplate(id: number, data: Partial<NewBudgetPeriodTemplate>): Promise<void> {
    await db
      .update(budgetPeriodTemplates)
      .set(data)
      .where(eq(budgetPeriodTemplates.id, id));
  }

  async deleteBudgetPeriodTemplate(id: number): Promise<void> {
    await db
      .delete(budgetPeriodTemplates)
      .where(eq(budgetPeriodTemplates.id, id));
  }

  // Budget Period Instances
  async createBudgetPeriodInstance(data: NewBudgetPeriodInstance): Promise<BudgetPeriodInstance> {
    const [instance] = await db.insert(budgetPeriodInstances).values({
      ...data,
      createdAt: new Date().toISOString()
    }).returning();

    if (!instance) {
      throw new Error("Failed to create budget period instance");
    }

    return instance;
  }

  async getBudgetPeriodInstanceById(id: number): Promise<BudgetPeriodInstance | null> {
    const [instance] = await db
      .select()
      .from(budgetPeriodInstances)
      .where(eq(budgetPeriodInstances.id, id))
      .limit(1);

    return instance || null;
  }

  async getBudgetPeriodInstances(
    filters: PeriodFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<BudgetPeriodInstance>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = pagination;

    const offset = (page - 1) * limit;
    const whereConditions = [];

    if (filters.budgetId) {
      // Join with templates to filter by budget
      whereConditions.push(eq(budgetPeriodTemplates.budgetId, filters.budgetId));
    }

    if (filters.startDate) {
      whereConditions.push(eq(budgetPeriodInstances.startDate, filters.startDate));
    }

    if (filters.endDate) {
      whereConditions.push(eq(budgetPeriodInstances.endDate, filters.endDate));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgetPeriodInstances)
      .innerJoin(budgetPeriodTemplates, eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`);

    const count = countResult[0]?.count || 0;

    // Get paginated results
    const orderFn = sortOrder === "asc" ? asc : desc;

    const results = await db
      .select({
        instance: budgetPeriodInstances
      })
      .from(budgetPeriodInstances)
      .innerJoin(budgetPeriodTemplates, eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
      .orderBy(orderFn(budgetPeriodInstances.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      data: results.map(r => r.instance),
      total: count,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async updateBudgetPeriodInstance(id: number, data: Partial<NewBudgetPeriodInstance>): Promise<void> {
    await db
      .update(budgetPeriodInstances)
      .set(data)
      .where(eq(budgetPeriodInstances.id, id));
  }

  async deleteBudgetPeriodInstance(id: number): Promise<void> {
    await db
      .delete(budgetPeriodInstances)
      .where(eq(budgetPeriodInstances.id, id));
  }

  // Budget Accounts
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

  // Budget Categories
  async addCategoryToBudget(budgetId: number, categoryId: number, allocatedAmount: number = 0): Promise<void> {
    await db.insert(budgetCategories).values({
      budgetId,
      categoryId,
      allocatedAmount,
      createdAt: new Date().toISOString()
    });
  }

  async removeCategoryFromBudget(budgetId: number, categoryId: number): Promise<void> {
    await db
      .delete(budgetCategories)
      .where(and(
        eq(budgetCategories.budgetId, budgetId),
        eq(budgetCategories.categoryId, categoryId)
      ));
  }

  // Budget Transactions
  async createBudgetTransaction(data: NewBudgetTransaction): Promise<BudgetTransaction> {
    const [transaction] = await db.insert(budgetTransactions).values({
      ...data,
      createdAt: new Date().toISOString()
    }).returning();

    if (!transaction) {
      throw new Error("Failed to create budget transaction");
    }

    return transaction;
  }

  async getBudgetTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<BudgetTransactionWithTransaction>> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = pagination;

    const offset = (page - 1) * limit;
    const whereConditions = [];

    if (filters.budgetId) {
      whereConditions.push(eq(budgetTransactions.budgetId, filters.budgetId));
    }

    if (filters.transactionId) {
      whereConditions.push(eq(budgetTransactions.transactionId, filters.transactionId));
    }

    if (filters.autoAssigned !== undefined) {
      whereConditions.push(eq(budgetTransactions.autoAssigned, filters.autoAssigned));
    }

    if (filters.assignedBy) {
      whereConditions.push(eq(budgetTransactions.assignedBy, filters.assignedBy));
    }

    // Date filtering would need to be implemented based on transaction or assignment dates

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgetTransactions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`);

    const count = countResult[0]?.count || 0;

    // Get paginated results with transaction details
    const orderFn = sortOrder === "asc" ? asc : desc;

    const results = await db
      .select({
        budgetTransaction: budgetTransactions,
        transaction: transactions
      })
      .from(budgetTransactions)
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
      .orderBy(orderFn(budgetTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      data: results.map(item => ({
        ...item.budgetTransaction,
        transaction: item.transaction
      })) as BudgetTransactionWithTransaction[],
      total: count,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async getBudgetTransactionById(id: number): Promise<BudgetTransaction | null> {
    const [transaction] = await db
      .select()
      .from(budgetTransactions)
      .where(eq(budgetTransactions.id, id))
      .limit(1);

    return transaction || null;
  }

  async updateBudgetTransaction(id: number, data: Partial<NewBudgetTransaction>): Promise<void> {
    await db
      .update(budgetTransactions)
      .set(data)
      .where(eq(budgetTransactions.id, id));
  }

  async deleteBudgetTransaction(id: number): Promise<void> {
    await db
      .delete(budgetTransactions)
      .where(eq(budgetTransactions.id, id));
  }

  // Utility methods for budget calculations
  async getBudgetSpending(budgetId: number): Promise<number> {
    const [result] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${budgetTransactions.allocatedAmount}), 0)`
      })
      .from(budgetTransactions)
      .where(eq(budgetTransactions.budgetId, budgetId));

    return result?.total || 0;
  }

  async getBudgetTransactionsByTransaction(transactionId: number): Promise<BudgetTransaction[]> {
    return await db
      .select()
      .from(budgetTransactions)
      .where(eq(budgetTransactions.transactionId, transactionId));
  }

}