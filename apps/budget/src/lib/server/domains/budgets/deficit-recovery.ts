import {
  type EnvelopeAllocation,
  type EnvelopeTransfer,
  envelopeAllocations,
  envelopeTransfers,
} from "$lib/schema/budgets/envelope-allocations";
import { categories } from "$lib/schema/categories";
import { db } from "$lib/server/db";
import { DatabaseError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { and, desc, eq, gt, sql } from "drizzle-orm";

export interface DeficitAnalysis {
  envelopeId: number;
  categoryId: number;
  deficitAmount: number;
  daysSinceDeficit: number;
  deficitSeverity: "mild" | "moderate" | "severe" | "critical";
  suggestedSources: EnvelopeAllocation[];
  autoRecoveryOptions: DeficitRecoveryOption[];
}

export interface DeficitRecoveryOption {
  type: "transfer" | "reallocation" | "emergency_fund" | "borrowing" | "reset";
  sourceEnvelopeId?: number;
  amount: number;
  description: string;
  priority: number;
  feasible: boolean;
  impact: string;
}

export interface DeficitRecoveryPlan {
  targetEnvelopeId: number;
  totalDeficit: number;
  recoverySteps: DeficitRecoveryStep[];
  estimatedTimeToRecover: number;
  totalCost: number;
  alternativePlans: DeficitRecoveryPlan[];
}

export interface DeficitRecoveryStep {
  type: "transfer" | "reallocation" | "emergency_fund" | "external_injection";
  sourceEnvelopeId?: number;
  amount: number;
  description: string;
  order: number;
  automated: boolean;
}

export interface DeficitPolicy {
  allowNegativeBalances?: boolean;
  autoRecoveryEnabled?: boolean;
  emergencyFundThreshold?: number;
  borrowingAllowed?: boolean;
  maxDeficitDays?: number;
  priorityRecoveryCategories?: number[];
  deficitNotificationLevels?: {
    mild: number;
    moderate: number;
    severe: number;
    critical: number;
  };
}

export class DeficitRecoveryService {
  private readonly defaultPolicy: DeficitPolicy = {
    allowNegativeBalances: true,
    autoRecoveryEnabled: false,
    emergencyFundThreshold: 100,
    borrowingAllowed: false,
    maxDeficitDays: 30,
    priorityRecoveryCategories: [],
    deficitNotificationLevels: {
      mild: 50,
      moderate: 200,
      severe: 500,
      critical: 1000,
    },
  };

  async analyzeDeficit(envelopeId: number, policy: DeficitPolicy = {}): Promise<DeficitAnalysis> {
    const mergedPolicy = { ...this.defaultPolicy, ...policy };
    const envelope = await this.getEnvelopeById(envelopeId);

    if (envelope.deficitAmount <= 0) {
      throw new ValidationError("Envelope does not have a deficit", "envelope");
    }

    const daysSinceDeficit = await this.calculateDaysSinceDeficit(envelope);
    const deficitSeverity = this.calculateDeficitSeverity(envelope.deficitAmount, mergedPolicy);
    const suggestedSources = await this.findSuggestedSources(envelope, mergedPolicy);
    const autoRecoveryOptions = await this.generateAutoRecoveryOptions(
      envelope,
      suggestedSources,
      mergedPolicy
    );

    return {
      envelopeId,
      categoryId: envelope.categoryId,
      deficitAmount: envelope.deficitAmount,
      daysSinceDeficit,
      deficitSeverity,
      suggestedSources,
      autoRecoveryOptions,
    };
  }

  async createRecoveryPlan(
    envelopeId: number,
    policy: DeficitPolicy = {}
  ): Promise<DeficitRecoveryPlan> {
    const mergedPolicy = { ...this.defaultPolicy, ...policy };
    const analysis = await this.analyzeDeficit(envelopeId, mergedPolicy);

    const recoverySteps = await this.generateRecoverySteps(analysis, mergedPolicy);
    const estimatedTimeToRecover = this.calculateRecoveryTime(recoverySteps, analysis);
    const totalCost = recoverySteps.reduce((sum, step) => sum + step.amount, 0);

    const alternativePlans = await this.generateAlternativePlans(analysis, mergedPolicy);

    return {
      targetEnvelopeId: envelopeId,
      totalDeficit: analysis.deficitAmount,
      recoverySteps,
      estimatedTimeToRecover,
      totalCost,
      alternativePlans,
    };
  }

  async executeRecoveryPlan(
    plan: DeficitRecoveryPlan,
    executedBy: string = "system"
  ): Promise<{
    success: boolean;
    executedSteps: DeficitRecoveryStep[];
    transfers: EnvelopeTransfer[];
    errors: string[];
  }> {
    const executedSteps: DeficitRecoveryStep[] = [];
    const transfers: EnvelopeTransfer[] = [];
    const errors: string[] = [];

    for (const step of plan.recoverySteps.sort((a, b) => a.order - b.order)) {
      try {
        if (step.type === "transfer" && step.sourceEnvelopeId) {
          const transfer = await this.executeTransferStep(
            step.sourceEnvelopeId,
            plan.targetEnvelopeId,
            step.amount,
            step.description,
            executedBy
          );
          transfers.push(transfer);
          executedSteps.push(step);
        } else if (step.type === "emergency_fund" && step.sourceEnvelopeId) {
          const transfer = await this.executeEmergencyFundStep(
            step.sourceEnvelopeId,
            plan.targetEnvelopeId,
            step.amount,
            step.description,
            executedBy
          );
          transfers.push(transfer);
          executedSteps.push(step);
        } else {
          errors.push(`Cannot execute step: ${step.type} - requires manual intervention`);
        }
      } catch (error) {
        errors.push(
          `Failed to execute step ${step.order}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return {
      success: errors.length === 0,
      executedSteps,
      transfers,
      errors,
    };
  }

  async getDeficitEnvelopes(budgetId: number): Promise<EnvelopeAllocation[]> {
    return await db
      .select()
      .from(envelopeAllocations)
      .where(
        and(eq(envelopeAllocations.budgetId, budgetId), gt(envelopeAllocations.deficitAmount, 0))
      )
      .orderBy(desc(envelopeAllocations.deficitAmount));
  }

  async getSurplusEnvelopes(
    budgetId: number,
    minimumSurplus: number = 10
  ): Promise<EnvelopeAllocation[]> {
    return await db
      .select()
      .from(envelopeAllocations)
      .where(
        and(
          eq(envelopeAllocations.budgetId, budgetId),
          gt(envelopeAllocations.availableAmount, minimumSurplus)
        )
      )
      .orderBy(desc(envelopeAllocations.availableAmount));
  }

  async generateBulkRecoveryPlan(
    budgetId: number,
    policy: DeficitPolicy = {}
  ): Promise<{
    totalDeficit: number;
    totalSurplus: number;
    recoveryFeasible: boolean;
    plans: DeficitRecoveryPlan[];
    globalSteps: DeficitRecoveryStep[];
  }> {
    const deficitEnvelopes = await this.getDeficitEnvelopes(budgetId);
    const surplusEnvelopes = await this.getSurplusEnvelopes(budgetId);

    const totalDeficit = deficitEnvelopes.reduce((sum, env) => sum + env.deficitAmount, 0);
    const totalSurplus = surplusEnvelopes.reduce((sum, env) => sum + env.availableAmount, 0);
    const recoveryFeasible = totalSurplus >= totalDeficit;

    const plans: DeficitRecoveryPlan[] = [];
    const globalSteps: DeficitRecoveryStep[] = [];

    for (const envelope of deficitEnvelopes) {
      const plan = await this.createRecoveryPlan(envelope.id, policy);
      plans.push(plan);
    }

    // Generate global optimization steps
    if (recoveryFeasible) {
      let stepOrder = 1;
      for (const deficitEnvelope of deficitEnvelopes) {
        for (const surplusEnvelope of surplusEnvelopes) {
          const transferAmount = Math.min(
            deficitEnvelope.deficitAmount,
            surplusEnvelope.availableAmount
          );

          if (transferAmount > 0) {
            globalSteps.push({
              type: "transfer",
              sourceEnvelopeId: surplusEnvelope.id,
              amount: transferAmount,
              description: `Transfer ${transferAmount} from surplus envelope to cover deficit`,
              order: stepOrder++,
              automated: true,
            });

            // Update running totals for optimization
            deficitEnvelope.deficitAmount -= transferAmount;
            surplusEnvelope.availableAmount -= transferAmount;

            if (deficitEnvelope.deficitAmount <= 0) break;
          }
        }
      }
    }

    return {
      totalDeficit,
      totalSurplus,
      recoveryFeasible,
      plans,
      globalSteps,
    };
  }

  private async getEnvelopeById(envelopeId: number): Promise<EnvelopeAllocation> {
    const envelope = await db
      .select()
      .from(envelopeAllocations)
      .where(eq(envelopeAllocations.id, envelopeId))
      .limit(1);

    if (!envelope || envelope.length === 0) {
      throw new NotFoundError("Envelope allocation", envelopeId);
    }

    return envelope[0] as EnvelopeAllocation;
  }

  private async calculateDaysSinceDeficit(envelope: EnvelopeAllocation): Promise<number> {
    if (!envelope.lastCalculated) return 0;

    const lastUpdate = new Date(envelope.lastCalculated);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(0, daysDiff);
  }

  private calculateDeficitSeverity(
    deficitAmount: number,
    policy: DeficitPolicy
  ): "mild" | "moderate" | "severe" | "critical" {
    const levels = policy.deficitNotificationLevels!;

    if (deficitAmount >= levels.critical) return "critical";
    if (deficitAmount >= levels.severe) return "severe";
    if (deficitAmount >= levels.moderate) return "moderate";
    return "mild";
  }

  private async findSuggestedSources(
    envelope: EnvelopeAllocation,
    policy: DeficitPolicy
  ): Promise<EnvelopeAllocation[]> {
    const surplusEnvelopes = await db
      .select()
      .from(envelopeAllocations)
      .where(
        and(
          eq(envelopeAllocations.budgetId, envelope.budgetId),
          eq(envelopeAllocations.periodInstanceId, envelope.periodInstanceId),
          gt(envelopeAllocations.availableAmount, 0),
          sql`${envelopeAllocations.id} != ${envelope.id}`
        )
      )
      .orderBy(desc(envelopeAllocations.availableAmount))
      .limit(5);

    // Prioritize emergency funds and non-essential categories
    return surplusEnvelopes.sort((a, b) => {
      const aIsEmergency = (a.metadata as any)?.isEmergencyFund;
      const bIsEmergency = (b.metadata as any)?.isEmergencyFund;
      const aPriority = (a.metadata as any)?.priority ?? 5;
      const bPriority = (b.metadata as any)?.priority ?? 5;

      // Emergency funds first, then by priority (lower number = higher priority)
      if (aIsEmergency && !bIsEmergency) return -1;
      if (!aIsEmergency && bIsEmergency) return 1;
      return bPriority - aPriority; // Reverse for lower priority sources first
    });
  }

  private async generateAutoRecoveryOptions(
    envelope: EnvelopeAllocation,
    sources: EnvelopeAllocation[],
    policy: DeficitPolicy
  ): Promise<DeficitRecoveryOption[]> {
    const options: DeficitRecoveryOption[] = [];

    // Transfer options from surplus envelopes
    for (const source of sources) {
      const transferAmount = Math.min(envelope.deficitAmount, source.availableAmount);
      if (transferAmount > 0) {
        const categoryName = await this.getCategoryName(source.categoryId);
        options.push({
          type: "transfer",
          sourceEnvelopeId: source.id,
          amount: transferAmount,
          description: `Transfer from ${categoryName}`,
          priority: (source.metadata as any)?.priority ?? 5,
          feasible: true,
          impact: `Reduces ${categoryName} by ${transferAmount}`,
        });
      }
    }

    // Emergency fund option
    const emergencyFund = sources.find((s) => (s.metadata as any)?.isEmergencyFund);
    if (emergencyFund && policy.emergencyFundThreshold) {
      const availableEmergency = emergencyFund.availableAmount - policy.emergencyFundThreshold;
      if (availableEmergency > 0) {
        options.push({
          type: "emergency_fund",
          sourceEnvelopeId: emergencyFund.id,
          amount: Math.min(envelope.deficitAmount, availableEmergency),
          description: "Use emergency fund",
          priority: 1,
          feasible: true,
          impact: "Reduces emergency fund reserves",
        });
      }
    }

    // Reset option (clear deficit)
    options.push({
      type: "reset",
      amount: envelope.deficitAmount,
      description: "Reset deficit (write off)",
      priority: 10,
      feasible: true,
      impact: "Permanent loss of tracking for this deficit",
    });

    return options.sort((a, b) => a.priority - b.priority);
  }

  private async generateRecoverySteps(
    analysis: DeficitAnalysis,
    policy: DeficitPolicy
  ): Promise<DeficitRecoveryStep[]> {
    const steps: DeficitRecoveryStep[] = [];
    let remainingDeficit = analysis.deficitAmount;
    let stepOrder = 1;

    for (const option of analysis.autoRecoveryOptions) {
      if (remainingDeficit <= 0) break;

      // Skip "reset" type as it's not an actual recovery action
      if (option.type === "reset") continue;

      const stepAmount = Math.min(remainingDeficit, option.amount);

      // Map "borrowing" to "external_injection" for recovery steps
      const stepType: DeficitRecoveryStep["type"] =
        option.type === "borrowing" ? "external_injection" : option.type;

      steps.push({
        type: stepType,
        ...(option.sourceEnvelopeId != null && { sourceEnvelopeId: option.sourceEnvelopeId }),
        amount: stepAmount,
        description: option.description,
        order: stepOrder++,
        automated: stepType === "transfer" || stepType === "emergency_fund",
      });

      remainingDeficit -= stepAmount;
    }

    return steps;
  }

  private calculateRecoveryTime(steps: DeficitRecoveryStep[], analysis: DeficitAnalysis): number {
    // Estimate days based on step complexity and deficit severity
    const baseTime =
      analysis.deficitSeverity === "critical"
        ? 1
        : analysis.deficitSeverity === "severe"
          ? 3
          : analysis.deficitSeverity === "moderate"
            ? 7
            : 14;

    const manualSteps = steps.filter((s) => !s.automated).length;
    return baseTime + manualSteps * 2; // Add 2 days per manual step
  }

  private async generateAlternativePlans(
    analysis: DeficitAnalysis,
    policy: DeficitPolicy
  ): Promise<DeficitRecoveryPlan[]> {
    // For now, return empty array - could implement multiple recovery strategies
    return [];
  }

  private async executeTransferStep(
    fromEnvelopeId: number,
    toEnvelopeId: number,
    amount: number,
    description: string,
    executedBy: string
  ): Promise<EnvelopeTransfer> {
    return await db.transaction(async (tx) => {
      const fromEnvelope = await this.getEnvelopeById(fromEnvelopeId);
      const toEnvelope = await this.getEnvelopeById(toEnvelopeId);

      if (fromEnvelope.availableAmount < amount) {
        throw new ValidationError(
          `Insufficient funds in source envelope. Available: ${fromEnvelope.availableAmount}`,
          "transfer"
        );
      }

      // Update envelopes
      await tx
        .update(envelopeAllocations)
        .set({
          availableAmount: fromEnvelope.availableAmount - amount,
          lastCalculated: new Date().toISOString(),
        })
        .where(eq(envelopeAllocations.id, fromEnvelopeId));

      await tx
        .update(envelopeAllocations)
        .set({
          availableAmount: toEnvelope.availableAmount + amount,
          deficitAmount: Math.max(0, toEnvelope.deficitAmount - amount),
          status: toEnvelope.deficitAmount - amount <= 0 ? "active" : "overspent",
          lastCalculated: new Date().toISOString(),
        })
        .where(eq(envelopeAllocations.id, toEnvelopeId));

      // Record transfer
      const [transfer] = await tx
        .insert(envelopeTransfers)
        .values({
          fromEnvelopeId,
          toEnvelopeId,
          amount,
          reason: `Deficit recovery: ${description}`,
          transferredBy: executedBy,
        })
        .returning();

      if (!transfer) {
        throw new DatabaseError("Failed to create transfer record");
      }

      return transfer;
    });
  }

  private async executeEmergencyFundStep(
    fromEnvelopeId: number,
    toEnvelopeId: number,
    amount: number,
    description: string,
    executedBy: string
  ): Promise<EnvelopeTransfer> {
    // Same as transfer but with different reason
    return await this.executeTransferStep(
      fromEnvelopeId,
      toEnvelopeId,
      amount,
      `Emergency fund usage: ${description}`,
      executedBy
    );
  }

  private async getCategoryName(categoryId: number): Promise<string> {
    const category = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    return category[0]?.name ?? `Category ${categoryId}`;
  }
}
