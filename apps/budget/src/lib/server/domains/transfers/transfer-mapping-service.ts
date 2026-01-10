import type {
  TransferMappingTrigger,
  TransferMappingMatch,
  TransferMapping,
  TransferMappingStats,
  TransferMappingWithAccount,
} from "$lib/schema/transfer-mappings";
import { TransferMappingRepository } from "./transfer-mapping-repository";

/**
 * Transfer Mapping Service
 *
 * Business logic layer for transfer mapping management.
 * Handles recording, matching, and managing transfer mappings across the system.
 *
 * Mappings link raw imported payee strings (e.g., "VENMO PAYMENT JOHN DOE 1234")
 * to target transfer accounts, enabling automatic transfer suggestions during import.
 */
export class TransferMappingService {
  private repository: TransferMappingRepository;

  constructor() {
    this.repository = new TransferMappingRepository();
  }

  /**
   * Record a mapping from a manual conversion.
   * Called when a user converts a transaction to a transfer via the dialog.
   */
  async recordMappingFromConversion(
    rawPayeeString: string,
    targetAccountId: number,
    workspaceId: number,
    sourceAccountId?: number
  ): Promise<TransferMapping> {
    // Check if mapping already exists
    const existing = await this.repository.findByRawString(rawPayeeString, workspaceId);

    if (existing) {
      // If mapping to the same account, just increment count
      if (existing.targetAccountId === targetAccountId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }

      // If mapping to different account, update the mapping
      return await this.repository.update(existing.id, { targetAccountId }, workspaceId);
    }

    // Create new mapping
    return await this.repository.create(
      {
        rawPayeeString,
        targetAccountId,
        trigger: "manual_conversion",
        sourceAccountId,
      },
      workspaceId
    );
  }

  /**
   * Record a mapping from an import confirmation.
   * Called when a user confirms a transfer during import preview.
   */
  async recordMappingFromImport(
    rawPayeeString: string,
    targetAccountId: number,
    workspaceId: number,
    sourceAccountId?: number
  ): Promise<TransferMapping> {
    const existing = await this.repository.findByRawString(rawPayeeString, workspaceId);

    if (existing) {
      if (existing.targetAccountId === targetAccountId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }
      return await this.repository.update(existing.id, { targetAccountId }, workspaceId);
    }

    return await this.repository.create(
      {
        rawPayeeString,
        targetAccountId,
        trigger: "import_confirmation",
        sourceAccountId,
      },
      workspaceId
    );
  }

  /**
   * Record a mapping from a transaction edit.
   * Called when a user changes a transaction to a transfer.
   */
  async recordMappingFromTransactionEdit(
    rawPayeeString: string,
    targetAccountId: number,
    workspaceId: number
  ): Promise<TransferMapping> {
    const existing = await this.repository.findByRawString(rawPayeeString, workspaceId);

    if (existing) {
      if (existing.targetAccountId === targetAccountId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }
      return await this.repository.update(existing.id, { targetAccountId }, workspaceId);
    }

    return await this.repository.create(
      {
        rawPayeeString,
        targetAccountId,
        trigger: "transaction_edit",
      },
      workspaceId
    );
  }

  /**
   * Create a manual mapping (user explicitly creates mapping).
   */
  async createManualMapping(
    rawPayeeString: string,
    targetAccountId: number,
    workspaceId: number,
    sourceAccountId?: number
  ): Promise<TransferMapping> {
    const existing = await this.repository.findByRawString(rawPayeeString, workspaceId);

    if (existing) {
      if (existing.targetAccountId === targetAccountId) {
        return existing;
      }
      return await this.repository.update(existing.id, { targetAccountId }, workspaceId);
    }

    return await this.repository.create(
      {
        rawPayeeString,
        targetAccountId,
        trigger: "manual_conversion",
        confidence: 1.0,
        sourceAccountId,
      },
      workspaceId
    );
  }

