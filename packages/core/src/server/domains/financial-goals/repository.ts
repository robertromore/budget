import { db } from "$core/server/db";
import { financialGoals } from "$core/schema/financial-goals";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { FinancialGoal, NewFinancialGoal } from "$core/schema/financial-goals";

export async function findAll(
  workspaceId: number,
  includeCompleted = false
): Promise<FinancialGoal[]> {
  const conditions = [
    eq(financialGoals.workspaceId, workspaceId),
    isNull(financialGoals.deletedAt),
  ];

  if (!includeCompleted) {
    conditions.push(eq(financialGoals.isCompleted, false));
  }

  return db
    .select()
    .from(financialGoals)
    .where(and(...conditions))
    .orderBy(asc(financialGoals.sortOrder), asc(financialGoals.createdAt));
}

export async function findById(
  workspaceId: number,
  id: number
): Promise<FinancialGoal | null> {
  const [result] = await db
    .select()
    .from(financialGoals)
    .where(
      and(
        eq(financialGoals.id, id),
        eq(financialGoals.workspaceId, workspaceId),
        isNull(financialGoals.deletedAt)
      )
    )
    .limit(1);
  return result ?? null;
}

export async function create(data: NewFinancialGoal): Promise<FinancialGoal> {
  const [result] = await db.insert(financialGoals).values(data).returning();
  return result;
}

export async function update(
  workspaceId: number,
  id: number,
  data: Partial<Omit<NewFinancialGoal, "id" | "workspaceId" | "createdAt">>
): Promise<FinancialGoal | null> {
  const now = new Date().toISOString();
  const [result] = await db
    .update(financialGoals)
    .set({ ...data, updatedAt: now })
    .where(
      and(
        eq(financialGoals.id, id),
        eq(financialGoals.workspaceId, workspaceId),
        isNull(financialGoals.deletedAt)
      )
    )
    .returning();
  return result ?? null;
}

export async function softDelete(workspaceId: number, id: number): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(financialGoals)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(financialGoals.id, id),
        eq(financialGoals.workspaceId, workspaceId),
        isNull(financialGoals.deletedAt)
      )
    );
}
