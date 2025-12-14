import type { Transaction } from "$lib/schema";
import type {
  CreateTransactionData,
  PaginationParams,
  TransactionFilters,
  UpdateTransactionData,
} from "$lib/server/domains/transactions";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

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
  summary: (accountId: number) => ["transactions", "summary", accountId] as const,
});

/**
 * Get ALL transactions for an account (for client-side pagination)
 */
export const getAllAccountTransactions = (
  accountId: number,
  options?: {
    sortBy?: "date" | "amount" | "notes";
    sortOrder?: "asc" | "desc";
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const params = {
    accountId,
    sortBy: options?.sortBy ?? "date",
    sortOrder: options?.sortOrder ?? "desc",
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
    sortBy?: "date" | "amount" | "notes";
    sortOrder?: "asc" | "desc";
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  return defineQuery({
    queryKey: [...transactionKeys.allByAccount(accountId, options), "with-upcoming"],
    queryFn: () => trpc().transactionRoutes.forAccountWithUpcoming.query({ accountId }),
    options: {
      staleTime: 30 * 1000, // 30 seconds
      select: (data: any[]) => {
        // Client-side filtering and sorting since we get everything from the server
        let filteredData = [...data];

        // Apply search filter
        if (options?.searchQuery) {
          const query = options.searchQuery.toLowerCase();
          filteredData = filteredData.filter(
            (transaction) =>
              transaction.notes?.toLowerCase().includes(query) ||
              (transaction as any).scheduleName?.toLowerCase().includes(query)
          );
        }

        // Apply date filters
        if (options?.dateFrom) {
          filteredData = filteredData.filter(
            (transaction) => transaction.date >= options.dateFrom!
          );
        }
        if (options?.dateTo) {
          filteredData = filteredData.filter((transaction) => transaction.date <= options.dateTo!);
        }

        // Apply sorting
        const sortBy = options?.sortBy ?? "date";
        const sortOrder = options?.sortOrder ?? "desc";

        filteredData.sort((a, b) => {
          let aValue: any, bValue: any;

          switch (sortBy) {
            case "amount":
              aValue = a.amount;
              bValue = b.amount;
              break;
            case "notes":
              aValue = a.notes || "";
              bValue = b.notes || "";
              break;
            case "date":
            default:
              aValue = a.date;
              bValue = b.date;
              break;
          }

          if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
          if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
          return 0;
        });

        return filteredData;
      },
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
    sortBy?: "date" | "amount" | "notes";
    sortOrder?: "asc" | "desc";
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const params = {
    accountId,
    page: options?.page ?? 0,
    pageSize: options?.pageSize ?? 50,
    sortBy: options?.sortBy ?? "date",
    sortOrder: options?.sortOrder ?? "desc",
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
      enabled: accountId > 0 && !Number.isNaN(accountId),
    },
  });
};

/**
 * Create new transaction
 */
export const createTransaction = defineMutation({
  mutationFn: (data: CreateTransactionData) => trpc().transactionRoutes.create.mutate(data),
  onSuccess: (_newTransaction, variables) => {
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
export const updateTransaction = defineMutation({
  mutationFn: ({ id, data }: { id: number; data: UpdateTransactionData }) =>
    trpc().transactionRoutes.update.mutate({ id, data }),
  onSuccess: (updatedTransaction) => {
    if (updatedTransaction.accountId) {
      // Update the detail query cache
      cachePatterns.setQueryData(
        transactionKeys.detail(updatedTransaction.id!),
        updatedTransaction
      );

      // Invalidate all related queries
      cachePatterns.invalidatePrefix(["transactions", "account", updatedTransaction.accountId]);
      cachePatterns.invalidatePrefix(["transactions", "all", updatedTransaction.accountId]);
      cachePatterns.invalidatePrefix(transactionKeys.summary(updatedTransaction.accountId));
      cachePatterns.invalidatePrefix(transactionKeys.lists());
      // Invalidate accounts list to update balances in sidebar
      cachePatterns.invalidatePrefix(["accounts", "list"]);
    }
  },
  successMessage: "Transaction updated successfully",
  errorMessage: "Failed to update transaction",
});

/**
 * Update transaction and get all account transactions with recalculated running balances
 */
export const updateTransactionWithBalance = defineMutation({
  mutationFn: ({ id, data }: { id: number; data: UpdateTransactionData }) =>
    trpc().transactionRoutes.updateWithBalance.mutate({ id, data }),
  onSuccess: (transactionsWithBalance, _variables) => {
    if (!Array.isArray(transactionsWithBalance) || !transactionsWithBalance.length) return;

    const accountId = (transactionsWithBalance[0] as any).accountId;

    // Update all queries that might contain these transactions
    // 1. Update getAllAccountTransactionsWithUpcoming queries
    cachePatterns.updateQueriesWithCondition(
      (queryKey) => {
        // Match queries for this specific account
        return (
          JSON.stringify(queryKey).includes(`"account",${accountId}`) &&
          JSON.stringify(queryKey).includes('"with-upcoming"')
        );
      },
      (oldData: any[]) => {
        if (!Array.isArray(oldData)) return oldData;

        // Create a map of updated transactions for quick lookup
        const updatedTransactionsMap = new Map(transactionsWithBalance.map((tx) => [tx.id, tx]));

        // Update existing actual transactions, keep scheduled transactions unchanged
        return oldData.map((item) => {
          // Only update actual transactions (numeric IDs), leave scheduled ones (string IDs) as is
          if (typeof item.id === "number" && updatedTransactionsMap.has(item.id)) {
            return updatedTransactionsMap.get(item.id);
          }
          return item;
        });
      }
    );

    // 2. Update getAllAccountTransactions queries
    cachePatterns.updateQueriesWithCondition(
      (queryKey) => {
        return (
          JSON.stringify(queryKey).includes(`"all",${accountId}`) &&
          !JSON.stringify(queryKey).includes('"with-upcoming"')
        );
      },
      () => transactionsWithBalance
    );

    // 3. Invalidate summary since balance calculations may have changed
    cachePatterns.invalidatePrefix(transactionKeys.summary(accountId));
    cachePatterns.invalidatePrefix(transactionKeys.lists());
    // Invalidate accounts list to update balances in sidebar
    cachePatterns.invalidatePrefix(["accounts", "list"]);
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
    // Invalidate accounts list to update balances in sidebar
    cachePatterns.invalidatePrefix(["accounts", "list"]);
  },
  successMessage: "Transaction deleted successfully",
  errorMessage: "Failed to delete transaction",
});

/**
 * Bulk delete transactions
 */
export const bulkDeleteTransactions = defineMutation<number[], { count: number }>({
  mutationFn: (ids) => trpc().transactionRoutes.bulkDelete.mutate({ ids }),
  onSuccess: (_result, ids) => {
    // Remove individual transaction queries
    ids.forEach((id) => {
      cachePatterns.removeQuery(transactionKeys.detail(id));
    });

    // Invalidate all list queries
    cachePatterns.invalidatePrefix(["transactions"]);
    // Invalidate accounts list to update balances in sidebar
    cachePatterns.invalidatePrefix(["accounts", "list"]);
  },
  successMessage: (result) => `${result.count} transactions deleted successfully`,
  errorMessage: "Failed to delete transactions",
});

/**
 * Legacy save transaction mutation for backwards compatibility
 */
export const saveTransaction = defineMutation({
  mutationFn: (data: {
    id?: number;
    accountId?: number;
    amount: number;
    date: string;
    payeeId?: number | null;
    categoryId?: number | null;
    notes?: string | null;
    status?: "cleared" | "pending" | "scheduled";
    budgetId?: number | null;
    budgetAllocation?: number | null;
  }) => trpc().transactionRoutes.save.mutate(data),
  onSuccess: (transaction) => {
    if (transaction.accountId) {
      cachePatterns.invalidatePrefix(["transactions", "account", transaction.accountId]);
      cachePatterns.invalidatePrefix(["transactions", "all", transaction.accountId]);
      cachePatterns.invalidatePrefix(transactionKeys.summary(transaction.accountId));
    }
    cachePatterns.invalidatePrefix(transactionKeys.lists());
    // Invalidate accounts list to update balances in sidebar
    cachePatterns.invalidatePrefix(["accounts", "list"]);
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
      cachePatterns.setQueryData(transactionKeys.byAccount(accountId), [
        ...previousData,
        optimisticTransaction,
      ]);
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

/**
 * Create a transfer transaction between two accounts
 */
export const createTransfer = defineMutation({
  mutationFn: async (params: {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    date: string;
    notes?: string;
    categoryId?: number | null;
    payeeId?: number | null;
  }) => {
    const result = await trpc().transactionRoutes.createTransfer.mutate(params);
    return result;
  },
  onSuccess: (_data, variables) => {
    cachePatterns.invalidateQueries(transactionKeys.byAccount(variables.fromAccountId));
    cachePatterns.invalidateQueries(transactionKeys.byAccount(variables.toAccountId));
    cachePatterns.invalidateQueries(transactionKeys.allByAccount(variables.fromAccountId));
    cachePatterns.invalidateQueries(transactionKeys.allByAccount(variables.toAccountId));
    cachePatterns.invalidateQueries(transactionKeys.summary(variables.fromAccountId));
    cachePatterns.invalidateQueries(transactionKeys.summary(variables.toAccountId));
  },
});

/**
 * Update a transfer transaction
 */
export const updateTransfer = defineMutation({
  mutationFn: async (params: {
    transferId: string;
    amount?: number;
    date?: string;
    notes?: string;
    categoryId?: number | null;
    payeeId?: number | null;
  }) => {
    const result = await trpc().transactionRoutes.updateTransfer.mutate(params);
    return result;
  },
  onSuccess: (data) => {
    if (data.fromTransaction && data.toTransaction) {
      cachePatterns.invalidateQueries(transactionKeys.byAccount(data.fromTransaction.accountId));
      cachePatterns.invalidateQueries(transactionKeys.byAccount(data.toTransaction.accountId));
      cachePatterns.invalidateQueries(transactionKeys.allByAccount(data.fromTransaction.accountId));
      cachePatterns.invalidateQueries(transactionKeys.allByAccount(data.toTransaction.accountId));
      cachePatterns.invalidateQueries(transactionKeys.summary(data.fromTransaction.accountId));
      cachePatterns.invalidateQueries(transactionKeys.summary(data.toTransaction.accountId));
    }
  },
});

/**
 * Delete a transfer transaction
 */
export const deleteTransfer = defineMutation({
  mutationFn: async (params: { transferId: string }) => {
    await trpc().transactionRoutes.deleteTransfer.mutate(params);
  },
  onSuccess: () => {
    cachePatterns.invalidateQueries(transactionKeys.lists());
  },
});

/**
 * Bulk update payee for all transactions with matching payee name
 */
export const bulkUpdatePayee = defineMutation<
  {
    accountId: number;
    transactionId: number;
    newPayeeId: number | null;
    originalPayeeName: string;
  },
  { count: number }
>({
  mutationFn: (params) => trpc().transactionRoutes.bulkUpdatePayee.mutate(params),
  onSuccess: (_result, variables) => {
    // Invalidate all queries for this account
    cachePatterns.invalidatePrefix(["transactions", "account", variables.accountId]);
    cachePatterns.invalidatePrefix(["transactions", "all", variables.accountId]);
    cachePatterns.invalidatePrefix(transactionKeys.summary(variables.accountId));
    cachePatterns.invalidatePrefix(transactionKeys.lists());
    // Invalidate accounts list to update balances in sidebar
    cachePatterns.invalidatePrefix(["accounts", "list"]);
  },
  successMessage: (result) =>
    result.count > 0
      ? `Updated payee for ${result.count + 1} transaction${result.count + 1 > 1 ? "s" : ""}`
      : "Updated payee for 1 transaction",
  errorMessage: "Failed to update payee",
});

/**
 * Bulk update category for transactions matching criteria
 */
export const bulkUpdateCategory = defineMutation<
  {
    accountId: number;
    transactionId: number;
    newCategoryId: number | null;
    matchBy: "payee" | "category";
    matchValue?: string | number;
  },
  { count: number }
>({
  mutationFn: (params) => trpc().transactionRoutes.bulkUpdateCategory.mutate(params),
  onSuccess: (_result, variables) => {
    // Invalidate all queries for this account
    cachePatterns.invalidatePrefix(["transactions", "account", variables.accountId]);
    cachePatterns.invalidatePrefix(["transactions", "all", variables.accountId]);
    cachePatterns.invalidatePrefix(transactionKeys.summary(variables.accountId));
    cachePatterns.invalidatePrefix(transactionKeys.lists());
    // Invalidate accounts list to update balances in sidebar
    cachePatterns.invalidatePrefix(["accounts", "list"]);
  },
  successMessage: (result) =>
    result.count > 0
      ? `Updated category for ${result.count + 1} transaction${result.count + 1 > 1 ? "s" : ""}`
      : "Updated category for 1 transaction",
  errorMessage: "Failed to update category",
});

/**
 * Get top payees by transaction count and amount for an account
 */
export const getTopPayees = (
  accountId: number,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
) =>
  defineQuery({
    queryKey: ["transactions", "topPayees", accountId, options] as const,
    queryFn: () =>
      trpc().transactionRoutes.getTopPayees.query({
        accountId,
        ...options,
      }),
  });

/**
 * Get top categories by transaction count and amount for an account
 */
export const getTopCategories = (
  accountId: number,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
) =>
  defineQuery({
    queryKey: ["transactions", "topCategories", accountId, options] as const,
    queryFn: () =>
      trpc().transactionRoutes.getTopCategories.query({
        accountId,
        ...options,
      }),
  });

/**
 * Get recent activity summary for an account
 */
export const getRecentActivity = (accountId: number, days?: number) =>
  defineQuery({
    queryKey: ["transactions", "recentActivity", accountId, days] as const,
    queryFn: () =>
      trpc().transactionRoutes.getRecentActivity.query({
        accountId,
        days,
      }),
  });
