import {createId} from "@paralleldrive/cuid2";
import {relations, sql} from "drizzle-orm";
import {sqliteTable, integer, text, index} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {z} from "zod/v4";
import {accounts} from "./accounts";
import {categories} from "./categories";
import {categoryGroups} from "./category-groups";
import {payees} from "./payees";
import {budgets} from "./budgets";
import {schedules} from "./schedules";
import {views} from "./views";
import {budgetAutomationSettings} from "./budget-automation-settings";
import {detectedPatterns} from "./detected-patterns";
import {payeeCategoryCorrections} from "./payee-category-corrections";

export const workspaces = sqliteTable(
  "workspace",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Basic Info
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull().unique(),

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
  ]
);

// Preferences type
export interface WorkspacePreferences {
  locale?: string; // 'en-US', 'es-ES', etc.
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  currency?: "USD" | "EUR" | "GBP" | "JPY" | string;
  theme?: "light" | "dark" | "system";
  timezone?: string;
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

// Relations
export const workspacesRelations = relations(workspaces, ({many}) => ({
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
}));

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type InsertWorkspaceSchema = typeof insertWorkspaceSchema;
export type FormInsertWorkspaceSchema = typeof formInsertWorkspaceSchema;
