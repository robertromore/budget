import {budgetPeriodInstances} from "$lib/schema/budgets";
import {
  type EnvelopeAllocation,
  type EnvelopeRolloverHistory,
  type RolloverMode,
  envelopeAllocations,
  envelopeRolloverHistory,
} from "$lib/schema/budgets/envelope-allocations";
import {db} from "$lib/server/db";
import {NotFoundError, ValidationError} from "$lib/server/shared/types/errors";
import {and, asc, desc, eq, inArray, sql} from "drizzle-orm";

export interface RolloverCalculationResult {
  envelopeId: number;
  categoryId: number;
  currentBalance: number;
  rolloverAmount: number;
  resetAmount: number;
  rolloverMode: RolloverMode;
  rolloverReason: string;
  hasDeficit: boolean;
  deficitAmount: number;
  rolloverMonthsUsed: number;
  maxRolloverMonths?: number;
}

export interface RolloverPolicy {
  maxRolloverMonths?: number;
  resetOnLimitExceeded?: boolean;
  preserveDeficits?: boolean;
  rolloverDeficits?: boolean;
  emergencyFundPriority?: boolean;
  autoRefillAmount?: number;
}

export interface BulkRolloverOptions {
  fromPeriodId: number;
  toPeriodId: number;
  policy?: RolloverPolicy;
  selectedEnvelopeIds?: number[];
  dryRun?: boolean;
}

export interface RolloverSummary {
  totalEnvelopes: number;
  totalRolledAmount: number;
  totalResetAmount: number;
  envelopesWithDeficits: number;
  totalDeficits: number;
  rolloversByMode: Record<RolloverMode, number>;
  calculations: RolloverCalculationResult[];
}

export class RolloverCalculator {
  async calculateBulkRollover(options: BulkRolloverOptions): Promise<RolloverSummary> {
    const {fromPeriodId, toPeriodId, policy = {}, selectedEnvelopeIds, dryRun = false} = options;

    await this.validatePeriods(fromPeriodId, toPeriodId);

    const envelopes = await this.getEnvelopesForRollover(fromPeriodId, selectedEnvelopeIds);
    const calculations: RolloverCalculationResult[] = [];
    const rolloversByMode: Record<RolloverMode, number> = {
      unlimited: 0,
      reset: 0,
      limited: 0,
    };

    let totalRolledAmount = 0;
    let totalResetAmount = 0;
    let envelopesWithDeficits = 0;
    let totalDeficits = 0;

    for (const envelope of envelopes) {
      const calculation = await this.calculateEnvelopeRollover(envelope, policy);
      calculations.push(calculation);

      rolloversByMode[calculation.rolloverMode]++;
      totalRolledAmount += calculation.rolloverAmount;
      totalResetAmount += calculation.resetAmount;

      if (calculation.hasDeficit) {
        envelopesWithDeficits++;
        totalDeficits += calculation.deficitAmount;
      }
    }

    if (!dryRun) {
      await this.executeBulkRollover(calculations, fromPeriodId, toPeriodId);
    }

    return {
      totalEnvelopes: envelopes.length,
      totalRolledAmount,
      totalResetAmount,
      envelopesWithDeficits,
      totalDeficits,
      rolloversByMode,
      calculations,
    };
  }

  async calculateEnvelopeRollover(
    envelope: EnvelopeAllocation,
    policy: RolloverPolicy = {}
  ): Promise<RolloverCalculationResult> {
    const currentBalance = envelope.availableAmount;
    const hasDeficit = envelope.deficitAmount > 0;
    const deficitAmount = envelope.deficitAmount;

    let rolloverAmount = 0;
    let resetAmount = 0;
    let rolloverReason = "";

    const rolloverHistory = await this.getRolloverHistory(envelope.id);
    const rolloverMonthsUsed = rolloverHistory.length;

    switch (envelope.rolloverMode) {
      case "reset":
        resetAmount = currentBalance;
        rolloverReason = "Reset mode - balance cleared";
        break;

      case "limited":
        const maxMonths =
          policy.maxRolloverMonths ?? (envelope.metadata as any)?.maxRolloverMonths ?? 3;

        if (rolloverMonthsUsed >= maxMonths) {
          if (policy.resetOnLimitExceeded) {
            resetAmount = currentBalance;
            rolloverReason = `Rollover limit exceeded (${maxMonths} months)`;
          } else {
            rolloverAmount = currentBalance;
            rolloverReason = `Rollover despite limit (${rolloverMonthsUsed}/${maxMonths} months)`;
          }
        } else {
          rolloverAmount = currentBalance;
          rolloverReason = `Limited rollover (${rolloverMonthsUsed + 1}/${maxMonths} months)`;
        }
        break;

      case "unlimited":
      default:
        rolloverAmount = currentBalance;
        rolloverReason = "Unlimited rollover";
        break;
    }

    // Handle deficits based on policy
    if (hasDeficit) {
      if (policy.rolloverDeficits) {
        rolloverAmount -= deficitAmount; // Negative rollover for deficits
        rolloverReason += " (includes deficit)";
      } else if (policy.preserveDeficits) {
        rolloverReason += " (deficit preserved separately)";
      }
    }

    // Emergency fund special handling
    const isEmergencyFund = (envelope.metadata as any)?.isEmergencyFund;
    if (isEmergencyFund && policy.emergencyFundPriority) {
      const autoRefill = policy.autoRefillAmount ?? (envelope.metadata as any)?.autoRefill ?? 0;
      if (autoRefill > 0 && rolloverAmount < autoRefill) {
        rolloverAmount = autoRefill;
        rolloverReason += ` (emergency fund auto-refilled to ${autoRefill})`;
      }
    }

    return {
      envelopeId: envelope.id,
      categoryId: envelope.categoryId,
      currentBalance,
      rolloverAmount,
      resetAmount,
      rolloverMode: envelope.rolloverMode,
      rolloverReason,
      hasDeficit,
      deficitAmount,
      rolloverMonthsUsed,
      maxRolloverMonths:
        envelope.rolloverMode === "limited"
          ? (policy.maxRolloverMonths ?? (envelope.metadata as any)?.maxRolloverMonths ?? 3)
          : undefined,
    };
  }

