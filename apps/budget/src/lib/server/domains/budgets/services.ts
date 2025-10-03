import {CalendarDate, type DateValue} from "@internationalized/date";
import {
  type Budget,
  type BudgetMetadata,
  type BudgetTransaction,
  type NewBudgetTransaction,
  type BudgetPeriodTemplate,
  type BudgetPeriodInstance,
  type BudgetType,
  type BudgetScope,
  type BudgetEnforcementLevel,
  type BudgetGroup,
  type NewBudgetGroup,
  budgetTypes,
  budgetScopes,
  budgetEnforcementLevels,
  budgetStatuses,
} from "$lib/schema/budgets";
import type {Transaction} from "$lib/schema/transactions";
import {transactions} from "$lib/schema/transactions";
import {db} from "$lib/server/db";
import {InputSanitizer} from "$lib/server/shared/validation";
import {BudgetRepository, type BudgetWithRelations, type DbClient} from "./repository";
import {DatabaseError, NotFoundError, ValidationError} from "$lib/server/shared/types/errors";
import {currentDate as defaultCurrentDate, timezone as defaultTimezone} from "$lib/utils/dates";
import {budgetTransactions} from "$lib/schema/budgets";
import {eq} from "drizzle-orm";
import {EnvelopeService, type EnvelopeAllocationRequest} from "./envelope-service";

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

export class BudgetService {
  constructor(
    private repository: BudgetRepository = new BudgetRepository(),
    private envelopeService: EnvelopeService = new EnvelopeService(),
    private goalTrackingService: GoalTrackingService = new GoalTrackingService(),
    private forecastService: BudgetForecastService = new BudgetForecastService()
  ) {}

  async createBudget(input: CreateBudgetRequest): Promise<BudgetWithRelations> {
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

    return await this.repository.createBudget({
      budget: {
        name,
        description,
        type: input.type,
        scope: input.scope,
        status,
        enforcementLevel,
        metadata,
      },
      accountIds: input.accountIds,
      categoryIds: input.categoryIds,
      groupIds: input.groupIds,
    });
  }

  async updateBudget(id: number, input: UpdateBudgetRequest): Promise<BudgetWithRelations> {
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updates.name = InputSanitizer.sanitizeText(input.name, {
        required: true,
        minLength: 2,
        maxLength: 80,
        fieldName: "Budget name",
      });
    }

    if (input.description !== undefined) {
      updates.description = input.description
        ? InputSanitizer.sanitizeDescription(input.description, 500)
        : null;
    }

    if (input.status !== undefined) {
      this.validateEnumValue("Budget status", input.status, budgetStatuses);
      updates.status = input.status;
    }

    if (input.enforcementLevel !== undefined) {
      this.validateEnumValue("Enforcement level", input.enforcementLevel, budgetEnforcementLevels);
      updates.enforcementLevel = input.enforcementLevel;
    }

    if (input.metadata !== undefined) {
      updates.metadata = input.metadata;
    }

    if (
      Object.keys(updates).length === 0 &&
      input.accountIds === undefined &&
      input.categoryIds === undefined &&
      input.groupIds === undefined
    ) {
      throw new ValidationError("No updates provided", "budget");
    }

