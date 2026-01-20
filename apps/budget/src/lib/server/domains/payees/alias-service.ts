import type {
  AliasTrigger,
  AliasMatch,
  PayeeAlias,
  PayeeAliasStats,
  PayeeAliasWithPayee,
} from "$lib/schema/payee-aliases";
import { normalize } from "$lib/utils/string-utilities";
import { PayeeAliasRepository } from "./alias-repository";

/**
 * Payee Alias Service
 *
 * Business logic layer for payee alias management.
 * Handles recording, matching, and managing payee aliases across the system.
 *
 * Aliases are mappings from raw imported strings (e.g., "WALMART #1234 DALLAS TX")
 * to canonical payee IDs, enabling the system to remember user corrections.
 */
export class PayeeAliasService {
  private repository: PayeeAliasRepository;

  constructor() {
    this.repository = new PayeeAliasRepository();
  }

  /**
   * Record an alias from an import operation.
   * Called when a user confirms a different payee during import.
   */
  async recordAliasFromImport(
    rawString: string,
    payeeId: number,
    workspaceId: number,
    accountId?: number
  ): Promise<PayeeAlias> {
    // Check if alias already exists
    const existing = await this.repository.findByRawString(rawString, workspaceId);

    if (existing) {
      // If mapping to the same payee, just increment count
      if (existing.payeeId === payeeId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }

      // If mapping to different payee, update the alias
      return await this.repository.update(existing.id, { payeeId }, workspaceId);
    }

    // Create new alias
    return await this.repository.create(
      {
        rawString,
        payeeId,
        trigger: "import_confirmation",
        sourceAccountId: accountId,
      },
      workspaceId
    );
  }

  /**
   * Record an alias from a transaction edit.
   * Called when a user changes a payee on an existing transaction.
   */
  async recordAliasFromTransactionEdit(
    rawString: string,
    payeeId: number,
    workspaceId: number
  ): Promise<PayeeAlias> {
    const existing = await this.repository.findByRawString(rawString, workspaceId);

    if (existing) {
      if (existing.payeeId === payeeId) {
        await this.repository.incrementMatchCount(existing.id);
        return existing;
      }
      return await this.repository.update(existing.id, { payeeId }, workspaceId);
    }

    return await this.repository.create(
      {
        rawString,
        payeeId,
        trigger: "transaction_edit",
      },
      workspaceId
    );
  }

  /**
   * Create a manual alias (user explicitly creates mapping).
   */
  async createManualAlias(
    rawString: string,
    payeeId: number,
    workspaceId: number
  ): Promise<PayeeAlias> {
    const existing = await this.repository.findByRawString(rawString, workspaceId);

    if (existing) {
      if (existing.payeeId === payeeId) {
        return existing;
      }
      return await this.repository.update(existing.id, { payeeId }, workspaceId);
    }

    return await this.repository.create(
      {
        rawString,
        payeeId,
        trigger: "manual_creation",
        confidence: 1.0,
      },
      workspaceId
    );
  }

  /**
   * Bulk record aliases from import completion.
   * Called when user confirms and completes an import operation.
   */
  async bulkRecordAliases(
    records: Array<{
      rawString: string;
      payeeId: number;
      sourceAccountId?: number;
    }>,
    workspaceId: number
  ): Promise<{ created: number; updated: number }> {
    // Filter out duplicates - keep the last occurrence for each rawString
    const uniqueRecords = new Map<string, (typeof records)[0]>();
    for (const record of records) {
      uniqueRecords.set(normalize(record.rawString), record);
    }

    return await this.repository.bulkCreate(
      Array.from(uniqueRecords.values()).map((record) => ({
        rawString: record.rawString,
        payeeId: record.payeeId,
        trigger: "bulk_import" as AliasTrigger,
        sourceAccountId: record.sourceAccountId,
      })),
      workspaceId
    );
  }

  /**
   * Find a payee by alias (raw string lookup).
   * Returns the matched payee ID if found.
   */
  async findPayeeByAlias(rawString: string, workspaceId: number): Promise<AliasMatch | null> {
    return await this.repository.findBestMatch(rawString, workspaceId);
  }

