import { db } from "$lib/server/db";
import {
  workspaceCounters,
  type SequencedEntityType,
  type WorkspaceCounter,
} from "$lib/schema/workspace-counters";
import { and, eq, sql } from "drizzle-orm";

/**
 * Repository for workspace sequence counters.
 * Provides atomic sequence generation for per-workspace sequential IDs.
 */
export class SequenceRepository {
  /**
   * Get the next sequence number for a given workspace and entity type.
   * Uses an atomic UPDATE...RETURNING pattern for concurrency safety.
   *
   * If no counter exists for this workspace+entityType combination,
   * creates one and returns 1.
   */
  async getNextSeq(workspaceId: number, entityType: SequencedEntityType): Promise<number> {
    // First, try to atomically increment and return the sequence
    const result = await db
      .update(workspaceCounters)
      .set({
        nextSeq: sql`${workspaceCounters.nextSeq} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(workspaceCounters.workspaceId, workspaceId),
          eq(workspaceCounters.entityType, entityType)
        )
      )
      .returning({ currentSeq: sql<number>`${workspaceCounters.nextSeq} - 1` });

    if (result.length > 0) {
      return result[0].currentSeq;
    }

    // No counter exists, create one and return 1
    await db.insert(workspaceCounters).values({
      workspaceId,
      entityType,
      nextSeq: 2, // Start at 2 because we're returning 1
    });

    return 1;
  }

  /**
   * Get multiple sequence numbers at once for batch operations.
   * Returns the starting sequence number for the batch.
   */
  async getNextSeqBatch(
    workspaceId: number,
    entityType: SequencedEntityType,
    count: number
  ): Promise<number> {
    if (count <= 0) {
      throw new Error("Count must be positive");
    }

    // Try to atomically increment by count and return the starting sequence
    const result = await db
      .update(workspaceCounters)
      .set({
        nextSeq: sql`${workspaceCounters.nextSeq} + ${count}`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(workspaceCounters.workspaceId, workspaceId),
          eq(workspaceCounters.entityType, entityType)
        )
      )
      .returning({ startSeq: sql<number>`${workspaceCounters.nextSeq} - ${count}` });

    if (result.length > 0) {
      return result[0].startSeq;
    }

    // No counter exists, create one
    await db.insert(workspaceCounters).values({
      workspaceId,
      entityType,
      nextSeq: count + 1,
    });

    return 1;
  }

  /**
   * Initialize a counter to a specific value (used for backfilling).
   * Creates the counter if it doesn't exist, or updates if it does.
   */
  async initializeCounter(
    workspaceId: number,
    entityType: SequencedEntityType,
    nextSeq: number
  ): Promise<void> {
    await db
      .insert(workspaceCounters)
      .values({
        workspaceId,
        entityType,
        nextSeq,
      })
      .onConflictDoUpdate({
        target: [workspaceCounters.workspaceId, workspaceCounters.entityType],
        set: {
          nextSeq,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  /**
   * Get the current counter value for a workspace and entity type.
   */
  async getCurrentCounter(
    workspaceId: number,
    entityType: SequencedEntityType
  ): Promise<WorkspaceCounter | null> {
    const result = await db
      .select()
      .from(workspaceCounters)
      .where(
        and(
          eq(workspaceCounters.workspaceId, workspaceId),
          eq(workspaceCounters.entityType, entityType)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get all counters for a workspace.
   */
  async getAllCountersForWorkspace(workspaceId: number): Promise<WorkspaceCounter[]> {
    return db
      .select()
      .from(workspaceCounters)
      .where(eq(workspaceCounters.workspaceId, workspaceId));
  }
}
