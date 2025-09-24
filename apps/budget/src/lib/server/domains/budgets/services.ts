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
    private envelopeService: EnvelopeService = new EnvelopeService()
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
