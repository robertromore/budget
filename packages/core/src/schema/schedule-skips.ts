import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schedules } from "./schedules";
import { workspaces } from "./workspaces";

/**
 * Schedule skips track when a user skips an upcoming scheduled transaction.
 * Two skip types are supported:
 * - "single": Skip just this one occurrence, future dates continue normally
 * - "push_forward": Skip and shift all future dates by one interval (reversible)
 */
export const scheduleSkips = sqliteTable(
  "schedule_skips",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),

    // The specific date that was skipped (ISO format: YYYY-MM-DD)
    skippedDate: text("skipped_date").notNull(),

    // Type of skip action
    skipType: text("skip_type", { enum: ["single", "push_forward"] })
      .notNull()
      .default("single"),

    // Optional reason for skipping
    reason: text("reason"),

    // Metadata
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("schedule_skips_workspace_id_idx").on(table.workspaceId),
    index("schedule_skips_schedule_id_idx").on(table.scheduleId),
    index("schedule_skips_skipped_date_idx").on(table.skippedDate),
    index("schedule_skips_schedule_date_idx").on(table.scheduleId, table.skippedDate),
  ]
);

export const scheduleSkipsRelations = relations(scheduleSkips, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [scheduleSkips.workspaceId],
    references: [workspaces.id],
  }),
  schedule: one(schedules, {
    fields: [scheduleSkips.scheduleId],
    references: [schedules.id],
  }),
}));

// Zod schemas
export const selectScheduleSkipSchema = createSelectSchema(scheduleSkips);
export const insertScheduleSkipSchema = createInsertSchema(scheduleSkips);

// Schema for creating a skip
export const createSkipSchema = z.object({
  scheduleId: z.number().int().positive(),
  skippedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  reason: z.string().max(500).optional(),
});

// Schema for removing a skip (un-skip)
export const removeSkipSchema = z.object({
  id: z.number().int().positive(),
});

// Types
export type ScheduleSkip = typeof scheduleSkips.$inferSelect;
export type NewScheduleSkip = typeof scheduleSkips.$inferInsert;