  /**
   * Bulk record mappings from import completion.
   * Called when user confirms and completes an import with transfer conversions.
   */
  async bulkRecordMappings(
    records: Array<{
      rawPayeeString: string;
      targetAccountId: number;
      sourceAccountId?: number;
    }>,
    workspaceId: number
  ): Promise<{ created: number; updated: number }> {
    // Filter out duplicates - keep the last occurrence for each rawPayeeString
    const uniqueRecords = new Map<string, (typeof records)[0]>();
    for (const record of records) {
      uniqueRecords.set(record.rawPayeeString.toLowerCase().trim(), record);
    }

    return await this.repository.bulkCreate(
      Array.from(uniqueRecords.values()).map((record) => ({
        rawPayeeString: record.rawPayeeString,
        targetAccountId: record.targetAccountId,
        trigger: "bulk_import" as TransferMappingTrigger,
        sourceAccountId: record.sourceAccountId,
      })),
      workspaceId
    );
  }

  /**
   * Find a transfer mapping for a payee string.
   * Returns the matched target account ID if found.
   */
  async findTransferMapping(
    rawPayeeString: string,
    workspaceId: number
  ): Promise<TransferMappingMatch | null> {
    return await this.repository.findBestMatch(rawPayeeString, workspaceId);
  }

  /**
   * Get all mappings for a specific target account.
   */
  async getMappingsForAccount(
    targetAccountId: number,
    workspaceId: number
  ): Promise<TransferMapping[]> {
    return await this.repository.findByTargetAccountId(targetAccountId, workspaceId);
  }

  /**
   * Get all mappings from a specific source account (where imports happened).
   * Returns mappings with target account details for display.
   */
  async getMappingsFromAccount(
    sourceAccountId: number,
    workspaceId: number
  ): Promise<TransferMappingWithAccount[]> {
    return await this.repository.findBySourceAccountId(sourceAccountId, workspaceId);
  }

  /**
   * Get all mappings in a workspace with account details.
   */
  async getAllMappingsWithAccounts(workspaceId: number): Promise<TransferMappingWithAccount[]> {
    return await this.repository.findAllWithAccounts(workspaceId);
  }

  /**
   * Get a single mapping by ID.
   */
  async getMapping(id: number, workspaceId: number): Promise<TransferMapping | null> {
    return await this.repository.findById(id, workspaceId);
  }

  /**
   * Update a mapping's raw string or target account.
   */
  async updateMapping(
    id: number,
    data: { rawPayeeString?: string; targetAccountId?: number },
    workspaceId: number
  ): Promise<TransferMapping> {
    return await this.repository.update(id, data, workspaceId);
  }

  /**
   * Delete a mapping.
   */
  async deleteMapping(id: number, workspaceId: number): Promise<void> {
    await this.repository.softDelete(id, workspaceId);
  }

  /**
   * Delete all mappings for a target account.
   * Useful when deleting an account.
   */
  async deleteMappingsForAccount(targetAccountId: number, workspaceId: number): Promise<number> {
    return await this.repository.bulkDeleteByTargetAccountId(targetAccountId, workspaceId);
  }

  /**
   * Get statistics about mappings in a workspace.
   */
  async getStats(workspaceId: number): Promise<TransferMappingStats> {
    return await this.repository.getStats(workspaceId);
  }

  /**
   * Check if a payee string should be converted to a transfer during import.
   * Returns the match result with account info if found.
   */
  async matchTransferForImport(
    payeeName: string,
    workspaceId: number
  ): Promise<{
    found: boolean;
    targetAccountId?: number;
    confidence: number;
    matchedOn?: "exact" | "normalized" | "cleaned";
    mappingId?: number;
  }> {
    const match = await this.findTransferMapping(payeeName, workspaceId);

    if (match) {
      // Increment match count for tracking
      await this.repository.incrementMatchCount(match.mappingId);

      return {
        found: true,
        targetAccountId: match.targetAccountId,
        confidence: match.confidence,
        matchedOn: match.matchedOn,
        mappingId: match.mappingId,
      };
    }

    return { found: false, confidence: 0 };
  }
}

// Singleton instance for easy access
let transferMappingServiceInstance: TransferMappingService | null = null;

export function getTransferMappingService(): TransferMappingService {
  if (!transferMappingServiceInstance) {
    transferMappingServiceInstance = new TransferMappingService();
  }
  return transferMappingServiceInstance;
}
