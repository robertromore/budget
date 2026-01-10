import { accounts, transactions } from "$lib/schema";
import { isDebtAccount } from "$lib/schema/accounts";
import type { NewTransaction, Transaction } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, asc, between, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import type { TransactionDbResult } from "./types";

/**
 * Convert database query result to Transaction type
 * Converts null values to undefined for optional schedule fields
 */
function toTransaction(dbResult: TransactionDbResult): Transaction {
  const {
    scheduleId,
    scheduleName,
    scheduleSlug,
    scheduleFrequency,
    scheduleInterval,
    scheduleNextOccurrence,
    ...rest
  } = dbResult;

  return {
    ...rest,
    balance: rest.balance ?? null,
    ...(scheduleId != null && { scheduleId }),
    ...(scheduleName != null && { scheduleName }),
    ...(scheduleSlug != null && { scheduleSlug }),
    ...(scheduleFrequency != null && { scheduleFrequency }),
    ...(scheduleInterval != null && { scheduleInterval }),
    ...(scheduleNextOccurrence != null && { scheduleNextOccurrence }),
  } as Transaction;
}

export interface TransactionFilters {
  accountId?: number | undefined;
  categoryId?: number | undefined;
  payeeId?: number | undefined;
  status?: "cleared" | "pending" | "scheduled" | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  searchQuery?: string | undefined;
  sortBy?: "date" | "amount" | "status" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Repository for transaction database operations
 */
export class TransactionRepository {
  /**
   * Verify account ownership
   */
  private async verifyAccountOwnership(accountId: number, workspaceId: number): Promise<void> {
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.id, accountId),
        eq(accounts.workspaceId, workspaceId),
        isNull(accounts.deletedAt)
      ),
    });

    if (!account) {
      throw new NotFoundError("Account", accountId);
    }
  }

  /**
   * Create a new transaction
   */
  async create(data: NewTransaction, workspaceId: number): Promise<Transaction> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(data.accountId, workspaceId);
    const [transaction] = await db.insert(transactions).values(data).returning();

    if (!transaction) {
      throw new Error("Failed to create transaction");
    }

    return this.findByIdWithRelations(transaction.id, workspaceId);
  }

  /**
   * Update an existing transaction
   */
  async update(
    id: number,
    data: Partial<NewTransaction>,
    workspaceId: number
  ): Promise<Transaction> {
    // Verify transaction belongs to user (through account)
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("Transaction", id);
    }

    const [updated] = await db
      .update(transactions)
      .set(data)
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
      .returning();

    if (!updated) {
      throw new NotFoundError("Transaction", id);
    }

    return this.findByIdWithRelations(id, workspaceId);
  }

  /**
   * Find transaction by ID with relations
   */
  async findByIdWithRelations(id: number, workspaceId: number): Promise<Transaction> {
    const transaction = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), isNull(transactions.deletedAt)),
      with: {
        account: true,
        category: true,
        payee: true,
        transferAccount: true,
        budgetAllocations: {
          with: {
            budget: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundError("Transaction", id);
    }

    // Verify account belongs to user
    if (transaction.account?.workspaceId !== workspaceId) {
      throw new NotFoundError("Transaction", id);
    }

    return toTransaction(transaction);
  }

  /**
   * Find transaction by ID
   */
  async findById(id: number, workspaceId: number): Promise<Transaction | null> {
    const transaction = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), isNull(transactions.deletedAt)),
      with: {
        account: true,
        category: true,
        payee: true,
        transferAccount: true,
      },
    });

    if (!transaction) {
      return null;
    }

    // Verify account belongs to user
    if (transaction.account?.workspaceId !== workspaceId) {
      return null;
    }

    return toTransaction(transaction);
  }

  /**
   * Find transaction by ID or throw
   */
  async findByIdOrThrow(id: number, workspaceId: number): Promise<Transaction> {
    const transaction = await this.findById(id, workspaceId);

    if (!transaction) {
      throw new NotFoundError("Transaction", id);
    }

    return transaction;
  }

  /**
   * Find transactions with filters and pagination
   */
  async findWithFilters(
    filters: TransactionFilters,
    pagination: PaginationParams | undefined,
    workspaceId: number
  ): Promise<PaginatedResult<Transaction>> {
    // If accountId is provided, verify ownership
    if (filters.accountId) {
      await this.verifyAccountOwnership(filters.accountId, workspaceId);
    }
    const page = pagination?.page ?? 0;
    const pageSize = pagination?.pageSize ?? 50;
    const offset = page * pageSize;

    // Build where conditions
    const conditions = [isNull(transactions.deletedAt)];

    if (filters.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }

    if (filters.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }

    if (filters.payeeId) {
      conditions.push(eq(transactions.payeeId, filters.payeeId));
    }

    if (filters.status) {
      conditions.push(eq(transactions.status, filters.status));
    }

    if (filters.dateFrom && filters.dateTo) {
      conditions.push(between(transactions.date, filters.dateFrom, filters.dateTo));
    } else if (filters.dateFrom) {
      conditions.push(sql`${transactions.date} >= ${filters.dateFrom}`);
    } else if (filters.dateTo) {
      conditions.push(sql`${transactions.date} <= ${filters.dateTo}`);
    }

    if (filters.searchQuery) {
      const searchPattern = `%${filters.searchQuery}%`;
      conditions.push(like(transactions.notes, searchPattern));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause);

    const totalCount = Number(countResult?.count ?? 0);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get paginated data with relations
    const sortColumn =
      filters.sortBy === "amount"
        ? transactions.amount
        : filters.sortBy === "status"
          ? transactions.status
          : transactions.date;

    const orderBy = filters.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

    const data = await db.query.transactions.findMany({
      where: whereClause,
      with: {
        account: true,
        category: true,
        payee: true,
        transferAccount: true,
        budgetAllocations: {
          with: {
            budget: true,
          },
        },
      },
      orderBy,
      limit: pageSize,
      offset,
    });

    return {
      data: data.map(toTransaction),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages - 1,
        hasPreviousPage: page > 0,
      },
    };
  }

  /**
   * Find all transactions for an account
   */
  async findByAccountId(accountId: number, workspaceId: number): Promise<Transaction[]> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(accountId, workspaceId);

    const data = await db.query.transactions.findMany({
      where: and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)),
      with: {
        category: true,
        payee: true,
        transferAccount: true,
        budgetAllocations: {
          with: {
            budget: true,
          },
        },
      },
      orderBy: desc(transactions.date),
    });

    return data.map(toTransaction);
  }

  /**
   * Get account balance from transactions
   * Supports multiple balance management options:
   * - Option 1: Balance reset date (balanceResetDate + balanceAtResetDate)
   * - Option 2: Archived transactions are excluded
   * - Option 3: Reconciled balance checkpoint (reconciledBalance + reconciledDate)
   * - Option 4: Adjustment transactions are included normally
   */
  async getAccountBalance(accountId: number, workspaceId: number): Promise<number> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(accountId, workspaceId);

    // Get account with balance management fields
    const [account] = await db
      .select({
        accountType: accounts.accountType,
        initialBalance: accounts.initialBalance,
        balanceResetDate: accounts.balanceResetDate,
        balanceAtResetDate: accounts.balanceAtResetDate,
        reconciledBalance: accounts.reconciledBalance,
        reconciledDate: accounts.reconciledDate,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      return 0;
    }

    const isDebt = account.accountType && isDebtAccount(account.accountType);

    // Priority 1: Reconciled balance checkpoint (Option 3)
    if (account.reconciledDate && account.reconciledBalance != null) {
      const transactionSum = await this.sumTransactionsAfterDate(
        accountId,
        account.reconciledDate,
        { excludeArchived: true }
      );
      // Reconciled balance is stored as-is (positive for debt = amount owed)
      // For debt accounts, we store the amount owed as positive, display as negative
      const baseBalance = isDebt ? -account.reconciledBalance : account.reconciledBalance;
      return baseBalance + transactionSum;
    }

    // Priority 2: Balance reset date (Option 1)
    if (account.balanceResetDate && account.balanceAtResetDate != null) {
      const transactionSum = await this.sumTransactionsAfterDate(
        accountId,
        account.balanceResetDate,
        { excludeArchived: true }
      );
      // Balance at reset date is stored as-is (positive for debt = amount owed)
      const baseBalance = isDebt ? -account.balanceAtResetDate : account.balanceAtResetDate;
      return baseBalance + transactionSum;
    }

    // Default: Initial balance + all non-archived transactions
    const result = await db
      .select({
        balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.status, "cleared"),
          isNull(transactions.deletedAt),
          // Option 2: Exclude archived transactions
          sql`(${transactions.isArchived} = 0 OR ${transactions.isArchived} IS NULL)`
        )
      );

    const transactionSum = Number(result[0]?.balance ?? 0);
    const initialBalance = Number(account.initialBalance ?? 0);

    // For debt accounts, invert only the initial balance
    // Transaction amounts already have correct signs (purchases negative, payments positive)
    if (isDebt) {
      // Start with negative initial balance (debt), add transaction amounts as-is
      // - Purchases (negative) reduce balance (more debt)
      // - Payments (positive) increase balance (less debt)
      return -initialBalance + transactionSum;
    }

    // For asset accounts, normal calculation
    return initialBalance + transactionSum;
  }

  /**
   * Sum transactions after a specific date, optionally excluding archived
   */
  private async sumTransactionsAfterDate(
    accountId: number,
    afterDate: string,
    options?: { excludeArchived?: boolean }
  ): Promise<number> {
    const conditions = [
      eq(transactions.accountId, accountId),
      eq(transactions.status, "cleared"),
      isNull(transactions.deletedAt),
      sql`${transactions.date} > ${afterDate}`,
    ];

    if (options?.excludeArchived) {
      conditions.push(sql`(${transactions.isArchived} = 0 OR ${transactions.isArchived} IS NULL)`);
    }

    const result = await db
      .select({
        sum: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(and(...conditions));

    return Number(result[0]?.sum ?? 0);
  }

  /**
   * Get pending balance for an account
   */
  async getPendingBalance(accountId: number, workspaceId: number): Promise<number> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(accountId, workspaceId);

    // Get account to check type
    const [account] = await db
      .select({
        accountType: accounts.accountType,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      return 0;
    }

    const result = await db
      .select({
        balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.status, "pending"),
          isNull(transactions.deletedAt)
        )
      );

    const pendingSum = Number(result[0]?.balance ?? 0);

    // Transaction amounts already have correct signs for all account types
    // No need to invert for debt accounts
    return pendingSum;
  }

  /**
   * Count transactions for an account
   */
  async countByAccountId(accountId: number, workspaceId: number): Promise<number> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(accountId, workspaceId);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)));

    return Number(result?.count ?? 0);
  }

  /**
   * Soft delete a transaction
   */
  async softDelete(id: number, workspaceId: number): Promise<void> {
    // Verify transaction belongs to user (through account)
    const transaction = await this.findById(id, workspaceId);
    if (!transaction) {
      throw new NotFoundError("Transaction", id);
    }

    const [deleted] = await db
      .update(transactions)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
      .returning();

    if (!deleted) {
      throw new NotFoundError("Transaction", id);
    }
  }

  /**
   * Bulk soft delete transactions
   */
  async bulkSoftDelete(ids: number[], workspaceId: number): Promise<void> {
    if (ids.length === 0) return;

    // Verify all transactions belong to user
    for (const id of ids) {
      const transaction = await this.findById(id, workspaceId);
      if (!transaction) {
        throw new NotFoundError("Transaction", id);
      }
    }

    await db
      .update(transactions)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(inArray(transactions.id, ids), isNull(transactions.deletedAt)));
  }

  /**
   * Check if transaction exists
   */
  async exists(id: number, workspaceId: number): Promise<boolean> {
    const transaction = await this.findById(id, workspaceId);
    return !!transaction;
  }

  /**
   * Get transactions with running balance
   * Supports balance management options:
   * - Shows all transactions (including archived) but marks archived ones
   * - Excludes archived transactions from running balance calculation
   * - Uses reconciled/reset date as starting point if set
   */
  async findWithRunningBalance(
    accountId: number,
    workspaceId: number,
    limit?: number,
    options?: { includeArchived?: boolean }
  ): Promise<Array<Transaction & { balance: number; isExcludedFromBalance?: boolean }>> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(accountId, workspaceId);

    // Get account with balance management fields
    const [account] = await db
      .select({
        accountType: accounts.accountType,
        initialBalance: accounts.initialBalance,
        balanceResetDate: accounts.balanceResetDate,
        balanceAtResetDate: accounts.balanceAtResetDate,
        reconciledBalance: accounts.reconciledBalance,
        reconciledDate: accounts.reconciledDate,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    const transactionList = await db.query.transactions.findMany({
      where: and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)),
      with: {
        category: true,
        payee: true,
        transferAccount: true,
        budgetAllocations: {
          with: {
            budget: true,
          },
        },
      },
      orderBy: [desc(transactions.date), desc(transactions.id)],
      limit: limit,
    });

    const isDebt = account && account.accountType && isDebtAccount(account.accountType);

    // Determine starting balance and cutoff date based on balance management settings
    let startingBalance: number;
    let cutoffDate: string | null = null;

    // Priority 1: Reconciled balance checkpoint
    if (account?.reconciledDate && account.reconciledBalance != null) {
      startingBalance = isDebt ? -account.reconciledBalance : account.reconciledBalance;
      cutoffDate = account.reconciledDate;
    }
    // Priority 2: Balance reset date
    else if (account?.balanceResetDate && account.balanceAtResetDate != null) {
      startingBalance = isDebt ? -account.balanceAtResetDate : account.balanceAtResetDate;
      cutoffDate = account.balanceResetDate;
    }
    // Default: Use initial balance
    else {
      const initialBalance = Number(account?.initialBalance ?? 0);
      startingBalance = isDebt ? -initialBalance : initialBalance;
    }

    let runningBalance = startingBalance;

    const transactionsWithBalance = transactionList
      .reverse()
      .map((t) => {
        const transaction = toTransaction(t);
        const amount = Number(t.amount);

        // Determine if this transaction is excluded from balance calculation
        const isArchived = t.isArchived === true;
        const isBeforeCutoff = Boolean(cutoffDate && t.date <= cutoffDate);
        const isExcludedFromBalance: boolean = isArchived || isBeforeCutoff;

        // Only add to running balance if not excluded
        if (!isExcludedFromBalance) {
          runningBalance += amount;
        }

        return {
          ...transaction,
          balance: runningBalance,
          isExcludedFromBalance,
        };
      })
      .reverse();

    // Filter out archived if not requested
    if (!options?.includeArchived) {
      return transactionsWithBalance.filter((t) => !t.isArchived);
    }

    return transactionsWithBalance;
  }

  /**
   * Archive a transaction (exclude from balance but keep in history)
   */
  async archiveTransaction(id: number, workspaceId: number): Promise<Transaction> {
    const transaction = await this.findById(id, workspaceId);
    if (!transaction) {
      throw new NotFoundError("Transaction", id);
    }

    const [updated] = await db
      .update(transactions)
      .set({ isArchived: true, updatedAt: getCurrentTimestamp() })
      .where(eq(transactions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Transaction", id);
    }

    return this.findByIdWithRelations(id, workspaceId);
  }

  /**
   * Unarchive a transaction (include in balance again)
   */
  async unarchiveTransaction(id: number, workspaceId: number): Promise<Transaction> {
    const transaction = await this.findById(id, workspaceId);
    if (!transaction) {
      throw new NotFoundError("Transaction", id);
    }

    const [updated] = await db
      .update(transactions)
      .set({ isArchived: false, updatedAt: getCurrentTimestamp() })
      .where(eq(transactions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Transaction", id);
    }

    return this.findByIdWithRelations(id, workspaceId);
  }

  /**
   * Archive all transactions before a specific date
   */
  async archiveTransactionsBeforeDate(
    accountId: number,
    beforeDate: string,
    workspaceId: number
  ): Promise<number> {
    await this.verifyAccountOwnership(accountId, workspaceId);

    const result = await db
      .update(transactions)
      .set({ isArchived: true, updatedAt: getCurrentTimestamp() })
      .where(
        and(
          eq(transactions.accountId, accountId),
          sql`${transactions.date} < ${beforeDate}`,
          isNull(transactions.deletedAt),
          sql`(${transactions.isArchived} = 0 OR ${transactions.isArchived} IS NULL)`
        )
      )
      .returning({ id: transactions.id });

    return result.length;
  }

  /**
   * Create a balance adjustment transaction
   */
  async createBalanceAdjustment(
    accountId: number,
    adjustmentAmount: number,
    reason: string,
    date: string,
    workspaceId: number
  ): Promise<Transaction> {
    await this.verifyAccountOwnership(accountId, workspaceId);

    const [transaction] = await db
      .insert(transactions)
      .values({
        accountId,
        workspaceId,
        amount: adjustmentAmount,
        date,
        status: "cleared",
        isAdjustment: true,
        adjustmentReason: reason,
        notes: `Balance adjustment: ${reason}`,
      })
      .returning();

    if (!transaction) {
      throw new Error("Failed to create balance adjustment");
    }

    return this.findByIdWithRelations(transaction.id, workspaceId);
  }

  /**
   * Count archived transactions for an account
   */
  async countArchivedTransactions(accountId: number, workspaceId: number): Promise<number> {
    await this.verifyAccountOwnership(accountId, workspaceId);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.isArchived, true),
          isNull(transactions.deletedAt)
        )
      );

    return Number(result?.count ?? 0);
  }
}
