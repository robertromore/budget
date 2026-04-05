import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { payees } from "./payees";
import { workspaces } from "./workspaces";

// Intelligence mode types matching the UI component
export const intelligenceModes = ["none", "ml", "llm"] as const;
export type IntelligenceMode = (typeof intelligenceModes)[number];

// Fields that can be AI-enhanced
export const enhanceableFields = [
  // Basic info fields
  "name",
  "payeeType",
  "paymentFrequency",
  "defaultCategoryId",
  "taxRelevant",
  "isSeasonal",
  // Business fields
  "merchantCategoryCode",
  "tags",
  "preferredPaymentMethods",
  // Contact fields
  "phone",
  "email",
  "website",
  "address",
] as const;
export type EnhanceableField = (typeof enhanceableFields)[number];

// LLM providers for tracking which model was used
export const llmProviders = [
  "openai",
  "anthropic",
  "google",
  "ollama",
  "openrouter",
  "groq",
  "lmstudio",
] as const;
export type LlmProvider = (typeof llmProviders)[number];

/**
 * Payee AI Enhancements Table
 *
 * Tracks AI/ML enhancements applied to payee fields for:
 * - Persistence of enhancement history
 * - Learning from user corrections/modifications
 * - Confidence calibration over time
 * - Analytics and reporting
 */
export const payeeAiEnhancements = sqliteTable(
  "payee_ai_enhancements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    payeeId: integer("payee_id")
      .notNull()
      .references(() => payees.id, { onDelete: "cascade" }),

    // Enhancement details
    fieldName: text("field_name", { enum: enhanceableFields }).notNull(),
    mode: text("mode", { enum: ["ml", "llm"] as const }).notNull(), // Only ml/llm (not 'none')

    // Value tracking
    originalValue: text("original_value", { mode: "json" }).$type<unknown>(),
    suggestedValue: text("suggested_value", { mode: "json" }).$type<unknown>(),
    appliedValue: text("applied_value", { mode: "json" }).$type<unknown>(),

    // Confidence and provider tracking
    confidence: real("confidence"), // 0-1 scale
    provider: text("provider", { enum: llmProviders }),
    modelId: text("model_id"), // Specific model like "gpt-4o", "claude-3-5-sonnet"

    // User feedback
    wasAccepted: integer("was_accepted", { mode: "boolean" }).default(true).notNull(),
    wasModified: integer("was_modified", { mode: "boolean" }).default(false).notNull(),

    // Timestamps
    enhancedAt: text("enhanced_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    // Primary lookup indexes
    index("payee_ai_enhancements_workspace_idx").on(table.workspaceId),
    index("payee_ai_enhancements_payee_idx").on(table.payeeId),
    index("payee_ai_enhancements_field_idx").on(table.fieldName),

    // Mode and provider indexes
    index("payee_ai_enhancements_mode_idx").on(table.mode),
    index("payee_ai_enhancements_provider_idx").on(table.provider),

    // Composite indexes for common queries
    index("payee_ai_enhancements_payee_field_idx").on(table.payeeId, table.fieldName),
    index("payee_ai_enhancements_payee_enhanced_idx").on(table.payeeId, table.enhancedAt),
    index("payee_ai_enhancements_field_mode_idx").on(table.fieldName, table.mode),

    // Feedback analysis indexes
    index("payee_ai_enhancements_accepted_idx").on(table.wasAccepted),
    index("payee_ai_enhancements_modified_idx").on(table.wasModified),
    index("payee_ai_enhancements_confidence_idx").on(table.confidence),

    // Analytics indexes
    index("payee_ai_enhancements_provider_confidence_idx").on(table.provider, table.confidence),
    index("payee_ai_enhancements_mode_confidence_idx").on(table.mode, table.confidence),
  ]
);

export const payeeAiEnhancementsRelations = relations(payeeAiEnhancements, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [payeeAiEnhancements.workspaceId],
    references: [workspaces.id],
  }),
  payee: one(payees, {
    fields: [payeeAiEnhancements.payeeId],
    references: [payees.id],
  }),
}));

// Zod schemas for validation
export const selectPayeeAiEnhancementSchema = createSelectSchema(payeeAiEnhancements);
export const insertPayeeAiEnhancementSchema = createInsertSchema(payeeAiEnhancements);

export const formInsertPayeeAiEnhancementSchema = createInsertSchema(payeeAiEnhancements, {
  workspaceId: (schema) => schema.optional(),
  payeeId: (schema) => schema.positive("Invalid payee ID"),
  fieldName: (schema) => schema,
  mode: (schema) => schema,
  originalValue: (schema) => schema.optional().nullable(),
  suggestedValue: (schema) => schema.optional().nullable(),
  appliedValue: (schema) => schema.optional().nullable(),
  confidence: (schema) => schema.min(0).max(1).optional().nullable(),
  provider: (schema) => schema.optional().nullable(),
  modelId: (schema) => schema.optional().nullable(),
  wasAccepted: (schema) => schema.default(true),
  wasModified: (schema) => schema.default(false),
});

// API schemas
export const recordEnhancementSchema = z.object({
  payeeId: z.number().positive(),
  fieldName: z.enum(enhanceableFields),
  mode: z.enum(["ml", "llm"]),
  originalValue: z.unknown().optional(),
  suggestedValue: z.unknown(),
  appliedValue: z.unknown().optional(),
  confidence: z.number().min(0).max(1).optional(),
  provider: z.enum(llmProviders).optional(),
  modelId: z.string().optional(),
});

export const updateEnhancementFeedbackSchema = z.object({
  enhancementId: z.number().positive(),
  wasAccepted: z.boolean(),
  wasModified: z.boolean(),
  appliedValue: z.unknown().optional(),
});

export const getPayeeEnhancementsSchema = z.object({
  payeeId: z.number().positive(),
  fieldName: z.enum(enhanceableFields).optional(),
  limit: z.number().positive().default(50),
});

export const getEnhancementStatsSchema = z.object({
  payeeId: z.number().positive().optional(),
  timeframeMonths: z.number().positive().default(6),
});

// Type exports
export type PayeeAiEnhancement = typeof payeeAiEnhancements.$inferSelect;
export type NewPayeeAiEnhancement = typeof payeeAiEnhancements.$inferInsert;
export type RecordEnhancementSchema = typeof recordEnhancementSchema;
export type UpdateEnhancementFeedbackSchema = typeof updateEnhancementFeedbackSchema;
export type GetPayeeEnhancementsSchema = typeof getPayeeEnhancementsSchema;
export type GetEnhancementStatsSchema = typeof getEnhancementStatsSchema;

// Note: PayeeAiPreferences is defined in payees.ts for the database column
// It uses flexible Record<string, ...> types for JSON compatibility

// Enhancement summary for UI display
export interface FieldEnhancementInfo {
  fieldName: EnhanceableField;
  isEnhanced: boolean;
  lastEnhancedAt?: string;
  lastMode?: "ml" | "llm";
  lastConfidence?: number;
  enhancementCount: number;
}

// Analytics interfaces
export interface EnhancementStats {
  totalEnhancements: number;
  byMode: { ml: number; llm: number };
  byField: Partial<Record<EnhanceableField, number>>;
  acceptanceRate: number;
  modificationRate: number;
  averageConfidence: number;
  confidenceByProvider: Partial<Record<LlmProvider, number>>;
}
