/**
 * LLM Provider Abstraction Layer
 *
 * Creates provider instances from workspace configuration.
 * Supports OpenAI, Anthropic, Google, and Ollama via Vercel AI SDK.
 */

import type {
  LLMFeatureModes,
  LLMPreferences,
  LLMProvider,
  LLMProviderConfig,
} from "$lib/schema/workspaces";
import { decryptApiKey } from "$lib/server/shared/security";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { Ollama } from "ollama";

// Provider instance with model configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ProviderInstance {
  provider: any; // Provider type varies between OpenAI, Anthropic, Google, Ollama
  model: string;
  providerType: LLMProvider;
  isOllama?: boolean; // Flag to indicate Ollama requires special handling
  ollamaClient?: Ollama; // Native Ollama client for direct API calls
}

// Feature mode result
export interface FeatureProviderResult {
  provider: ProviderInstance | null;
  mode: "disabled" | "enhance" | "override";
}

/**
 * Create an OpenAI-compatible provider instance from configuration.
 * All providers use OpenAI-compatible API format.
 */
export function createProvider(
  providerType: LLMProvider,
  config: LLMProviderConfig
): ProviderInstance | null {
  if (!config.enabled) {
    return null;
  }

  let apiKey: string | undefined;
  if (config.encryptedApiKey && providerType !== "ollama") {
    try {
      apiKey = decryptApiKey(config.encryptedApiKey);
    } catch (error) {
      console.error(`Failed to decrypt API key for ${providerType}:`, error);
      return null;
    }
  }

  try {
    switch (providerType) {
      case "openai":
        if (!apiKey) return null;
        return {
          provider: createOpenAI({ apiKey }),
          model: config.model,
          providerType,
        };

      case "anthropic":
        if (!apiKey) return null;
        return {
          provider: createAnthropic({ apiKey }),
          model: config.model,
          providerType,
        };

      case "google":
        if (!apiKey) return null;
        return {
          provider: createGoogleGenerativeAI({ apiKey }),
          model: config.model,
          providerType,
        };

      case "ollama":
        // Ollama is local, no API key needed
        // Use native Ollama SDK for proper compatibility with AI SDK 5
        return {
          provider: null, // Ollama uses native client, not AI SDK provider
          model: config.model,
          providerType,
          isOllama: true,
          ollamaClient: new Ollama({
            host: config.endpoint || "http://localhost:11434",
          }),
        };

      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to create provider for ${providerType}:`, error);
    return null;
  }
}

/**
 * Get the active provider based on preferences.
 * Returns the default provider if configured and enabled.
 */
export function getActiveProvider(preferences: LLMPreferences): ProviderInstance | null {
  if (!preferences.enabled || !preferences.defaultProvider) {
    return null;
  }

  const config = preferences.providers[preferences.defaultProvider];
  return createProvider(preferences.defaultProvider, config);
}

/**
 * Get provider for a specific feature, considering mode and per-feature provider override.
 *
 * @param preferences - LLM preferences from workspace
 * @param feature - The feature key to get provider for
 * @returns Provider instance and mode, or null provider if disabled
 */
export function getProviderForFeature(
  preferences: LLMPreferences,
  feature: keyof LLMFeatureModes
): FeatureProviderResult {
  const featureConfig = preferences.featureModes[feature];

  // Handle both old string format and new object format
  const mode = typeof featureConfig === "string" ? featureConfig : featureConfig.mode;
  const featureProvider = typeof featureConfig === "string" ? null : featureConfig.provider;

  if (mode === "disabled" || !preferences.enabled) {
    return { provider: null, mode: "disabled" };
  }

  // Use feature-specific provider if set, otherwise use default
  let provider: ProviderInstance | null = null;

  if (featureProvider) {
    const providerConfig = preferences.providers[featureProvider];
    if (providerConfig?.enabled) {
      provider = createProvider(featureProvider, providerConfig);
    }
  }

  // Fall back to default provider
  if (!provider) {
    provider = getActiveProvider(preferences);
  }

  return { provider, mode };
}

/**
 * Check if LLM is available for a feature.
 *
 * @param preferences - LLM preferences from workspace
 * @param feature - The feature key to check
 * @returns true if LLM is enabled and configured for the feature
 */
export function isLLMAvailable(
  preferences: LLMPreferences,
  feature: keyof LLMFeatureModes
): boolean {
  const { provider, mode } = getProviderForFeature(preferences, feature);
  return mode !== "disabled" && provider !== null;
}

/**
 * Get LLM mode for a feature.
 *
 * @param preferences - LLM preferences from workspace
 * @param feature - The feature key to check
 * @returns The mode: 'disabled', 'enhance', or 'override'
 */
export function getLLMMode(
  preferences: LLMPreferences,
  feature: keyof LLMFeatureModes
): "disabled" | "enhance" | "override" {
  if (!preferences.enabled) {
    return "disabled";
  }
  const featureConfig = preferences.featureModes[feature];
  // Handle both old string format and new object format
  return typeof featureConfig === "string" ? featureConfig : featureConfig.mode;
}

/**
 * Get the provider for a specific feature.
 *
 * @param preferences - LLM preferences from workspace
 * @param feature - The feature key to check
 * @returns The provider type for this feature (or null for default)
 */
export function getFeatureProvider(
  preferences: LLMPreferences,
  feature: keyof LLMFeatureModes
): LLMProvider | null {
  const featureConfig = preferences.featureModes[feature];
  // Handle both old string format and new object format
  if (typeof featureConfig === "string") {
    return null;
  }
  return featureConfig.provider;
}
