import {TransactionRepository} from "./repository";
import type {Transaction, NewTransaction} from "$lib/schema/transactions";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {InputSanitizer} from "$lib/server/shared/validation";
import {getLocalTimeZone, parseDate, today} from "@internationalized/date";
import type {TransactionFilters, PaginationParams, PaginatedResult} from "./repository";

// Service input types
export interface CreateTransactionData {
  accountId: number;
  amount: number;
  date: string;
  payeeId?: number | null | undefined;
  categoryId?: number | null | undefined;
  notes?: string | null | undefined;
  status?: "cleared" | "pending" | "scheduled" | undefined;
}

export interface UpdateTransactionData {
  amount?: number | undefined;
  date?: string | undefined;
  payeeId?: number | null | undefined;
  categoryId?: number | null | undefined;
  notes?: string | null | undefined;
  status?: "cleared" | "pending" | "scheduled" | undefined;
}

export interface TransactionSummary {
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
  constructor(private repository: TransactionRepository = new TransactionRepository()) {}

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
      const payeeExists = await this.verifyPayeeExists(data.payeeId);
      if (!payeeExists) {
        throw new NotFoundError("Payee", data.payeeId);
      }
    }

    // Verify category exists if provided
    if (data.categoryId) {
      const categoryExists = await this.verifyCategoryExists(data.categoryId);
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
        const payeeExists = await this.verifyPayeeExists(data.payeeId);
        if (!payeeExists) {
          throw new NotFoundError("Payee", data.payeeId);
        }
      }
      updateData.payeeId = data.payeeId;
    }

    // Verify category exists if provided
    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const categoryExists = await this.verifyCategoryExists(data.categoryId);
        if (!categoryExists) {
          throw new NotFoundError("Category", data.categoryId);
        }
      }
      updateData.categoryId = data.categoryId;
    }

    // Update transaction
    return await this.repository.update(id, updateData);
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
    // Verify account exists
    const accountExists = await this.verifyAccountExists(accountId);
    if (!accountExists) {
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

    return {
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
    // Verify transaction exists
    await this.repository.findByIdOrThrow(id);

    // Soft delete the transaction
    await this.repository.softDelete(id);
  }

  /**
   * Bulk delete transactions
   */
  async deleteTransactions(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      throw new ValidationError("No transaction IDs provided");
    }

    // Verify all transactions exist
    const verificationPromises = ids.map((id) => this.repository.exists(id));
    const existenceResults = await Promise.all(verificationPromises);

    const missingIds = ids.filter((_, index) => !existenceResults[index]);
    if (missingIds.length > 0) {
      throw new NotFoundError("Transaction", missingIds.join(", "));
    }

    // Bulk soft delete
    await this.repository.bulkSoftDelete(ids);
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

  /**
   * Helper: Verify payee exists
   */
  private async verifyPayeeExists(payeeId: number): Promise<boolean> {
    const {db} = await import("$lib/server/db");
    const {payees} = await import("$lib/schema");
    const {eq, isNull, and} = await import("drizzle-orm");

    const [payee] = await db
      .select({id: payees.id})
      .from(payees)
      .where(and(eq(payees.id, payeeId), isNull(payees.deletedAt)))
      .limit(1);

    return !!payee;
  }

  /**
   * Helper: Verify category exists
   */
  private async verifyCategoryExists(categoryId: number): Promise<boolean> {
    const {db} = await import("$lib/server/db");
    const {categories} = await import("$lib/schema");
    const {eq, isNull, and} = await import("drizzle-orm");

    const [category] = await db
      .select({id: categories.id})
      .from(categories)
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .limit(1);

    return !!category;
  }
}