import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { priceProducts } from "./price-products";
import { workspaces } from "./workspaces";

export const priceRetailers = sqliteTable(
  "price_retailer",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    domain: text("domain"),
    website: text("website"),
    logoUrl: text("logo_url"),
    color: text("color"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("price_retailer_workspace_slug_idx").on(table.workspaceId, table.slug),
    index("price_retailer_workspace_idx").on(table.workspaceId),
  ]
);

export const priceRetailersRelations = relations(priceRetailers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [priceRetailers.workspaceId],
    references: [workspaces.id],
  }),
  products: many(priceProducts),
}));

export const selectPriceRetailerSchema = createSelectSchema(priceRetailers);
export const insertPriceRetailerSchema = createInsertSchema(priceRetailers);

export type PriceRetailer = typeof priceRetailers.$inferSelect;
export type NewPriceRetailer = typeof priceRetailers.$inferInsert;
