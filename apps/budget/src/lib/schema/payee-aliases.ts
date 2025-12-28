import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { payees } from "./payees";
import { workspaces } from "./workspaces";

/**
 * Enum definitions for alias triggers
 */
export const aliasTriggers = [
  "import_confirmation", // User confirmed payee during import preview
  "transaction_edit", // User changed payee on existing transaction
  "manual_creation", // User explicitly created alias via UI
  "bulk_import", // Batch alias creation during import completion
] as const;

export type AliasTrigger = (typeof aliasTriggers)[number];

/**
 * Payee Aliases Table
 *
 * Tracks mappings from raw imported strings to canonical payee IDs.
 * When a user confirms a payee during import (e.g., mapping "WALMART #1234 DALLAS TX"
 * to "Walmart"), that mapping is stored as an alias for future imports.
 *
 * The system checks aliases before fuzzy matching during import, providing
 * instant exact matches for previously seen payee strings.
 */
export const payeeAliases = sqliteTable(
  "payee_aliases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Core alias mapping
    rawString: text("raw_string").notNull(), // The exact string from import (e.g., "WALMART #1234 DALLAS TX")
    normalizedString: text("normalized_string"), // Lowercase/cleaned version for faster lookups
    payeeId: integer("payee_id")
      .notNull()
      .references(() => payees.id, { onDelete: "cascade" }),

    // Context and tracking
    trigger: text("trigger", { enum: aliasTriggers }).notNull(),
    confidence: real("confidence").default(1.0).notNull(), // 0-1, increases with repeated confirmations
    matchCount: integer("match_count").default(1).notNull(), // Times this alias was matched

    // Source tracking
    sourceAccountId: integer("source_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    lastMatchedAt: text("last_matched_at"), // ISO timestamp of last successful match

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
    index("payee_aliases_workspace_idx").on(table.workspaceId),
    index("payee_aliases_payee_idx").on(table.payeeId),
    index("payee_aliases_raw_string_idx").on(table.rawString),
    index("payee_aliases_normalized_idx").on(table.normalizedString),

    // Composite indexes for alias matching
    index("payee_aliases_workspace_normalized_idx").on(table.workspaceId, table.normalizedString),

    // Unique constraint: one raw string maps to one payee per workspace
    uniqueIndex("payee_aliases_workspace_raw_unique_idx").on(table.workspaceId, table.rawString),

    // Soft delete filter
    index("payee_aliases_deleted_at_idx").on(table.deletedAt),

    // Trigger analysis
    index("payee_aliases_trigger_idx").on(table.trigger),

    // Source account analysis
    index("payee_aliases_source_account_idx").on(table.sourceAccountId),
  ]
);

export const payeeAliasesRelations = relations(payeeAliases, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [payeeAliases.workspaceId],
    references: [workspaces.id],
  }),
  payee: one(payees, {
    fields: [payeeAliases.payeeId],
    references: [payees.id],
  }),
  sourceAccount: one(accounts, {
    fields: [payeeAliases.sourceAccountId],
    references: [accounts.id],
  }),
}));

// Zod schemas for validation
export const selectPayeeAliasSchema = createSelectSchema(payeeAliases);
export const insertPayeeAliasSchema = createInsertSchema(payeeAliases);

export const formInsertPayeeAliasSchema = createInsertSchema(payeeAliases, {
  workspaceId: (schema) => schema.optional(),
  rawString: (schema) => schema.min(1, "Raw string is required").max(500, "Raw string too long"),
  normalizedString: (schema) => schema.max(500).optional().nullable(),
  payeeId: (schema) => schema.positive("Invalid payee ID"),
  trigger: (schema) => schema,
  confidence: (schema) => schema.min(0).max(1).default(1.0),
  matchCount: (schema) => schema.positive().default(1),
  sourceAccountId: (schema) => schema.positive().optional().nullable(),
  lastMatchedAt: (schema) => schema.optional().nullable(),
});

// API schemas
export const createPayeeAliasSchema = z.object({
  rawString: z.string().min(1).max(500),
  payeeId: z.number().positive(),
  trigger: z.enum(aliasTriggers).optional().default("manual_creation"),
  sourceAccountId: z.number().positive().optional(),
});

export const bulkCreatePayeeAliasesSchema = z.object({
  aliases: z
    .array(
      z.object({
        rawString: z.string().min(1).max(500),
        payeeId: z.number().positive(),
        sourceAccountId: z.number().positive().optional(),
      })
    )
    .max(500), // Limit bulk operations
});

export const updatePayeeAliasSchema = z.object({
  id: z.number().positive(),
  payeeId: z.number().positive().optional(),
  rawString: z.string().min(1).max(500).optional(),
});

// Type exports
export type PayeeAlias = typeof payeeAliases.$inferSelect;
export type NewPayeeAlias = typeof payeeAliases.$inferInsert;
export type CreatePayeeAliasInput = z.infer<typeof createPayeeAliasSchema>;
export type BulkCreatePayeeAliasesInput = z.infer<typeof bulkCreatePayeeAliasesSchema>;
export type UpdatePayeeAliasInput = z.infer<typeof updatePayeeAliasSchema>;

// Result interfaces
export interface PayeeAliasWithPayee extends PayeeAlias {
  payee: {
    id: number;
    name: string | null;
    slug: string;
  };
}

export interface PayeeAliasStats {
  totalAliases: number;
  uniquePayees: number;
  aliasesPerPayee: number;
  totalMatches: number;
  mostUsedAliases: Array<{
    id: number;
    rawString: string;
    payeeName: string | null;
    matchCount: number;
  }>;
  recentlyCreated: number; // Last 30 days
  byTrigger: Record<AliasTrigger, number>;
}

export interface AliasMatch {
  payeeId: number;
  confidence: number;
  aliasId: number;
  matchedOn: "exact" | "normalized";
}
