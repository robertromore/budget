/**
 * Intelligence Coordinator
 *
 * Manages the coordination between ML and LLM systems.
 * Determines execution strategy based on settings and handles fallbacks.
 */

import type {
  LLMFeatureConfig,
  LLMFeatureModes,
  LLMPreferences,
  LLMProvider,
  MLPreferences,
  WorkspacePreferences,
} from "$lib/schema/workspaces";
import { DEFAULT_LLM_PREFERENCES, DEFAULT_ML_PREFERENCES } from "$lib/schema/workspaces";
import { createProvider, getActiveProvider, type ProviderInstance } from "./providers";

// Feature names that can use ML, LLM, or both
export type IntelligenceFeature =
  | "transactionParsing"
  | "categorySuggestion"
  | "anomalyDetection"
  | "forecasting"
  | "payeeMatching";

// Execution strategy for a feature
export type ExecutionStrategy =
  | "ml_only" // Only use ML
  | "llm_only" // Only use LLM
  | "ml_then_llm" // Use ML first, enhance with LLM
  | "llm_then_ml" // Use LLM first, fall back to ML
  | "parallel" // Run both in parallel, combine results
  | "none"; // Neither available

// Result of strategy determination
export interface StrategyResult {
  strategy: ExecutionStrategy;
  useML: boolean;
  useLLM: boolean;
  llmProvider: ProviderInstance | null;
  llmProviderType: LLMProvider | null;
  mlEnabled: boolean;
  llmEnabled: boolean;
  featureMode: "disabled" | "enhance" | "override";
}

// Helper to normalize feature config (handles old string format)
function getFeatureConfig(
  featureModes: LLMFeatureModes,
  feature: keyof LLMFeatureModes,
  defaultConfig: LLMFeatureConfig
): LLMFeatureConfig {
  const config = featureModes[feature];
  if (!config) return defaultConfig;
  // Handle old string format (just the mode)
  if (typeof config === "string") {
    return { mode: config as LLMFeatureConfig["mode"], provider: null };
  }
  return {
    mode: config.mode ?? defaultConfig.mode,
    provider: config.provider ?? null,
  };
}

// Mapping from LLM feature modes to ML feature names
const LLM_TO_ML_FEATURE_MAP: Record<keyof LLMFeatureModes, keyof MLPreferences["features"] | null> = {
  transactionParsing: null, // No direct ML equivalent
  categorySuggestion: "similarity", // Uses similarity service
  anomalyDetection: "anomalyDetection",
  forecasting: "forecasting",
  payeeMatching: "similarity",
};

/**
 * Intelligence Coordinator
 *
 * Determines how ML and LLM should work together for each feature.
 */
export class IntelligenceCoordinator {
  private mlPreferences: MLPreferences;
  private llmPreferences: LLMPreferences;

  constructor(preferences: WorkspacePreferences) {
    this.mlPreferences = preferences.ml ?? DEFAULT_ML_PREFERENCES;
    this.llmPreferences = preferences.llm ?? DEFAULT_LLM_PREFERENCES;
  }

  /**
   * Get the execution strategy for a feature (automatic/coordinated mode)
   *
   * This determines how ML and LLM should work together based on the feature mode.
   * Use this for automatic/background operations where the feature mode matters.
   *
   * For explicit user requests (e.g., user selecting "llm" detection method),
   * use getLLMProvider() instead to get the provider directly.
   */
  getStrategy(feature: IntelligenceFeature): StrategyResult {
    const mlEnabled = this.isMLEnabled(feature);
    const llmEnabled = this.isLLMEnabled(feature);
    const featureMode = this.getLLMMode(feature);
    const { provider: llmProvider, providerType } = llmEnabled
      ? this.getProviderForFeature(feature)
      : { provider: null, providerType: null };

    // Determine strategy based on what's available and configured
    let strategy: ExecutionStrategy;
    let useML = false;
    let useLLM = false;

    if (!mlEnabled && !llmEnabled) {
      // Nothing available
      strategy = "none";
    } else if (mlEnabled && !llmEnabled) {
      // ML only
      strategy = "ml_only";
      useML = true;
    } else if (!mlEnabled && llmEnabled) {
      // LLM only (regardless of mode since ML is off)
      strategy = "llm_only";
      useLLM = true;
    } else {
      // Both available - use mode to determine how they coordinate
      switch (featureMode) {
        case "disabled":
          // Don't enhance ML with LLM automatically, use ML only
          strategy = "ml_only";
          useML = true;
          break;
        case "enhance":
          // LLM enhances ML - run ML first, then LLM to improve results
          strategy = "ml_then_llm";
          useML = true;
          useLLM = true;
          break;
        case "override":
          // LLM replaces ML - use LLM only
          strategy = "llm_only";
          useLLM = true;
          break;
        default:
          strategy = "ml_only";
          useML = true;
      }
    }

    return {
      strategy,
      useML,
      useLLM,
      llmProvider: useLLM ? llmProvider : null,
      llmProviderType: useLLM ? providerType : null,
      mlEnabled,
      llmEnabled,
      featureMode,
    };
  }

