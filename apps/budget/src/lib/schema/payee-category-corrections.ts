import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categories } from "./categories";
import { payees } from "./payees";
import { transactions } from "./transactions";
import { workspaces } from "./workspaces";

// Enum definitions for correction context
export const correctionTriggers = [
  "manual_user_correction",
  "transaction_creation",
  "bulk_categorization",
  "import_correction",
  "scheduled_transaction",
  "import_category_override", // User overrode AI suggestion during import
  "ai_suggestion_accepted",   // User accepted AI suggestion during import (positive reinforcement)
] as const;

export const correctionContexts = [
  "transaction_amount_low",
  "transaction_amount_medium",
  "transaction_amount_high",
  "seasonal_period",
  "weekend_transaction",
  "weekday_transaction",
  "first_time_payee",
  "recurring_payee",
] as const;

export type CorrectionTrigger = (typeof correctionTriggers)[number];
export type CorrectionContext = (typeof correctionContexts)[number];

/**
 * Payee Category Corrections Table
 *
 * Tracks user corrections to payee categorization for machine learning
 * and category intelligence. Each record represents a user's decision
 * to change a category assignment, along with contextual metadata.
 */
export const payeeCategoryCorrections = sqliteTable(
  "payee_category_corrections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Core correction data
    payeeId: integer("payee_id")
      .notNull()
      .references(() => payees.id),
    transactionId: integer("transaction_id").references(() => transactions.id),

    // Category change details
    fromCategoryId: integer("from_category_id").references(() => categories.id),
    toCategoryId: integer("to_category_id")
      .notNull()
      .references(() => categories.id),

    // Context and trigger information
    correctionTrigger: text("correction_trigger", { enum: correctionTriggers }).notNull(),
    correctionContext: text("correction_context", { enum: correctionContexts }),

    // Transaction context for learning
    transactionAmount: real("transaction_amount"),
    transactionDate: text("transaction_date"),

    // Pattern learning metadata
    userConfidence: integer("user_confidence"), // 1-10 scale for user certainty
    systemConfidence: real("system_confidence"), // 0-1 previous AI confidence
    correctionWeight: real("correction_weight").default(1.0).notNull(), // Learning weight

    // Pattern analysis fields
    amountRange: text("amount_range", { mode: "json" }), // {min, max} for amount clustering
    temporalContext: text("temporal_context", { mode: "json" }), // Season, day of week, etc.
    payeePatternContext: text("payee_pattern_context", { mode: "json" }), // Frequency, regularity

    // Learning state tracking
    isProcessed: integer("is_processed", { mode: "boolean" }).default(false).notNull(),
    processedAt: text("processed_at"),
    learningEpoch: integer("learning_epoch").default(1).notNull(), // For model versioning

    // Administrative fields
    notes: text("notes"),
    isOverride: integer("is_override", { mode: "boolean" }).default(false).notNull(), // Permanent override

    // Timestamps
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    // Primary lookup indexes
    index("payee_corrections_workspace_id_idx").on(table.workspaceId),
    index("payee_corrections_payee_idx").on(table.payeeId),
    index("payee_corrections_transaction_idx").on(table.transactionId),
    index("payee_corrections_from_category_idx").on(table.fromCategoryId),
    index("payee_corrections_to_category_idx").on(table.toCategoryId),

    // Learning pattern indexes
    index("payee_corrections_trigger_idx").on(table.correctionTrigger),
    index("payee_corrections_context_idx").on(table.correctionContext),
    index("payee_corrections_processed_idx").on(table.isProcessed),
    index("payee_corrections_learning_epoch_idx").on(table.learningEpoch),

    // Temporal analysis indexes
    index("payee_corrections_date_idx").on(table.transactionDate),
    index("payee_corrections_amount_idx").on(table.transactionAmount),

    // Composite indexes for pattern analysis
    index("payee_corrections_payee_category_idx").on(table.payeeId, table.toCategoryId),
    index("payee_corrections_payee_amount_idx").on(table.payeeId, table.transactionAmount),
    index("payee_corrections_payee_date_idx").on(table.payeeId, table.transactionDate),
    index("payee_corrections_category_change_idx").on(table.fromCategoryId, table.toCategoryId),

    // Learning efficiency indexes
    index("payee_corrections_unprocessed_idx").on(table.isProcessed, table.createdAt),
    index("payee_corrections_pattern_analysis_idx").on(
      table.payeeId,
      table.isProcessed,
      table.learningEpoch
    ),

    // Administrative indexes
    index("payee_corrections_deleted_at_idx").on(table.deletedAt),
    index("payee_corrections_override_idx").on(table.isOverride),
  ]
);

