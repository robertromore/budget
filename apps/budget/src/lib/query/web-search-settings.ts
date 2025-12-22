import type { WebSearchProvider } from "$lib/schema/workspaces";
import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

/**
 * Web Search preferences as returned from the API (client-safe version)
 */
export interface WebSearchClientPreferences {
  enabled: boolean;
  provider: WebSearchProvider;
  hasBraveApiKey: boolean;
  hasOllamaCloudApiKey: boolean;
}

/**
 * Query keys for Web Search settings
 */
export const webSearchSettingsKeys = createQueryKeys("webSearchSettings", {
  preferences: () => ["webSearchSettings", "preferences"] as const,
});

/**
 * Get Web Search preferences for current workspace
 */
export const getWebSearchPreferences = () =>
  defineQuery<WebSearchClientPreferences>({
    queryKey: webSearchSettingsKeys.preferences(),
    queryFn: () => trpc().settingsRoutes.getWebSearchPreferences.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Update Web Search preferences
 */
export const updateWebSearchPreferences = () =>
  defineMutation<
    {
      enabled?: boolean;
      provider?: WebSearchProvider;
      braveApiKey?: string;
      ollamaCloudApiKey?: string;
    },
    WebSearchClientPreferences
  >({
    mutationFn: (input) => trpc().settingsRoutes.updateWebSearchPreferences.mutate(input),
    successMessage: "Web search preferences updated",
    errorMessage: "Failed to update web search preferences",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webSearchSettingsKeys.preferences() });
    },
  });

/**
 * Toggle Web Search feature
 */
export const toggleWebSearch = () =>
  defineMutation<{ enabled: boolean }, WebSearchClientPreferences>({
    mutationFn: (input) => trpc().settingsRoutes.toggleWebSearch.mutate(input),
    successMessage: (data) => `Web search ${data.enabled ? "enabled" : "disabled"}`,
    errorMessage: "Failed to toggle web search",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webSearchSettingsKeys.preferences() });
    },
  });

// Convenience namespace export for organized access
export const WebSearchSettings = {
  keys: webSearchSettingsKeys,
  getPreferences: getWebSearchPreferences,
  update: updateWebSearchPreferences,
  toggle: toggleWebSearch,
};
