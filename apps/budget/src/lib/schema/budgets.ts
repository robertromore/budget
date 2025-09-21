import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { transactions } from "./transactions";

/**
 * Core budgets table
 * Supports multiple budget types with flexible metadata
 */
export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cuid: text("cuid"),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]
  }).notNull().default("account-monthly"),
  enforcement: text("enforcement", {
    enum: ["none", "warning", "strict"]
  }).notNull().default("warning"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  metadata: text("metadata", { mode: "json" }), // Flexible JSON for type-specific settings
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  deletedAt: text("deleted_at")
});

/**
 * Budget-Account associations
 * Many-to-many relationship between budgets and accounts
 */
export const budgetAccounts = sqliteTable("budget_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

/**
 * Budget-Category associations
 * Many-to-many relationship between budgets and categories
 */
export const budgetCategories = sqliteTable("budget_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  allocatedAmount: real("allocated_amount").notNull().default(0),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

/**
 * Budget periods for tracking progress over time
 * Each budget can have multiple periods (monthly, quarterly, etc.)
 */
export const budgetPeriods = sqliteTable("budget_periods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  allocated: real("allocated").notNull().default(0),
  spent: real("spent").notNull().default(0),
  rollover: real("rollover").notNull().default(0),
  status: text("status", {
    enum: ["upcoming", "active", "completed", "archived"]
  }).default("upcoming"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
});

/**
 * Budget allocations - tracks how transactions are allocated to budgets
 * Supports partial allocations and multiple budgets per transaction
 */
export const budgetAllocations = sqliteTable("budget_allocations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  periodId: integer("period_id").references(() => budgetPeriods.id, { onDelete: "cascade" }),
  allocatedAmount: real("allocated_amount").notNull(),
  percentage: real("percentage"), // What percentage of transaction this represents
  assignmentType: text("assignment_type", {
    enum: ["automatic", "manual", "split"]
  }).default("manual"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

// Zod schemas for validation
export const insertBudgetSchema = createInsertSchema(budgets, {
  name: z.string().min(1, "Budget name is required").max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]),
  enforcement: z.enum(["none", "warning", "strict"]),
  isActive: z.boolean().default(true),
  metadata: z.object({}).passthrough().optional()
});

export const selectBudgetSchema = createSelectSchema(budgets);

export const insertBudgetAccountSchema = createInsertSchema(budgetAccounts);
export const selectBudgetAccountSchema = createSelectSchema(budgetAccounts);

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories, {
  allocatedAmount: z.number().min(0, "Allocated amount must be positive")
});
export const selectBudgetCategorySchema = createSelectSchema(budgetCategories);

export const insertBudgetPeriodSchema = createInsertSchema(budgetPeriods, {
  name: z.string().min(1, "Period name is required").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  allocated: z.number().min(0, "Allocated amount must be positive"),
  spent: z.number().default(0),
  rollover: z.number().default(0)
});
export const selectBudgetPeriodSchema = createSelectSchema(budgetPeriods);

export const insertBudgetAllocationSchema = createInsertSchema(budgetAllocations, {
  allocatedAmount: z.number(),
  percentage: z.number().min(0).max(100).optional(),
  assignmentType: z.enum(["automatic", "manual", "split"]),
  notes: z.string().max(500).optional()
});
export const selectBudgetAllocationSchema = createSelectSchema(budgetAllocations);

// Type exports
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type BudgetAccount = typeof budgetAccounts.$inferSelect;
export type NewBudgetAccount = typeof budgetAccounts.$inferInsert;

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type NewBudgetCategory = typeof budgetCategories.$inferInsert;

export type BudgetPeriod = typeof budgetPeriods.$inferSelect;
export type NewBudgetPeriod = typeof budgetPeriods.$inferInsert;

export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type NewBudgetAllocation = typeof budgetAllocations.$inferInsert;