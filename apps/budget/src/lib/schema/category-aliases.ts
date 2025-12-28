import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { payees } from "./payees";
import { workspaces } from "./workspaces";

/**
 * Enum definitions for category alias triggers
 */
export const categoryAliasTriggers = [
  "import_confirmation", // User confirmed category during import preview
  "transaction_edit", // User changed category on existing transaction
  "manual_creation", // User explicitly created alias via UI
  "bulk_import", // Batch alias creation during import completion
  "ai_accepted", // User accepted AI suggestion (implicit confirmation)
] as const;

export type CategoryAliasTrigger = (typeof categoryAliasTriggers)[number];

/**
 * Amount type enum for contextual matching
 */
export const amountTypes = ["any", "income", "expense"] as const;

export type AmountType = (typeof amountTypes)[number];

/**
 * Category Aliases Table
 *
 * Tracks mappings from raw imported strings (payee/description) to category IDs.
 * When a user assigns a category during import (e.g., mapping "AMAZON PRIME*123"
 * to "Subscriptions"), that mapping is stored as an alias for future imports.
 *
 * The system checks aliases before ML scoring during import, providing
 * high-confidence matches for previously categorized transaction patterns.
 */
export const categoryAliases = sqliteTable(
  "category_aliases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Core alias mapping
    rawString: text("raw_string").notNull(), // The exact string from import (e.g., "AMAZON PRIME*123ABC")
    normalizedString: text("normalized_string"), // Lowercase/cleaned version for faster lookups
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),

    // Optional payee context - if known during alias creation
    payeeId: integer("payee_id").references(() => payees.id, { onDelete: "set null" }),

    // Context and tracking
    trigger: text("trigger", { enum: categoryAliasTriggers }).notNull(),
    confidence: real("confidence").default(1.0).notNull(), // 0-1, increases with repeated confirmations
    matchCount: integer("match_count").default(1).notNull(), // Times this alias was matched

    // Amount context - helps distinguish income vs expense patterns
    amountType: text("amount_type", { enum: amountTypes }).default("any"),

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
    index("category_aliases_workspace_idx").on(table.workspaceId),
    index("category_aliases_category_idx").on(table.categoryId),
    index("category_aliases_payee_idx").on(table.payeeId),
    index("category_aliases_raw_string_idx").on(table.rawString),
    index("category_aliases_normalized_idx").on(table.normalizedString),

    // Composite indexes for alias matching
    index("category_aliases_workspace_normalized_idx").on(table.workspaceId, table.normalizedString),

    // Unique constraint: one raw string maps to one category per workspace
    uniqueIndex("category_aliases_workspace_raw_unique_idx").on(table.workspaceId, table.rawString),

    // Soft delete filter
    index("category_aliases_deleted_at_idx").on(table.deletedAt),

    // Trigger analysis
    index("category_aliases_trigger_idx").on(table.trigger),

    // Source account analysis
    index("category_aliases_source_account_idx").on(table.sourceAccountId),

    // Amount type filtering
    index("category_aliases_amount_type_idx").on(table.amountType),
  ]
);

export const categoryAliasesRelations = relations(categoryAliases, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [categoryAliases.workspaceId],
    references: [workspaces.id],
  }),
  category: one(categories, {
    fields: [categoryAliases.categoryId],
    references: [categories.id],
  }),
  payee: one(payees, {
    fields: [categoryAliases.payeeId],
    references: [payees.id],
  }),
  sourceAccount: one(accounts, {
    fields: [categoryAliases.sourceAccountId],
    references: [accounts.id],
  }),
}));

// Zod schemas for validation
export const selectCategoryAliasSchema = createSelectSchema(categoryAliases);
export const insertCategoryAliasSchema = createInsertSchema(categoryAliases);

export const formInsertCategoryAliasSchema = createInsertSchema(categoryAliases, {
  workspaceId: (schema) => schema.optional(),
  rawString: (schema) => schema.min(1, "Raw string is required").max(500, "Raw string too long"),
  normalizedString: (schema) => schema.max(500).optional().nullable(),
  categoryId: (schema) => schema.positive("Invalid category ID"),
  payeeId: (schema) => schema.positive().optional().nullable(),
  trigger: (schema) => schema,
  confidence: (schema) => schema.min(0).max(1).default(1.0),
  matchCount: (schema) => schema.positive().default(1),
  amountType: (schema) => schema.optional(),
  sourceAccountId: (schema) => schema.positive().optional().nullable(),
  lastMatchedAt: (schema) => schema.optional().nullable(),
});

// API schemas
export const createCategoryAliasSchema = z.object({
  rawString: z.string().min(1).max(500),
  categoryId: z.number().positive(),
  payeeId: z.number().positive().optional(),
  trigger: z.enum(categoryAliasTriggers).optional().default("manual_creation"),
  amountType: z.enum(amountTypes).optional().default("any"),
  sourceAccountId: z.number().positive().optional(),
});

export const bulkCreateCategoryAliasesSchema = z.object({
  aliases: z
    .array(
      z.object({
        rawString: z.string().min(1).max(500),
        categoryId: z.number().positive(),
        payeeId: z.number().positive().optional(),
        amountType: z.enum(amountTypes).optional(),
        sourceAccountId: z.number().positive().optional(),
        wasAiSuggested: z.boolean().optional(),
      })
    )
    .max(500), // Limit bulk operations
});

export const updateCategoryAliasSchema = z.object({
  id: z.number().positive(),
  categoryId: z.number().positive().optional(),
  rawString: z.string().min(1).max(500).optional(),
});

// Type exports
export type CategoryAlias = typeof categoryAliases.$inferSelect;
export type NewCategoryAlias = typeof categoryAliases.$inferInsert;
export type CreateCategoryAliasInput = z.infer<typeof createCategoryAliasSchema>;
export type BulkCreateCategoryAliasesInput = z.infer<typeof bulkCreateCategoryAliasesSchema>;
export type UpdateCategoryAliasInput = z.infer<typeof updateCategoryAliasSchema>;

// Result interfaces
export interface CategoryAliasWithCategory extends CategoryAlias {
  category: {
    id: number;
    name: string | null;
    slug: string;
    categoryType: string | null;
  };
  payee?: {
    id: number;
    name: string | null;
  } | null;
}

export interface CategoryAliasStats {
  totalAliases: number;
  uniqueCategories: number;
  aliasesPerCategory: number;
  totalMatches: number;
  mostUsedAliases: Array<{
    id: number;
    rawString: string;
    categoryName: string;
    matchCount: number;
  }>;
  recentlyCreated: number; // Last 30 days
  byTrigger: Record<CategoryAliasTrigger, number>;
  byAmountType: Record<AmountType, number>;
}

export interface CategoryAliasMatch {
  categoryId: number;
  confidence: number;
  aliasId: number;
  matchedOn: "exact" | "normalized" | "payee_context";
}
