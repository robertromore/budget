import {db} from "$lib/server/db";
import {detectedPatterns, accounts} from "$lib/schema";
import {eq, and, desc, lt, inArray} from "drizzle-orm";
import type {DetectedPattern, NewDetectedPattern} from "$lib/schema/detected-patterns";

export class PatternRepository {
  /**
   * Find patterns by account with optional status filtering
   * NOTE: Single-user mode - userId validation not yet implemented
   */
  async findByAccount(
    accountId: number | undefined,
    userId?: string,
    status?: string
  ): Promise<DetectedPattern[]> {
    const conditions = [];

    if (accountId !== undefined) {
      conditions.push(eq(detectedPatterns.accountId, accountId));
    }

    if (status) {
      conditions.push(eq(detectedPatterns.status, status));
    }

    return await db.query.detectedPatterns.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(detectedPatterns.confidenceScore), desc(detectedPatterns.createdAt)],
      with: {
        payee: true,
        category: true,
      },
    });
  }

  /**
   * Find a pattern by ID
   */
  async findById(patternId: number, userId?: string): Promise<DetectedPattern | null> {
    const pattern = await db.query.detectedPatterns.findFirst({
      where: eq(detectedPatterns.id, patternId),
    });
    return pattern || null;
  }

  /**
   * Find existing pattern that matches key characteristics
   */
  async findSimilarPattern(
    accountId: number,
    payeeId: number | null,
    categoryId: number | null,
    patternType: "daily" | "weekly" | "monthly" | "yearly",
    userId?: string
  ): Promise<DetectedPattern | null> {
    const conditions = [
      eq(detectedPatterns.accountId, accountId),
      eq(detectedPatterns.patternType, patternType),
      eq(detectedPatterns.status, "pending" as const), // Only check pending patterns
    ];

    if (payeeId !== null) {
      conditions.push(eq(detectedPatterns.payeeId, payeeId));
    }

    if (categoryId !== null) {
      conditions.push(eq(detectedPatterns.categoryId, categoryId));
    }

    const pattern = await db.query.detectedPatterns.findFirst({
      where: and(...conditions),
    });

    return pattern || null;
  }

  /**
   * Create a new detected pattern
   */
  async create(
    pattern: Omit<NewDetectedPattern, "id" | "createdAt">,
    userId?: string
  ): Promise<number> {
    const [result] = await db
      .insert(detectedPatterns)
      .values(pattern as NewDetectedPattern)
      .returning({id: detectedPatterns.id});
    return result.id;
  }

  /**
   * Update an existing pattern with new detection data
   */
  async update(
    patternId: number,
    pattern: Partial<Omit<DetectedPattern, "id" | "createdAt">>,
    userId?: string
  ): Promise<void> {
    await db.update(detectedPatterns).set(pattern).where(eq(detectedPatterns.id, patternId));
  }

  /**
   * Update the status of a pattern
   */
  async updateStatus(patternId: number, userId?: string, status: string): Promise<void> {
    await db.update(detectedPatterns).set({status}).where(eq(detectedPatterns.id, patternId));
  }

  /**
   * Delete a pattern
   */
  async delete(patternId: number, userId?: string): Promise<void> {
    await db.delete(detectedPatterns).where(eq(detectedPatterns.id, patternId));
  }

  /**
   * Delete all patterns (optionally filtered by status)
   */
  async deleteAll(
    userId?: string,
    status?: "pending" | "accepted" | "dismissed" | "converted"
  ): Promise<number> {
    if (status) {
      const result = await db
        .delete(detectedPatterns)
        .where(eq(detectedPatterns.status, status));
      return result.changes || 0;
    } else {
      const result = await db.delete(detectedPatterns);
      return result.changes || 0;
    }
  }

  /**
   * Expire patterns that haven't had a match in X days
   */
  async expireStalePatterns(daysSinceLastMatch: number, userId?: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastMatch);

    const result = await db
      .delete(detectedPatterns)
      .where(lt(detectedPatterns.lastOccurrence, cutoffDate.toISOString()));

    return result.changes;
  }

  /**
   * Find user account IDs (for future multi-user support)
   * Currently returns all accounts since no userId filtering
   */
  async findUserAccountIds(userId?: string): Promise<number[]> {
    const accountList = await db.query.accounts.findMany({
      columns: {id: true},
    });
    return accountList.map((a) => a.id);
  }

  /**
   * Validate account ownership (for future multi-user support)
   * Currently returns true since single-user mode
   */
  async validateAccountOwnership(accountId: number, userId?: string): Promise<boolean> {
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });
    return !!account;
  }

  /**
   * Validate pattern ownership (for future multi-user support)
   * Currently validates pattern exists and account exists
   */
  async validatePatternOwnership(patternId: number, userId?: string): Promise<boolean> {
    const pattern = await db.query.detectedPatterns.findFirst({
      where: eq(detectedPatterns.id, patternId),
    });

    if (!pattern) return false;

    return await this.validateAccountOwnership(pattern.accountId, userId);
  }
}
