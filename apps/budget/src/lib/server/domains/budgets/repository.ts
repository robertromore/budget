import {db} from "$lib/server/db";
import {getCurrentTimestamp} from "$lib/utils/dates";
import {
  budgets,
  budgetGroups,
  budgetGroupMemberships,
  budgetAccounts,
  budgetCategories,
  budgetPeriodTemplates,
  budgetPeriodInstances,
  budgetTransactions,
  type Budget,
  type NewBudget,
  type BudgetAccount,
  type NewBudgetAccount,
  type BudgetCategory,
  type NewBudgetCategory,
  type BudgetGroup,
  type NewBudgetGroup,
  type BudgetPeriodTemplate,
  type NewBudgetPeriodTemplate,
  type BudgetPeriodInstance,
  type NewBudgetPeriodInstance,
  type BudgetTransaction,
  type NewBudgetTransaction,
} from "$lib/schema/budgets";
import {accounts, categories, transactions} from "$lib/schema";
import {NotFoundError, DatabaseError} from "$lib/server/shared/types/errors";
import {and, eq, inArray, isNull, sql} from "drizzle-orm";

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbClient = typeof db | TransactionClient;

export interface CreateBudgetInput {
  budget: NewBudget;
  accountIds?: number[];
  categoryIds?: number[];
  groupIds?: number[];
}

export interface UpdateBudgetInput {
  name?: string;
  description?: string | null;
  status?: Budget["status"];
  enforcementLevel?: Budget["enforcementLevel"];
  metadata?: Budget["metadata"];
}

export interface BudgetWithRelations extends Budget {
  accounts: Array<BudgetAccount & {account: typeof accounts.$inferSelect | null}>;
  categories: Array<BudgetCategory & {category: typeof categories.$inferSelect | null}>;
  transactions: Array<BudgetTransaction & {transaction: typeof transactions.$inferSelect | null}>;
  groupMemberships: Array<
    (typeof budgetGroupMemberships.$inferSelect) & {
      group: BudgetGroup | null;
    }
  >;
  periodTemplates: Array<
    BudgetPeriodTemplate & {
      periods: BudgetPeriodInstance[];
    }
  >;
}

/**
 * Repository layer for budget data access and mutation.
 */
export class BudgetRepository {
  /**
   * Create a budget with optional relationships in a single transaction.
   */
  async createBudget(input: CreateBudgetInput): Promise<BudgetWithRelations> {
    try {
      return await db.transaction(async (tx) => {
        const now = getCurrentTimestamp();
        const [created] = await tx
          .insert(budgets)
          .values({
            ...input.budget,
            createdAt: input.budget.createdAt ?? now,
            updatedAt: input.budget.updatedAt ?? now,
          })
          .returning();

        if (!created) {
          throw new DatabaseError("Failed to create budget", "createBudget");
        }

        await this.syncBudgetAccounts(tx, created.id, input.accountIds);
        await this.syncBudgetCategories(tx, created.id, input.categoryIds);
        await this.syncBudgetGroups(tx, created.id, input.groupIds);

        const budget = await this.findById(created.id, tx);
        if (!budget) {
          throw new DatabaseError("Budget not found after creation", "createBudget");
        }

        return budget;
      });
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError((error as Error)?.message ?? "Unknown error", "createBudget");
    }
  }

