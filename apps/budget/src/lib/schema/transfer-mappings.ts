import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { workspaces } from "./workspaces";

/**
 * Enum definitions for transfer mapping triggers
 */
export const transferMappingTriggers = [
  "manual_conversion", // User converted transaction to transfer via dialog
  "import_confirmation", // User confirmed transfer during import preview
  "transaction_edit", // User changed transaction to transfer
  "bulk_import", // Batch mapping creation during import completion
] as const;

export type TransferMappingTrigger = (typeof transferMappingTriggers)[number];

/**
 * Transfer Mappings Table
 *
 * Tracks mappings from raw imported payee strings to target accounts.
 * When a user converts a transaction to a transfer (e.g., mapping "VENMO PAYMENT JOHN DOE"
 * to account "Savings"), that mapping is stored for future imports.
 *
 * The system checks transfer mappings during import to automatically suggest
 * or apply transfers for previously seen payee strings.
 */
export const transferMappings = sqliteTable(
  "transfer_mappings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Core mapping - what to match
    rawPayeeString: text("raw_payee_string").notNull(), // The exact string from import (e.g., "VENMO PAYMENT JOHN DOE")
    normalizedString: text("normalized_string"), // Lowercase/cleaned version for faster lookups

    // Target account for transfer
    targetAccountId: integer("target_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // Context and tracking
    trigger: text("trigger", { enum: transferMappingTriggers }).notNull(),
    confidence: real("confidence").default(1.0).notNull(), // 0-1, increases with repeated confirmations
    matchCount: integer("match_count").default(1).notNull(), // Times this mapping was matched/applied

    // Source tracking
    sourceAccountId: integer("source_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    lastAppliedAt: text("last_applied_at"), // ISO timestamp of last successful application

    // Timestamps and soft delete
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
    index("transfer_mappings_workspace_idx").on(table.workspaceId),
    index("transfer_mappings_target_account_idx").on(table.targetAccountId),
    index("transfer_mappings_raw_payee_string_idx").on(table.rawPayeeString),
    index("transfer_mappings_normalized_idx").on(table.normalizedString),

    // Composite indexes for mapping matching
    index("transfer_mappings_workspace_normalized_idx").on(table.workspaceId, table.normalizedString),

    // Unique constraint: one raw string maps to one account per workspace
    uniqueIndex("transfer_mappings_workspace_raw_unique_idx").on(
      table.workspaceId,
      table.rawPayeeString
    ),

    // Soft delete filter
    index("transfer_mappings_deleted_at_idx").on(table.deletedAt),

    // Trigger analysis
    index("transfer_mappings_trigger_idx").on(table.trigger),

    // Source account analysis
    index("transfer_mappings_source_account_idx").on(table.sourceAccountId),
  ]
);

export const transferMappingsRelations = relations(transferMappings, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [transferMappings.workspaceId],
    references: [workspaces.id],
  }),
  targetAccount: one(accounts, {
    fields: [transferMappings.targetAccountId],
    references: [accounts.id],
    relationName: "transferMappingTarget",
  }),
  sourceAccount: one(accounts, {
    fields: [transferMappings.sourceAccountId],
    references: [accounts.id],
    relationName: "transferMappingSource",
  }),
}));

// Zod schemas for validation
export const selectTransferMappingSchema = createSelectSchema(transferMappings);
export const insertTransferMappingSchema = createInsertSchema(transferMappings);

export const formInsertTransferMappingSchema = createInsertSchema(transferMappings, {
  workspaceId: (schema) => schema.optional(),
  rawPayeeString: (schema) => schema.min(1, "Payee string is required").max(500, "Payee string too long"),
  normalizedString: (schema) => schema.max(500).optional().nullable(),
  targetAccountId: (schema) => schema.positive("Invalid target account ID"),
  trigger: (schema) => schema,
  confidence: (schema) => schema.min(0).max(1).default(1.0),
  matchCount: (schema) => schema.positive().default(1),
  sourceAccountId: (schema) => schema.positive().optional().nullable(),
  lastAppliedAt: (schema) => schema.optional().nullable(),
});

// API schemas
export const createTransferMappingSchema = z.object({
  rawPayeeString: z.string().min(1).max(500),
  targetAccountId: z.number().positive(),
  trigger: z.enum(transferMappingTriggers).optional().default("manual_conversion"),
  sourceAccountId: z.number().positive().optional(),
});

export const bulkCreateTransferMappingsSchema = z.object({
  mappings: z
    .array(
      z.object({
        rawPayeeString: z.string().min(1).max(500),
        targetAccountId: z.number().positive(),
        sourceAccountId: z.number().positive().optional(),
      })
    )
    .max(500), // Limit bulk operations
});

export const updateTransferMappingSchema = z.object({
  id: z.number().positive(),
  targetAccountId: z.number().positive().optional(),
  rawPayeeString: z.string().min(1).max(500).optional(),
});

// Type exports
export type TransferMapping = typeof transferMappings.$inferSelect;
export type NewTransferMapping = typeof transferMappings.$inferInsert;
export type CreateTransferMappingInput = z.infer<typeof createTransferMappingSchema>;
export type BulkCreateTransferMappingsInput = z.infer<typeof bulkCreateTransferMappingsSchema>;
export type UpdateTransferMappingInput = z.infer<typeof updateTransferMappingSchema>;

// Result interfaces
export interface TransferMappingWithAccount extends TransferMapping {
  targetAccount: {
    id: number;
    name: string | null;
    slug: string | null;
    accountIcon: string | null;
    accountColor: string | null;
  };
}

export interface TransferMappingStats {
  totalMappings: number;
  uniqueTargetAccounts: number;
  mappingsPerAccount: number;
  totalTimesApplied: number;
  mostUsedMappings: Array<{
    id: number;
    rawPayeeString: string;
    targetAccountName: string | null;
    matchCount: number;
  }>;
  recentlyCreated: number; // Last 30 days
  byTrigger: Record<TransferMappingTrigger, number>;
}

export interface TransferMappingMatch {
  targetAccountId: number;
  confidence: number;
  mappingId: number;
  matchedOn: "exact" | "normalized" | "cleaned";
}
