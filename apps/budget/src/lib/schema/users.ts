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
import { payeeCategoryCorrections } from "./payee-category-corrections";
import { payees } from "./payees";
import { schedules } from "./schedules";
import { views } from "./views";

export const users = sqliteTable(
  "user",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid").$defaultFn(() => createId()),

    // Basic Info
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull().unique(),
    email: text("email").unique(), // Optional for now, required when auth is added

    // User Preferences (stored as JSON)
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
    index("user_slug_idx").on(table.slug),
    index("user_email_idx").on(table.email),
    index("user_deleted_at_idx").on(table.deletedAt),
  ]
);

// Preferences type
export interface UserPreferences {
  locale?: string; // 'en-US', 'es-ES', etc.
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  currency?: "USD" | "EUR" | "GBP" | "JPY" | string;
  theme?: "light" | "dark" | "system";
  timezone?: string;
}

// Zod schemas
export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users, {
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
  email: (schema) =>
    schema
      .transform((val) => val?.trim()?.toLowerCase())
      .pipe(z.string().email("Invalid email address"))
      .optional()
      .nullable(),
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

export const formInsertUserSchema = insertUserSchema.omit({
  id: true,
  cuid: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InsertUserSchema = typeof insertUserSchema;
export type FormInsertUserSchema = typeof formInsertUserSchema;
