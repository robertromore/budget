import { db } from "$core/server/db";
import { accounts, isDebtAccount } from "$core/schema/accounts";
import { transactions } from "$core/schema/transactions";
import type { FinancialGoal } from "$core/schema/financial-goals";
import { NotFoundError } from "$core/server/shared/types/errors";
import { and, eq, gt, isNull, sum } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import * as repository from "./repository";

// --- Balance calculation ---
// Mirrors calculateBalance() in the net-worth domain services.
// Computes the live balance of a single account respecting reconciliation
// and balance-reset checkpoints.

async function calculateBalance(
  account: typeof accounts.$inferSelect
): Promise<number> {
  const isDebt = isDebtAccount(account.accountType as any);

  let baseBalance: number;
  let afterDate: string | null = null;

  if (account.reconciledBalance != null && account.reconciledDate) {
    baseBalance = isDebt ? -account.reconciledBalance : account.reconciledBalance;
    afterDate = account.reconciledDate;
  } else if (account.balanceAtResetDate != null && account.balanceResetDate) {
    baseBalance = isDebt ? -account.balanceAtResetDate : account.balanceAtResetDate;
    afterDate = account.balanceResetDate;
  } else {
    const initial = account.initialBalance ?? 0;
    baseBalance = isDebt ? -initial : initial;
  }

  const conditions: Parameters<typeof and>[0][] = [
    eq(transactions.accountId, account.id),
    isNull(transactions.deletedAt),
  ];

  if (afterDate) {
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

async function getLinkedAccountBalance(accountId: number): Promise<number | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), isNull(accounts.deletedAt)))
    .limit(1);

  if (!account) return null;
  return calculateBalance(account);
}

// --- Progress calculation ---

export type GoalProgress = {
  currentAmount: number;
  percentComplete: number;
  remaining: number;
  isOnTrack: boolean;
};

export async function calculateGoalProgress(goal: FinancialGoal): Promise<GoalProgress> {
  let currentAmount: number;

  if (goal.accountId) {
    const liveBalance = await getLinkedAccountBalance(goal.accountId);
    // Fall back to startingBalance if account was deleted or can't be read
    currentAmount = liveBalance ?? (goal.startingBalance ?? 0);
  } else {
    // Custom goal with no linked account — no auto-tracking
    currentAmount = goal.startingBalance ?? 0;
  }

  const startingBalance = goal.startingBalance ?? 0;
  const targetAmount = goal.targetAmount;

  // Progress is measured relative to the starting point so that existing
  // balances don't artificially inflate completion.
  const totalChange = targetAmount - startingBalance;
  const currentChange = currentAmount - startingBalance;

  const percentComplete =
    totalChange === 0
      ? currentChange >= 0
        ? 100
        : 0
      : Math.max(0, Math.min(100, (currentChange / totalChange) * 100));

  const remaining = targetAmount - currentAmount;

  // isOnTrack: are we at or ahead of the time-proportional pace?
  let isOnTrack = true;
  if (goal.targetDate && !goal.isCompleted) {
    const created = new Date(goal.createdAt);
    const target = new Date(goal.targetDate + "T00:00:00");
    const now = new Date();
    const totalMs = target.getTime() - created.getTime();
    const elapsedMs = now.getTime() - created.getTime();

    if (totalMs > 0 && elapsedMs >= 0) {
      const timePercent = (elapsedMs / totalMs) * 100;
      isOnTrack = percentComplete >= timePercent;
    }
  }

  return { currentAmount, percentComplete, remaining, isOnTrack };
}

// --- Public service functions ---

export type GoalWithProgress = FinancialGoal & GoalProgress;

export type SaveGoalInput = {
  id?: number;
  name: string;
  goalType: FinancialGoal["goalType"];
  targetAmount: number;
  targetDate?: string | null;
  accountId?: number | null;
  notes?: string | null;
  sortOrder?: number;
};

export async function listGoals(
  workspaceId: number,
  includeCompleted = false
): Promise<GoalWithProgress[]> {
  const goals = await repository.findAll(workspaceId, includeCompleted);
  return Promise.all(
    goals.map(async (goal) => {
      const progress = await calculateGoalProgress(goal);
      return { ...goal, ...progress };
    })
  );
}

export async function getGoal(
  workspaceId: number,
  id: number
): Promise<GoalWithProgress | null> {
  const goal = await repository.findById(workspaceId, id);
  if (!goal) return null;
  const progress = await calculateGoalProgress(goal);
  return { ...goal, ...progress };
}

export async function saveGoal(
  workspaceId: number,
  input: SaveGoalInput
): Promise<GoalWithProgress> {
  const now = new Date().toISOString();

  if (input.id !== undefined) {
    // Fetch the existing goal to detect accountId changes
    const existing = await repository.findById(workspaceId, input.id);
    if (!existing) {
      throw new NotFoundError("Goal", input.id);
    }

    // If the linked account changed, recapture startingBalance from the new account
    // so that progress is measured from the correct baseline.
    let startingBalance = existing.startingBalance;
    const newAccountId = input.accountId ?? null;
    if (newAccountId !== existing.accountId) {
      startingBalance = newAccountId
        ? (await getLinkedAccountBalance(newAccountId)) ?? null
        : null;
    }

    const updated = await repository.update(workspaceId, input.id, {
      name: input.name,
      goalType: input.goalType,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate ?? null,
      accountId: newAccountId,
      notes: input.notes ?? null,
      sortOrder: input.sortOrder ?? 0,
      startingBalance,
      updatedAt: now,
    });

    if (!updated) {
      throw new NotFoundError("Goal", input.id);
    }

    const progress = await calculateGoalProgress(updated);
    return { ...updated, ...progress };
  }

  // Create new goal — capture starting balance from linked account
  let startingBalance: number | null = null;
  if (input.accountId) {
    startingBalance = await getLinkedAccountBalance(input.accountId) ?? null;
  }

  const slug = createId();
  const created = await repository.create({
    workspaceId,
    name: input.name,
    slug,
    goalType: input.goalType,
    targetAmount: input.targetAmount,
    targetDate: input.targetDate ?? null,
    accountId: input.accountId ?? null,
    notes: input.notes ?? null,
    sortOrder: input.sortOrder ?? 0,
    startingBalance,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  });

  const progress = await calculateGoalProgress(created);
  return { ...created, ...progress };
}

export async function deleteGoal(workspaceId: number, id: number): Promise<void> {
  await repository.softDelete(workspaceId, id);
}

export async function markGoalComplete(
  workspaceId: number,
  id: number
): Promise<GoalWithProgress> {
  const now = new Date().toISOString();
  const updated = await repository.update(workspaceId, id, {
    isCompleted: true,
    completedAt: now,
    updatedAt: now,
  });

  if (!updated) {
    throw new NotFoundError("Goal", id);
  }

  const progress = await calculateGoalProgress(updated);
  return { ...updated, ...progress };
}
