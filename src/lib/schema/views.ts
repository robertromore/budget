import type { ViewFilter, ViewDisplayState } from "$lib/types";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const views = sqliteTable("views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // label: text('label').notNull(),
  description: text("description"),
  icon: text("icon"),
  filters: text("filters", { mode: "json" }).$type<ViewFilter[]>(),
  display: text("display", { mode: "json" }).$type<ViewDisplayState>(),
  dirty: integer("dirty", { mode: "boolean" }),
});

export const selectViewSchema = createSelectSchema(views);
export const insertViewSchema = createInsertSchema(views, {
  name: z.string().min(2, "Name must contain at least 2 characters"),
  filters: z.optional(
    z
      .array(
        z.object({
          column: z.string(),
          filter: z.string(),
          value: z.array(z.unknown()),
        })
      )
      .or(z.null())
  ),
  display: z.optional(
    z
      .object({
        grouping: z.optional(z.array(z.string())),
        sort: z.optional(
          z.array(
            z.object({
              desc: z.boolean(),
              id: z.string(),
            })
          )
        ),
        expanded: z.optional(z.record(z.string(), z.boolean())),
        visibility: z.optional(z.record(z.string(), z.boolean())),
      })
      .or(z.null())
  ),
});
export const removeViewSchema = z.object({ id: z.number().nonnegative() });
export const removeViewsSchema = z.object({ entities: z.array(z.number().nonnegative()) });

export type View = typeof views.$inferSelect;
export type NewView = typeof views.$inferInsert;
export type InsertViewSchema = typeof insertViewSchema;
export type RemoveViewSchema = typeof removeViewSchema;
export type RemoveViewsSchema = typeof removeViewsSchema;
