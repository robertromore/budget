/**
 * LLM Settings tRPC Routes
 *
 * Provides API endpoints for managing LLM provider configurations,
 * API keys, and feature modes.
 */

import { LLM_MODELS } from "$core/schema/llm-models";
import {
  DEFAULT_LLM_PREFERENCES,
  type LLMFeatureConfig,
  type LLMFeatureModes,
  type LLMPreferences,
  type LLMProviderConfig,
  workspaces,
} from "$core/schema/workspaces";
import { db } from "$core/server/db";
import {
  decryptApiKey,
  encryptApiKey,
  maskApiKey,
  validateApiKeyFormat,
} from "$core/server/shared/security";
import { publicProcedure, secureOperationProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { nowISOString } from "$core/utils/dates-core";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

// Zod schemas for validation
const llmProviderSchema = z.enum(["openai", "anthropic", "google", "ollama"]);
const llmFeatureModeSchema = z.enum(["disabled", "enhance", "override"]);
const OLLAMA_LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const providerConfigSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  model: z.string(),
  endpoint: z.string().optional(),
});

const featureConfigSchema = z.object({
  mode: llmFeatureModeSchema,
  provider: llmProviderSchema.nullable(),
});

const featureModesSchema = z.object({
  categorySuggestion: featureConfigSchema,
  anomalyDetection: featureConfigSchema,
  payeeMatching: featureConfigSchema,
  statementExtraction: featureConfigSchema,
});

// Helper to normalize feature config (handles old string format)
function normalizeFeatureConfig(
  config: LLMFeatureConfig | string | undefined,
  defaultConfig: LLMFeatureConfig
): LLMFeatureConfig {
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

// Helper to normalize all feature modes
function normalizeFeatureModes(
  modes: Partial<Record<keyof LLMFeatureModes, LLMFeatureConfig | string>> | undefined
): LLMFeatureModes {
  return {
    categorySuggestion: normalizeFeatureConfig(
      modes?.categorySuggestion,
      DEFAULT_LLM_PREFERENCES.featureModes.categorySuggestion
    ),
    anomalyDetection: normalizeFeatureConfig(
      modes?.anomalyDetection,
      DEFAULT_LLM_PREFERENCES.featureModes.anomalyDetection
    ),
    payeeMatching: normalizeFeatureConfig(
      modes?.payeeMatching,
      DEFAULT_LLM_PREFERENCES.featureModes.payeeMatching
    ),
    statementExtraction: normalizeFeatureConfig(
      modes?.statementExtraction,
      DEFAULT_LLM_PREFERENCES.featureModes.statementExtraction
    ),
  };
}

// Helper to get masked provider config for client display
function getMaskedProviderConfig(
  config: LLMProviderConfig
): LLMProviderConfig & { hasApiKey: boolean } {
  let maskedApiKey: string | undefined;
  let hasApiKey = false;

  if (config.encryptedApiKey) {
    try {
      const decrypted = decryptApiKey(config.encryptedApiKey);
      maskedApiKey = maskApiKey(decrypted);
      hasApiKey = true;
    } catch {
      // Key decryption failed, treat as no key
    }
  }

  return {
    enabled: config.enabled,
    model: config.model,
    endpoint: config.endpoint,
    encryptedApiKey: maskedApiKey, // Return masked version for display
    hasApiKey,
  };
}

function normalizeOllamaEndpoint(
  rawEndpoint?: string
): { ok: true; endpoint: string } | { ok: false; error: string } {
  const raw = (rawEndpoint?.trim() || "http://localhost:11434").replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid Ollama endpoint URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Ollama endpoint must use http:// or https://" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Ollama endpoint must not include credentials" };
  }

  const normalizedHost = parsed.hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  if (!OLLAMA_LOOPBACK_HOSTS.has(normalizedHost)) {
    return { ok: false, error: "Ollama endpoint must use localhost or loopback address" };
  }

  return { ok: true, endpoint: parsed.origin };
}

