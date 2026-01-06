import type { SequencedEntityType } from "$lib/schema/workspace-counters";
import { SequenceRepository } from "./repository";

/**
 * Service for managing per-workspace sequential IDs.
 *
 * This service provides atomic sequence generation to ensure unique,
 * sequential IDs within each workspace. IDs are scoped per entity type
 * (account, transaction, budget, etc.) and per workspace.
 *
 * @example
 * ```typescript
 * // In a repository create method:
 * const seq = await this.sequenceService.getNextSeq(workspaceId, "transaction");
 * await db.insert(transactions).values({ ...data, seq });
 * ```
 */
export class SequenceService {
  constructor(private repository: SequenceRepository) {}

  /**
   * Get the next sequence number for a given workspace and entity type.
   *
   * This operation is atomic and safe for concurrent use.
   * Each call returns a unique, incrementing sequence number.
   *
   * @param workspaceId - The workspace ID
   * @param entityType - The type of entity (account, transaction, budget, etc.)
   * @returns The next sequence number to use
   */
  async getNextSeq(workspaceId: number, entityType: SequencedEntityType): Promise<number> {
    return this.repository.getNextSeq(workspaceId, entityType);
  }

  /**
   * Get multiple sequence numbers at once for batch operations.
   *
   * Returns the starting sequence number. Entities should be assigned
   * seq values from startSeq to startSeq + count - 1.
   *
   * @param workspaceId - The workspace ID
   * @param entityType - The type of entity
   * @param count - Number of sequences to reserve
   * @returns The starting sequence number
   *
   * @example
   * ```typescript
   * // For importing 100 transactions:
   * const startSeq = await sequenceService.getNextSeqBatch(workspaceId, "transaction", 100);
   * transactions.forEach((tx, i) => {
   *   tx.seq = startSeq + i;
   * });
   * ```
   */
  async getNextSeqBatch(
    workspaceId: number,
    entityType: SequencedEntityType,
    count: number
  ): Promise<number> {
    return this.repository.getNextSeqBatch(workspaceId, entityType, count);
  }

  /**
   * Initialize a counter to a specific value.
   *
   * Used during backfill operations to set the counter after
   * existing entities have been assigned sequence numbers.
   *
   * @param workspaceId - The workspace ID
   * @param entityType - The type of entity
   * @param nextSeq - The next sequence number to use
   */
  async initializeCounter(
    workspaceId: number,
    entityType: SequencedEntityType,
    nextSeq: number
  ): Promise<void> {
    return this.repository.initializeCounter(workspaceId, entityType, nextSeq);
  }

  /**
   * Get the current counter state for debugging/monitoring.
   */
  async getCurrentCounter(workspaceId: number, entityType: SequencedEntityType) {
    return this.repository.getCurrentCounter(workspaceId, entityType);
  }
}
