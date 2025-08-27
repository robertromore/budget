import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { transactions } from "./transactions";
import { z } from "zod/v4";
import { payees } from "./payees";
import { accounts } from "./accounts";
import { scheduleDates } from "./schedule-dates";

export const schedules = sqliteTable(
  "schedules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status", { enum: ["active", "inactive"] }).default("active"),
    amount: real("amount").default(0).notNull(),
    amount_2: real("amount_2").default(0).notNull(),
    amount_type: text("amount_type", { enum: ["exact", "approximate", "range"] })
      .default("exact")
      .notNull(),
    recurring: integer("recurring", { mode: "boolean" }).default(false),
    auto_add: integer({ mode: "boolean" }).default(false),
    dateId: integer("schedule_date_id").references((): AnySQLiteColumn => scheduleDates.id),
    payeeId: integer("payee_id")
      .notNull()
      .references(() => payees.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("relations_schedule_schedule_date_idx").on(table.dateId),
    index("relations_schedule_account_idx").on(table.accountId),
    index("relations_schedule_payee_idx").on(table.payeeId),
    index("schedule_status_idx").on(table.status),
    index("schedule_name_idx").on(table.name),
    index("schedule_slug_idx").on(table.slug),
  ]
);

export const schedulesRelations = relations(schedules, ({ many, one }) => ({
  transactions: many(transactions),
  account: one(accounts, {
    fields: [schedules.accountId],
    references: [accounts.id],
  }),
  payee: one(payees, {
    fields: [schedules.payeeId],
    references: [payees.id],
  }),
}));

export const selectScheduleSchema = createSelectSchema(schedules);
export const insertScheduleSchema = createInsertSchema(schedules);
export const formInsertScheduleSchema = createInsertSchema(schedules, {
  name: (schema) => schema.min(2).max(30),
});
export const removeScheduleSchema = z.object({ id: z.number().nonnegative() });

interface SchedulesExtraFields {}

export type Schedule = typeof schedules.$inferSelect & SchedulesExtraFields;
export type NewSchedule = typeof schedules.$inferInsert;
export type InsertScheduleSchema = typeof insertScheduleSchema;
export type FormInsertScheduleSchema = typeof formInsertScheduleSchema;
export type RemoveScheduleSchema = typeof removeScheduleSchema;
