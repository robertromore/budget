// Daily net worth snapshots captured lazily on first request each day.
// Provides the time-series data needed for net worth trend charts.

import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const netWorthSnapshots = sqliteTable(
  "net_worth_snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // ISO YYYY-MM-DD — one row per workspace per day
    snapshotDate: text("snapshot_date").notNull(),
    totalNetWorth: real("total_net_worth").notNull(),
    totalAssets: real("total_assets").notNull(),
    totalLiabilities: real("total_liabilities").notNull(),
    // JSON: Record<AccountType, number> — balance contribution per account type
    byAccountType: text("by_account_type"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("net_worth_snapshot_workspace_idx").on(table.workspaceId),
    index("net_worth_snapshot_date_idx").on(table.snapshotDate),
    uniqueIndex("net_worth_snapshot_workspace_date_uidx").on(
      table.workspaceId,
      table.snapshotDate
    ),
  ]
);

export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type NewNetWorthSnapshot = typeof netWorthSnapshots.$inferInsert;
