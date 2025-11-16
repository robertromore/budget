/**
 * Recommendation Service
 *
 * Manages budget recommendations: create, read, update, delete, apply, dismiss
 */

import {
  budgetRecommendations,
  type BudgetRecommendationWithRelations,
  type RecommendationPriority,
  type RecommendationStatus,
  type RecommendationType,
} from "$lib/schema/recommendations";
import {db} from "$lib/server/db";
import {logger} from "$lib/server/shared/logging";
import {NotFoundError, ValidationError} from "$lib/server/shared/types/errors";
import {getCurrentTimestamp} from "$lib/utils/dates";
import {and, desc, eq, gte, isNull, lte, or, sql} from "drizzle-orm";
import type {BudgetRecommendationDraft} from "./budget-analysis-service";

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
      logger.error("Error creating recommendation", {error, data});
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

      // Step 1: Get existing recommendations (pending, dismissed, or applied in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

      const existingRecommendations = await db
        .select()
        .from(budgetRecommendations)
        .where(
          or(
            // Pending recommendations (regardless of age)
            eq(budgetRecommendations.status, "pending"),
            // Dismissed/applied in last 30 days
            and(
              or(
                eq(budgetRecommendations.status, "dismissed"),
                eq(budgetRecommendations.status, "applied")
              ),
              gte(budgetRecommendations.updatedAt, thirtyDaysAgoStr)
            )
          )!
        );

      logger.info("Found existing recommendations for duplicate check", {
        total: existingRecommendations.length,
        pending: existingRecommendations.filter((r) => r.status === "pending").length,
        dismissed: existingRecommendations.filter((r) => r.status === "dismissed").length,
        applied: existingRecommendations.filter((r) => r.status === "applied").length,
        existingIds: existingRecommendations.map((r) => r.id),
      });

      // Step 2: Filter out drafts that match existing recommendations
      // Match by: type, categoryId, accountId, budgetId, and metadata details
      const filteredDrafts = drafts.filter((draft) => {
        const draftMetadata = draft.metadata as Record<string, any> | null;
        const draftSuggestedType = draftMetadata?.["suggestedType"];
        const draftPayeeIds = draftMetadata?.["payeeIds"] as number[] | undefined;

        const isDuplicate = existingRecommendations.some((existing) => {
          const existingMetadata = existing.metadata as Record<string, any> | null;
          const existingSuggestedType = existingMetadata?.["suggestedType"];
          const existingPayeeIds = existingMetadata?.["payeeIds"] as number[] | undefined;

          // Must match type
          if (existing.type !== draft.type) return false;

          // Must match budget (both null/undefined or both same ID)
          const existingBudgetId = existing.budgetId ?? null;
          const draftBudgetId = draft.budgetId ?? null;
          if (existingBudgetId !== draftBudgetId) return false;

          // Must match category (both null/undefined or both same ID)
          const existingCategoryId = existing.categoryId ?? null;
          const draftCategoryId = draft.categoryId ?? null;
          if (existingCategoryId !== draftCategoryId) return false;

          // Must match account (both null/undefined or both same ID)
          const existingAccountId = existing.accountId ?? null;
          const draftAccountId = draft.accountId ?? null;
          if (existingAccountId !== draftAccountId) return false;

          // If both have suggestedType, they must match
          if (
            existingSuggestedType &&
            draftSuggestedType &&
            existingSuggestedType !== draftSuggestedType
          ) {
            return false;
          }

          // For scheduled expenses, also check payee
          if (draftSuggestedType === "scheduled-expense") {
            if (existingPayeeIds?.[0] !== draftPayeeIds?.[0]) return false;
          }

          // For goal-based budgets, check goal details
          if (draftSuggestedType === "goal-based") {
            const existingGoal = existingMetadata?.["goalMetadata"] as
              | Record<string, any>
              | undefined;
            const draftGoal = draftMetadata?.["goalMetadata"] as Record<string, any> | undefined;

            if (existingGoal?.["targetAmount"] !== draftGoal?.["targetAmount"]) return false;
          }

          return true;
        });

        return !isDuplicate;
      });

      if (filteredDrafts.length < drafts.length) {
        logger.info("Filtered out duplicate recommendations", {
          total: drafts.length,
          filtered: drafts.length - filteredDrafts.length,
          remaining: filteredDrafts.length,
        });
      }

      // Step 3: Delete old pending recommendations that DON'T match any incoming drafts
      // This provides aggressive cleanup - if the analysis doesn't generate a recommendation anymore, delete it
      const oldPendingRecommendations = existingRecommendations.filter(
        (r) => r.status === "pending" && new Date(r.createdAt) < new Date(Date.now() - 5000)
      );

      // Find which old pending recommendations should be deleted (don't match any draft)
      const idsToDelete = oldPendingRecommendations
        .filter((existing) => {
          // Check if this recommendation matches ANY of the original drafts
          const matchesDraft = drafts.some((draft) => {
            if (existing.type !== draft.type) return false;

            // Normalize null/undefined for comparison
            if ((existing.budgetId ?? null) !== (draft.budgetId ?? null)) return false;
            if ((existing.categoryId ?? null) !== (draft.categoryId ?? null)) return false;
            if ((existing.accountId ?? null) !== (draft.accountId ?? null)) return false;

            const existingMetadata = existing.metadata as Record<string, any> | null;
            const draftMetadata = draft.metadata as Record<string, any> | null;
            const existingSuggestedType = existingMetadata?.["suggestedType"];
            const draftSuggestedType = draftMetadata?.["suggestedType"];

            if (
              existingSuggestedType &&
              draftSuggestedType &&
              existingSuggestedType !== draftSuggestedType
            ) {
              return false;
            }

            if (draftSuggestedType === "scheduled-expense") {
              const existingPayeeIds = existingMetadata?.["payeeIds"] as number[] | undefined;
              const draftPayeeIds = draftMetadata?.["payeeIds"] as number[] | undefined;
              if (existingPayeeIds?.[0] !== draftPayeeIds?.[0]) return false;
            }

            return true;
          });

          return !matchesDraft; // Delete if it doesn't match any draft
        })
        .map((r) => r.id);

      if (idsToDelete.length > 0) {
        await db
          .delete(budgetRecommendations)
          .where(
            and(
              eq(budgetRecommendations.status, "pending"),
              sql`${budgetRecommendations.id} IN (${idsToDelete.join(",")})`
            )
          );

        logger.info("Deleted stale pending recommendations that don't match current analysis", {
          count: idsToDelete.length,
          deletedIds: idsToDelete,
        });
      }

      // Step 4: If NO new recommendations to create after cleanup, return empty array
      // This ensures that when all transactions are deleted, all pending recommendations are cleared
      if (filteredDrafts.length === 0) {
        logger.info("No new recommendations to create after filtering and cleanup");
        return [];
      }

      // Step 5: Create new recommendations (only ones that weren't duplicates)

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

      const created = await db.insert(budgetRecommendations).values(values).returning();

      logger.info("Created new recommendations", {
        count: created.length,
        newIds: created.map((r) => r.id),
        titles: created.map((r) => r.title),
      });

      return await this.listRecommendations({
        status: "pending",
      });
    } catch (error) {
      logger.error("Error creating bulk recommendations", {error, count: drafts.length});
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
        conditions.push(or(...filters.status.map((s) => eq(budgetRecommendations.status, s)))!);
      } else {
        conditions.push(eq(budgetRecommendations.status, filters.status));
      }
    }

    // Type filter
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        conditions.push(or(...filters.type.map((t) => eq(budgetRecommendations.type, t)))!);
      } else {
        conditions.push(eq(budgetRecommendations.type, filters.type));
      }
    }

    // Priority filter
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        conditions.push(or(...filters.priority.map((p) => eq(budgetRecommendations.priority, p)))!);
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
        and(eq(budgetRecommendations.status, "pending"), lte(budgetRecommendations.expiresAt, now))
      )
      .returning();

    logger.info("Expired old recommendations", {count: expired.length});

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
      .select({count: sql<number>`count(*)`})
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

  /**
   * Reset recommendation status to 'pending' when the budget created from it is deleted
   * This allows the recommendation to be reapplied
   * IMPORTANT: Must be called BEFORE the budget is deleted to avoid cascade delete
   */
  async resetRecommendationForBudget(budgetId: number): Promise<void> {
    const now = getCurrentTimestamp();

    // Find any applied recommendations that reference this budget
    // We need to do this BEFORE the budget is deleted
    const recommendations = await db
      .select()
      .from(budgetRecommendations)
      .where(
        and(
          eq(budgetRecommendations.budgetId, budgetId),
          eq(budgetRecommendations.status, "applied")
        )
      );

    // Reset each recommendation to pending status and clear the budget reference
    // This prevents the cascade delete from removing the recommendation
    for (const rec of recommendations) {
      await db
        .update(budgetRecommendations)
        .set({
          status: "pending",
          appliedAt: null,
          budgetId: null, // Clear the budget reference to prevent cascade delete
          updatedAt: now,
        })
        .where(eq(budgetRecommendations.id, rec.id));
    }
  }
}
