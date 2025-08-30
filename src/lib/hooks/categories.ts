import { createQuery, createMutation } from "$lib/rpc/queries";
import { orpcClient } from "$lib/rpc/client";
import { getQueryClient } from "@tanstack/svelte-query";
import type { Category } from "$lib/schema";
import type { z } from "zod/v4";
import type { categoryFormSchema, removeCategoryFormSchema } from "$lib/schema/forms";

// Query hooks for categories
export function useCategories() {
  return createQuery({
    queryKey: ['categories'],
    queryFn: () => orpcClient.categories.all(),
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change rarely
    gcTime: 30 * 60 * 1000,
  });
}

export function useCategory(id: number) {
  return createQuery({
    queryKey: ['categories', id],
    queryFn: () => orpcClient.categories.load({ id }),
    enabled: !!id && id > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// Mutation hooks for categories
export function useCreateCategory() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof categoryFormSchema>) => 
      orpcClient.categories.save(input),
    onSuccess: (newCategory: Category) => {
      queryClient.setQueryData(['categories'], (oldData: Category[] = []) => [
        ...oldData,
        newCategory,
      ]);
      
      queryClient.setQueryData(['categories', newCategory.id], newCategory);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof categoryFormSchema>) => 
      orpcClient.categories.save(input),
    onSuccess: (updatedCategory: Category) => {
      queryClient.setQueryData(['categories'], (oldData: Category[] = []) =>
        oldData.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
      );
      
      queryClient.setQueryData(['categories', updatedCategory.id], updatedCategory);
      
      // Invalidate transactions that use this category
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onMutate: async (newCategory) => {
      if (!newCategory.id) return;
      
      await queryClient.cancelQueries({ queryKey: ['categories', newCategory.id] });
      const previousCategory = queryClient.getQueryData(['categories', newCategory.id]);
      queryClient.setQueryData(['categories', newCategory.id], newCategory);
      
      return { previousCategory };
    },
    onError: (err, newCategory, context) => {
      if (context?.previousCategory && newCategory.id) {
        queryClient.setQueryData(['categories', newCategory.id], context.previousCategory);
      }
    },
  });
}

export function useDeleteCategory() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof removeCategoryFormSchema>) => 
      orpcClient.categories.remove(input),
    onSuccess: (_, deletedInput) => {
      queryClient.setQueryData(['categories'], (oldData: Category[] = []) =>
        oldData.filter(cat => cat.id !== deletedInput.id)
      );
      
      queryClient.removeQueries({ queryKey: ['categories', deletedInput.id] });
      
      // Invalidate transactions that might reference this category
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}