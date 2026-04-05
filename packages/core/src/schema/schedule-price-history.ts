import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schedules } from "./schedules";
import { transactions } from "./transactions";

// ==================== PRICE CHANGE TYPE ENUM ====================

export const schedulePriceChangeTypes = ["increase", "decrease", "initial"] as const;

export type SchedulePriceChangeType = (typeof schedulePriceChangeTypes)[number];

// ==================== SCHEDULE PRICE HISTORY TABLE ====================

export const schedulePriceHistory = sqliteTable(
  "schedule_price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    previousAmount: real("previous_amount"),
    effectiveDate: text("effective_date").notNull(),
    changeType: text("change_type", { enum: schedulePriceChangeTypes }).notNull(),
    changePercentage: real("change_percentage"),
    detectedFromTransactionId: integer("detected_from_transaction_id").references(
      () => transactions.id,
      { onDelete: "set null" }
    ),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("schedule_price_history_schedule_id_idx").on(table.scheduleId),
    index("schedule_price_history_effective_date_idx").on(table.effectiveDate),
    index("schedule_price_history_transaction_idx").on(table.detectedFromTransactionId),
  ]
);

export const schedulePriceHistoryRelations = relations(schedulePriceHistory, ({ one }) => ({
  schedule: one(schedules, {
    fields: [schedulePriceHistory.scheduleId],
    references: [schedules.id],
  }),
  transaction: one(transactions, {
    fields: [schedulePriceHistory.detectedFromTransactionId],
    references: [transactions.id],
  }),
}));

// ==================== ZOD SCHEMAS ====================

export const selectSchedulePriceHistorySchema = createSelectSchema(schedulePriceHistory);
export const insertSchedulePriceHistorySchema = createInsertSchema(schedulePriceHistory, {
  amount: (schema) => schema.positive("Amount must be positive"),
  changeType: z.enum(schedulePriceChangeTypes),
});

// ==================== TYPE EXPORTS ====================

export type SchedulePriceHistory = typeof schedulePriceHistory.$inferSelect;
export type InsertSchedulePriceHistory = typeof schedulePriceHistory.$inferInsert;
