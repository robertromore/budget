import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspaces } from "../workspaces";

export const homes = sqliteTable(
  "home",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cuid: text("cuid")
      .notNull()
      .$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    address: text("address"),
    notes: text("notes"),
    coverImageUrl: text("cover_image_url"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("home_workspace_id_idx").on(table.workspaceId),
    index("home_slug_idx").on(table.slug),
    index("home_deleted_at_idx").on(table.deletedAt),
  ]
);

export const selectHomeSchema = createSelectSchema(homes);
export const insertHomeSchema = createInsertSchema(homes, {
  name: (schema) =>
    schema
      .transform((val) => val?.trim())
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(100, "Name must be less than 100 characters")
      ),
  slug: (schema) =>
    schema
      .transform((val) => val?.trim()?.toLowerCase())
      .pipe(
        z
          .string()
          .min(1, "Slug is required")
          .max(100, "Slug must be less than 100 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      ),
  description: (schema) =>
    schema.pipe(z.string().max(500, "Description must be less than 500 characters")).optional().nullable(),
  address: (schema) =>
    schema.pipe(z.string().max(500, "Address must be less than 500 characters")).optional().nullable(),
});

export type Home = typeof homes.$inferSelect;
export type NewHome = typeof homes.$inferInsert;
