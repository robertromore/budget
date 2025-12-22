import type { ModelInfo } from "$lib/schema/llm-models";
import type { LLMFeatureModes, LLMPreferences, LLMProvider } from "$lib/schema/workspaces";
import { trpc } from "$lib/trpc/client";
import type { RouterOutputs } from "$lib/trpc/router";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Response type from getPreferences (inferred from router output)
type LLMPreferencesResponse = RouterOutputs["llmSettingsRoutes"]["getPreferences"];

/**
 * Query keys for LLM settings
 */
export const llmSettingsKeys = createQueryKeys("llmSettings", {
  preferences: () => ["llmSettings", "preferences"] as const,
  models: (provider: LLMProvider) => ["llmSettings", "models", provider] as const,
  ollamaModels: (endpoint?: string) => ["llmSettings", "ollamaModels", endpoint ?? "default"] as const,
});

/**
 * Get LLM preferences for current workspace
 */
export const getLLMPreferences = () =>
  defineQuery<LLMPreferencesResponse>({
    queryKey: llmSettingsKeys.preferences(),
    queryFn: () => trpc().llmSettingsRoutes.getPreferences.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Update provider configuration
 */
export const updateProvider = () =>
  defineMutation<
    {
      provider: LLMProvider;
      config: { enabled: boolean; apiKey?: string; model: string; endpoint?: string };
    },
    { success: boolean; provider: LLMProvider }
  >({
    mutationFn: (input) => trpc().llmSettingsRoutes.updateProvider.mutate(input),
    successMessage: (data) => `${data.provider} settings updated`,
    errorMessage: "Failed to update provider settings",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmSettingsKeys.preferences() });
    },
  });

/**
 * Update provider configuration (silent - no toast)
 * Use when another action will follow that shows its own toast
 */
export const updateProviderSilent = () =>
  defineMutation<
    {
      provider: LLMProvider;
      config: { enabled: boolean; apiKey?: string; model: string; endpoint?: string };
    },
    { success: boolean; provider: LLMProvider }
  >({
    mutationFn: (input) => trpc().llmSettingsRoutes.updateProvider.mutate(input),
    // No successMessage - toast will be shown by the follow-up action
    errorMessage: "Failed to update provider settings",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmSettingsKeys.preferences() });
    },
  });

/**
 * Clear API key for a provider
 */
export const clearApiKey = () =>
  defineMutation<{ provider: LLMProvider }, { success: boolean }>({
    mutationFn: (input) => trpc().llmSettingsRoutes.clearApiKey.mutate(input),
    successMessage: "API key removed",
    errorMessage: "Failed to remove API key",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmSettingsKeys.preferences() });
    },
  });

/**
 * Update feature modes
 */
export const updateFeatureModes = () =>
  defineMutation<Partial<LLMFeatureModes>, LLMFeatureModes>({
    mutationFn: (input) => trpc().llmSettingsRoutes.updateFeatureModes.mutate(input),
    successMessage: "Feature modes updated",
    errorMessage: "Failed to update feature modes",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmSettingsKeys.preferences() });
    },
  });

/**
 * Toggle master LLM switch
 */
export const toggleLLM = () =>
  defineMutation<{ enabled: boolean }, LLMPreferences>({
    mutationFn: (input) => trpc().llmSettingsRoutes.toggleLLM.mutate(input),
    successMessage: (data) => `LLM features ${data.enabled ? "enabled" : "disabled"}`,
    errorMessage: "Failed to toggle LLM features",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmSettingsKeys.preferences() });
    },
  });

/**
 * Set default provider
 */
export const setDefaultProvider = () =>
  defineMutation<{ provider: LLMProvider | null }, LLMPreferences>({
    mutationFn: (input) => trpc().llmSettingsRoutes.setDefaultProvider.mutate(input),
    successMessage: (data) =>
      data.defaultProvider ? `${data.defaultProvider} set as default provider` : "Default provider cleared",
    errorMessage: "Failed to set default provider",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmSettingsKeys.preferences() });
    },
  });

/**
 * Test connection to a provider
 */
export const testConnection = () =>
  defineMutation<
    { provider: LLMProvider; apiKey?: string },
    { success: boolean; message: string; models?: ModelInfo[] }
  >({
    mutationFn: (input) => trpc().llmSettingsRoutes.testConnection.mutate(input),
    successMessage: (data) => data.message,
    errorMessage: "Connection test failed",
  });

/**
 * Get available models for a provider
 */
export const getModels = (provider: LLMProvider) =>
  defineQuery<ModelInfo[]>({
    queryKey: llmSettingsKeys.models(provider),
    queryFn: () => trpc().llmSettingsRoutes.getModels.query({ provider }),
    options: {
      staleTime: 1000 * 60 * 60, // 1 hour (models don't change often)
    },
  });

/**
 * Get installed Ollama models from local server
 */
export const getOllamaModels = (endpoint?: string) =>
  defineQuery<{ success: boolean; models: ModelInfo[]; error: string | null }>({
    queryKey: llmSettingsKeys.ollamaModels(endpoint),
    queryFn: () => trpc().llmSettingsRoutes.getOllamaModels.query({ endpoint }),
    options: {
      staleTime: 1000 * 60, // 1 minute (models can be installed/removed)
      retry: false, // Don't retry if Ollama isn't running
    },
  });

// Convenience namespace export for organized access
export const LLMSettings = {
  keys: llmSettingsKeys,
  getPreferences: getLLMPreferences,
  updateProvider,
  updateProviderSilent,
  clearApiKey,
  updateFeatureModes,
  toggle: toggleLLM,
  setDefaultProvider,
  testConnection,
  getModels,
  getOllamaModels,
};
