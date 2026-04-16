import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "../workspaces";
import { homes } from "./homes";

export const locationTypeEnum = [
  "room",
  "area",
  "container",
  "shelf",
  "drawer",
  "closet",
  "garage",
  "shed",
  "attic",
  "basement",
  "other",
] as const;

export type LocationType = (typeof locationTypeEnum)[number];

export const homeLocations = sqliteTable(
  "home_location",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid")
      .notNull()
      .$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    homeId: integer("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnySQLiteColumn => homeLocations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    locationType: text("location_type", { enum: locationTypeEnum }).default("room"),
    icon: text("icon"),
    color: text("color"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("home_location_workspace_id_idx").on(table.workspaceId),
    index("home_location_home_id_idx").on(table.homeId),
    index("home_location_parent_id_idx").on(table.parentId),
    index("home_location_deleted_at_idx").on(table.deletedAt),
  ]
);

export const selectHomeLocationSchema = createSelectSchema(homeLocations);
export const insertHomeLocationSchema = createInsertSchema(homeLocations, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(100, "Name must be less than 100 characters")
      ),
  description: (schema) =>
    schema.pipe(z.string().max(500, "Description must be less than 500 characters")).optional().nullable(),
});

export type HomeLocation = typeof homeLocations.$inferSelect;
export type NewHomeLocation = typeof homeLocations.$inferInsert;
