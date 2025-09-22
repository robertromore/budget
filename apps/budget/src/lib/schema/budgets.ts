import { sqliteTable, integer, text, real, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
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
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]
  }).notNull().default("account-monthly"),
  scope: text("scope", {
    enum: ["account", "category", "global", "mixed"]
  }).notNull().default("account"),
  status: text("status", {
    enum: ["active", "inactive", "archived"]
  }).notNull().default("active"),
  enforcementLevel: text("enforcement_level", {
    enum: ["none", "warning", "strict"]
  }).notNull().default("warning"),
  metadata: text("metadata", { mode: "json" }), // Flexible JSON for type-specific settings
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
});

/**
 * Budget groups for organizing budgets
 * Optional parent-child relationships with inheritance
 */
export const budgetGroups = sqliteTable("budget_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  color: text("color"),
  spendingLimit: real("spending_limit"),
  inheritParentSettings: integer("inherit_parent_settings", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

/**
 * Budget group memberships
 * Many-to-many relationship between budgets and groups
 */
export const budgetGroupMemberships = sqliteTable("budget_group_memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => budgetGroups.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

/**
 * Budget period templates for flexible period definitions
 * Defines how periods are generated for a budget
 */
export const budgetPeriodTemplates = sqliteTable("budget_period_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["weekly", "monthly", "quarterly", "yearly", "custom"]
  }).notNull(),
  intervalCount: integer("interval_count").notNull().default(1),
  startDayOfWeek: integer("start_day_of_week"), // 1=Monday, 7=Sunday
  startDayOfMonth: integer("start_day_of_month"), // 1-31
  startMonth: integer("start_month"), // 1-12 for yearly periods
  timezone: text("timezone"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

/**
 * Budget period instances for actual period tracking
 * Created from templates with actual allocated amounts and progress
 */
export const budgetPeriodInstances = sqliteTable("budget_period_instances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull().references(() => budgetPeriodTemplates.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  allocatedAmount: real("allocated_amount").notNull(),
  rolloverAmount: real("rollover_amount").notNull().default(0),
  actualAmount: real("actual_amount").notNull().default(0),
  lastCalculated: text("last_calculated"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

/**
 * Budget-Account associations
 * Many-to-many relationship between budgets and accounts
 */
export const budgetAccounts = sqliteTable("budget_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  uniqueBudgetAccount: unique().on(table.budgetId, table.accountId)
}));

/**
 * Budget-Category associations
 * Many-to-many relationship between budgets and categories
 */
export const budgetCategories = sqliteTable("budget_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  allocatedAmount: real("allocated_amount").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  uniqueBudgetCategory: unique().on(table.budgetId, table.categoryId)
}));

/**
 * Budget transactions - tracks how transactions are allocated to budgets
 * Replaces budget_allocations with proper audit fields and assignment tracking
 */
export const budgetTransactions = sqliteTable("budget_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  allocatedAmount: real("allocated_amount").notNull(), // Uses source transaction sign
  autoAssigned: integer("auto_assigned", { mode: "boolean" }).default(true),
  assignedAt: text("assigned_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  assignedBy: text("assigned_by"), // user_id if manually assigned
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Zod schemas for validation
export const insertBudgetSchema = createInsertSchema(budgets, {
  name: z.string().min(1, "Budget name is required").max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]),
  scope: z.enum(["account", "category", "global", "mixed"]),
  status: z.enum(["active", "inactive", "archived"]),
  enforcementLevel: z.enum(["none", "warning", "strict"]),
  metadata: z.object({}).passthrough().optional()
});

export const selectBudgetSchema = createSelectSchema(budgets);

export const insertBudgetGroupSchema = createInsertSchema(budgetGroups, {
  name: z.string().min(1, "Group name is required").max(100),
  description: z.string().max(500).optional(),
  spendingLimit: z.number().positive().optional(),
  inheritParentSettings: z.boolean().default(true)
});
export const selectBudgetGroupSchema = createSelectSchema(budgetGroups);

export const insertBudgetGroupMembershipSchema = createInsertSchema(budgetGroupMemberships);
export const selectBudgetGroupMembershipSchema = createSelectSchema(budgetGroupMemberships);

export const insertBudgetPeriodTemplateSchema = createInsertSchema(budgetPeriodTemplates, {
  type: z.enum(["weekly", "monthly", "quarterly", "yearly", "custom"]),
  intervalCount: z.number().positive().default(1),
  startDayOfWeek: z.number().min(1).max(7).optional(),
  startDayOfMonth: z.number().min(1).max(31).optional(),
  startMonth: z.number().min(1).max(12).optional(),
  timezone: z.string().optional()
});
export const selectBudgetPeriodTemplateSchema = createSelectSchema(budgetPeriodTemplates);

export const insertBudgetPeriodInstanceSchema = createInsertSchema(budgetPeriodInstances, {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  allocatedAmount: z.number().min(0, "Allocated amount must be positive"),
  rolloverAmount: z.number().default(0),
  actualAmount: z.number().default(0)
});
export const selectBudgetPeriodInstanceSchema = createSelectSchema(budgetPeriodInstances);

export const insertBudgetAccountSchema = createInsertSchema(budgetAccounts);
export const selectBudgetAccountSchema = createSelectSchema(budgetAccounts);

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories, {
  allocatedAmount: z.number().min(0, "Allocated amount must be positive")
});
export const selectBudgetCategorySchema = createSelectSchema(budgetCategories);

export const insertBudgetTransactionSchema = createInsertSchema(budgetTransactions, {
  allocatedAmount: z.number(),
  autoAssigned: z.boolean().default(true),
  assignedBy: z.string().optional()
});
export const selectBudgetTransactionSchema = createSelectSchema(budgetTransactions);

// Type exports
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type BudgetGroup = typeof budgetGroups.$inferSelect;
export type NewBudgetGroup = typeof budgetGroups.$inferInsert;

export type BudgetGroupMembership = typeof budgetGroupMemberships.$inferSelect;
export type NewBudgetGroupMembership = typeof budgetGroupMemberships.$inferInsert;

export type BudgetPeriodTemplate = typeof budgetPeriodTemplates.$inferSelect;
export type NewBudgetPeriodTemplate = typeof budgetPeriodTemplates.$inferInsert;

export type BudgetPeriodInstance = typeof budgetPeriodInstances.$inferSelect;
export type NewBudgetPeriodInstance = typeof budgetPeriodInstances.$inferInsert;

export type BudgetAccount = typeof budgetAccounts.$inferSelect;
export type NewBudgetAccount = typeof budgetAccounts.$inferInsert;

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type NewBudgetCategory = typeof budgetCategories.$inferInsert;

export type BudgetTransaction = typeof budgetTransactions.$inferSelect;
export type NewBudgetTransaction = typeof budgetTransactions.$inferInsert;

// Relations
export const budgetGroupsRelations = relations(budgetGroups, ({ one, many }) => ({
  parent: one(budgetGroups, {
    fields: [budgetGroups.parentId],
    references: [budgetGroups.id],
  }),
  children: many(budgetGroups),
  memberships: many(budgetGroupMemberships),
}));