  /**
   * Update budget core fields and optional relationships.
   */
  async updateBudget(
    id: number,
    updates: UpdateBudgetInput,
    relationships?: {
      accountIds?: number[];
      categoryIds?: number[];
      groupIds?: number[];
    }
  ): Promise<BudgetWithRelations> {
    try {
      return await db.transaction(async (tx) => {
        const existing = await this.findById(id, tx);
        if (!existing) {
          throw new NotFoundError("Budget", id);
        }

        const now = getCurrentTimestamp();
        const [updated] = await tx
          .update(budgets)
          .set({
            ...updates,
            updatedAt: now,
          })
          .where(eq(budgets.id, id))
          .returning();

        if (!updated) {
          throw new DatabaseError("Failed to update budget", "updateBudget");
        }

        if (relationships) {
          if (relationships.accountIds !== undefined) {
            await this.syncBudgetAccounts(tx, id, relationships.accountIds);
          }
          if (relationships.categoryIds !== undefined) {
            await this.syncBudgetCategories(tx, id, relationships.categoryIds);
          }
          if (relationships.groupIds !== undefined) {
            await this.syncBudgetGroups(tx, id, relationships.groupIds);
          }
        }

        const budget = await this.findById(id, tx);
        if (!budget) {
          throw new DatabaseError("Budget not found after update", "updateBudget");
        }
        return budget;
      });
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError((error as Error)?.message ?? "Unknown error", "updateBudget");
    }
  }

  /**
   * Retrieve budgets with optional status filtering.
   */
  async listBudgets(options: {status?: Budget["status"]} = {}): Promise<BudgetWithRelations[]> {
    const {status} = options;

    const result = await db.query.budgets.findMany({
      where: status ? eq(budgets.status, status) : undefined,
      with: this.defaultRelations(),
      orderBy: (budget, {asc}) => asc(budget.name),
    });

    return result as BudgetWithRelations[];
  }

  /**
   * Find budget by ID including relations.
   */
  async findById(id: number, client: DbClient = db): Promise<BudgetWithRelations | null> {
    const result = await client.query.budgets.findFirst({
      where: eq(budgets.id, id),
      with: this.defaultRelations(),
    });

    return (result as BudgetWithRelations) ?? null;
  }

  /**
   * Find budget by slug including relations.
   */
  async findBySlug(slug: string, client: DbClient = db): Promise<BudgetWithRelations | null> {
    const result = await client.query.budgets.findFirst({
      where: and(eq(budgets.slug, slug), isNull(budgets.deletedAt)),
      with: this.defaultRelations(),
    });

    return (result as BudgetWithRelations) ?? null;
  }

