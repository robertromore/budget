import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { priceProducts } from "./price-products";
import { workspaces } from "./workspaces";

/**
 * Named product groupings. A single table powers two UX surfaces,
 * distinguished by the `kind` column:
 *
 *   - `collection` (default): open-ended wishlists / tags that organise
 *     products the user is tracking.
 *   - `comparison`: a 2-to-6 product shortlist the user is actively
 *     deciding between (e.g. "Vacuum shortlist"). The compare UI
 *     renders side-by-side cards + a decision-helper summary on top of
 *     the existing overlay chart.
 *
 * Keeping both kinds in one table avoids duplicating the CRUD + junction
 * pattern; downstream UI filters by `kind` when it wants only one or
 * the other.
 */
export type PriceProductListKind = "collection" | "comparison";

export const priceProductLists = sqliteTable(
  "price_product_list",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    kind: text("kind", { enum: ["collection", "comparison"] })
      .notNull()
      .default("collection"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("price_product_list_workspace_idx").on(table.workspaceId),
    // Speeds up the kind-scoped index pages (e.g. /comparisons).
    index("price_product_list_kind_idx").on(table.workspaceId, table.kind),
  ]
);

export const priceProductListsRelations = relations(priceProductLists, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [priceProductLists.workspaceId],
    references: [workspaces.id],
  }),
  items: many(priceProductListItems),
}));

// List membership junction.
//
// `notes` is per-item freeform text used by comparison-kind lists (e.g.
// "noisy per reviews", "includes HEPA"). Collections don't render it
// today, but nothing blocks them from using the same field later. The
// column is nullable so existing rows migrate cleanly.
export const priceProductListItems = sqliteTable(
  "price_product_list_item",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listId: integer("list_id")
      .notNull()
      .references(() => priceProductLists.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => priceProducts.id, { onDelete: "cascade" }),
    notes: text("notes"),
    addedAt: text("added_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("price_product_list_item_unique_idx").on(table.listId, table.productId),
  ]
);

export const priceProductListItemsRelations = relations(priceProductListItems, ({ one }) => ({
  list: one(priceProductLists, {
    fields: [priceProductListItems.listId],
    references: [priceProductLists.id],
  }),
  product: one(priceProducts, {
    fields: [priceProductListItems.productId],
    references: [priceProducts.id],
  }),
}));

export const selectPriceProductListSchema = createSelectSchema(priceProductLists);
export const insertPriceProductListSchema = createInsertSchema(priceProductLists);
export const selectPriceProductListItemSchema = createSelectSchema(priceProductListItems);
export const insertPriceProductListItemSchema = createInsertSchema(priceProductListItems);

export type PriceProductList = typeof priceProductLists.$inferSelect;
export type NewPriceProductList = typeof priceProductLists.$inferInsert;
export type PriceProductListItem = typeof priceProductListItems.$inferSelect;
export type NewPriceProductListItem = typeof priceProductListItems.$inferInsert;
