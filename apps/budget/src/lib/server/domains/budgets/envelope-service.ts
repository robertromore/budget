import { budgetPeriodInstances, budgetTransactions } from "$lib/schema/budgets";
import {
  envelopeAllocations,
  envelopeRolloverHistory,
  envelopeTransfers,
  type EnvelopeAllocation,
  type EnvelopeRolloverHistory,
  type EnvelopeStatus,
  type EnvelopeTransfer,
  type RolloverMode,
} from "$lib/schema/budgets/envelope-allocations";
import { transactions } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { DatabaseError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { nowISOString } from "$lib/utils/dates";
import { and, asc, desc, eq, sum } from "drizzle-orm";
import {
  DeficitRecoveryService,
  type DeficitAnalysis,
  type DeficitPolicy,
  type DeficitRecoveryPlan,
} from "./deficit-recovery";
import { BudgetRepository, type DbClient } from "./repository";
import { RolloverCalculator, type RolloverPolicy } from "./rollover-calculator";

export interface EnvelopeCalculationResult {
  allocatedAmount: number;
  spentAmount: number;
  rolloverAmount: number;
  availableAmount: number;
  deficitAmount: number;
  status: EnvelopeStatus;
}

export interface EnvelopeAllocationRequest {
  budgetId: number;
  categoryId: number;
  periodInstanceId: number;
  allocatedAmount: number;
  rolloverMode?: RolloverMode;
  metadata?: Record<string, unknown>;
}

export interface EnvelopeTransferRequest {
  fromEnvelopeId: number;
  toEnvelopeId: number;
  amount: number;
  reason?: string;
  transferredBy: string;
}

export interface RolloverOptions {
  maxRolloverMonths?: number;
  resetOnLimitExceeded?: boolean;
  preserveDeficits?: boolean;
}

/**
 * Envelope service for envelope budgeting allocation and tracking
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class EnvelopeService {
  constructor(
    private repository: BudgetRepository,
    private rolloverCalculator: RolloverCalculator,
    private deficitRecoveryService: DeficitRecoveryService
  ) {}

  async createEnvelopeAllocation(input: EnvelopeAllocationRequest): Promise<EnvelopeAllocation> {
    const allocatedAmount = this.validateAmount(input.allocatedAmount, "Allocated amount");

    const rolloverMode = input.rolloverMode ?? "unlimited";
    this.validateRolloverMode(rolloverMode);

    await this.validateUniqueAllocation(input.budgetId, input.categoryId, input.periodInstanceId);

    const calculation = await this.calculateEnvelopeStatus(
      input.budgetId,
      input.categoryId,
      input.periodInstanceId,
      allocatedAmount
    );

    const [envelope] = await db
      .insert(envelopeAllocations)
      .values({
        budgetId: input.budgetId,
        categoryId: input.categoryId,
        periodInstanceId: input.periodInstanceId,
        allocatedAmount,
        spentAmount: calculation.spentAmount,
        rolloverAmount: calculation.rolloverAmount,
        availableAmount: calculation.availableAmount,
        deficitAmount: calculation.deficitAmount,
        status: calculation.status,
        rolloverMode,
        metadata: input.metadata ?? {},
        lastCalculated: nowISOString(),
      })
      .returning();

    if (!envelope) {
      throw new DatabaseError("Failed to create envelope allocation", "createEnvelope");
    }

    return envelope;
  }

  async updateEnvelopeAllocation(
    envelopeId: number,
    allocatedAmount: number,
    metadata?: Record<string, unknown>
  ): Promise<EnvelopeAllocation> {
    const validatedAmount = this.validateAmount(allocatedAmount, "Allocated amount");

    const existing = await this.findEnvelopeById(envelopeId);

    const calculation = await this.calculateEnvelopeStatus(
      existing.budgetId,
      existing.categoryId,
      existing.periodInstanceId,
      validatedAmount,
      existing.rolloverAmount
    );

    const [updated] = await db
      .update(envelopeAllocations)
      .set({
        allocatedAmount: validatedAmount,
        availableAmount: calculation.availableAmount,
        deficitAmount: calculation.deficitAmount,
        status: calculation.status,
        metadata: metadata ?? existing.metadata,
        lastCalculated: nowISOString(),
      })
      .where(eq(envelopeAllocations.id, envelopeId))
      .returning();

    if (!updated) {
      throw new DatabaseError("Failed to update envelope allocation", "updateEnvelope");
    }

    return updated;
  }

  async updateEnvelopeSettings(
    envelopeId: number,
    settings: {
      rolloverMode?: RolloverMode;
      metadata?: Record<string, unknown>;
    }
  ): Promise<EnvelopeAllocation> {
    const existing = await this.findEnvelopeById(envelopeId);

    const updateData: any = {
      updatedAt: nowISOString(),
    };

    if (settings.rolloverMode !== undefined) {
      updateData.rolloverMode = settings.rolloverMode;
    }

    if (settings.metadata !== undefined) {
      updateData.metadata = settings.metadata;
    }

    const [updated] = await db
      .update(envelopeAllocations)
      .set(updateData)
      .where(eq(envelopeAllocations.id, envelopeId))
      .returning();

    if (!updated) {
      throw new DatabaseError("Failed to update envelope settings", "updateEnvelopeSettings");
    }

    return updated;
  }

  async transferFunds(input: EnvelopeTransferRequest): Promise<EnvelopeTransfer> {
    const amount = this.validateAmount(input.amount, "Transfer amount");

    if (amount <= 0) {
      throw new ValidationError("Transfer amount must be positive", "amount");
    }

    if (input.fromEnvelopeId === input.toEnvelopeId) {
      throw new ValidationError("Cannot transfer to the same envelope", "transfer");
    }

    const reason = input.reason
      ? InputSanitizer.sanitizeText(input.reason, {
          maxLength: 200,
          fieldName: "Transfer reason",
        })
      : null;

    const transferredBy = InputSanitizer.sanitizeText(input.transferredBy, {
      required: true,
      maxLength: 100,
      fieldName: "Transferred by",
    });

    return await db.transaction(async (tx) => {
      const fromEnvelope = await this.findEnvelopeById(input.fromEnvelopeId, tx);
      const toEnvelope = await this.findEnvelopeById(input.toEnvelopeId, tx);

      if (fromEnvelope.availableAmount < amount) {
        throw new ValidationError(
          `Insufficient funds in source envelope. Available: ${fromEnvelope.availableAmount}`,
          "transfer"
        );
      }

      await tx
        .update(envelopeAllocations)
        .set({
          availableAmount: fromEnvelope.availableAmount - amount,
          status: this.calculateStatus(
            fromEnvelope.availableAmount - amount,
            fromEnvelope.deficitAmount
          ),
          lastCalculated: nowISOString(),
        })
        .where(eq(envelopeAllocations.id, input.fromEnvelopeId));

      await tx
        .update(envelopeAllocations)
        .set({
          availableAmount: toEnvelope.availableAmount + amount,
          status: this.calculateStatus(
            toEnvelope.availableAmount + amount,
            toEnvelope.deficitAmount
          ),
          lastCalculated: nowISOString(),
        })
        .where(eq(envelopeAllocations.id, input.toEnvelopeId));

      const [transfer] = await tx
        .insert(envelopeTransfers)
        .values({
          fromEnvelopeId: input.fromEnvelopeId,
          toEnvelopeId: input.toEnvelopeId,
          amount,
          reason,
          transferredBy,
        })
        .returning();

      if (!transfer) {
        throw new DatabaseError("Failed to record transfer", "transferFunds");
      }

      return transfer;
    });
  }

  async processRollover(
    fromPeriodId: number,
    toPeriodId: number,
    options: RolloverOptions = {}
  ): Promise<EnvelopeRolloverHistory[]> {
    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const policy: RolloverPolicy = Object.fromEntries(
      Object.entries({
        maxRolloverMonths: options.maxRolloverMonths,
        resetOnLimitExceeded: options.resetOnLimitExceeded,
        preserveDeficits: options.preserveDeficits,
      }).filter(([_, v]) => v !== undefined)
    ) as RolloverPolicy;

    return await this.getRolloverHistoryForPeriod(fromPeriodId, toPeriodId);
  }

  async calculateRolloverPreview(
    fromPeriodId: number,
    toPeriodId: number,
    options: RolloverOptions = {}
  ) {
    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const policy: RolloverPolicy = Object.fromEntries(
      Object.entries({
        maxRolloverMonths: options.maxRolloverMonths,
        resetOnLimitExceeded: options.resetOnLimitExceeded,
        preserveDeficits: options.preserveDeficits,
      }).filter(([_, v]) => v !== undefined)
    ) as RolloverPolicy;

    return await this.rolloverCalculator.calculateBulkRollover({
      fromPeriodId,
      toPeriodId,
      policy,
      dryRun: true,
    });
  }

  async getRolloverSummary(periodId: number) {
    return await this.rolloverCalculator.getRolloverSummaryForPeriod(periodId);
  }

  async getRolloverHistoryForEnvelope(envelopeId: number, limit: number = 12) {
    return await this.rolloverCalculator.getRolloverHistoryForEnvelope(envelopeId, limit);
  }

  async getRolloverHistoryForBudget(budgetId: number, limit: number = 50) {
    return await this.rolloverCalculator.getRolloverHistoryForBudget(budgetId, limit);
  }

  async estimateRolloverImpact(
    fromPeriodId: number,
    toPeriodId: number,
    options: RolloverOptions = {}
  ) {
    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const policy: RolloverPolicy = Object.fromEntries(
      Object.entries({
        maxRolloverMonths: options.maxRolloverMonths,
        resetOnLimitExceeded: options.resetOnLimitExceeded,
        preserveDeficits: options.preserveDeficits,
      }).filter(([_, v]) => v !== undefined)
    ) as RolloverPolicy;

    return await this.rolloverCalculator.estimateRolloverImpact(fromPeriodId, toPeriodId, policy);
  }

  async analyzeDeficit(envelopeId: number, policy?: DeficitPolicy): Promise<DeficitAnalysis> {
    return await this.deficitRecoveryService.analyzeDeficit(envelopeId, policy);
  }

  async createDeficitRecoveryPlan(
    envelopeId: number,
    policy?: DeficitPolicy
  ): Promise<DeficitRecoveryPlan> {
    return await this.deficitRecoveryService.createRecoveryPlan(envelopeId, policy);
  }

  async executeDeficitRecovery(plan: DeficitRecoveryPlan, executedBy: string = "user") {
    return await this.deficitRecoveryService.executeRecoveryPlan(plan, executedBy);
  }

  async getDeficitEnvelopes(budgetId: number): Promise<EnvelopeAllocation[]> {
    return await this.deficitRecoveryService.getDeficitEnvelopes(budgetId);
  }

  async getSurplusEnvelopes(
    budgetId: number,
    minimumSurplus?: number
  ): Promise<EnvelopeAllocation[]> {
    return await this.deficitRecoveryService.getSurplusEnvelopes(budgetId, minimumSurplus);
  }

  async generateBulkDeficitRecovery(budgetId: number, policy?: DeficitPolicy) {
    return await this.deficitRecoveryService.generateBulkRecoveryPlan(budgetId, policy);
  }

  async detectDeficitRisk(envelopeId: number): Promise<{
    riskLevel: "low" | "medium" | "high" | "critical";
    daysToDeficit: number;
    projectedDeficit: number;
    recommendations: string[];
  }> {
    const envelope = await this.findEnvelopeById(envelopeId);

    // Simple risk assessment based on current status
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    let daysToDeficit = Infinity;
    let projectedDeficit = 0;
    const recommendations: string[] = [];

    if (envelope.deficitAmount > 0) {
      riskLevel = "critical";
      daysToDeficit = 0;
      projectedDeficit = envelope.deficitAmount;
      recommendations.push("Immediate deficit recovery required");
      recommendations.push("Consider transferring funds from surplus envelopes");
    } else if (envelope.availableAmount < 50) {
      riskLevel = envelope.availableAmount < 10 ? "high" : "medium";
      // Estimate days until deficit based on spending rate
      const avgSpending = envelope.spentAmount / 30; // Rough daily spending
      daysToDeficit =
        avgSpending > 0 ? Math.floor(envelope.availableAmount / avgSpending) : Infinity;
      projectedDeficit = Math.max(0, avgSpending * 30 - envelope.availableAmount);

      if (riskLevel === "high") {
        recommendations.push("Reduce spending in this category");
        recommendations.push("Consider reallocating funds from other envelopes");
      } else {
        recommendations.push("Monitor spending closely");
        recommendations.push("Consider reducing discretionary expenses");
      }
    } else {
      recommendations.push("Envelope is healthy");
      recommendations.push("Continue monitoring spending patterns");
    }

    return {
      riskLevel,
      daysToDeficit: Math.max(0, daysToDeficit),
      projectedDeficit,
      recommendations,
    };
  }

  private async getRolloverHistoryForPeriod(
    fromPeriodId: number,
    toPeriodId: number
  ): Promise<EnvelopeRolloverHistory[]> {
    return await db
      .select()
      .from(envelopeRolloverHistory)
      .where(
        and(
          eq(envelopeRolloverHistory.fromPeriodId, fromPeriodId),
          eq(envelopeRolloverHistory.toPeriodId, toPeriodId)
        )
      )
      .orderBy(desc(envelopeRolloverHistory.processedAt));
  }

  async recalculateEnvelope(envelopeId: number): Promise<EnvelopeAllocation> {
    const envelope = await this.findEnvelopeById(envelopeId);

    const calculation = await this.calculateEnvelopeStatus(
      envelope.budgetId,
      envelope.categoryId,
      envelope.periodInstanceId,
      envelope.allocatedAmount,
      envelope.rolloverAmount
    );

    const [updated] = await db
      .update(envelopeAllocations)
      .set({
        spentAmount: calculation.spentAmount,
        availableAmount: calculation.availableAmount,
        deficitAmount: calculation.deficitAmount,
        status: calculation.status,
        lastCalculated: nowISOString(),
      })
      .where(eq(envelopeAllocations.id, envelopeId))
      .returning();

    if (!updated) {
      throw new DatabaseError("Failed to recalculate envelope", "recalculateEnvelope");
    }

    return updated;
  }

  async getEnvelopesForBudget(budgetId: number): Promise<EnvelopeAllocation[]> {
    return await db
      .select()
      .from(envelopeAllocations)
      .where(eq(envelopeAllocations.budgetId, budgetId))
      .orderBy(asc(envelopeAllocations.categoryId));
  }

  async getEnvelopesForPeriod(periodInstanceId: number): Promise<EnvelopeAllocation[]> {
    return await db
      .select()
      .from(envelopeAllocations)
      .where(eq(envelopeAllocations.periodInstanceId, periodInstanceId))
      .orderBy(asc(envelopeAllocations.categoryId));
  }

  private async calculateEnvelopeStatus(
    budgetId: number,
    categoryId: number,
    periodInstanceId: number,
    allocatedAmount: number,
    rolloverAmount: number = 0
  ): Promise<EnvelopeCalculationResult> {
    const period = await db.query.budgetPeriodInstances.findFirst({
      where: eq(budgetPeriodInstances.id, periodInstanceId),
    });

    if (!period) {
      throw new NotFoundError("Budget period instance", periodInstanceId);
    }

    const spentAmountResult = await db
      .select({
        total: sum(budgetTransactions.allocatedAmount),
      })
      .from(budgetTransactions)
      .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
      .where(
        and(
          eq(budgetTransactions.budgetId, budgetId)
          // Note: We'd need category mapping in budget transactions for full category filtering
          // This is a simplified version
        )
      );

    const spentAmount = Math.abs(Number(spentAmountResult[0]?.total ?? 0));
    const totalAvailable = allocatedAmount + rolloverAmount;
    const availableAmount = Math.max(0, totalAvailable - spentAmount);
    const deficitAmount = Math.max(0, spentAmount - totalAvailable);
    const status = this.calculateStatus(availableAmount, deficitAmount);

    return {
      allocatedAmount,
      spentAmount,
      rolloverAmount,
      availableAmount,
      deficitAmount,
      status,
    };
  }

  private calculateStatus(availableAmount: number, deficitAmount: number): EnvelopeStatus {
    if (deficitAmount > 0) return "overspent";
    if (availableAmount === 0) return "depleted";
    return "active";
  }

  private async findEnvelopeById(
    envelopeId: number,
    client: DbClient = db
  ): Promise<EnvelopeAllocation> {
    const envelope = await client
      .select()
      .from(envelopeAllocations)
      .where(eq(envelopeAllocations.id, envelopeId))
      .limit(1);

    if (!envelope || envelope.length === 0) {
      throw new NotFoundError("Envelope allocation", envelopeId);
    }

    return envelope[0] as EnvelopeAllocation;
  }

  private async validateUniqueAllocation(
    budgetId: number,
    categoryId: number,
    periodInstanceId: number
  ): Promise<void> {
    const existing = await db
      .select()
      .from(envelopeAllocations)
      .where(
        and(
          eq(envelopeAllocations.budgetId, budgetId),
          eq(envelopeAllocations.categoryId, categoryId),
          eq(envelopeAllocations.periodInstanceId, periodInstanceId)
        )
      );

    if (existing.length > 0) {
      throw new ValidationError(
        "Envelope allocation already exists for this budget, category, and period",
        "allocation"
      );
    }
  }

  private validateAmount(amount: number, fieldName: string): number {
    if (!Number.isFinite(amount)) {
      throw new ValidationError(`${fieldName} must be a valid number`, "amount");
    }
    if (amount < 0) {
      throw new ValidationError(`${fieldName} cannot be negative`, "amount");
    }
    return amount;
  }

  private validateRolloverMode(mode: RolloverMode): void {
    const validModes: RolloverMode[] = ["unlimited", "reset", "limited"];
    if (!validModes.includes(mode)) {
      throw new ValidationError(`Invalid rollover mode: ${mode}`, "rolloverMode");
    }
  }
}
