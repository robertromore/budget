import { createQuery, createMutation } from "$lib/rpc/queries";
import { orpcClient } from "$lib/rpc/client";
import { getQueryClient } from "@tanstack/svelte-query";
import type { Transaction } from "$lib/schema";
import type { z } from "zod/v4";
import type { transactionFormSchema, removeTransactionsFormSchema } from "$lib/schema/forms";

// Query hooks for transactions
export function useTransactionsByAccount(accountId: number) {
  return createQuery({
    queryKey: ['transactions', 'byAccount', accountId],
    queryFn: () => orpcClient.transactions.byAccount({ accountId }),
    enabled: !!accountId && accountId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - transactions change more frequently
    gcTime: 5 * 60 * 1000,
  });
}

export function useAllTransactions() {
  return createQuery({
    queryKey: ['transactions'],
    queryFn: () => orpcClient.transactions.all(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTransaction(id: number) {
  return createQuery({
    queryKey: ['transactions', id],
    queryFn: () => orpcClient.transactions.load({ id }),
    enabled: !!id && id > 0,
    staleTime: 2 * 60 * 1000,
  });
}

// Mutation hooks for transactions
export function useCreateTransaction() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof transactionFormSchema>) => 
      orpcClient.transactions.save(input),
    onSuccess: (newTransaction: Transaction) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ 
        queryKey: ['transactions', 'byAccount', newTransaction.accountId] 
      });
      
      // Update account cache to reflect balance change
      queryClient.invalidateQueries({ 
        queryKey: ['accounts', newTransaction.accountId] 
      });
      
      // If it's part of the main transactions list, add it optimistically
      queryClient.setQueryData(
        ['transactions', 'byAccount', newTransaction.accountId],
        (oldData: Transaction[] = []) => [newTransaction, ...oldData]
      );
    },
    onError: (error) => {
      console.error('Failed to create transaction:', error);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof transactionFormSchema>) => 
      orpcClient.transactions.save(input),
    onSuccess: (updatedTransaction: Transaction) => {
      // Update individual transaction cache
      queryClient.setQueryData(['transactions', updatedTransaction.id], updatedTransaction);
      
      // Update transactions list cache
      queryClient.setQueryData(
        ['transactions', 'byAccount', updatedTransaction.accountId],
        (oldData: Transaction[] = []) =>
          oldData.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
      );
      
      // Update account cache as transaction changes affect balance
      queryClient.invalidateQueries({ 
        queryKey: ['accounts', updatedTransaction.accountId] 
      });
    },
    // Optimistic update for better UX
    onMutate: async (newTransaction) => {
      if (!newTransaction.id) return;
      
      await queryClient.cancelQueries({ queryKey: ['transactions', newTransaction.id] });
      
      const previousTransaction = queryClient.getQueryData(['transactions', newTransaction.id]);
      
      queryClient.setQueryData(['transactions', newTransaction.id], newTransaction);
      
      return { previousTransaction };
    },
    onError: (err, newTransaction, context) => {
      if (context?.previousTransaction && newTransaction.id) {
        queryClient.setQueryData(['transactions', newTransaction.id], context.previousTransaction);
      }
    },
    onSettled: (data, error, variables) => {
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['transactions', variables.id] });
      }
    },
  });
}

export function useDeleteTransactions() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof removeTransactionsFormSchema>) => 
      orpcClient.transactions.removeMany(input),
    onSuccess: (_, deletedInput) => {
      // Remove from account-specific transactions cache
      queryClient.setQueryData(
        ['transactions', 'byAccount', deletedInput.accountId],
        (oldData: Transaction[] = []) =>
          oldData.filter(t => !deletedInput.entities.includes(t.id))
      );
      
      // Remove individual transaction caches
      deletedInput.entities.forEach(id => {
        queryClient.removeQueries({ queryKey: ['transactions', id] });
      });
      
      // Update account balance
      queryClient.invalidateQueries({ 
        queryKey: ['accounts', deletedInput.accountId] 
      });
      
      // Invalidate main transactions list
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Failed to delete transactions:', error);
    },
  });
}

// Helper functions for transaction cache management
export const transactionsQueryHelpers = {
  // Prefetch transactions for an account
  prefetchAccountTransactions: (accountId: number) => {
    const queryClient = getQueryClient();
    return queryClient.prefetchQuery({
      queryKey: ['transactions', 'byAccount', accountId],
      queryFn: () => orpcClient.transactions.byAccount({ accountId }),
      staleTime: 2 * 60 * 1000,
    });
  },
  
  // Invalidate all transaction queries for an account
  invalidateAccountTransactions: (accountId: number) => {
    const queryClient = getQueryClient();
    queryClient.invalidateQueries({ 
      queryKey: ['transactions', 'byAccount', accountId] 
    });
  },
  
  // Get cached transactions for an account
  getCachedAccountTransactions: (accountId: number): Transaction[] | undefined => {
    const queryClient = getQueryClient();
    return queryClient.getQueryData(['transactions', 'byAccount', accountId]);
  },
  
  // Optimistically add transaction (for real-time updates)
  addOptimisticTransaction: (transaction: Transaction) => {
    const queryClient = getQueryClient();
    queryClient.setQueryData(
      ['transactions', 'byAccount', transaction.accountId],
      (oldData: Transaction[] = []) => [transaction, ...oldData]
    );
  },
};