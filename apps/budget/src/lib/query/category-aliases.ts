import type { AmountType } from "$lib/schema/category-aliases";
import type {
  CategoryAlias,
  CategoryAliasMatch,
  CategoryAliasStats,
  CategoryAliasWithCategory,
} from "$lib/schema/category-aliases";
import { trpc } from "$lib/trpc/client";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys
export const categoryAliasKeys = createQueryKeys("categoryAliases", {
  all: () => ["categoryAliases", "all"] as const,
  lists: () => ["categoryAliases", "list"] as const,
  list: () => ["categoryAliases", "list"] as const,
  details: () => ["categoryAliases", "detail"] as const,
  detail: (id: number) => ["categoryAliases", "detail", id] as const,
  forCategory: (categoryId: number) => ["categoryAliases", "forCategory", categoryId] as const,
  findCategory: (rawString: string) => ["categoryAliases", "findCategory", rawString] as const,
  batchFind: (rawStrings: string[]) =>
    ["categoryAliases", "batchFind", rawStrings.join("|")] as const,
  stats: () => ["categoryAliases", "stats"] as const,
});

// List all aliases with category details
export const listCategoryAliases = () =>
  defineQuery<CategoryAliasWithCategory[]>({
    queryKey: categoryAliasKeys.list(),
    queryFn: async () => {
      const result = await trpc().categoryAliasRoutes.all.query();
      return result;
    },
    options: {
      ...queryPresets.static,
    },
  });

// Get a single alias by ID
export const getCategoryAlias = (id: number) =>
  defineQuery<CategoryAlias | null>({
    queryKey: categoryAliasKeys.detail(id),
    queryFn: async () => {
      const result = await trpc().categoryAliasRoutes.get.query({ id });
      return result;
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

// Get aliases for a specific category
export const getAliasesForCategory = (categoryId: number) =>
  defineQuery<CategoryAlias[]>({
    queryKey: categoryAliasKeys.forCategory(categoryId),
    queryFn: async () => {
      const result = await trpc().categoryAliasRoutes.forCategory.query({ categoryId });
      return result;
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

// Find which category a raw string maps to
export const findCategoryByAlias = (
  rawString: string,
  options?: { payeeId?: number; amountType?: AmountType }
) =>
  defineQuery<CategoryAliasMatch | null>({
    queryKey: categoryAliasKeys.findCategory(rawString),
    queryFn: async () => {
      const result = await trpc().categoryAliasRoutes.findCategory.query({
        rawString,
        payeeId: options?.payeeId,
        amountType: options?.amountType,
      });
      return result;
    },
    options: {
      enabled: rawString.length > 0,
      staleTime: 30 * 1000, // 30 seconds
    },
  });

// Batch find categories for multiple raw strings
export const batchFindCategoryAliases = (
  rawStrings: string[],
  options?: { amountType?: AmountType }
) =>
  defineQuery<Record<string, CategoryAliasMatch>>({
    queryKey: categoryAliasKeys.batchFind(rawStrings),
    queryFn: async () => {
      const result = await trpc().categoryAliasRoutes.batchFind.query({
        rawStrings,
        amountType: options?.amountType,
      });
      return result;
    },
    options: {
      enabled: rawStrings.length > 0,
      staleTime: 30 * 1000, // 30 seconds
    },
  });

// Get alias statistics
export const getCategoryAliasStats = () =>
  defineQuery<CategoryAliasStats>({
    queryKey: categoryAliasKeys.stats(),
    queryFn: async () => {
      const result = await trpc().categoryAliasRoutes.stats.query();
      return result;
    },
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

// Create a manual alias
export const createCategoryAlias = defineMutation<
  { rawString: string; categoryId: number; payeeId?: number; amountType?: AmountType },
  CategoryAlias
>({
  mutationFn: (data) => trpc().categoryAliasRoutes.create.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.forCategory(variables.categoryId) }),
    ]);
  },
  successMessage: "Alias created",
  errorMessage: "Failed to create alias",
});

// Record alias from import confirmation
export const recordCategoryAliasFromImport = defineMutation<
  {
    rawString: string;
    categoryId: number;
    payeeId?: number;
    accountId?: number;
    amountType?: AmountType;
    wasAiSuggested?: boolean;
  },
  CategoryAlias
>({
  mutationFn: (data) => trpc().categoryAliasRoutes.recordFromImport.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.forCategory(variables.categoryId) }),
    ]);
  },
});

// Record alias from transaction edit
export const recordCategoryAliasFromTransactionEdit = defineMutation<
  {
    rawString: string;
    categoryId: number;
    payeeId?: number;
    amountType?: AmountType;
  },
  CategoryAlias
>({
  mutationFn: (data) => trpc().categoryAliasRoutes.recordFromTransactionEdit.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.forCategory(variables.categoryId) }),
    ]);
  },
});

// Record when user accepts AI suggestion
export const recordCategoryAiAcceptance = defineMutation<
  {
    rawString: string;
    categoryId: number;
    payeeId?: number;
    amountType?: AmountType;
    aiConfidence?: number;
  },
  CategoryAlias
>({
  mutationFn: (data) => trpc().categoryAliasRoutes.recordAiAcceptance.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.forCategory(variables.categoryId) }),
    ]);
  },
});

// Bulk create aliases (typically at end of import)
export const bulkCreateCategoryAliases = defineMutation<
  {
    aliases: Array<{
      rawString: string;
      categoryId: number;
      payeeId?: number;
      sourceAccountId?: number;
      amountType?: AmountType;
      wasAiSuggested?: boolean;
    }>;
  },
  { created: number; updated: number }
>({
  mutationFn: (data) => trpc().categoryAliasRoutes.bulkCreate.mutate(data),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
    ]);
  },
  successMessage: "Category aliases recorded",
  errorMessage: "Failed to record category aliases",
});

// Update an alias
export const updateCategoryAlias = defineMutation<
  { id: number; rawString?: string; categoryId?: number; amountType?: AmountType },
  CategoryAlias
>({
  mutationFn: (data) => trpc().categoryAliasRoutes.update.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.detail(variables.id) }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
    ]);
  },
  successMessage: "Alias updated",
  errorMessage: "Failed to update alias",
});

// Delete an alias
export const deleteCategoryAlias = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().categoryAliasRoutes.delete.mutate({ id }),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
    ]);
  },
  successMessage: "Alias deleted",
  errorMessage: "Failed to delete alias",
});

// Delete all aliases for a category
export const deleteAliasesForCategory = defineMutation<
  number,
  { success: boolean; deletedCount: number }
>({
  mutationFn: (categoryId) => trpc().categoryAliasRoutes.deleteForCategory.mutate({ categoryId }),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.forCategory(variables) }),
    ]);
  },
  successMessage: "Aliases deleted",
  errorMessage: "Failed to delete aliases",
});

// Merge aliases when categories are merged
export const mergeCategoryAliases = defineMutation<
  { sourceCategoryId: number; targetCategoryId: number },
  { success: boolean; mergedCount: number }
>({
  mutationFn: (data) => trpc().categoryAliasRoutes.merge.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.list() }),
      queryClient.invalidateQueries({ queryKey: categoryAliasKeys.stats() }),
      queryClient.invalidateQueries({
        queryKey: categoryAliasKeys.forCategory(variables.sourceCategoryId),
      }),
      queryClient.invalidateQueries({
        queryKey: categoryAliasKeys.forCategory(variables.targetCategoryId),
      }),
    ]);
  },
  successMessage: "Aliases merged",
  errorMessage: "Failed to merge aliases",
});
