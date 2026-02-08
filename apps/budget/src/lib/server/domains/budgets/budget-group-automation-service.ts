/**
 * Budget Group Automation Service
 *
 * Handles automated execution of budget group recommendations.
 * Provides:
 * - Decision logic for auto-applying recommendations
 * - Execution of group operations (create, assign, merge, adjust)
 * - Activity logging for audit trail
 * - Rollback functionality
 */

import {
  budgetAutomationActivity,
  budgetAutomationSettings,
  type AutomationActionType,
  type BudgetAutomationSettings,
} from "$lib/schema/budget-automation-settings";
import { budgetGroupMemberships, budgetGroups } from "$lib/schema/budgets";
import { type BudgetRecommendation } from "$lib/schema/recommendations";
import { db } from "$lib/server/db";
import { logger } from "$lib/server/shared/logging";
import { DatabaseError, NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, eq } from "drizzle-orm";
import { BudgetService } from "./services";

export interface AutomationResult {
  success: boolean;
  activityId?: number;
  error?: unknown;
  message?: string;
}

export class BudgetGroupAutomationService {
  constructor(private service: BudgetService) {}

  /**
   * Get automation settings (creates default if none exist)
   */
  async getSettings(workspaceId: number): Promise<BudgetAutomationSettings> {
    const existingSettings = await db.query.budgetAutomationSettings.findFirst({
      where: eq(budgetAutomationSettings.workspaceId, workspaceId),
    });

    if (existingSettings) {
      return existingSettings;
    }

    // Create default settings
    const [newSettings] = await db
      .insert(budgetAutomationSettings)
      .values({
        workspaceId,
        autoCreateGroups: false,
        autoAssignToGroups: false,
        autoAdjustGroupLimits: false,
        requireConfirmationThreshold: "medium",
        enableSmartGrouping: true,
        groupingStrategy: "hybrid",
        minSimilarityScore: 70,
        minGroupSize: 2,
      })
      .returning();

    return newSettings!;
  }

