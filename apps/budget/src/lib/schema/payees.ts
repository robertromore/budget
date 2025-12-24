// A "payee" represents an entity that receives or provides funds in transactions.
// Payees can be merchants, utility companies, employers, financial institutions,
// government entities, or individuals. Enhanced with budgeting integration fields
// for automatic categorization, transaction automation, and analytics support.

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { budgets } from "./budgets";
import { categories } from "./categories";
import { payeeCategories } from "./payee-categories";
import { transactions } from "./transactions";
import { workspaces } from "./workspaces";

// Type definitions for JSON columns
export interface PayeeAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
}

// AI preferences type for tracking intelligence mode per field
export interface PayeeAiPreferences {
  fieldModes?: Record<string, "none" | "ml" | "llm">;
  enhancedFields?: string[];
  lastEnhanced?: Record<string, string>; // ISO timestamps
}

// SubscriptionInfo is a flexible type for the JSON column.
// The actual structure used at runtime is SubscriptionMetadata from subscription-management.ts
// We use Record<string, unknown> here for schema compatibility with the more complex runtime type.
export type SubscriptionInfo = Record<string, unknown>;

// Enum definitions for payee fields
export const payeeTypes = [
  "merchant",
  "utility",
  "employer",
  "financial_institution",
  "government",
  "individual",
  "other",
] as const;

export const paymentFrequencies = [
  "one_time",
  "weekly",
  "bi_weekly",
  "monthly",
  "quarterly",
  "annual",
  "irregular",
] as const;

export type PayeeType = (typeof payeeTypes)[number];
export type PaymentFrequency = (typeof paymentFrequencies)[number];

export const payees = sqliteTable(
  "payee",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name"),
    slug: text("slug").notNull().unique(),
    notes: text("notes"),

    // Budgeting Integration Fields
    defaultCategoryId: integer("default_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    defaultBudgetId: integer("default_budget_id").references(() => budgets.id, {
      onDelete: "set null",
    }),
    payeeType: text("payee_type", { enum: payeeTypes }),

    // Organization Fields
    payeeCategoryId: integer("payee_category_id").references(() => payeeCategories.id, {
      onDelete: "set null",
    }),

    // Transaction Automation Fields
    avgAmount: real("avg_amount"),
    paymentFrequency: text("payment_frequency", { enum: paymentFrequencies }),
    lastTransactionDate: text("last_transaction_date"),

    // Analytics Support Fields
    taxRelevant: integer("tax_relevant", { mode: "boolean" }).default(false).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

    // Contact Information Fields
    website: text("website"),
    phone: text("phone"),
    email: text("email"),

    // Organization Fields
    address: text("address", { mode: "json" }).$type<PayeeAddress | null>().default(null),
    accountNumber: text("account_number"),

    // Advanced Features Fields
    alertThreshold: real("alert_threshold"),
    isSeasonal: integer("is_seasonal", { mode: "boolean" }).default(false).notNull(),
    subscriptionInfo: text("subscription_info", { mode: "json" }).$type<SubscriptionInfo | null>().default(null),
    aiPreferences: text("ai_preferences", { mode: "json" }).$type<PayeeAiPreferences | null>().default(null),
    tags: text("tags"),

    // Payment Processing Fields
    preferredPaymentMethods: text("preferred_payment_methods"),
    merchantCategoryCode: text("merchant_category_code"),

    dateCreated: text("date_created")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    // Existing indexes
    index("payee_workspace_id_idx").on(table.workspaceId),
    index("payee_name_idx").on(table.name),
    index("payee_slug_idx").on(table.slug),
    index("payee_deleted_at_idx").on(table.deletedAt),

    // Foreign key indexes for performance
    index("payee_default_category_idx").on(table.defaultCategoryId),
    index("payee_default_budget_idx").on(table.defaultBudgetId),
    index("payee_category_id_idx").on(table.payeeCategoryId),

    // Frequently queried fields
    index("payee_type_idx").on(table.payeeType),
    index("payee_is_active_idx").on(table.isActive),
    index("payee_tax_relevant_idx").on(table.taxRelevant),
    index("payee_payment_frequency_idx").on(table.paymentFrequency),
    index("payee_last_transaction_date_idx").on(table.lastTransactionDate),

    // Composite indexes for common query patterns
    index("payee_active_type_idx").on(table.isActive, table.payeeType),
    index("payee_category_budget_idx").on(table.defaultCategoryId, table.defaultBudgetId),
  ]
);

