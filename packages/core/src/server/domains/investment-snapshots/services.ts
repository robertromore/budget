import { db } from "$core/server/db";
import { accounts } from "$core/schema/accounts";
import type { InvestmentValueSnapshot } from "$core/schema/investment-value-snapshots";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { and, eq, isNull } from "drizzle-orm";
import * as repository from "./repository";

/** Verify the account exists, belongs to the workspace, and is an investment account. */
async function assertInvestmentAccount(
  accountId: number,
  workspaceId: number
): Promise<void> {
  const [account] = await db
    .select({ id: accounts.id, accountType: accounts.accountType })
    .from(accounts)
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.workspaceId, workspaceId),
        isNull(accounts.deletedAt)
      )
    )
    .limit(1);

  if (!account) {
    throw new NotFoundError("Account");
  }

  if (account.accountType !== "investment") {
    throw new ValidationError("Value snapshots are only supported for investment accounts");
  }
}

export async function listSnapshots(
  accountId: number,
  workspaceId: number
): Promise<InvestmentValueSnapshot[]> {
  await assertInvestmentAccount(accountId, workspaceId);
  return repository.findAll(accountId, workspaceId);
}

export async function saveSnapshot(
  accountId: number,
  workspaceId: number,
  snapshotDate: string,
  value: number,
  notes?: string | null
): Promise<InvestmentValueSnapshot> {
  await assertInvestmentAccount(accountId, workspaceId);

  return repository.upsert({
    accountId,
    workspaceId,
    snapshotDate,
    value,
    notes: notes ?? null,
  });
}

export async function deleteSnapshot(
  id: number,
  accountId: number,
  workspaceId: number
): Promise<void> {
  await assertInvestmentAccount(accountId, workspaceId);
  await repository.remove(id, accountId);
}
