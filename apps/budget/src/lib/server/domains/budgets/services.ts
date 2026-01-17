import {
  budgetEnforcementLevels,
  budgets,
  budgetScopes,
  budgetStatuses,
  budgetTransactions,
  budgetTypes,
  type Budget,
  type BudgetEnforcementLevel,
  type BudgetGroup,
  type BudgetMetadata,
  type BudgetPeriodInstance,
  type BudgetPeriodTemplate,
  type BudgetScope,
  type BudgetTransaction,
  type BudgetType,
  type NewBudgetGroup,
  type NewBudgetTransaction,
} from "$lib/schema/budgets";
import { payees } from "$lib/schema/payees";
import { scheduleDates } from "$lib/schema/schedule-dates";
import { schedules } from "$lib/schema/schedules";
import type { Transaction } from "$lib/schema/transactions";
import { transactions } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { generateUniqueSlugForDB } from "$lib/utils/slug-utils";
import slugify from "@sindresorhus/slugify";
import { logger } from "$lib/server/shared/logging";
import { DatabaseError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { parseISOString, timezone as defaultTimezone, toISOString } from "$lib/utils/dates";
import { CalendarDate, type DateValue, today } from "@internationalized/date";
import { and, eq, inArray, sql } from "drizzle-orm";
import { BudgetAnalysisService, type AnalysisParams } from "./budget-analysis-service";
import type { DeficitRecoveryPlan } from "./deficit-recovery";
import { EnvelopeService, type EnvelopeAllocationRequest } from "./envelope-service";
import { PeriodManager } from "./period-manager";
import { RecommendationService, type RecommendationFilters } from "./recommendation-service";
import {
  BudgetRepository,
  type AccountAssociation,
  type BudgetWithRelations,
  type DbClient,
} from "./repository";

/* ------------------------------------------------------------------ */
/* Budget Service                                                     */
/* ------------------------------------------------------------------ */

export interface CreateBudgetRequest {
  name: string;
  description?: string | null;
  type: BudgetType;
  scope: BudgetScope;
  status?: Budget["status"];
  enforcementLevel?: BudgetEnforcementLevel;
  metadata?: BudgetMetadata;
  accountIds?: number[];
  /** Per-account association types (for goal-based budgets) */
  accountAssociations?: AccountAssociation[];
  categoryIds?: number[];
  groupIds?: number[];
}

export interface UpdateBudgetRequest {
  name?: string;
  description?: string | null;
  status?: Budget["status"];
  enforcementLevel?: BudgetEnforcementLevel;
  metadata?: BudgetMetadata;
  accountIds?: number[];
  categoryIds?: number[];
  groupIds?: number[];
}

/**
 * Grouped budgets related to an account, organized by purpose.
 */
export interface GroupedAccountBudgets {
  /** account-monthly budgets with "spending" association */
  spendingLimits: BudgetWithRelations[];
  /** goal-based budgets with "savings" or "source" association */
  savingsGoals: BudgetWithRelations[];
  /** scheduled-expense budgets (via schedule.accountId) */
  recurringExpenses: BudgetWithRelations[];
  /** Total count of all related budgets */
  totalCount: number;
}

/**
 * Budget service containing business logic
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class BudgetService {
  constructor(
    private repository: BudgetRepository,
    private envelopeService: EnvelopeService,
    private goalTrackingService: GoalTrackingService,
    private forecastService: BudgetForecastService,
    private intelligenceService: BudgetIntelligenceService,
    private analysisService: BudgetAnalysisService,
    private recommendationService: RecommendationService
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async createBudget(
    input: CreateBudgetRequest,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    const name = InputSanitizer.sanitizeText(input.name, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldName: "Budget name",
    });

    const description = input.description
      ? InputSanitizer.sanitizeDescription(input.description, 500)
      : null;

    this.validateEnumValue("Budget type", input.type, budgetTypes);
    this.validateEnumValue("Budget scope", input.scope, budgetScopes);

    const enforcementLevel = input.enforcementLevel ?? "warning";
    this.validateEnumValue("Enforcement level", enforcementLevel, budgetEnforcementLevels);

    const status = input.status ?? "active";
    this.validateEnumValue("Budget status", status, budgetStatuses);

    const metadata = input.metadata ?? {};

    // Generate unique slug
    let baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.repository.slugExists(slug, workspaceId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const createInput: {
      budget: {
        name: string;
        slug: string;
        description: string | null;
        type: typeof input.type;
        scope: typeof input.scope;
        status: typeof status;
        enforcementLevel: typeof enforcementLevel;
        metadata: typeof metadata;
      };
      accountIds?: number[];
      accountAssociations?: AccountAssociation[];
      categoryIds?: number[];
      groupIds?: number[];
    } = {
      budget: {
        name,
        slug,
        description,
        type: input.type,
        scope: input.scope,
        status,
        enforcementLevel,
        metadata,
      },
    };

    if (input.accountIds !== undefined) {
      createInput.accountIds = input.accountIds;
    }
    if (input.accountAssociations !== undefined) {
      createInput.accountAssociations = input.accountAssociations;
    }
    if (input.categoryIds !== undefined) {
      createInput.categoryIds = await this.getValidCategoryIds(input.categoryIds);
    }
    if (input.groupIds !== undefined) {
      createInput.groupIds = input.groupIds;
    }

    return await this.repository.createBudget(createInput, workspaceId);
  }

  async updateBudget(
    id: number,
    input: UpdateBudgetRequest,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updates["name"] = InputSanitizer.sanitizeText(input.name, {
        required: true,
        minLength: 2,
        maxLength: 80,
        fieldName: "Budget name",
      });
    }

    if (input.description !== undefined) {
      updates["description"] = input.description
        ? InputSanitizer.sanitizeDescription(input.description, 500)
        : null;
    }

    if (input.status !== undefined) {
      this.validateEnumValue("Budget status", input.status, budgetStatuses);
      updates["status"] = input.status;
    }

    if (input.enforcementLevel !== undefined) {
      this.validateEnumValue("Enforcement level", input.enforcementLevel, budgetEnforcementLevels);
      updates["enforcementLevel"] = input.enforcementLevel;
    }

    if (input.metadata !== undefined) {
      updates["metadata"] = input.metadata;
    }

    if (
      Object.keys(updates).length === 0 &&
      input.accountIds === undefined &&
      input.categoryIds === undefined &&
      input.groupIds === undefined
    ) {
      throw new ValidationError("No updates provided", "budget");
    }

    const relations: {
      accountIds?: number[];
      categoryIds?: number[];
      groupIds?: number[];
    } = {};

    if (input.accountIds !== undefined) {
      relations.accountIds = input.accountIds;
    }
    if (input.categoryIds !== undefined) {
      const validCategoryIds = await this.getValidCategoryIds(input.categoryIds);
      relations.categoryIds = validCategoryIds;
    }
    if (input.groupIds !== undefined) {
      relations.groupIds = input.groupIds;
    }

    return await this.repository.updateBudget(id, updates, workspaceId, relations);
  }

  async listBudgets(
    workspaceId: number,
    status?: Budget["status"]
  ): Promise<BudgetWithRelations[]> {
    if (status) {
      this.validateEnumValue("Budget status", status, budgetStatuses);
    }
    return await this.repository.listBudgets(workspaceId, status ? { status } : {});
  }

  async getBudget(id: number, workspaceId: number): Promise<BudgetWithRelations> {
    const budget = await this.repository.findById(id, workspaceId);
    if (!budget) {
      throw new NotFoundError("Budget", id);
    }
    return budget;
  }

  async getBudgetBySlug(slug: string, workspaceId: number): Promise<BudgetWithRelations> {
    if (!slug?.trim()) {
      throw new ValidationError("Invalid budget slug");
    }

    const budget = await this.repository.findBySlug(slug, workspaceId);
    if (!budget) {
      throw new NotFoundError("Budget", slug);
    }

    return budget;
  }

  /**
   * Get all budgets related to an account, grouped by purpose.
   *
   * Groups budgets into:
   * - spendingLimits: account-monthly budgets with "spending" association
   * - savingsGoals: goal-based budgets with "savings" or "source" association
   * - recurringExpenses: scheduled-expense budgets (via linked schedule's account)
   */
  async getRelatedBudgetsForAccount(
    accountId: number,
    workspaceId: number
  ): Promise<GroupedAccountBudgets> {
    const { direct, viaSchedule } = await this.repository.findAllRelatedBudgets(
      accountId,
      workspaceId
    );

    const spendingLimits: BudgetWithRelations[] = [];
    const savingsGoals: BudgetWithRelations[] = [];
    const recurringExpenses: BudgetWithRelations[] = [];

    // Process direct associations based on budget type and association type
    for (const budget of direct) {
      if (budget.type === "account-monthly" && budget.associationType === "spending") {
        spendingLimits.push(budget);
      } else if (
        budget.type === "goal-based" &&
        (budget.associationType === "savings" || budget.associationType === "source")
      ) {
        savingsGoals.push(budget);
      } else if (budget.type === "scheduled-expense" && budget.associationType === "primary") {
        recurringExpenses.push(budget);
      } else {
        // Default fallback: categorize by type
        if (budget.type === "account-monthly") {
          spendingLimits.push(budget);
        } else if (budget.type === "goal-based") {
          savingsGoals.push(budget);
        } else if (budget.type === "scheduled-expense") {
          recurringExpenses.push(budget);
        }
      }
    }

    // Add budgets linked via schedules to recurring expenses (if not already present)
    const existingIds = new Set([
      ...spendingLimits.map((b) => b.id),
      ...savingsGoals.map((b) => b.id),
      ...recurringExpenses.map((b) => b.id),
    ]);

    for (const budget of viaSchedule) {
      if (!existingIds.has(budget.id)) {
        recurringExpenses.push(budget);
      }
    }

    return {
      spendingLimits,
      savingsGoals,
      recurringExpenses,
      totalCount: spendingLimits.length + savingsGoals.length + recurringExpenses.length,
    };
  }

  async deleteBudget(
    id: number,
    workspaceId: number,
    options?: { deleteLinkedSchedule?: boolean }
  ): Promise<void> {
    // Get the budget to check for linked schedule before deleting
    const budget = await this.getBudget(id, workspaceId);

    // Before deleting, check if this budget was created from a recommendation
    // If so, reset the recommendation status to 'pending' so it can be reapplied
    await this.recommendationService.resetRecommendationForBudget(id);

    // Delete the budget first
    await this.repository.deleteBudget(id, workspaceId);

    // If requested, delete the linked schedule
    if (options?.deleteLinkedSchedule) {
      const linkedScheduleId = this.getLinkedScheduleId(budget);
      if (linkedScheduleId) {
        try {
          await this.deleteSchedule(linkedScheduleId, workspaceId);
        } catch (error) {
          // Log but don't throw - schedule deletion is secondary
          logger.warn("Failed to delete linked schedule", {
            budgetId: id,
            scheduleId: linkedScheduleId,
            error,
          });
        }
      }
    }
  }

  /**
   * Extract the linked schedule ID from a budget's metadata
   */
  private getLinkedScheduleId(budget: BudgetWithRelations): number | null {
    const metadata = budget.metadata as BudgetMetadata | null;
    if (!metadata) return null;

    // Check scheduled expense metadata
    if (metadata.scheduledExpense?.linkedScheduleId) {
      return metadata.scheduledExpense.linkedScheduleId;
    }

    // Check goal metadata
    if (metadata.goal?.linkedScheduleId) {
      return metadata.goal.linkedScheduleId;
    }

    return null;
  }

  /**
   * Delete a schedule by ID
   */
  private async deleteSchedule(scheduleId: number, workspaceId: number): Promise<void> {
    // Delete schedule using raw DB operations since we don't have schedule service injected
    const schedule = await db.query.schedules.findFirst({
      where: and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId)),
    });

    if (!schedule) {
      return; // Schedule not found, nothing to delete
    }

    // Clear scheduleId from transactions
    await db
      .update(transactions)
      .set({ scheduleId: null })
      .where(eq(transactions.scheduleId, scheduleId));

    // Delete schedule dates
    const dateIdToDelete = schedule.dateId;
    if (dateIdToDelete) {
      await db
        .update(schedules)
        .set({ dateId: null })
        .where(and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId)));
      await db.delete(scheduleDates).where(eq(scheduleDates.id, dateIdToDelete));
    }
    await db.delete(scheduleDates).where(eq(scheduleDates.scheduleId, scheduleId));

    // Delete the schedule
    await db
      .delete(schedules)
      .where(and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId)));
  }

  async duplicateBudget(
    id: number,
    workspaceId: number,
    newName?: string
  ): Promise<BudgetWithRelations> {
    const originalBudget = await this.getBudget(id, workspaceId);

    const duplicatedName = newName || `${originalBudget.name} (Copy)`;

    // Generate unique slug
    let baseSlug = this.generateSlug(duplicatedName);
    let slug = baseSlug;
    let counter = 1;

    while (await this.repository.slugExists(slug, workspaceId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const createInput: {
      budget: {
        name: string;
        slug: string;
        description: string | null;
        type: typeof originalBudget.type;
        scope: typeof originalBudget.scope;
        status: typeof originalBudget.status;
        enforcementLevel: typeof originalBudget.enforcementLevel;
        metadata: BudgetMetadata;
      };
      accountIds?: number[];
      categoryIds?: number[];
      groupIds?: number[];
    } = {
      budget: {
        name: duplicatedName,
        slug,
        description: originalBudget.description,
        type: originalBudget.type,
        scope: originalBudget.scope,
        status: originalBudget.status,
        enforcementLevel: originalBudget.enforcementLevel,
        metadata: originalBudget.metadata as BudgetMetadata,
      },
    };

    const accountIds = originalBudget.accounts?.map((a) => a.id);
    const categoryIds = originalBudget.categories
      ?.filter((bc) => bc.category !== null)
      .map((bc) => bc.categoryId);
    const groupIds = originalBudget.groupMemberships?.map((gm) => gm.groupId);

    if (accountIds !== undefined) {
      createInput.accountIds = accountIds;
    }
    if (categoryIds !== undefined) {
      createInput.categoryIds = categoryIds;
    }
    if (groupIds !== undefined) {
      createInput.groupIds = groupIds;
    }

    return await this.repository.createBudget(createInput, workspaceId);
  }

  async bulkArchive(
    ids: number[],
    workspaceId: number
  ): Promise<{ success: number; failed: number; errors: Array<{ id: number; error: string }> }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (const id of ids) {
      try {
        await this.updateBudget(id, { status: "archived" }, workspaceId);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { success, failed, errors };
  }

  async bulkDelete(
    ids: number[],
    workspaceId: number,
    options?: { deleteLinkedSchedules?: boolean }
  ): Promise<{ success: number; failed: number; errors: Array<{ id: number; error: string }> }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (const id of ids) {
      try {
        await this.deleteBudget(id, workspaceId, {
          deleteLinkedSchedule: options?.deleteLinkedSchedules,
        });
        success++;
      } catch (error) {
        failed++;
        errors.push({
          id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { success, failed, errors };
  }

  private validateEnumValue<T extends string>(
    label: string,
    value: T,
    allowed: readonly T[]
  ): void {
    if (!allowed.includes(value)) {
      throw new ValidationError(`${label} is invalid`, label);
    }
  }

  /**
   * Filter out deleted categories by verifying they still exist in the database.
   * This prevents budgets from keeping associations with deleted categories.
   */
  private async getValidCategoryIds(categoryIds: number[]): Promise<number[]> {
    if (!categoryIds.length) return [];

    // Query the database to check which categories still exist (not deleted)
    const existingCategories = await db.query.categories.findMany({
      where: (categories, { inArray, isNull }) =>
        and(inArray(categories.id, categoryIds), isNull(categories.deletedAt)),
      columns: { id: true },
    });

    return existingCategories.map((c) => c.id);
  }

  async createEnvelopeBudget(
    budgetData: CreateBudgetRequest,
    envelopeAllocations: EnvelopeAllocationRequest[],
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    if (budgetData.type !== "category-envelope") {
      throw new ValidationError(
        "Envelope allocations only supported for category-envelope budgets",
        "type"
      );
    }

    const budget = await this.createBudget(budgetData, workspaceId);

    for (const allocation of envelopeAllocations) {
      await this.envelopeService.createEnvelopeAllocation({
        ...allocation,
        budgetId: budget.id,
      });
    }

    return budget;
  }

  async getEnvelopeAllocations(budgetId: number) {
    return await this.envelopeService.getEnvelopesForBudget(budgetId);
  }

  async createEnvelopeAllocation(request: EnvelopeAllocationRequest) {
    return await this.envelopeService.createEnvelopeAllocation(request);
  }

  async updateEnvelopeAllocation(
    envelopeId: number,
    allocatedAmount: number,
    metadata?: Record<string, unknown>
  ) {
    return await this.envelopeService.updateEnvelopeAllocation(
      envelopeId,
      allocatedAmount,
      metadata
    );
  }

  async updateEnvelopeSettings(
    envelopeId: number,
    settings: {
      rolloverMode?: import("$lib/schema/budgets/envelope-allocations").RolloverMode;
      metadata?: Record<string, unknown>;
    }
  ) {
    return await this.envelopeService.updateEnvelopeSettings(envelopeId, settings);
  }

  async transferEnvelopeFunds(
    fromEnvelopeId: number,
    toEnvelopeId: number,
    amount: number,
    reason?: string,
    transferredBy: string = "user"
  ) {
    const request: {
      fromEnvelopeId: number;
      toEnvelopeId: number;
      amount: number;
      reason?: string;
      transferredBy: string;
    } = {
      fromEnvelopeId,
      toEnvelopeId,
      amount,
      transferredBy,
    };

    if (reason !== undefined) {
      request.reason = reason;
    }

    return await this.envelopeService.transferFunds(request);
  }

  async processEnvelopeRollover(fromPeriodId: number, toPeriodId: number) {
    return await this.envelopeService.processRollover(fromPeriodId, toPeriodId);
  }

  async previewEnvelopeRollover(fromPeriodId: number, toPeriodId: number) {
    return await this.envelopeService.calculateRolloverPreview(fromPeriodId, toPeriodId);
  }

  async getEnvelopeRolloverSummary(periodId: number) {
    return await this.envelopeService.getRolloverSummary(periodId);
  }

  async getEnvelopeRolloverHistory(envelopeId: number, limit?: number) {
    return await this.envelopeService.getRolloverHistoryForEnvelope(envelopeId, limit);
  }

  async getBudgetRolloverHistory(budgetId: number, limit?: number) {
    return await this.envelopeService.getRolloverHistoryForBudget(budgetId, limit);
  }

  async estimateEnvelopeRolloverImpact(fromPeriodId: number, toPeriodId: number) {
    return await this.envelopeService.estimateRolloverImpact(fromPeriodId, toPeriodId);
  }

  async analyzeEnvelopeDeficit(envelopeId: number) {
    return await this.envelopeService.analyzeDeficit(envelopeId);
  }

  async createEnvelopeDeficitRecoveryPlan(envelopeId: number) {
    return await this.envelopeService.createDeficitRecoveryPlan(envelopeId);
  }

  async executeEnvelopeDeficitRecovery(plan: DeficitRecoveryPlan, executedBy?: string) {
    return await this.envelopeService.executeDeficitRecovery(plan, executedBy);
  }

  async getDeficitEnvelopes(budgetId: number) {
    return await this.envelopeService.getDeficitEnvelopes(budgetId);
  }

  async getSurplusEnvelopes(budgetId: number, minimumSurplus?: number) {
    return await this.envelopeService.getSurplusEnvelopes(budgetId, minimumSurplus);
  }

  async generateBulkDeficitRecovery(budgetId: number) {
    return await this.envelopeService.generateBulkDeficitRecovery(budgetId);
  }

  async detectEnvelopeDeficitRisk(envelopeId: number) {
    return await this.envelopeService.detectDeficitRisk(envelopeId);
  }

  async getApplicableBudgets(
    accountId?: number,
    categoryId?: number
  ): Promise<BudgetWithRelations[]> {
    return await this.repository.findApplicableBudgets(accountId, categoryId);
  }

  async validateTransactionAgainstStrictBudgets(
    transactionAmount: number,
    accountId?: number,
    categoryId?: number,
    transactionId?: number
  ): Promise<{
    allowed: boolean;
    violations: Array<{ budgetId: number; budgetName: string; exceeded: number }>;
  }> {
    const applicableBudgets = await this.repository.findApplicableBudgets(accountId, categoryId);
    const strictBudgets = applicableBudgets.filter(
      (b) => b.enforcementLevel === "strict" && b.status === "active"
    );

    if (strictBudgets.length === 0) {
      return { allowed: true, violations: [] };
    }

    const violations: Array<{ budgetId: number; budgetName: string; exceeded: number }> = [];

    for (const budget of strictBudgets) {
      const latestPeriod = this.getLatestPeriodInstance(budget);
      if (!latestPeriod) continue;

      const currentSpent = Math.abs(latestPeriod.actualAmount ?? 0);
      const allocated = Math.abs(latestPeriod.allocatedAmount ?? 0);
      const remaining = allocated - currentSpent;

      const proposedTransactionAmount = Math.abs(transactionAmount);

      if (proposedTransactionAmount > remaining) {
        violations.push({
          budgetId: budget.id,
          budgetName: budget.name,
          exceeded: proposedTransactionAmount - remaining,
        });
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  private getLatestPeriodInstance(budget: BudgetWithRelations): BudgetPeriodInstance | null {
    const templates = budget.periodTemplates ?? [];
    const periods = templates.flatMap((template) => template.periods ?? []);
    if (!periods.length) return null;

    return periods.reduce((latest, current) =>
      latest.endDate > current.endDate ? latest : current
    );
  }

  async getGoalProgress(budgetId: number, workspaceId: number): Promise<GoalProgress> {
    return await this.goalTrackingService.calculateGoalProgress(budgetId, workspaceId);
  }

  async createGoalContributionPlan(
    budgetId: number,
    workspaceId: number,
    frequency: "weekly" | "monthly" | "quarterly" | "yearly",
    customAmount?: number
  ): Promise<ContributionPlan> {
    return await this.goalTrackingService.createContributionPlan(
      budgetId,
      workspaceId,
      frequency,
      customAmount
    );
  }

  async linkScheduleToGoal(
    budgetId: number,
    scheduleId: number,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    return await this.goalTrackingService.linkScheduleToGoal(budgetId, scheduleId, workspaceId);
  }

  async linkScheduleToScheduledExpense(
    budgetId: number,
    scheduleId: number,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    return await this.goalTrackingService.linkScheduleToScheduledExpense(
      budgetId,
      scheduleId,
      workspaceId
    );
  }

  async forecastBudgetImpact(
    budgetId: number,
    workspaceId: number,
    daysAhead?: number
  ): Promise<BudgetForecast> {
    return await this.forecastService.forecastBudgetImpact(budgetId, workspaceId, daysAhead);
  }

  async autoAllocateScheduledExpenses(
    budgetId: number,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    return await this.forecastService.autoAllocateScheduledExpenses(budgetId, workspaceId);
  }

  async createBudgetGroup(data: {
    name: string;
    description?: string | null;
    parentId?: number | null;
    spendingLimit?: number | null;
  }): Promise<BudgetGroup> {
    const name = InputSanitizer.sanitizeText(data.name, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldName: "Budget group name",
    });

    const description = data.description
      ? InputSanitizer.sanitizeDescription(data.description, 500)
      : null;

    return await this.repository.createBudgetGroup({
      name,
      description,
      parentId: data.parentId ?? null,
      spendingLimit: data.spendingLimit ?? null,
    });
  }

  async getBudgetGroup(id: number): Promise<BudgetGroup> {
    const group = await this.repository.getBudgetGroupById(id);
    if (!group) {
      throw new NotFoundError("Budget group", id);
    }
    return group;
  }

  async listBudgetGroups(parentId?: number | null): Promise<BudgetGroup[]> {
    return await this.repository.listBudgetGroups(parentId);
  }

  async getRootBudgetGroups(): Promise<BudgetGroup[]> {
    return await this.repository.getRootBudgetGroups();
  }

  async updateBudgetGroup(
    id: number,
    updates: {
      name?: string;
      description?: string | null;
      parentId?: number | null;
      spendingLimit?: number | null;
    }
  ): Promise<BudgetGroup> {
    const sanitizedUpdates: Partial<NewBudgetGroup> = {};

    if (updates.name !== undefined) {
      sanitizedUpdates.name = InputSanitizer.sanitizeText(updates.name, {
        required: true,
        minLength: 2,
        maxLength: 80,
        fieldName: "Budget group name",
      });
    }

    if (updates.description !== undefined) {
      sanitizedUpdates.description = updates.description
        ? InputSanitizer.sanitizeDescription(updates.description, 500)
        : null;
    }

    if (updates.parentId !== undefined) {
      sanitizedUpdates.parentId = updates.parentId;
    }

    if (updates.spendingLimit !== undefined) {
      sanitizedUpdates.spendingLimit = updates.spendingLimit;
    }

    return await this.repository.updateBudgetGroup(id, sanitizedUpdates);
  }

  async deleteBudgetGroup(id: number): Promise<void> {
    await this.repository.deleteBudgetGroup(id);
  }

  // Analytics Methods

  async getSpendingTrends(budgetId: number, limit = 6) {
    return await this.repository.getSpendingTrends(budgetId, limit);
  }

  async getCategoryBreakdown(budgetId: number) {
    return await this.repository.getCategoryBreakdown(budgetId);
  }

  async getDailySpending(budgetId: number, startDate: string, endDate: string) {
    return await this.repository.getDailySpending(budgetId, startDate, endDate);
  }

  async getBudgetSummaryStats(budgetId: number) {
    return await this.repository.getBudgetSummaryStats(budgetId);
  }

  // Budget Intelligence Methods

  async suggestBudgetForPayee(payeeId: number) {
    return await this.intelligenceService.suggestBudgetForPayee(payeeId);
  }

  async suggestBudgetForCategory(categoryId: number) {
    return await this.intelligenceService.suggestBudgetForCategory(categoryId);
  }

  async getMostUsedBudget(payeeId?: number, categoryId?: number) {
    return await this.intelligenceService.getMostUsedBudget(payeeId, categoryId);
  }

  // Budget Analysis & Recommendations Methods

  async analyzeSpendingHistory(params?: AnalysisParams) {
    if (!this.analysisService) {
      throw new Error("Budget analysis service not available");
    }
    return await this.analysisService.analyzeTransactionHistory(params);
  }

  async generateRecommendations(params?: AnalysisParams) {
    if (!this.analysisService || !this.recommendationService) {
      throw new Error("Analysis or recommendation service not available");
    }

    try {
      logger.debug("BudgetService: generateRecommendations called", { params });
      const drafts = await this.analysisService.analyzeTransactionHistory(params);
      logger.debug("BudgetService: Analysis complete", { draftCount: drafts.length });
      const recommendations = await this.recommendationService.createRecommendations(drafts);
      logger.debug("BudgetService: Recommendations created", { count: recommendations.length });
      return recommendations;
    } catch (error) {
      logger.error("BudgetService: Error in generateRecommendations", { error });
      throw error;
    }
  }

  async listRecommendations(filters?: RecommendationFilters) {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }
    return await this.recommendationService.listRecommendations(filters);
  }

  async getRecommendation(id: number) {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }
    return await this.recommendationService.getRecommendation(id);
  }

  async dismissRecommendation(id: number) {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }
    return await this.recommendationService.dismissRecommendation(id);
  }

  async restoreRecommendation(id: number) {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }
    return await this.recommendationService.restoreRecommendation(id);
  }

  async resetAppliedRecommendation(id: number) {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }
    return await this.recommendationService.resetAppliedRecommendation(id);
  }

  async applyRecommendation(id: number) {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }

    // Get the recommendation details
    const recommendation = await this.recommendationService.getRecommendation(id);

    // Create the budget based on the recommendation
    const metadata = recommendation.metadata as any;
    const suggestedType = metadata?.suggestedType || "category-envelope";
    const suggestedAmount = metadata?.suggestedAmount || 0;

    // Build budget name from recommendation
    let budgetName = "";

    // For scheduled expenses, use the payee name
    let payee: { id: number; name: string; slug: string } | null = null;
    if (suggestedType === "scheduled-expense" && metadata?.payeeIds?.[0]) {
      const payeeResult = await db.query.payees.findFirst({
        where: eq(payees.id, metadata.payeeIds[0]),
      });
      if (payeeResult?.name) {
        budgetName = payeeResult.name;
        payee = {
          id: payeeResult.id,
          name: payeeResult.name,
          slug: payeeResult.slug,
        };
      }
    }

    // Fallback to category or account name (without "Budget" suffix for non-scheduled types)
    const categoryName = recommendation.category?.name;
    const accountName = recommendation.account?.name;

    if (!budgetName && categoryName) {
      budgetName = categoryName;
    } else if (!budgetName && accountName) {
      budgetName = accountName;
    } else if (!budgetName) {
      // Extract from title as last resort
      budgetName = recommendation.title.replace(/^Create (scheduled )?budget for /i, "");
    }

    // Get workspaceId from recommendation
    const workspaceId = recommendation.workspaceId;

    // Handle scheduled-expense type with schedule creation
    if (suggestedType === "scheduled-expense" && payee) {
      // Get the account to use from recommendation
      const accountId = recommendation.accountId;
      if (!accountId) {
        throw new Error("Recommendation must have an accountId for scheduled expenses");
      }

      // Map detected frequency to schedule date format
      const detectedFrequency = metadata?.detectedFrequency || "monthly";
      const frequencyMap: Record<
        string,
        { frequency: "daily" | "weekly" | "monthly" | "yearly"; interval: number }
      > = {
        daily: { frequency: "daily", interval: 1 },
        weekly: { frequency: "weekly", interval: 1 },
        "bi-weekly": { frequency: "weekly", interval: 2 },
        monthly: { frequency: "monthly", interval: 1 },
        quarterly: { frequency: "monthly", interval: 3 },
        yearly: { frequency: "yearly", interval: 1 },
      };

      const freqConfig = frequencyMap[detectedFrequency] || {
        frequency: "monthly" as const,
        interval: 1,
      };

      // Determine the schedule start date based on transaction history
      const transactionIds = metadata?.transactionIds as number[] | undefined;
      const scheduleStartDate = await this.calculateScheduleStartDate(transactionIds);

      // Step 1: Create schedule and schedule_dates in a transaction
      const createdSchedule = await db.transaction(async (tx) => {
        const scheduleSlug = await generateUniqueSlugForDB(
          tx,
          "schedules",
          schedules.slug,
          slugify(budgetName)
        );

        const scheduleResult = await tx
          .insert(schedules)
          .values({
            workspaceId,
            name: budgetName,
            slug: scheduleSlug,
            amount: suggestedAmount,
            accountId,
            payeeId: payee!.id,
            categoryId: recommendation.categoryId ?? null,
            status: "active",
            auto_add: true,
          })
          .returning();

        const schedule = scheduleResult[0];
        if (!schedule) {
          throw new Error("Failed to create schedule");
        }

        // Create schedule date record with scheduleId
        const scheduleDateResult = await tx
          .insert(scheduleDates)
          .values({
            scheduleId: schedule.id,
            start: scheduleStartDate,
            end: null,
            frequency: freqConfig.frequency,
            interval: freqConfig.interval,
            limit: 0,
            move_weekends: "none",
            move_holidays: "none",
            specific_dates: [],
            on: false,
            on_type: "day",
            days: [],
            weeks: [],
            weeks_days: [],
            week_days: [],
          })
          .returning();

        const scheduleDateId = scheduleDateResult[0]?.id;

        // Update schedule with the dateId
        if (scheduleDateId) {
          await tx
            .update(schedules)
            .set({ dateId: scheduleDateId })
            .where(eq(schedules.id, schedule.id));
        }

        return schedule;
      });

      // Step 2: Create budget (has its own transaction internally)
      const newBudget = await this.createBudget(
        {
          name: budgetName,
          type: suggestedType,
          scope: metadata?.suggestedScope || (recommendation.categoryId ? "category" : "account"),
          status: "active",
          enforcementLevel: "warning",
          categoryIds: recommendation.categoryId ? [recommendation.categoryId] : [],
          accountIds: accountId ? [accountId] : [],
          metadata: {
            allocatedAmount: suggestedAmount,
            scheduledExpense: {
              linkedScheduleId: createdSchedule.id,
              payeeId: payee!.id,
              expectedAmount: suggestedAmount,
              frequency: detectedFrequency,
              autoTrack: true,
            },
          },
        },
        workspaceId
      );

      // Step 3: Update schedule with budget reference
      await db
        .update(schedules)
        .set({ budgetId: newBudget.id })
        .where(and(eq(schedules.id, createdSchedule.id), eq(schedules.workspaceId, workspaceId)));

      // Step 4: Create default monthly period template with the allocated amount
      await this.createPeriodTemplate(
        {
          budgetId: newBudget.id,
          type: "monthly",
          startDayOfMonth: 1,
          allocatedAmount: suggestedAmount,
        },
        workspaceId
      );

      // Step 5: Mark recommendation as applied and link the created budget
      await this.recommendationService!.applyRecommendation(id, newBudget.id);

      // Step 6: Link related transactions to the schedule and budget
      if (transactionIds?.length) {
        try {
          // Update transactions to link to the new schedule
          // Note: Transaction IDs are already workspace-scoped from recommendation analysis
          await db
            .update(transactions)
            .set({ scheduleId: createdSchedule.id })
            .where(inArray(transactions.id, transactionIds));

          // Get transaction amounts for budget allocations
          const txnData = await db
            .select({ id: transactions.id, amount: transactions.amount })
            .from(transactions)
            .where(inArray(transactions.id, transactionIds));

          // Create budget allocations for each transaction
          if (txnData.length > 0) {
            await db.insert(budgetTransactions).values(
              txnData.map((txn) => ({
                transactionId: txn.id,
                budgetId: newBudget.id,
                allocatedAmount: Math.abs(txn.amount),
                autoAssigned: true,
                assignedBy: "recommendation",
              }))
            );
          }

          logger.info("Linked transactions to budget and schedule from recommendation", {
            budgetId: newBudget.id,
            scheduleId: createdSchedule.id,
            transactionCount: transactionIds.length,
          });
        } catch (error) {
          // Log but don't fail - the budget was created successfully
          logger.warn("Failed to link transactions from recommendation", {
            budgetId: newBudget.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return newBudget;
    }

    // Non-scheduled-expense budget creation (original logic)
    const newBudget = await this.createBudget(
      {
        name: budgetName,
        type: suggestedType,
        scope: metadata?.suggestedScope || (recommendation.categoryId ? "category" : "account"),
        status: "active",
        enforcementLevel: "warning",
        categoryIds: recommendation.categoryId ? [recommendation.categoryId] : [],
        accountIds: recommendation.accountId ? [recommendation.accountId] : [],
        metadata: {
          allocatedAmount: suggestedAmount,
        },
      },
      workspaceId
    );

    // Create default monthly period template with the allocated amount
    await this.createPeriodTemplate(
      {
        budgetId: newBudget.id,
        type: "monthly",
        startDayOfMonth: 1,
        allocatedAmount: suggestedAmount,
      },
      workspaceId
    );

    // Mark recommendation as applied and link the created budget
    await this.recommendationService.applyRecommendation(id, newBudget.id);

    // Link related transactions to the budget
    // Note: Transaction IDs are already workspace-scoped from recommendation analysis
    const transactionIds = metadata?.transactionIds as number[] | undefined;
    if (transactionIds?.length) {
      try {
        // Get transaction amounts for budget allocations
        const txnData = await db
          .select({ id: transactions.id, amount: transactions.amount })
          .from(transactions)
          .where(inArray(transactions.id, transactionIds));

        // Create budget allocations for each transaction
        if (txnData.length > 0) {
          await db.insert(budgetTransactions).values(
            txnData.map((txn) => ({
              transactionId: txn.id,
              budgetId: newBudget.id,
              allocatedAmount: Math.abs(txn.amount),
              autoAssigned: true,
              assignedBy: "recommendation",
            }))
          );
        }

        logger.info("Linked transactions to budget from recommendation", {
          budgetId: newBudget.id,
          transactionCount: transactionIds.length,
        });
      } catch (error) {
        // Log but don't fail - the budget was created successfully
        logger.warn("Failed to link transactions from recommendation", {
          budgetId: newBudget.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return newBudget;
  }

  async getPendingRecommendationsCount() {
    if (!this.recommendationService) {
      return 0;
    }
    return await this.recommendationService.getPendingCount();
  }

  async getRecommendationCounts() {
    if (!this.recommendationService) {
      return { pending: 0, dismissed: 0, applied: 0, expired: 0 };
    }
    return await this.recommendationService.getRecommendationCounts();
  }

  async deleteRecommendation(id: number) {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }
    return await this.recommendationService.deleteRecommendation(id);
  }

  async clearAllRecommendations() {
    if (!this.recommendationService) {
      throw new Error("Recommendation service not available");
    }
    return await this.recommendationService.clearAllRecommendations();
  }

  // Period Template Methods

  async createPeriodTemplate(
    data: {
      budgetId: number;
      type: BudgetPeriodTemplate["type"];
      intervalCount?: number;
      startDayOfWeek?: number;
      startDayOfMonth?: number;
      startMonth?: number;
      timezone?: string;
      allocatedAmount?: number;
    },
    workspaceId: number
  ): Promise<BudgetPeriodTemplate> {
    // Validate budget exists
    const budget = await this.repository.findById(data.budgetId, workspaceId);
    if (!budget) {
      throw new NotFoundError("Budget", data.budgetId);
    }

    // Validate period type
    const validTypes = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;
    if (!validTypes.includes(data.type)) {
      throw new ValidationError(`Invalid period type: ${data.type}`, "type");
    }

    // Validate interval
    if (data.intervalCount !== undefined) {
      if (data.intervalCount < 1 || data.intervalCount > 52) {
        throw new ValidationError("Interval count must be between 1 and 52", "intervalCount");
      }
    }

    // Validate day of week (1-7 for weekly periods)
    if (data.startDayOfWeek !== undefined) {
      if (data.startDayOfWeek < 1 || data.startDayOfWeek > 7) {
        throw new ValidationError("Start day of week must be between 1 and 7", "startDayOfWeek");
      }
    }

    // Validate day of month (1-31)
    if (data.startDayOfMonth !== undefined) {
      if (data.startDayOfMonth < 1 || data.startDayOfMonth > 31) {
        throw new ValidationError("Start day of month must be between 1 and 31", "startDayOfMonth");
      }
    }

    // Validate month (1-12)
    if (data.startMonth !== undefined) {
      if (data.startMonth < 1 || data.startMonth > 12) {
        throw new ValidationError("Start month must be between 1 and 12", "startMonth");
      }
    }

    const template = await this.repository.createPeriodTemplate({
      budgetId: data.budgetId,
      type: data.type,
      intervalCount: data.intervalCount ?? 1,
      startDayOfWeek: data.startDayOfWeek ?? null,
      startDayOfMonth: data.startDayOfMonth ?? null,
      startMonth: data.startMonth ?? null,
      timezone: data.timezone ?? null,
    });

    // Automatically create the first period instance
    const periodManager = new PeriodManager();
    const periodOptions: any = {
      lookAheadMonths: 3,
      lookBehindMonths: 0,
      autoCreateEnvelopes: false,
      copyPreviousPeriodSettings: false,
      enableRollover: false,
    };

    // Only add allocatedAmount if it exists
    if (data.allocatedAmount !== undefined) {
      periodOptions.allocatedAmount = data.allocatedAmount;
    }

    await periodManager.createPeriodsAutomatically(data.budgetId, periodOptions);

    return template;
  }

  async updatePeriodTemplate(
    id: number,
    updates: {
      type?: BudgetPeriodTemplate["type"];
      intervalCount?: number;
      startDayOfWeek?: number;
      startDayOfMonth?: number;
      startMonth?: number;
      timezone?: string;
    }
  ): Promise<BudgetPeriodTemplate> {
    const existing = await this.repository.findTemplateById(id);
    if (!existing) {
      throw new NotFoundError("Period template", id);
    }

    // Validate period type if provided
    if (updates.type !== undefined) {
      const validTypes = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;
      if (!validTypes.includes(updates.type)) {
        throw new ValidationError(`Invalid period type: ${updates.type}`, "type");
      }
    }

    // Validate interval if provided
    if (updates.intervalCount !== undefined) {
      if (updates.intervalCount < 1 || updates.intervalCount > 52) {
        throw new ValidationError("Interval count must be between 1 and 52", "intervalCount");
      }
    }

    // Validate day of week if provided
    if (updates.startDayOfWeek !== undefined) {
      if (updates.startDayOfWeek < 1 || updates.startDayOfWeek > 7) {
        throw new ValidationError("Start day of week must be between 1 and 7", "startDayOfWeek");
      }
    }

    // Validate day of month if provided
    if (updates.startDayOfMonth !== undefined) {
      if (updates.startDayOfMonth < 1 || updates.startDayOfMonth > 31) {
        throw new ValidationError("Start day of month must be between 1 and 31", "startDayOfMonth");
      }
    }

    // Validate month if provided
    if (updates.startMonth !== undefined) {
      if (updates.startMonth < 1 || updates.startMonth > 12) {
        throw new ValidationError("Start month must be between 1 and 12", "startMonth");
      }
    }

    const sanitizedUpdates: Partial<typeof existing> = {};
    if (updates.type !== undefined) sanitizedUpdates.type = updates.type;
    if (updates.intervalCount !== undefined) sanitizedUpdates.intervalCount = updates.intervalCount;
    if (updates.startDayOfWeek !== undefined)
      sanitizedUpdates.startDayOfWeek = updates.startDayOfWeek;
    if (updates.startDayOfMonth !== undefined)
      sanitizedUpdates.startDayOfMonth = updates.startDayOfMonth;
    if (updates.startMonth !== undefined) sanitizedUpdates.startMonth = updates.startMonth;
    if (updates.timezone !== undefined) sanitizedUpdates.timezone = updates.timezone;

    return await this.repository.updatePeriodTemplate(id, sanitizedUpdates);
  }

  async getPeriodTemplate(id: number): Promise<BudgetPeriodTemplate> {
    const template = await this.repository.findTemplateById(id);
    if (!template) {
      throw new NotFoundError("Period template", id);
    }
    return template;
  }

  async listPeriodTemplates(budgetId: number): Promise<BudgetPeriodTemplate[]> {
    return await this.repository.listTemplatesForBudget(budgetId);
  }

  async deletePeriodTemplate(id: number): Promise<void> {
    const template = await this.repository.findTemplateById(id);
    if (!template) {
      throw new NotFoundError("Period template", id);
    }

    // Cascade delete will automatically remove associated period instances
    await this.repository.deletePeriodTemplate(id);
  }

  /**
   * Calculate the schedule start date based on transaction history.
   * Finds the most common day of month from past transactions and returns
   * the next occurrence of that day.
   */
  private async calculateScheduleStartDate(transactionIds?: number[]): Promise<string> {
    const todayDate = today(defaultTimezone);

    if (!transactionIds?.length) {
      return toISOString(todayDate);
    }

    // Query transaction dates to find the typical payment day
    const txnDates = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(inArray(transactions.id, transactionIds));

    if (txnDates.length === 0) {
      return toISOString(todayDate);
    }

    // Count occurrences of each day of month
    const dayOfMonthCounts = new Map<number, number>();
    for (const txn of txnDates) {
      // Handle both YYYY-MM-DD and full ISO timestamp formats
      const dateStr = txn.date.split("T")[0];
      const parsed = parseISOString(dateStr);
      if (parsed) {
        dayOfMonthCounts.set(parsed.day, (dayOfMonthCounts.get(parsed.day) || 0) + 1);
      }
    }

    // Find the most common day of month
    let mostCommonDay = 1;
    let maxCount = 0;
    for (const [day, count] of dayOfMonthCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonDay = day;
      }
    }

    // Calculate next occurrence of this day
    const currentDay = todayDate.day;
    let targetYear = todayDate.year;
    let targetMonth = todayDate.month;

    if (mostCommonDay < currentDay) {
      // Day has passed this month, use next month
      targetMonth += 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    }

    // Handle edge case where day doesn't exist in target month (e.g., 31st in February)
    const targetDate = new CalendarDate(targetYear, targetMonth, 1);
    const lastDayOfMonth = targetDate.add({ months: 1 }).subtract({ days: 1 }).day;
    const actualDay = Math.min(mostCommonDay, lastDayOfMonth);

    return toISOString(new CalendarDate(targetYear, targetMonth, actualDay));
  }
}

/* ------------------------------------------------------------------ */
/* Budget Period Calculation                                         */
/* ------------------------------------------------------------------ */

export interface PeriodBoundary {
  start: CalendarDate;
  end: CalendarDate;
  timezone: string;
}

export class BudgetPeriodCalculator {
  static calculatePeriodBoundaries(
    template: BudgetPeriodTemplate,
    referenceDate: DateValue = today(defaultTimezone)
  ): PeriodBoundary {
    const timezone = template.timezone || defaultTimezone;
    const normalizedReference = this.toCalendarDate(referenceDate);

    switch (template.type) {
      case "weekly":
        return this.calculateWeeklyBoundary(normalizedReference, template, timezone);
      case "monthly":
        return this.calculateMonthlyLikeBoundary(normalizedReference, template, 1, timezone);
      case "quarterly":
        return this.calculateMonthlyLikeBoundary(normalizedReference, template, 3, timezone);
      case "yearly":
        return this.calculateYearlyBoundary(normalizedReference, template, timezone);
      case "custom":
        throw new ValidationError(
          "Custom period calculation must be provided by a specialized handler",
          "period"
        );
      default:
        throw new ValidationError(`Unsupported period type: ${template.type}`, "period");
    }
  }

  private static calculateWeeklyBoundary(
    reference: CalendarDate,
    template: BudgetPeriodTemplate,
    timezone: string
  ): PeriodBoundary {
    const interval = Math.max(template.intervalCount ?? 1, 1);
    const startDayIso = this.normalizeIsoDay(template.startDayOfWeek ?? 1);
    const referenceIso = this.getIsoWeekday(reference);

    let daysToSubtract = (referenceIso - startDayIso) % 7;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }

    const start = reference.subtract({ days: daysToSubtract });
    const end = start.add({ days: interval * 7 }).subtract({ days: 1 });

    return { start, end, timezone };
  }

  private static calculateMonthlyLikeBoundary(
    reference: CalendarDate,
    template: BudgetPeriodTemplate,
    monthsPerPeriod: number,
    timezone: string
  ): PeriodBoundary {
    const interval = Math.max(template.intervalCount ?? 1, 1) * monthsPerPeriod;
    const targetDay = this.normalizeDayOfMonth(template.startDayOfMonth ?? 1);

    let referenceMonthIndex = this.getMonthIndex(reference);
    if (reference.day < targetDay) {
      referenceMonthIndex -= 1;
    }

    const anchor = template.startMonth ? template.startMonth - 1 : 0;
    const relativeIndex = referenceMonthIndex - anchor;
    const remainder = this.mod(relativeIndex, interval);
    const startMonthIndex = referenceMonthIndex - remainder;

    const start = this.dateFromMonthIndex(startMonthIndex, targetDay);
    const end = start.add({ months: interval }).subtract({ days: 1 });

    return { start, end, timezone };
  }

  private static calculateYearlyBoundary(
    reference: CalendarDate,
    template: BudgetPeriodTemplate,
    timezone: string
  ): PeriodBoundary {
    const monthsPerPeriod = (template.intervalCount ?? 1) * 12;
    const startMonth = template.startMonth ?? 1;
    const startDay = this.normalizeDayOfMonth(template.startDayOfMonth ?? 1);

    let referenceMonthIndex = this.getMonthIndex(reference);

    if (reference.month === startMonth && reference.day < startDay) {
      referenceMonthIndex -= 1;
    }

    // Align reference against anchor month
    const anchor = startMonth - 1;
    const relativeIndex = referenceMonthIndex - anchor;
    const remainder = this.mod(relativeIndex, monthsPerPeriod);
    const startMonthIndex = referenceMonthIndex - remainder;

    const start = this.dateFromMonthIndex(startMonthIndex, startDay);
    const end = start.add({ months: monthsPerPeriod }).subtract({ days: 1 });

    return { start, end, timezone };
  }

  private static normalizeIsoDay(day: number): number {
    const normalized = (((day - 1) % 7) + 7) % 7;
    return normalized + 1;
  }

  private static normalizeDayOfMonth(day: number): number {
    if (day < 1) return 1;
    if (day > 31) return 31;
    return day;
  }

  private static toCalendarDate(date: DateValue): CalendarDate {
    return new CalendarDate(date.year, date.month, date.day);
  }

  private static getIsoWeekday(date: CalendarDate): number {
    const jsDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
    const weekday = jsDate.getUTCDay();
    return weekday === 0 ? 7 : weekday;
  }

  private static getMonthIndex(date: CalendarDate): number {
    return date.year * 12 + (date.month - 1);
  }

  private static dateFromMonthIndex(monthIndex: number, day: number): CalendarDate {
    const year = Math.floor(monthIndex / 12);
    const month = this.mod(monthIndex, 12) + 1;

    const daysInMonth = this.daysInMonth(year, month);
    const clampedDay = Math.min(day, daysInMonth);
    return new CalendarDate(year, month, clampedDay);
  }

  private static daysInMonth(year: number, month: number): number {
    const firstOfMonth = new CalendarDate(year, month, 1);
    const endOfMonth = firstOfMonth.add({ months: 1 }).subtract({ days: 1 });
    return endOfMonth.day;
  }

  private static mod(value: number, modulus: number): number {
    return ((value % modulus) + modulus) % modulus;
  }
}

export interface EnsurePeriodInstanceOptions {
  referenceDate?: DateValue;
  allocatedAmount?: number;
  rolloverAmount?: number;
  actualAmount?: number;
}

/**
 * Budget period service for managing budget period instances
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class BudgetPeriodService {
  constructor(private repository: BudgetRepository) {}

  async ensureInstanceForDate(
    templateId: number,
    workspaceId: number,
    options: EnsurePeriodInstanceOptions = {}
  ): Promise<BudgetPeriodInstance> {
    const template = await this.repository.findTemplateById(templateId);
    if (!template) {
      throw new NotFoundError("Budget period template", templateId);
    }

    const boundary = BudgetPeriodCalculator.calculatePeriodBoundaries(
      template,
      options.referenceDate ?? today(defaultTimezone)
    );

    const startDate = boundary.start.toString();
    const endDate = boundary.end.toString();

    const existing = await this.repository.findInstanceByRange(templateId, startDate, endDate);
    if (existing) {
      return existing;
    }

    const parentBudget = await this.repository.findById(template.budgetId, workspaceId);
    const defaultAllocated = parentBudget?.metadata?.allocatedAmount ?? 0;

    return await this.repository.createPeriodInstance({
      templateId,
      startDate,
      endDate,
      allocatedAmount: options.allocatedAmount ?? defaultAllocated ?? 0,
      rolloverAmount: options.rolloverAmount ?? 0,
      actualAmount: options.actualAmount ?? 0,
    });
  }

  async listInstances(templateId: number): Promise<BudgetPeriodInstance[]> {
    return await this.repository.listPeriodInstances(templateId);
  }
}

/* ------------------------------------------------------------------ */
/* Goal Tracking Service                                             */
/* ------------------------------------------------------------------ */

export interface GoalProgress {
  budgetId: number;
  budgetName: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentComplete: number;
  targetDate: string;
  daysRemaining: number;
  isOnTrack: boolean;
  requiredContribution: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  projectedCompletionDate?: string;
  status: "on-track" | "ahead" | "behind" | "at-risk" | "completed";
}

export interface ContributionPlan {
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  amount: number;
  numberOfPayments: number;
  totalAmount: number;
  projectedCompletionDate: string;
}

/**
 * Goal tracking service for goal-based budgets
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class GoalTrackingService {
  constructor(private repository: BudgetRepository) {}

  async calculateGoalProgress(budgetId: number, workspaceId: number): Promise<GoalProgress> {
    const budget = await this.repository.findById(budgetId, workspaceId);
    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    if (budget.type !== "goal-based") {
      throw new ValidationError("Budget is not a goal-based budget", "type");
    }

    const goalMetadata = budget.metadata?.goal;
    if (!goalMetadata) {
      throw new ValidationError("Budget does not have goal metadata", "goal");
    }

    const currentAmount = await this.getCurrentGoalAmount(budgetId, budget);
    const targetAmount = goalMetadata.targetAmount;
    const remainingAmount = Math.max(0, targetAmount - currentAmount);
    const percentComplete = Math.min(100, (currentAmount / targetAmount) * 100);

    const targetDate = new Date(goalMetadata.targetDate);
    const today = new Date();
    const daysRemaining = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const requiredContribution = this.calculateRequiredContributions(
      remainingAmount,
      daysRemaining
    );

    const { status, projectedCompletionDate } = this.calculateGoalStatus(
      currentAmount,
      targetAmount,
      daysRemaining,
      goalMetadata
    );

    const result: GoalProgress = {
      budgetId: budget.id,
      budgetName: budget.name,
      targetAmount,
      currentAmount,
      remainingAmount,
      percentComplete,
      targetDate: goalMetadata.targetDate,
      daysRemaining,
      isOnTrack: status === "on-track" || status === "ahead",
      requiredContribution,
      status,
    };

    if (projectedCompletionDate !== undefined) {
      result.projectedCompletionDate = projectedCompletionDate;
    }

    return result;
  }

  private async getCurrentGoalAmount(
    budgetId: number,
    budget: BudgetWithRelations
  ): Promise<number> {
    const goalMetadata = budget.metadata?.goal;
    const startDate = goalMetadata?.startDate || budget.createdAt;

    const relevantCategories = budget.categories?.map((c) => c.id) || [];
    const relevantAccounts = budget.accounts?.map((a) => a.id) || [];

    if (relevantAccounts.length === 0 && relevantCategories.length === 0) {
      return 0;
    }

    const accountTotal =
      relevantAccounts.length > 0 ? await this.repository.getAccountsBalance(relevantAccounts) : 0;

    const categoryTotal =
      relevantCategories.length > 0
        ? await this.repository.getCategorySpendingSince(relevantCategories, startDate)
        : 0;

    return accountTotal + categoryTotal;
  }

  private calculateRequiredContributions(
    remainingAmount: number,
    daysRemaining: number
  ): {
    daily: number;
    weekly: number;
    monthly: number;
  } {
    if (daysRemaining <= 0 || remainingAmount <= 0) {
      return { daily: 0, weekly: 0, monthly: 0 };
    }

    const daily = remainingAmount / daysRemaining;
    const weekly = (remainingAmount / daysRemaining) * 7;
    const monthly = (remainingAmount / daysRemaining) * 30;

    return {
      daily: Math.ceil(daily * 100) / 100,
      weekly: Math.ceil(weekly * 100) / 100,
      monthly: Math.ceil(monthly * 100) / 100,
    };
  }

  private calculateGoalStatus(
    currentAmount: number,
    targetAmount: number,
    daysRemaining: number,
    goalMetadata: NonNullable<BudgetMetadata["goal"]>
  ): { status: GoalProgress["status"]; projectedCompletionDate?: string } {
    if (currentAmount >= targetAmount) {
      return { status: "completed" };
    }

    if (daysRemaining <= 0) {
      return { status: "at-risk" };
    }

    const percentComplete = (currentAmount / targetAmount) * 100;
    const elapsedDays = this.getElapsedDays(goalMetadata.startDate);
    const totalDays = elapsedDays + daysRemaining;
    const expectedPercent = (elapsedDays / totalDays) * 100;

    if (percentComplete >= expectedPercent + 10) {
      const daysToComplete = Math.ceil(
        (targetAmount - currentAmount) / (currentAmount / elapsedDays)
      );
      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + daysToComplete);
      const result: { status: GoalProgress["status"]; projectedCompletionDate?: string } = {
        status: "ahead",
      };
      const dateStr = projectedDate.toISOString().split("T")[0];
      if (dateStr) {
        result.projectedCompletionDate = dateStr;
      }
      return result;
    }

    if (percentComplete < expectedPercent - 20) {
      return { status: "at-risk" };
    }

    if (percentComplete < expectedPercent - 10) {
      return { status: "behind" };
    }

    return { status: "on-track" };
  }

  private getElapsedDays(startDate?: string): number {
    if (!startDate) return 30;
    const start = new Date(startDate);
    const now = new Date();
    return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  async createContributionPlan(
    budgetId: number,
    workspaceId: number,
    frequency: "weekly" | "monthly" | "quarterly" | "yearly",
    customAmount?: number
  ): Promise<ContributionPlan> {
    const progress = await this.calculateGoalProgress(budgetId, workspaceId);

    if (progress.status === "completed") {
      throw new ValidationError("Goal is already completed", "goal");
    }

    let amount: number = 0;
    let daysPerPayment: number = 0;

    switch (frequency) {
      case "weekly":
        amount = customAmount ?? progress.requiredContribution.weekly;
        daysPerPayment = 7;
        break;
      case "monthly":
        amount = customAmount ?? progress.requiredContribution.monthly;
        daysPerPayment = 30;
        break;
      case "quarterly":
        amount = customAmount ?? progress.requiredContribution.monthly * 3;
        daysPerPayment = 90;
        break;
      case "yearly":
        amount = customAmount ?? progress.requiredContribution.monthly * 12;
        daysPerPayment = 365;
        break;
    }

    const numberOfPayments = Math.ceil(progress.remainingAmount / amount);
    const totalAmount = amount * numberOfPayments;
    const daysToComplete = numberOfPayments * daysPerPayment;

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToComplete);

    return {
      frequency,
      amount,
      numberOfPayments,
      totalAmount,
      projectedCompletionDate: completionDate.toISOString().split("T")[0]!,
    };
  }

  async linkScheduleToGoal(
    budgetId: number,
    scheduleId: number,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    const budget = await this.repository.findById(budgetId, workspaceId);
    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    if (budget.type !== "goal-based") {
      throw new ValidationError("Budget is not a goal-based budget", "type");
    }

    const metadata = budget.metadata || {};
    const goal = metadata.goal;

    if (!goal) {
      throw new ValidationError("Budget does not have goal metadata", "goal");
    }

    goal.linkedScheduleId = scheduleId;
    goal.autoContribute = true;

    return await this.repository.updateBudget(budgetId, { metadata }, workspaceId);
  }

  async linkScheduleToScheduledExpense(
    budgetId: number,
    scheduleId: number,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    const budget = await this.repository.findById(budgetId, workspaceId);
    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    if (budget.type !== "scheduled-expense") {
      throw new ValidationError(
        "Budget must be of type scheduled-expense to link a schedule",
        "type"
      );
    }

    const metadata = budget.metadata as BudgetMetadata;
    if (!metadata.scheduledExpense) {
      metadata.scheduledExpense = {};
    }

    metadata.scheduledExpense.linkedScheduleId = scheduleId;
    metadata.scheduledExpense.autoTrack = true;

    return await this.repository.updateBudget(budgetId, { metadata }, workspaceId);
  }
}

/* ------------------------------------------------------------------ */
/* Budget Forecast Service                                           */
/* ------------------------------------------------------------------ */

export interface ScheduledExpenseForecast {
  scheduleId: number;
  scheduleName: string;
  nextOccurrence: string;
  amount: number;
  frequency: string;
  occurrencesInPeriod: number;
  totalImpact: number;
}

export interface BudgetForecast {
  budgetId: number;
  budgetName: string;
  periodStart: string;
  periodEnd: string;
  allocatedAmount: number;
  projectedScheduledExpenses: number;
  projectedBalance: number;
  scheduledExpenses: ScheduledExpenseForecast[];
  status: "sufficient" | "tight" | "exceeded";
}

/**
 * Budget forecast service for predicting future budget states
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class BudgetForecastService {
  constructor(private repository: BudgetRepository) {}

  async forecastBudgetImpact(
    budgetId: number,
    workspaceId: number,
    daysAhead: number = 30
  ): Promise<BudgetForecast> {
    const budget = await this.repository.findById(budgetId, workspaceId);
    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + daysAhead);

    const periodStart = now.toISOString().split("T")[0]!;
    const periodEndStr = periodEnd.toISOString().split("T")[0]!;

    const schedules = await this.getSchedulesForBudget(budgetId);
    const scheduledExpenses: ScheduledExpenseForecast[] = [];
    let projectedScheduledExpenses = 0;

    for (const schedule of schedules) {
      const forecast = await this.forecastSchedule(schedule, periodStart, periodEndStr);
      if (forecast) {
        scheduledExpenses.push(forecast);
        projectedScheduledExpenses += forecast.totalImpact;
      }
    }

    const allocatedAmount = budget.metadata?.allocatedAmount || 0;
    const projectedBalance = allocatedAmount - projectedScheduledExpenses;

    let status: BudgetForecast["status"] = "sufficient";
    if (projectedBalance < 0) {
      status = "exceeded";
    } else if (projectedBalance < allocatedAmount * 0.1) {
      status = "tight";
    }

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      periodStart,
      periodEnd: periodEndStr,
      allocatedAmount,
      projectedScheduledExpenses,
      projectedBalance,
      scheduledExpenses,
      status,
    };
  }

  private async getSchedulesForBudget(budgetId: number): Promise<any[]> {
    const schedulesModule = await import("$lib/schema/schedules");
    const { schedules } = schedulesModule;
    const results = await db.select().from(schedules).where(eq(schedules.budgetId, budgetId));
    return results;
  }

  private async forecastSchedule(
    schedule: {
      id: number;
      name: string;
      dateId: number | null;
      status: string;
      amount: number;
      amount_type: string;
      amount_2?: number;
    },
    periodStart: string,
    periodEnd: string
  ): Promise<ScheduledExpenseForecast | null> {
    if (!schedule.dateId || schedule.status !== "active") {
      return null;
    }

    const scheduleDatesModule = await import("$lib/schema/schedule-dates");
    const { scheduleDates } = scheduleDatesModule;

    const dateConfig = await db.query.scheduleDates.findFirst({
      where: eq(scheduleDates.id, schedule.dateId),
    });

    if (!dateConfig) {
      return null;
    }

    const frequencyConfig: { frequency?: string } = {};
    if (dateConfig.frequency) {
      frequencyConfig.frequency = dateConfig.frequency;
    }

    const occurrencesInPeriod = this.calculateOccurrences(frequencyConfig, periodStart, periodEnd);
    const amount =
      schedule.amount_type === "range"
        ? (schedule.amount + (schedule.amount_2 || 0)) / 2
        : schedule.amount;

    const totalImpact = Math.abs(amount) * occurrencesInPeriod;

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      nextOccurrence: this.calculateNextOccurrence({ startDate: dateConfig.start }, periodStart),
      amount,
      frequency: dateConfig.frequency || "once",
      occurrencesInPeriod,
      totalImpact,
    };
  }

  private calculateOccurrences(
    dateConfig: { frequency?: string },
    periodStart: string,
    periodEnd: string
  ): number {
    const frequency = dateConfig.frequency;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    switch (frequency) {
      case "daily":
        return daysDiff;
      case "weekly":
        return Math.floor(daysDiff / 7);
      case "monthly":
        return Math.floor(daysDiff / 30);
      case "yearly":
        return Math.floor(daysDiff / 365);
      default:
        return 1;
    }
  }

  private calculateNextOccurrence(dateConfig: { startDate?: string }, fromDate: string): string {
    const startDate = dateConfig.startDate || fromDate;
    return startDate;
  }

  async autoAllocateScheduledExpenses(
    budgetId: number,
    workspaceId: number
  ): Promise<BudgetWithRelations> {
    const forecast = await this.forecastBudgetImpact(budgetId, workspaceId, 30);
    const budget = await this.repository.findById(budgetId, workspaceId);

    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    const metadata = {
      ...budget.metadata,
      allocatedAmount: forecast.projectedScheduledExpenses,
    };

    return await this.repository.updateBudget(budgetId, { metadata }, workspaceId);
  }
}

/* ------------------------------------------------------------------ */
/* Budget Transaction Service                                        */
/* ------------------------------------------------------------------ */

const ALLOCATION_PRECISION = 0.005;

export interface AllocationValidationResult {
  isValid: boolean;
  wouldExceed: boolean;
  hasSignMismatch: boolean;
  remaining: number;
  errors: string[];
}

/* ------------------------------------------------------------------ */
/* Budget Intelligence Service                                       */
/* ------------------------------------------------------------------ */

export interface BudgetUsagePattern {
  budgetId: number;
  budgetName: string;
  usageCount: number;
  totalAmount: number;
  avgAmount: number;
  lastUsedDate: string;
}

export interface BudgetSuggestion {
  budgetId: number;
  budgetName: string;
  confidence: number; // 0-100
  reason: string;
}

/**
 * Budget intelligence service for suggesting budgets based on patterns
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class BudgetIntelligenceService {
  constructor(private repository: BudgetRepository) {}

  /**
   * Analyzes transaction history for a payee to suggest the most appropriate budget.
   */
  async suggestBudgetForPayee(payeeId: number): Promise<BudgetSuggestion | null> {
    const patterns = await this.getBudgetUsagePatternsForPayee(payeeId);

    if (patterns.length === 0) {
      return null;
    }

    // Sort by usage count (most frequently used)
    const sorted = patterns.sort((a, b) => b.usageCount - a.usageCount);
    const mostUsed = sorted[0];

    if (!mostUsed) {
      return null;
    }

    // Calculate confidence based on usage frequency
    const totalTransactions = patterns.reduce((sum, p) => sum + p.usageCount, 0);
    const confidence = Math.min(100, Math.round((mostUsed.usageCount / totalTransactions) * 100));

    return {
      budgetId: mostUsed.budgetId,
      budgetName: mostUsed.budgetName,
      confidence,
      reason: `Used in ${mostUsed.usageCount} of ${totalTransactions} transactions (${confidence}%)`,
    };
  }

  /**
   * Analyzes transaction history for a category to suggest the most appropriate budget.
   */
  async suggestBudgetForCategory(categoryId: number): Promise<BudgetSuggestion | null> {
    const patterns = await this.getBudgetUsagePatternsForCategory(categoryId);

    if (patterns.length === 0) {
      return null;
    }

    const sorted = patterns.sort((a, b) => b.usageCount - a.usageCount);
    const mostUsed = sorted[0];

    if (!mostUsed) {
      return null;
    }

    const totalTransactions = patterns.reduce((sum, p) => sum + p.usageCount, 0);
    const confidence = Math.min(100, Math.round((mostUsed.usageCount / totalTransactions) * 100));

    return {
      budgetId: mostUsed.budgetId,
      budgetName: mostUsed.budgetName,
      confidence,
      reason: `Used in ${mostUsed.usageCount} of ${totalTransactions} transactions (${confidence}%)`,
    };
  }

  /**
   * Gets the most commonly used budget for a specific payee and category combination.
   */
  async getMostUsedBudget(
    payeeId?: number,
    categoryId?: number
  ): Promise<BudgetUsagePattern | null> {
    if (!payeeId && !categoryId) {
      return null;
    }

    const query = db
      .select({
        budgetId: budgetTransactions.budgetId,
        budgetName: budgets.name,
        usageCount: sql<number>`COUNT(DISTINCT ${budgetTransactions.transactionId})`,
        totalAmount: sql<number>`COALESCE(SUM(ABS(${budgetTransactions.allocatedAmount})), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(ABS(${budgetTransactions.allocatedAmount})), 0)`,
        lastUsedDate: sql<string>`MAX(${transactions.date})`,
      })
      .from(budgetTransactions)
      .innerJoin(budgets, eq(budgetTransactions.budgetId, budgets.id))
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id));

    const conditions = [];
    if (payeeId) {
      conditions.push(eq(transactions.payeeId, payeeId));
    }
    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }

    const results = await query
      .where(and(...conditions))
      .groupBy(budgetTransactions.budgetId, budgets.name)
      .orderBy(sql`COUNT(DISTINCT ${budgetTransactions.transactionId}) DESC`)
      .limit(1);

    const mostUsed = results[0];
    if (!mostUsed) {
      return null;
    }

    return {
      budgetId: mostUsed.budgetId,
      budgetName: mostUsed.budgetName,
      usageCount: Number(mostUsed.usageCount),
      totalAmount: Number(mostUsed.totalAmount),
      avgAmount: Number(mostUsed.avgAmount),
      lastUsedDate: mostUsed.lastUsedDate,
    };
  }

  /**
   * Gets budget usage patterns for a specific payee.
   */
  private async getBudgetUsagePatternsForPayee(payeeId: number): Promise<BudgetUsagePattern[]> {
    const results = await db
      .select({
        budgetId: budgetTransactions.budgetId,
        budgetName: budgets.name,
        usageCount: sql<number>`COUNT(DISTINCT ${budgetTransactions.transactionId})`,
        totalAmount: sql<number>`COALESCE(SUM(ABS(${budgetTransactions.allocatedAmount})), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(ABS(${budgetTransactions.allocatedAmount})), 0)`,
        lastUsedDate: sql<string>`MAX(${transactions.date})`,
      })
      .from(budgetTransactions)
      .innerJoin(budgets, eq(budgetTransactions.budgetId, budgets.id))
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
      .where(eq(transactions.payeeId, payeeId))
      .groupBy(budgetTransactions.budgetId, budgets.name)
      .orderBy(sql`COUNT(DISTINCT ${budgetTransactions.transactionId}) DESC`);

    return results.map((r) => ({
      budgetId: r.budgetId,
      budgetName: r.budgetName,
      usageCount: Number(r.usageCount),
      totalAmount: Number(r.totalAmount),
      avgAmount: Number(r.avgAmount),
      lastUsedDate: r.lastUsedDate,
    }));
  }

  /**
   * Gets budget usage patterns for a specific category.
   */
  private async getBudgetUsagePatternsForCategory(
    categoryId: number
  ): Promise<BudgetUsagePattern[]> {
    const results = await db
      .select({
        budgetId: budgetTransactions.budgetId,
        budgetName: budgets.name,
        usageCount: sql<number>`COUNT(DISTINCT ${budgetTransactions.transactionId})`,
        totalAmount: sql<number>`COALESCE(SUM(ABS(${budgetTransactions.allocatedAmount})), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(ABS(${budgetTransactions.allocatedAmount})), 0)`,
        lastUsedDate: sql<string>`MAX(${transactions.date})`,
      })
      .from(budgetTransactions)
      .innerJoin(budgets, eq(budgetTransactions.budgetId, budgets.id))
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
      .where(eq(transactions.categoryId, categoryId))
      .groupBy(budgetTransactions.budgetId, budgets.name)
      .orderBy(sql`COUNT(DISTINCT ${budgetTransactions.transactionId}) DESC`);

    return results.map((r) => ({
      budgetId: r.budgetId,
      budgetName: r.budgetName,
      usageCount: Number(r.usageCount),
      totalAmount: Number(r.totalAmount),
      avgAmount: Number(r.avgAmount),
      lastUsedDate: r.lastUsedDate,
    }));
  }
}

/* ------------------------------------------------------------------ */
/* Budget Transaction Service                                        */
/* ------------------------------------------------------------------ */

export class BudgetTransactionService {
  constructor(private repository: BudgetRepository) {}

  async isTransactionFullyAllocated(transactionId: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const { allocations, transaction } = await this.fetchTransactionContext(tx, transactionId);
      const totalAllocated = allocations.reduce(
        (sum, allocation) => sum + Number(allocation.allocatedAmount || 0),
        0
      );
      return Math.abs(totalAllocated - Number(transaction.amount || 0)) < ALLOCATION_PRECISION;
    });
  }

  async validateProposedAllocation(
    transactionId: number,
    newAmount: number,
    excludeAllocationId?: number
  ): Promise<AllocationValidationResult> {
    return await db.transaction(async (tx) => {
      const { allocations, transaction } = await this.fetchTransactionContext(tx, transactionId);
      return this.validateWithContext(allocations, transaction, newAmount, excludeAllocationId);
    });
  }

  async createAllocation(allocation: NewBudgetTransaction): Promise<BudgetTransaction> {
    return await db.transaction(async (tx) => {
      const { allocations, transaction } = await this.fetchTransactionContext(
        tx,
        allocation.transactionId
      );
      const validation = this.validateWithContext(
        allocations,
        transaction,
        allocation.allocatedAmount
      );
      if (!validation.isValid) {
        throw new ValidationError(validation.errors[0] || "Allocation is invalid", "allocation");
      }

      const [created] = await tx.insert(budgetTransactions).values(allocation).returning();
      if (!created) {
        throw new DatabaseError("Failed to create allocation", "createAllocation");
      }
      return created;
    });
  }

  async updateAllocation(
    allocationId: number,
    amount: number,
    updates: Partial<NewBudgetTransaction> = {}
  ): Promise<BudgetTransaction> {
    return await db.transaction(async (tx) => {
      const existing = await tx.query.budgetTransactions.findFirst({
        where: eq(budgetTransactions.id, allocationId),
      });

      if (!existing) {
        throw new NotFoundError("Budget allocation", allocationId);
      }

      const { allocations, transaction } = await this.fetchTransactionContext(
        tx,
        existing.transactionId
      );
      const validation = this.validateWithContext(allocations, transaction, amount, allocationId);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors[0] || "Allocation is invalid", "allocation");
      }

      const [updated] = await tx
        .update(budgetTransactions)
        .set({
          ...updates,
          allocatedAmount: amount,
        })
        .where(eq(budgetTransactions.id, allocationId))
        .returning();

      if (!updated) {
        throw new DatabaseError("Failed to update allocation", "updateAllocation");
      }

      return updated;
    });
  }

  async clearAllocation(allocationId: number): Promise<BudgetTransaction> {
    return await this.updateAllocation(allocationId, 0, {});
  }

  async deleteAllocation(allocationId: number): Promise<void> {
    await this.repository.deleteAllocation(allocationId);
  }

  private async fetchTransactionContext(
    client: DbClient,
    transactionId: number
  ): Promise<{ allocations: BudgetTransaction[]; transaction: Transaction }> {
    const allocations = await client
      .select()
      .from(budgetTransactions)
      .where(eq(budgetTransactions.transactionId, transactionId));

    const transactionRecord = await client.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    });

    if (!transactionRecord) {
      throw new NotFoundError("Transaction", transactionId);
    }

    return {
      allocations: allocations as BudgetTransaction[],
      transaction: transactionRecord as Transaction,
    };
  }

  private validateWithContext(
    allocations: BudgetTransaction[],
    transaction: Transaction,
    newAmount: number,
    excludeAllocationId?: number
  ): AllocationValidationResult {
    const errors: string[] = [];

    let hasSignMismatch = false;
    if (newAmount !== 0) {
      const transactionIsPositive = Number(transaction.amount) > 0;
      const allocationIsPositive = newAmount > 0;
      if (transactionIsPositive !== allocationIsPositive) {
        hasSignMismatch = true;
        errors.push(
          `Allocation amount ${newAmount} has incorrect sign. ${transactionIsPositive ? "Income" : "Expense"} transactions require ${transactionIsPositive ? "positive" : "negative"} allocations.`
        );
      }
    }

    const existingTotal = allocations
      .filter((allocation) => allocation.id !== excludeAllocationId)
      .reduce((sum, allocation) => sum + Number(allocation.allocatedAmount || 0), 0);

    const proposedTotal = existingTotal + newAmount;
    const sourceAmount = Number(transaction.amount || 0);
    const remaining = sourceAmount - proposedTotal;
    const wouldExceed = Math.abs(proposedTotal) - Math.abs(sourceAmount) > ALLOCATION_PRECISION;

    if (wouldExceed) {
      errors.push(
        `Allocation amount ${newAmount} would exceed remaining transaction amount. Remaining: ${remaining}.`
      );
    }

    const isValid = !wouldExceed && !hasSignMismatch;

    return {
      isValid,
      wouldExceed,
      hasSignMismatch,
      remaining,
      errors,
    };
  }
}
