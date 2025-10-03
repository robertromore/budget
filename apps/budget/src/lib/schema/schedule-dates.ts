import {relations, sql} from "drizzle-orm";
import {sqliteTable, integer, text, index, type AnySQLiteColumn} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {z} from "zod/v4";
import {schedules} from "./schedules";

export const scheduleDates = sqliteTable(
  "schedule_dates",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    start: text("start_date")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    end: text("end_date"),
    frequency: text("frequency", {enum: ["daily", "weekly", "monthly", "yearly"]}),
    interval: integer("interval").default(1),
    limit: integer("limit").default(0),
    move_weekends: text("move_weekends", {
      enum: ["none", "next_weekday", "previous_weekday"],
    }).default("none"),
    move_holidays: text("move_holidays", {
      enum: ["none", "next_weekday", "previous_weekday"],
    }).default("none"),
    specific_dates: text("specific_dates", {mode: "json"}).default([]),
    on: integer("on", {mode: "boolean"}).default(false),
    on_type: text("on_type", {enum: ["day", "the"]}).default("day"),
    days: text("days", {mode: "json"}).default([]),
    weeks: text("weeks", {mode: "json"}).default([]),
    weeks_days: text("weeks_days", {mode: "json"}).default([]),
    week_days: text("week_days", {mode: "json"}).default([]),
    scheduleId: integer("schedule_id")
      .notNull()
      .references((): AnySQLiteColumn => schedules.id),
  },
  (table) => [index("relations_schedule_date_schedule_idx").on(table.scheduleId)]
);

export const scheduleDateRelations = relations(scheduleDates, ({one}) => ({
  schedule: one(schedules, {
    fields: [scheduleDates.scheduleId],
    references: [schedules.id],
  }),
}));

export const selectScheduleDateSchema = createSelectSchema(scheduleDates);
export const insertScheduleDateSchema = createInsertSchema(scheduleDates);
export const formInsertScheduleDateSchema = createInsertSchema(scheduleDates, {
  // name: (schema) => schema.min(2).max(30),
});
export const removeScheduleDateSchema = z.object({id: z.number().nonnegative()});

export type ScheduleDate = typeof scheduleDates.$inferSelect;
export type NewScheduleDate = typeof scheduleDates.$inferInsert;
export type InsertScheduleDateSchema = typeof insertScheduleDateSchema;
export type FormInsertScheduleDateSchema = typeof formInsertScheduleDateSchema;
export type RemoveScheduleDateSchema = typeof removeScheduleDateSchema;
