import {TransactionRepository} from "./repository";
import type {Transaction, NewTransaction} from "$lib/schema/transactions";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {InputSanitizer} from "$lib/server/shared/validation";
import {getLocalTimeZone, parseDate, today} from "@internationalized/date";
import type {TransactionFilters, PaginationParams, PaginatedResult} from "./repository";
import {invalidateAccountCache} from "$lib/utils/cache";
import {db} from "$lib/server/db";
import {accounts, transactions} from "$lib/schema";
import {budgetTransactions} from "$lib/schema/budgets";
import {eq, and, isNull, sql} from "drizzle-orm";
import {PayeeService} from "../payees/services";
import {CategoryService} from "../categories/services";
import {ScheduleService, type UpcomingScheduledTransaction} from "../schedules/services";
import {BudgetTransactionService} from "../budgets/services";

// Service input types
export interface CreateTransactionData {
  accountId: number;
  amount: number;
  date: string;
  payeeId?: number | null | undefined;
  categoryId?: number | null | undefined;
  notes?: string | null | undefined;
  status?: "cleared" | "pending" | "scheduled" | undefined;
  scheduleId?: number | null | undefined;
  budgetId?: number | null | undefined;
  budgetAllocation?: number | null | undefined;
}

export interface UpdateTransactionData {
  amount?: number | undefined;
  date?: string | undefined;
  payeeId?: number | null | undefined;
  categoryId?: number | null | undefined;
  notes?: string | null | undefined;
  status?: "cleared" | "pending" | "scheduled" | undefined;
  budgetId?: number | null | undefined;
  budgetAllocation?: number | null | undefined;
}

export interface TransactionSummary {
  accountId: number;
  accountName: string;
  balance: number;
  pendingBalance: number;
  transactionCount: number;
  clearedCount: number;
  pendingCount: number;
  scheduledCount: number;
}

/**
 * Transaction service containing business logic
 */
export class TransactionService {
  constructor(
    private repository: TransactionRepository = new TransactionRepository(),
    private payeeService: PayeeService = new PayeeService(),
    private categoryService: CategoryService = new CategoryService(),
    private budgetTransactionService: BudgetTransactionService = new BudgetTransactionService()
  ) {}

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    // Validate required fields
    if (!data.accountId) {
      throw new ValidationError("Account ID is required");
    }

    // Sanitize and validate inputs
    const amount = InputSanitizer.validateAmount(data.amount, "Amount");
    const notes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : null;

    // Validate date
    if (!data.date) {
      throw new ValidationError("Date is required");
    }

    // Determine status based on date
    let status = data.status || "pending";
    try {
      const transactionDate = parseDate(data.date);
      const currentDate = today(getLocalTimeZone());
      if (transactionDate > currentDate && status !== "cleared") {
        status = "scheduled";
      }
    } catch (error) {
      throw new ValidationError("Invalid date format");
    }

    // Verify account exists
    const accountExists = await this.verifyAccountExists(data.accountId);
    if (!accountExists) {
      throw new NotFoundError("Account", data.accountId);
    }

    // Verify payee exists if provided
    if (data.payeeId) {
      const payeeExists = await this.payeeService.verifyPayeeExists(data.payeeId);
      if (!payeeExists) {
        throw new NotFoundError("Payee", data.payeeId);
      }
    }

    // Verify category exists if provided
    if (data.categoryId) {
      const categoryExists = await this.categoryService.verifyCategoryExists(data.categoryId);
      if (!categoryExists) {
        throw new NotFoundError("Category", data.categoryId);
      }
    }

    // Create transaction
    const transaction = await this.repository.create({
      accountId: data.accountId,
      amount,
      date: data.date,
      payeeId: data.payeeId || null,
      categoryId: data.categoryId || null,
      notes,
      status,
    });