export const payeesRelations = relations(payees, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [payees.workspaceId],
    references: [workspaces.id],
  }),
  transactions: many(transactions),
  defaultCategory: one(categories, {
    fields: [payees.defaultCategoryId],
    references: [categories.id],
  }),
  defaultBudget: one(budgets, {
    fields: [payees.defaultBudgetId],
    references: [budgets.id],
  }),
  payeeCategory: one(payeeCategories, {
    fields: [payees.payeeCategoryId],
    references: [payeeCategories.id],
  }),
}));

export const selectPayeeSchema = createSelectSchema(payees);
export const insertPayeeSchema = createInsertSchema(payees);
export const formInsertPayeeSchema = createInsertSchema(payees, {
  workspaceId: (schema) => schema.optional(),
  name: (schema) =>
    schema
      .min(1, "Payee name is required")
      .max(50, "Payee name must be less than 50 characters")
      .regex(/^[a-zA-Z0-9\s\-_&']+$/, "Payee name contains invalid characters"),
  notes: (schema) =>
    schema.max(500, "Notes must be less than 500 characters").optional().nullable(),

  // Budgeting Integration Fields validation
  defaultCategoryId: (schema) => schema.optional().nullable(),
  defaultBudgetId: (schema) => schema.optional().nullable(),
  payeeType: (schema) => schema.optional().nullable(),

  // Organization Fields validation
  payeeCategoryId: (schema) => schema.optional().nullable(),

  // Transaction Automation Fields validation
  avgAmount: (schema) => schema.optional().nullable(),
  paymentFrequency: (schema) => schema.optional().nullable(),
  lastTransactionDate: (schema) => schema.optional().nullable(),

  // Analytics Support Fields validation
  taxRelevant: (schema) => schema.default(false),
  isActive: (schema) => schema.default(true),

  // Contact Information Fields validation
  website: (schema) =>
    schema
      .url("Invalid website URL")
      .max(500, "Website URL must be less than 500 characters")
      .optional()
      .nullable(),
  phone: (schema) =>
    schema
      .max(20, "Phone number must be less than 20 characters")
      .regex(/^[\d\s\-\+\(\)\.]*$/, "Invalid phone number format")
      .optional()
      .nullable(),
  email: (schema) =>
    schema
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters")
      .optional()
      .nullable(),

  // Organization Fields validation
  address: (schema) => schema.optional().nullable(),
  accountNumber: (schema) =>
    schema.max(100, "Account number must be less than 100 characters").optional().nullable(),

  // Advanced Features Fields validation
  alertThreshold: (schema) => schema.optional().nullable(),
  isSeasonal: (schema) => schema.default(false),
  subscriptionInfo: (schema) => schema.optional().nullable(),
  aiPreferences: (schema) => schema.optional().nullable(),
  tags: (schema) => schema.optional().nullable(),

  // Payment Processing Fields validation
  preferredPaymentMethods: (schema) => schema.optional().nullable(),
  merchantCategoryCode: (schema) =>
    schema
      .max(10, "Merchant category code must be less than 10 characters")
      .regex(/^\d{4}$/, "Merchant category code must be 4 digits")
      .optional()
      .nullable(),
});
export const removePayeeSchema = z.object({ id: z.number().nonnegative() });
export const removePayeesSchema = z.object({ entities: z.array(z.number().nonnegative()) });

export type Payee = typeof payees.$inferSelect;
export type NewPayee = typeof payees.$inferInsert;
export type FormInsertPayeeSchema = typeof formInsertPayeeSchema;
export type RemovePayeeSchema = typeof removePayeeSchema;
export type RemovePayesSchema = typeof removePayeesSchema;
export type HasPayees = {
  payees?: Payee[];
};
