import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { widgetSizeEnum, type WidgetSettings } from "./dashboards";
import { workspaces } from "./workspaces";

export const dashboardWidgetGroups = sqliteTable(
  "dashboard_widget_group",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon"),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("dashboard_widget_group_workspace_idx").on(table.workspaceId),
    uniqueIndex("dashboard_widget_group_workspace_slug_idx").on(
      table.workspaceId,
      table.slug
    ),
  ]
);

export const dashboardWidgetGroupItems = sqliteTable(
  "dashboard_widget_group_item",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("group_id")
      .notNull()
      .references(() => dashboardWidgetGroups.id, { onDelete: "cascade" }),
    widgetType: text("widget_type").notNull(),
    title: text("title"),
    size: text("size", { enum: widgetSizeEnum }).notNull().default("medium"),
    columnSpan: integer("column_span").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    settings: text("settings", { mode: "json" }).$type<WidgetSettings>(),
  },
  (table) => [
    index("dashboard_widget_group_item_group_idx").on(table.groupId, table.sortOrder),
  ]
);

export const dashboardWidgetGroupsRelations = relations(
  dashboardWidgetGroups,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [dashboardWidgetGroups.workspaceId],
      references: [workspaces.id],
    }),
    items: many(dashboardWidgetGroupItems),
  })
);

export const dashboardWidgetGroupItemsRelations = relations(
  dashboardWidgetGroupItems,
  ({ one }) => ({
    group: one(dashboardWidgetGroups, {
      fields: [dashboardWidgetGroupItems.groupId],
      references: [dashboardWidgetGroups.id],
    }),
  })
);

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

export const selectDashboardWidgetGroupSchema = createSelectSchema(dashboardWidgetGroups);
export const selectDashboardWidgetGroupItemSchema = createSelectSchema(
  dashboardWidgetGroupItems
);

export const insertDashboardWidgetGroupSchema = createInsertSchema(dashboardWidgetGroups, {
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  slug: z.string().min(1).max(100),
  description: z
    .union([z.string().max(500, "Description must be 500 characters or less"), z.null()])
    .optional(),
  icon: z.union([z.string().max(50), z.null()]).optional(),
  isSystem: z.boolean().optional(),
}).omit({ workspaceId: true, createdAt: true, updatedAt: true });

export const insertDashboardWidgetGroupItemSchema = createInsertSchema(
  dashboardWidgetGroupItems,
  {
    widgetType: z.string().min(1, "Widget type is required"),
    title: z.union([z.string().max(100), z.null()]).optional(),
    size: z.enum(widgetSizeEnum).optional(),
    columnSpan: z.number().int().min(1).max(4).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    settings: widgetSettingsSchema.or(z.null()).optional(),
  }
);

export type DashboardWidgetGroup = typeof dashboardWidgetGroups.$inferSelect;
export type NewDashboardWidgetGroup = typeof dashboardWidgetGroups.$inferInsert;
export type DashboardWidgetGroupItem = typeof dashboardWidgetGroupItems.$inferSelect;
export type NewDashboardWidgetGroupItem = typeof dashboardWidgetGroupItems.$inferInsert;
export type DashboardWidgetGroupWithItems = DashboardWidgetGroup & {
  items: DashboardWidgetGroupItem[];
};