  /**
   * Update automation settings
   */
  async updateSettings(
    workspaceId: number,
    updates: Partial<BudgetAutomationSettings>
  ): Promise<BudgetAutomationSettings> {
    const currentSettings = await this.getSettings(workspaceId);

    const [updated] = await db
      .update(budgetAutomationSettings)
      .set({
        ...updates,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(budgetAutomationSettings.id, currentSettings.id))
      .returning();

    if (!updated) {
      throw new DatabaseError("Failed to update automation settings", "updateSettings");
    }

    return updated;
  }

  /**
   * Check if a recommendation should be auto-applied
   */
  async shouldAutoApply(
    recommendation: BudgetRecommendation,
    workspaceId: number,
    settings?: BudgetAutomationSettings
  ): Promise<boolean> {
    const automationSettings = settings ?? (await this.getSettings(workspaceId));

    // Check if this type of automation is enabled
    const typeEnabled = this.isTypeEnabled(recommendation.type, automationSettings);
    if (!typeEnabled) {
      return false;
    }

    // Check confidence threshold based on priority and settings
    const meetsThreshold = this.meetsConfidenceThreshold(
      recommendation.confidence,
      recommendation.priority,
      automationSettings.requireConfirmationThreshold
    );

    if (!meetsThreshold) {
      return false;
    }

    // Check for conflicts (e.g., group already exists with same name)
    const hasConflicts = await this.checkForConflicts(recommendation);
    if (hasConflicts) {
      return false;
    }

    return true;
  }

  /**
   * Check if automation is enabled for this recommendation type
   */
  private isTypeEnabled(
    type: BudgetRecommendation["type"],
    settings: BudgetAutomationSettings
  ): boolean {
    switch (type) {
      case "create_budget_group":
        return settings.autoCreateGroups;
      case "add_to_budget_group":
        return settings.autoAssignToGroups;
      case "adjust_group_limit":
        return settings.autoAdjustGroupLimits;
      case "merge_budget_groups":
        return settings.autoCreateGroups; // Merging is similar to creating
      default:
        return false;
    }
  }

  /**
   * Check if confidence meets threshold for this priority level
   */
  private meetsConfidenceThreshold(
    confidence: number,
    priority: BudgetRecommendation["priority"],
    threshold: "high" | "medium" | "low"
  ): boolean {
    // Required confidence based on threshold setting and priority
    const requirements = {
      high: { high: 85, medium: 90, low: 95 }, // High priority needs less confidence
      medium: { high: 75, medium: 80, low: 85 }, // Medium priority
      low: { high: 65, medium: 70, low: 75 }, // Low priority needs more confidence
    };

    const required = requirements[priority][threshold];
    return confidence >= required;
  }

  /**
   * Check for conflicts that would prevent auto-application
   */
  private async checkForConflicts(recommendation: BudgetRecommendation): Promise<boolean> {
    if (recommendation.type === "create_budget_group") {
      // Check if group with same name already exists
      const suggestedName = recommendation.metadata.suggestedGroupName;
      if (typeof suggestedName === "string") {
        const existing = await db.query.budgetGroups.findFirst({
          where: eq(budgetGroups.name, suggestedName),
        });
        if (existing) {
          logger.info("Group already exists with suggested name", { name: suggestedName });
          return true;
        }
      }
    }

    // Add more conflict checks as needed
    return false;
  }

  /**
   * Auto-apply a group recommendation
   */
  async autoApplyGroupRecommendation(
    recommendation: BudgetRecommendation
  ): Promise<AutomationResult> {
    const activityId = await this.logActivityStart(recommendation);

    try {
      let result: AutomationResult;

      switch (recommendation.type) {
        case "create_budget_group":
          result = await this.autoCreateGroup(recommendation, activityId);
          break;
        case "add_to_budget_group":
          result = await this.autoAssignToGroup(recommendation, activityId);
          break;
        case "adjust_group_limit":
          result = await this.autoAdjustLimit(recommendation, activityId);
          break;
        case "merge_budget_groups":
          result = await this.autoMergeGroups(recommendation, activityId);
          break;
        default:
          result = {
            success: false,
            activityId,
            error: `Unsupported recommendation type: ${recommendation.type}`,
          };
      }

      if (result.success) {
        await this.logActivitySuccess(activityId, result.message);
      } else {
        await this.logActivityFailure(activityId, result.error);
      }

      return result;
    } catch (error) {
      await this.logActivityFailure(activityId, error);
      return {
        success: false,
        activityId,
        error,
      };
    }
  }

  /**
   * Auto-create a budget group
   */
  private async autoCreateGroup(
    recommendation: BudgetRecommendation,
    activityId: number
  ): Promise<AutomationResult> {
    const metadata = recommendation.metadata;
    const groupName = metadata.suggestedGroupName;
    const budgetIds = metadata.suggestedGroupMembers;

    if (typeof groupName !== "string" || !Array.isArray(budgetIds) || budgetIds.length === 0) {
      return {
        success: false,
        activityId,
        error: "Missing required metadata for group creation",
      };
    }

    // Create the group
    const group = await this.service.createBudgetGroup({
      name: groupName,
      description: `Auto-created group: ${recommendation.description}`,
      spendingLimit:
        typeof metadata.groupSpendingLimit === "number" ? metadata.groupSpendingLimit : null,
      parentId: typeof metadata.parentGroupId === "number" ? metadata.parentGroupId : null,
    });

    // Assign budgets to the group
    for (const budgetId of budgetIds) {
      await db
        .insert(budgetGroupMemberships)
        .values({ budgetId, groupId: group.id })
        .onConflictDoNothing();
    }

    // Update activity with group ID
    await db
      .update(budgetAutomationActivity)
      .set({ groupId: group.id })
      .where(eq(budgetAutomationActivity.id, activityId));

    return {
      success: true,
      activityId,
      message: `Created group "${groupName}" with ${budgetIds.length} budgets`,
    };
  }

  /**
   * Auto-assign budgets to an existing group
   */
  private async autoAssignToGroup(
    recommendation: BudgetRecommendation,
    activityId: number
  ): Promise<AutomationResult> {
    const groupId = recommendation.metadata.parentGroupId;
    const budgetIds = recommendation.metadata.suggestedGroupMembers;

    if (typeof groupId !== "number" || !Array.isArray(budgetIds) || budgetIds.length === 0) {
      return { success: false, activityId, error: "Missing required metadata for group assignment" };
    }

    const group = await db.query.budgetGroups.findFirst({
      where: eq(budgetGroups.id, groupId),
    });
    if (!group) {
      return { success: false, activityId, error: `Group ${groupId} not found` };
    }

    for (const budgetId of budgetIds) {
      await db
        .insert(budgetGroupMemberships)
        .values({ budgetId, groupId })
        .onConflictDoNothing();
    }

    await db
      .update(budgetAutomationActivity)
      .set({ groupId })
      .where(eq(budgetAutomationActivity.id, activityId));

    return {
      success: true,
      activityId,
      message: `Assigned ${budgetIds.length} budget(s) to group "${group.name}"`,
    };
  }

  /**
   * Auto-adjust group spending limit
   */
  private async autoAdjustLimit(
    recommendation: BudgetRecommendation,
    activityId: number
  ): Promise<AutomationResult> {
    const groupId = recommendation.metadata.parentGroupId;
    const newLimit = recommendation.metadata.groupSpendingLimit;

    if (typeof groupId !== "number" || typeof newLimit !== "number") {
      return { success: false, activityId, error: "Missing required metadata for limit adjustment" };
    }

    const group = await db.query.budgetGroups.findFirst({
      where: eq(budgetGroups.id, groupId),
    });
    if (!group) {
      return { success: false, activityId, error: `Group ${groupId} not found` };
    }

    const oldLimit = group.spendingLimit;

    await db
      .update(budgetGroups)
      .set({ spendingLimit: newLimit, updatedAt: getCurrentTimestamp() })
      .where(eq(budgetGroups.id, groupId));

    await db
      .update(budgetAutomationActivity)
      .set({
        groupId,
        metadata: { previousSpendingLimit: oldLimit, newSpendingLimit: newLimit },
      })
      .where(eq(budgetAutomationActivity.id, activityId));

    return {
      success: true,
      activityId,
      message: `Adjusted "${group.name}" limit from ${oldLimit ?? "none"} to ${newLimit}`,
    };
  }

  /**
   * Auto-merge budget groups
   */
  private async autoMergeGroups(
    recommendation: BudgetRecommendation,
    activityId: number
  ): Promise<AutomationResult> {
    const targetGroupId = recommendation.metadata.parentGroupId;
    const sourceBudgetIds = recommendation.metadata.suggestedGroupMembers;

    if (typeof targetGroupId !== "number" || !Array.isArray(sourceBudgetIds)) {
      return { success: false, activityId, error: "Missing required metadata for group merge" };
    }

    const targetGroup = await db.query.budgetGroups.findFirst({
      where: eq(budgetGroups.id, targetGroupId),
    });
    if (!targetGroup) {
      return { success: false, activityId, error: `Target group ${targetGroupId} not found` };
    }

    // Find the source group (the group these budgets currently belong to)
    const sourceMembership = await db.query.budgetGroupMemberships.findFirst({
      where: eq(budgetGroupMemberships.budgetId, sourceBudgetIds[0]!),
      with: { group: true },
    });

    const sourceGroup = sourceMembership?.group;
    if (!sourceGroup || sourceGroup.id === targetGroupId) {
      return { success: false, activityId, error: "Could not identify source group for merge" };
    }

    // Move memberships to target group
    for (const budgetId of sourceBudgetIds) {
      await db
        .delete(budgetGroupMemberships)
        .where(
          and(
            eq(budgetGroupMemberships.budgetId, budgetId),
            eq(budgetGroupMemberships.groupId, sourceGroup.id)
          )
        );
      await db
        .insert(budgetGroupMemberships)
        .values({ budgetId, groupId: targetGroupId })
        .onConflictDoNothing();
    }

    // Store source group info for rollback before deleting
    await db
      .update(budgetAutomationActivity)
      .set({
        groupId: targetGroupId,
        metadata: {
          mergedFromGroupId: sourceGroup.id,
          mergedFromGroupName: sourceGroup.name,
          mergedFromGroupDescription: sourceGroup.description,
          mergedFromGroupSpendingLimit: sourceGroup.spendingLimit,
          mergedBudgetIds: sourceBudgetIds,
        },
      })
      .where(eq(budgetAutomationActivity.id, activityId));

    // Delete the now-empty source group
    await this.service.deleteBudgetGroup(sourceGroup.id);

    return {
      success: true,
      activityId,
      message: `Merged "${sourceGroup.name}" into "${targetGroup.name}" (${sourceBudgetIds.length} budgets moved)`,
    };
  }

  /**
   * Log the start of an automation activity
   */
  private async logActivityStart(recommendation: BudgetRecommendation): Promise<number> {
    const actionType = this.mapRecommendationTypeToActionType(recommendation.type);
    const budgetIds =
      recommendation.metadata.budgetIdsToGroup ?? recommendation.metadata.suggestedGroupMembers;

    const [activity] = await db
      .insert(budgetAutomationActivity)
      .values({
        actionType,
        recommendationId: recommendation.id,
        budgetIds: Array.isArray(budgetIds) ? budgetIds : undefined,
        status: "pending",
        metadata: {
          recommendationType: recommendation.type,
          confidence: recommendation.confidence,
          priority: recommendation.priority,
        },
      })
      .returning();

    if (!activity) {
      throw new DatabaseError("Failed to log automation activity", "logActivityStart");
    }

    return activity.id;
  }

  /**
   * Log activity success
   */
  private async logActivitySuccess(activityId: number, message?: string): Promise<void> {
    await db
      .update(budgetAutomationActivity)
      .set({
        status: "success",
        ...(message && { metadata: { message } }),
      })
      .where(eq(budgetAutomationActivity.id, activityId));
  }

  /**
   * Log activity failure
   */
  private async logActivityFailure(activityId: number, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(budgetAutomationActivity)
      .set({
        status: "failed",
        errorMessage,
      })
      .where(eq(budgetAutomationActivity.id, activityId));
  }

  /**
   * Map recommendation type to automation action type
   */
  private mapRecommendationTypeToActionType(
    type: BudgetRecommendation["type"]
  ): AutomationActionType {
    switch (type) {
      case "create_budget_group":
        return "create_group";
      case "add_to_budget_group":
        return "assign_to_group";
      case "adjust_group_limit":
        return "adjust_limit";
      case "merge_budget_groups":
        return "merge_groups";
      default:
        return "create_group"; // Default fallback
    }
  }

  /**
   * Get automation activity log
   */
  async getActivity(params?: {
    limit?: number;
    offset?: number;
    status?: "pending" | "success" | "failed" | "rolled_back";
  }): Promise<(typeof budgetAutomationActivity.$inferSelect)[]> {
    const { limit = 50, offset = 0, status } = params ?? {};

    let query = db
      .select()
      .from(budgetAutomationActivity)
      .orderBy(budgetAutomationActivity.createdAt)
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(eq(budgetAutomationActivity.status, status)) as any;
    }

    return await query;
  }

