import { db } from "$core/server/db";
import {
  investmentValueSnapshots,
  type InvestmentValueSnapshot,
  type NewInvestmentValueSnapshot,
} from "$core/schema/investment-value-snapshots";
import { and, asc, eq } from "drizzle-orm";

export async function findAll(accountId: number, workspaceId: number): Promise<InvestmentValueSnapshot[]> {
  return db
    .select()
    .from(investmentValueSnapshots)
    .where(
      and(
        eq(investmentValueSnapshots.accountId, accountId),
        eq(investmentValueSnapshots.workspaceId, workspaceId)
      )
    )
    .orderBy(asc(investmentValueSnapshots.snapshotDate));
}

export async function upsert(
  data: NewInvestmentValueSnapshot
): Promise<InvestmentValueSnapshot> {
  const [result] = await db
    .insert(investmentValueSnapshots)
    .values(data)
    .onConflictDoUpdate({
      target: [
        investmentValueSnapshots.accountId,
        investmentValueSnapshots.snapshotDate,
      ],
      set: {
        value: data.value,
        notes: data.notes ?? null,
      },
    })
    .returning();
  return result;
}

export async function remove(id: number, accountId: number): Promise<void> {
  await db
    .delete(investmentValueSnapshots)
    .where(
      and(
        eq(investmentValueSnapshots.id, id),
        eq(investmentValueSnapshots.accountId, accountId)
      )
    );
}