  /**
   * Get the LLM provider for explicit requests (bypasses feature mode)
   *
   * Use this when the user explicitly requests LLM usage (e.g., selecting
   * "llm" detection method). This only checks if LLM is available, not
   * whether the feature mode allows automatic LLM enhancement.
   */
  getLLMProvider(feature: IntelligenceFeature): {
    provider: ProviderInstance | null;
    providerType: LLMProvider | null;
    available: boolean;
  } {
    const available = this.isLLMEnabled(feature);
    if (!available) {
      return { provider: null, providerType: null, available: false };
    }
    const { provider, providerType } = this.getProviderForFeature(feature);
    return { provider, providerType, available: !!provider };
  }

  /**
   * Get the provider instance for a specific feature
   */
  private getProviderForFeature(feature: IntelligenceFeature): {
    provider: ProviderInstance | null;
    providerType: LLMProvider | null;
  } {
    const featureConfig = getFeatureConfig(
      this.llmPreferences.featureModes,
      feature,
      DEFAULT_LLM_PREFERENCES.featureModes[feature]
    );

    // Use feature-specific provider if set
    if (featureConfig.provider) {
      const providerConfig = this.llmPreferences.providers[featureConfig.provider];
      if (providerConfig?.enabled) {
        const provider = createProvider(featureConfig.provider, providerConfig);
        if (provider) {
          return { provider, providerType: featureConfig.provider };
        }
      }
    }

    // Fall back to default provider
    if (this.llmPreferences.defaultProvider) {
      const provider = getActiveProvider(this.llmPreferences);
      return { provider, providerType: this.llmPreferences.defaultProvider };
    }

    return { provider: null, providerType: null };
  }

  /**
   * Check if ML is enabled for a feature
   */
  isMLEnabled(feature: IntelligenceFeature): boolean {
    if (!this.mlPreferences.enabled) {
      return false;
    }

    const mlFeature = LLM_TO_ML_FEATURE_MAP[feature];
    if (!mlFeature) {
      // No ML equivalent for this feature
      return false;
    }

    return this.mlPreferences.features[mlFeature] ?? false;
  }

  /**
   * Check if LLM is enabled (master toggle + provider configured)
   *
   * NOTE: This checks if LLM is AVAILABLE, not whether the feature mode allows it.
   * Feature mode (disabled/enhance/override) controls how ML and LLM work together,
   * not whether LLM can be used at all.
   */
  isLLMEnabled(feature: IntelligenceFeature): boolean {
    if (!this.llmPreferences.enabled) {
      return false;
    }

    const featureConfig = getFeatureConfig(
      this.llmPreferences.featureModes,
      feature,
      DEFAULT_LLM_PREFERENCES.featureModes[feature]
    );

    // Check if feature-specific provider is enabled
    if (featureConfig.provider) {
      const providerConfig = this.llmPreferences.providers[featureConfig.provider];
      return providerConfig?.enabled ?? false;
    }

    // Fall back to checking default provider
    if (!this.llmPreferences.defaultProvider) {
      return false;
    }

    const defaultProviderConfig = this.llmPreferences.providers[this.llmPreferences.defaultProvider];
    return defaultProviderConfig?.enabled ?? false;
  }

  /**
   * Get the LLM mode for a feature
   */
  getLLMMode(feature: IntelligenceFeature): "disabled" | "enhance" | "override" {
    if (!this.llmPreferences.enabled) {
      return "disabled";
    }
    const featureConfig = getFeatureConfig(
      this.llmPreferences.featureModes,
      feature,
      DEFAULT_LLM_PREFERENCES.featureModes[feature]
    );
    return featureConfig.mode;
  }

