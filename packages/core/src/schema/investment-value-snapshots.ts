// Manual investment account value snapshots for performance tracking.
// One row per account per date — enables time-weighted return calculations
// and fee drag analysis without requiring broker API integrations.

import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts";
import { workspaces } from "./workspaces";

export const investmentValueSnapshots = sqliteTable(
  "investment_value_snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // ISO YYYY-MM-DD — one row per account per day
    snapshotDate: text("snapshot_date").notNull(),
    // Portfolio value on this date (total market value)
    value: real("value").notNull(),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("inv_snapshot_account_idx").on(table.accountId),
    index("inv_snapshot_workspace_idx").on(table.workspaceId),
    index("inv_snapshot_date_idx").on(table.snapshotDate),
    uniqueIndex("inv_snapshot_account_date_uidx").on(
      table.accountId,
      table.snapshotDate
    ),
  ]
);

export type InvestmentValueSnapshot = typeof investmentValueSnapshots.$inferSelect;
export type NewInvestmentValueSnapshot = typeof investmentValueSnapshots.$inferInsert;
