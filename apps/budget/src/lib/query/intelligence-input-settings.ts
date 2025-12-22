import type { IntelligenceInputPreferences } from "$lib/schema/workspaces";
import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

/**
 * Query keys for Intelligence Input settings
 */
export const intelligenceInputSettingsKeys = createQueryKeys("intelligenceInputSettings", {
  preferences: () => ["intelligenceInputSettings", "preferences"] as const,
});

/**
 * Get Intelligence Input preferences for current workspace
 */
export const getIntelligenceInputPreferences = () =>
  defineQuery<IntelligenceInputPreferences>({
    queryKey: intelligenceInputSettingsKeys.preferences(),
    queryFn: () => trpc().settingsRoutes.getIntelligenceInputPreferences.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Update Intelligence Input preferences
 */
export const updateIntelligenceInputPreferences = () =>
  defineMutation<Partial<IntelligenceInputPreferences>, IntelligenceInputPreferences>({
    mutationFn: (input) => trpc().settingsRoutes.updateIntelligenceInputPreferences.mutate(input),
    successMessage: "Intelligence input preferences updated",
    errorMessage: "Failed to update intelligence input preferences",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelligenceInputSettingsKeys.preferences() });
    },
  });

/**
 * Toggle Intelligence Input feature
 */
export const toggleIntelligenceInput = () =>
  defineMutation<{ enabled: boolean }, IntelligenceInputPreferences>({
    mutationFn: (input) => trpc().settingsRoutes.toggleIntelligenceInput.mutate(input),
    successMessage: (data) => `Intelligence input mode ${data.enabled ? "enabled" : "disabled"}`,
    errorMessage: "Failed to toggle intelligence input mode",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelligenceInputSettingsKeys.preferences() });
    },
  });

/**
 * Set field mode for a specific field
 */
export const setIntelligenceInputFieldMode = () =>
  defineMutation<{ fieldId: string; mode: "ml" | "llm" }, IntelligenceInputPreferences>({
    mutationFn: (input) => trpc().settingsRoutes.setIntelligenceInputFieldMode.mutate(input),
    // No toast for field mode changes - should be silent
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelligenceInputSettingsKeys.preferences() });
    },
  });

// Convenience namespace export for organized access
export const IntelligenceInputSettings = {
  keys: intelligenceInputSettingsKeys,
  getPreferences: getIntelligenceInputPreferences,
  update: updateIntelligenceInputPreferences,
  toggle: toggleIntelligenceInput,
  setFieldMode: setIntelligenceInputFieldMode,
};
