import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { priceProducts } from "./price-products";
import { workspaces } from "./workspaces";

export const priceAlertTypeEnum = [
  "price_drop",
  "target_reached",
  "back_in_stock",
  "any_change",
] as const;
export type PriceAlertType = (typeof priceAlertTypeEnum)[number];

export const priceAlerts = sqliteTable(
  "price_alert",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => priceProducts.id, { onDelete: "cascade" }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type", { enum: priceAlertTypeEnum }).notNull(),
    threshold: real("threshold"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    lastTriggeredAt: text("last_triggered_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("price_alert_product_idx").on(table.productId),
    index("price_alert_workspace_idx").on(table.workspaceId),
    index("price_alert_enabled_idx").on(table.enabled),
  ]
);

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  product: one(priceProducts, {
    fields: [priceAlerts.productId],
    references: [priceProducts.id],
  }),
  workspace: one(workspaces, {
    fields: [priceAlerts.workspaceId],
    references: [workspaces.id],
  }),
}));

export const selectPriceAlertSchema = createSelectSchema(priceAlerts);
export const insertPriceAlertSchema = createInsertSchema(priceAlerts);

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type NewPriceAlert = typeof priceAlerts.$inferInsert;
