/**
 * ML Domain Utilities
 *
 * Shared helper functions for ML services.
 */

import { accounts } from "$lib/schema";
import { db } from "$lib/server/db";
import { eq } from "drizzle-orm";

/**
 * Get account IDs for a workspace (used for filtering transactions)
 */
export async function getWorkspaceAccountIds(workspaceId: number): Promise<number[]> {
  const result = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.workspaceId, workspaceId));
  return result.map((r) => r.id);
}
