import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { priceProducts } from "./price-products";
import { workspaces } from "./workspaces";

// Named lists/wishlists
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
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("price_product_list_workspace_idx").on(table.workspaceId),
  ]
);

export const priceProductListsRelations = relations(priceProductLists, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [priceProductLists.workspaceId],
    references: [workspaces.id],
  }),
  items: many(priceProductListItems),
}));

// List membership junction
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
