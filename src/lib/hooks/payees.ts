import { createQuery, createMutation } from "$lib/rpc/queries";
import { orpcClient } from "$lib/rpc/client";
import { getQueryClient } from "@tanstack/svelte-query";
import type { Payee } from "$lib/schema";
import type { z } from "zod/v4";
import type { payeeFormSchema, removePayeeFormSchema } from "$lib/schema/forms";

// Query hooks for payees
export function usePayees() {
  return createQuery({
    queryKey: ['payees'],
    queryFn: () => orpcClient.payees.all(),
    staleTime: 10 * 60 * 1000, // 10 minutes - payees change infrequently
    gcTime: 30 * 60 * 1000,
  });
}

export function usePayee(id: number) {
  return createQuery({
    queryKey: ['payees', id],
    queryFn: () => orpcClient.payees.load({ id }),
    enabled: !!id && id > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// Mutation hooks for payees
export function useCreatePayee() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof payeeFormSchema>) => 
      orpcClient.payees.save(input),
    onSuccess: (newPayee: Payee) => {
      queryClient.setQueryData(['payees'], (oldData: Payee[] = []) => [
        ...oldData,
        newPayee,
      ]);
      
      queryClient.setQueryData(['payees', newPayee.id], newPayee);
    },
  });
}

export function useUpdatePayee() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof payeeFormSchema>) => 
      orpcClient.payees.save(input),
    onSuccess: (updatedPayee: Payee) => {
      queryClient.setQueryData(['payees'], (oldData: Payee[] = []) =>
        oldData.map(payee => payee.id === updatedPayee.id ? updatedPayee : payee)
      );
      
      queryClient.setQueryData(['payees', updatedPayee.id], updatedPayee);
      
      // Invalidate transactions that use this payee
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeletePayee() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof removePayeeFormSchema>) => 
      orpcClient.payees.remove(input),
    onSuccess: (_, deletedInput) => {
      queryClient.setQueryData(['payees'], (oldData: Payee[] = []) =>
        oldData.filter(payee => payee.id !== deletedInput.id)
      );
      
      queryClient.removeQueries({ queryKey: ['payees', deletedInput.id] });
      
      // Invalidate transactions that might reference this payee
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}