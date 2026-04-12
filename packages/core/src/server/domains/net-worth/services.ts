import { db } from "$core/server/db";
import { accounts, isDebtAccount } from "$core/schema/accounts";
import { transactions } from "$core/schema/transactions";
import type { AccountType } from "$core/schema/accounts";
import { and, eq, gt, isNull, sum } from "drizzle-orm";
import * as repository from "./repository";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Calculate the current balance for a single account, respecting any
// reconciliation or balance-reset checkpoints.
// Mirrors the logic in calculateAccountBalance() in trpc/routes/accounts.ts:
//   - Debt accounts (credit_card, loan) store checkpoints as positive amounts
//     owed, so they must be negated to produce the correct signed balance.
//   - The cutoff date is exclusive: transactions dated ON the cutoff are already
//     baked into the checkpoint value (t.date <= cutoffDate is excluded, so we
//     use `gt` to include only strictly-after transactions).
async function calculateBalance(
  account: typeof accounts.$inferSelect
): Promise<number> {
  const isDebt =
    account.accountType === "credit_card" || account.accountType === "loan";

  let baseBalance: number;
  let afterDate: string | null = null;

  // Priority 1: reconciledBalance acts as a checkpoint from reconciledDate
  if (account.reconciledBalance != null && account.reconciledDate) {
    baseBalance = isDebt ? -account.reconciledBalance : account.reconciledBalance;
    afterDate = account.reconciledDate;
  } else if (account.balanceAtResetDate != null && account.balanceResetDate) {
    // Priority 2: balanceAtResetDate acts as a checkpoint from balanceResetDate
    baseBalance = isDebt ? -account.balanceAtResetDate : account.balanceAtResetDate;
    afterDate = account.balanceResetDate;
  } else {
    // Default: initial balance
    const initial = account.initialBalance ?? 0;
    baseBalance = isDebt ? -initial : initial;
  }

  const conditions: Parameters<typeof and>[0][] = [
    eq(transactions.accountId, account.id),
    isNull(transactions.deletedAt),
  ];

  if (afterDate) {
    // Strictly after the cutoff — transactions on the cutoff date are already
    // captured in the checkpoint value.
    conditions.push(gt(transactions.date, afterDate));
  }

  const [row] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(and(...conditions));

  const txSum =
    row?.total !== null && row?.total !== undefined ? Number(row.total) : 0;

  return baseBalance + txSum;
}

export type SnapshotResult = {
  snapshotDate: string;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  byAccountType: Record<string, number>;
};

// Calculate balances for all active accounts and upsert today's snapshot.
export async function captureSnapshot(workspaceId: number): Promise<SnapshotResult> {
  const snapshotDate = todayISO();

  const workspaceAccounts = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.workspaceId, workspaceId),
        eq(accounts.closed, false),
        isNull(accounts.deletedAt)
      )
    );

  const byAccountType: Record<string, number> = {};
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of workspaceAccounts) {
    const balance = await calculateBalance(account);
    const accountType = (account.accountType ?? "other") as AccountType;

    byAccountType[accountType] = (byAccountType[accountType] ?? 0) + balance;

    if (isDebtAccount(accountType)) {
      // Liabilities = absolute value of the amount owed (balance is negative when in debt)
      totalLiabilities += Math.abs(Math.min(0, balance));
    } else {
      totalAssets += Math.max(0, balance);
    }
  }

  const totalNetWorth = totalAssets - totalLiabilities;

  await repository.upsertSnapshot({
    workspaceId,
    snapshotDate,
    totalNetWorth,
    totalAssets,
    totalLiabilities,
    byAccountType: JSON.stringify(byAccountType),
  });

  return { snapshotDate, totalNetWorth, totalAssets, totalLiabilities, byAccountType };
}

// Return today's snapshot if it already exists, otherwise capture a new one.
// This lazy pattern ensures one snapshot per day with no background jobs.
export async function getOrCreateTodaySnapshot(workspaceId: number): Promise<SnapshotResult> {
  const today = todayISO();
  const existing = await repository.getTodaySnapshot(workspaceId, today);

  if (existing) {
    return {
      snapshotDate: existing.snapshotDate,
      totalNetWorth: existing.totalNetWorth,
      totalAssets: existing.totalAssets,
      totalLiabilities: existing.totalLiabilities,
      byAccountType: existing.byAccountType
        ? (JSON.parse(existing.byAccountType) as Record<string, number>)
        : {},
    };
  }

  return captureSnapshot(workspaceId);
}

export type SnapshotHistoryItem = {
  id: number;
  workspaceId: number;
  snapshotDate: string;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  byAccountType: Record<string, number>;
  createdAt: string;
};

// Return parsed snapshot history for the last N months.
export async function getHistory(
  workspaceId: number,
  months: number = 12
): Promise<SnapshotHistoryItem[]> {
  const snapshots = await repository.getHistory(workspaceId, months);
  return snapshots.map((s) => ({
    ...s,
    byAccountType: s.byAccountType
      ? (JSON.parse(s.byAccountType) as Record<string, number>)
      : {},
  }));
}
