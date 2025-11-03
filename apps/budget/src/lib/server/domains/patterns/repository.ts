import {db} from "$lib/server/db";
import {detectedPatterns, accounts} from "$lib/schema";
import {eq, and, desc, lt, inArray} from "drizzle-orm";
import type {DetectedPattern, NewDetectedPattern} from "$lib/schema/detected-patterns";

export class PatternRepository {
  /**
   * Find patterns by account with optional status filtering
   */
  async findByAccount(
    accountId: number | undefined,
    workspaceId: string,
    status?: string
  ): Promise<DetectedPattern[]> {
    // If accountId is provided, verify it belongs to user
    if (accountId !== undefined) {
      await this.validateAccountOwnership(accountId, workspaceId);
    }

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
  async findById(patternId: number, workspaceId: string): Promise<DetectedPattern | null> {
    const pattern = await db.query.detectedPatterns.findFirst({
      where: eq(detectedPatterns.id, patternId),
    });

    if (!pattern) {
      return null;
    }

    // Verify pattern's account belongs to user
    const isOwner = await this.validatePatternOwnership(patternId, workspaceId);
    if (!isOwner) {
      return null;
    }

    return pattern;
  }

  /**
   * Find existing pattern that matches key characteristics
   */
  async findSimilarPattern(
    accountId: number,
    payeeId: number | null,
    categoryId: number | null,
    patternType: "daily" | "weekly" | "monthly" | "yearly",
    workspaceId: string
  ): Promise<DetectedPattern | null> {
    // Verify account belongs to user
    await this.validateAccountOwnership(accountId, workspaceId);
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
    workspaceId: string
  ): Promise<number> {
    // Verify account belongs to user
    await this.validateAccountOwnership(pattern.accountId, workspaceId);

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
    workspaceId: string
  ): Promise<void> {
    // Verify pattern belongs to user
    await this.validatePatternOwnership(patternId, workspaceId);

    await db.update(detectedPatterns).set(pattern).where(eq(detectedPatterns.id, patternId));
  }

  /**
   * Update the status of a pattern
   */
  async updateStatus(patternId: number, workspaceId: string, status: string): Promise<void> {
    // Verify pattern belongs to user
    await this.validatePatternOwnership(patternId, workspaceId);

    await db.update(detectedPatterns).set({status}).where(eq(detectedPatterns.id, patternId));
  }

  /**
   * Delete a pattern
   */
  async delete(patternId: number, workspaceId: string): Promise<void> {
    // Verify pattern belongs to user
    await this.validatePatternOwnership(patternId, workspaceId);

    await db.delete(detectedPatterns).where(eq(detectedPatterns.id, patternId));
  }

  /**
   * Delete all patterns (optionally filtered by status)
   */
  async deleteAll(
    workspaceId: string,
    status?: "pending" | "accepted" | "dismissed" | "converted"
  ): Promise<number> {
    // Get all user's account IDs
    const userAccountIds = await this.findUserAccountIds(workspaceId);

    if (userAccountIds.length === 0) {
      return 0;
    }

    if (status) {
      const result = await db
        .delete(detectedPatterns)
        .where(and(
          eq(detectedPatterns.status, status),
          inArray(detectedPatterns.accountId, userAccountIds)
        ));
      return result.changes || 0;
    } else {
      const result = await db
        .delete(detectedPatterns)
        .where(inArray(detectedPatterns.accountId, userAccountIds));
      return result.changes || 0;
    }
  }

  /**
   * Expire patterns that haven't had a match in X days
   */
  async expireStalePatterns(daysSinceLastMatch: number, workspaceId: string): Promise<number> {
    // Get all user's account IDs
    const userAccountIds = await this.findUserAccountIds(workspaceId);

    if (userAccountIds.length === 0) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastMatch);

    const result = await db
      .delete(detectedPatterns)
      .where(and(
        lt(detectedPatterns.lastOccurrence, cutoffDate.toISOString()),
        inArray(detectedPatterns.accountId, userAccountIds)
      ));

    return result.changes;
  }

  /**
   * Find user account IDs
   */
  async findUserAccountIds(workspaceId: string): Promise<number[]> {
    const accountList = await db.query.accounts.findMany({
      where: eq(accounts.workspaceId, workspaceId),
      columns: {id: true},
    });
    return accountList.map((a) => a.id);
  }

  /**
   * Validate account ownership
   */
  async validateAccountOwnership(accountId: number, workspaceId: string): Promise<boolean> {
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.id, accountId),
        eq(accounts.workspaceId, workspaceId)
      ),
    });
    return !!account;
  }

  /**
   * Validate pattern ownership
   */
  async validatePatternOwnership(patternId: number, workspaceId: string): Promise<boolean> {
    const pattern = await db.query.detectedPatterns.findFirst({
      where: eq(detectedPatterns.id, patternId),
    });

    if (!pattern) return false;

    return await this.validateAccountOwnership(pattern.accountId, workspaceId);
  }
}
