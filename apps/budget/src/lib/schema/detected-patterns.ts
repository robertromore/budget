import {relations, sql} from "drizzle-orm";
import {sqliteTable, integer, text, real, index} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {accounts} from "./accounts";
import {payees} from "./payees";
import {categories} from "./categories";
import {schedules} from "./schedules";

export interface SuggestedScheduleConfig {
  // Core schedule fields
  name: string;
  amountType: "exact" | "approximate" | "range";
  amount: number;
  amount2?: number;
  autoAdd: boolean;
  recurring: boolean;

  // Schedule date fields
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  startDate: string;
  endDate?: string;

  // Advanced options (Phase 4)
  on?: boolean;
  onType?: "day" | "the";
  days?: number[];
  weekDays?: number[];
  weeks?: number[];
  weeksDays?: number[];
  moveWeekends?: "none" | "next_weekday" | "previous_weekday";
  moveHolidays?: "none" | "next_weekday" | "previous_weekday";
}

export const detectedPatterns = sqliteTable(
  "detected_patterns",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, {onDelete: "cascade"}),
    patternType: text("pattern_type", {
      enum: ["daily", "weekly", "monthly", "yearly"],
    }).notNull(),
    confidenceScore: real("confidence_score").notNull(),
    sampleTransactionIds: text("sample_transaction_ids", {mode: "json"})
      .notNull()
      .$type<number[]>(),
    payeeId: integer("payee_id").references(() => payees.id, {onDelete: "set null"}),
    categoryId: integer("category_id").references(() => categories.id, {onDelete: "set null"}),
    amountMin: real("amount_min"),
    amountMax: real("amount_max"),
    amountAvg: real("amount_avg"),
    intervalDays: integer("interval_days"),
    status: text("status", {
      enum: ["pending", "accepted", "dismissed", "converted"],
    }).default("pending"),
    scheduleId: integer("schedule_id").references(() => schedules.id, {onDelete: "set null"}),
    suggestedScheduleConfig: text("suggested_schedule_config", {mode: "json"}).$type<
      SuggestedScheduleConfig
    >(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastOccurrence: text("last_occurrence"),
    nextExpected: text("next_expected"),
  },
  (table) => [
    index("idx_detected_patterns_account").on(table.accountId),
    index("idx_detected_patterns_status").on(table.status),
    index("idx_detected_patterns_confidence").on(table.confidenceScore),
  ]
);

export const detectedPatternsRelations = relations(detectedPatterns, ({one}) => ({
  account: one(accounts, {
    fields: [detectedPatterns.accountId],
    references: [accounts.id],
  }),
  payee: one(payees, {
    fields: [detectedPatterns.payeeId],
    references: [payees.id],
  }),
  category: one(categories, {
    fields: [detectedPatterns.categoryId],
    references: [categories.id],
  }),
  schedule: one(schedules, {
    fields: [detectedPatterns.scheduleId],
    references: [schedules.id],
  }),
}));

export const selectDetectedPatternSchema = createSelectSchema(detectedPatterns);
export const insertDetectedPatternSchema = createInsertSchema(detectedPatterns);

export type DetectedPattern = typeof detectedPatterns.$inferSelect;
export type NewDetectedPattern = typeof detectedPatterns.$inferInsert;