export const llmSettingsRoutes = t.router({
  /**
   * Get LLM preferences for current workspace.
   * API keys are returned masked for security.
   */
  getPreferences: publicProcedure.query(async ({ ctx }) => {
    try {
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);

      const parsed = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
      const llm = parsed.llm ?? DEFAULT_LLM_PREFERENCES;

      // Mask API keys for client display (also adds hasApiKey field)
      const maskedProviders = {
        openai: getMaskedProviderConfig(
          llm.providers?.openai ?? DEFAULT_LLM_PREFERENCES.providers.openai
        ),
        anthropic: getMaskedProviderConfig(
          llm.providers?.anthropic ?? DEFAULT_LLM_PREFERENCES.providers.anthropic
        ),
        google: getMaskedProviderConfig(
          llm.providers?.google ?? DEFAULT_LLM_PREFERENCES.providers.google
        ),
        ollama: getMaskedProviderConfig(
          llm.providers?.ollama ?? DEFAULT_LLM_PREFERENCES.providers.ollama
        ),
      };

      return {
        enabled: llm.enabled ?? DEFAULT_LLM_PREFERENCES.enabled,
        defaultProvider: llm.defaultProvider ?? DEFAULT_LLM_PREFERENCES.defaultProvider,
        providers: maskedProviders,
        featureModes: normalizeFeatureModes(llm.featureModes),
      };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  /**
   * Update provider configuration including API key.
   * Uses public procedure since API keys are encrypted before storage.
   */
  updateProvider: publicProcedure
    .input(
      z.object({
        provider: llmProviderSchema,
        config: providerConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { provider, config } = input;

        // Validate API key format if provided (except for Ollama)
        if (config.apiKey && provider !== "ollama") {
          if (!validateApiKeyFormat(provider, config.apiKey)) {
            throw new Error(`Invalid API key format for ${provider}`);
          }
        }

        // Ollama's endpoint is user-supplied and later used as an outbound
        // fetch target. Restrict to loopback so a tenant cannot point the
        // server at an internal address (AWS IMDS, RFC1918 hosts, etc.).
        // Other providers' endpoints are either unused or hard-coded inside
        // the SDK, so their `endpoint` field is ignored for them.
        if (provider === "ollama" && config.endpoint) {
          const normalized = normalizeOllamaEndpoint(config.endpoint);
          if (!normalized.ok) {
            throw new Error(normalized.error);
          }
          config.endpoint = normalized.endpoint;
        }

        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentLLM = currentPrefs.llm ?? DEFAULT_LLM_PREFERENCES;

        // Prepare updated provider config
        const updatedProviderConfig: LLMProviderConfig = {
          enabled: config.enabled,
          model: config.model,
          endpoint: config.endpoint,
        };

        // Encrypt and store API key if provided
        if (config.apiKey) {
          updatedProviderConfig.encryptedApiKey = encryptApiKey(config.apiKey);
        } else if (currentLLM.providers?.[provider]?.encryptedApiKey) {
          // Keep existing encrypted key if no new one provided
          updatedProviderConfig.encryptedApiKey = currentLLM.providers[provider].encryptedApiKey;
        }

        const updatedLLM: LLMPreferences = {
          ...currentLLM,
          providers: {
            ...currentLLM.providers,
            [provider]: updatedProviderConfig,
          },
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              llm: updatedLLM,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return { success: true, provider };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Clear API key for a provider.
   */
  clearApiKey: secureOperationProcedure
    .input(z.object({ provider: llmProviderSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentLLM = currentPrefs.llm ?? DEFAULT_LLM_PREFERENCES;

        // Remove encrypted key and disable provider
        const updatedProvider: LLMProviderConfig = {
          enabled: false,
          model:
            currentLLM.providers?.[input.provider]?.model ??
            DEFAULT_LLM_PREFERENCES.providers[input.provider].model,
          endpoint: currentLLM.providers?.[input.provider]?.endpoint,
        };

        const updatedLLM: LLMPreferences = {
          ...currentLLM,
          providers: {
            ...currentLLM.providers,
            [input.provider]: updatedProvider,
          },
        };

        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({ ...currentPrefs, llm: updatedLLM }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Update feature modes (enhance/override/disabled) with optional per-feature provider.
   */
  updateFeatureModes: publicProcedure
    .input(featureModesSchema.partial())
    .mutation(async ({ ctx, input }) => {
      try {
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentLLM = currentPrefs.llm ?? DEFAULT_LLM_PREFERENCES;
        const currentModes = normalizeFeatureModes(currentLLM.featureModes);

        // Merge input with normalized current modes
        const updatedModes: LLMFeatureModes = {
          categorySuggestion: input.categorySuggestion ?? currentModes.categorySuggestion,
          anomalyDetection: input.anomalyDetection ?? currentModes.anomalyDetection,
          payeeMatching: input.payeeMatching ?? currentModes.payeeMatching,
          statementExtraction: input.statementExtraction ?? currentModes.statementExtraction,
        };

        const updatedLLM: LLMPreferences = {
          ...currentLLM,
          featureModes: updatedModes,
        };

        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({ ...currentPrefs, llm: updatedLLM }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedLLM.featureModes;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Toggle master LLM switch.
   */
  toggleLLM: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentLLM = currentPrefs.llm ?? DEFAULT_LLM_PREFERENCES;

        const updatedLLM: LLMPreferences = { ...currentLLM, enabled: input.enabled };

        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({ ...currentPrefs, llm: updatedLLM }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedLLM;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Set default provider.
   */
  setDefaultProvider: publicProcedure
    .input(z.object({ provider: llmProviderSchema.nullable() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentLLM = currentPrefs.llm ?? DEFAULT_LLM_PREFERENCES;

        const updatedLLM: LLMPreferences = { ...currentLLM, defaultProvider: input.provider };

        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({ ...currentPrefs, llm: updatedLLM }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedLLM;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Test API key connectivity.
   * Returns success status and available models.
   */
  testConnection: secureOperationProcedure
    .input(
      z.object({
        provider: llmProviderSchema,
        apiKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // For now, just validate format and return success
        // Full connection testing will be added when provider abstraction is complete
        if (input.apiKey && input.provider !== "ollama") {
          if (!validateApiKeyFormat(input.provider, input.apiKey)) {
            return {
              success: false,
              message: `Invalid API key format for ${input.provider}`,
              models: [],
            };
          }
        }

        return {
          success: true,
          message: `${input.provider} configuration valid`,
          models: LLM_MODELS[input.provider],
        };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Get available models for a provider.
   */
  getModels: publicProcedure
    .input(z.object({ provider: llmProviderSchema }))
    .query(async ({ input }) => {
      return LLM_MODELS[input.provider];
    }),

  /**
   * Fetch installed models from Ollama server.
   * Returns models installed on the user's Ollama instance.
   */
  getOllamaModels: publicProcedure
    .input(z.object({ endpoint: z.string().optional() }))
    .query(async ({ input }) => {
      const normalized = normalizeOllamaEndpoint(input.endpoint);
      if (!normalized.ok) {
        return {
          success: false,
          error: normalized.error,
          models: [],
        };
      }
      const endpoint = normalized.endpoint;

      try {
        const response = await fetch(`${endpoint}/api/tags`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          return {
            success: false,
            error: `Ollama server returned ${response.status}`,
            models: [],
          };
        }

        const data = await response.json();

        // Transform Ollama's model format to our ModelInfo format
        const models = (data.models || []).map(
          (m: {
            name: string;
            size?: number;
            modified_at?: string;
            details?: { parameter_size?: string; family?: string; quantization_level?: string };
          }) => {
            const baseName = m.name.split(":")[0];

            // Check if we have a hardcoded description for this model
            const knownModel = LLM_MODELS.ollama.find(
              (known) =>
                known.id === m.name ||
                known.id === baseName ||
                baseName.startsWith(known.id.split(".")[0])
            );

            // Generate a helpful description from model details
            let description = "Local Ollama model";
            if (knownModel) {
              description = knownModel.description;
            } else if (m.details) {
              const parts: string[] = [];
              if (m.details.parameter_size) parts.push(m.details.parameter_size);
              if (m.details.quantization_level) parts.push(m.details.quantization_level);
              if (m.details.family) parts.push(`${m.details.family} family`);
              if (parts.length > 0) {
                description = parts.join(" · ");
              }
            }

            return {
              id: m.name,
              name: baseName,
              description,
              recommended:
                knownModel && "recommended" in knownModel ? knownModel.recommended : undefined,
            };
          }
        );

        return { success: true, models, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to connect to Ollama";
        return {
          success: false,
          error: `Cannot connect to Ollama at ${endpoint}: ${message}`,
          models: [],
        };
      }
    }),

  /**
   * Get intelligence status for the workspace.
   * Shows what's available (ML, LLM, both) for each feature.
   */
  getIntelligenceStatus: publicProcedure.query(async ({ ctx }) => {
    try {
      const { createIntelligenceCoordinator } = await import("$core/server/ai");

      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);

      const prefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
      const coordinator = createIntelligenceCoordinator(prefs);
      const summary = coordinator.getSummary();

      // Get strategy for each feature. `forecasting` is ML-only now,
      // so it's no longer a coordinator-managed feature.
      const features = {
        categorySuggestion: coordinator.getStrategy("categorySuggestion"),
        anomalyDetection: coordinator.getStrategy("anomalyDetection"),
        payeeMatching: coordinator.getStrategy("payeeMatching"),
      };

      return {
        mlEnabled: summary.mlMasterEnabled,
        llmEnabled: summary.llmMasterEnabled,
        defaultProvider: summary.defaultProvider,
        features: Object.fromEntries(
          Object.entries(features).map(([key, strategy]) => [
            key,
            {
              strategy: strategy.strategy,
              useML: strategy.useML,
              useLLM: strategy.useLLM,
              mode: strategy.featureMode,
            },
          ])
        ),
      };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
});