  /**
   * Get the provider configured for a feature (or null for default)
   */
  getFeatureProviderType(feature: IntelligenceFeature): LLMProvider | null {
    const featureConfig = getFeatureConfig(
      this.llmPreferences.featureModes,
      feature,
      DEFAULT_LLM_PREFERENCES.featureModes[feature]
    );
    return featureConfig.provider;
  }

  /**
   * Check if any intelligence (ML or LLM) is available for a feature
   */
  isAvailable(feature: IntelligenceFeature): boolean {
    return this.isMLEnabled(feature) || this.isLLMEnabled(feature);
  }

  /**
   * Get a summary of what's enabled
   */
  getSummary(): {
    mlMasterEnabled: boolean;
    llmMasterEnabled: boolean;
    defaultProvider: string | null;
    features: Record<IntelligenceFeature, { ml: boolean; llm: boolean; mode: string; provider: string | null }>;
  } {
    const getFeatureSummary = (feature: IntelligenceFeature) => ({
      ml: this.isMLEnabled(feature),
      llm: this.isLLMEnabled(feature),
      mode: this.getLLMMode(feature),
      provider: this.getFeatureProviderType(feature),
    });

    const features: Record<IntelligenceFeature, { ml: boolean; llm: boolean; mode: string; provider: string | null }> = {
      transactionParsing: getFeatureSummary("transactionParsing"),
      categorySuggestion: getFeatureSummary("categorySuggestion"),
      anomalyDetection: getFeatureSummary("anomalyDetection"),
      forecasting: getFeatureSummary("forecasting"),
      payeeMatching: getFeatureSummary("payeeMatching"),
    };

    return {
      mlMasterEnabled: this.mlPreferences.enabled,
      llmMasterEnabled: this.llmPreferences.enabled,
      defaultProvider: this.llmPreferences.defaultProvider,
      features,
    };
  }
}

/**
 * Create an intelligence coordinator from workspace preferences
 */
export function createIntelligenceCoordinator(
  preferences: WorkspacePreferences
): IntelligenceCoordinator {
  return new IntelligenceCoordinator(preferences);
}

/**
 * Execute with fallback strategy
 *
 * Runs the appropriate function(s) based on strategy and handles errors gracefully
 */
export async function executeWithStrategy<T>(
  strategy: StrategyResult,
  options: {
    mlFn?: () => Promise<T>;
    llmFn?: () => Promise<T>;
    combineFn?: (mlResult: T, llmResult: T) => T;
    defaultValue: T;
  }
): Promise<{ result: T; source: "ml" | "llm" | "combined" | "default" }> {
  const { mlFn, llmFn, combineFn, defaultValue } = options;

  try {
    switch (strategy.strategy) {
      case "ml_only":
        if (mlFn) {
          const result = await mlFn();
          return { result, source: "ml" };
        }
        break;

      case "llm_only":
        if (llmFn) {
          const result = await llmFn();
          return { result, source: "llm" };
        }
        break;

      case "ml_then_llm":
        if (mlFn && llmFn && combineFn) {
          const mlResult = await mlFn();
          try {
            const llmResult = await llmFn();
            const combined = combineFn(mlResult, llmResult);
            return { result: combined, source: "combined" };
          } catch {
            // LLM failed, return ML result
            return { result: mlResult, source: "ml" };
          }
        } else if (mlFn) {
          const result = await mlFn();
          return { result, source: "ml" };
        }
        break;

      case "llm_then_ml":
        if (llmFn) {
          try {
            const result = await llmFn();
            return { result, source: "llm" };
          } catch {
            // LLM failed, try ML
            if (mlFn) {
              const result = await mlFn();
              return { result, source: "ml" };
            }
          }
        } else if (mlFn) {
          const result = await mlFn();
          return { result, source: "ml" };
        }
        break;

      case "parallel":
        if (mlFn && llmFn && combineFn) {
          const [mlResult, llmResult] = await Promise.all([
            mlFn().catch(() => null),
            llmFn().catch(() => null),
          ]);
          if (mlResult && llmResult) {
            const combined = combineFn(mlResult, llmResult);
            return { result: combined, source: "combined" };
          } else if (mlResult) {
            return { result: mlResult, source: "ml" };
          } else if (llmResult) {
            return { result: llmResult, source: "llm" };
          }
        }
        break;

      case "none":
      default:
        break;
    }
  } catch (error) {
    console.error("Intelligence execution error:", error);
  }

  return { result: defaultValue, source: "default" };
}
