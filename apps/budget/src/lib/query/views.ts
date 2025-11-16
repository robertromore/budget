import type { View } from "$lib/schema/views";
import { trpc } from "$lib/trpc/client";
import type { TableEntityType } from "$lib/types";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const viewKeys = createQueryKeys("views", {
  lists: () => ["views", "list"] as const,
  list: (entityType?: TableEntityType) =>
    entityType ? (["views", "list", entityType] as const) : (["views", "list"] as const),
  details: () => ["views", "detail"] as const,
  detail: (id: number) => ["views", "detail", id] as const,
  // Entity type specific keys
  transactions: () => ["views", "list", "transactions"] as const,
  categories: () => ["views", "list", "top_categories"] as const,
});

/**
 * Get all views, optionally filtered by entity type
 */
export const listViews = (entityType?: TableEntityType) =>
  defineQuery<View[]>({
    queryKey: viewKeys.list(entityType),
    queryFn: () =>
      trpc().viewsRoutes.all.query(entityType ? { entityType } : undefined) as Promise<View[]>,
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Get all transaction views
 */
export const listTransactionViews = () =>
  defineQuery<View[]>({
    queryKey: viewKeys.transactions(),
    queryFn: () => trpc().viewsRoutes.all.query({ entityType: "transactions" }) as Promise<View[]>,
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Get all top categories views
 */
export const listCategoryViews = () =>
  defineQuery<View[]>({
    queryKey: viewKeys.categories(),
    queryFn: () =>
      trpc().viewsRoutes.all.query({ entityType: "top_categories" }) as Promise<View[]>,
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Get a single view by ID
 */
export const getViewDetail = (id: number) =>
  defineQuery<View>({
    queryKey: viewKeys.detail(id),
    queryFn: () => trpc().viewsRoutes.load.query({ id }) as Promise<View>,
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Save (create or update) a view
 */
export const saveView = defineMutation<any, View>({
  mutationFn: (variables) => trpc().viewsRoutes.save.mutate(variables),
  onSuccess: async (data) => {
    // Invalidate all view lists to ensure fresh data
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: viewKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: viewKeys.list(data.entityType) }),
    ]);
  },
});

/**
 * Delete a single view
 */
export const deleteView = defineMutation<any, View>({
  mutationFn: (variables) => trpc().viewsRoutes.remove.mutate(variables),
  onSuccess: async (data) => {
    // Invalidate all view lists
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: viewKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: viewKeys.list(data.entityType) }),
    ]);
  },
});

/**
 * Delete multiple views
 */
export const deleteViews = defineMutation<any, View[]>({
  mutationFn: (variables) => trpc().viewsRoutes.delete.mutate(variables),
  onSuccess: async () => {
    // Invalidate all view lists
    await queryClient.invalidateQueries({ queryKey: viewKeys.lists() });
  },
});
