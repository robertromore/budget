import {db} from "$lib/server/db";
import {getCurrentTimestamp} from "$lib/utils/dates";
import {transactions, accounts, categories, payees} from "$lib/schema";
import {eq, and, isNull, desc, asc, like, between, sql, inArray} from "drizzle-orm";
import type {Transaction, NewTransaction} from "$lib/schema/transactions";
import {NotFoundError} from "$lib/server/shared/types/errors";

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
   * Create a new transaction
   */
  async create(data: NewTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(data)
      .returning();

    if (!transaction) {
      throw new Error("Failed to create transaction");
    }

    return this.findByIdWithRelations(transaction.id);
  }

  /**
   * Update an existing transaction
   */
  async update(id: number, data: Partial<NewTransaction>): Promise<Transaction> {
    const [updated] = await db
      .update(transactions)
      .set(data)
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
      .returning();

    if (!updated) {
      throw new NotFoundError("Transaction", id);
    }

    return this.findByIdWithRelations(id);
  }

  /**
   * Find transaction by ID with relations
   */
  async findByIdWithRelations(id: number): Promise<Transaction> {
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

    return transaction;
  }

  /**
   * Find transaction by ID
   */
  async findById(id: number): Promise<Transaction | null> {
    const transaction = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), isNull(transactions.deletedAt)),
    });

    return transaction || null;
  }

  /**
   * Find transaction by ID or throw
   */
  async findByIdOrThrow(id: number): Promise<Transaction> {
    const transaction = await this.findById(id);

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
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
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
      .select({count: sql<number>`count(*)`})
      .from(transactions)
      .where(whereClause);

    const totalCount = Number(countResult?.count ?? 0);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get paginated data with relations
    const sortColumn = filters.sortBy === "amount"
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
      data,
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
  async findByAccountId(accountId: number): Promise<Transaction[]> {
    return await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt)
      ),
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
  }

  /**
   * Get account balance from transactions
   */
  async getAccountBalance(accountId: number): Promise<number> {
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

    return Number(result[0]?.balance ?? 0);
  }

  /**
   * Get pending balance for an account
   */
  async getPendingBalance(accountId: number): Promise<number> {
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

    return Number(result[0]?.balance ?? 0);
  }

  /**
   * Count transactions for an account
   */
  async countByAccountId(accountId: number): Promise<number> {
    const [result] = await db
      .select({count: sql<number>`count(*)`})
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt)
        )
      );

    return Number(result?.count ?? 0);
  }

  /**
   * Soft delete a transaction
   */
  async softDelete(id: number): Promise<void> {
    const [deleted] = await db
      .update(transactions)
      .set({deletedAt: getCurrentTimestamp()})
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
      .returning();

    if (!deleted) {
      throw new NotFoundError("Transaction", id);
    }
  }

  /**
   * Bulk soft delete transactions
   */
  async bulkSoftDelete(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    await db
      .update(transactions)
      .set({deletedAt: getCurrentTimestamp()})
      .where(and(inArray(transactions.id, ids), isNull(transactions.deletedAt)));
  }

  /**
   * Check if transaction exists
   */
  async exists(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: transactions.id})
      .from(transactions)
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
      .limit(1);

    return !!result;
  }

  /**
   * Get transactions with running balance
   */
  async findWithRunningBalance(
    accountId: number,
    limit?: number
  ): Promise<Array<Transaction & {balance: number}>> {
    const transactionList = await db.query.transactions.findMany({
      where: and(
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt)
      ),
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
    // This matches the behavior in accounts.ts and provides users with comprehensive balance view
    let runningBalance = 0;
    const transactionsWithBalance = transactionList.reverse().map((t) => {
      runningBalance += Number(t.amount);
      return {...t, balance: runningBalance};
    }).reverse();

    return transactionsWithBalance;
  }
}