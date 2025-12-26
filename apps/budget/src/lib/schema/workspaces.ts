import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { budgetAutomationSettings } from "./budget-automation-settings";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { categoryGroups } from "./category-groups";
import { detectedPatterns } from "./detected-patterns";
import { importProfiles } from "./import-profiles";
import { payeeCategoryCorrections } from "./payee-category-corrections";
import { payees } from "./payees";
import { schedules } from "./schedules";
import { users } from "./users";
import { views } from "./views";
import type { OnboardingFormData, OnboardingStatus } from "$lib/types/onboarding";

export const workspaces = sqliteTable(
  "workspace",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Basic Info
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull().unique(),

    // Ownership - links to workspace_members for full membership
    ownerId: text("owner_id").references(() => users.id),

    // Workspace Preferences (stored as JSON)
    preferences: text("preferences"), // {locale, dateFormat, currency, theme, etc.}

    // Metadata
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"), // Soft delete support
  },
  (table) => [
    index("workspace_slug_idx").on(table.slug),
    index("workspace_deleted_at_idx").on(table.deletedAt),
    index("workspace_owner_id_idx").on(table.ownerId),
  ]
);

// Detection method for duplicate payee detection
// - simple: Basic Levenshtein distance
// - ml: Pattern-aware ML matching (recommended)
// - llm: ML pre-filter + LLM refinement (smart filter)
// - llm_direct: Direct LLM analysis of all pairs (bypasses ML pre-filter)
export type DuplicateDetectionMethod = "simple" | "ml" | "llm" | "llm_direct";

// ML Preferences type
export interface MLPreferences {
  enabled: boolean; // Master toggle for all ML features
  features: {
    forecasting: boolean; // Time series forecasting
    anomalyDetection: boolean; // Transaction anomaly scoring
    similarity: boolean; // Payee matching & canonicalization
    userBehavior: boolean; // Acceptance prediction
  };
  config: {
    anomalySensitivity: "low" | "medium" | "high";
    forecastHorizon: number; // days (default: 30)
    similarityThreshold: number; // 0-1 (default: 0.6)
  };
  duplicateDetection: {
    defaultMethod: DuplicateDetectionMethod; // Default algorithm for duplicate detection
  };
}

export const DEFAULT_ML_PREFERENCES: MLPreferences = {
  enabled: true,
  features: {
    forecasting: true,
    anomalyDetection: true,
    similarity: true,
    userBehavior: true,
  },
  config: {
    anomalySensitivity: "medium",
    forecastHorizon: 30,
    similarityThreshold: 0.6,
  },
  duplicateDetection: {
    defaultMethod: "ml", // ML provides best balance of speed and accuracy
  },
};

// LLM Provider types
export type LLMProvider = "openai" | "anthropic" | "google" | "ollama";

// LLM Mode for each feature
export type LLMFeatureMode = "disabled" | "enhance" | "override";

// Provider configuration interface (stored in database)
export interface LLMProviderConfig {
  enabled: boolean;
  encryptedApiKey?: string; // Stored encrypted in database
  model: string; // Selected model ID
  endpoint?: string; // Custom endpoint (required for Ollama)
}

// Provider configuration for client display (includes computed hasApiKey)
export interface LLMProviderClientConfig extends LLMProviderConfig {
  hasApiKey: boolean; // Computed field - true if API key is stored
}

// Per-feature configuration (mode + optional provider override)
export interface LLMFeatureConfig {
  mode: LLMFeatureMode;
  provider: LLMProvider | null; // null = use default provider
}

// Per-feature LLM settings
export interface LLMFeatureModes {
  transactionParsing: LLMFeatureConfig;
  categorySuggestion: LLMFeatureConfig;
  anomalyDetection: LLMFeatureConfig;
  forecasting: LLMFeatureConfig;
  payeeMatching: LLMFeatureConfig;
}

// Main LLM preferences interface
export interface LLMPreferences {
  enabled: boolean; // Master toggle for LLM features
  defaultProvider: LLMProvider | null; // Primary provider to use
  providers: {
    openai: LLMProviderConfig;
    anthropic: LLMProviderConfig;
    google: LLMProviderConfig;
    ollama: LLMProviderConfig;
  };
  featureModes: LLMFeatureModes;
}

