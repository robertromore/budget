import type {
  AliasMatch,
  PayeeAlias,
  PayeeAliasStats,
  PayeeAliasWithPayee,
} from "$lib/schema/payee-aliases";
import { trpc } from "$lib/trpc/client";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys
export const payeeAliasKeys = createQueryKeys("payeeAliases", {
  all: () => ["payeeAliases", "all"] as const,
  lists: () => ["payeeAliases", "list"] as const,
  list: () => ["payeeAliases", "list"] as const,
  details: () => ["payeeAliases", "detail"] as const,
  detail: (id: number) => ["payeeAliases", "detail", id] as const,
  forPayee: (payeeId: number) => ["payeeAliases", "forPayee", payeeId] as const,
  findPayee: (rawString: string) => ["payeeAliases", "findPayee", rawString] as const,
  stats: () => ["payeeAliases", "stats"] as const,
});

// List all aliases with payee details
export const listPayeeAliases = () =>
  defineQuery<PayeeAliasWithPayee[]>({
    queryKey: payeeAliasKeys.list(),
    queryFn: async () => {
      const result = await trpc().payeeAliasRoutes.all.query();
      return result;
    },
    options: {
      ...queryPresets.static,
    },
  });

// Get a single alias by ID
export const getPayeeAlias = (id: number) =>
  defineQuery<PayeeAlias | null>({
    queryKey: payeeAliasKeys.detail(id),
    queryFn: async () => {
      const result = await trpc().payeeAliasRoutes.get.query({ id });
      return result;
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

// Get aliases for a specific payee
export const getAliasesForPayee = (payeeId: number) =>
  defineQuery<PayeeAlias[]>({
    queryKey: payeeAliasKeys.forPayee(payeeId),
    queryFn: async () => {
      const result = await trpc().payeeAliasRoutes.forPayee.query({ payeeId });
      return result;
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

// Find which payee a raw string maps to
export const findPayeeByAlias = (rawString: string) =>
  defineQuery<AliasMatch | null>({
    queryKey: payeeAliasKeys.findPayee(rawString),
    queryFn: async () => {
      const result = await trpc().payeeAliasRoutes.findPayee.query({ rawString });
      return result;
    },
    options: {
      enabled: rawString.length > 0,
      staleTime: 30 * 1000, // 30 seconds
    },
  });

// Get alias statistics
export const getPayeeAliasStats = () =>
  defineQuery<PayeeAliasStats>({
    queryKey: payeeAliasKeys.stats(),
    queryFn: async () => {
      const result = await trpc().payeeAliasRoutes.stats.query();
      return result;
    },
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

// Create a manual alias
export const createPayeeAlias = defineMutation<
  { rawString: string; payeeId: number },
  PayeeAlias
>({
  mutationFn: (data) => trpc().payeeAliasRoutes.create.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.forPayee(variables.payeeId) }),
    ]);
  },
  successMessage: "Alias created",
  errorMessage: "Failed to create alias",
});

// Record alias from import confirmation
export const recordAliasFromImport = defineMutation<
  { rawString: string; payeeId: number; accountId?: number },
  PayeeAlias
>({
  mutationFn: (data) => trpc().payeeAliasRoutes.recordFromImport.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.forPayee(variables.payeeId) }),
    ]);
  },
});

// Record alias from transaction edit
export const recordAliasFromTransactionEdit = defineMutation<
  { rawString: string; payeeId: number },
  PayeeAlias
>({
  mutationFn: (data) => trpc().payeeAliasRoutes.recordFromTransactionEdit.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.forPayee(variables.payeeId) }),
    ]);
  },
});

// Bulk create aliases (typically at end of import)
export const bulkCreatePayeeAliases = defineMutation<
  {
    aliases: Array<{
      rawString: string;
      payeeId: number;
      sourceAccountId?: number;
    }>;
  },
  { created: number; updated: number }
>({
  mutationFn: (data) => trpc().payeeAliasRoutes.bulkCreate.mutate(data),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
    ]);
  },
  successMessage: "Aliases recorded",
  errorMessage: "Failed to record aliases",
});

// Update an alias
export const updatePayeeAlias = defineMutation<
  { id: number; rawString?: string; payeeId?: number },
  PayeeAlias
>({
  mutationFn: (data) => trpc().payeeAliasRoutes.update.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.detail(variables.id) }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
    ]);
  },
  successMessage: "Alias updated",
  errorMessage: "Failed to update alias",
});

// Delete an alias
export const deletePayeeAlias = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().payeeAliasRoutes.delete.mutate({ id }),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
    ]);
  },
  successMessage: "Alias deleted",
  errorMessage: "Failed to delete alias",
});

// Delete all aliases for a payee
export const deleteAliasesForPayee = defineMutation<
  number,
  { success: boolean; deletedCount: number }
>({
  mutationFn: (payeeId) => trpc().payeeAliasRoutes.deleteForPayee.mutate({ payeeId }),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.forPayee(variables) }),
    ]);
  },
  successMessage: "Aliases deleted",
  errorMessage: "Failed to delete aliases",
});

// Merge aliases when payees are merged
export const mergePayeeAliases = defineMutation<
  { sourcePayeeId: number; targetPayeeId: number },
  { success: boolean; mergedCount: number }
>({
  mutationFn: (data) => trpc().payeeAliasRoutes.merge.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.forPayee(variables.sourcePayeeId) }),
      queryClient.invalidateQueries({ queryKey: payeeAliasKeys.forPayee(variables.targetPayeeId) }),
    ]);
  },
  successMessage: "Aliases merged",
  errorMessage: "Failed to merge aliases",
});