  /**
   * Get all aliases for a specific payee.
   */
  async getAliasesForPayee(payeeId: number, workspaceId: number): Promise<PayeeAlias[]> {
    return await this.repository.findByPayeeId(payeeId, workspaceId);
  }

  /**
   * Get all aliases in a workspace with payee details.
   */
  async getAllAliasesWithPayees(workspaceId: number): Promise<PayeeAliasWithPayee[]> {
    return await this.repository.findAllWithPayees(workspaceId);
  }

  /**
   * Get a single alias by ID.
   */
  async getAlias(id: number, workspaceId: number): Promise<PayeeAlias | null> {
    return await this.repository.findById(id, workspaceId);
  }

  /**
   * Update an alias's raw string or payee mapping.
   */
  async updateAlias(
    id: number,
    data: { rawString?: string; payeeId?: number },
    workspaceId: number
  ): Promise<PayeeAlias> {
    return await this.repository.update(id, data, workspaceId);
  }

  /**
   * Delete an alias.
   */
  async deleteAlias(id: number, workspaceId: number): Promise<void> {
    await this.repository.softDelete(id, workspaceId);
  }

  /**
   * Delete all aliases for a payee.
   * Useful when deleting a payee.
   */
  async deleteAliasesForPayee(payeeId: number, workspaceId: number): Promise<number> {
    return await this.repository.bulkDeleteByPayeeId(payeeId, workspaceId);
  }

  /**
   * Merge aliases when payees are merged.
   * Moves all aliases from source payee to target payee.
   */
  async mergeAliases(
    sourcePayeeId: number,
    targetPayeeId: number,
    workspaceId: number
  ): Promise<number> {
    return await this.repository.mergeAliases(sourcePayeeId, targetPayeeId, workspaceId);
  }

  /**
   * Get statistics about aliases in a workspace.
   */
  async getStats(workspaceId: number): Promise<PayeeAliasStats> {
    return await this.repository.getStats(workspaceId);
  }

  /**
   * Process payee names during import matching.
   * First checks for alias matches, returning early if found.
   * This method is designed to be called from PayeeMatcher.
   */
  async matchWithAlias(
    payeeName: string,
    workspaceId: number
  ): Promise<{
    found: boolean;
    payeeId?: number;
    confidence: number;
    matchedOn?: "exact" | "normalized" | "cleaned";
  }> {
    const match = await this.findPayeeByAlias(payeeName, workspaceId);

    if (match) {
      // Increment match count for tracking
      await this.repository.incrementMatchCount(match.aliasId);

      return {
        found: true,
        payeeId: match.payeeId,
        confidence: match.confidence,
        matchedOn: match.matchedOn,
      };
    }

    return { found: false, confidence: 0 };
  }

  /**
   * Suggest aliases for a payee based on transaction history.
   * Looks at raw payee strings from transactions that match this payee
   * but might have variations.
   */
  async suggestAliasesForPayee(
    payeeId: number,
    payeeName: string,
    workspaceId: number
  ): Promise<string[]> {
    // Get existing aliases to exclude
    const existingAliases = await this.repository.findByPayeeId(payeeId, workspaceId);
    const existingRawStrings = new Set(
      existingAliases.map((a) => a.normalizedString?.toLowerCase())
    );

    // The payee name itself is not a suggestion
    const normalizedPayeeName = normalize(payeeName);
    existingRawStrings.add(normalizedPayeeName);

    // Return empty for now - would need transaction access to find variations
    // This could be enhanced to query transactions for this payee
    // and find unique raw_payee_string variations
    return [];
  }
}

// Singleton instance for easy access
let aliasServiceInstance: PayeeAliasService | null = null;

export function getPayeeAliasService(): PayeeAliasService {
  if (!aliasServiceInstance) {
    aliasServiceInstance = new PayeeAliasService();
  }
  return aliasServiceInstance;
}
