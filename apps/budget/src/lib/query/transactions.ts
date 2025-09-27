import { defineQuery, defineMutation, createQueryKeys } from "./_factory";
import { cachePatterns } from "./_client";
import { trpc } from "$lib/trpc/client";
import type {
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  PaginationParams,
} from "$lib/server/domains/transactions";
import type { Transaction } from "$lib/schema";

/**
 * Query Keys for transaction operations
 */
export const transactionKeys = createQueryKeys("transactions", {
  lists: () => ["transactions", "list"] as const,
  list: (filters?: TransactionFilters, pagination?: PaginationParams) =>
    ["transactions", "list", { filters, pagination }] as const,
  details: () => ["transactions", "detail"] as const,
  detail: (id: number) => ["transactions", "detail", id] as const,
  byAccount: (accountId: number, params?: any) =>
    ["transactions", "account", accountId, params] as const,
  allByAccount: (accountId: number, params?: any) =>
    ["transactions", "all", accountId, params] as const,
  summary: (accountId: number) =>
    ["transactions", "summary", accountId] as const,
});

/**
 * Get ALL transactions for an account (for client-side pagination)
 */
export const getAllAccountTransactions = (
  accountId: number,
  options?: {
    sortBy?: 'date' | 'amount' | 'notes';
    sortOrder?: 'asc' | 'desc';
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const params = {
    accountId,
    sortBy: options?.sortBy ?? 'date',
    sortOrder: options?.sortOrder ?? 'desc',
    ...(options?.searchQuery && { searchQuery: options.searchQuery }),
    ...(options?.dateFrom && { dateFrom: options.dateFrom }),
    ...(options?.dateTo && { dateTo: options.dateTo }),
  };

  return defineQuery({
    queryKey: transactionKeys.allByAccount(accountId, params),
    queryFn: () => trpc().serverAccountsRoutes.loadAllTransactions.query(params),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });
};

/**
 * Get ALL transactions for an account including upcoming scheduled transactions
 */
export const getAllAccountTransactionsWithUpcoming = (
  accountId: number,
  options?: {
    sortBy?: 'date' | 'amount' | 'notes';
    sortOrder?: 'asc' | 'desc';
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  return defineQuery({
    queryKey: [...transactionKeys.allByAccount(accountId, options), 'with-upcoming'],
    queryFn: () => trpc().transactionRoutes.forAccountWithUpcoming.query({ accountId }),
    options: {
      staleTime: 30 * 1000, // 30 seconds
      select: (data: any[]) => {
        // Client-side filtering and sorting since we get everything from the server
        let filteredData = [...data];

        // Apply search filter
        if (options?.searchQuery) {
          const query = options.searchQuery.toLowerCase();
          filteredData = filteredData.filter(transaction =>
            transaction.notes?.toLowerCase().includes(query) ||
            (transaction as any).scheduleName?.toLowerCase().includes(query)
          );
        }

        // Apply date filters
        if (options?.dateFrom) {
          filteredData = filteredData.filter(transaction => transaction.date >= options.dateFrom!);
        }
        if (options?.dateTo) {
          filteredData = filteredData.filter(transaction => transaction.date <= options.dateTo!);
        }

        // Apply sorting
        const sortBy = options?.sortBy ?? 'date';
        const sortOrder = options?.sortOrder ?? 'desc';

        filteredData.sort((a, b) => {
          let aValue: any, bValue: any;

          switch (sortBy) {
            case 'amount':
              aValue = a.amount;
              bValue = b.amount;
              break;
            case 'notes':
              aValue = a.notes || '';
              bValue = b.notes || '';
              break;
            case 'date':
            default:
              aValue = a.date;
              bValue = b.date;
              break;
          }

          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });

        return filteredData;
      }
    },
  });
};

/**
 * Get paginated transactions for an account (legacy - for server-side pagination)
 */
export const getAccountTransactions = (
  accountId: number,
  options?: {
    page?: number;
    pageSize?: number;
    sortBy?: 'date' | 'amount' | 'notes';
    sortOrder?: 'asc' | 'desc';
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const params = {
    accountId,
    page: options?.page ?? 0,
    pageSize: options?.pageSize ?? 50,
    sortBy: options?.sortBy ?? 'date',
    sortOrder: options?.sortOrder ?? 'desc',
    ...(options?.searchQuery && { searchQuery: options.searchQuery }),
    ...(options?.dateFrom && { dateFrom: options.dateFrom }),
    ...(options?.dateTo && { dateTo: options.dateTo }),
  };

  return defineQuery({
    queryKey: transactionKeys.byAccount(accountId, params),
    queryFn: () => trpc().serverAccountsRoutes.loadTransactions.query(params),
    options: {
      staleTime: 30 * 1000,
      select: (data: any) => data?.transactions || [],
    },
  });
};

/**
 * Get transactions with filters and pagination
 */
export const getTransactionsList = (
  filters?: TransactionFilters,
  pagination?: PaginationParams
) => {
  return defineQuery({
    queryKey: transactionKeys.list(filters, pagination),
    queryFn: () => trpc().transactionRoutes.list.query({ filters, pagination }),
    options: {
      staleTime: 30 * 1000,
    },
  });
};

/**
 * Get single transaction by ID
 */
export const getTransactionDetail = (id: number) => {
  return defineQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => trpc().transactionRoutes.byId.query({ id }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get account summary
 */
export const getAccountSummary = (accountId: number) => {
  return defineQuery({
    queryKey: transactionKeys.summary(accountId),
    queryFn: () => trpc().transactionRoutes.summary.query({ accountId }),
    options: {
      staleTime: 30 * 1000,
    },
  });
};

/**
 * Get monthly spending aggregates for analytics (all data, not paginated)
 */
export const getMonthlySpendingAggregates = (accountId: number) => {
  return defineQuery({
    queryKey: ["transactions", "analytics", "monthlySpending", accountId],
    queryFn: () => trpc().transactionRoutes.monthlySpendingAggregates.query({ accountId }),
    options: {
      staleTime: 60 * 1000, // 1 minute cache for analytics data
    },
  });
};

/**
 * Create new transaction
 */
export const createTransaction = defineMutation<CreateTransactionData, Transaction>({
  mutationFn: (data) => trpc().transactionRoutes.create.mutate(data),
  onSuccess: (newTransaction, variables) => {
    // Invalidate and refetch related queries using prefix matching
    cachePatterns.invalidatePrefix(["transactions", "account", variables.accountId]);
    cachePatterns.invalidatePrefix(["transactions", "all", variables.accountId]);
    cachePatterns.invalidatePrefix(transactionKeys.summary(variables.accountId));
    cachePatterns.invalidatePrefix(transactionKeys.lists());
  },
  successMessage: "Transaction created successfully",
  errorMessage: "Failed to create transaction",
});

/**
 * Update transaction
 */
export const updateTransaction = defineMutation<
  { id: number; data: UpdateTransactionData },
  Transaction
>({
  mutationFn: ({ id, data }) => trpc().transactionRoutes.update.mutate({ id, data }),
  onSuccess: (updatedTransaction) => {
    if (updatedTransaction.accountId) {
      // Update the detail query cache
      cachePatterns.setQueryData(
        transactionKeys.detail(updatedTransaction.id!),
        updatedTransaction
      );

      // Invalidate all related queries
      cachePatterns.invalidatePrefix([
        "transactions",
        "account",
        updatedTransaction.accountId
      ]);
      cachePatterns.invalidatePrefix([
        "transactions",
        "all",
        updatedTransaction.accountId
      ]);
      cachePatterns.invalidatePrefix(transactionKeys.summary(updatedTransaction.accountId));
      cachePatterns.invalidatePrefix(transactionKeys.lists());
    }
  },
  successMessage: "Transaction updated successfully",
  errorMessage: "Failed to update transaction",
});

/**
 * Update transaction and get all account transactions with recalculated running balances
 */
export const updateTransactionWithBalance = defineMutation<
  { id: number; data: UpdateTransactionData },
  Transaction[]
>({
  mutationFn: ({ id, data }) => trpc().transactionRoutes.updateWithBalance.mutate({ id, data }),
  onSuccess: (transactionsWithBalance, variables) => {
    if (!Array.isArray(transactionsWithBalance) || !transactionsWithBalance.length) return;

    const accountId = (transactionsWithBalance[0] as any).accountId;

    // Update all queries that might contain these transactions
    // 1. Update getAllAccountTransactionsWithUpcoming queries
    cachePatterns.updateQueriesWithCondition(
      (queryKey) => {
        // Match queries for this specific account
        return JSON.stringify(queryKey).includes(`"account",${accountId}`) &&
               JSON.stringify(queryKey).includes('"with-upcoming"');
      },
      (oldData: any[]) => {
        if (!Array.isArray(oldData)) return oldData;

        // Create a map of updated transactions for quick lookup
        const updatedTransactionsMap = new Map(
          transactionsWithBalance.map(tx => [tx.id, tx])
        );

        // Update existing actual transactions, keep scheduled transactions unchanged
        return oldData.map(item => {
          // Only update actual transactions (numeric IDs), leave scheduled ones (string IDs) as is
          if (typeof item.id === 'number' && updatedTransactionsMap.has(item.id)) {
            return updatedTransactionsMap.get(item.id);
          }
          return item;
        });
      }
    );

    // 2. Update getAllAccountTransactions queries
    cachePatterns.updateQueriesWithCondition(
      (queryKey) => {
        return JSON.stringify(queryKey).includes(`"all",${accountId}`) &&
               !JSON.stringify(queryKey).includes('"with-upcoming"');
      },
      () => transactionsWithBalance
    );

    // 3. Invalidate summary since balance calculations may have changed
    cachePatterns.invalidatePrefix(transactionKeys.summary(accountId));
    cachePatterns.invalidatePrefix(transactionKeys.lists());
  },
  successMessage: "Transaction updated successfully",
  errorMessage: "Failed to update transaction",
});

/**
 * Delete transaction
 */
export const deleteTransaction = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().transactionRoutes.delete.mutate({ id }),
  onSuccess: (_, id) => {
    // Remove from cache
    cachePatterns.removeQuery(transactionKeys.detail(id));

    // Invalidate all list queries
    cachePatterns.invalidatePrefix(["transactions"]);
  },
  successMessage: "Transaction deleted successfully",
  errorMessage: "Failed to delete transaction",
});

/**
 * Bulk delete transactions
 */
export const bulkDeleteTransactions = defineMutation<number[], { count: number }>({
  mutationFn: (ids) => trpc().transactionRoutes.bulkDelete.mutate({ ids }),
  onSuccess: (result, ids) => {
    // Remove individual transaction queries
    ids.forEach((id) => {
      cachePatterns.removeQuery(transactionKeys.detail(id));
    });

    // Invalidate all list queries
    cachePatterns.invalidatePrefix(["transactions"]);
  },
  successMessage: (result) => `${result.count} transactions deleted successfully`,
  errorMessage: "Failed to delete transactions",
});

/**
 * Legacy save transaction mutation for backwards compatibility
 */
export const saveTransaction = defineMutation<
  {
    id?: number;
    accountId?: number;
    amount: number;
    date: string;
    payeeId?: number | null;
    categoryId?: number | null;
    notes?: string | null;
    status?: "cleared" | "pending" | "scheduled" | null;
    budgetId?: number | null;
    budgetAllocation?: number | null;
  },
  Transaction
>({
  mutationFn: (data) => trpc().transactionRoutes.save.mutate(data),
  onSuccess: (transaction) => {
    if (transaction.accountId) {
      cachePatterns.invalidatePrefix(["transactions", "account", transaction.accountId]);
      cachePatterns.invalidatePrefix(["transactions", "all", transaction.accountId]);
      cachePatterns.invalidatePrefix(transactionKeys.summary(transaction.accountId));
    }
    cachePatterns.invalidatePrefix(transactionKeys.lists());
  },
  successMessage: "Transaction saved successfully",
  errorMessage: "Failed to save transaction",
});

/**
 * Optimistic update helpers
 */
export const optimisticHelpers = {
  /**
   * Optimistically add a new transaction to the cache
   */
  createTransaction: (accountId: number, newTransaction: CreateTransactionData) => {
    const previousData = cachePatterns.getQueryData(transactionKeys.byAccount(accountId));
    if (previousData && Array.isArray(previousData)) {
      const optimisticTransaction = {
        ...newTransaction,
        id: -Math.random(), // Temporary negative ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      cachePatterns.setQueryData(
        transactionKeys.byAccount(accountId),
        [...previousData, optimisticTransaction]
      );
    }
    return previousData;
  },

  /**
   * Optimistically update a transaction in the cache
   */
  updateTransaction: (id: number, updateData: UpdateTransactionData) => {
    const previousData = cachePatterns.getQueryData(transactionKeys.detail(id));
    if (previousData) {
      cachePatterns.setQueryData(transactionKeys.detail(id), {
        ...previousData,
        ...updateData,
        updatedAt: new Date().toISOString(),
      });
    }
    return previousData;
  },
};