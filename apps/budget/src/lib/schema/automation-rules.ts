/**
 * Automation Rules Schema
 *
 * Database schema for the rule-based automation system.
 * Rules are evaluated when trigger events occur and can
 * execute actions when conditions are met.
 */

import type {
  ActionConfig,
  ActionResult,
  ConditionGroup,
  FlowState,
  TriggerConfig,
} from "$lib/types/automation";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { workspaces } from "./workspaces";

/**
 * Automation Rules
 *
 * Stores user-defined automation rules with triggers, conditions, and actions.
 * Each rule belongs to a workspace and can be enabled/disabled.
 */
export const automationRules = sqliteTable(
  "automation_rules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Rule metadata
    name: text("name").notNull(),
    description: text("description"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    priority: integer("priority").notNull().default(0), // Higher = runs first

    // Rule definition (JSON)
    trigger: text("trigger", { mode: "json" }).$type<TriggerConfig>().notNull(),
    conditions: text("conditions", { mode: "json" }).$type<ConditionGroup>().notNull(),
    actions: text("actions", { mode: "json" }).$type<ActionConfig[]>().notNull(),

    // Visual editor state (SvelteFlow nodes/edges)
    flowState: text("flow_state", { mode: "json" }).$type<FlowState>(),

    // Execution settings
    stopOnMatch: integer("stop_on_match", { mode: "boolean" }).default(true),
    runOnce: integer("run_once", { mode: "boolean" }).default(false),

    // Stats
    lastTriggeredAt: text("last_triggered_at"),
    triggerCount: integer("trigger_count").notNull().default(0),

    // Timestamps
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("automation_rules_workspace_id_idx").on(table.workspaceId),
    index("automation_rules_enabled_idx").on(table.workspaceId, table.isEnabled),
    index("automation_rules_priority_idx").on(table.workspaceId, table.priority),
  ]
);

/**
 * Automation Rule Logs
 *
 * Audit log of all rule evaluations and executions.
 * Tracks what triggered the rule, whether conditions matched,
 * and what actions were executed.
 */
export const automationRuleLogs = sqliteTable(
  "automation_rule_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ruleId: integer("rule_id")
      .notNull()
      .references(() => automationRules.id, { onDelete: "cascade" }),

    // What triggered it
    triggerEvent: text("trigger_event").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),

    // Result
    status: text("status", {
      enum: ["success", "failed", "skipped"],
    }).notNull(),

    // What happened
    conditionsMatched: integer("conditions_matched", { mode: "boolean" }),
    actionsExecuted: text("actions_executed", { mode: "json" }).$type<ActionResult[]>(),
    errorMessage: text("error_message"),

    // Performance
    executionTimeMs: integer("execution_time_ms"),

    // Entity snapshot (for debugging)
    entitySnapshot: text("entity_snapshot", { mode: "json" }).$type<Record<string, unknown>>(),

    // Timestamp
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("automation_rule_logs_rule_id_idx").on(table.ruleId),
    index("automation_rule_logs_status_idx").on(table.status),
    index("automation_rule_logs_created_at_idx").on(table.createdAt),
    index("automation_rule_logs_entity_idx").on(table.entityType, table.entityId),
  ]
);

// Relations
export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [automationRules.workspaceId],
    references: [workspaces.id],
  }),
  logs: many(automationRuleLogs),
}));

export const automationRuleLogsRelations = relations(automationRuleLogs, ({ one }) => ({
  rule: one(automationRules, {
    fields: [automationRuleLogs.ruleId],
    references: [automationRules.id],
  }),
}));

// Zod schemas for validation
export const selectAutomationRuleSchema = createSelectSchema(automationRules);
export const insertAutomationRuleSchema = createInsertSchema(automationRules);

export const selectAutomationRuleLogSchema = createSelectSchema(automationRuleLogs);
export const insertAutomationRuleLogSchema = createInsertSchema(automationRuleLogs);

// Form schemas with validation
export const formInsertAutomationRuleSchema = createInsertSchema(automationRules, {
  name: (schema) =>
    schema
      .min(1, "Rule name is required")
      .max(100, "Rule name must be less than 100 characters"),
  description: (schema) =>
    schema.max(500, "Description must be less than 500 characters").optional().nullable(),
  priority: (schema) =>
    schema.min(-1000, "Priority too low").max(1000, "Priority too high"),
});

// TypeScript types
export type AutomationRule = typeof automationRules.$inferSelect;
export type NewAutomationRule = typeof automationRules.$inferInsert;
export type AutomationRuleLog = typeof automationRuleLogs.$inferSelect;
export type NewAutomationRuleLog = typeof automationRuleLogs.$inferInsert;

// Status enum
export const ruleLogStatuses = ["success", "failed", "skipped"] as const;
export type RuleLogStatus = (typeof ruleLogStatuses)[number];
