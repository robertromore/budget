import { defineQuery, defineMutation, createQueryKeys } from "./_factory";
import { queryPresets, queryClient } from "./_client";
import { trpc } from "$lib/trpc/client";
import type { Workspace } from "$lib/schema/workspaces";

export const workspaceKeys = createQueryKeys("workspaces", {
  lists: () => ["workspaces", "list"] as const,
  list: () => ["workspaces", "list"] as const,
  current: () => ["workspaces", "current"] as const,
});

/**
 * Get current workspace from context
 */
export const getCurrentWorkspace = () =>
  defineQuery<Workspace>({
    queryKey: workspaceKeys.current(),
    queryFn: async () => {
      const result = await trpc().workspaceRoutes.getCurrent.query();
      return result as Workspace;
    },
    options: {
      ...queryPresets.static,
    },
  });

/**
 * List all workspaces
 */
export const listWorkspaces = () =>
  defineQuery<Workspace[]>({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const result = await trpc().workspaceRoutes.list.query();
      return result as Workspace[];
    },
    options: {
      ...queryPresets.static,
    },
  });

// Alias for consistency with other query modules
export const list = listWorkspaces;

/**
 * Create a new workspace
 */
export const createWorkspace = () =>
  defineMutation({
    mutationFn: (data: any) => trpc().workspaceRoutes.create.mutate(data),
    onSuccess: async () => {
      // Invalidate workspace lists
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });

/**
 * Switch to a different workspace
 */
export const switchWorkspace = () =>
  defineMutation({
    mutationFn: ({ workspaceId }: { workspaceId: number }) =>
      trpc().workspaceRoutes.switchWorkspace.mutate({ workspaceId }),
    onSuccess: async () => {
      // Invalidate current workspace query
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.current() });
    },
  });

/**
 * Update workspace preferences
 */
export const updateWorkspacePreferences = () =>
  defineMutation({
    mutationFn: ({
      workspaceId,
      preferences,
    }: {
      workspaceId: number;
      preferences: Record<string, any>;
    }) => trpc().workspaceRoutes.updatePreferences.mutate({ workspaceId, preferences }),
    onSuccess: async () => {
      // Invalidate current workspace and list
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceKeys.current() }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
      ]);
    },
  });

/**
 * Delete workspace (soft delete)
 */
export const deleteWorkspace = () =>
  defineMutation({
    mutationFn: ({ id }: { id: number }) =>
      trpc().workspaceRoutes.delete.mutate({ workspaceId: id }),
    onSuccess: async () => {
      // Invalidate workspace lists
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
