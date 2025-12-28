import type {
  AliasTrigger,
  AliasMatch,
  PayeeAlias,
  PayeeAliasStats,
  PayeeAliasWithPayee,
} from "$lib/schema/payee-aliases";
import { payeeAliases, payees } from "$lib/schema";
import { db } from "$lib/server/db";
import { NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

/**
 * Input type for creating a payee alias.
 * Omits workspaceId since it's passed as a separate parameter.
 */
type CreatePayeeAliasInput = {
  rawString: string;
  payeeId: number;
  trigger: AliasTrigger;
  confidence?: number;
  matchCount?: number;
  sourceAccountId?: number;
  lastMatchedAt?: string;
};

/**
 * Repository for payee alias database operations.
 *
 * Manages the mapping of raw imported strings to canonical payee IDs.
 * Used during imports to remember user-confirmed payee mappings.
 */
export class PayeeAliasRepository {
  /**
   * Normalize a raw string for consistent matching.
   * Converts to lowercase, trims whitespace, and removes extra spaces.
   */
  private normalizeString(raw: string): string {
    return raw.toLowerCase().trim().replace(/\s+/g, " ");
  }

  /**
   * Create a new alias
   */
  async create(data: CreatePayeeAliasInput, workspaceId: number): Promise<PayeeAlias> {
    const normalizedString = this.normalizeString(data.rawString);
    const now = getCurrentTimestamp();

    const [alias] = await db
      .insert(payeeAliases)
      .values({
        ...data,
        workspaceId,
        normalizedString,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!alias) {
      throw new Error("Failed to create payee alias");
    }

    return alias;
  }

  /**
   * Find an alias by ID
   */
  async findById(id: number, workspaceId: number): Promise<PayeeAlias | null> {
    const [result] = await db
      .select()
      .from(payeeAliases)
      .where(
        and(
          eq(payeeAliases.id, id),
          eq(payeeAliases.workspaceId, workspaceId),
          isNull(payeeAliases.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find an alias by exact raw string match
   */
  async findByRawString(rawString: string, workspaceId: number): Promise<PayeeAlias | null> {
    const [result] = await db
      .select()
      .from(payeeAliases)
      .where(
        and(
          eq(payeeAliases.rawString, rawString),
          eq(payeeAliases.workspaceId, workspaceId),
          isNull(payeeAliases.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find aliases by normalized string (may return multiple)
   */
  async findByNormalizedString(normalized: string, workspaceId: number): Promise<PayeeAlias[]> {
    return await db
      .select()
      .from(payeeAliases)
      .where(
        and(
          eq(payeeAliases.normalizedString, normalized),
          eq(payeeAliases.workspaceId, workspaceId),
          isNull(payeeAliases.deletedAt)
        )
      );
  }

  /**
   * Find all aliases for a specific payee
   */
  async findByPayeeId(payeeId: number, workspaceId: number): Promise<PayeeAlias[]> {
    return await db
      .select()
      .from(payeeAliases)
      .where(
        and(
          eq(payeeAliases.payeeId, payeeId),
          eq(payeeAliases.workspaceId, workspaceId),
          isNull(payeeAliases.deletedAt)
        )
      )
      .orderBy(desc(payeeAliases.matchCount));
  }

  /**
   * Find all aliases for a workspace
   */
  async findAll(workspaceId: number): Promise<PayeeAlias[]> {
    return await db
      .select()
      .from(payeeAliases)
      .where(and(eq(payeeAliases.workspaceId, workspaceId), isNull(payeeAliases.deletedAt)))
      .orderBy(desc(payeeAliases.matchCount));
  }

  /**
   * Find all aliases with payee details
   */
  async findAllWithPayees(workspaceId: number): Promise<PayeeAliasWithPayee[]> {
    const results = await db
      .select({
        alias: payeeAliases,
        payee: {
          id: payees.id,
          name: payees.name,
          slug: payees.slug,
        },
      })
      .from(payeeAliases)
      .innerJoin(payees, eq(payeeAliases.payeeId, payees.id))
      .where(and(eq(payeeAliases.workspaceId, workspaceId), isNull(payeeAliases.deletedAt)))
      .orderBy(desc(payeeAliases.matchCount));

    return results.map((r) => ({
      ...r.alias,
      payee: r.payee,
    }));
  }

  /**
   * Update an alias
   */
  async update(
    id: number,
    data: Partial<Pick<PayeeAlias, "payeeId" | "rawString">>,
    workspaceId: number
  ): Promise<PayeeAlias> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("PayeeAlias", id);
    }

    const updateData: Partial<PayeeAlias> = {
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    // If rawString changed, update normalized too
    if (data.rawString) {
      updateData.normalizedString = this.normalizeString(data.rawString);
    }

    const [updated] = await db
      .update(payeeAliases)
      .set(updateData)
      .where(and(eq(payeeAliases.id, id), eq(payeeAliases.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update payee alias");
    }

    return updated;
  }

  /**
   * Soft delete an alias
   */
  async softDelete(id: number, workspaceId: number): Promise<void> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("PayeeAlias", id);
    }

    await db
      .update(payeeAliases)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(and(eq(payeeAliases.id, id), eq(payeeAliases.workspaceId, workspaceId)));
  }

  /**
   * Bulk create aliases, handling duplicates by updating match count
   */
  async bulkCreate(
    aliases: Array<{
      rawString: string;
      payeeId: number;
      trigger?: AliasTrigger;
      sourceAccountId?: number;
    }>,
    workspaceId: number
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    const now = getCurrentTimestamp();

    for (const aliasData of aliases) {
      const existing = await this.findByRawString(aliasData.rawString, workspaceId);

      if (existing) {
        // Update existing alias - increment match count
        await db
          .update(payeeAliases)
          .set({
            matchCount: existing.matchCount + 1,
            payeeId: aliasData.payeeId, // Update to new payee if changed
            lastMatchedAt: now,
            updatedAt: now,
          })
          .where(eq(payeeAliases.id, existing.id));
        updated++;
      } else {
        // Create new alias
        await db.insert(payeeAliases).values({
          workspaceId,
          rawString: aliasData.rawString,
          normalizedString: this.normalizeString(aliasData.rawString),
          payeeId: aliasData.payeeId,
          trigger: aliasData.trigger || "import_confirmation",
          sourceAccountId: aliasData.sourceAccountId,
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
   * Bulk delete all aliases for a payee
   */
  async bulkDeleteByPayeeId(payeeId: number, workspaceId: number): Promise<number> {
    const result = await db
      .update(payeeAliases)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(
        and(
          eq(payeeAliases.payeeId, payeeId),
          eq(payeeAliases.workspaceId, workspaceId),
          isNull(payeeAliases.deletedAt)
        )
      );

    return result.rowsAffected || 0;
  }

  /**
   * Find best match for a raw string.
   * First tries exact match, then normalized match.
   */
  async findBestMatch(rawString: string, workspaceId: number): Promise<AliasMatch | null> {
    // First try exact match
    const exactMatch = await this.findByRawString(rawString, workspaceId);
    if (exactMatch) {
      return {
        payeeId: exactMatch.payeeId,
        confidence: exactMatch.confidence,
        aliasId: exactMatch.id,
        matchedOn: "exact",
      };
    }

    // Then try normalized match
    const normalized = this.normalizeString(rawString);
    const normalizedMatches = await this.findByNormalizedString(normalized, workspaceId);

    if (normalizedMatches.length > 0) {
      // Return the most used alias for this normalized string
      const bestMatch = normalizedMatches[0];
      return {
        payeeId: bestMatch.payeeId,
        confidence: bestMatch.confidence * 0.9, // Slightly lower confidence for normalized
        aliasId: bestMatch.id,
        matchedOn: "normalized",
      };
    }

    return null;
  }

  /**
   * Increment match count for an alias (called when alias is used)
   */
  async incrementMatchCount(id: number): Promise<void> {
    await db
      .update(payeeAliases)
      .set({
        matchCount: sql`${payeeAliases.matchCount} + 1`,
        lastMatchedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(payeeAliases.id, id));
  }

  /**
   * Move aliases from one payee to another (for merging payees)
   */
  async mergeAliases(
    sourcePayeeId: number,
    targetPayeeId: number,
    workspaceId: number
  ): Promise<number> {
    const result = await db
      .update(payeeAliases)
      .set({
        payeeId: targetPayeeId,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(payeeAliases.payeeId, sourcePayeeId),
          eq(payeeAliases.workspaceId, workspaceId),
          isNull(payeeAliases.deletedAt)
        )
      );

    return result.rowsAffected || 0;
  }

  /**
   * Get statistics about aliases for a workspace
   */
  async getStats(workspaceId: number): Promise<PayeeAliasStats> {
    // Total aliases count
    const [totalResult] = await db
      .select({ total: count() })
      .from(payeeAliases)
      .where(and(eq(payeeAliases.workspaceId, workspaceId), isNull(payeeAliases.deletedAt)));

    const totalAliases = totalResult?.total || 0;

    // Unique payees with aliases
    const [uniquePayeesResult] = await db
      .select({ uniquePayees: sql<number>`COUNT(DISTINCT ${payeeAliases.payeeId})` })
      .from(payeeAliases)
      .where(and(eq(payeeAliases.workspaceId, workspaceId), isNull(payeeAliases.deletedAt)));

    const uniquePayees = uniquePayeesResult?.uniquePayees || 0;

    // Total match count
    const [totalMatchesResult] = await db
      .select({ totalMatches: sql<number>`SUM(${payeeAliases.matchCount})` })
      .from(payeeAliases)
      .where(and(eq(payeeAliases.workspaceId, workspaceId), isNull(payeeAliases.deletedAt)));

    const totalMatches = totalMatchesResult?.totalMatches || 0;

    // Most used aliases (top 10)
    const mostUsedResults = await db
      .select({
        id: payeeAliases.id,
        rawString: payeeAliases.rawString,
        payeeName: payees.name,
        matchCount: payeeAliases.matchCount,
      })
      .from(payeeAliases)
      .innerJoin(payees, eq(payeeAliases.payeeId, payees.id))
      .where(and(eq(payeeAliases.workspaceId, workspaceId), isNull(payeeAliases.deletedAt)))
      .orderBy(desc(payeeAliases.matchCount))
      .limit(10);

    // Recently created (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const [recentResult] = await db
      .select({ recentCount: count() })
      .from(payeeAliases)
      .where(
        and(
          eq(payeeAliases.workspaceId, workspaceId),
          isNull(payeeAliases.deletedAt),
          sql`${payeeAliases.createdAt} >= ${thirtyDaysAgoStr}`
        )
      );

    const recentlyCreated = recentResult?.recentCount || 0;

    // Count by trigger
    const byTriggerResults = await db
      .select({
        trigger: payeeAliases.trigger,
        count: count(),
      })
      .from(payeeAliases)
      .where(and(eq(payeeAliases.workspaceId, workspaceId), isNull(payeeAliases.deletedAt)))
      .groupBy(payeeAliases.trigger);

    const byTrigger = byTriggerResults.reduce(
      (acc, row) => {
        acc[row.trigger as AliasTrigger] = row.count;
        return acc;
      },
      {} as Record<AliasTrigger, number>
    );

    return {
      totalAliases,
      uniquePayees,
      aliasesPerPayee: uniquePayees > 0 ? totalAliases / uniquePayees : 0,
      totalMatches,
      mostUsedAliases: mostUsedResults,
      recentlyCreated,
      byTrigger,
    };
  }
}
