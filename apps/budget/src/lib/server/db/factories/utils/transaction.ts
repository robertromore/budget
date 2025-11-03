import {db} from "../..";

/**
 * Wraps factory operations in a database transaction for atomic execution
 *
 * All operations within the callback will be rolled back if any error occurs,
 * preventing partial data from polluting the database.
 *
 * @param fn - Async callback function that receives a transaction object
 * @returns Promise<T> - Result from the callback function
 * @throws Error - Any error from the callback triggers a rollback
 *
 * @example
 * ```typescript
 * const account = await withTransaction(async (tx) => {
 *   const [account] = await tx.insert(accounts).values({...}).returning();
 *   await tx.insert(transactions).values({accountId: account.id, ...});
 *   return account;
 * });
 * ```
 */
export async function withTransaction<T>(
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    try {
      return await fn(tx);
    } catch (error) {
      console.error("❌ Factory transaction failed, rolling back:", error);
      throw error; // Re-throw to trigger rollback
    }
  });
}
