// Import profiles store column mappings for CSV imports
// They can be matched by column signature, filename pattern, or per-account defaults

import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { workspaces } from "./workspaces";

// Column mapping structure for CSV imports
// Supports both schema naming (inflow/outflow/memo) and UI naming (credit/debit/notes)
export interface ColumnMapping {
  date: string | null;
  description: string | null;
  amount: string | null;
  // Schema naming convention
  inflow: string | null;
  outflow: string | null;
  memo: string | null;
  // UI naming convention (aliases)
  credit?: string | null;
  debit?: string | null;
  notes?: string | null;
  // Common fields
  payee: string | null;
  category: string | null;
  status?: string | null;
}

// Helper to accept string, null, or undefined and normalize to string | null
const columnField = z
  .string()
  .nullable()
  .optional()
  .transform((val) => val ?? null);

export const columnMappingSchema = z.object({
  date: columnField,
  description: columnField,
  amount: columnField,
  // Schema naming convention
  inflow: columnField,
  outflow: columnField,
  memo: columnField,
  // UI naming convention (aliases)
  credit: columnField,
  debit: columnField,
  notes: columnField,
  // Common fields
  payee: columnField,
  category: columnField,
  status: columnField,
});

export const importProfiles = sqliteTable(
  "import_profile",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Profile identification
    name: text("name").notNull(), // User-friendly name (e.g., "Chase Credit Card")

    // Matching strategies (all optional, checked in order)
    columnSignature: text("column_signature"), // Normalized, sorted list of CSV column headers
    filenamePattern: text("filename_pattern"), // Glob pattern like "chase_*.csv"

    // Account association (for per-account defaults)
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "set null" }),
    isAccountDefault: integer("is_account_default", { mode: "boolean" }).default(false),

    // The actual column mapping (JSON)
    mapping: text("mapping", { mode: "json" }).notNull().$type<ColumnMapping>(),

    // Metadata
    lastUsedAt: text("last_used_at"),
    useCount: integer("use_count").default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("import_profile_workspace_id_idx").on(table.workspaceId),
    index("import_profile_column_signature_idx").on(table.columnSignature),
    index("import_profile_account_id_idx").on(table.accountId),
    index("import_profile_is_account_default_idx").on(table.isAccountDefault),
  ]
);

// Relations
export const importProfilesRelations = relations(importProfiles, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [importProfiles.workspaceId],
    references: [workspaces.id],
  }),
  account: one(accounts, {
    fields: [importProfiles.accountId],
    references: [accounts.id],
  }),
}));

// Zod schemas
export const selectImportProfileSchema = createSelectSchema(importProfiles);
export const insertImportProfileSchema = createInsertSchema(importProfiles, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Profile name is required")
          .min(2, "Profile name must be at least 2 characters")
          .max(100, "Profile name must be less than 100 characters")
      ),
  filenamePattern: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(z.string().max(200, "Filename pattern must be less than 200 characters"))
      .optional()
      .nullable(),
  mapping: () => columnMappingSchema,
});

export const formInsertImportProfileSchema = insertImportProfileSchema.omit({
  id: true,
  cuid: true,
  createdAt: true,
  updatedAt: true,
});

export const formUpdateImportProfileSchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(2, "Profile name must be at least 2 characters")
        .max(100, "Profile name must be less than 100 characters")
    )
    .optional(),
  filenamePattern: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(200, "Filename pattern must be less than 200 characters"))
    .optional()
    .nullable(),
  accountId: z.number().positive().optional().nullable(),
  isAccountDefault: z.boolean().optional(),
  mapping: columnMappingSchema.optional(),
});

// Types
export type ImportProfile = typeof importProfiles.$inferSelect;
export type NewImportProfile = typeof importProfiles.$inferInsert;
export type InsertImportProfileSchema = typeof insertImportProfileSchema;
export type FormInsertImportProfileSchema = typeof formInsertImportProfileSchema;
export type FormUpdateImportProfileSchema = typeof formUpdateImportProfileSchema;

// Helper function to generate a deterministic column signature from headers
export function generateColumnSignature(headers: string[]): string {
  const normalized = headers
    .map((h) => h.toLowerCase().trim())
    .filter((h) => h.length > 0)
    .sort();

  return normalized.join("|");
}
