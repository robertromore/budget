/**
 * ML Domain Utilities
 *
 * Shared helper functions for ML services.
 */

import { accounts } from "$core/schema";
import { db } from "$lib/server/db";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Get account IDs for a workspace (used for filtering transactions)
 */
export async function getWorkspaceAccountIds(workspaceId: number): Promise<number[]> {
  const result = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.workspaceId, workspaceId), isNull(accounts.deletedAt)));
  return result.map((r) => r.id);
}
