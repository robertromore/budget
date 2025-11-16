import {relations, sql} from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {transactions} from "./transactions";
import {z} from "zod/v4";
import {payees} from "./payees";
import {categories} from "./categories";
import {accounts} from "./accounts";
import {scheduleDates} from "./schedule-dates";
import {budgets} from "./budgets";
import {workspaces} from "./workspaces";

export const schedules = sqliteTable(
  "schedules",
  {
    id: integer("id").primaryKey({autoIncrement: true}),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, {onDelete: "cascade"}),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status", {enum: ["active", "inactive"]}).default("active"),
    amount: real("amount").default(0).notNull(),
    amount_2: real("amount_2").default(0).notNull(),
    amount_type: text("amount_type", {enum: ["exact", "approximate", "range"]})
      .default("exact")
      .notNull(),
    recurring: integer("recurring", {mode: "boolean"}).default(false),
    auto_add: integer({mode: "boolean"}).default(false),
    dateId: integer("schedule_date_id").references((): AnySQLiteColumn => scheduleDates.id),
    payeeId: integer("payee_id")
      .notNull()
      .references(() => payees.id),
    categoryId: integer("category_id").references(() => categories.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    budgetId: integer("budget_id").references(() => budgets.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("schedules_workspace_id_idx").on(table.workspaceId),
    index("relations_schedule_schedule_date_idx").on(table.dateId),
    index("relations_schedule_account_idx").on(table.accountId),
    index("relations_schedule_payee_idx").on(table.payeeId),
    index("relations_schedule_category_idx").on(table.categoryId),
    index("relations_schedule_budget_idx").on(table.budgetId),
    index("schedule_status_idx").on(table.status),
    index("schedule_name_idx").on(table.name),
    index("schedule_slug_idx").on(table.slug),
  ]
);

export const schedulesRelations = relations(schedules, ({many, one}) => ({
  workspace: one(workspaces, {
    fields: [schedules.workspaceId],
    references: [workspaces.id],
  }),
  transactions: many(transactions),
  account: one(accounts, {
    fields: [schedules.accountId],
    references: [accounts.id],
  }),
  payee: one(payees, {
    fields: [schedules.payeeId],
    references: [payees.id],
  }),
  category: one(categories, {
    fields: [schedules.categoryId],
    references: [categories.id],
  }),
  scheduleDate: one(scheduleDates, {
    fields: [schedules.dateId],
    references: [scheduleDates.id],
  }),
  budget: one(budgets, {
    fields: [schedules.budgetId],
    references: [budgets.id],
  }),
}));

export const selectScheduleSchema = createSelectSchema(schedules);
export const insertScheduleSchema = createInsertSchema(schedules);
export const formInsertScheduleSchema = createInsertSchema(schedules, {
  workspaceId: (schema) => schema.optional(),
  name: (schema) => schema.min(2).max(30),
});
export const removeScheduleSchema = z.object({id: z.number().nonnegative()});
export const duplicateScheduleSchema = z.object({id: z.number().nonnegative()});

interface SchedulesExtraFields {
  payee?: any;
  scheduleDate?: any;
  account?: any;
  category?: any;
  budget?: any;
}

export type Schedule = typeof schedules.$inferSelect & Partial<SchedulesExtraFields>;
