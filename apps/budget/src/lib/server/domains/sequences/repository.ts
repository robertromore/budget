import { db } from "$core/server/db";
import {
  workspaceCounters,
  type SequencedEntityType,
  type WorkspaceCounter,
} from "$core/schema/workspace-counters";
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
    const [result] = await db
      .insert(workspaceCounters)
      .values({
        workspaceId,
        entityType,
        nextSeq: 2, // First issued seq is 1
      })
      .onConflictDoUpdate({
        target: [workspaceCounters.workspaceId, workspaceCounters.entityType],
        set: {
          nextSeq: sql`${workspaceCounters.nextSeq} + 1`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning({ currentSeq: sql<number>`${workspaceCounters.nextSeq} - 1` });

    if (!result) {
      throw new Error("Failed to allocate sequence number");
    }

    return result.currentSeq;
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

    const [result] = await db
      .insert(workspaceCounters)
      .values({
        workspaceId,
        entityType,
        nextSeq: count + 1, // Batch starts at 1 when counter is first created
      })
      .onConflictDoUpdate({
        target: [workspaceCounters.workspaceId, workspaceCounters.entityType],
        set: {
          nextSeq: sql`${workspaceCounters.nextSeq} + ${count}`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning({ startSeq: sql<number>`${workspaceCounters.nextSeq} - ${count}` });

    if (!result) {
      throw new Error("Failed to allocate sequence batch");
    }

    return result.startSeq;
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