    return await this.repository.updateBudget(
      id,
      updates,
      {
        accountIds: input.accountIds,
        categoryIds: input.categoryIds,
        groupIds: input.groupIds,
      }
    );
  }

  async listBudgets(status?: Budget["status"]): Promise<BudgetWithRelations[]> {
    if (status) {
      this.validateEnumValue("Budget status", status, budgetStatuses);
    }
    return await this.repository.listBudgets(status ? {status} : {});
  }

  async getBudget(id: number): Promise<BudgetWithRelations> {
    const budget = await this.repository.findById(id);
    if (!budget) {
      throw new NotFoundError("Budget", id);
    }
    return budget;
  }

  async deleteBudget(id: number): Promise<void> {
    await this.repository.deleteBudget(id);
  }

  async duplicateBudget(id: number, newName?: string): Promise<BudgetWithRelations> {
    const originalBudget = await this.getBudget(id);

    const duplicatedName = newName || `${originalBudget.name} (Copy)`;

    return await this.repository.createBudget({
      budget: {
        name: duplicatedName,
        description: originalBudget.description,
        type: originalBudget.type,
        scope: originalBudget.scope,
        status: originalBudget.status,
        enforcementLevel: originalBudget.enforcementLevel,
        metadata: originalBudget.metadata as BudgetMetadata,
      },
      accountIds: originalBudget.accounts?.map(a => a.id),
      categoryIds: originalBudget.categories?.map(c => c.id),
      groupIds: originalBudget.groups?.map(g => g.id),
    });
  }

  async bulkArchive(ids: number[]): Promise<{success: number; failed: number; errors: Array<{id: number; error: string}>}> {
    let success = 0;
    let failed = 0;
    const errors: Array<{id: number; error: string}> = [];

    for (const id of ids) {
      try {
        await this.updateBudget(id, { status: 'archived' });
        success++;
      } catch (error) {
        failed++;
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed, errors };
  }

  async bulkDelete(ids: number[]): Promise<{success: number; failed: number; errors: Array<{id: number; error: string}>}> {
    let success = 0;
    let failed = 0;
    const errors: Array<{id: number; error: string}> = [];

    for (const id of ids) {
      try {
        await this.deleteBudget(id);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
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

  async createEnvelopeBudget(
    budgetData: CreateBudgetRequest,
    envelopeAllocations: EnvelopeAllocationRequest[]
  ): Promise<BudgetWithRelations> {
    if (budgetData.type !== "category-envelope") {
      throw new ValidationError("Envelope allocations only supported for category-envelope budgets", "type");
    }

    const budget = await this.createBudget(budgetData);

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
    return await this.envelopeService.updateEnvelopeAllocation(envelopeId, allocatedAmount, metadata);
  }

  async transferEnvelopeFunds(
    fromEnvelopeId: number,
    toEnvelopeId: number,
    amount: number,
    reason?: string,
    transferredBy: string = "user"
  ) {
    return await this.envelopeService.transferFunds({
      fromEnvelopeId,
      toEnvelopeId,
      amount,
      reason: reason ?? undefined,
      transferredBy,
    });
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

  async estimateEnvelopeRolloverImpact(fromPeriodId: number, toPeriodId: number) {
    return await this.envelopeService.estimateRolloverImpact(fromPeriodId, toPeriodId);
  }

  async analyzeEnvelopeDeficit(envelopeId: number) {
    return await this.envelopeService.analyzeDeficit(envelopeId);
  }

  async createEnvelopeDeficitRecoveryPlan(envelopeId: number) {
    return await this.envelopeService.createDeficitRecoveryPlan(envelopeId);
  }

  async executeEnvelopeDeficitRecovery(plan: any, executedBy?: string) {
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

  async getApplicableBudgets(accountId?: number, categoryId?: number): Promise<BudgetWithRelations[]> {
    return await this.repository.findApplicableBudgets(accountId, categoryId);
  }

  async validateTransactionAgainstStrictBudgets(
    transactionAmount: number,
    accountId?: number,
    categoryId?: number,
    transactionId?: number
  ): Promise<{allowed: boolean; violations: Array<{budgetId: number; budgetName: string; exceeded: number}>}> {
    const applicableBudgets = await this.repository.findApplicableBudgets(accountId, categoryId);
    const strictBudgets = applicableBudgets.filter(b => b.enforcementLevel === 'strict' && b.status === 'active');

    if (strictBudgets.length === 0) {
      return {allowed: true, violations: []};
    }

    const violations: Array<{budgetId: number; budgetName: string; exceeded: number}> = [];

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
    const periods = templates.flatMap(template => template.periods ?? []);
    if (!periods.length) return null;

    return periods.reduce((latest, current) =>
      latest.endDate > current.endDate ? latest : current
    );
  }

  async getGoalProgress(budgetId: number): Promise<GoalProgress> {
    return await this.goalTrackingService.calculateGoalProgress(budgetId);
  }

  async createGoalContributionPlan(
    budgetId: number,
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    customAmount?: number
  ): Promise<ContributionPlan> {
    return await this.goalTrackingService.createContributionPlan(budgetId, frequency, customAmount);
  }

  async linkScheduleToGoal(budgetId: number, scheduleId: number): Promise<BudgetWithRelations> {
    return await this.goalTrackingService.linkScheduleToGoal(budgetId, scheduleId);
  }

  async forecastBudgetImpact(budgetId: number, daysAhead?: number): Promise<BudgetForecast> {
    return await this.forecastService.forecastBudgetImpact(budgetId, daysAhead);
  }

  async autoAllocateScheduledExpenses(budgetId: number): Promise<BudgetWithRelations> {
    return await this.forecastService.autoAllocateScheduledExpenses(budgetId);
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

  async updateBudgetGroup(id: number, updates: {
    name?: string;
    description?: string | null;
    parentId?: number | null;
    spendingLimit?: number | null;
  }): Promise<BudgetGroup> {
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

  // Period Template Methods

  async createPeriodTemplate(data: {
    budgetId: number;
    type: BudgetPeriodTemplate["type"];
    intervalCount?: number;
    startDayOfWeek?: number;
    startDayOfMonth?: number;
    startMonth?: number;
    timezone?: string;
  }): Promise<BudgetPeriodTemplate> {
    // Validate budget exists
    const budget = await this.repository.findById(data.budgetId);
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

    return await this.repository.createPeriodTemplate({
      budgetId: data.budgetId,
      type: data.type,
      intervalCount: data.intervalCount ?? 1,
      startDayOfWeek: data.startDayOfWeek ?? null,
      startDayOfMonth: data.startDayOfMonth ?? null,
      startMonth: data.startMonth ?? null,
      timezone: data.timezone ?? null,
    });
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
    if (updates.startDayOfWeek !== undefined) sanitizedUpdates.startDayOfWeek = updates.startDayOfWeek;
    if (updates.startDayOfMonth !== undefined) sanitizedUpdates.startDayOfMonth = updates.startDayOfMonth;
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
    referenceDate: DateValue = defaultCurrentDate
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

    const start = reference.subtract({days: daysToSubtract});
    const end = start.add({days: interval * 7}).subtract({days: 1});

    return {start, end, timezone};
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
    const end = start.add({months: interval}).subtract({days: 1});

    return {start, end, timezone};
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

    if (
      reference.month === startMonth &&
      reference.day < startDay
    ) {
      referenceMonthIndex -= 1;
    }

    // Align reference against anchor month
    const anchor = startMonth - 1;
    const relativeIndex = referenceMonthIndex - anchor;
    const remainder = this.mod(relativeIndex, monthsPerPeriod);
    const startMonthIndex = referenceMonthIndex - remainder;

    const start = this.dateFromMonthIndex(startMonthIndex, startDay);
    const end = start.add({months: monthsPerPeriod}).subtract({days: 1});

    return {start, end, timezone};
  }

  private static normalizeIsoDay(day: number): number {
    const normalized = ((day - 1) % 7 + 7) % 7;
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
    const month = (this.mod(monthIndex, 12)) + 1;

    const daysInMonth = this.daysInMonth(year, month);
    const clampedDay = Math.min(day, daysInMonth);
    return new CalendarDate(year, month, clampedDay);
  }

  private static daysInMonth(year: number, month: number): number {
    const firstOfMonth = new CalendarDate(year, month, 1);
    const endOfMonth = firstOfMonth.add({months: 1}).subtract({days: 1});
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

export class BudgetPeriodService {
  constructor(private repository: BudgetRepository = new BudgetRepository()) {}

  async ensureInstanceForDate(
    templateId: number,
    options: EnsurePeriodInstanceOptions = {}
  ): Promise<BudgetPeriodInstance> {
    const template = await this.repository.findTemplateById(templateId);
    if (!template) {
      throw new NotFoundError("Budget period template", templateId);
    }

    const boundary = BudgetPeriodCalculator.calculatePeriodBoundaries(
      template,
      options.referenceDate ?? defaultCurrentDate
    );

    const startDate = boundary.start.toString();
    const endDate = boundary.end.toString();

    const existing = await this.repository.findInstanceByRange(templateId, startDate, endDate);
    if (existing) {
      return existing;
    }

    const parentBudget = await this.repository.findById(template.budgetId);
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
  status: 'on-track' | 'ahead' | 'behind' | 'at-risk' | 'completed';
}

export interface ContributionPlan {
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  numberOfPayments: number;
  totalAmount: number;
  projectedCompletionDate: string;
}

export class GoalTrackingService {
  constructor(private repository: BudgetRepository = new BudgetRepository()) {}

  async calculateGoalProgress(budgetId: number): Promise<GoalProgress> {
    const budget = await this.repository.findById(budgetId);
    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    if (budget.type !== 'goal-based') {
      throw new ValidationError('Budget is not a goal-based budget', 'type');
    }

    const goalMetadata = budget.metadata?.goal;
    if (!goalMetadata) {
      throw new ValidationError('Budget does not have goal metadata', 'goal');
    }

    const currentAmount = await this.getCurrentGoalAmount(budgetId, budget);
    const targetAmount = goalMetadata.targetAmount;
    const remainingAmount = Math.max(0, targetAmount - currentAmount);
    const percentComplete = Math.min(100, (currentAmount / targetAmount) * 100);

    const targetDate = new Date(goalMetadata.targetDate);
    const today = new Date();
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const requiredContribution = this.calculateRequiredContributions(remainingAmount, daysRemaining);

    const {status, projectedCompletionDate} = this.calculateGoalStatus(
      currentAmount,
      targetAmount,
      daysRemaining,
      goalMetadata
    );

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      targetAmount,
      currentAmount,
      remainingAmount,
      percentComplete,
      targetDate: goalMetadata.targetDate,
      daysRemaining,
      isOnTrack: status === 'on-track' || status === 'ahead',
      requiredContribution,
      projectedCompletionDate,
      status,
    };
  }

  private async getCurrentGoalAmount(budgetId: number, budget: BudgetWithRelations): Promise<number> {
    const goalMetadata = budget.metadata?.goal;
    const startDate = goalMetadata?.startDate || budget.createdAt;

    const relevantCategories = budget.categories?.map(c => c.id) || [];
    const relevantAccounts = budget.accounts?.map(a => a.id) || [];

    if (relevantAccounts.length === 0 && relevantCategories.length === 0) {
      return 0;
    }

    const accountTotal = relevantAccounts.length > 0
      ? await this.repository.getAccountsBalance(relevantAccounts)
      : 0;

    const categoryTotal = relevantCategories.length > 0
      ? await this.repository.getCategorySpendingSince(relevantCategories, startDate)
      : 0;

    return accountTotal + categoryTotal;
  }

  private calculateRequiredContributions(remainingAmount: number, daysRemaining: number): {
    daily: number;
    weekly: number;
    monthly: number;
  } {
    if (daysRemaining <= 0 || remainingAmount <= 0) {
      return {daily: 0, weekly: 0, monthly: 0};
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
    goalMetadata: NonNullable<BudgetMetadata['goal']>
  ): {status: GoalProgress['status']; projectedCompletionDate?: string} {
    if (currentAmount >= targetAmount) {
      return {status: 'completed'};
    }

    if (daysRemaining <= 0) {
      return {status: 'at-risk'};
    }

    const percentComplete = (currentAmount / targetAmount) * 100;
    const elapsedDays = this.getElapsedDays(goalMetadata.startDate);
    const totalDays = elapsedDays + daysRemaining;
    const expectedPercent = (elapsedDays / totalDays) * 100;

    if (percentComplete >= expectedPercent + 10) {
      const daysToComplete = Math.ceil((targetAmount - currentAmount) / (currentAmount / elapsedDays));
      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + daysToComplete);
      return {
        status: 'ahead',
        projectedCompletionDate: projectedDate.toISOString().split('T')[0],
      };
    }

    if (percentComplete < expectedPercent - 20) {
      return {status: 'at-risk'};
    }

    if (percentComplete < expectedPercent - 10) {
      return {status: 'behind'};
    }

    return {status: 'on-track'};
  }

  private getElapsedDays(startDate?: string): number {
    if (!startDate) return 30;
    const start = new Date(startDate);
    const now = new Date();
    return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  async createContributionPlan(
    budgetId: number,
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    customAmount?: number
  ): Promise<ContributionPlan> {
    const progress = await this.calculateGoalProgress(budgetId);

    if (progress.status === 'completed') {
      throw new ValidationError('Goal is already completed', 'goal');
    }

    let amount: number;
    let daysPerPayment: number;

    switch (frequency) {
      case 'weekly':
        amount = customAmount ?? progress.requiredContribution.weekly;
        daysPerPayment = 7;
        break;
      case 'monthly':
        amount = customAmount ?? progress.requiredContribution.monthly;
        daysPerPayment = 30;
        break;
      case 'quarterly':
        amount = customAmount ?? progress.requiredContribution.monthly * 3;
        daysPerPayment = 90;
        break;
      case 'yearly':
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
      projectedCompletionDate: completionDate.toISOString().split('T')[0],
    };
  }

  async linkScheduleToGoal(budgetId: number, scheduleId: number): Promise<BudgetWithRelations> {
    const budget = await this.repository.findById(budgetId);
    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    if (budget.type !== 'goal-based') {
      throw new ValidationError('Budget is not a goal-based budget', 'type');
    }

    const metadata = budget.metadata || {};
    const goal = metadata.goal;

    if (!goal) {
      throw new ValidationError('Budget does not have goal metadata', 'goal');
    }

    goal.linkedScheduleId = scheduleId;
    goal.autoContribute = true;

    return await this.repository.updateBudget(budgetId, {metadata}, {});
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
  status: 'sufficient' | 'tight' | 'exceeded';
}

export class BudgetForecastService {
  constructor(private repository: BudgetRepository = new BudgetRepository()) {}

  async forecastBudgetImpact(budgetId: number, daysAhead: number = 30): Promise<BudgetForecast> {
    const budget = await this.repository.findById(budgetId);
    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + daysAhead);

    const periodStart = now.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];

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

    let status: BudgetForecast['status'] = 'sufficient';
    if (projectedBalance < 0) {
      status = 'exceeded';
    } else if (projectedBalance < allocatedAmount * 0.1) {
      status = 'tight';
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
    const {schedules} = schedulesModule;
    const results = await db.select().from(schedules).where(eq(schedules.budgetId, budgetId));
    return results;
  }

  private async forecastSchedule(
    schedule: any,
    periodStart: string,
    periodEnd: string
  ): Promise<ScheduledExpenseForecast | null> {
    if (!schedule.dateId || schedule.status !== 'active') {
      return null;
    }

    const scheduleDatesModule = await import("$lib/schema/schedule-dates");
    const {scheduleDates} = scheduleDatesModule;

    const dateConfig = await db.query.scheduleDates.findFirst({
      where: eq(scheduleDates.id, schedule.dateId),
    });

    if (!dateConfig) {
      return null;
    }

    const occurrencesInPeriod = this.calculateOccurrences(dateConfig, periodStart, periodEnd);
    const amount = schedule.amount_type === 'range'
      ? (schedule.amount + schedule.amount_2) / 2
      : schedule.amount;

    const totalImpact = Math.abs(amount) * occurrencesInPeriod;

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      nextOccurrence: this.calculateNextOccurrence(dateConfig, periodStart),
      amount,
      frequency: dateConfig.frequency || 'once',
      occurrencesInPeriod,
      totalImpact,
    };
  }

  private calculateOccurrences(dateConfig: any, periodStart: string, periodEnd: string): number {
    const frequency = dateConfig.frequency;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    switch (frequency) {
      case 'daily':
        return daysDiff;
      case 'weekly':
        return Math.floor(daysDiff / 7);
      case 'monthly':
        return Math.floor(daysDiff / 30);
      case 'yearly':
        return Math.floor(daysDiff / 365);
      default:
        return 1;
    }
  }

  private calculateNextOccurrence(dateConfig: any, fromDate: string): string {
    const startDate = dateConfig.startDate || fromDate;
    return startDate;
  }

  async autoAllocateScheduledExpenses(budgetId: number): Promise<BudgetWithRelations> {
    const forecast = await this.forecastBudgetImpact(budgetId, 30);
    const budget = await this.repository.findById(budgetId);

    if (!budget) {
      throw new NotFoundError("Budget", budgetId);
    }

    const metadata = {
      ...budget.metadata,
      allocatedAmount: forecast.projectedScheduledExpenses,
    };

    return await this.repository.updateBudget(budgetId, {metadata}, {});
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

export class BudgetTransactionService {
  constructor(private repository: BudgetRepository = new BudgetRepository()) {}

  async isTransactionFullyAllocated(transactionId: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const {allocations, transaction} = await this.fetchTransactionContext(tx, transactionId);
      const totalAllocated = allocations.reduce((sum, allocation) => sum + Number(allocation.allocatedAmount || 0), 0);
      return Math.abs(totalAllocated - Number(transaction.amount || 0)) < ALLOCATION_PRECISION;
    });
  }

  async validateProposedAllocation(
    transactionId: number,
    newAmount: number,
    excludeAllocationId?: number
  ): Promise<AllocationValidationResult> {
    return await db.transaction(async (tx) => {
      const {allocations, transaction} = await this.fetchTransactionContext(tx, transactionId);
      return this.validateWithContext(allocations, transaction, newAmount, excludeAllocationId);
    });
  }

  async createAllocation(allocation: NewBudgetTransaction): Promise<BudgetTransaction> {
    return await db.transaction(async (tx) => {
      const {allocations, transaction} = await this.fetchTransactionContext(tx, allocation.transactionId);
      const validation = this.validateWithContext(allocations, transaction, allocation.allocatedAmount);
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

      const {allocations, transaction} = await this.fetchTransactionContext(tx, existing.transactionId);
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
  ): Promise<{allocations: BudgetTransaction[]; transaction: Transaction}> {
    const allocations = await client.select().from(budgetTransactions).where(eq(budgetTransactions.transactionId, transactionId));

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
      errors.push(`Allocation amount ${newAmount} would exceed remaining transaction amount. Remaining: ${remaining}.`);
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
