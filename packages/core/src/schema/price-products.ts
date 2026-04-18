import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { workspaces } from "./workspaces";
import { priceHistory } from "./price-history";
import { priceAlerts } from "./price-alerts";
import { priceRetailers } from "./price-retailers";

export const priceProductStatusEnum = ["active", "paused", "error"] as const;
export type PriceProductStatus = (typeof priceProductStatusEnum)[number];

export const priceProducts = sqliteTable(
  "price_product",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seq: integer("seq"),
    cuid: text("cuid").$defaultFn(() => createId()),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    retailer: text("retailer").notNull(),
    retailerId: integer("retailer_id").references(() => priceRetailers.id, { onDelete: "set null" }),
    imageUrl: text("image_url"),
    images: text("images"), // JSON array of additional image URLs
    description: text("description"),
    currentPrice: real("current_price"),
    lowestPrice: real("lowest_price"),
    highestPrice: real("highest_price"),
    targetPrice: real("target_price"),
    currency: text("currency").notNull().default("USD"),
    lastCheckedAt: text("last_checked_at"),
    status: text("status", { enum: priceProductStatusEnum }).notNull().default("active"),
    errorMessage: text("error_message"),
    errorCount: integer("error_count").notNull().default(0),
    checkInterval: integer("check_interval").notNull().default(6),
    slug: text("slug").notNull().unique(),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("price_product_workspace_idx").on(table.workspaceId),
    index("price_product_retailer_idx").on(table.retailer),
    index("price_product_retailer_id_idx").on(table.retailerId),
    index("price_product_status_idx").on(table.status),
    index("price_product_slug_idx").on(table.slug),
    index("price_product_deleted_at_idx").on(table.deletedAt),
  ]
);

export const priceProductsRelations = relations(priceProducts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [priceProducts.workspaceId],
    references: [workspaces.id],
  }),
  retailerEntity: one(priceRetailers, {
    fields: [priceProducts.retailerId],
    references: [priceRetailers.id],
  }),
  history: many(priceHistory),
  alerts: many(priceAlerts),
}));

export const selectPriceProductSchema = createSelectSchema(priceProducts);
export const insertPriceProductSchema = createInsertSchema(priceProducts);

export type PriceProduct = typeof priceProducts.$inferSelect;
export type NewPriceProduct = typeof priceProducts.$inferInsert;
