import { createQuery, createMutation } from "$lib/rpc/queries";
import { orpcClient } from "$lib/rpc/client";
import { getQueryClient } from "@tanstack/svelte-query";
import type { Account } from "$lib/schema";
import type { z } from "zod/v4";
import type { accountFormSchema, removeAccountFormSchema } from "$lib/schema/forms";

// Query hooks for accounts
export function useAccounts() {
  return createQuery({
    queryKey: ['accounts'],
    queryFn: () => orpcClient.accounts.all(),
    staleTime: 5 * 60 * 1000, // 5 minutes - accounts don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
}

export function useAccount(id: number) {
  return createQuery({
    queryKey: ['accounts', id],
    queryFn: () => orpcClient.accounts.load({ id }),
    enabled: !!id && id > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks for accounts
export function useCreateAccount() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof accountFormSchema>) => 
      orpcClient.accounts.save(input),
    onSuccess: (newAccount: Account) => {
      // Update the accounts list cache
      queryClient.setQueryData(['accounts'], (oldData: Account[] = []) => [
        ...oldData,
        newAccount,
      ]);
      
      // Set individual account cache
      queryClient.setQueryData(['accounts', newAccount.id], newAccount);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Failed to create account:', error);
      // Could integrate with toast notifications here
    },
  });
}

export function useUpdateAccount() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof accountFormSchema>) => 
      orpcClient.accounts.save(input),
    onSuccess: (updatedAccount: Account) => {
      // Update the accounts list cache
      queryClient.setQueryData(['accounts'], (oldData: Account[] = []) =>
        oldData.map(account => 
          account.id === updatedAccount.id ? updatedAccount : account
        )
      );
      
      // Update individual account cache
      queryClient.setQueryData(['accounts', updatedAccount.id], updatedAccount);
      
      // Invalidate related queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    // Optimistic update for better UX
    onMutate: async (newAccount) => {
      if (!newAccount.id) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['accounts', newAccount.id] });
      
      // Snapshot the previous value
      const previousAccount = queryClient.getQueryData(['accounts', newAccount.id]);
      
      // Optimistically update
      queryClient.setQueryData(['accounts', newAccount.id], newAccount);
      
      // Return context with the previous data
      return { previousAccount };
    },
    onError: (err, newAccount, context) => {
      // Revert optimistic update on error
      if (context?.previousAccount && newAccount.id) {
        queryClient.setQueryData(['accounts', newAccount.id], context.previousAccount);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to sync with server
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['accounts', variables.id] });
      }
    },
  });
}

export function useDeleteAccount() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof removeAccountFormSchema>) => 
      orpcClient.accounts.remove(input),
    onSuccess: (_, deletedInput) => {
      // Remove from accounts list cache
      queryClient.setQueryData(['accounts'], (oldData: Account[] = []) =>
        oldData.filter(account => account.id !== deletedInput.id)
      );
      
      // Remove individual account cache
      queryClient.removeQueries({ queryKey: ['accounts', deletedInput.id] });
      
      // Invalidate all transactions since account deletion affects them
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Failed to delete account:', error);
    },
  });
}

// Helper functions for cache management
export const accountsQueryHelpers = {
  // Prefetch accounts for better UX
  prefetchAccounts: () => {
    const queryClient = getQueryClient();
    return queryClient.prefetchQuery({
      queryKey: ['accounts'],
      queryFn: () => orpcClient.accounts.all(),
      staleTime: 5 * 60 * 1000,
    });
  },
  
  // Invalidate all account-related queries
  invalidateAll: () => {
    const queryClient = getQueryClient();
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  },
  
  // Get cached accounts without triggering a request
  getCachedAccounts: (): Account[] | undefined => {
    const queryClient = getQueryClient();
    return queryClient.getQueryData(['accounts']);
  },
};