    // Handle budget allocation if provided
    if (data.budgetId && data.budgetAllocation !== undefined && data.budgetAllocation !== null) {
      try {
        // Ensure allocation has the same sign as the transaction amount
        const signedAllocation = transaction.amount >= 0 ? Math.abs(data.budgetAllocation) : -Math.abs(data.budgetAllocation);

        await this.budgetTransactionService.createAllocation({
          transactionId: transaction.id,
          budgetId: data.budgetId,
          allocatedAmount: signedAllocation,
          autoAssigned: false,
          assignedBy: 'user',
        });
      } catch (budgetError) {
        // If budget allocation fails, we should still return the transaction
        // but could log the error or notify the client
        console.warn(`Failed to create budget allocation for transaction ${transaction.id}:`, budgetError);
      }
    }

    invalidateAccountCache(transaction.accountId);

    return transaction;
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(id: number, data: UpdateTransactionData): Promise<Transaction> {
    // Verify transaction exists
    const existingTransaction = await this.repository.findByIdOrThrow(id);

    const updateData: Partial<NewTransaction> = {};

    // Validate and set amount if provided
    if (data.amount !== undefined) {
      updateData.amount = InputSanitizer.validateAmount(data.amount, "Amount");
    }

    // Validate and set date if provided
    if (data.date !== undefined) {
      if (!data.date) {
        throw new ValidationError("Date cannot be empty");
      }
      updateData.date = data.date;

      // Update status based on new date
      try {
        const transactionDate = parseDate(data.date);
        const currentDate = today(getLocalTimeZone());
        if (transactionDate > currentDate && existingTransaction.status !== "cleared") {
          updateData.status = "scheduled";
        }
      } catch (error) {
        throw new ValidationError("Invalid date format");
      }
    }

    // Set status if explicitly provided
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    // Sanitize notes if provided
    if (data.notes !== undefined) {
      updateData.notes = data.notes ? InputSanitizer.sanitizeDescription(data.notes) : null;
    }

    // Verify payee exists if provided
    if (data.payeeId !== undefined) {
      if (data.payeeId) {
        const payeeExists = await this.payeeService.verifyPayeeExists(data.payeeId);
        if (!payeeExists) {
          throw new NotFoundError("Payee", data.payeeId);
        }
      }
      updateData.payeeId = data.payeeId;
    }

    // Verify category exists if provided
    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const categoryExists = await this.categoryService.verifyCategoryExists(data.categoryId);
        if (!categoryExists) {
          throw new NotFoundError("Category", data.categoryId);
        }
      }
      updateData.categoryId = data.categoryId;
    }

    // Update transaction
    const updatedTransaction = await this.repository.update(id, updateData);

    // Handle budget allocation if provided
    // Note: This is a simplified implementation that creates a new allocation
    // A more sophisticated implementation would update existing allocations
    if (data.budgetId !== undefined && data.budgetAllocation !== undefined) {
      try {
        if (data.budgetId && data.budgetAllocation !== null) {
          // Ensure allocation has the same sign as the transaction amount
          const signedAllocation = updatedTransaction.amount >= 0 ? Math.abs(data.budgetAllocation) : -Math.abs(data.budgetAllocation);

          // Create or update budget allocation
          await this.budgetTransactionService.createAllocation({
            transactionId: updatedTransaction.id,
            budgetId: data.budgetId,
            allocatedAmount: signedAllocation,
            autoAssigned: false,
            assignedBy: 'user',
          });
        } else if (data.budgetId === null) {
          // Remove all budget allocations for this transaction
          const existingAllocations = await db.select()
            .from(budgetTransactions)
            .where(eq(budgetTransactions.transactionId, updatedTransaction.id));

          // Delete all existing allocations
          for (const allocation of existingAllocations) {
            await this.budgetTransactionService.deleteAllocation(allocation.id);
          }
        }
      } catch (budgetError) {
        // If budget allocation fails, we should still return the updated transaction
        console.warn(`Failed to update budget allocation for transaction ${updatedTransaction.id}:`, budgetError);
      }
    }

    invalidateAccountCache(updatedTransaction.accountId);

    return updatedTransaction;
  }

  /**
   * Update transaction and return all account transactions with recalculated running balances
   */
  async updateTransactionWithRecalculatedBalance(
    id: number,
    data: UpdateTransactionData
  ): Promise<Array<Transaction & {balance: number}>> {
    // First update the transaction using the existing method
    const updatedTransaction = await this.updateTransaction(id, data);

    // Then return all account transactions with recalculated running balances
    return await this.repository.findWithRunningBalance(updatedTransaction.accountId);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number): Promise<Transaction> {
    return await this.repository.findByIdWithRelations(id);
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(
    filters: TransactionFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    // Sanitize search query if provided
    if (filters.searchQuery) {
      filters.searchQuery = InputSanitizer.sanitizeText(filters.searchQuery, {
        required: false,
        maxLength: 100,
        fieldName: "Search query",
      });
    }

    return await this.repository.findWithFilters(filters, pagination);
  }

  /**
   * Get all transactions for an account
   */
  async getAccountTransactions(accountId: number): Promise<Transaction[]> {
    // Verify account exists
    const accountExists = await this.verifyAccountExists(accountId);
    if (!accountExists) {
      throw new NotFoundError("Account", accountId);
    }

    return await this.repository.findByAccountId(accountId);
  }

  /**
   * Get account transactions including upcoming scheduled transactions
   */
  async getAccountTransactionsWithUpcoming(accountId: number): Promise<(Transaction | UpcomingScheduledTransaction)[]> {
    // Verify account exists
    const accountExists = await this.verifyAccountExists(accountId);
    if (!accountExists) {
      throw new NotFoundError("Account", accountId);
    }

    // Get actual transactions with running balance
    const rawTransactions = await this.repository.findWithRunningBalance(accountId);
    console.log(`Found ${rawTransactions.length} actual transactions for account ${accountId}`);

    // Enrich actual transactions with schedule metadata if they have a scheduleId
    const actualTransactions = await Promise.all(rawTransactions.map(async (t: any): Promise<Transaction> => {
      if (t.scheduleId) {
        // Fetch schedule details for this transaction
        const scheduleService = new ScheduleService();
        try {
          const schedule = await scheduleService.getScheduleById(t.scheduleId);
          return {
            ...t,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            scheduleSlug: schedule.slug,
            scheduleFrequency: schedule.scheduleDate?.frequency,
            scheduleInterval: schedule.scheduleDate?.interval,
            scheduleNextOccurrence: undefined, // Not applicable for actual transactions
          } as Transaction;
        } catch (error) {
          // If schedule not found, just return transaction as-is
          console.warn(`Schedule ${t.scheduleId} not found for transaction ${t.id}`);
          return t as Transaction;
        }
      }
      return t as Transaction;
    }));

    // Get upcoming scheduled transactions
    const scheduleService = new ScheduleService();
    const upcomingTransactions = await scheduleService.getUpcomingScheduledTransactionsForAccount(accountId);
    console.log(`Found ${upcomingTransactions.length} upcoming scheduled transactions for account ${accountId}`);

    // Combine and sort by date (newest first)
    const allTransactions: (Transaction | UpcomingScheduledTransaction)[] = [
      ...actualTransactions,
      ...upcomingTransactions
    ];

    return allTransactions.sort((a, b) => {
      // Sort by date, newest first
      return b.date.localeCompare(a.date);
    });
  }

  /**
   * Get transactions with running balance
   */
  async getTransactionsWithBalance(accountId: number, limit?: number): Promise<Array<Transaction & {balance: number}>> {
    // Verify account exists
    const accountExists = await this.verifyAccountExists(accountId);
    if (!accountExists) {
      throw new NotFoundError("Account", accountId);
    }

    return await this.repository.findWithRunningBalance(accountId, limit);
  }

  /**
   * Get account summary
   */
  async getAccountSummary(accountId: number): Promise<TransactionSummary> {
    // Fetch account info and verify it exists
    const account = await db
      .select({
        id: accounts.id,
        name: accounts.name,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account.length) {
      throw new NotFoundError("Account", accountId);
    }

    const [balance, pendingBalance, transactions] = await Promise.all([
      this.repository.getAccountBalance(accountId),
      this.repository.getPendingBalance(accountId),
      this.repository.findByAccountId(accountId),
    ]);

    const clearedCount = transactions.filter((t) => t.status === "cleared").length;
    const pendingCount = transactions.filter((t) => t.status === "pending").length;
    const scheduledCount = transactions.filter((t) => t.status === "scheduled").length;

    const accountData = account[0];
    if (!accountData) {
      throw new NotFoundError("Account", accountId);
    }

    return {
      accountId: accountData.id,
      accountName: accountData.name,
      balance,
      pendingBalance,
      transactionCount: transactions.length,
      clearedCount,
      pendingCount,
      scheduledCount,
    };
  }

  /**
   * Delete transaction (soft delete)
   */
  async deleteTransaction(id: number): Promise<void> {
    // Soft delete the transaction
    const transaction = await this.repository.findByIdOrThrow(id);
    await this.repository.softDelete(id);

    invalidateAccountCache(transaction.accountId);
  }

  /**
   * Bulk delete transactions
   */
  async deleteTransactions(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      throw new ValidationError("No transaction IDs provided");
    }

    // Load transactions to validate existence and capture account IDs for cache invalidation
    const transactions = await Promise.all(ids.map((id) => this.repository.findByIdOrThrow(id)));

    // Bulk soft delete
    await this.repository.bulkSoftDelete(ids);

    const affectedAccounts = new Set(transactions.map((transaction) => transaction.accountId));
    affectedAccounts.forEach((accountId) => invalidateAccountCache(accountId));
  }

  /**
   * Clear pending transactions for an account
   */
  async clearPendingTransactions(accountId: number): Promise<number> {
    const pendingTransactions = await this.repository.findByAccountId(accountId);
    const pendingIds = pendingTransactions
      .filter((t) => t.status === "pending")
      .map((t) => t.id);

    let clearedCount = 0;
    for (const id of pendingIds) {
      await this.repository.update(id, {status: "cleared"});
      clearedCount++;
    }

    return clearedCount;
  }

  /**
   * Get monthly spending aggregates for analytics (all data, not paginated)
   */
  async getMonthlySpendingAggregates(accountId: number): Promise<Array<{
    month: string;
    monthLabel: string;
    spending: number;
    transactionCount: number;
  }>> {
    // Verify account exists
    const accountExists = await this.verifyAccountExists(accountId);
    if (!accountExists) {
      throw new NotFoundError("Account", accountId);
    }

    const result = await db
      .select({
        month: sql<string>`strftime('%Y-%m', date)`,
        spending: sql<number>`sum(case when amount < 0 then abs(amount) else 0 end)`,
        transactionCount: sql<number>`count(case when amount < 0 then 1 else null end)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt),
          sql`amount < 0` // Only expenses
        )
      )
      .groupBy(sql`strftime('%Y-%m', date)`)
      .orderBy(sql`strftime('%Y-%m', date)`);

    // Transform the results to include month labels
    return result.map(row => ({
      month: row.month,
      monthLabel: new Date(row.month + '-01').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      }),
      spending: row.spending,
      transactionCount: row.transactionCount,
    }));
  }

  /**
   * Helper: Verify account exists
   */
  private async verifyAccountExists(accountId: number): Promise<boolean> {
    // This would typically call the account repository
    // For now, we'll use a simple check
    const {db} = await import("$lib/server/db");
    const {accounts} = await import("$lib/schema");
    const {eq, isNull, and} = await import("drizzle-orm");

    const [account] = await db
      .select({id: accounts.id})
      .from(accounts)
      .where(and(eq(accounts.id, accountId), isNull(accounts.deletedAt)))
      .limit(1);

    return !!account;
  }

}