  /**
   * Check if a slug exists (excluding deleted budgets).
   */
  async slugExists(slug: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.slug, slug))
      .limit(1);
    return !!result;
  }

  /**
   * Soft delete a budget (mark as deleted and archive slug).
   */
  async softDelete(id: number): Promise<Budget> {
    const [existingBudget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
      .limit(1);

    if (!existingBudget) {
      throw new NotFoundError("Budget", id);
    }

    const timestamp = Date.now();
    const archivedSlug = `${existingBudget.slug}-deleted-${timestamp}`;

    const [budget] = await db
      .update(budgets)
      .set({
        slug: archivedSlug,
        deletedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
      .returning();

    if (!budget) {
      throw new NotFoundError("Budget", id);
    }

    return budget;
  }

  /**
   * Permanently delete a budget and all dependent records.
   */
  async deleteBudget(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const existing = await this.findById(id, tx);
      if (!existing) {
        throw new NotFoundError("Budget", id);
      }

      await tx.delete(budgetTransactions).where(eq(budgetTransactions.budgetId, id));
      await tx.delete(budgetAccounts).where(eq(budgetAccounts.budgetId, id));
      await tx.delete(budgetCategories).where(eq(budgetCategories.budgetId, id));
      await tx
        .delete(budgetGroupMemberships)
        .where(eq(budgetGroupMemberships.budgetId, id));
      const templateIds = await tx
        .select({id: budgetPeriodTemplates.id})
        .from(budgetPeriodTemplates)
        .where(eq(budgetPeriodTemplates.budgetId, id));

      if (templateIds.length) {
        await tx
          .delete(budgetPeriodInstances)
          .where(
            inArray(
              budgetPeriodInstances.templateId,
              templateIds.map((row) => row.id)
            )
          );
      }
      await tx.delete(budgetPeriodTemplates).where(eq(budgetPeriodTemplates.budgetId, id));
      await tx.delete(budgets).where(eq(budgets.id, id));
    });
  }

  /**
   * Create a budget group.
   */
  async createGroup(data: NewBudgetGroup): Promise<BudgetGroup> {
    const [group] = await db.insert(budgetGroups).values(data).returning();
    if (!group) {
      throw new DatabaseError("Failed to create budget group", "createGroup");
    }
    return group;
  }

  /**
   * Create period template for a budget.
   */
  async createPeriodTemplate(data: NewBudgetPeriodTemplate): Promise<BudgetPeriodTemplate> {
    const [template] = await db.insert(budgetPeriodTemplates).values(data).returning();
    if (!template) {
      throw new DatabaseError("Failed to create period template", "createPeriodTemplate");
    }
    return template;
  }

  /**
   * Update a period template.
   */
  async updatePeriodTemplate(
    id: number,
    updates: Partial<NewBudgetPeriodTemplate>
  ): Promise<BudgetPeriodTemplate> {
    const [template] = await db
      .update(budgetPeriodTemplates)
      .set(updates)
      .where(eq(budgetPeriodTemplates.id, id))
      .returning();

    if (!template) {
      throw new NotFoundError("Budget period template", id);
    }
    return template;
  }

  /**
   * Find period template by ID.
   */
  async findTemplateById(id: number): Promise<BudgetPeriodTemplate | null> {
    const result = await db.query.budgetPeriodTemplates.findFirst({
      where: eq(budgetPeriodTemplates.id, id),
      with: {
        periods: true,
      },
    });
    return (result as BudgetPeriodTemplate & {periods: BudgetPeriodInstance[]}) ?? null;
  }

  /**
   * List templates for a budget.
   */
  async listTemplatesForBudget(budgetId: number): Promise<BudgetPeriodTemplate[]> {
    return (await db.query.budgetPeriodTemplates.findMany({
      where: eq(budgetPeriodTemplates.budgetId, budgetId),
      with: {
        periods: true,
      },
    })) as Array<BudgetPeriodTemplate & {periods: BudgetPeriodInstance[]}>;
  }

  /**
   * Delete a period template (cascade deletes associated instances).
   */
  async deletePeriodTemplate(id: number): Promise<void> {
    await db.delete(budgetPeriodTemplates).where(eq(budgetPeriodTemplates.id, id));
  }

  /**
   * Create a period instance if one does not already exist for the provided range.
   */
  async createPeriodInstance(data: NewBudgetPeriodInstance): Promise<BudgetPeriodInstance> {
    const [instance] = await db.insert(budgetPeriodInstances).values(data).returning();
    if (!instance) {
      throw new DatabaseError("Failed to create period instance", "createPeriodInstance");
    }
    return instance;
  }

  /**
   * Find an existing period instance for a template and date range.
   */
  async findInstanceByRange(
    templateId: number,
    startDate: string,
    endDate: string
  ): Promise<BudgetPeriodInstance | null> {
    const result = await db.query.budgetPeriodInstances.findFirst({
      where: and(
        eq(budgetPeriodInstances.templateId, templateId),
        eq(budgetPeriodInstances.startDate, startDate),
        eq(budgetPeriodInstances.endDate, endDate)
      ),
    });
    return result ?? null;
  }

  /**
   * Retrieve all period instances for a template ordered by start date.
   */
  async listPeriodInstances(templateId: number): Promise<BudgetPeriodInstance[]> {
    return await db.query.budgetPeriodInstances.findMany({
      where: eq(budgetPeriodInstances.templateId, templateId),
      orderBy: (instance, {asc}) => asc(instance.startDate),
    });
  }

  /**
   * Create a new budget allocation record.
   */
  async createAllocation(data: NewBudgetTransaction): Promise<BudgetTransaction> {
    const [allocation] = await db.insert(budgetTransactions).values(data).returning();
    if (!allocation) {
      throw new DatabaseError("Failed to create budget allocation", "createAllocation");
    }
    return allocation;
  }

  /**
   * Update allocation by ID.
   */
  async updateAllocation(
    id: number,
    updates: Partial<NewBudgetTransaction>
  ): Promise<BudgetTransaction> {
    const [allocation] = await db
      .update(budgetTransactions)
      .set(updates)
      .where(eq(budgetTransactions.id, id))
      .returning();

    if (!allocation) {
      throw new NotFoundError("Budget allocation", id);
    }
    return allocation;
  }

  /**
   * Delete allocation by ID.
   */
  async deleteAllocation(id: number): Promise<void> {
    await db.delete(budgetTransactions).where(eq(budgetTransactions.id, id));
  }

  /**
   * Fetch allocations for a transaction.
   */
  async getAllocationsForTransaction(transactionId: number): Promise<BudgetTransaction[]> {
    return await db.query.budgetTransactions.findMany({
      where: eq(budgetTransactions.transactionId, transactionId),
    });
  }

  /**
   * Find applicable budgets for a transaction based on account and category.
   * Returns active budgets that match the account OR category OR have global scope.
   */
  async findApplicableBudgets(accountId?: number, categoryId?: number): Promise<BudgetWithRelations[]> {
    // Collect all matching budget IDs
    const budgetIdSet = new Set<number>();

    // Find budgets linked to the account
    if (accountId) {
      const accountBudgetIds = await db
        .select({budgetId: budgetAccounts.budgetId})
        .from(budgetAccounts)
        .where(eq(budgetAccounts.accountId, accountId));

      accountBudgetIds.forEach(b => budgetIdSet.add(b.budgetId));
    }

    // Find budgets linked to the category
    if (categoryId) {
      const categoryBudgetIds = await db
        .select({budgetId: budgetCategories.budgetId})
        .from(budgetCategories)
        .where(eq(budgetCategories.categoryId, categoryId));

      categoryBudgetIds.forEach(b => budgetIdSet.add(b.budgetId));
    }

    // Also include budgets with global scope
    const globalBudgets = await db.query.budgets.findMany({
      where: and(
        eq(budgets.status, "active"),
        eq(budgets.scope, "global")
      ),
    });

    globalBudgets.forEach(b => budgetIdSet.add(b.id));

    // If no matching budgets found, return empty array
    if (budgetIdSet.size === 0) {
      return [];
    }

    // Fetch all matching budgets with relations
    const matchingBudgets = await db.query.budgets.findMany({
      where: and(
        eq(budgets.status, "active"),
        inArray(budgets.id, Array.from(budgetIdSet))
      ),
      with: this.defaultRelations(),
    });

    return matchingBudgets as BudgetWithRelations[];
  }

  /**
   * Helper configuring default relations for queries.
   */
  private defaultRelations() {
    return {
      accounts: {
        with: {
          account: true,
        },
      },
      categories: {
        with: {
          category: true,
        },
      },
      transactions: {
        with: {
          transaction: true,
        },
      },
      groupMemberships: {
        with: {
          group: true,
        },
      },
      periodTemplates: {
        with: {
          periods: true,
        },
      },
    } as const;
  }

  private async syncBudgetAccounts(
    tx: DbClient,
    budgetId: number,
    accountIds: number[] | undefined
  ): Promise<void> {
    if (accountIds === undefined) return;

    await tx.delete(budgetAccounts).where(eq(budgetAccounts.budgetId, budgetId));

    if (!accountIds.length) return;

    const uniqueAccountIds = Array.from(new Set(accountIds));
    const rows: NewBudgetAccount[] = uniqueAccountIds.map((accountId) => ({
      budgetId,
      accountId,
    }));

    await tx.insert(budgetAccounts).values(rows).onConflictDoNothing();
  }

  private async syncBudgetCategories(
    tx: DbClient,
    budgetId: number,
    categoryIds: number[] | undefined
  ): Promise<void> {
    if (categoryIds === undefined) return;

    await tx.delete(budgetCategories).where(eq(budgetCategories.budgetId, budgetId));

    if (!categoryIds.length) return;

    const uniqueCategoryIds = Array.from(new Set(categoryIds));
    const rows: NewBudgetCategory[] = uniqueCategoryIds.map((categoryId) => ({
      budgetId,
      categoryId,
    }));

    await tx.insert(budgetCategories).values(rows).onConflictDoNothing();
  }

  private async syncBudgetGroups(
    tx: DbClient,
    budgetId: number,
    groupIds: number[] | undefined
  ): Promise<void> {
    if (groupIds === undefined) return;

    await tx.delete(budgetGroupMemberships).where(eq(budgetGroupMemberships.budgetId, budgetId));

    if (!groupIds.length) return;

    const uniqueGroupIds = Array.from(new Set(groupIds));
    await tx
      .insert(budgetGroupMemberships)
      .values(uniqueGroupIds.map((groupId) => ({budgetId, groupId})))
      .onConflictDoNothing();
  }

  async getAccountsBalance(accountIds: number[]): Promise<number> {
    if (accountIds.length === 0) return 0;

    // Calculate balance by summing all transactions for these accounts
    const result = await db
      .select({
        totalBalance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          isNull(transactions.deletedAt)
        )
      );

    return Number(result[0]?.totalBalance ?? 0);
  }

  async getCategorySpendingSince(categoryIds: number[], startDate: string): Promise<number> {
    if (categoryIds.length === 0) return 0;

    const categoryTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          inArray(transactions.categoryId, categoryIds),
          eq(transactions.status, 'cleared')
        )
      );

    const filteredTransactions = categoryTransactions.filter(t => {
      if (!t.date) return false;
      return t.date >= startDate;
    });

    return filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  /**
   * Create a budget group.
   */
  async createBudgetGroup(data: NewBudgetGroup): Promise<BudgetGroup> {
    const now = getCurrentTimestamp();
    const [group] = await db
      .insert(budgetGroups)
      .values({
        ...data,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      })
      .returning();

    if (!group) {
      throw new DatabaseError("Failed to create budget group", "createBudgetGroup");
    }

    return group;
  }

  /**
   * Get budget group by ID with its child groups and member budgets.
   */
  async getBudgetGroupById(id: number): Promise<BudgetGroup | null> {
    const group = await db.query.budgetGroups.findFirst({
      where: eq(budgetGroups.id, id),
      with: {
        children: true,
        memberships: {
          with: {
            budget: true,
          },
        },
      },
    });

    return group ?? null;
  }

  /**
   * List all budget groups with optional parent filter.
   */
  async listBudgetGroups(parentId?: number | null): Promise<BudgetGroup[]> {
    if (parentId === undefined) {
      return await db.query.budgetGroups.findMany({
        with: {
          children: true,
          memberships: {
            with: {
              budget: true,
            },
          },
        },
      });
    }

    const condition = parentId === null
      ? isNull(budgetGroups.parentId)
      : eq(budgetGroups.parentId, parentId);

    return await db.query.budgetGroups.findMany({
      where: condition,
      with: {
        children: true,
        memberships: {
          with: {
            budget: true,
          },
        },
      },
    });
  }

  /**
   * Update a budget group.
   */
  async updateBudgetGroup(id: number, updates: Partial<NewBudgetGroup>): Promise<BudgetGroup> {
    const [group] = await db
      .update(budgetGroups)
      .set({
        ...updates,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(budgetGroups.id, id))
      .returning();

    if (!group) {
      throw new NotFoundError("Budget group", id);
    }

    return group;
  }

  /**
   * Delete a budget group.
   */
  async deleteBudgetGroup(id: number): Promise<void> {
    await db.delete(budgetGroups).where(eq(budgetGroups.id, id));
  }

  /**
   * Get all root-level budget groups (no parent).
   */
  async getRootBudgetGroups(): Promise<BudgetGroup[]> {
    return await db.query.budgetGroups.findMany({
      where: isNull(budgetGroups.parentId),
      with: {
        children: true,
        memberships: {
          with: {
            budget: true,
          },
        },
      },
    });
  }

  // Analytics Methods

  /**
   * Get spending trends over time for a budget (by period instances).
   */
  async getSpendingTrends(budgetId: number, limit = 6) {
    const periods = await db.query.budgetPeriodInstances.findMany({
      where: eq(budgetPeriodInstances.templateId, budgetId),
      orderBy: (fields, {desc}) => [desc(fields.startDate)],
      limit,
    });

    return periods.reverse().map(period => ({
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      allocated: Number(period.allocatedAmount || 0),
      actual: Number(period.actualAmount || 0),
      remaining: Number(period.allocatedAmount || 0) - Number(period.actualAmount || 0),
    }));
  }

  /**
   * Get category breakdown for a budget's spending.
   */
  async getCategoryBreakdown(budgetId: number) {
    const result = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryType: categories.categoryType,
        categoryColor: categories.categoryColor,
        totalAmount: sql<number>`COALESCE(SUM(ABS(${budgetTransactions.allocatedAmount})), 0)`,
        transactionCount: sql<number>`COUNT(DISTINCT ${budgetTransactions.transactionId})`,
      })
      .from(budgetTransactions)
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(budgetTransactions.budgetId, budgetId))
      .groupBy(transactions.categoryId, categories.name, categories.categoryType, categories.categoryColor);

    return result.map(row => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName || "Uncategorized",
      categoryType: row.categoryType || "expense",
      categoryColor: row.categoryColor || "#6b7280",
      amount: Number(row.totalAmount),
      count: Number(row.transactionCount),
    }));
  }

  /**
   * Get daily spending data for a budget within a date range for burndown charts.
   */
  async getDailySpending(budgetId: number, startDate: string, endDate: string) {
    const result = await db
      .select({
        date: transactions.date,
        totalAmount: sql<number>`COALESCE(SUM(ABS(${budgetTransactions.allocatedAmount})), 0)`,
      })
      .from(budgetTransactions)
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
      .where(
        and(
          eq(budgetTransactions.budgetId, budgetId),
          sql`${transactions.date} >= ${startDate}`,
          sql`${transactions.date} <= ${endDate}`
        )
      )
      .groupBy(transactions.date)
      .orderBy(sql`${transactions.date} ASC`);

    return result.map(row => ({
      date: row.date,
      amount: Number(row.totalAmount),
    }));
  }

  /**
   * Get summary statistics for a budget across all its period instances.
   */
  async getBudgetSummaryStats(budgetId: number) {
    const [stats] = await db
      .select({
        totalPeriods: sql<number>`COUNT(*)`,
        totalAllocated: sql<number>`COALESCE(SUM(${budgetPeriodInstances.allocatedAmount}), 0)`,
        totalActual: sql<number>`COALESCE(SUM(${budgetPeriodInstances.actualAmount}), 0)`,
        avgAllocated: sql<number>`COALESCE(AVG(${budgetPeriodInstances.allocatedAmount}), 0)`,
        avgActual: sql<number>`COALESCE(AVG(${budgetPeriodInstances.actualAmount}), 0)`,
      })
      .from(budgetPeriodInstances)
      .where(eq(budgetPeriodInstances.templateId, budgetId));

    return {
      totalPeriods: Number(stats?.totalPeriods || 0),
      totalAllocated: Number(stats?.totalAllocated || 0),
      totalActual: Number(stats?.totalActual || 0),
      avgAllocated: Number(stats?.avgAllocated || 0),
      avgActual: Number(stats?.avgActual || 0),
      totalRemaining: Number(stats?.totalAllocated || 0) - Number(stats?.totalActual || 0),
    };
  }
}
