import type { MLPreferences } from "$lib/schema/workspaces";
import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

/**
 * Query keys for ML settings
 */
export const mlSettingsKeys = createQueryKeys("mlSettings", {
  preferences: () => ["mlSettings", "preferences"] as const,
});

/**
 * Get ML preferences for current workspace
 */
export const getMLPreferences = () =>
  defineQuery<MLPreferences>({
    queryKey: mlSettingsKeys.preferences(),
    queryFn: () => trpc().settingsRoutes.getMLPreferences.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Update ML preferences
 */
export const updateMLPreferences = () =>
  defineMutation<Partial<MLPreferences>, MLPreferences>({
    mutationFn: (input) => trpc().settingsRoutes.updateMLPreferences.mutate(input),
    successMessage: "ML preferences updated",
    errorMessage: "Failed to update ML preferences",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlSettingsKeys.preferences() });
    },
  });

/**
 * Toggle master ML switch
 */
export const toggleML = () =>
  defineMutation<{ enabled: boolean }, MLPreferences>({
    mutationFn: (input) => trpc().settingsRoutes.toggleML.mutate(input),
    successMessage: (data) => `ML features ${data.enabled ? "enabled" : "disabled"}`,
    errorMessage: "Failed to toggle ML features",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlSettingsKeys.preferences() });
    },
  });

// Convenience namespace export for organized access
export const MLSettings = {
  keys: mlSettingsKeys,
  getPreferences: getMLPreferences,
  update: updateMLPreferences,
  toggle: toggleML,
};