  async executeRollover(
    envelopeId: number,
    fromPeriodId: number,
    toPeriodId: number,
    rolloverAmount: number,
    resetAmount: number = 0
  ): Promise<EnvelopeRolloverHistory> {
    return await db.transaction(async (tx) => {
      // Record the rollover in history
      const [rolloverRecord] = await tx
        .insert(envelopeRolloverHistory)
        .values({
          envelopeId,
          fromPeriodId,
          toPeriodId,
          rolledAmount: rolloverAmount,
          resetAmount,
        })
        .returning();

      if (rolloverAmount !== 0) {
        // Create or update envelope for new period
        await this.ensureEnvelopeForNewPeriod(tx, envelopeId, toPeriodId, rolloverAmount);
      }

      return rolloverRecord!;
    });
  }

  async getRolloverSummaryForPeriod(periodId: number): Promise<{
    totalRolledIn: number;
    totalRolledOut: number;
    rolloverCount: number;
    resetCount: number;
  }> {
    const rolledInResult = await db
      .select({
        total: sql<number>`SUM(${envelopeRolloverHistory.rolledAmount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(envelopeRolloverHistory)
      .where(eq(envelopeRolloverHistory.toPeriodId, periodId));

    const rolledOutResult = await db
      .select({
        total: sql<number>`SUM(${envelopeRolloverHistory.rolledAmount})`,
        resetTotal: sql<number>`SUM(${envelopeRolloverHistory.resetAmount})`,
        resetCount: sql<number>`SUM(CASE WHEN ${envelopeRolloverHistory.resetAmount} > 0 THEN 1 ELSE 0 END)`,
      })
      .from(envelopeRolloverHistory)
      .where(eq(envelopeRolloverHistory.fromPeriodId, periodId));

    return {
      totalRolledIn: Number(rolledInResult[0]?.total ?? 0),
      totalRolledOut: Number(rolledOutResult[0]?.total ?? 0),
      rolloverCount: Number(rolledInResult[0]?.count ?? 0),
      resetCount: Number(rolledOutResult[0]?.resetCount ?? 0),
    };
  }

  async getRolloverHistoryForEnvelope(
    envelopeId: number,
    limit: number = 12
  ): Promise<EnvelopeRolloverHistory[]> {
    return await db
      .select()
      .from(envelopeRolloverHistory)
      .where(eq(envelopeRolloverHistory.envelopeId, envelopeId))
      .orderBy(desc(envelopeRolloverHistory.processedAt))
      .limit(limit);
  }

  async getRolloverHistoryForBudget(
    budgetId: number,
    limit: number = 50
  ): Promise<EnvelopeRolloverHistory[]> {
    // Get all envelopes for this budget
    const envelopes = await db
      .select({id: envelopeAllocations.id})
      .from(envelopeAllocations)
      .where(eq(envelopeAllocations.budgetId, budgetId));

    if (envelopes.length === 0) {
      return [];
    }

    const envelopeIds = envelopes.map((e) => e.id);

    // Get rollover history for all these envelopes
    return await db
      .select()
      .from(envelopeRolloverHistory)
      .where(inArray(envelopeRolloverHistory.envelopeId, envelopeIds))
      .orderBy(desc(envelopeRolloverHistory.processedAt))
      .limit(limit);
  }

  async estimateRolloverImpact(
    fromPeriodId: number,
    toPeriodId: number,
    policy: RolloverPolicy = {}
  ): Promise<{
    totalAvailableForRollover: number;
    estimatedRolloverAmount: number;
    estimatedResetAmount: number;
    envelopesAffected: number;
    deficitImpact: number;
  }> {
    const envelopes = await this.getEnvelopesForRollover(fromPeriodId);

    let totalAvailable = 0;
    let estimatedRollover = 0;
    let estimatedReset = 0;
    let deficitImpact = 0;

    for (const envelope of envelopes) {
      totalAvailable += envelope.availableAmount;

      const calculation = await this.calculateEnvelopeRollover(envelope, policy);
      estimatedRollover += calculation.rolloverAmount;
      estimatedReset += calculation.resetAmount;

      if (calculation.hasDeficit) {
        deficitImpact += calculation.deficitAmount;
      }
    }

    return {
      totalAvailableForRollover: totalAvailable,
      estimatedRolloverAmount: estimatedRollover,
      estimatedResetAmount: estimatedReset,
      envelopesAffected: envelopes.length,
      deficitImpact,
    };
  }

  private async executeBulkRollover(
    calculations: RolloverCalculationResult[],
    fromPeriodId: number,
    toPeriodId: number
  ): Promise<void> {
    for (const calculation of calculations) {
      await this.executeRollover(
        calculation.envelopeId,
        fromPeriodId,
        toPeriodId,
        calculation.rolloverAmount,
        calculation.resetAmount
      );
    }
  }

  private async validatePeriods(fromPeriodId: number, toPeriodId: number): Promise<void> {
    const fromPeriod = await db.query.budgetPeriodInstances.findFirst({
      where: eq(budgetPeriodInstances.id, fromPeriodId),
    });

    const toPeriod = await db.query.budgetPeriodInstances.findFirst({
      where: eq(budgetPeriodInstances.id, toPeriodId),
    });

    if (!fromPeriod) {
      throw new NotFoundError("Source period", fromPeriodId);
    }

    if (!toPeriod) {
      throw new NotFoundError("Target period", toPeriodId);
    }

    if (fromPeriod.endDate >= toPeriod.startDate) {
      throw new ValidationError("Target period must be after source period", "period");
    }
  }

  private async getEnvelopesForRollover(
    periodId: number,
    selectedIds?: number[]
  ): Promise<EnvelopeAllocation[]> {
    const conditions = [eq(envelopeAllocations.periodInstanceId, periodId)];

    if (selectedIds && selectedIds.length > 0) {
      conditions.push(inArray(envelopeAllocations.id, selectedIds));
    }

    return await db
      .select()
      .from(envelopeAllocations)
      .where(and(...conditions))
      .orderBy(asc(envelopeAllocations.categoryId));
  }

  private async getRolloverHistory(envelopeId: number): Promise<EnvelopeRolloverHistory[]> {
    return await db
      .select()
      .from(envelopeRolloverHistory)
      .where(eq(envelopeRolloverHistory.envelopeId, envelopeId))
      .orderBy(desc(envelopeRolloverHistory.processedAt));
  }

  private async ensureEnvelopeForNewPeriod(
    tx: any,
    sourceEnvelopeId: number,
    newPeriodId: number,
    rolloverAmount: number
  ): Promise<void> {
    // Get source envelope details
    const sourceEnvelope = await tx.query.envelopeAllocations.findFirst({
      where: eq(envelopeAllocations.id, sourceEnvelopeId),
    });

    if (!sourceEnvelope) {
      throw new NotFoundError("Source envelope", sourceEnvelopeId);
    }

    // Check if envelope already exists for new period
    const existingEnvelope = await tx
      .select()
      .from(envelopeAllocations)
      .where(
        and(
          eq(envelopeAllocations.budgetId, sourceEnvelope.budgetId),
          eq(envelopeAllocations.categoryId, sourceEnvelope.categoryId),
          eq(envelopeAllocations.periodInstanceId, newPeriodId)
        )
      );

    if (existingEnvelope.length > 0) {
      // Update existing envelope
      await tx
        .update(envelopeAllocations)
        .set({
          rolloverAmount,
          availableAmount: existingEnvelope[0].allocatedAmount + rolloverAmount,
          lastCalculated: new Date().toISOString(),
        })
        .where(eq(envelopeAllocations.id, existingEnvelope[0].id));
    } else {
      // Create new envelope for the period
      await tx.insert(envelopeAllocations).values({
        budgetId: sourceEnvelope.budgetId,
        categoryId: sourceEnvelope.categoryId,
        periodInstanceId: newPeriodId,
        allocatedAmount: 0,
        spentAmount: 0,
        rolloverAmount,
        availableAmount: rolloverAmount,
        deficitAmount: 0,
        status: rolloverAmount > 0 ? "active" : "depleted",
        rolloverMode: sourceEnvelope.rolloverMode,
        metadata: sourceEnvelope.metadata,
        lastCalculated: new Date().toISOString(),
      });
    }
  }
}
