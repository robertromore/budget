import type {
  TransferMapping,
  TransferMappingMatch,
  TransferMappingStats,
  TransferMappingWithAccount,
} from "$lib/schema/transfer-mappings";
import { trpc } from "$lib/trpc/client";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys
export const transferMappingKeys = createQueryKeys("transferMappings", {
  all: () => ["transferMappings", "all"] as const,
  lists: () => ["transferMappings", "list"] as const,
  list: () => ["transferMappings", "list"] as const,
  details: () => ["transferMappings", "detail"] as const,
  detail: (id: number) => ["transferMappings", "detail", id] as const,
  forAccount: (accountId: number) => ["transferMappings", "forAccount", accountId] as const,
  findTransfer: (rawPayeeString: string) =>
    ["transferMappings", "findTransfer", rawPayeeString] as const,
  stats: () => ["transferMappings", "stats"] as const,
});

// List all mappings with account details
export const listTransferMappings = () =>
  defineQuery<TransferMappingWithAccount[]>({
    queryKey: transferMappingKeys.list(),
    queryFn: async () => {
      const result = await trpc().transferMappingRoutes.all.query();
      return result;
    },
    options: {
      ...queryPresets.static,
    },
  });

// Get a single mapping by ID
export const getTransferMapping = (id: number) =>
  defineQuery<TransferMapping | null>({
    queryKey: transferMappingKeys.detail(id),
    queryFn: async () => {
      const result = await trpc().transferMappingRoutes.get.query({ id });
      return result;
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

// Get mappings for a specific target account
export const getMappingsForAccount = (targetAccountId: number) =>
  defineQuery<TransferMapping[]>({
    queryKey: transferMappingKeys.forAccount(targetAccountId),
    queryFn: async () => {
      const result = await trpc().transferMappingRoutes.forAccount.query({ targetAccountId });
      return result;
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

// Find which account a payee string should transfer to
export const findTransferMapping = (rawPayeeString: string) =>
  defineQuery<TransferMappingMatch | null>({
    queryKey: transferMappingKeys.findTransfer(rawPayeeString),
    queryFn: async () => {
      const result = await trpc().transferMappingRoutes.findTransfer.query({ rawPayeeString });
      return result;
    },
    options: {
      enabled: rawPayeeString.length > 0,
      staleTime: 30 * 1000, // 30 seconds
    },
  });

// Get mapping statistics
export const getTransferMappingStats = () =>
  defineQuery<TransferMappingStats>({
    queryKey: transferMappingKeys.stats(),
    queryFn: async () => {
      const result = await trpc().transferMappingRoutes.stats.query();
      return result;
    },
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

// Create a manual mapping
export const createTransferMapping = defineMutation<
  { rawPayeeString: string; targetAccountId: number; sourceAccountId?: number },
  TransferMapping
>({
  mutationFn: (data) => trpc().transferMappingRoutes.create.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.list() }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.stats() }),
      queryClient.invalidateQueries({
        queryKey: transferMappingKeys.forAccount(variables.targetAccountId),
      }),
    ]);
  },
  successMessage: "Transfer mapping created",
  errorMessage: "Failed to create transfer mapping",
});

// Record mapping from import confirmation
export const recordMappingFromImport = defineMutation<
  { rawPayeeString: string; targetAccountId: number; sourceAccountId?: number },
  TransferMapping
>({
  mutationFn: (data) => trpc().transferMappingRoutes.recordFromImport.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.list() }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.stats() }),
      queryClient.invalidateQueries({
        queryKey: transferMappingKeys.forAccount(variables.targetAccountId),
      }),
    ]);
  },
});

// Bulk create mappings (typically at end of import)
export const bulkCreateTransferMappings = defineMutation<
  {
    mappings: Array<{
      rawPayeeString: string;
      targetAccountId: number;
      sourceAccountId?: number;
    }>;
  },
  { created: number; updated: number }
>({
  mutationFn: (data) => trpc().transferMappingRoutes.bulkCreate.mutate(data),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.list() }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.stats() }),
    ]);
  },
  successMessage: "Transfer mappings recorded",
  errorMessage: "Failed to record transfer mappings",
});

// Update a mapping
export const updateTransferMapping = defineMutation<
  { id: number; rawPayeeString?: string; targetAccountId?: number },
  TransferMapping
>({
  mutationFn: (data) => trpc().transferMappingRoutes.update.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.detail(variables.id) }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.list() }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.stats() }),
    ]);
  },
  successMessage: "Transfer mapping updated",
  errorMessage: "Failed to update transfer mapping",
});

// Delete a mapping
export const deleteTransferMapping = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().transferMappingRoutes.delete.mutate({ id }),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.list() }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.stats() }),
    ]);
  },
  successMessage: "Transfer mapping deleted",
  errorMessage: "Failed to delete transfer mapping",
});

// Delete all mappings for a target account
export const deleteMappingsForAccount = defineMutation<
  number,
  { success: boolean; deletedCount: number }
>({
  mutationFn: (targetAccountId) =>
    trpc().transferMappingRoutes.deleteForAccount.mutate({ targetAccountId }),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.list() }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: transferMappingKeys.forAccount(variables) }),
    ]);
  },
  successMessage: "Transfer mappings deleted",
  errorMessage: "Failed to delete transfer mappings",
});
