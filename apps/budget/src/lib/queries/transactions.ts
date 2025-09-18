import {createQuery, createMutation, useQueryClient} from "@tanstack/svelte-query";
import {trpc} from "$lib/trpc/client";
import type {
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  PaginationParams,
} from "$lib/server/domains/transactions";
import {toast} from "svelte-sonner";

/**
 * Query Keys
 */
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters?: TransactionFilters, pagination?: PaginationParams) =>
    [...transactionKeys.lists(), {filters, pagination}] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
  byAccount: (accountId: number, params?: any) => [...transactionKeys.all, "account", accountId, params] as const,
  summary: (accountId: number) => [...transactionKeys.all, "summary", accountId] as const,
};

/**
 * Query: Get all transactions for an account
 */
export function createAccountTransactionsQuery(
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
) {
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

  return createQuery({
    queryKey: transactionKeys.byAccount(accountId, params),
    queryFn: () => trpc().serverAccountsRoutes.loadTransactions.query(params),
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data?.transactions || [], // Extract transactions from the paginated response
  });
}

/**
 * Query: Get transactions with filters and pagination
 */
export function createTransactionsListQuery(
  filters?: TransactionFilters,
  pagination?: PaginationParams
) {
  return createQuery({
    queryKey: transactionKeys.list(filters, pagination),
    queryFn: () => trpc().transactionRoutes.list.query({filters, pagination}),
    staleTime: 30 * 1000,
  });
}

/**
 * Query: Get single transaction by ID
 */
export function createTransactionDetailQuery(id: number) {
  return createQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => trpc().transactionRoutes.byId.query({id}),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Query: Get account summary
 */
export function createAccountSummaryQuery(accountId: number) {
  return createQuery({
    queryKey: transactionKeys.summary(accountId),
    queryFn: () => trpc().transactionRoutes.summary.query({accountId}),
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation: Create new transaction
 */
export function createTransactionMutation() {
  const client = useQueryClient();

  return createMutation({
    mutationFn: (data: CreateTransactionData) =>
      trpc().transactionRoutes.create.mutate(data),
    onSuccess: (newTransaction, variables) => {
      // Invalidate and refetch related queries
      client.invalidateQueries({
        queryKey: transactionKeys.byAccount(variables.accountId),
      });
      client.invalidateQueries({
        queryKey: transactionKeys.summary(variables.accountId),
      });
      client.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });

      toast.success("Transaction created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create transaction");
    },
  });
}

/**
 * Mutation: Update transaction
 */
export function createUpdateTransactionMutation() {
  const client = useQueryClient();

  return createMutation({
    mutationFn: ({id, data}: {id: number; data: UpdateTransactionData}) =>
      trpc().transactionRoutes.update.mutate({id, data}),
    onMutate: async (variables) => {
      // Find the account query for optimistic updates
      const allQueries = client.getQueryCache().getAll();
      const accountQuery = allQueries.find(query => {
        const key = query.queryKey as any[];
        return key.includes("account");
      });

      if (!accountQuery) return {};

      const currentData = accountQuery.state.data;
      let transactionsArray: any[];

      if (Array.isArray(currentData)) {
        transactionsArray = currentData;
      } else if (currentData && Array.isArray(currentData.transactions)) {
        transactionsArray = currentData.transactions;
      } else {
        return {};
      }

      const queryKey = accountQuery.queryKey;

      // Cancel any outgoing refetches
      await client.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = currentData;

      // Optimistically update the transactions array
      const optimisticTransactions = transactionsArray.map((t: any) =>
        t.id === variables.id ? { ...t, ...variables.data } : t
      );

      // Recalculate running balances if amount changed
      if ('amount' in variables.data) {
        const changedTransaction = transactionsArray.find(t => t.id === variables.id);
        if (changedTransaction) {
          const amountDifference = variables.data.amount - changedTransaction.amount;

          // Find the index of the changed transaction
          const changedIndex = optimisticTransactions.findIndex(t => t.id === variables.id);

          // Update running balances for all transactions from the changed one onwards
          for (let i = changedIndex; i < optimisticTransactions.length; i++) {
            if (optimisticTransactions[i].balance !== null && optimisticTransactions[i].balance !== undefined) {
              optimisticTransactions[i] = {
                ...optimisticTransactions[i],
                balance: optimisticTransactions[i].balance + amountDifference
              };
            }
          }
        }
      }

      // Preserve the cache data structure
      const optimisticData = Array.isArray(currentData)
        ? optimisticTransactions
        : { ...currentData, transactions: optimisticTransactions };

      client.setQueryData(queryKey, optimisticData);

      return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
      // Roll back optimistic update on error
      if (context?.previousData && context?.queryKey) {
        client.setQueryData(context.queryKey, context.previousData);
      }
      toast.error(error.message || "Failed to update transaction");
    },
    onSuccess: (updatedTransaction, variables) => {
      // Update the detail query cache
      client.setQueryData(
        transactionKeys.detail(variables.id),
        updatedTransaction
      );

      // Invalidate all related queries to force refetch with updated data and running balances
      if (updatedTransaction.accountId) {
        client.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as any[];
            return (key.includes("account") && key.includes(updatedTransaction.accountId)) ||
                   (key.includes("summary") && key.includes(updatedTransaction.accountId));
          },
        });
      }

      // Invalidate general list queries
      client.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });

      toast.success("Transaction updated successfully");
    },
  });
}

