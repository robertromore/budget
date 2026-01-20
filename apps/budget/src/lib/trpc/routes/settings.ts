import {
  DEFAULT_INTELLIGENCE_INPUT_PREFERENCES,
  DEFAULT_ML_PREFERENCES,
  DEFAULT_WEB_SEARCH_PREFERENCES,
  type IntelligenceInputPreferences,
  type MLPreferences,
  type WebSearchPreferences,
  type WebSearchProvider,
  workspaces,
} from "$lib/schema/workspaces";
import { db } from "$lib/server/db";
import { encryptApiKey } from "$lib/server/shared/security/encryption";
import { publicProcedure, secureOperationProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { nowISOString } from "$lib/utils/dates";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";

// Zod schema for ML preferences validation
const mlFeaturesSchema = z.object({
  forecasting: z.boolean(),
  anomalyDetection: z.boolean(),
  similarity: z.boolean(),
  userBehavior: z.boolean(),
});

const mlConfigSchema = z.object({
  anomalySensitivity: z.enum(["low", "medium", "high"]),
  forecastHorizon: z.number().min(7).max(365),
  similarityThreshold: z.number().min(0).max(1),
});

const mlDuplicateDetectionSchema = z.object({
  defaultMethod: z.enum(["simple", "ml", "llm", "llm_direct"]),
});

const mlPreferencesSchema = z.object({
  enabled: z.boolean(),
  features: mlFeaturesSchema,
  config: mlConfigSchema,
  duplicateDetection: mlDuplicateDetectionSchema,
});

// Zod schema for Web Search preferences validation
const webSearchPreferencesSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["duckduckgo", "brave", "ollama"]),
  braveApiKey: z.string().optional(),
  ollamaCloudApiKey: z.string().optional(),
});

// Zod schema for Intelligence Input preferences validation
const intelligenceInputPreferencesSchema = z.object({
  enabled: z.boolean(),
  showInHeader: z.boolean(),
  defaultMode: z.enum(["ml", "llm", "auto"]),
  fieldModes: z.record(z.string(), z.enum(["ml", "llm"])),
});

