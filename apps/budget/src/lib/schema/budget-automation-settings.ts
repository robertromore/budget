import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { budgetGroups } from "./budgets";
import { budgetRecommendations } from "./recommendations";
import { workspaces } from "./workspaces";

/**
 * Budget Automation Settings
 *
 * User-configurable settings for budget group automation behavior.
 * Controls when and how the system automatically creates groups,
 * assigns budgets, and adjusts limits.
 */
export const budgetAutomationSettings = sqliteTable("budget_automation_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, {onDelete: "cascade"}),

  // Automation toggles
  autoCreateGroups: integer("auto_create_groups", { mode: "boolean" })
    .notNull()
    .default(false),
  autoAssignToGroups: integer("auto_assign_to_groups", { mode: "boolean" })
    .notNull()
    .default(false),
  autoAdjustGroupLimits: integer("auto_adjust_group_limits", { mode: "boolean" })
    .notNull()
    .default(false),

  // Control settings
  requireConfirmationThreshold: text("require_confirmation_threshold", {
    enum: ["high", "medium", "low"]
  }).notNull().default("medium"),

  enableSmartGrouping: integer("enable_smart_grouping", { mode: "boolean" })
    .notNull()
    .default(true),

  groupingStrategy: text("grouping_strategy", {
    enum: ["category-based", "account-based", "spending-pattern", "hybrid"]
  }).notNull().default("hybrid"),

  // Thresholds
  minSimilarityScore: real("min_similarity_score").notNull().default(70),
  minGroupSize: integer("min_group_size").notNull().default(2),

  // Timestamps
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("budget_automation_settings_workspace_id_idx").on(table.workspaceId),
]);

/**
 * Budget Automation Activity
 *
 * Audit log of all automated actions taken by the system.
 * Tracks what was done, when, and allows for rollback if needed.
 */
export const budgetAutomationActivity = sqliteTable(
  "budget_automation_activity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Action details
    actionType: text("action_type", {
      enum: ["create_group", "assign_to_group", "adjust_limit", "merge_groups"]
    }).notNull(),

    // References
    recommendationId: integer("recommendation_id")
      .references(() => budgetRecommendations.id, { onDelete: "set null" }),
    groupId: integer("group_id")
      .references(() => budgetGroups.id, { onDelete: "set null" }),

    // Affected entities (JSON arrays)
    budgetIds: text("budget_ids", { mode: "json" }).$type<number[]>(),

    // Status
    status: text("status", {
      enum: ["pending", "success", "failed", "rolled_back"]
    }).notNull().default("pending"),
    errorMessage: text("error_message"),

    // Audit data
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    rolledBackAt: text("rolled_back_at"),
  },
  (table) => [
    index("budget_automation_activity_status_idx").on(table.status),
    index("budget_automation_activity_created_at_idx").on(table.createdAt),
    index("budget_automation_activity_action_type_idx").on(table.actionType),
    index("budget_automation_activity_recommendation_idx").on(table.recommendationId),
    index("budget_automation_activity_group_idx").on(table.groupId),
  ]
);

// Relations
export const budgetAutomationSettingsRelations = relations(
  budgetAutomationSettings,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [budgetAutomationSettings.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const budgetAutomationActivityRelations = relations(
  budgetAutomationActivity,
  ({ one }) => ({
    recommendation: one(budgetRecommendations, {
      fields: [budgetAutomationActivity.recommendationId],
      references: [budgetRecommendations.id],
    }),
    group: one(budgetGroups, {
      fields: [budgetAutomationActivity.groupId],
      references: [budgetGroups.id],
    }),
  })
);

// Zod schemas for validation
export const selectAutomationSettingsSchema = createSelectSchema(budgetAutomationSettings);
export const insertAutomationSettingsSchema = createInsertSchema(budgetAutomationSettings);
export const formInsertAutomationSettingsSchema = createInsertSchema(budgetAutomationSettings, {
  workspaceId: (schema) => schema.optional(),
});

export const selectAutomationActivitySchema = createSelectSchema(budgetAutomationActivity);
export const insertAutomationActivitySchema = createInsertSchema(budgetAutomationActivity);

// TypeScript types
export type BudgetAutomationSettings = typeof budgetAutomationSettings.$inferSelect;
export type NewBudgetAutomationSettings = typeof budgetAutomationSettings.$inferInsert;
export type BudgetAutomationActivity = typeof budgetAutomationActivity.$inferSelect;
export type NewBudgetAutomationActivity = typeof budgetAutomationActivity.$inferInsert;

// Action type enum
export const automationActionTypes = [
  "create_group",
  "assign_to_group",
  "adjust_limit",
  "merge_groups",
] as const;

export type AutomationActionType = (typeof automationActionTypes)[number];

// Status enum
export const automationStatuses = [
  "pending",
  "success",
  "failed",
  "rolled_back",
] as const;

export type AutomationStatus = (typeof automationStatuses)[number];
