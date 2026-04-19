import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { budgets } from "./budgets";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Per-user pins for budgets. A pin surfaces a budget in the "Pinned"
 * section at the top of the Budgets Overview. Pins are user-scoped (not
 * workspace-shared): two collaborators in the same workspace maintain
 * independent pin sets.
 */
export const budgetPins = sqliteTable(
  "budget_pins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    budgetId: integer("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("budget_pins_user_budget_uniq").on(table.userId, table.budgetId),
    index("budget_pins_workspace_user_idx").on(table.workspaceId, table.userId),
  ],
);

export const budgetPinsRelations = relations(budgetPins, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [budgetPins.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [budgetPins.userId],
    references: [users.id],
  }),
  budget: one(budgets, {
    fields: [budgetPins.budgetId],
    references: [budgets.id],
  }),
}));

export const selectBudgetPinSchema = createSelectSchema(budgetPins);
export const insertBudgetPinSchema = createInsertSchema(budgetPins);

export type BudgetPin = typeof budgetPins.$inferSelect;
export type NewBudgetPin = typeof budgetPins.$inferInsert;
