import { budgetPins } from "$core/schema/budget-pins";
import { db } from "$core/server/db";
import { DatabaseError } from "$core/server/shared/types/errors";
import { and, eq } from "drizzle-orm";

/**
 * Data access for per-user budget pins. Pins are tiny — a join row with
 * no payload — so this repository only needs three operations.
 */
export class BudgetPinsRepository {
  /**
   * Returns the budget IDs the given user has pinned inside the given
   * workspace.
   */
  async listPinnedIds(workspaceId: number, userId: string): Promise<number[]> {
    try {
      const rows = await db
        .select({ budgetId: budgetPins.budgetId })
        .from(budgetPins)
        .where(and(eq(budgetPins.workspaceId, workspaceId), eq(budgetPins.userId, userId)));
      return rows.map((r) => r.budgetId);
    } catch (error) {
      throw new DatabaseError((error as Error)?.message ?? "Unknown error", "listPinnedIds");
    }
  }

  /**
   * Insert a pin. Silently no-ops when the pin already exists (unique
   * constraint on `(user_id, budget_id)`).
   */
  async pin(workspaceId: number, userId: string, budgetId: number): Promise<void> {
    try {
      await db
        .insert(budgetPins)
        .values({ workspaceId, userId, budgetId })
        .onConflictDoNothing({ target: [budgetPins.userId, budgetPins.budgetId] });
    } catch (error) {
      throw new DatabaseError((error as Error)?.message ?? "Unknown error", "pinBudget");
    }
  }

  /**
   * Delete the pin. Returns the number of rows affected — `0` means the
   * budget wasn't pinned in the first place, `1` means it was.
   */
  async unpin(workspaceId: number, userId: string, budgetId: number): Promise<number> {
    try {
      const result = await db
        .delete(budgetPins)
        .where(
          and(
            eq(budgetPins.workspaceId, workspaceId),
            eq(budgetPins.userId, userId),
            eq(budgetPins.budgetId, budgetId),
          ),
        );
      return (result as unknown as { changes?: number }).changes ?? 0;
    } catch (error) {
      throw new DatabaseError((error as Error)?.message ?? "Unknown error", "unpinBudget");
    }
  }

  /**
   * Check whether a specific budget is pinned by the given user.
   */
  async isPinned(workspaceId: number, userId: string, budgetId: number): Promise<boolean> {
    try {
      const [row] = await db
        .select({ id: budgetPins.id })
        .from(budgetPins)
        .where(
          and(
            eq(budgetPins.workspaceId, workspaceId),
            eq(budgetPins.userId, userId),
            eq(budgetPins.budgetId, budgetId),
          ),
        )
        .limit(1);
      return !!row;
    } catch (error) {
      throw new DatabaseError((error as Error)?.message ?? "Unknown error", "isPinned");
    }
  }
}

export const budgetPinsRepository = new BudgetPinsRepository();
