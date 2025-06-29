import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { transactions } from "./transactions";
import type { Transaction } from "./transactions";
import { z } from "zod/v4";

export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status", { enum: ["active", "inactive"] }).default("active"),
  amount: integer("amount").default(0).notNull(),
  recurring: integer("recurring", { mode: "boolean" }).default(false),
});

export const schedulesRelations = relations(schedules, ({ many }) => ({
  transactions: many(transactions),
}));

export const selectScheduleSchema = createSelectSchema(schedules);
export const insertScheduleSchema = createInsertSchema(schedules);
export const formInsertScheduleSchema = createInsertSchema(schedules, {
  name: (schema) => schema.min(2).max(30),
});
export const removeScheduleSchema = z.object({ id: z.number().nonnegative() });

type WithTransactions = {
  transactions: Transaction[];
};

interface SchedulesExtraFields {}

export type Schedule = typeof schedules.$inferSelect & SchedulesExtraFields;
export type NewSchedule = typeof schedules.$inferInsert;
export type InsertScheduleSchema = typeof insertScheduleSchema;
export type FormInsertScheduleSchema = typeof formInsertScheduleSchema;
export type RemoveScheduleSchema = typeof removeScheduleSchema;
