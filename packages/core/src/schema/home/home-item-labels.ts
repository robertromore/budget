import { integer, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { homeItems } from "./home-items";
import { homeLabels } from "./home-labels";

export const homeItemLabels = sqliteTable(
  "home_item_label",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => homeItems.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => homeLabels.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("home_item_label_unique_idx").on(table.itemId, table.labelId)]
);

export type HomeItemLabel = typeof homeItemLabels.$inferSelect;
export type NewHomeItemLabel = typeof homeItemLabels.$inferInsert;
