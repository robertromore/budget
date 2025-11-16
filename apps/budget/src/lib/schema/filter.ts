import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const filterSchema = sqliteTable("filter", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  operator: text("operator").notNull(),
});

export type Filter = typeof filterSchema.$inferSelect;
