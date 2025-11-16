import {TransactionRepository} from "./repository";
import type {Transaction, NewTransaction} from "$lib/schema/transactions";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {InputSanitizer} from "$lib/server/shared/validation";
import {getLocalTimeZone, parseDate, today} from "@internationalized/date";
import type {TransactionFilters, PaginationParams, PaginatedResult} from "./repository";
import {invalidateAccountCache} from "$lib/utils/cache";
import {db} from "$lib/server/db";
import {accounts, transactions} from "$lib/schema";
import {payees} from "$lib/schema/payees";
import {categories} from "$lib/schema/categories";
import {categoryGroups} from "$lib/schema/category-groups";
import {budgetTransactions} from "$lib/schema/budgets";
import {eq, and, isNull, sql, gte, lte} from "drizzle-orm";
import {PayeeService} from "../payees/services";
import {CategoryService} from "../categories/services";
import {ScheduleService, type UpcomingScheduledTransaction} from "../schedules/services";
import {BudgetTransactionService} from "../budgets/services";
import {BudgetCalculationService} from "../budgets/calculation-service";

// Service input types
export interface BudgetAllocationData {
  budgetId: number;
  amount: number;
}

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
  budgetAllocations?: BudgetAllocationData[];
  autoAssignBudgets?: boolean;
}

export interface CreateTransactionWithAutoPopulationData extends CreateTransactionData {
  // Auto-population flags
  autoPopulateFromPayee?: boolean;
  allowPayeeOverrides?: boolean;
  updatePayeeStats?: boolean;
}

export interface TransactionSuggestion {
  suggestedCategoryId: number | null;
  suggestedBudgetId: number | null;
  suggestedAmount: number | null;
  suggestedNotes: string | null;
  confidence: number; // 0-1 scale
  reasoning: string;
}

export interface PayeeTransactionIntelligence {
  mostUsedCategory: {id: number; name: string; usage: number} | null;
  mostUsedBudget: {id: number; name: string; usage: number} | null;
  averageAmount: number | null;
  typicalFrequency: string | null;
  lastTransactionDate: string | null;
  transactionCount: number;
  amountRange: {min: number; max: number} | null;
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
  budgetAllocations?: BudgetAllocationData[];
  autoAssignBudgets?: boolean;
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
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class TransactionService {
  private _scheduleService?: ScheduleService;

  constructor(
    private repository: TransactionRepository,
    private payeeService: PayeeService,
    private categoryService: CategoryService,
    private budgetTransactionService: BudgetTransactionService,
    private budgetCalculationService: BudgetCalculationService,
    private scheduleServiceGetter?: () => ScheduleService,
    private budgetIntelligenceService?: any // BudgetIntelligenceService - using any to avoid circular import
  ) {}

  /**
   * Lazy getter for ScheduleService to avoid circular dependency
   */
  private get scheduleService(): ScheduleService {
    if (!this._scheduleService && this.scheduleServiceGetter) {
      this._scheduleService = this.scheduleServiceGetter();
    }
    if (!this._scheduleService) {
      throw new Error("ScheduleService not available - circular dependency not resolved");
    }
    return this._scheduleService;
  }

  /**
   * Transform budget allocations from database format to TransactionsFormat
   */
  private transformBudgetAllocations(
    rawAllocations: Array<{
      id: number;
      budgetId: number;
      allocatedAmount: number;
      autoAssigned?: boolean;
      assignedBy?: string | null;
      budget?: {name: string} | null;
    }>
  ): Array<{
    id: number;
    budgetId: number;
    budgetName: string;
    allocatedAmount: number;
    autoAssigned: boolean;
    assignedBy: string | null;
  }> {
    if (!rawAllocations || rawAllocations.length === 0) {
      return [];
    }

    return rawAllocations.map((allocation) => ({
      id: allocation.id,
      budgetId: allocation.budgetId,
      budgetName: allocation.budget?.name || "Unknown Budget",
      allocatedAmount: allocation.allocatedAmount,
      autoAssigned: allocation.autoAssigned ?? false,
      assignedBy: allocation.assignedBy || null,
    }));
  }

  /**
   * Create a new transaction with enhanced payee defaults integration
   */
  async createTransactionWithPayeeDefaults(
    data: CreateTransactionWithAutoPopulationData,
    workspaceId: string
  ): Promise<Transaction> {
    // Get payee intelligence if payeeId is provided and auto-population is enabled
    let suggestions: TransactionSuggestion | null = null;

    if (data.payeeId && data.autoPopulateFromPayee !== false) {
      try {
        suggestions = await this.suggestTransactionDetails(data.payeeId, data.amount);

        // Auto-populate missing fields with payee defaults (only if not explicitly provided)
        if (!data.categoryId && suggestions.suggestedCategoryId) {
          data.categoryId = suggestions.suggestedCategoryId;
        }

        if (!data.budgetId && suggestions.suggestedBudgetId) {
          data.budgetId = suggestions.suggestedBudgetId;
        }

        if (!data.notes && suggestions.suggestedNotes && data.allowPayeeOverrides !== false) {
          data.notes = suggestions.suggestedNotes;
        }
      } catch (error) {
        // Log the error but continue with transaction creation
        console.warn(`Failed to get payee suggestions for payee ${data.payeeId}:`, error);
      }
    }

    // Create the transaction using the enhanced data
    const transaction = await this.createTransaction(data, workspaceId);

    // Update payee statistics after successful transaction creation
    if (data.payeeId && data.updatePayeeStats !== false) {
      try {
        await this.updatePayeeAfterTransaction(data.payeeId, workspaceId);
      } catch (error) {
        console.warn(`Failed to update payee stats for payee ${data.payeeId}:`, error);
      }
    }

    return transaction;
  }

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionData, workspaceId: string): Promise<Transaction> {
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
      const payeeExists = await this.payeeService.verifyPayeeExists(
        data.payeeId,
        Number(workspaceId)
      );
      if (!payeeExists) {
        throw new NotFoundError("Payee", data.payeeId);
      }
    }

