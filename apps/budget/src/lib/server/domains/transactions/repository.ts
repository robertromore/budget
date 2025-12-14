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
   */
  async getAccountBalance(accountId: number, workspaceId: number): Promise<number> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(accountId, workspaceId);

    // Get account to check type and initial balance
    const [account] = await db
      .select({
        accountType: accounts.accountType,
        initialBalance: accounts.initialBalance,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      return 0;
    }

    // Calculate transaction sum
    const result = await db
      .select({
        balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(transactions.status, "cleared"),
          isNull(transactions.deletedAt)
        )
      );

    const transactionSum = Number(result[0]?.balance ?? 0);
    const initialBalance = Number(account.initialBalance ?? 0);

    // For debt accounts, invert the polarity
    if (account.accountType && isDebtAccount(account.accountType)) {
      // Start with negative initial balance (debt), then subtract transaction amounts
      return -initialBalance - transactionSum;
    }

    // For asset accounts, normal calculation
    return initialBalance + transactionSum;
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

    // For debt accounts, invert the polarity
    if (account.accountType && isDebtAccount(account.accountType)) {
      return -pendingSum;
    }

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
   */
  async findWithRunningBalance(
    accountId: number,
    workspaceId: number,
    limit?: number
  ): Promise<Array<Transaction & { balance: number }>> {
    // Verify account belongs to user
    await this.verifyAccountOwnership(accountId, workspaceId);

    // Get account to check type and initial balance
    const [account] = await db
      .select({
        accountType: accounts.accountType,
        initialBalance: accounts.initialBalance,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    const transactionList = await db.query.transactions.findMany({
      where: and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)),
      with: {
        category: true,
        payee: true,
        budgetAllocations: {
          with: {
            budget: true,
          },
        },
      },
      orderBy: [desc(transactions.date), desc(transactions.id)],
      limit: limit,
    });

    // Calculate running balance including ALL transaction statuses (cleared, pending, scheduled)
    // For debt accounts, invert the polarity to show debt as negative
    const initialBalance = Number(account?.initialBalance ?? 0);
    const isDebt = account && account.accountType && isDebtAccount(account.accountType);

    // Start with initial balance (inverted for debt accounts)
    let runningBalance = isDebt ? -initialBalance : initialBalance;

    const transactionsWithBalance = transactionList
      .reverse()
      .map((t) => {
        const amount = Number(t.amount);
        // For debt accounts, invert transaction amounts
        runningBalance += isDebt ? -amount : amount;
        return {
          ...toTransaction(t),
          balance: runningBalance,
        };
      })
      .reverse();

    return transactionsWithBalance;
  }
}
