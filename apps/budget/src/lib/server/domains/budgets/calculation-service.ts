import { isDebtAccount, type Account } from "$lib/schema/accounts";
import {
  budgetPeriodInstances,
  budgetPeriodTemplates,
  budgets,
  budgetTransactions
} from "$lib/schema/budgets";
import { envelopeAllocations } from "$lib/schema/budgets/envelope-allocations";
import { transactions, type Transaction } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, between, eq, sum as sqlSum } from "drizzle-orm";
import { EnvelopeService } from "./envelope-service";
import { BudgetRepository } from "./repository";

export interface PeriodCalculationResult {
  periodInstanceId: number;
  previousActualAmount: number;
  newActualAmount: number;
  transactionCount: number;
  lastCalculated: string;
}

export interface EnvelopeCalculationResult {
  envelopeId: number;
  allocatedAmount: number;
  spentAmount: number;
  availableAmount: number;
  deficitAmount: number;
  lastCalculated: string;
}

export interface TransactionChangeResult {
  transactionId: number;
  affectedPeriods: PeriodCalculationResult[];
  affectedEnvelopes: EnvelopeCalculationResult[];
}

/**
 * Service for calculating budget consumption and updating period/envelope amounts
 *
 * Dependencies are injected via constructor for testability.
 */
export class BudgetCalculationService {
  constructor(
    private repository: BudgetRepository,
    private envelopeService: EnvelopeService
  ) {}

  /**
   * Determine if a transaction should count against a budget.
   * Excludes all transfer transactions.
   */
  private shouldCountAgainstBudget(transaction: Transaction): boolean {
    // Never count transfers (includes payments from checking to credit card)
    if (transaction.isTransfer) return false;

    // All non-transfer transactions count against budgets
    return true;
  }

  /**
   * Calculate the budget impact of a transaction.
   * For debt accounts, inverts the amount to show purchases as positive spending.
   */
  private calculateBudgetImpact(transaction: Transaction, accountType: Account["accountType"]): number {
    if (!this.shouldCountAgainstBudget(transaction)) return 0;

    // For debt accounts: Invert the amount so purchases (negative) become positive spending
    // and refunds (positive) become negative spending (reduces budget)
    if (accountType && isDebtAccount(accountType)) {
      return -transaction.amount;
    }

    // For asset accounts, use amount as-is (typically absolute value for spending)
    return Math.abs(transaction.amount);
  }

  /**
   * Recalculate actualAmount for a budget period instance by summing all
   * budget transactions that fall within the period's date range.
   */
  async recalculateBudgetPeriod(periodInstanceId: number): Promise<PeriodCalculationResult> {
    return await db.transaction(async (tx) => {
      // Get the period instance
      const instance = await tx.query.budgetPeriodInstances.findFirst({
        where: eq(budgetPeriodInstances.id, periodInstanceId),
      });

      if (!instance) {
        throw new NotFoundError("Budget period instance", periodInstanceId);
      }

      // Get the template to find the budget
      const template = await tx.query.budgetPeriodTemplates.findFirst({
        where: eq(budgetPeriodTemplates.id, instance.templateId),
      });

      if (!template) {
        throw new NotFoundError("Budget period template", instance.templateId);
      }

      // Sum all budget_transactions for this budget where the transaction date
      // falls within the period's date range, excluding transfer transactions
      const result = await tx
        .select({
          total: sqlSum(budgetTransactions.allocatedAmount),
          count: sqlSum(budgetTransactions.id),
        })
        .from(budgetTransactions)
        .innerJoin(transactions, eq(budgetTransactions.transactionId, transactions.id))
        .where(
          and(
            eq(budgetTransactions.budgetId, template.budgetId),
            between(transactions.date, instance.startDate, instance.endDate),
            // Exclude transfer transactions from budget calculations
            eq(transactions.isTransfer, false)
          )
        );

      const totalAllocated = result[0]?.total ? Number(result[0].total) : 0;
      const transactionCount = result[0]?.count ? Number(result[0].count) : 0;
      const previousActualAmount = Number(instance.actualAmount);
      const now = getCurrentTimestamp();

      // Update the period instance with the calculated amount
      await tx
        .update(budgetPeriodInstances)
        .set({
          actualAmount: totalAllocated,
          lastCalculated: now,
        })
        .where(eq(budgetPeriodInstances.id, periodInstanceId));

      return {
        periodInstanceId,
        previousActualAmount,
        newActualAmount: totalAllocated,
        transactionCount,
        lastCalculated: now,
      };
    });
  }

