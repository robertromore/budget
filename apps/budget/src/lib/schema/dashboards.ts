import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "./workspaces";

// --- Layout and widget settings types ---

export const dashboardGapEnum = ["compact", "normal", "spacious"] as const;
export type DashboardGap = (typeof dashboardGapEnum)[number];

export const widgetSizeEnum = ["small", "medium", "large", "full"] as const;
export type WidgetSize = (typeof widgetSizeEnum)[number];

export interface DashboardLayoutConfig {
  columns: 1 | 2 | 3 | 4;
  gap: DashboardGap;
}

export interface WidgetSettings {
  period?: "week" | "month" | "quarter" | "year";
  accountIds?: number[];
  categoryIds?: number[];
  limit?: number;
  chartType?: string;
  showTrend?: boolean;
  [key: string]: unknown;
}

// --- Tables ---

export const dashboards = sqliteTable(
  "dashboard",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    layout: text("layout", { mode: "json" }).$type<DashboardLayoutConfig>(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("dashboard_workspace_id_idx").on(table.workspaceId),
    uniqueIndex("dashboard_workspace_slug_idx").on(table.workspaceId, table.slug),
    index("dashboard_workspace_default_idx").on(table.workspaceId, table.isDefault),
    index("dashboard_deleted_at_idx").on(table.deletedAt),
  ]
);

export const dashboardWidgets = sqliteTable(
  "dashboard_widget",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dashboardId: integer("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    widgetType: text("widget_type").notNull(),
    title: text("title"),
    size: text("size", { enum: widgetSizeEnum }).notNull().default("medium"),
    sortOrder: integer("sort_order").notNull().default(0),
    columnSpan: integer("column_span").notNull().default(1),
    settings: text("settings", { mode: "json" }).$type<WidgetSettings>(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("dashboard_widget_dashboard_id_idx").on(table.dashboardId),
    index("dashboard_widget_sort_idx").on(table.dashboardId, table.sortOrder),
  ]
);

// --- Relations ---

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [dashboards.workspaceId],
    references: [workspaces.id],
  }),
  widgets: many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardWidgets.dashboardId],
    references: [dashboards.id],
  }),
}));

// --- Zod schemas ---

const dashboardLayoutSchema = z.object({
  columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  gap: z.enum(dashboardGapEnum),
});

const widgetSettingsSchema = z
  .object({
    period: z.enum(["week", "month", "quarter", "year"]).optional(),
    accountIds: z.array(z.number()).optional(),
    categoryIds: z.array(z.number()).optional(),
    limit: z.number().int().positive().optional(),
    chartType: z.string().optional(),
    showTrend: z.boolean().optional(),
  })
  .catchall(z.unknown());

export const selectDashboardSchema = createSelectSchema(dashboards);
export const selectDashboardWidgetSchema = createSelectSchema(dashboardWidgets);

export const insertDashboardSchema = createInsertSchema(dashboards, {
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  slug: z.string().min(1).max(100),
  description: z
    .union([z.string().max(500, "Description must be 500 characters or less"), z.null()])
    .optional(),
  icon: z.union([z.string().max(50), z.null()]).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  layout: dashboardLayoutSchema.or(z.null()).optional(),
}).omit({ workspaceId: true, createdAt: true, updatedAt: true, deletedAt: true });

export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets, {
  widgetType: z.string().min(1, "Widget type is required"),
  title: z.union([z.string().max(100), z.null()]).optional(),
  size: z.enum(widgetSizeEnum).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  columnSpan: z.number().int().min(1).max(4).optional(),
  settings: widgetSettingsSchema.or(z.null()).optional(),
}).omit({ createdAt: true, updatedAt: true });

export const removeDashboardSchema = z.object({ id: z.number().nonnegative() });
export const removeDashboardWidgetSchema = z.object({ id: z.number().nonnegative() });
export const reorderWidgetsSchema = z.object({
  dashboardId: z.number().nonnegative(),
  widgetIds: z.array(z.number().nonnegative()),
});

// --- Types ---

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;
export type DashboardWithWidgets = Dashboard & { widgets: DashboardWidget[] };