export const settingsRoutes = t.router({
  /**
   * Delete all data from all user tables.
   * This is a destructive operation that cannot be undone.
   * Preserves auth-related tables (user, session, auth_account, verification).
   */
  deleteAllData: secureOperationProcedure.mutation(async () => {
    try {
      // Tables to preserve (auth-related tables that should not be deleted)
      const protectedTables = new Set([
        "user",           // User accounts
        "session",        // Auth sessions
        "auth_account",   // OAuth accounts (Better Auth)
        "verification",   // Email/password verification tokens
      ]);

      // Get all table names from sqlite_master
      const allTables = await db.all<{ name: string }>(sql`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '__drizzle%'
        ORDER BY name
      `);

      // Filter out protected auth tables
      const tableNames = allTables
        .map((t) => t.name)
        .filter((name) => !protectedTables.has(name));

      if (tableNames.length === 0) {
        return { deleted: 0, tables: [] };
      }

      // Disable foreign keys temporarily
      await db.run(sql`PRAGMA foreign_keys = OFF`);

      try {
        // Delete from all tables (except protected ones)
        for (const tableName of tableNames) {
          await db.run(sql.raw(`DELETE FROM "${tableName}"`));
        }

        // Reset autoincrement sequences
        await db.run(sql`DELETE FROM sqlite_sequence`);
      } finally {
        // Re-enable foreign keys (even on error)
        await db.run(sql`PRAGMA foreign_keys = ON`);
      }

      return {
        deleted: tableNames.length,
        tables: tableNames,
      };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  /**
   * Get ML preferences for current workspace
   */
  getMLPreferences: publicProcedure.query(async ({ ctx }) => {
    try {
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);

      if (!workspace) {
        return DEFAULT_ML_PREFERENCES;
      }

      const parsed = workspace.preferences ? JSON.parse(workspace.preferences) : {};

      // Deep merge with defaults to ensure all fields exist
      const ml: MLPreferences = {
        enabled: parsed.ml?.enabled ?? DEFAULT_ML_PREFERENCES.enabled,
        features: {
          forecasting: parsed.ml?.features?.forecasting ?? DEFAULT_ML_PREFERENCES.features.forecasting,
          anomalyDetection:
            parsed.ml?.features?.anomalyDetection ?? DEFAULT_ML_PREFERENCES.features.anomalyDetection,
          similarity: parsed.ml?.features?.similarity ?? DEFAULT_ML_PREFERENCES.features.similarity,
          userBehavior: parsed.ml?.features?.userBehavior ?? DEFAULT_ML_PREFERENCES.features.userBehavior,
        },
        config: {
          anomalySensitivity:
            parsed.ml?.config?.anomalySensitivity ?? DEFAULT_ML_PREFERENCES.config.anomalySensitivity,
          forecastHorizon: parsed.ml?.config?.forecastHorizon ?? DEFAULT_ML_PREFERENCES.config.forecastHorizon,
          similarityThreshold:
            parsed.ml?.config?.similarityThreshold ?? DEFAULT_ML_PREFERENCES.config.similarityThreshold,
        },
        duplicateDetection: {
          defaultMethod:
            parsed.ml?.duplicateDetection?.defaultMethod ?? DEFAULT_ML_PREFERENCES.duplicateDetection.defaultMethod,
        },
      };

      return ml;
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  /**
   * Update ML preferences for current workspace
   */
  updateMLPreferences: publicProcedure
    .input(mlPreferencesSchema.partial())
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};

        // Deep merge ML preferences
        const currentML = currentPrefs.ml ?? DEFAULT_ML_PREFERENCES;
        const updatedML: MLPreferences = {
          enabled: input.enabled ?? currentML.enabled,
          features: {
            forecasting: input.features?.forecasting ?? currentML.features?.forecasting ?? true,
            anomalyDetection:
              input.features?.anomalyDetection ?? currentML.features?.anomalyDetection ?? true,
            similarity: input.features?.similarity ?? currentML.features?.similarity ?? true,
            userBehavior: input.features?.userBehavior ?? currentML.features?.userBehavior ?? true,
          },
          config: {
            anomalySensitivity:
              input.config?.anomalySensitivity ?? currentML.config?.anomalySensitivity ?? "medium",
            forecastHorizon: input.config?.forecastHorizon ?? currentML.config?.forecastHorizon ?? 30,
            similarityThreshold:
              input.config?.similarityThreshold ?? currentML.config?.similarityThreshold ?? 0.6,
          },
          duplicateDetection: {
            defaultMethod:
              input.duplicateDetection?.defaultMethod ?? currentML.duplicateDetection?.defaultMethod ?? "ml",
          },
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              ml: updatedML,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedML;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Toggle master ML switch
   */
  toggleML: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentML = currentPrefs.ml ?? DEFAULT_ML_PREFERENCES;

        const updatedML: MLPreferences = {
          ...currentML,
          enabled: input.enabled,
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              ml: updatedML,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedML;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Get Web Search preferences for current workspace
   */
  getWebSearchPreferences: publicProcedure.query(async ({ ctx }) => {
    try {
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);

      if (!workspace) {
        return {
          enabled: DEFAULT_WEB_SEARCH_PREFERENCES.enabled,
          provider: DEFAULT_WEB_SEARCH_PREFERENCES.provider,
          hasBraveApiKey: false,
          hasOllamaCloudApiKey: false,
        };
      }

      const parsed = workspace.preferences ? JSON.parse(workspace.preferences) : {};

      // Deep merge with defaults to ensure all fields exist
      const webSearch: WebSearchPreferences = {
        enabled: parsed.webSearch?.enabled ?? DEFAULT_WEB_SEARCH_PREFERENCES.enabled,
        provider: parsed.webSearch?.provider ?? DEFAULT_WEB_SEARCH_PREFERENCES.provider,
        encryptedBraveApiKey: parsed.webSearch?.encryptedBraveApiKey,
        encryptedOllamaCloudApiKey: parsed.webSearch?.encryptedOllamaCloudApiKey,
      };

      // Return client-safe version (don't expose encrypted keys, just whether they exist)
      return {
        enabled: webSearch.enabled,
        provider: webSearch.provider,
        hasBraveApiKey: Boolean(webSearch.encryptedBraveApiKey),
        hasOllamaCloudApiKey: Boolean(webSearch.encryptedOllamaCloudApiKey),
      };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  /**
   * Update Web Search preferences for current workspace
   */
  updateWebSearchPreferences: publicProcedure
    .input(webSearchPreferencesSchema.partial())
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentWebSearch = currentPrefs.webSearch ?? DEFAULT_WEB_SEARCH_PREFERENCES;

        // Build updated web search preferences
        const updatedWebSearch: WebSearchPreferences = {
          enabled: input.enabled ?? currentWebSearch.enabled,
          provider: (input.provider as WebSearchProvider) ?? currentWebSearch.provider,
          // Only update API keys if provided (encrypt before storing)
          encryptedBraveApiKey:
            input.braveApiKey !== undefined
              ? input.braveApiKey ? encryptApiKey(input.braveApiKey) : undefined // Empty string clears the key
              : currentWebSearch.encryptedBraveApiKey,
          encryptedOllamaCloudApiKey:
            input.ollamaCloudApiKey !== undefined
              ? input.ollamaCloudApiKey ? encryptApiKey(input.ollamaCloudApiKey) : undefined
              : currentWebSearch.encryptedOllamaCloudApiKey,
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              webSearch: updatedWebSearch,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return {
          enabled: updatedWebSearch.enabled,
          provider: updatedWebSearch.provider,
          hasBraveApiKey: Boolean(updatedWebSearch.encryptedBraveApiKey),
          hasOllamaCloudApiKey: Boolean(updatedWebSearch.encryptedOllamaCloudApiKey),
        };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Toggle Web Search feature
   */
  toggleWebSearch: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentWebSearch = currentPrefs.webSearch ?? DEFAULT_WEB_SEARCH_PREFERENCES;

        const updatedWebSearch: WebSearchPreferences = {
          ...currentWebSearch,
          enabled: input.enabled,
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              webSearch: updatedWebSearch,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return {
          enabled: updatedWebSearch.enabled,
          provider: updatedWebSearch.provider,
          hasBraveApiKey: Boolean(updatedWebSearch.encryptedBraveApiKey),
          hasOllamaCloudApiKey: Boolean(updatedWebSearch.encryptedOllamaCloudApiKey),
        };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Get Intelligence Input preferences for current workspace
   */
  getIntelligenceInputPreferences: publicProcedure.query(async ({ ctx }) => {
    try {
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);

      if (!workspace) {
        return DEFAULT_INTELLIGENCE_INPUT_PREFERENCES;
      }

      const parsed = workspace.preferences ? JSON.parse(workspace.preferences) : {};

      // Deep merge with defaults to ensure all fields exist
      const intelligenceInput: IntelligenceInputPreferences = {
        enabled: parsed.intelligenceInput?.enabled ?? DEFAULT_INTELLIGENCE_INPUT_PREFERENCES.enabled,
        showInHeader:
          parsed.intelligenceInput?.showInHeader ?? DEFAULT_INTELLIGENCE_INPUT_PREFERENCES.showInHeader,
        defaultMode:
          parsed.intelligenceInput?.defaultMode ?? DEFAULT_INTELLIGENCE_INPUT_PREFERENCES.defaultMode,
        fieldModes: parsed.intelligenceInput?.fieldModes ?? DEFAULT_INTELLIGENCE_INPUT_PREFERENCES.fieldModes,
      };

      return intelligenceInput;
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  /**
   * Update Intelligence Input preferences for current workspace
   */
  updateIntelligenceInputPreferences: publicProcedure
    .input(intelligenceInputPreferencesSchema.partial())
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentIntelligenceInput = currentPrefs.intelligenceInput ?? DEFAULT_INTELLIGENCE_INPUT_PREFERENCES;

        // Build updated intelligence input preferences
        const updatedIntelligenceInput: IntelligenceInputPreferences = {
          enabled: input.enabled ?? currentIntelligenceInput.enabled,
          showInHeader: input.showInHeader ?? currentIntelligenceInput.showInHeader,
          defaultMode: input.defaultMode ?? currentIntelligenceInput.defaultMode,
          fieldModes: input.fieldModes ?? currentIntelligenceInput.fieldModes,
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              intelligenceInput: updatedIntelligenceInput,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedIntelligenceInput;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Toggle Intelligence Input feature
   */
  toggleIntelligenceInput: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentIntelligenceInput = currentPrefs.intelligenceInput ?? DEFAULT_INTELLIGENCE_INPUT_PREFERENCES;

        const updatedIntelligenceInput: IntelligenceInputPreferences = {
          ...currentIntelligenceInput,
          enabled: input.enabled,
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              intelligenceInput: updatedIntelligenceInput,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedIntelligenceInput;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Update field mode for a specific field in Intelligence Input
   */
  setIntelligenceInputFieldMode: publicProcedure
    .input(
      z.object({
        fieldId: z.string(),
        mode: z.enum(["ml", "llm"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
        const currentIntelligenceInput = currentPrefs.intelligenceInput ?? DEFAULT_INTELLIGENCE_INPUT_PREFERENCES;

        const updatedIntelligenceInput: IntelligenceInputPreferences = {
          ...currentIntelligenceInput,
          fieldModes: {
            ...currentIntelligenceInput.fieldModes,
            [input.fieldId]: input.mode,
          },
        };

        // Update workspace
        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify({
              ...currentPrefs,
              intelligenceInput: updatedIntelligenceInput,
            }),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, ctx.workspaceId));

        return updatedIntelligenceInput;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
