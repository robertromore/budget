/**
 * Recommendation Service
 *
 * Manages budget recommendations: create, read, update, delete, apply, dismiss
 */

import { db } from "$lib/server/db";
import {
  budgetRecommendations,
  type BudgetRecommendation,
  type NewBudgetRecommendation,
  type BudgetRecommendationWithRelations,
  type RecommendationStatus,
  type RecommendationType,
  type RecommendationPriority,
} from "$lib/schema/recommendations";
import { budgets } from "$lib/schema/budgets";
import { categories } from "$lib/schema/categories";
import { accounts } from "$lib/schema/accounts";
import { and, eq, gte, lte, isNull, or, sql, desc } from "drizzle-orm";
import { logger } from "$lib/server/shared/logging";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import type { BudgetRecommendationDraft } from "./budget-analysis-service";

export interface RecommendationFilters {
  status?: RecommendationStatus | RecommendationStatus[];
  type?: RecommendationType | RecommendationType[];
  priority?: RecommendationPriority | RecommendationPriority[];
  budgetId?: number;
  accountId?: number;
  categoryId?: number;
  includeExpired?: boolean;
}

export class RecommendationService {
  /**
   * Create a new recommendation
   */
  async createRecommendation(
    data: BudgetRecommendationDraft
  ): Promise<BudgetRecommendationWithRelations> {
    try {
      const now = getCurrentTimestamp();

      const [created] = await db
        .insert(budgetRecommendations)
        .values({
          type: data.type,
          priority: data.priority,
          title: data.title,
          description: data.description,
          confidence: data.confidence,
          metadata: data.metadata,
          status: "pending",
          budgetId: data.budgetId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          expiresAt: data.expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!created) {
        throw new ValidationError("Failed to create recommendation", "recommendation");
      }

      return await this.getRecommendation(created.id);
    } catch (error) {
      logger.error("Error creating recommendation", { error, data });
      throw error;
    }
  }

  /**
   * Bulk create recommendations
   */
  async createRecommendations(
    drafts: BudgetRecommendationDraft[]
  ): Promise<BudgetRecommendationWithRelations[]> {
    if (drafts.length === 0) return [];

    try {
      const now = getCurrentTimestamp();

      // Step 0: Clean up old expired recommendations (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      const deletedExpired = await db
        .delete(budgetRecommendations)
        .where(
          and(
            eq(budgetRecommendations.status, "expired"),
            lte(budgetRecommendations.updatedAt, sevenDaysAgoStr)
          )
        )
        .returning();

      if (deletedExpired.length > 0) {
        logger.info("Cleaned up old expired recommendations", {
          count: deletedExpired.length,
        });
      }

      // Step 1: Get recently dismissed/applied recommendations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

      const existingRecommendations = await db
        .select()
        .from(budgetRecommendations)
        .where(
          and(
            or(
              eq(budgetRecommendations.status, "dismissed"),
              eq(budgetRecommendations.status, "applied")
            ),
            gte(budgetRecommendations.updatedAt, thirtyDaysAgoStr)
          )
        );

      // Step 2: Filter out drafts that match dismissed/applied recommendations
      // Match by: type, categoryId, accountId, and suggestedType in metadata
      const filteredDrafts = drafts.filter((draft) => {
        const isDuplicate = existingRecommendations.some((existing) => {
          // Must match type
          if (existing.type !== draft.type) return false;

          // Must match category (both null or both same ID)
          if (existing.categoryId !== draft.categoryId) return false;

          // Must match account (both null or both same ID)
          if (existing.accountId !== draft.accountId) return false;

          // For scheduled expenses, also check payee
          if (draft.metadata?.suggestedType === "scheduled-expense") {
            const existingPayeeIds = existing.metadata?.["payeeIds"] as number[] | undefined;
            const draftPayeeIds = draft.metadata?.payeeIds as number[] | undefined;

            if (existingPayeeIds?.[0] !== draftPayeeIds?.[0]) return false;
          }

          return true;
        });

        return !isDuplicate;
      });

      if (filteredDrafts.length < drafts.length) {
        logger.info("Filtered out dismissed/applied recommendations", {
          total: drafts.length,
          filtered: drafts.length - filteredDrafts.length,
          remaining: filteredDrafts.length,
        });
      }

      // Step 3: Expire all old pending recommendations before creating new ones
      await db
        .update(budgetRecommendations)
        .set({
          status: "expired",
          updatedAt: now,
        })
        .where(
          and(
            eq(budgetRecommendations.status, "pending"),
            lte(budgetRecommendations.createdAt, sql`datetime('now', '-5 seconds')`)
          )
        );

      logger.info("Expired old pending recommendations before creating new ones");

      // Step 4: Create new recommendations (only ones that weren't dismissed/applied)
      if (filteredDrafts.length === 0) {
        logger.info("No new recommendations to create after filtering");
        return await this.listRecommendations({ status: "pending" });
      }

      const values = filteredDrafts.map((data) => ({
        type: data.type,
        priority: data.priority,
        title: data.title,
        description: data.description,
        confidence: data.confidence,
        metadata: data.metadata,
        status: "pending" as const,
        budgetId: data.budgetId,
        accountId: data.accountId,
        categoryId: data.categoryId,
        expiresAt: data.expiresAt,
        createdAt: now,
        updatedAt: now,
      }));

      const created = await db
        .insert(budgetRecommendations)
        .values(values)
        .returning();

      logger.info("Created new recommendations", { count: created.length });

      return await this.listRecommendations({
        status: "pending",
      });
    } catch (error) {
      logger.error("Error creating bulk recommendations", { error, count: drafts.length });
      throw error;
    }
  }

  /**
   * Get a single recommendation by ID
   */
  async getRecommendation(id: number): Promise<BudgetRecommendationWithRelations> {
    const recommendation = await db.query.budgetRecommendations.findFirst({
      where: eq(budgetRecommendations.id, id),
      with: {
        budget: true,
        account: true,
        category: true,
      },
    });

    if (!recommendation) {
      throw new NotFoundError("Recommendation", id);
    }

    return recommendation as BudgetRecommendationWithRelations;
  }

  /**
   * List recommendations with filters
   */
  async listRecommendations(
    filters: RecommendationFilters = {}
  ): Promise<BudgetRecommendationWithRelations[]> {
    const conditions = [];

    // Status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(
          or(...filters.status.map((s) => eq(budgetRecommendations.status, s)))!
        );
      } else {
        conditions.push(eq(budgetRecommendations.status, filters.status));
      }
    }

    // Type filter
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        conditions.push(
          or(...filters.type.map((t) => eq(budgetRecommendations.type, t)))!
        );
      } else {
        conditions.push(eq(budgetRecommendations.type, filters.type));
      }
    }

    // Priority filter
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        conditions.push(
          or(...filters.priority.map((p) => eq(budgetRecommendations.priority, p)))!
        );
      } else {
        conditions.push(eq(budgetRecommendations.priority, filters.priority));
      }
    }

    // Budget filter
    if (filters.budgetId !== undefined) {
      conditions.push(eq(budgetRecommendations.budgetId, filters.budgetId));
    }

    // Account filter
    if (filters.accountId !== undefined) {
      conditions.push(eq(budgetRecommendations.accountId, filters.accountId));
    }

    // Category filter
    if (filters.categoryId !== undefined) {
      conditions.push(eq(budgetRecommendations.categoryId, filters.categoryId));
    }

    // Expiration filter
    if (!filters.includeExpired) {
      conditions.push(
        or(
          isNull(budgetRecommendations.expiresAt),
          gte(budgetRecommendations.expiresAt, new Date().toISOString())
        )!
      );
    }

    const recommendations = await db.query.budgetRecommendations.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        budget: true,
        account: true,
        category: true,
      },
      orderBy: [
        desc(budgetRecommendations.priority),
        desc(budgetRecommendations.confidence),
        desc(budgetRecommendations.createdAt),
      ],
    });

    return recommendations as BudgetRecommendationWithRelations[];
  }

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(id: number): Promise<BudgetRecommendationWithRelations> {
    const now = getCurrentTimestamp();

    const [updated] = await db
      .update(budgetRecommendations)
      .set({
        status: "dismissed",
        dismissedAt: now,
        updatedAt: now,
      })
      .where(eq(budgetRecommendations.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Recommendation", id);
    }

    return await this.getRecommendation(id);
  }

  /**
   * Restore a dismissed recommendation back to pending
   */
  async restoreRecommendation(id: number): Promise<BudgetRecommendationWithRelations> {
    const now = getCurrentTimestamp();

    // First check if recommendation exists and is dismissed
    const existing = await db.query.budgetRecommendations.findFirst({
      where: eq(budgetRecommendations.id, id),
    });

    if (!existing) {
      throw new NotFoundError("Recommendation", id);
    }

    if (existing.status !== "dismissed") {
      throw new ValidationError(
        `Cannot restore recommendation with status "${existing.status}". Only dismissed recommendations can be restored.`,
        "status"
      );
    }

    const [updated] = await db
      .update(budgetRecommendations)
      .set({
        status: "pending",
        dismissedAt: null,
        updatedAt: now,
      })
      .where(eq(budgetRecommendations.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Recommendation", id);
    }

    return await this.getRecommendation(id);
  }

  /**
   * Apply a recommendation (mark as applied)
   * Note: Actual budget creation/modification should be handled by caller
   */
  async applyRecommendation(id: number): Promise<BudgetRecommendationWithRelations> {
    const now = getCurrentTimestamp();

    const [updated] = await db
      .update(budgetRecommendations)
      .set({
        status: "applied",
        appliedAt: now,
        updatedAt: now,
      })
      .where(eq(budgetRecommendations.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("Recommendation", id);
    }

    return await this.getRecommendation(id);
  }

  /**
   * Expire old recommendations
   * Automatically called periodically to clean up old recommendations
   */
  async expireOldRecommendations(): Promise<number> {
    const now = new Date().toISOString();

    const expired = await db
      .update(budgetRecommendations)
      .set({
        status: "expired",
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(
          eq(budgetRecommendations.status, "pending"),
          lte(budgetRecommendations.expiresAt, now)
        )
      )
      .returning();

    logger.info("Expired old recommendations", { count: expired.length });

    return expired.length;
  }

  /**
   * Delete a recommendation
   */
  async deleteRecommendation(id: number): Promise<void> {
    const deleted = await db
      .delete(budgetRecommendations)
      .where(eq(budgetRecommendations.id, id))
      .returning();

    if (!deleted || deleted.length === 0) {
      throw new NotFoundError("Recommendation", id);
    }
  }

  /**
   * Get recommendation counts by status
   */
  async getRecommendationCounts(): Promise<Record<RecommendationStatus, number>> {
    const counts = await db
      .select({
        status: budgetRecommendations.status,
        count: sql<number>`count(*)`,
      })
      .from(budgetRecommendations)
      .groupBy(budgetRecommendations.status);

    const result: Record<RecommendationStatus, number> = {
      pending: 0,
      dismissed: 0,
      applied: 0,
      expired: 0,
    };

    for (const row of counts) {
      result[row.status as RecommendationStatus] = Number(row.count);
    }

    return result;
  }

  /**
   * Get pending recommendations count (for badge display)
   */
  async getPendingCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgetRecommendations)
      .where(
        and(
          eq(budgetRecommendations.status, "pending"),
          or(
            isNull(budgetRecommendations.expiresAt),
            gte(budgetRecommendations.expiresAt, new Date().toISOString())
          )!
        )
      );

    return Number(result[0]?.count || 0);
  }

  /**
   * Get high priority recommendations
   */
  async getHighPriorityRecommendations(): Promise<BudgetRecommendationWithRelations[]> {
    return await this.listRecommendations({
      status: "pending",
      priority: "high",
      includeExpired: false,
    });
  }
}
