import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { priceProducts } from "./price-products";

export const priceSourceEnum = ["api", "scrape", "manual"] as const;
export type PriceSource = (typeof priceSourceEnum)[number];

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => priceProducts.id, { onDelete: "cascade" }),
    price: real("price").notNull(),
    inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
    source: text("source", { enum: priceSourceEnum }).notNull().default("scrape"),
    checkedAt: text("checked_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("price_history_product_idx").on(table.productId),
    index("price_history_checked_at_idx").on(table.checkedAt),
    index("price_history_product_checked_idx").on(table.productId, table.checkedAt),
  ]
);

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(priceProducts, {
    fields: [priceHistory.productId],
    references: [priceProducts.id],
  }),
}));

export const selectPriceWatcherHistorySchema = createSelectSchema(priceHistory);
export const insertPriceWatcherHistorySchema = createInsertSchema(priceHistory);

export type PriceHistoryEntry = typeof priceHistory.$inferSelect;
export type NewPriceHistoryEntry = typeof priceHistory.$inferInsert;