export const payeeCategoryCorrectionsRelations = relations(payeeCategoryCorrections, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [payeeCategoryCorrections.workspaceId],
    references: [workspaces.id],
  }),
  payee: one(payees, {
    fields: [payeeCategoryCorrections.payeeId],
    references: [payees.id],
  }),
  transaction: one(transactions, {
    fields: [payeeCategoryCorrections.transactionId],
    references: [transactions.id],
  }),
  fromCategory: one(categories, {
    fields: [payeeCategoryCorrections.fromCategoryId],
    references: [categories.id],
    relationName: "fromCategory",
  }),
  toCategory: one(categories, {
    fields: [payeeCategoryCorrections.toCategoryId],
    references: [categories.id],
    relationName: "toCategory",
  }),
}));

// Zod schemas for validation
export const selectPayeeCategoryCorrectionSchema = createSelectSchema(payeeCategoryCorrections);
export const insertPayeeCategoryCorrectionSchema = createInsertSchema(payeeCategoryCorrections);

export const formInsertPayeeCategoryCorrectionSchema = createInsertSchema(
  payeeCategoryCorrections,
  {
    workspaceId: (schema) => schema.optional(),
    payeeId: (schema) => schema.positive("Invalid payee ID"),
    transactionId: (schema) => schema.positive("Invalid transaction ID").optional().nullable(),
    toCategoryId: (schema) => schema.positive("Invalid category ID"),
    fromCategoryId: (schema) => schema.positive("Invalid category ID").optional().nullable(),

    correctionTrigger: (schema) => schema,
    correctionContext: (schema) => schema.optional().nullable(),

    transactionAmount: (schema) => schema.optional().nullable(),
    transactionDate: (schema) => schema.optional().nullable(),

    userConfidence: (schema) => schema.min(1).max(10).optional().nullable(),
    systemConfidence: (schema) => schema.min(0).max(1).optional().nullable(),
    correctionWeight: (schema) => schema.min(0).max(10).default(1.0),

    amountRange: (schema) => schema.optional().nullable(),
    temporalContext: (schema) => schema.optional().nullable(),
    payeePatternContext: (schema) => schema.optional().nullable(),

    isProcessed: (schema) => schema.default(false),
    learningEpoch: (schema) => schema.positive().default(1),

    notes: (schema) =>
      schema.max(1000, "Notes must be less than 1000 characters").optional().nullable(),
    isOverride: (schema) => schema.default(false),
  }
);

// Learning-specific schemas
export const recordCorrectionSchema = z.object({
  payeeId: z.number().positive(),
  transactionId: z.number().positive().optional(),
  fromCategoryId: z.number().positive().optional(),
  toCategoryId: z.number().positive(),
  correctionTrigger: z.enum(correctionTriggers),
  correctionContext: z.enum(correctionContexts).optional(),
  transactionAmount: z.number().optional(),
  transactionDate: z.string().optional(),
  userConfidence: z.number().min(1).max(10).optional(),
  notes: z.string().max(1000).optional(),
  isOverride: z.boolean().default(false),
});

export const analyzeCorrectionsSchema = z.object({
  payeeId: z.number().positive(),
  timeframeMonths: z.number().positive().default(12),
  minConfidence: z.number().min(0).max(1).default(0.1),
  includeProcessed: z.boolean().default(true),
});

