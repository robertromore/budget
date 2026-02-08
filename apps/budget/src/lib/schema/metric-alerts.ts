import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { workspaces } from "./workspaces";

export const metricTypeEnum = ["monthly_spending", "category_spending", "account_spending"] as const;
export type MetricType = (typeof metricTypeEnum)[number];

export const conditionTypeEnum = ["above", "below"] as const;
export type ConditionType = (typeof conditionTypeEnum)[number];

export interface MetricAlertMetadata {
  /** How the threshold was calculated (average, median, highest, lowest, custom) */
  calculationMethod?: string;
  /** Number of data points used to derive the threshold */
  dataPointCount?: number;
  /** Month labels of selected data points */
  selectedMonths?: string[];
}

export const metricAlerts = sqliteTable(
  "metric_alert",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    metricType: text("metric_type", { enum: metricTypeEnum }).notNull(),
    conditionType: text("condition_type", { enum: conditionTypeEnum }).notNull(),
    threshold: real("threshold").notNull(),
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastTriggeredAt: text("last_triggered_at"),
    lastCheckedAt: text("last_checked_at"),
    triggerCount: integer("trigger_count").notNull().default(0),
    metadata: text("metadata", { mode: "json" }).$type<MetricAlertMetadata>().default({}),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("metric_alert_workspace_idx").on(table.workspaceId),
    index("metric_alert_active_idx").on(table.workspaceId, table.isActive),
  ]
);

export const metricAlertsRelations = relations(metricAlerts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [metricAlerts.workspaceId],
    references: [workspaces.id],
  }),
  account: one(accounts, {
    fields: [metricAlerts.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [metricAlerts.categoryId],
    references: [categories.id],
  }),
}));

export type MetricAlert = typeof metricAlerts.$inferSelect;
export type NewMetricAlert = typeof metricAlerts.$inferInsert;

export const selectMetricAlertSchema = createSelectSchema(metricAlerts);

export const createMetricAlertSchema = z.object({
  name: z.string().min(1, "Alert name is required").max(200),
  metricType: z.enum(metricTypeEnum),
  conditionType: z.enum(conditionTypeEnum),
  threshold: z.number().positive("Threshold must be positive"),
  accountId: z.number().positive().optional(),
  categoryId: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  metadata: z
    .object({
      calculationMethod: z.string().optional(),
      dataPointCount: z.number().optional(),
      selectedMonths: z.array(z.string()).optional(),
    })
    .optional(),
});

export const updateMetricAlertSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(200).optional(),
  conditionType: z.enum(conditionTypeEnum).optional(),
  threshold: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  metadata: z
    .object({
      calculationMethod: z.string().optional(),
      dataPointCount: z.number().optional(),
      selectedMonths: z.array(z.string()).optional(),
    })
    .optional(),
});

export const metricAlertIdSchema = z.object({
  id: z.number().positive(),
});
