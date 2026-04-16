import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "../workspaces";
import { homeItems } from "./home-items";

export const maintenanceTypeEnum = ["scheduled", "completed"] as const;

export type MaintenanceType = (typeof maintenanceTypeEnum)[number];

export const homeMaintenance = sqliteTable(
  "home_maintenance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid")
      .notNull()
      .$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => homeItems.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    maintenanceType: text("maintenance_type", { enum: maintenanceTypeEnum })
      .notNull()
      .default("completed"),
    scheduledDate: text("scheduled_date"),
    completedDate: text("completed_date"),
    cost: real("cost"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("home_maintenance_workspace_id_idx").on(table.workspaceId),
    index("home_maintenance_item_id_idx").on(table.itemId),
    index("home_maintenance_scheduled_date_idx").on(table.scheduledDate),
  ]
);

export const selectHomeMaintenanceSchema = createSelectSchema(homeMaintenance);
export const insertHomeMaintenanceSchema = createInsertSchema(homeMaintenance, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(200, "Name must be less than 200 characters")
      ),
  cost: (schema) => schema.pipe(z.number().min(0, "Cost must be non-negative")).optional().nullable(),
});

export type HomeMaintenance = typeof homeMaintenance.$inferSelect;
export type NewHomeMaintenance = typeof homeMaintenance.$inferInsert;
