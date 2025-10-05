import {relations, sql} from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {accounts} from "./accounts";
import {categories} from "./categories";
import {transactions} from "./transactions";

export const budgetTypes = [
  "account-monthly",
  "category-envelope",
  "goal-based",
  "scheduled-expense",
] as const;

export const budgetScopes = ["account", "category", "global", "mixed"] as const;
export const budgetStatuses = ["active", "inactive", "archived"] as const;
export const budgetEnforcementLevels = ["none", "warning", "strict"] as const;
export const periodTemplateTypes = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
] as const;

export const budgetHealthStatuses = [
  "excellent",
  "good",
  "warning",
  "danger",
] as const;

export type BudgetType = (typeof budgetTypes)[number];
export type BudgetScope = (typeof budgetScopes)[number];
export type BudgetStatus = (typeof budgetStatuses)[number];
export type BudgetEnforcementLevel = (typeof budgetEnforcementLevels)[number];
export type PeriodTemplateType = (typeof periodTemplateTypes)[number];
export type BudgetHealthStatus = (typeof budgetHealthStatuses)[number];

export interface BudgetMetadata {
  defaultPeriod?: {
    type?: PeriodTemplateType;
    startDay?: number;
    startMonth?: number;
  };
  allocatedAmount?: number;
  goal?: {
    targetAmount: number;
    targetDate: string;
    startDate?: string;
    contributionFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    autoContribute?: boolean;
    linkedScheduleId?: number;
  };
  [key: string]: unknown;
}

export const budgets = sqliteTable(
  "budget",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    type: text("type", {enum: budgetTypes}).notNull(),
    scope: text("scope", {enum: budgetScopes}).notNull(),
    status: text("status", {enum: budgetStatuses}).default("active").notNull(),
    enforcementLevel: text("enforcement_level", {enum: budgetEnforcementLevels})
      .default("warning")
      .notNull(),
    metadata: text("metadata", {mode: "json"})
      .$type<BudgetMetadata>()
      .default({})
      .notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("budget_name_idx").on(table.name),
    index("budget_slug_idx").on(table.slug),
    index("budget_type_idx").on(table.type),
    index("budget_scope_idx").on(table.scope),
    index("budget_status_idx").on(table.status),
    index("budget_enforcement_idx").on(table.enforcementLevel),
    index("budget_deleted_at_idx").on(table.deletedAt),
  ]
);

export const budgetGroups = sqliteTable(
  "budget_group",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    name: text("name").notNull(),
    description: text("description"),
    parentId: integer("parent_id").references((): AnySQLiteColumn => budgetGroups.id),
    color: text("color"),
    spendingLimit: real("spending_limit"),
    inheritParentSettings: integer("inherit_parent_settings", {mode: "boolean"})
      .default(true)
      .notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("budget_group_parent_idx").on(table.parentId),
    index("budget_group_name_idx").on(table.name),
  ]
);

export const budgetGroupMemberships = sqliteTable(
  "budget_group_membership",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, {onDelete: "cascade"}),
    groupId: integer("group_id")
      .notNull()
      .references(() => budgetGroups.id, {onDelete: "cascade"}),
  },
  (table) => [
    uniqueIndex("budget_group_membership_unique").on(table.budgetId, table.groupId),
  ]
);

export const budgetPeriodTemplates = sqliteTable(
  "budget_period_template",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, {onDelete: "cascade"}),
    type: text("type", {enum: periodTemplateTypes}).notNull(),
    intervalCount: integer("interval_count").default(1).notNull(),
    startDayOfWeek: integer("start_day_of_week"),
    startDayOfMonth: integer("start_day_of_month"),
    startMonth: integer("start_month"),
    timezone: text("timezone"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("budget_period_template_budget_idx").on(table.budgetId),
    index("budget_period_template_type_idx").on(table.type),
  ]
);

export const budgetPeriodInstances = sqliteTable(
  "budget_period_instance",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    templateId: integer("template_id")
      .notNull()
      .references(() => budgetPeriodTemplates.id, {onDelete: "cascade"}),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    allocatedAmount: real("allocated_amount").notNull(),
    rolloverAmount: real("rollover_amount").default(0).notNull(),
    actualAmount: real("actual_amount").default(0).notNull(),
    lastCalculated: text("last_calculated"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("budget_period_instance_template_idx").on(table.templateId),
    index("budget_period_instance_range_idx").on(table.startDate, table.endDate),
  ]
);

export const budgetAccounts = sqliteTable(
  "budget_account",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, {onDelete: "cascade"}),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, {onDelete: "cascade"}),
  },
  (table) => [
    uniqueIndex("budget_account_unique").on(table.budgetId, table.accountId),
    index("budget_account_account_idx").on(table.accountId),
  ]
);

export const budgetCategories = sqliteTable(
  "budget_category",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, {onDelete: "cascade"}),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, {onDelete: "cascade"}),
  },
  (table) => [
    uniqueIndex("budget_category_unique").on(table.budgetId, table.categoryId),
    index("budget_category_category_idx").on(table.categoryId),
  ]
);

