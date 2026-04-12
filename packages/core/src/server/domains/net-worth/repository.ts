import { db } from "$core/server/db";
import { netWorthSnapshots } from "$core/schema/net-worth-snapshots";
import { and, eq, gte } from "drizzle-orm";
import type { NetWorthSnapshot, NewNetWorthSnapshot } from "$core/schema/net-worth-snapshots";

export async function upsertSnapshot(data: NewNetWorthSnapshot): Promise<NetWorthSnapshot> {
  const [result] = await db
    .insert(netWorthSnapshots)
    .values(data)
    .onConflictDoUpdate({
      target: [netWorthSnapshots.workspaceId, netWorthSnapshots.snapshotDate],
      set: {
        totalNetWorth: data.totalNetWorth,
        totalAssets: data.totalAssets,
        totalLiabilities: data.totalLiabilities,
        byAccountType: data.byAccountType ?? null,
      },
    })
    .returning();
  return result;
}

export async function getTodaySnapshot(
  workspaceId: number,
  date: string
): Promise<NetWorthSnapshot | null> {
  const [result] = await db
    .select()
    .from(netWorthSnapshots)
    .where(
      and(
        eq(netWorthSnapshots.workspaceId, workspaceId),
        eq(netWorthSnapshots.snapshotDate, date)
      )
    )
    .limit(1);
  return result ?? null;
}

export async function getHistory(
  workspaceId: number,
  months: number
): Promise<NetWorthSnapshot[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return db
    .select()
    .from(netWorthSnapshots)
    .where(
      and(
        eq(netWorthSnapshots.workspaceId, workspaceId),
        gte(netWorthSnapshots.snapshotDate, cutoffStr)
      )
    )
    .orderBy(netWorthSnapshots.snapshotDate);
}