/**
 * Mutation: Update transaction and get all account transactions with recalculated running balances
 */
export function createUpdateTransactionWithBalanceMutation() {
  const client = useQueryClient();

  return createMutation({
    mutationFn: ({id, data}: {id: number; data: UpdateTransactionData}) =>
      trpc().transactionRoutes.updateWithBalance.mutate({id, data}),
    onSuccess: (transactionsWithBalance, variables) => {
      console.log('🔍 Server response for updateWithBalance:', transactionsWithBalance);

      if (!transactionsWithBalance.length) return;

      // Get the account ID from the first transaction
      const accountId = transactionsWithBalance[0].accountId;

      // Debug: Check balance values in the response
      console.log('💰 First few transactions with balances:',
        transactionsWithBalance.slice(0, 3).map(t => ({
          id: t.id,
          amount: t.amount,
          balance: t.balance
        }))
      );

      // Update all account queries with the fresh data from server
      const allQueries = client.getQueryCache().getAll();

      // Find and update all account transaction queries
      allQueries.forEach(query => {
        const key = query.queryKey as any[];

        // Check if this is an account transactions query
        if (key.includes("account") && key.includes(accountId)) {
          const currentData = query.state.data;

          // Update the cache with the new data structure
          if (Array.isArray(currentData)) {
            // Simple array structure
            client.setQueryData(key, transactionsWithBalance);
          } else if (currentData && typeof currentData === 'object' && 'transactions' in currentData) {
            // Paginated structure with transactions property
            client.setQueryData(key, {
              ...currentData,
              transactions: transactionsWithBalance
            });
          }
        }
      });

      // Update the detail query cache for the specific transaction
      const updatedTransaction = transactionsWithBalance.find(t => t.id === variables.id);
      if (updatedTransaction) {
        client.setQueryData(
          transactionKeys.detail(variables.id),
          updatedTransaction
        );
      }

      // Invalidate account summary to refresh balance totals
      client.invalidateQueries({
        queryKey: transactionKeys.summary(accountId),
      });

      toast.success("Transaction updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update transaction");
    },
  });
}

/**
 * Mutation: Delete transaction
 */
export function createDeleteTransactionMutation() {
  const client = useQueryClient();

  return createMutation({
    mutationFn: (id: number) =>
      trpc().transactionRoutes.delete.mutate({id}),
    onSuccess: (_, id) => {
      // Remove from cache
      client.removeQueries({
        queryKey: transactionKeys.detail(id),
      });

      // Invalidate all list queries
      client.invalidateQueries({
        queryKey: transactionKeys.all,
      });

      toast.success("Transaction deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete transaction");
    },
  });
}

/**
 * Mutation: Bulk delete transactions
 */
export function createBulkDeleteTransactionsMutation() {
  const client = useQueryClient();

  return createMutation({
    mutationFn: (ids: number[]) =>
      trpc().transactionRoutes.bulkDelete.mutate({ids}),
    onSuccess: (result, ids) => {
      // Remove individual transaction queries
      ids.forEach((id) => {
        client.removeQueries({
          queryKey: transactionKeys.detail(id),
        });
      });

      // Invalidate all list queries
      client.invalidateQueries({
        queryKey: transactionKeys.all,
      });

      toast.success(`${result.count} transactions deleted successfully`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete transactions");
    },
  });
}

/**
 * Optimistic update helpers
 */
export function optimisticCreateTransaction(
  client: ReturnType<typeof useQueryClient>,
  accountId: number,
  newTransaction: CreateTransactionData
) {
  // Add the new transaction optimistically to the account transactions list
  const previousData = client.getQueryData(transactionKeys.byAccount(accountId));
  if (previousData && Array.isArray(previousData)) {
    const optimisticTransaction = {
      ...newTransaction,
      id: -Math.random(), // Temporary negative ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    client.setQueryData(
      transactionKeys.byAccount(accountId),
      [...previousData, optimisticTransaction]
    );
  }

  return previousData;
}

export function optimisticUpdateTransaction(
  client: ReturnType<typeof useQueryClient>,
  id: number,
  updateData: UpdateTransactionData
) {
  // Update the transaction in cache optimistically
  const previousData = client.getQueryData(transactionKeys.detail(id));
  if (previousData) {
    client.setQueryData(transactionKeys.detail(id), {
      ...previousData,
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  }

  return previousData;
}

/**
 * Legacy mutation for backwards compatibility
 */
export function createSaveTransactionMutation() {
  const client = useQueryClient();

  return createMutation({
    mutationFn: (data: {
      id?: number;
      accountId?: number;
      amount: number;
      date: string;
      payeeId?: number | null;
      categoryId?: number | null;
      notes?: string | null;
      status?: "cleared" | "pending" | "scheduled" | null;
    }) => trpc().transactionRoutes.save.mutate(data),
    onSuccess: (transaction) => {
      // Invalidate relevant queries
      if (transaction.accountId) {
        client.invalidateQueries({
          queryKey: transactionKeys.byAccount(transaction.accountId),
        });
        client.invalidateQueries({
          queryKey: transactionKeys.summary(transaction.accountId),
        });
      }
      client.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });

      toast.success("Transaction saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save transaction");
    },
  });
}