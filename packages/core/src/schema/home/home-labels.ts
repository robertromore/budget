import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "../workspaces";
import { homes } from "./homes";

export const homeLabels = sqliteTable(
  "home_label",
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
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("home_label_workspace_id_idx").on(table.workspaceId),
    index("home_label_home_id_idx").on(table.homeId),
    index("home_label_deleted_at_idx").on(table.deletedAt),
  ]
);

export const selectHomeLabelSchema = createSelectSchema(homeLabels);
export const insertHomeLabelSchema = createInsertSchema(homeLabels, {
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
  color: (schema) =>
    schema
      .pipe(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color"))
      .optional()
      .nullable(),
});

export type HomeLabel = typeof homeLabels.$inferSelect;
export type NewHomeLabel = typeof homeLabels.$inferInsert;
