// Financial goals for tracking savings targets, debt payoff, and balance milestones.
// Progress is computed at query time from the linked account's live balance.

import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { workspaces } from "./workspaces";

export const goalTypeEnum = [
  "savings_target",
  "debt_payoff",
  "contribution_ramp",
  "balance_target",
  "custom",
] as const;

export type GoalType = (typeof goalTypeEnum)[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  savings_target: "Savings Target",
  debt_payoff: "Debt Payoff",
  contribution_ramp: "Contribution Ramp",
  balance_target: "Balance Target",
  custom: "Custom",
};

export const financialGoals = sqliteTable(
  "financial_goal",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // URL-safe identifier for future routing
    slug: text("slug").notNull(),
    // Type determines how progress is interpreted and displayed
    goalType: text("goal_type").notNull().$type<GoalType>(),
    targetAmount: real("target_amount").notNull(),
    // ISO YYYY-MM-DD, nullable — no date means open-ended goal
    targetDate: text("target_date"),
    // Optional linked account — balance is read live for progress calculation
    accountId: integer("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
    completedAt: text("completed_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    // Snapshot of the account balance when the goal was created, for delta calculation
    startingBalance: real("starting_balance"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("financial_goal_workspace_idx").on(table.workspaceId),
    index("financial_goal_account_idx").on(table.accountId),
  ]
);

export type FinancialGoal = typeof financialGoals.$inferSelect;
export type NewFinancialGoal = typeof financialGoals.$inferInsert;