  /**
   * Get a single activity by ID
   */
  async getActivityById(id: number): Promise<typeof budgetAutomationActivity.$inferSelect> {
    const activity = await db.query.budgetAutomationActivity.findFirst({
      where: eq(budgetAutomationActivity.id, id),
    });

    if (!activity) {
      throw new NotFoundError("Automation activity", id);
    }

    return activity;
  }

  /**
   * Rollback an automated action
   */
  async rollbackAutomation(activityId: number): Promise<void> {
    const activity = await this.getActivityById(activityId);

    if (activity.status !== "success") {
      throw new Error("Can only rollback successful automations");
    }

    if (activity.rolledBackAt) {
      throw new Error("This automation has already been rolled back");
    }

    logger.info("Rolling back automation", { activityId, actionType: activity.actionType });

    try {
      switch (activity.actionType) {
        case "create_group":
          await this.rollbackGroupCreation(activity);
          break;
        case "assign_to_group":
          await this.rollbackGroupAssignment(activity);
          break;
        case "adjust_limit":
          await this.rollbackLimitAdjustment(activity);
          break;
        case "merge_groups":
          await this.rollbackGroupMerge(activity);
          break;
      }

      // Mark as rolled back
      await db
        .update(budgetAutomationActivity)
        .set({
          status: "rolled_back",
          rolledBackAt: getCurrentTimestamp(),
        })
        .where(eq(budgetAutomationActivity.id, activityId));

      logger.info("Automation rolled back successfully", { activityId });
    } catch (error) {
      logger.error("Failed to rollback automation", {
        activityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Rollback group creation
   */
  private async rollbackGroupCreation(
    activity: typeof budgetAutomationActivity.$inferSelect
  ): Promise<void> {
    if (!activity.groupId) {
      throw new Error("No group ID found in activity");
    }

    // Delete the group (memberships will cascade delete)
    await this.service.deleteBudgetGroup(activity.groupId);
  }

  /**
   * Rollback group assignment
   */
  private async rollbackGroupAssignment(
    activity: typeof budgetAutomationActivity.$inferSelect
  ): Promise<void> {
    const budgetIds = activity.budgetIds;
    const groupId = activity.groupId;

    if (!groupId || !Array.isArray(budgetIds) || budgetIds.length === 0) {
      throw new Error("Missing data to rollback group assignment");
    }

    for (const budgetId of budgetIds) {
      await db
        .delete(budgetGroupMemberships)
        .where(
          and(
            eq(budgetGroupMemberships.budgetId, budgetId),
            eq(budgetGroupMemberships.groupId, groupId)
          )
        );
    }
  }

  /**
   * Rollback limit adjustment
   */
  private async rollbackLimitAdjustment(
    activity: typeof budgetAutomationActivity.$inferSelect
  ): Promise<void> {
    if (!activity.groupId) {
      throw new Error("No group ID found in activity");
    }

    const metadata = activity.metadata as Record<string, unknown>;
    const previousLimit = metadata?.previousSpendingLimit as number | null;

    await db
      .update(budgetGroups)
      .set({ spendingLimit: previousLimit ?? null, updatedAt: getCurrentTimestamp() })
      .where(eq(budgetGroups.id, activity.groupId));
  }

  /**
   * Rollback group merge
   */
  private async rollbackGroupMerge(
    activity: typeof budgetAutomationActivity.$inferSelect
  ): Promise<void> {
    const metadata = activity.metadata as Record<string, unknown>;
    const mergedFromName = metadata?.mergedFromGroupName as string;
    const mergedFromDesc = metadata?.mergedFromGroupDescription as string | null;
    const mergedFromLimit = metadata?.mergedFromGroupSpendingLimit as number | null;
    const mergedBudgetIds = metadata?.mergedBudgetIds as number[];
    const targetGroupId = activity.groupId;

    if (!mergedFromName || !Array.isArray(mergedBudgetIds) || !targetGroupId) {
      throw new Error("Missing data to rollback group merge");
    }

    // Recreate the source group
    const restoredGroup = await this.service.createBudgetGroup({
      name: mergedFromName,
      description: mergedFromDesc,
      spendingLimit: mergedFromLimit,
    });

    // Move budgets back from target to restored source
    for (const budgetId of mergedBudgetIds) {
      await db
        .delete(budgetGroupMemberships)
        .where(
          and(
            eq(budgetGroupMemberships.budgetId, budgetId),
            eq(budgetGroupMemberships.groupId, targetGroupId)
          )
        );
      await db
        .insert(budgetGroupMemberships)
        .values({ budgetId, groupId: restoredGroup.id })
        .onConflictDoNothing();
    }
  }

  /**
   * Auto-assign a newly created budget to matching groups
   */
  async autoAssignBudgetToGroups(budgetId: number, workspaceId: number): Promise<void> {
    const settings = await this.getSettings(workspaceId);

    if (!settings.autoAssignToGroups || !settings.enableSmartGrouping) {
      return;
    }

    logger.info("Checking for auto-assignment of budget to groups", { budgetId });

    // TODO: Implement group matching logic
    // This would:
    // 1. Get the budget details
    // 2. Find matching groups based on similarity
    // 3. Generate recommendation or auto-assign if confidence is high enough
  }
}
