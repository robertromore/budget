import type { ViewFilter, ViewDisplayState } from "$lib/types";
import { integer, text, sqliteTable, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspaces";

export const views = sqliteTable(
  "views",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entityType: text("entity_type", {
      enum: ["transactions", "top_categories"],
    })
      .notNull()
      .default("transactions"),
    name: text("name").notNull(),
    // label: text('label').notNull(),
    description: text("description"),
    icon: text("icon"),
    filters: text("filters", { mode: "json" }).$type<ViewFilter[]>(),
    display: text("display", { mode: "json" }).$type<ViewDisplayState>(),
    dirty: integer("dirty", { mode: "boolean" }),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    index("views_workspace_id_idx").on(table.workspaceId),
    index("idx_views_workspace_entity").on(table.workspaceId, table.entityType),
  ]
);

export const viewsRelations = relations(views, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [views.workspaceId],
    references: [workspaces.id],
  }),
}));

export const selectViewSchema = createSelectSchema(views);
export const insertViewSchema = createInsertSchema(views, {
  entityType: z.enum(["transactions", "top_categories"]).default("transactions"),
  name: z.string().min(2, "Name must contain at least 2 characters"),
  description: z
    .union([z.string().max(500, "Description must be less than 500 characters"), z.null()])
    .optional(),
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
        expanded: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
        visibility: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
        pinning: z.optional(
          z.object({
            left: z.optional(z.array(z.string())),
            right: z.optional(z.array(z.string())),
          })
        ),
        columnOrder: z.optional(z.array(z.string())),
        density: z.optional(z.enum(["normal", "dense"]).default("normal")),
        stickyHeader: z.optional(z.boolean().default(false)),
        pageSize: z.optional(z.number().int().positive().default(25)),
        viewMode: z.optional(z.enum(["table", "cards"]).default("table")),
      })
      .or(z.null())
  ),
}).omit({ workspaceId: true, isDefault: true });
export const removeViewSchema = z.object({ id: z.number().nonnegative() });
export const removeViewsSchema = z.object({ entities: z.array(z.number().nonnegative()) });

export type View = typeof views.$inferSelect;