// Default LLM preferences
export const DEFAULT_LLM_PREFERENCES: LLMPreferences = {
  enabled: false,
  defaultProvider: null,
  providers: {
    openai: { enabled: false, model: "gpt-4.1-mini" },
    anthropic: { enabled: false, model: "claude-haiku-4-5-20251015" },
    google: { enabled: false, model: "gemini-3-flash" },
    ollama: { enabled: false, model: "llama3.3", endpoint: "http://localhost:11434" },
  },
  featureModes: {
    transactionParsing: { mode: "disabled", provider: null },
    categorySuggestion: { mode: "disabled", provider: null },
    anomalyDetection: { mode: "disabled", provider: null },
    forecasting: { mode: "disabled", provider: null },
    payeeMatching: { mode: "disabled", provider: null },
  },
};

// Web Search Provider types
export type WebSearchProvider = "duckduckgo" | "brave" | "ollama";

// Web Search preferences interface
export interface WebSearchPreferences {
  enabled: boolean;
  provider: WebSearchProvider;
  encryptedBraveApiKey?: string; // Brave Search API key (encrypted)
  encryptedOllamaCloudApiKey?: string; // Ollama cloud API key for web search (encrypted)
}

// Default Web Search preferences
export const DEFAULT_WEB_SEARCH_PREFERENCES: WebSearchPreferences = {
  enabled: true,
  provider: "duckduckgo",
};

// Intelligence Input Mode preferences
export interface IntelligenceInputPreferences {
  enabled: boolean; // Whether intelligence input mode is available
  showInHeader: boolean; // Show button in header
  defaultMode: "ml" | "llm" | "auto"; // Default mode for fields without memory
  fieldModes: Record<string, "ml" | "llm">; // Per-field mode memory
}

// Default Intelligence Input preferences
export const DEFAULT_INTELLIGENCE_INPUT_PREFERENCES: IntelligenceInputPreferences = {
  enabled: true,
  showInHeader: true,
  defaultMode: "auto",
  fieldModes: {},
};

// Preferences type
export interface WorkspacePreferences {
  locale?: string; // 'en-US', 'es-ES', etc.
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  currency?: "USD" | "EUR" | "GBP" | "JPY" | string;
  theme?: "light" | "dark" | "system";
  timezone?: string;
  ml?: MLPreferences; // ML/Intelligence settings
  llm?: LLMPreferences; // LLM provider settings
  webSearch?: WebSearchPreferences; // Web search settings for contact enrichment
  intelligenceInput?: IntelligenceInputPreferences; // Intelligence input mode settings
  onboarding?: OnboardingStatus; // Onboarding wizard/tour completion status
  onboardingData?: OnboardingFormData; // Financial profile data from onboarding wizard
}

// Zod schemas
export const selectWorkspaceSchema = createSelectSchema(workspaces);
export const insertWorkspaceSchema = createInsertSchema(workspaces, {
  displayName: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Display name is required")
          .min(2, "Display name must be at least 2 characters")
          .max(50, "Display name must be less than 50 characters")
      ),
  slug: (schema) =>
    schema
      .transform((val) => val?.trim()?.toLowerCase())
      .pipe(
        z
          .string()
          .min(2, "Slug must be at least 2 characters")
          .max(30, "Slug must be less than 30 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      ),
  preferences: (schema) =>
    schema
      .transform((val) => {
        if (typeof val === "string") return val;
        if (typeof val === "object") return JSON.stringify(val);
        return null;
      })
      .optional()
      .nullable(),
});

export const formInsertWorkspaceSchema = insertWorkspaceSchema.omit({
  id: true,
  cuid: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Import workspace member types for relations (avoid circular dependency)
// Note: workspaceMembers and workspaceInvitations imported dynamically in relations

// Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  // Ownership
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  // Entity relations
  accounts: many(accounts),
  categories: many(categories),
  categoryGroups: many(categoryGroups),
  payees: many(payees),
  budgets: many(budgets),
  schedules: many(schedules),
  views: many(views),
  budgetAutomationSettings: many(budgetAutomationSettings),
  detectedPatterns: many(detectedPatterns),
  payeeCategoryCorrections: many(payeeCategoryCorrections),
  importProfiles: many(importProfiles),
}));

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type InsertWorkspaceSchema = typeof insertWorkspaceSchema;
export type FormInsertWorkspaceSchema = z.infer<typeof formInsertWorkspaceSchema>;