export const learningMetricsSchema = z.object({
  timeframeMonths: z.number().positive().default(6),
  payeeIds: z.array(z.number().positive()).optional(),
  correctionTriggers: z.array(z.enum(correctionTriggers)).optional(),
});

// Type exports
export type PayeeCategoryCorrection = typeof payeeCategoryCorrections.$inferSelect;
export type NewPayeeCategoryCorrection = typeof payeeCategoryCorrections.$inferInsert;
export type FormInsertPayeeCategoryCorrectionSchema =
  typeof formInsertPayeeCategoryCorrectionSchema;
export type RecordCorrectionSchema = typeof recordCorrectionSchema;
export type AnalyzeCorrectionsSchema = typeof analyzeCorrectionsSchema;
export type LearningMetricsSchema = typeof learningMetricsSchema;

// Learning algorithm interfaces
export interface CategoryCorrection {
  id: number;
  payeeId: number;
  transactionId: number | null;
  fromCategoryId: number | null;
  toCategoryId: number;
  correctionTrigger: CorrectionTrigger;
  correctionContext: CorrectionContext | null;
  transactionAmount: number | null;
  transactionDate: string | null;
  userConfidence: number | null;
  systemConfidence: number | null;
  correctionWeight: number;
  amountRange: { min: number; max: number } | null;
  temporalContext: {
    month?: number;
    dayOfWeek?: number;
    isWeekend?: boolean;
    season?: string;
  } | null;
  payeePatternContext: {
    frequency?: string;
    regularity?: number;
    averageAmount?: number;
  } | null;
  isProcessed: boolean;
  processedAt: string | null;
  learningEpoch: number;
  notes: string | null;
  isOverride: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CorrectionPattern {
  payeeId: number;
  fromCategoryId: number | null;
  toCategoryId: number;
  frequency: number;
  confidence: number;
  averageUserConfidence: number;
  latestCorrectionDate: string;
  correctionTriggers: Array<{
    trigger: CorrectionTrigger;
    count: number;
    percentage: number;
  }>;
  amountPatterns: Array<{
    range: { min: number; max: number };
    count: number;
    confidence: number;
  }>;
  temporalPatterns: Array<{
    context: string;
    count: number;
    confidence: number;
  }>;
  decayFactor: number; // How much older corrections are weighted
}

export interface CategoryRecommendation {
  payeeId: number;
  recommendedCategoryId: number;
  recommendedCategoryName: string;
  confidence: number;
  reasoning: string;
  supportingFactors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
  alternativeCategories: Array<{
    categoryId: number;
    categoryName: string;
    confidence: number;
    reasoning: string;
  }>;
  contextualRecommendations: Array<{
    context: string;
    categoryId: number;
    categoryName: string;
    confidence: number;
    condition: string;
  }>;
}

export interface LearningMetrics {
  totalCorrections: number;
  uniquePayees: number;
  averageCorrectionsPerPayee: number;
  correctionAccuracy: number; // How often recommendations match user corrections
  systemImprovement: number; // How much system has improved over time
  categoryDriftDetection: Array<{
    payeeId: number;
    payeeName: string;
    oldCategoryId: number;
    oldCategoryName: string;
    newCategoryId: number;
    newCategoryName: string;
    driftConfidence: number;
    firstDetected: string;
    lastConfirmed: string;
  }>;
  learningVelocity: {
    correctionsPerWeek: number;
    newPatternsPerWeek: number;
    accuracyImprovement: number;
  };
  confidenceDistribution: {
    high: number; // >0.8
    medium: number; // 0.4-0.8
    low: number; // <0.4
  };
}

export interface CategoryDrift {
  payeeId: number;
  payeeName: string;
  previousCategoryId: number | null;
  previousCategoryName: string | null;
  newCategoryId: number;
  newCategoryName: string;
  driftConfidence: number;
  driftReason: string;
  detectedAt: string;
  confirmedAt: string | null;
  correctionCount: number;
  timespan: string;
  suggestedAction: "update_default" | "create_rule" | "manual_review" | "ignore";
}