    // Verify category exists if provided
    if (data.categoryId) {
      const categoryExists = await this.categoryService.verifyCategoryExists(
        data.categoryId,
        Number(workspaceId)
      );
      if (!categoryExists) {
        throw new NotFoundError("Category", data.categoryId);
      }
    }

    // Create transaction
    const transaction = await this.repository.create(
      {
        accountId: data.accountId,
        amount,
        date: data.date,
        payeeId: data.payeeId || null,
        categoryId: data.categoryId || null,
        notes,
        status,
      },
      workspaceId
    );

    // Handle budget allocations
    const budgetAllocationsToCreate = data.budgetAllocations || [];

    // Support legacy single budget allocation for backward compatibility
    if (data.budgetId && data.budgetAllocation !== undefined && data.budgetAllocation !== null) {
      budgetAllocationsToCreate.push({
        budgetId: data.budgetId,
        amount: data.budgetAllocation,
      });
    }

    // Create all budget allocations
    if (budgetAllocationsToCreate.length > 0) {
      for (const allocation of budgetAllocationsToCreate) {
        try {
          // Ensure allocation has the same sign as the transaction amount
          const signedAllocation =
            transaction.amount >= 0 ? Math.abs(allocation.amount) : -Math.abs(allocation.amount);

          await this.budgetTransactionService.createAllocation({
            transactionId: transaction.id,
            budgetId: allocation.budgetId,
            allocatedAmount: signedAllocation,
            autoAssigned: data.autoAssignBudgets ?? false,
            assignedBy: "user",
          });
        } catch (budgetError) {
          // If budget allocation fails, log the error but continue with other allocations
          console.warn(
            `Failed to create budget allocation for transaction ${transaction.id}, budget ${allocation.budgetId}:`,
            budgetError
          );
        }
      }
    }

    // Trigger budget consumption recalculation
    try {
      await this.budgetCalculationService.onTransactionChange(transaction.id);
    } catch (budgetCalcError) {
      console.warn(
        `Failed to recalculate budget consumption for transaction ${transaction.id}:`,
        budgetCalcError
      );
    }

    invalidateAccountCache(transaction.accountId);