export const budgetTransactions = sqliteTable(
  "budget_transaction",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => transactions.id, {onDelete: "cascade"}),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, {onDelete: "cascade"}),
    allocatedAmount: real("allocated_amount").notNull(),
    autoAssigned: integer("auto_assigned", {mode: "boolean"}).default(true).notNull(),
    assignedAt: text("assigned_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    assignedBy: text("assigned_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("budget_transaction_budget_idx").on(table.budgetId),
    index("budget_transaction_transaction_idx").on(table.transactionId),
    index("budget_transaction_assigned_at_idx").on(table.assignedAt),
  ]
);

export const budgetsRelations = relations(budgets, ({many}) => ({
  periodTemplates: many(budgetPeriodTemplates),
  accounts: many(budgetAccounts),
  categories: many(budgetCategories),
  transactions: many(budgetTransactions),
  groupMemberships: many(budgetGroupMemberships),
}));

export const budgetGroupRelations = relations(budgetGroups, ({many, one}) => ({
  parent: one(budgetGroups, {
    fields: [budgetGroups.parentId],
    references: [budgetGroups.id],
    relationName: "budget_group_hierarchy",
  }),
  memberships: many(budgetGroupMemberships),
  children: many(budgetGroups, {
    relationName: "budget_group_hierarchy",
  }),
}));

export const budgetGroupMembershipRelations = relations(
  budgetGroupMemberships,
  ({one}) => ({
    group: one(budgetGroups, {
      fields: [budgetGroupMemberships.groupId],
      references: [budgetGroups.id],
    }),
    budget: one(budgets, {
      fields: [budgetGroupMemberships.budgetId],
      references: [budgets.id],
    }),
  })
);

export const budgetPeriodTemplateRelations = relations(
  budgetPeriodTemplates,
  ({many, one}) => ({
    budget: one(budgets, {
      fields: [budgetPeriodTemplates.budgetId],
      references: [budgets.id],
    }),
    periods: many(budgetPeriodInstances),
  })
);

export const budgetPeriodInstanceRelations = relations(
  budgetPeriodInstances,
  ({one}) => ({
    template: one(budgetPeriodTemplates, {
      fields: [budgetPeriodInstances.templateId],
      references: [budgetPeriodTemplates.id],
    }),
  })
);

export const budgetAccountRelations = relations(budgetAccounts, ({one}) => ({
  budget: one(budgets, {
    fields: [budgetAccounts.budgetId],
    references: [budgets.id],
  }),
  account: one(accounts, {
    fields: [budgetAccounts.accountId],
    references: [accounts.id],
  }),
}));

export const budgetCategoryRelations = relations(budgetCategories, ({one}) => ({
  budget: one(budgets, {
    fields: [budgetCategories.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [budgetCategories.categoryId],
    references: [categories.id],
  }),
}));

export const budgetTransactionRelations = relations(
  budgetTransactions,
  ({one}) => ({
    budget: one(budgets, {
      fields: [budgetTransactions.budgetId],
      references: [budgets.id],
    }),
    transaction: one(transactions, {
      fields: [budgetTransactions.transactionId],
      references: [transactions.id],
    }),
  })
);

export const selectBudgetSchema = createSelectSchema(budgets);
export const insertBudgetSchema = createInsertSchema(budgets);

export const selectBudgetGroupSchema = createSelectSchema(budgetGroups);
export const insertBudgetGroupSchema = createInsertSchema(budgetGroups);

export const selectBudgetPeriodTemplateSchema = createSelectSchema(budgetPeriodTemplates);
export const insertBudgetPeriodTemplateSchema = createInsertSchema(budgetPeriodTemplates);

export const selectBudgetPeriodInstanceSchema = createSelectSchema(budgetPeriodInstances);
export const insertBudgetPeriodInstanceSchema = createInsertSchema(budgetPeriodInstances);

export const selectBudgetAccountSchema = createSelectSchema(budgetAccounts);
export const insertBudgetAccountSchema = createInsertSchema(budgetAccounts);

export const selectBudgetCategorySchema = createSelectSchema(budgetCategories);
export const insertBudgetCategorySchema = createInsertSchema(budgetCategories);

export const selectBudgetTransactionSchema = createSelectSchema(budgetTransactions);
export const insertBudgetTransactionSchema = createInsertSchema(budgetTransactions);

export const formBudgetSchema = createInsertSchema(budgets, {
  name: (schema) => schema.min(2).max(60),
  description: (schema) => schema.max(500).optional().nullable(),
  metadata: (schema) => schema.optional(),
});

// Budget Templates Table
export const budgetTemplates = sqliteTable("budget_template", {
  id: integer("id", {mode: "number"}).primaryKey({autoIncrement: true}),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", {enum: budgetTypes}).notNull(),
  scope: text("scope", {enum: budgetScopes}).notNull(),
  icon: text("icon").default("📊"),
  suggestedAmount: real("suggested_amount"),
  enforcementLevel: text("enforcement_level", {enum: budgetEnforcementLevels})
    .notNull()
    .default("warning"),
  metadata: text("metadata", {mode: "json"}).$type<Record<string, unknown>>(),
  isSystem: integer("is_system", {mode: "boolean"}).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
export type BudgetTemplate = typeof budgetTemplates.$inferSelect;
export type NewBudgetTemplate = typeof budgetTemplates.$inferInsert;
