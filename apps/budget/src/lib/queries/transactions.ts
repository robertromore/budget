import { createQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
import { trpc } from "$lib/trpc/client";
import type {
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  PaginationParams,
} from "$lib/server/domains/transactions";
import { toast } from "svelte-sonner";

/**
 * Query Keys
 */
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters?: TransactionFilters, pagination?: PaginationParams) =>
    [...transactionKeys.lists(), { filters, pagination }] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
  byAccount: (accountId: number, params?: any) =>
    [...transactionKeys.all, "account", accountId, params] as const,
  summary: (accountId: number) => [...transactionKeys.all, "summary", accountId] as const,
};

/**
 * Query: Get ALL transactions for an account (for client-side pagination)
 */
export function createAllAccountTransactionsQuery(
  accountId: number,
  options?: {
    sortBy?: "date" | "amount" | "notes";
    sortOrder?: "asc" | "desc";
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  return createQuery(() => {
    const params = {
      accountId,
      sortBy: options?.sortBy ?? "date",
      sortOrder: options?.sortOrder ?? "desc",
      ...(options?.searchQuery && { searchQuery: options.searchQuery }),
      ...(options?.dateFrom && { dateFrom: options.dateFrom }),
      ...(options?.dateTo && { dateTo: options.dateTo }),
    };

    return {
      queryKey: ["transactions", "all", accountId, params],
      queryFn: () => trpc().serverAccountsRoutes.loadAllTransactions.query(params),
      staleTime: 30 * 1000, // 30 seconds
    };
  });
}

/**
 * Query: Get ALL transactions for an account including upcoming scheduled transactions
 */
export function createAllAccountTransactionsWithUpcomingQuery(
  accountId: number,
  options?: {
    sortBy?: "date" | "amount" | "notes";
    sortOrder?: "asc" | "desc";
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  return createQuery(() => ({
    queryKey: ["transactions", "all-with-upcoming", accountId, options],
    queryFn: () => trpc().transactionRoutes.forAccountWithUpcoming.query({ accountId }),
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => {
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
        filteredData = filteredData.filter((transaction) => transaction.date >= options.dateFrom!);
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
  }));
}

/**
 * Query: Get paginated transactions for an account (legacy - for server-side pagination)
 */
export function createAccountTransactionsQuery(
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
) {
  return createQuery(() => {
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

    return {
      queryKey: transactionKeys.byAccount(accountId, params),
      queryFn: () => trpc().serverAccountsRoutes.loadTransactions.query(params),
      staleTime: 30 * 1000, // 30 seconds
      // Return the whole payload including pagination metadata
    };
  });
}

/**
 * Query: Get transactions with filters and pagination
 */
export function createTransactionsListQuery(
  filters?: TransactionFilters,
  pagination?: PaginationParams
) {
  return createQuery(() => ({
    queryKey: transactionKeys.list(filters, pagination),
    queryFn: () => trpc().transactionRoutes.list.query({ filters, pagination }),
    staleTime: 30 * 1000,
  }));
}

/**
 * Query: Get single transaction by ID
 */
export function createTransactionDetailQuery(id: number) {
  return createQuery(() => ({
    queryKey: transactionKeys.detail(id),
    queryFn: () => trpc().transactionRoutes.byId.query({ id }),
    staleTime: 60 * 1000, // 1 minute
  }));
}

/**
 * Query: Get account summary
 */
export function createAccountSummaryQuery(accountId: number) {
  return createQuery(() => ({
    queryKey: transactionKeys.summary(accountId),
    queryFn: () => trpc().transactionRoutes.summary.query({ accountId }),
    staleTime: 30 * 1000,
  }));
}

/**
 * Mutation: Create new transaction
 */
export function createTransactionMutation() {
  return createMutation(() => {
    const client = useQueryClient();

    return {
      mutationFn: (data: CreateTransactionData) => trpc().transactionRoutes.create.mutate(data),
      onSuccess: (newTransaction, variables) => {
        // Invalidate and refetch related queries using predicate matching
        client.invalidateQueries({
          predicate: (query) => {
            const key = JSON.stringify(query.queryKey);
            return (
              (key.includes('"account"') && key.includes(`${variables.accountId}`)) ||
              (key.includes('"all"') && key.includes(`${variables.accountId}`)) ||
              (key.includes('"summary"') && key.includes(`${variables.accountId}`)) ||
              key.includes('"list"')
            );
          },
        });

        toast.success("Transaction created successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create transaction");
      },
    };
  });
}

/**
 * Mutation: Update transaction
 */
export function createUpdateTransactionMutation() {
  return createMutation(() => {
    const client = useQueryClient();

    return {
      mutationFn: ({
        id,
        data,
        accountId,
      }: {
        id: number;
        data: UpdateTransactionData;
        accountId: number;
      }) => trpc().transactionRoutes.update.mutate({ id, data }),
      onMutate: async (variables) => {
        const { accountId } = variables;

        // Find the specific query for this account ID
        let targetQuery: any = null;
        let transactionsArray: any[] = [];

        const allQueries = client.getQueryCache().getAll();

        // Look for queries specifically for this account ID
        for (const query of allQueries) {
          const key = query.queryKey as any[];
          if (!key.includes("transactions") || !key.includes(accountId)) continue;

          const currentData = query.state.data;
          let queryTransactions: any[] = [];

          if (Array.isArray(currentData)) {
            queryTransactions = currentData;
          } else if (
            currentData &&
            typeof currentData === "object" &&
            "transactions" in currentData &&
            Array.isArray((currentData as any).transactions)
          ) {
            queryTransactions = (currentData as any).transactions;
          }

          const targetTransaction = queryTransactions.find((t: any) => t.id === variables.id);
          if (targetTransaction) {
            targetQuery = query;
            transactionsArray = queryTransactions;
            break;
          }
        }

        if (!targetQuery) return {};

        const queryKey = targetQuery.queryKey;
        const currentData = targetQuery.state.data;

        // Cancel any outgoing refetches
        await client.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousData = currentData;

        // Optimistically update the transactions array
        const optimisticTransactions = transactionsArray.map((t: any) =>
          t.id === variables.id ? { ...t, ...variables.data } : t
        );

        // Recalculate running balances if amount changed
        if ("amount" in variables.data && typeof variables.data.amount === "number") {
          const changedTransaction = transactionsArray.find((t) => t.id === variables.id);
          if (changedTransaction) {
            const amountDifference = variables.data.amount - changedTransaction.amount;

            // Find the index of the changed transaction
            const changedIndex = optimisticTransactions.findIndex((t) => t.id === variables.id);

            // Update running balances for all transactions from the changed one onwards
            for (let i = changedIndex; i < optimisticTransactions.length; i++) {
              if (
                optimisticTransactions[i].balance !== null &&
                optimisticTransactions[i].balance !== undefined
              ) {
                optimisticTransactions[i] = {
                  ...optimisticTransactions[i],
                  balance: optimisticTransactions[i].balance + amountDifference,
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
        client.setQueryData(transactionKeys.detail(variables.id), updatedTransaction);

        // Invalidate all related queries to force refetch with updated data and running balances
        // Use the accountId from variables instead of the returned transaction for precision
        client.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as any[];
            return (
              (key.includes("account") && key.includes(variables.accountId)) ||
              (key.includes("summary") && key.includes(variables.accountId))
            );
          },
        });

        // Invalidate general list queries
        client.invalidateQueries({
          queryKey: transactionKeys.lists(),
        });

        toast.success("Transaction updated successfully");
      },
    };
  });
}

/**
 * Mutation: Update transaction and get all account transactions with recalculated running balances
 */
export function createUpdateTransactionWithBalanceMutation() {
  return createMutation(() => {
    const client = useQueryClient();

    return {
      mutationFn: ({ id, data }: { id: number; data: UpdateTransactionData }) =>
        trpc().transactionRoutes.updateWithBalance.mutate({ id, data }),
      onSuccess: (transactionsWithBalance) => {
        if (!Array.isArray(transactionsWithBalance) || !transactionsWithBalance.length) return;

        const accountId = (transactionsWithBalance[0] as any).accountId;

        // Invalidate account transaction queries using predicate matching
        client.invalidateQueries({
          predicate: (query) => {
            const key = JSON.stringify(query.queryKey);
            return (
              (key.includes('"account"') && key.includes(`${accountId}`)) ||
              (key.includes('"all"') && key.includes(`${accountId}`)) ||
              (key.includes('"summary"') && key.includes(`${accountId}`)) ||
              key.includes('"list"')
            );
          },
        });

        toast.success("Transaction updated successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update transaction");
      },
    };
  });
}

/**
 * Mutation: Delete transaction
 */
export function createDeleteTransactionMutation() {
  return createMutation(() => {
    const client = useQueryClient();

    return {
      mutationFn: (id: number) => trpc().transactionRoutes.delete.mutate({ id }),
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
    };
  });
}

/**
 * Mutation: Bulk delete transactions
 */
export function createBulkDeleteTransactionsMutation() {
  return createMutation(() => {
    const client = useQueryClient();

    return {
      mutationFn: (ids: number[]) => trpc().transactionRoutes.bulkDelete.mutate({ ids }),
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
    };
  });
}

/**
 * Legacy mutation for backwards compatibility
 */
export function createSaveTransactionMutation() {
  return createMutation(() => {
    const client = useQueryClient();

    return {
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
        // Invalidate relevant queries using predicate matching
        if (transaction.accountId) {
          client.invalidateQueries({
            predicate: (query) => {
              const key = JSON.stringify(query.queryKey);
              return (
                (key.includes('"account"') && key.includes(`${transaction.accountId}`)) ||
                (key.includes('"all"') && key.includes(`${transaction.accountId}`)) ||
                (key.includes('"summary"') && key.includes(`${transaction.accountId}`)) ||
                key.includes('"list"')
              );
            },
          });
        }

        toast.success("Transaction saved successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save transaction");
      },
    };
  });
}
