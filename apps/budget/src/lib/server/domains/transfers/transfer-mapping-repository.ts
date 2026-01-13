import type {
  TransferMappingTrigger,
  TransferMappingMatch,
  TransferMapping,
  TransferMappingStats,
  TransferMappingWithAccount,
} from "$lib/schema/transfer-mappings";
import { transferMappings, accounts } from "$lib/schema";
import { db } from "$lib/server/db";
import { NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

/**
 * Input type for creating a transfer mapping.
 * Omits workspaceId since it's passed as a separate parameter.
 */
type CreateTransferMappingInput = {
  rawPayeeString: string;
  targetAccountId: number;
  trigger: TransferMappingTrigger;
  confidence?: number;
  matchCount?: number;
  sourceAccountId?: number;
  lastAppliedAt?: string;
};

/**
 * Repository for transfer mapping database operations.
 *
 * Manages the mapping of raw imported payee strings to transfer accounts.
 * Used during imports to remember user-confirmed transfer conversions.
 */
export class TransferMappingRepository {
  /**
   * Normalize a raw string for consistent matching.
   * Converts to lowercase, trims whitespace, and removes extra spaces.
   */
  private normalizeString(raw: string): string {
    return raw.toLowerCase().trim().replace(/\s+/g, " ");
  }

  /**
   * Create a cleaned version of the string for fuzzy matching.
   * Strips amounts, transaction IDs, dates, and other variable data.
   */
  private cleanString(raw: string): string {
    let text = raw.toLowerCase().trim();

    // Remove dollar amounts: $1,234.56 or $1234.56 or $1234
    text = text.replace(/\$[\d,]+(?:\.\d{2})?/g, "");

    // Remove standalone amounts without $ (e.g., "1234.56" at end)
    text = text.replace(/\s+\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*$/g, "");

    // Remove dates in various formats
    text = text.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "");
    text = text.replace(/\d{2,4}-\d{2}-\d{2}/g, "");

    // Remove transaction IDs: alphanumeric strings containing * or # (8+ chars)
    text = text.replace(/\b[A-Z0-9]*[*#][A-Z0-9*#]+\b/gi, "");

    // Remove long numeric sequences (8+ digits) anywhere
    text = text.replace(/\b\d{8,}\b/g, "");

    // Remove trailing reference numbers (4-7 digits at end of string)
    // This catches patterns like "APPLECARD GSBANK 12345" or "VENMO PAYMENT 1234567"
    text = text.replace(/\s+\d{4,7}\s*$/g, "");

    // Remove card number patterns (****1234)
    text = text.replace(/\*{4}\d{4}/g, "");

    // Remove trailing "I" that might be an identifier
    text = text.replace(/\s+i\s*$/i, "");

    // Normalize whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
  }

  /**
   * Create a new transfer mapping
   */
  async create(data: CreateTransferMappingInput, workspaceId: number): Promise<TransferMapping> {
    const normalizedString = this.normalizeString(data.rawPayeeString);
    const now = getCurrentTimestamp();

    console.log("[TransferMappingRepo] Creating mapping:", {
      rawPayeeString: data.rawPayeeString,
      normalizedString,
      targetAccountId: data.targetAccountId,
      workspaceId,
    });

    const [mapping] = await db
      .insert(transferMappings)
      .values({
        ...data,
        workspaceId,
        normalizedString,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!mapping) {
      throw new Error("Failed to create transfer mapping");
    }

    console.log("[TransferMappingRepo] Created mapping with ID:", mapping.id);
    return mapping;
  }

  /**
   * Find a mapping by ID
   */
  async findById(id: number, workspaceId: number): Promise<TransferMapping | null> {
    const [result] = await db
      .select()
      .from(transferMappings)
      .where(
        and(
          eq(transferMappings.id, id),
          eq(transferMappings.workspaceId, workspaceId),
          isNull(transferMappings.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find a mapping by exact raw payee string match
   */
  async findByRawString(rawPayeeString: string, workspaceId: number): Promise<TransferMapping | null> {
    const [result] = await db
      .select()
      .from(transferMappings)
      .where(
        and(
          eq(transferMappings.rawPayeeString, rawPayeeString),
          eq(transferMappings.workspaceId, workspaceId),
          isNull(transferMappings.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find mappings by normalized string (may return multiple)
   */
  async findByNormalizedString(normalized: string, workspaceId: number): Promise<TransferMapping[]> {
    return await db
      .select()
      .from(transferMappings)
      .where(
        and(
          eq(transferMappings.normalizedString, normalized),
          eq(transferMappings.workspaceId, workspaceId),
          isNull(transferMappings.deletedAt)
        )
      );
  }

  /**
   * Find all mappings for a specific target account
   */
  async findByTargetAccountId(targetAccountId: number, workspaceId: number): Promise<TransferMapping[]> {
    return await db
      .select()
      .from(transferMappings)
      .where(
        and(
          eq(transferMappings.targetAccountId, targetAccountId),
          eq(transferMappings.workspaceId, workspaceId),
          isNull(transferMappings.deletedAt)
        )
      )
      .orderBy(desc(transferMappings.matchCount));
  }

  /**
   * Find all mappings from a specific source account (where imports happened)
   */
  async findBySourceAccountId(sourceAccountId: number, workspaceId: number): Promise<TransferMappingWithAccount[]> {
    const results = await db
      .select({
        mapping: transferMappings,
        targetAccount: {
          id: accounts.id,
          name: accounts.name,
          slug: accounts.slug,
          accountIcon: accounts.accountIcon,
          accountColor: accounts.accountColor,
        },
      })
      .from(transferMappings)
      .innerJoin(accounts, eq(transferMappings.targetAccountId, accounts.id))
      .where(
        and(
          eq(transferMappings.sourceAccountId, sourceAccountId),
          eq(transferMappings.workspaceId, workspaceId),
          isNull(transferMappings.deletedAt)
        )
      )
      .orderBy(desc(transferMappings.matchCount));

    return results.map((r) => ({
      ...r.mapping,
      targetAccount: r.targetAccount,
    }));
  }

  /**
   * Find all mappings for a workspace
   */
  async findAll(workspaceId: number): Promise<TransferMapping[]> {
    return await db
      .select()
      .from(transferMappings)
      .where(and(eq(transferMappings.workspaceId, workspaceId), isNull(transferMappings.deletedAt)))
      .orderBy(desc(transferMappings.matchCount));
  }

  /**
   * Find all mappings with target account details
   */
  async findAllWithAccounts(workspaceId: number): Promise<TransferMappingWithAccount[]> {
    const results = await db
      .select({
        mapping: transferMappings,
        targetAccount: {
          id: accounts.id,
          name: accounts.name,
          slug: accounts.slug,
          accountIcon: accounts.accountIcon,
          accountColor: accounts.accountColor,
        },
      })
      .from(transferMappings)
      .innerJoin(accounts, eq(transferMappings.targetAccountId, accounts.id))
      .where(and(eq(transferMappings.workspaceId, workspaceId), isNull(transferMappings.deletedAt)))
      .orderBy(desc(transferMappings.matchCount));

    return results.map((r) => ({
      ...r.mapping,
      targetAccount: r.targetAccount,
    }));
  }

  /**
   * Update a mapping
   */
  async update(
    id: number,
    data: Partial<Pick<TransferMapping, "targetAccountId" | "rawPayeeString">>,
    workspaceId: number
  ): Promise<TransferMapping> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("TransferMapping", id);
    }

    const updateData: Partial<TransferMapping> = {
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    // If rawPayeeString changed, update normalized too
    if (data.rawPayeeString) {
      updateData.normalizedString = this.normalizeString(data.rawPayeeString);
    }

    const [updated] = await db
      .update(transferMappings)
      .set(updateData)
      .where(and(eq(transferMappings.id, id), eq(transferMappings.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update transfer mapping");
    }

    return updated;
  }

  /**
   * Soft delete a mapping
   */
  async softDelete(id: number, workspaceId: number): Promise<void> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("TransferMapping", id);
    }

    await db
      .update(transferMappings)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(transferMappings.id, id), eq(transferMappings.workspaceId, workspaceId)));
  }

  /**
   * Bulk create mappings, handling duplicates by updating match count
   */
  async bulkCreate(
    mappings: Array<{
      rawPayeeString: string;
      targetAccountId: number;
      trigger?: TransferMappingTrigger;
      sourceAccountId?: number;
    }>,
    workspaceId: number
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const now = getCurrentTimestamp();

    for (const mappingData of mappings) {
      const existing = await this.findByRawString(mappingData.rawPayeeString, workspaceId);

      if (existing) {
        // Update existing mapping - increment match count
        await db
          .update(transferMappings)
          .set({
            matchCount: existing.matchCount + 1,
            targetAccountId: mappingData.targetAccountId, // Update to new account if changed
            lastAppliedAt: now,
            updatedAt: now,
          })
          .where(eq(transferMappings.id, existing.id));
        updated++;
      } else {
        // Create new mapping
        await db.insert(transferMappings).values({
          workspaceId,
          rawPayeeString: mappingData.rawPayeeString,
          normalizedString: this.normalizeString(mappingData.rawPayeeString),
          targetAccountId: mappingData.targetAccountId,
          trigger: mappingData.trigger || "import_confirmation",
          sourceAccountId: mappingData.sourceAccountId,
          confidence: 1.0,
          matchCount: 1,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Bulk delete all mappings for a target account
   */
  async bulkDeleteByTargetAccountId(targetAccountId: number, workspaceId: number): Promise<number> {
    const result = await db
      .update(transferMappings)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(
        and(
          eq(transferMappings.targetAccountId, targetAccountId),
          eq(transferMappings.workspaceId, workspaceId),
          isNull(transferMappings.deletedAt)
        )
      );

    return result.rowsAffected || 0;
  }

  /**
   * Find best match for a raw payee string.
   * Tries: exact match -> normalized match -> cleaned match (strips amounts/IDs).
   */
  async findBestMatch(rawPayeeString: string, workspaceId: number): Promise<TransferMappingMatch | null> {
    console.log("[TransferMappingRepo] findBestMatch called with:", {
      rawPayeeString,
      workspaceId,
    });

    // First try exact match
    const exactMatch = await this.findByRawString(rawPayeeString, workspaceId);
    console.log("[TransferMappingRepo] Exact match result:", exactMatch ? {
      id: exactMatch.id,
      rawPayeeString: exactMatch.rawPayeeString,
      targetAccountId: exactMatch.targetAccountId,
    } : "none");

    if (exactMatch) {
      return {
        targetAccountId: exactMatch.targetAccountId,
        confidence: exactMatch.confidence,
        mappingId: exactMatch.id,
        matchedOn: "exact",
      };
    }

    // Then try normalized match
    const normalized = this.normalizeString(rawPayeeString);
    console.log("[TransferMappingRepo] Trying normalized match:", normalized);
    const normalizedMatches = await this.findByNormalizedString(normalized, workspaceId);
    console.log("[TransferMappingRepo] Normalized matches:", normalizedMatches.length);

    if (normalizedMatches.length > 0) {
      // Return the most used mapping for this normalized string
      const bestMatch = normalizedMatches[0];
      return {
        targetAccountId: bestMatch.targetAccountId,
        confidence: bestMatch.confidence * 0.9, // Slightly lower confidence for normalized
        mappingId: bestMatch.id,
        matchedOn: "normalized",
      };
    }

    // Finally try cleaned match (strips amounts, IDs, etc.)
    const cleanedInput = this.cleanString(rawPayeeString);
    console.log("[TransferMappingRepo] Trying cleaned match:", {
      original: rawPayeeString,
      cleaned: cleanedInput,
    });

    if (cleanedInput.length >= 3) {
      // Only try if we have a meaningful string left
      const allMappings = await this.findAll(workspaceId);
      console.log("[TransferMappingRepo] Total mappings to check:", allMappings.length);

      // Find mappings whose cleaned version matches
      const cleanedMatches = allMappings.filter((mapping) => {
        const cleanedMapping = this.cleanString(mapping.rawPayeeString);
        return cleanedMapping === cleanedInput;
      });

      // Log sample of cleaned mappings for debugging
      if (allMappings.length > 0 && cleanedMatches.length === 0) {
        const samples = allMappings.slice(0, 5).map(m => ({
          raw: m.rawPayeeString,
          cleaned: this.cleanString(m.rawPayeeString),
        }));
        console.log("[TransferMappingRepo] Sample cleaned mappings (no match):", samples);
      }

      if (cleanedMatches.length > 0) {
        // Return the most used mapping with matching cleaned string
        const bestMatch = cleanedMatches.sort((a, b) => b.matchCount - a.matchCount)[0];
        console.log("[TransferMappingRepo] Cleaned match found:", {
          mappingId: bestMatch.id,
          targetAccountId: bestMatch.targetAccountId,
        });
        return {
          targetAccountId: bestMatch.targetAccountId,
          confidence: bestMatch.confidence * 0.8, // Lower confidence for cleaned match
          mappingId: bestMatch.id,
          matchedOn: "cleaned",
        };
      }
    }

    console.log("[TransferMappingRepo] No match found");
    return null;
  }

  /**
   * Increment match count for a mapping (called when mapping is applied)
   */
  async incrementMatchCount(id: number): Promise<void> {
    await db
      .update(transferMappings)
      .set({
        matchCount: sql`${transferMappings.matchCount} + 1`,
        lastAppliedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(transferMappings.id, id));
  }

  /**
   * Get statistics about transfer mappings for a workspace
   */
  async getStats(workspaceId: number): Promise<TransferMappingStats> {
    // Total mappings count
    const [totalResult] = await db
      .select({ total: count() })
      .from(transferMappings)
      .where(and(eq(transferMappings.workspaceId, workspaceId), isNull(transferMappings.deletedAt)));

    const totalMappings = totalResult?.total || 0;

    // Unique target accounts with mappings
    const [uniqueAccountsResult] = await db
      .select({ uniqueAccounts: sql<number>`COUNT(DISTINCT ${transferMappings.targetAccountId})` })
      .from(transferMappings)
      .where(and(eq(transferMappings.workspaceId, workspaceId), isNull(transferMappings.deletedAt)));

    const uniqueTargetAccounts = uniqueAccountsResult?.uniqueAccounts || 0;

    // Total times applied
    const [totalAppliedResult] = await db
      .select({ totalApplied: sql<number>`SUM(${transferMappings.matchCount})` })
      .from(transferMappings)
      .where(and(eq(transferMappings.workspaceId, workspaceId), isNull(transferMappings.deletedAt)));

    const totalTimesApplied = totalAppliedResult?.totalApplied || 0;

    // Most used mappings (top 10)
    const mostUsedResults = await db
      .select({
        id: transferMappings.id,
        rawPayeeString: transferMappings.rawPayeeString,
        targetAccountName: accounts.name,
        matchCount: transferMappings.matchCount,
      })
      .from(transferMappings)
      .innerJoin(accounts, eq(transferMappings.targetAccountId, accounts.id))
      .where(and(eq(transferMappings.workspaceId, workspaceId), isNull(transferMappings.deletedAt)))
      .orderBy(desc(transferMappings.matchCount))
      .limit(10);

    // Recently created (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const [recentResult] = await db
      .select({ recentCount: count() })
      .from(transferMappings)
      .where(
        and(
          eq(transferMappings.workspaceId, workspaceId),
          isNull(transferMappings.deletedAt),
          sql`${transferMappings.createdAt} >= ${thirtyDaysAgoStr}`
        )
      );

    const recentlyCreated = recentResult?.recentCount || 0;

    // Count by trigger
    const byTriggerResults = await db
      .select({
        trigger: transferMappings.trigger,
        count: count(),
      })
      .from(transferMappings)
      .where(and(eq(transferMappings.workspaceId, workspaceId), isNull(transferMappings.deletedAt)))
      .groupBy(transferMappings.trigger);

    const byTrigger = byTriggerResults.reduce(
      (acc, row) => {
        acc[row.trigger as TransferMappingTrigger] = row.count;
        return acc;
      },
      {} as Record<TransferMappingTrigger, number>
    );

    return {
      totalMappings,
      uniqueTargetAccounts,
      mappingsPerAccount: uniqueTargetAccounts > 0 ? totalMappings / uniqueTargetAccounts : 0,
      totalTimesApplied,
      mostUsedMappings: mostUsedResults,
      recentlyCreated,
      byTrigger,
    };
  }
}
