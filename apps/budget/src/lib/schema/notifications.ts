import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "./workspaces";

export const notificationTypeEnum = ["success", "error", "info", "warning", "loading"] as const;
export type NotificationType = (typeof notificationTypeEnum)[number];

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(), // UUID string from client
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type", { enum: notificationTypeEnum }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    persistent: integer("persistent", { mode: "boolean" }).default(false),
  },
  (table) => [
    index("notifications_workspace_id_idx").on(table.workspaceId),
    index("notifications_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
  }),
}));

export const selectNotificationSchema = createSelectSchema(notifications);
export const insertNotificationSchema = createInsertSchema(notifications, {
  id: z.string().uuid(),
  type: z.enum(notificationTypeEnum),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  // Handle Date objects that get serialized to strings over tRPC
  createdAt: z.coerce.date(),
  read: z.boolean().default(false),
  persistent: z.boolean().optional(),
}).omit({ workspaceId: true });

export const markNotificationReadSchema = z.object({
  id: z.string().uuid(),
});

export const dismissNotificationSchema = z.object({
  id: z.string().uuid(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
