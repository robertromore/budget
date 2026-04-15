import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { priceProducts } from "./price-products";
import { workspaces } from "./workspaces";

export const priceProductTags = sqliteTable(
  "price_product_tag",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => priceProducts.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("price_product_tag_unique_idx").on(table.productId, table.tag),
    index("price_product_tag_workspace_idx").on(table.workspaceId),
    index("price_product_tag_tag_idx").on(table.tag),
  ]
);

export const priceProductTagsRelations = relations(priceProductTags, ({ one }) => ({
  product: one(priceProducts, {
    fields: [priceProductTags.productId],
    references: [priceProducts.id],
  }),
  workspace: one(workspaces, {
    fields: [priceProductTags.workspaceId],
    references: [workspaces.id],
  }),
}));

export const selectPriceProductTagSchema = createSelectSchema(priceProductTags);
export const insertPriceProductTagSchema = createInsertSchema(priceProductTags);

export type PriceProductTag = typeof priceProductTags.$inferSelect;
export type NewPriceProductTag = typeof priceProductTags.$inferInsert;