    return transaction;
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: number,
    data: UpdateTransactionData,
    workspaceId: string
  ): Promise<Transaction> {
    // Verify transaction exists
    const existingTransaction = await this.repository.findByIdOrThrow(id, workspaceId);

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
        const payeeExists = await this.payeeService.verifyPayeeExists(
          data.payeeId,
          Number(workspaceId)
        );
        if (!payeeExists) {
          throw new NotFoundError("Payee", data.payeeId);
        }
      }
      updateData.payeeId = data.payeeId;
    }

    // Verify category exists if provided
    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const categoryExists = await this.categoryService.verifyCategoryExists(
          data.categoryId,
          Number(workspaceId)
        );
        if (!categoryExists) {
          throw new NotFoundError("Category", data.categoryId);
        }
      }
      updateData.categoryId = data.categoryId;
    }

    // Update transaction
    const updatedTransaction = await this.repository.update(id, updateData, workspaceId);

    // Handle budget allocations
    if (data.budgetAllocations !== undefined) {
      try {
        // Remove all existing budget allocations
        const existingAllocations = await db
          .select()
          .from(budgetTransactions)
          .where(eq(budgetTransactions.transactionId, updatedTransaction.id));

        for (const allocation of existingAllocations) {
          await this.budgetTransactionService.deleteAllocation(allocation.id);
        }

        // Create new budget allocations
        for (const allocation of data.budgetAllocations) {
          // Ensure allocation has the same sign as the transaction amount
          const signedAllocation =
            updatedTransaction.amount >= 0
              ? Math.abs(allocation.amount)
              : -Math.abs(allocation.amount);

          await this.budgetTransactionService.createAllocation({
            transactionId: updatedTransaction.id,
            budgetId: allocation.budgetId,
            allocatedAmount: signedAllocation,
            autoAssigned: data.autoAssignBudgets ?? false,
            assignedBy: "user",
          });
        }
      } catch (budgetError) {
        // If budget allocation fails, we should still return the updated transaction
        console.warn(
          `Failed to update budget allocations for transaction ${updatedTransaction.id}:`,
          budgetError
        );
      }
    }
    // Support legacy single budget allocation for backward compatibility
    else if (data.budgetId !== undefined && data.budgetAllocation !== undefined) {
      try {
        if (data.budgetId && data.budgetAllocation !== null) {
          // Remove all existing allocations first
          const existingAllocations = await db
            .select()
            .from(budgetTransactions)
            .where(eq(budgetTransactions.transactionId, updatedTransaction.id));

          for (const allocation of existingAllocations) {
            await this.budgetTransactionService.deleteAllocation(allocation.id);
          }

          // Ensure allocation has the same sign as the transaction amount
          const signedAllocation =
            updatedTransaction.amount >= 0
              ? Math.abs(data.budgetAllocation)
              : -Math.abs(data.budgetAllocation);

          // Create new budget allocation
          await this.budgetTransactionService.createAllocation({
            transactionId: updatedTransaction.id,
            budgetId: data.budgetId,
            allocatedAmount: signedAllocation,
            autoAssigned: false,
            assignedBy: "user",
          });
        } else if (data.budgetId === null) {
          // Remove all budget allocations for this transaction
          const existingAllocations = await db
            .select()
            .from(budgetTransactions)
            .where(eq(budgetTransactions.transactionId, updatedTransaction.id));

          for (const allocation of existingAllocations) {
            await this.budgetTransactionService.deleteAllocation(allocation.id);
          }
        }
      } catch (budgetError) {
        console.warn(
          `Failed to update budget allocation for transaction ${updatedTransaction.id}:`,
          budgetError
        );
      }
    }

    // Update payee statistics if the payee changed or transaction amount/date changed
    const payeeIdToUpdate = updateData.payeeId ?? existingTransaction.payeeId;
    if (
      payeeIdToUpdate &&
      (updateData.amount !== undefined ||
        updateData.date !== undefined ||
        updateData.payeeId !== undefined)
    ) {
      try {
        await this.updatePayeeAfterTransaction(payeeIdToUpdate, workspaceId);

        // If payee changed, also update the old payee's stats
        if (
          updateData.payeeId !== undefined &&
          existingTransaction.payeeId &&
          existingTransaction.payeeId !== updateData.payeeId
        ) {
          await this.updatePayeeAfterTransaction(existingTransaction.payeeId, workspaceId);
        }
      } catch (error) {
        console.warn(`Failed to update payee stats after transaction update:`, error);
      }
    }

    // Trigger budget consumption recalculation
    try {
      await this.budgetCalculationService.onTransactionChange(updatedTransaction.id);
    } catch (budgetCalcError) {
      console.warn(
        `Failed to recalculate budget consumption for transaction ${updatedTransaction.id}:`,
        budgetCalcError
      );
    }

    invalidateAccountCache(updatedTransaction.accountId);

    return updatedTransaction;
  }

  /**
   * Update transaction and return all account transactions with recalculated running balances
   */
  async updateTransactionWithRecalculatedBalance(
    id: number,
    data: UpdateTransactionData,
    workspaceId: string
  ): Promise<Array<Transaction & {balance: number}>> {
    // First update the transaction using the existing method
    const updatedTransaction = await this.updateTransaction(id, data, workspaceId);

    // Then return all account transactions with recalculated running balances
    return await this.repository.findWithRunningBalance(updatedTransaction.accountId, workspaceId);
  }

  /**
   * Bulk update payee for all transactions with matching payee name
   */
  async bulkUpdatePayeeByName(
    accountId: number,
    transactionId: number,
    newPayeeId: number | null,
    originalPayeeName: string,
    workspaceId: string
  ): Promise<{count: number}> {
    // Verify account exists and belongs to workspace
    const accountExists = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, accountId), isNull(accounts.deletedAt)),
    });

    if (!accountExists) {
      throw new NotFoundError("Account not found");
    }

    // Find all transactions in this account with matching payee name (exact case-insensitive match)
    // Exclude the original transaction that was already updated
    const matchingTransactions = await db.query.transactions.findMany({
      where: and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)),
      with: {
        payee: true,
      },
    });

    const normalizedSearchName = originalPayeeName.toLowerCase().trim();
    const transactionsToUpdate = matchingTransactions.filter(
      (t) =>
        t.id !== transactionId &&
        t.payee?.name &&
        t.payee.name.toLowerCase().trim() === normalizedSearchName
    );

    // Update all matching transactions
    const updatePromises = transactionsToUpdate.map((t) =>
      db
        .update(transactions)
        .set({
          payeeId: newPayeeId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(transactions.id, t.id))
    );

    await Promise.all(updatePromises);

    // Update payee statistics if needed
    if (newPayeeId) {
      await this.updatePayeeAfterTransaction(newPayeeId, workspaceId);
    }

    invalidateAccountCache(accountId);

    return {count: transactionsToUpdate.length};
  }

  /**
   * Bulk update category for transactions matching criteria (by payee or by previous category)
   */
  async bulkUpdateCategory(
    accountId: number,
    transactionId: number,
    newCategoryId: number | null,
    matchBy: "payee" | "category",
    matchValue: string | number | undefined,
    workspaceId: string
  ): Promise<{count: number}> {
    // Verify account exists and belongs to workspace
    const accountExists = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, accountId), isNull(accounts.deletedAt)),
    });

    if (!accountExists) {
      throw new NotFoundError("Account not found");
    }

    // Get the original transaction to determine matching criteria
    const originalTransaction = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, transactionId), isNull(transactions.deletedAt)),
      with: {
        payee: true,
      },
    });

    if (!originalTransaction) {
      throw new NotFoundError("Original transaction not found");
    }

    // Find all transactions in this account
    const allTransactions = await db.query.transactions.findMany({
      where: and(eq(transactions.accountId, accountId), isNull(transactions.deletedAt)),
      with: {
        payee: true,
      },
    });

    let transactionsToUpdate: typeof allTransactions = [];

    if (matchBy === "payee") {
      // Match by payee name (exact case-insensitive match)
      const payeeName = originalTransaction.payee?.name;
      if (!payeeName) {
        return {count: 0};
      }

      const normalizedPayeeName = payeeName.toLowerCase().trim();
      transactionsToUpdate = allTransactions.filter(
        (t) =>
          t.id !== transactionId &&
          t.payee?.name &&
          t.payee.name.toLowerCase().trim() === normalizedPayeeName
      );
    } else if (matchBy === "category") {
      // Match by previous category ID
      const previousCategoryId = typeof matchValue === "number" ? matchValue : null;
      transactionsToUpdate = allTransactions.filter(
        (t) => t.id !== transactionId && t.categoryId === previousCategoryId
      );
    }

    // Update all matching transactions
    const updatePromises = transactionsToUpdate.map((t) =>
      db
        .update(transactions)
        .set({
          categoryId: newCategoryId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(transactions.id, t.id))
    );

    await Promise.all(updatePromises);

    invalidateAccountCache(accountId);

    return {count: transactionsToUpdate.length};
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number, workspaceId: string): Promise<Transaction> {
    return await this.repository.findByIdWithRelations(id, workspaceId);
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(
    filters: TransactionFilters,
    pagination: PaginationParams | undefined,
    workspaceId: string
  ): Promise<PaginatedResult<Transaction>> {
    // Sanitize search query if provided
    if (filters.searchQuery) {
      filters.searchQuery = InputSanitizer.sanitizeText(filters.searchQuery, {
        required: false,
        maxLength: 100,
        fieldName: "Search query",
      });
    }

    return await this.repository.findWithFilters(filters, pagination, workspaceId);
  }

  /**
   * Get all transactions for an account
   */
  async getAccountTransactions(accountId: number, workspaceId: string): Promise<Transaction[]> {
    const rawTransactions = await this.repository.findByAccountId(accountId, workspaceId);

    // Transform budget allocations for each transaction
    return rawTransactions.map((t) => ({
      ...t,
      budgetAllocations: this.transformBudgetAllocations(t.budgetAllocations || []),
    }));
  }

  /**
   * Get account transactions including upcoming scheduled transactions
   */
  async getAccountTransactionsWithUpcoming(
    accountId: number,
    workspaceId: string
  ): Promise<(Transaction | UpcomingScheduledTransaction)[]> {
    // Get actual transactions with running balance
    const rawTransactions = await this.repository.findWithRunningBalance(accountId, workspaceId);
    console.log(`Found ${rawTransactions.length} actual transactions for account ${accountId}`);

    // Enrich actual transactions with schedule metadata if they have a scheduleId
    const actualTransactions = await Promise.all(
      rawTransactions.map(async (t): Promise<Transaction> => {
        // Transform budget allocations to match TransactionsFormat
        const budgetAllocations = this.transformBudgetAllocations(t.budgetAllocations || []);

        if (t.scheduleId) {
          // Fetch schedule details for this transaction
          try {
            const schedule = await this.scheduleService.getScheduleById(t.scheduleId);
            return {
              ...t,
              scheduleId: schedule.id,
              scheduleName: schedule.name,
              scheduleSlug: schedule.slug,
              scheduleFrequency: schedule.scheduleDate?.frequency,
              scheduleInterval: schedule.scheduleDate?.interval,
              scheduleNextOccurrence: undefined, // Not applicable for actual transactions
              budgetAllocations,
            } as Transaction;
          } catch (error) {
            // If schedule not found, just return transaction as-is
            console.warn(`Schedule ${t.scheduleId} not found for transaction ${t.id}`);
            return {...t, budgetAllocations} as Transaction;
          }
        }
        return {...t, budgetAllocations} as Transaction;
      })
    );

    // Get upcoming scheduled transactions
    const upcomingTransactions =
      await this.scheduleService.getUpcomingScheduledTransactionsForAccount(accountId);
    console.log(
      `Found ${upcomingTransactions.length} upcoming scheduled transactions for account ${accountId}`
    );

    // Combine and sort by date (newest first)
    const allTransactions: (Transaction | UpcomingScheduledTransaction)[] = [
      ...actualTransactions,
      ...upcomingTransactions,
    ];

    return allTransactions.sort((a, b) => {
      // Sort by date, newest first
      return b.date.localeCompare(a.date);
    });
  }

  /**
   * Get transactions with running balance
   */
  async getTransactionsWithBalance(
    accountId: number,
    workspaceId: string,
    limit?: number
  ): Promise<Array<Transaction & {balance: number}>> {
    return await this.repository.findWithRunningBalance(accountId, workspaceId, limit);
  }

  /**
   * Get account summary
   */
  async getAccountSummary(accountId: number, workspaceId: string): Promise<TransactionSummary> {
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
      this.repository.getAccountBalance(accountId, workspaceId),
      this.repository.getPendingBalance(accountId, workspaceId),
      this.repository.findByAccountId(accountId, workspaceId),
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
  async deleteTransaction(id: number, workspaceId: string): Promise<void> {
    // Soft delete the transaction
    const transaction = await this.repository.findByIdOrThrow(id, workspaceId);
    await this.repository.softDelete(id, workspaceId);

    // Trigger budget consumption recalculation
    try {
      await this.budgetCalculationService.onTransactionChange(id);
    } catch (budgetCalcError) {
      console.warn(
        `Failed to recalculate budget consumption for deleted transaction ${id}:`,
        budgetCalcError
      );
    }

    invalidateAccountCache(transaction.accountId);
  }

  /**
   * Bulk delete transactions
   */
  async deleteTransactions(ids: number[], workspaceId: string): Promise<void> {
    if (ids.length === 0) {
      throw new ValidationError("No transaction IDs provided");
    }

    // Load transactions to validate existence and capture account IDs for cache invalidation
    const transactions = await Promise.all(
      ids.map((id) => this.repository.findByIdOrThrow(id, workspaceId))
    );

    // Bulk soft delete
    await this.repository.bulkSoftDelete(ids, workspaceId);

    // Trigger budget consumption recalculation for each deleted transaction
    for (const id of ids) {
      try {
        await this.budgetCalculationService.onTransactionChange(id);
      } catch (budgetCalcError) {
        console.warn(
          `Failed to recalculate budget consumption for deleted transaction ${id}:`,
          budgetCalcError
        );
      }
    }

    const affectedAccounts = new Set(transactions.map((transaction) => transaction.accountId));
    affectedAccounts.forEach((accountId) => invalidateAccountCache(accountId));
  }

  /**
   * Clear pending transactions for an account
   */
  async clearPendingTransactions(accountId: number, workspaceId: string): Promise<number> {
    const pendingTransactions = await this.repository.findByAccountId(accountId, workspaceId);
    const pendingIds = pendingTransactions.filter((t) => t.status === "pending").map((t) => t.id);

    let clearedCount = 0;
    for (const id of pendingIds) {
      await this.repository.update(id, {status: "cleared"}, workspaceId);

      // Trigger budget consumption recalculation (status change may affect period calculations)
      try {
        await this.budgetCalculationService.onTransactionChange(id);
      } catch (budgetCalcError) {
        console.warn(
          `Failed to recalculate budget consumption for cleared transaction ${id}:`,
          budgetCalcError
        );
      }

      clearedCount++;
    }

    return clearedCount;
  }

  /**
   * Get monthly spending aggregates for analytics (all data, not paginated)
   */
  async getMonthlySpendingAggregates(
    accountId: number,
    workspaceId: string
  ): Promise<
    Array<{
      month: string;
      monthLabel: string;
      spending: number;
      transactionCount: number;
    }>
  > {
    // Verify account belongs to user (through repository)
    await this.repository.findByAccountId(accountId, workspaceId);

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
    return result.map((row) => ({
      month: row.month,
      monthLabel: new Date(row.month + "-01").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
      spending: row.spending,
      transactionCount: row.transactionCount,
    }));
  }

  /**
   * Generate intelligent transaction suggestions based on payee history
   */
  async suggestTransactionDetails(
    payeeId: number,
    amount?: number
  ): Promise<TransactionSuggestion> {
    // Get payee with default settings
    const payee = await this.payeeService.getPayeeById(payeeId);

    // Get payee intelligence data
    const intelligence = await this.getPayeeTransactionIntelligence(payeeId);

    let confidence = 0;
    let reasoning = "Based on payee settings";

    // Start with payee defaults
    let suggestedCategoryId = payee.defaultCategoryId;
    let suggestedBudgetId = payee.defaultBudgetId;
    let suggestedAmount = amount || payee.avgAmount;
    let suggestedNotes: string | null = null;

    // Enhance suggestions with transaction history intelligence
    if (intelligence.transactionCount > 0) {
      confidence += 0.3; // Base confidence for having transaction history
      reasoning = "Based on payee settings and transaction history";

      // Use most frequently used category if available and more confident
      if (intelligence.mostUsedCategory && intelligence.mostUsedCategory.usage > 2) {
        suggestedCategoryId = intelligence.mostUsedCategory.id;
        confidence += 0.3;
      }

      // Use most frequently used budget if available and more confident
      if (intelligence.mostUsedBudget && intelligence.mostUsedBudget.usage > 2) {
        suggestedBudgetId = intelligence.mostUsedBudget.id;
        confidence += 0.2;
      }

      // Use average amount if no amount provided and we have good data
      if (!amount && intelligence.averageAmount && intelligence.transactionCount >= 3) {
        suggestedAmount = Math.round(intelligence.averageAmount * 100) / 100; // Round to cents
        confidence += 0.2;
      }
    }

    // Add confidence for having default settings
    if (payee.defaultCategoryId) confidence += 0.2;
    if (payee.defaultBudgetId) confidence += 0.2;

    // Generate intelligent notes suggestion
    if (payee.payeeType && intelligence.typicalFrequency) {
      const typeLabel = payee.payeeType.replace("_", " ");
      suggestedNotes = `${typeLabel} - typically ${intelligence.typicalFrequency}`;
    }

    return {
      suggestedCategoryId,
      suggestedBudgetId,
      suggestedAmount,
      suggestedNotes,
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      reasoning,
    };
  }

  /**
   * Get comprehensive payee transaction intelligence
   */
  async getPayeeTransactionIntelligence(
    payeeId: number,
    workspaceId: string
  ): Promise<PayeeTransactionIntelligence> {
    // Get all transactions for this payee
    const payeeTransactions = await db
      .select({
        categoryId: transactions.categoryId,
        amount: transactions.amount,
        date: transactions.date,
        // We would need to join with budget_transactions table for budget info
        // For now, we'll focus on category intelligence
      })
      .from(transactions)
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .orderBy(sql`date DESC`);

    if (payeeTransactions.length === 0) {
      return {
        mostUsedCategory: null,
        mostUsedBudget: null,
        averageAmount: null,
        typicalFrequency: null,
        lastTransactionDate: null,
        transactionCount: 0,
        amountRange: null,
      };
    }

    // Calculate category usage
    const categoryUsage = new Map<number, number>();
    let totalAmount = 0;
    let minAmount = Infinity;
    let maxAmount = -Infinity;

    for (const tx of payeeTransactions) {
      if (tx.categoryId) {
        categoryUsage.set(tx.categoryId, (categoryUsage.get(tx.categoryId) || 0) + 1);
      }

      totalAmount += Math.abs(tx.amount);
      minAmount = Math.min(minAmount, Math.abs(tx.amount));
      maxAmount = Math.max(maxAmount, Math.abs(tx.amount));
    }

    // Find most used category
    let mostUsedCategory: {id: number; name: string; usage: number} | null = null;
    if (categoryUsage.size > 0) {
      const sortedCategories = Array.from(categoryUsage.entries()).sort(([, a], [, b]) => b - a);

      if (sortedCategories.length > 0) {
        const first = sortedCategories[0];
        if (first) {
          const [categoryId, usage] = first;

          // Fetch actual category name
          let categoryName = `Category ${categoryId}`;
          try {
            const category = await this.categoryService.getCategoryById(categoryId);
            categoryName = category.name ?? `Category ${categoryId}`;
          } catch (error) {
            console.warn(`Failed to fetch category ${categoryId}:`, error);
          }

          mostUsedCategory = {
            id: categoryId,
            name: categoryName,
            usage,
          };
        }
      }
    }

    // Calculate frequency pattern (simplified)
    let typicalFrequency: string | null = null;
    if (payeeTransactions.length >= 3) {
      const daysBetween = this.calculateAverageTransactionInterval(payeeTransactions);
      if (daysBetween <= 7) typicalFrequency = "weekly";
      else if (daysBetween <= 14) typicalFrequency = "bi-weekly";
      else if (daysBetween <= 35) typicalFrequency = "monthly";
      else if (daysBetween <= 95) typicalFrequency = "quarterly";
      else typicalFrequency = "infrequent";
    }

    // Get most used budget for this payee
    let budgetPattern = null;
    if (this.budgetIntelligenceService) {
      budgetPattern = await this.budgetIntelligenceService.getMostUsedBudget(
        payeeId,
        mostUsedCategory?.id ?? undefined
      );
    } else {
      // Fallback for backward compatibility
      const {BudgetIntelligenceService} = await import("$lib/server/domains/budgets/services");
      const intelligenceService = new BudgetIntelligenceService();
      budgetPattern = await intelligenceService.getMostUsedBudget(
        payeeId,
        mostUsedCategory?.id ?? undefined
      );
    }

    // Transform budget pattern to match interface
    let mostUsedBudget: {id: number; name: string; usage: number} | null = null;
    if (budgetPattern) {
      mostUsedBudget = {
        id: budgetPattern.budgetId,
        name: budgetPattern.budgetName,
        usage: budgetPattern.usageCount,
      };
    }

    return {
      mostUsedCategory,
      mostUsedBudget,
      averageAmount: totalAmount / payeeTransactions.length,
      typicalFrequency,
      lastTransactionDate: payeeTransactions[0]?.date || null,
      transactionCount: payeeTransactions.length,
      amountRange: minAmount === Infinity ? null : {min: minAmount, max: maxAmount},
    };
  }

  /**
   * Update payee calculated fields after transaction creation/update
   */
  async updatePayeeAfterTransaction(payeeId: number, workspaceId: string): Promise<void> {
    // Get latest transaction data for this payee
    const intelligence = await this.getPayeeTransactionIntelligence(payeeId, workspaceId);

    // Prepare update data with proper typing
    interface PayeeIntelligenceUpdate {
      lastTransactionDate: string | null;
      avgAmount?: number;
      paymentFrequency?: string;
    }

    const updateData: PayeeIntelligenceUpdate = {
      lastTransactionDate: intelligence.lastTransactionDate,
    };

    // Update average amount if we have sufficient data
    if (intelligence.averageAmount !== null && intelligence.transactionCount >= 2) {
      updateData.avgAmount = Math.round(intelligence.averageAmount * 100) / 100;
    }

    // Update payment frequency if detected
    if (intelligence.typicalFrequency) {
      // Map our internal frequency to payee schema frequency
      const frequencyMap: Record<string, string> = {
        weekly: "weekly",
        "bi-weekly": "bi_weekly",
        monthly: "monthly",
        quarterly: "quarterly",
        infrequent: "irregular",
      };

      updateData.paymentFrequency = frequencyMap[intelligence.typicalFrequency] || "irregular";
    }

    // Update the payee with calculated fields
    if (Object.keys(updateData).length > 0) {
      await this.payeeService.updatePayee(payeeId, updateData);
    }
  }

  /**
   * Calculate average days between transactions for frequency detection
   */
  private calculateAverageTransactionInterval(transactions: Array<{date: string}>): number {
    if (transactions.length < 2) return 0;

    const dates = transactions
      .map((t) => new Date(t.date))
      .sort((a, b) => a.getTime() - b.getTime());
    let totalDays = 0;

    for (let i = 1; i < dates.length; i++) {
      const current = dates[i];
      const previous = dates[i - 1];
      if (current && previous) {
        const daysDiff = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);
        totalDays += daysDiff;
      }
    }

    return totalDays / (dates.length - 1);
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
   * Create a transfer between two accounts (dual-entry transaction)
   */
  async createTransfer(
    params: {
      fromAccountId: number;
      toAccountId: number;
      amount: number; // Always positive
      date: string;
      notes?: string;
      categoryId?: number | null;
      payeeId?: number | null;
    },
    workspaceId: string
  ): Promise<{transferId: string; fromTransaction: Transaction; toTransaction: Transaction}> {
    const {createId} = await import("@paralleldrive/cuid2");

    // Validate accounts exist
    const fromAccountExists = await this.verifyAccountExists(params.fromAccountId);
    if (!fromAccountExists) {
      throw new NotFoundError("Account", params.fromAccountId);
    }

    const toAccountExists = await this.verifyAccountExists(params.toAccountId);
    if (!toAccountExists) {
      throw new NotFoundError("Account", params.toAccountId);
    }

    // Validate amount is positive
    if (params.amount <= 0) {
      throw new ValidationError("Transfer amount must be positive");
    }

    // Generate shared transfer ID
    const transferId = createId();

    // Sanitize user-provided notes if any
    const userNotes = params.notes ? InputSanitizer.sanitizeDescription(params.notes) : null;

    // Generate descriptive notes only if user didn't provide notes
    let fromNotes = userNotes;
    let toNotes = userNotes;

    if (!userNotes) {
      // Fetch account names for automatic descriptive notes
      const [fromAccount] = await db
        .select({name: accounts.name})
        .from(accounts)
        .where(eq(accounts.id, params.fromAccountId))
        .limit(1);

      const [toAccount] = await db
        .select({name: accounts.name})
        .from(accounts)
        .where(eq(accounts.id, params.toAccountId))
        .limit(1);

      fromNotes = `Transfer to ${toAccount?.name || "Unknown Account"}`;
      toNotes = `Transfer from ${fromAccount?.name || "Unknown Account"}`;
    }

    // Create FROM transaction (money out - negative amount)
    const fromTransaction = await this.repository.create(
      {
        accountId: params.fromAccountId,
        amount: -params.amount,
        date: params.date,
        notes: fromNotes,
        categoryId: params.categoryId || null,
        payeeId: params.payeeId || null,
        transferId,
        transferAccountId: params.toAccountId,
        isTransfer: true,
        status: "cleared", // Transfers are typically cleared immediately
      },
      workspaceId
    );

    // Create TO transaction (money in - positive amount)
    const toTransaction = await this.repository.create(
      {
        accountId: params.toAccountId,
        amount: params.amount,
        date: params.date,
        notes: toNotes,
        categoryId: params.categoryId || null,
        payeeId: params.payeeId || null,
        transferId,
        transferAccountId: params.fromAccountId,
        isTransfer: true,
        status: "cleared",
      },
      workspaceId
    );

    // Link the transactions together
    await this.repository.update(
      fromTransaction.id,
      {
        transferTransactionId: toTransaction.id,
      },
      workspaceId
    );

    await this.repository.update(
      toTransaction.id,
      {
        transferTransactionId: fromTransaction.id,
      },
      workspaceId
    );

    // Invalidate both account caches
    invalidateAccountCache(params.fromAccountId);
    invalidateAccountCache(params.toAccountId);

    return {
      transferId,
      fromTransaction: await this.repository.findByIdWithRelations(fromTransaction.id, workspaceId),
      toTransaction: await this.repository.findByIdWithRelations(toTransaction.id, workspaceId),
    };
  }

  /**
   * Update a transfer (updates both transactions atomically)
   */
  async updateTransfer(
    transferId: string,
    updates: {
      amount?: number;
      date?: string;
      notes?: string;
      categoryId?: number | null;
      payeeId?: number | null;
    },
    workspaceId: string
  ): Promise<{fromTransaction: Transaction; toTransaction: Transaction}> {
    // Find both transactions using shared transferId
    const transferTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.transferId, transferId), isNull(transactions.deletedAt)));

    if (transferTransactions.length !== 2) {
      throw new ValidationError(
        `Invalid transfer: expected exactly 2 transactions, found ${transferTransactions.length}`
      );
    }

    // Identify which is from and which is to based on amount sign
    const fromTransaction = transferTransactions.find((t) => t.amount < 0);
    const toTransaction = transferTransactions.find((t) => t.amount > 0);

    if (!fromTransaction || !toTransaction) {
      throw new ValidationError("Invalid transfer: could not identify transaction direction");
    }

    // Prepare update data
    const updateData: Partial<NewTransaction> = {};

    if (updates.amount !== undefined) {
      if (updates.amount <= 0) {
        throw new ValidationError("Transfer amount must be positive");
      }
      // Will be applied differently to from/to transactions
    }

    if (updates.date !== undefined) {
      updateData.date = updates.date;
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes ? InputSanitizer.sanitizeDescription(updates.notes) : null;
    }

    if (updates.categoryId !== undefined) {
      updateData.categoryId = updates.categoryId;
    }

    if (updates.payeeId !== undefined) {
      updateData.payeeId = updates.payeeId;
    }

    // Update FROM transaction
    const fromUpdateData = {...updateData};
    if (updates.amount !== undefined) {
      fromUpdateData.amount = -updates.amount; // Negative for outgoing
    }
    await this.repository.update(fromTransaction.id, fromUpdateData, workspaceId);

    // Update TO transaction
    const toUpdateData = {...updateData};
    if (updates.amount !== undefined) {
      toUpdateData.amount = updates.amount; // Positive for incoming
    }
    await this.repository.update(toTransaction.id, toUpdateData, workspaceId);

    // Invalidate both account caches
    invalidateAccountCache(fromTransaction.accountId);
    invalidateAccountCache(toTransaction.accountId);

    return {
      fromTransaction: await this.repository.findByIdWithRelations(fromTransaction.id, workspaceId),
      toTransaction: await this.repository.findByIdWithRelations(toTransaction.id, workspaceId),
    };
  }

  /**
   * Delete a transfer (soft deletes both transactions)
   */
  async deleteTransfer(transferId: string, workspaceId: string): Promise<void> {
    // Find both transactions using shared transferId
    const transferTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.transferId, transferId), isNull(transactions.deletedAt)));

    if (transferTransactions.length !== 2) {
      throw new ValidationError(
        `Invalid transfer: expected exactly 2 transactions, found ${transferTransactions.length}`
      );
    }

    // Soft delete both transactions
    const accountIds = new Set<number>();
    for (const transaction of transferTransactions) {
      await this.repository.softDelete(transaction.id, workspaceId);
      accountIds.add(transaction.accountId);
    }

    // Invalidate all affected account caches
    accountIds.forEach((accountId) => invalidateAccountCache(accountId));
  }

  /**
   * Get top payees by transaction count and amount for an account
   */
  async getTopPayees(
    accountId: number,
    options: {dateFrom?: string; dateTo?: string; limit?: number},
    workspaceId: number
  ) {
    const {dateFrom, dateTo, limit = 20} = options;

    // Build date filter conditions
    const dateConditions = [];
    if (dateFrom) {
      dateConditions.push(gte(transactions.date, dateFrom));
    }
    if (dateTo) {
      dateConditions.push(lte(transactions.date, dateTo));
    }

    const result = await db
      .select({
        payeeId: transactions.payeeId,
        payeeName: payees.name,
        transactionCount: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(ABS(${transactions.amount}))`,
        avgAmount: sql<number>`AVG(ABS(${transactions.amount}))`,
      })
      .from(transactions)
      .leftJoin(payees, eq(transactions.payeeId, payees.id))
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(payees.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
          sql`${transactions.payeeId} IS NOT NULL`,
          ...dateConditions
        )
      )
      .groupBy(transactions.payeeId, payees.name)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(limit);

    return result;
  }

  /**
   * Get top categories by transaction count and amount for an account
   */
  async getTopCategories(
    accountId: number,
    options: {dateFrom?: string; dateTo?: string; limit?: number},
    workspaceId: number
  ) {
    const {dateFrom, dateTo, limit = 20} = options;

    // Build date filter conditions
    const dateConditions = [];
    if (dateFrom) {
      dateConditions.push(gte(transactions.date, dateFrom));
    }
    if (dateTo) {
      dateConditions.push(lte(transactions.date, dateTo));
    }

    // Get total spending for percentage calculation
    const totalResult = await db
      .select({
        total: sql<number>`SUM(ABS(${transactions.amount}))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt),
          ...dateConditions
        )
      );

    const totalSpending = totalResult[0]?.total || 0;

    const result = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryGroupName: sql<string | null>`NULL`,
        transactionCount: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(ABS(${transactions.amount}))`,
        avgAmount: sql<number>`AVG(ABS(${transactions.amount}))`,
        percentage: sql<number>`CASE WHEN ${totalSpending} > 0 THEN (SUM(ABS(${transactions.amount})) * 100.0 / ${totalSpending}) ELSE 0 END`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.accountId, accountId),
          eq(categories.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
          sql`${transactions.categoryId} IS NOT NULL`,
          ...dateConditions
        )
      )
      .groupBy(transactions.categoryId, categories.name)
      .orderBy(sql`SUM(ABS(${transactions.amount})) DESC`)
      .limit(limit);

    return result;
  }

  /**
   * Get recent activity summary for an account
   */
  async getRecentActivity(accountId: number, days: number, workspaceId: number) {
    const dateFrom = today(getLocalTimeZone()).subtract({days}).toString();

    const result = await db
      .select({
        transactionCount: sql<number>`COUNT(*)`,
        totalSpent: sql<number>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`,
        totalReceived: sql<number>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          isNull(transactions.deletedAt),
          gte(transactions.date, dateFrom)
        )
      );

    return (
      result[0] || {
        transactionCount: 0,
        totalSpent: 0,
        totalReceived: 0,
      }
    );
  }
}