  /**
   * Recalculate spent/available amounts for an envelope allocation.
   * Delegates to EnvelopeService for envelope-specific logic.
   */
  async recalculateEnvelope(envelopeId: number): Promise<EnvelopeCalculationResult> {
    // Use EnvelopeService's existing recalculation method
    const updated = await this.envelopeService.recalculateEnvelope(envelopeId);

    return {
      envelopeId,
      allocatedAmount: Number(updated.allocatedAmount),
      spentAmount: Number(updated.spentAmount),
      availableAmount: Number(updated.availableAmount),
      deficitAmount: Number(updated.deficitAmount),
      lastCalculated: updated.lastCalculated ?? getCurrentTimestamp(),
    };
  }

  /**
   * Handle transaction changes by recalculating all affected period instances
   * and envelope allocations.
   */
  async onTransactionChange(transactionId: number): Promise<TransactionChangeResult> {
    return await db.transaction(async (tx) => {
      // Get the transaction to find its date
      const transaction = await tx.query.transactions.findFirst({
        where: eq(transactions.id, transactionId),
      });

      if (!transaction) {
        throw new NotFoundError("Transaction", transactionId);
      }

      // Get all budget allocations for this transaction
      const allocations = await tx.query.budgetTransactions.findMany({
        where: eq(budgetTransactions.transactionId, transactionId),
      });

      const affectedPeriods: PeriodCalculationResult[] = [];
      const affectedEnvelopes: EnvelopeCalculationResult[] = [];
      const processedPeriods = new Set<number>();
      const processedEnvelopes = new Set<number>();

      // For each budget allocation, find and recalculate affected periods
      for (const allocation of allocations) {
        // Get the budget to check its type
        const budget = await tx.query.budgets.findFirst({
          where: eq(budgets.id, allocation.budgetId),
        });

        if (!budget) {
          continue;
        }

        // Find period templates for this budget
        const templates = await tx.query.budgetPeriodTemplates.findMany({
          where: eq(budgetPeriodTemplates.budgetId, budget.id),
        });

        // For each template, find period instances that contain the transaction date
        for (const template of templates) {
          const instances = await tx.query.budgetPeriodInstances.findMany({
            where: and(
              eq(budgetPeriodInstances.templateId, template.id),
              between(
                transactions.date,
                budgetPeriodInstances.startDate,
                budgetPeriodInstances.endDate
              )
            ),
          });

          // Recalculate each affected period instance
          for (const instance of instances) {
            if (!processedPeriods.has(instance.id)) {
              const result = await this.recalculateBudgetPeriod(instance.id);
              affectedPeriods.push(result);
              processedPeriods.add(instance.id);
            }
          }

          // If this is a category-envelope budget, recalculate affected envelopes
          if (budget.type === "category-envelope" && transaction.categoryId) {
            for (const instance of instances) {
              const envelopes = await tx
                .select()
                .from(envelopeAllocations)
                .where(
                  and(
                    eq(envelopeAllocations.budgetId, budget.id),
                    eq(envelopeAllocations.categoryId, transaction.categoryId),
                    eq(envelopeAllocations.periodInstanceId, instance.id)
                  )
                );

              for (const envelope of envelopes) {
                if (!processedEnvelopes.has(envelope.id)) {
                  const result = await this.recalculateEnvelope(envelope.id);
                  affectedEnvelopes.push(result);
                  processedEnvelopes.add(envelope.id);
                }
              }
            }
          }
        }
      }

      return {
        transactionId,
        affectedPeriods,
        affectedEnvelopes,
      };
    });
  }

  /**
   * Batch recalculate all period instances for a budget
   */
  async recalculateAllPeriods(budgetId: number): Promise<PeriodCalculationResult[]> {
    const templates = await db.query.budgetPeriodTemplates.findMany({
      where: eq(budgetPeriodTemplates.budgetId, budgetId),
      with: {
        periods: true,
      },
    });

    const results: PeriodCalculationResult[] = [];

    for (const template of templates) {
      for (const instance of template.periods) {
        const result = await this.recalculateBudgetPeriod(instance.id);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Batch recalculate all envelopes for a budget
   */
  async recalculateAllEnvelopes(budgetId: number): Promise<EnvelopeCalculationResult[]> {
    const envelopes = await db
      .select()
      .from(envelopeAllocations)
      .where(eq(envelopeAllocations.budgetId, budgetId));

    const results: EnvelopeCalculationResult[] = [];

    for (const envelope of envelopes) {
      const result = await this.recalculateEnvelope(envelope.id);
      results.push(result);
    }

    return results;
  }
}
