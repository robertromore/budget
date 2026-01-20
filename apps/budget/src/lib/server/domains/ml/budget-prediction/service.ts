/**
 * Budget Overspend Prediction Service
 *
 * Predicts budget overruns before month-end by analyzing:
 * - Current spending rate vs. budget allocation
 * - Known upcoming recurring transactions
 * - Historical end-of-month spending patterns
 * - Day-of-month spending velocity
 */

import {
  accounts,
  budgetCategories,
  budgetPeriodInstances,
  budgetPeriodTemplates,
  budgets,
  categories,
  transactions,
} from "$lib/schema";
import { db } from "$lib/server/db";
import { formatPercent } from "$lib/server/utils/formatters";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { MLModelStore } from "../model-store";

// =============================================================================
// Types
// =============================================================================

export type OverspendRisk = "none" | "low" | "medium" | "high" | "critical";

export interface BudgetOverspendPrediction {
  budgetId: number;
  budgetName: string;
  periodId: number;
  periodStart: string;
  periodEnd: string;

  // Current state
  allocatedAmount: number;
  currentSpending: number;
  remainingBudget: number;
  percentUsed: number;
  daysElapsed: number;
  daysRemaining: number;

  // Prediction
  predictedEndSpending: number;
  predictedOverspend: number;
  overSpendRisk: OverspendRisk;
  confidence: number;

  // Breakdown
  dailySpendingRate: number;
  projectedDailyRate: number;
  historicalAverage: number;
  upcomingRecurring: number;

  // Recommendations
  recommendedDailyLimit: number;
  recommendation: string;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  type: "spending_rate" | "recurring" | "historical" | "seasonal" | "end_of_month";
  description: string;
  impact: number; // Positive = increases spending, negative = decreases
  confidence: number;
}

export interface WorkspaceBudgetSummary {
  workspaceId: number;
  predictions: BudgetOverspendPrediction[];
  totalAllocated: number;
  totalSpent: number;
  totalPredictedOverspend: number;
  budgetsAtRisk: number;
  overallRisk: OverspendRisk;
  lastUpdated: string;
}

export interface BudgetPredictionConfig {
  // Risk thresholds
  lowRiskThreshold: number; // % of budget that triggers low risk
  mediumRiskThreshold: number;
  highRiskThreshold: number;
  criticalRiskThreshold: number;

  // Historical analysis
  historicalMonthsToAnalyze: number;
  endOfMonthDays: number; // Days considered "end of month" (higher spending)

  // Confidence
  minConfidence: number;
  recurringWeight: number;
  historicalWeight: number;
  currentRateWeight: number;
}

const DEFAULT_CONFIG: BudgetPredictionConfig = {
  lowRiskThreshold: 80,
  mediumRiskThreshold: 95,
  highRiskThreshold: 110,
  criticalRiskThreshold: 125,

  historicalMonthsToAnalyze: 6,
  endOfMonthDays: 5,

  minConfidence: 0.3,
  recurringWeight: 0.3,
  historicalWeight: 0.3,
  currentRateWeight: 0.4,
};

// =============================================================================
// Service Interface
// =============================================================================

export interface BudgetPredictionService {
  /**
   * Predict overspend for a specific budget's current period
   */
  predictOverspend(
    workspaceId: number,
    budgetId: number
  ): Promise<BudgetOverspendPrediction | null>;

  /**
   * Get overspend predictions for all budgets in a workspace
   */
  predictWorkspaceOverspend(workspaceId: number): Promise<WorkspaceBudgetSummary>;

  /**
   * Get budgets at risk of overspending
   */
  getBudgetsAtRisk(
    workspaceId: number,
    minRisk?: OverspendRisk
  ): Promise<BudgetOverspendPrediction[]>;

  /**
   * Get daily spending recommendation to stay within budget
   */
  getDailySpendingLimit(
    workspaceId: number,
    budgetId: number
  ): Promise<{ limit: number; currentRate: number; onTrack: boolean }>;

  /**
   * Predict category-level overspend within a budget
   */
  predictCategoryOverspend(
    workspaceId: number,
    budgetId: number
  ): Promise<Array<{
    categoryId: number;
    categoryName: string;
    allocated: number;
    spent: number;
    predicted: number;
    risk: OverspendRisk;
  }>>;
}

// =============================================================================
// Service Implementation
// =============================================================================

export function createBudgetPredictionService(
  modelStore: MLModelStore,
  config: Partial<BudgetPredictionConfig> = {}
): BudgetPredictionService {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  /**
   * Get current period for a budget
   */
  async function getCurrentPeriod(budgetId: number) {
    const today = new Date().toISOString().split("T")[0];

    const period = await db
      .select({
        id: budgetPeriodInstances.id,
        templateId: budgetPeriodInstances.templateId,
        startDate: budgetPeriodInstances.startDate,
        endDate: budgetPeriodInstances.endDate,
        allocatedAmount: budgetPeriodInstances.allocatedAmount,
        actualAmount: budgetPeriodInstances.actualAmount,
        rolloverAmount: budgetPeriodInstances.rolloverAmount,
      })
      .from(budgetPeriodInstances)
      .innerJoin(
        budgetPeriodTemplates,
        eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id)
      )
      .where(
        and(
          eq(budgetPeriodTemplates.budgetId, budgetId),
          lte(budgetPeriodInstances.startDate, today),
          gte(budgetPeriodInstances.endDate, today)
        )
      )
      .limit(1);

    return period[0] || null;
  }

  /**
   * Calculate current spending for a budget period
   */
  async function getCurrentSpending(
    workspaceId: number,
    budgetId: number,
    startDate: string,
    endDate: string
  ): Promise<number> {
    // Get categories linked to this budget
    const budgetCats = await db
      .select({ categoryId: budgetCategories.categoryId })
      .from(budgetCategories)
      .where(eq(budgetCategories.budgetId, budgetId));

    if (budgetCats.length === 0) {
      return 0;
    }

    const categoryIds = budgetCats.map((c) => c.categoryId);

    // Sum spending in those categories for the period
    const spending = await db
      .select({
        total: sql<number>`sum(abs(${transactions.amount}))`.as("total"),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          inArray(transactions.categoryId, categoryIds),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          sql`${transactions.amount} < 0`, // Only expenses
          isNull(transactions.deletedAt)
        )
      );

    return Math.abs(spending[0]?.total || 0);
  }

  /**
   * Get historical spending patterns for similar periods
   */
  async function getHistoricalPatterns(
    workspaceId: number,
    budgetId: number,
    currentDayOfMonth: number
  ): Promise<{ average: number; endOfMonthMultiplier: number }> {
    // Get past period instances
    const pastPeriods = await db
      .select({
        id: budgetPeriodInstances.id,
        startDate: budgetPeriodInstances.startDate,
        endDate: budgetPeriodInstances.endDate,
        allocatedAmount: budgetPeriodInstances.allocatedAmount,
        actualAmount: budgetPeriodInstances.actualAmount,
      })
      .from(budgetPeriodInstances)
      .innerJoin(
        budgetPeriodTemplates,
        eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id)
      )
      .where(eq(budgetPeriodTemplates.budgetId, budgetId))
      .orderBy(desc(budgetPeriodInstances.endDate))
      .limit(cfg.historicalMonthsToAnalyze);

    if (pastPeriods.length === 0) {
      return { average: 0, endOfMonthMultiplier: 1 };
    }

    // Calculate average actual spending
    const total = pastPeriods.reduce((sum, p) => sum + (p.actualAmount || 0), 0);
    const average = total / pastPeriods.length;

    // Analyze end-of-month spending patterns
    // This would require more detailed daily analysis - simplified version
    const endOfMonthMultiplier = currentDayOfMonth > 25 ? 1.15 : 1.0;

    return { average, endOfMonthMultiplier };
  }

  /**
   * Estimate upcoming recurring transactions
   */
  async function getUpcomingRecurring(
    workspaceId: number,
    budgetId: number,
    fromDate: string,
    toDate: string
  ): Promise<number> {
    // Get categories linked to this budget
    const budgetCats = await db
      .select({ categoryId: budgetCategories.categoryId })
      .from(budgetCategories)
      .where(eq(budgetCategories.budgetId, budgetId));

    if (budgetCats.length === 0) {
      return 0;
    }

    const categoryIds = budgetCats.map((c) => c.categoryId);

    // Look for recurring patterns by finding transactions that appear monthly
    // Simplified: look at what happened same time last month
    const lastMonthStart = new Date(fromDate);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(toDate);
    lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);

    const lastMonthSpending = await db
      .select({
        total: sql<number>`sum(abs(${transactions.amount}))`.as("total"),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          inArray(transactions.categoryId, categoryIds),
          gte(transactions.date, lastMonthStart.toISOString().split("T")[0]),
          lte(transactions.date, lastMonthEnd.toISOString().split("T")[0]),
          sql`${transactions.amount} < 0`,
          isNull(transactions.deletedAt)
        )
      );

    // Estimate 60% of last month's remaining period spending as recurring
    return Math.abs((lastMonthSpending[0]?.total || 0) * 0.6);
  }

  /**
   * Calculate risk level from predicted overspend percentage
   */
  function calculateRisk(predictedPercent: number): OverspendRisk {
    if (predictedPercent >= cfg.criticalRiskThreshold) return "critical";
    if (predictedPercent >= cfg.highRiskThreshold) return "high";
    if (predictedPercent >= cfg.mediumRiskThreshold) return "medium";
    if (predictedPercent >= cfg.lowRiskThreshold) return "low";
    return "none";
  }

  /**
   * Generate recommendation based on prediction
   */
  function generateRecommendation(
    prediction: BudgetOverspendPrediction
  ): string {
    const { overSpendRisk, predictedOverspend, remainingBudget, daysRemaining, recommendedDailyLimit, dailySpendingRate } = prediction;

    if (overSpendRisk === "none") {
      return "On track! You're within your budget allocation.";
    }

    if (overSpendRisk === "low") {
      return `You're approaching your budget limit. Consider limiting daily spending to $${recommendedDailyLimit.toFixed(2)} for the remaining ${daysRemaining} days.`;
    }

    if (overSpendRisk === "medium") {
      const reduceBy = formatPercent((dailySpendingRate - recommendedDailyLimit) / dailySpendingRate, 0);
      return `At current pace, you'll exceed your budget by ~$${Math.abs(predictedOverspend).toFixed(2)}. Reduce daily spending by ${reduceBy} to stay on track.`;
    }

    if (overSpendRisk === "high") {
      return `Warning: Projected to exceed budget by ~$${Math.abs(predictedOverspend).toFixed(2)}. Immediate action recommended - pause non-essential spending.`;
    }

    // Critical
    return `Critical: Budget significantly overrun expected (~$${Math.abs(predictedOverspend).toFixed(2)} over). Review all upcoming expenses and consider reallocating from other budgets.`;
  }

  return {
    async predictOverspend(
      workspaceId: number,
      budgetId: number
    ): Promise<BudgetOverspendPrediction | null> {
      // Get budget info
      const budget = await db
        .select({
          id: budgets.id,
          name: budgets.name,
          status: budgets.status,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.id, budgetId),
            eq(budgets.workspaceId, workspaceId),
            eq(budgets.status, "active")
          )
        )
        .limit(1);

      if (budget.length === 0) {
        return null;
      }

      // Get current period
      const period = await getCurrentPeriod(budgetId);
      if (!period) {
        return null;
      }

      const today = new Date();
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDays - daysElapsed);

      // Get current spending
      const currentSpending = await getCurrentSpending(
        workspaceId,
        budgetId,
        period.startDate,
        today.toISOString().split("T")[0]
      );

      const allocatedAmount = period.allocatedAmount + (period.rolloverAmount || 0);
      const remainingBudget = allocatedAmount - currentSpending;
      const percentUsed = allocatedAmount > 0 ? (currentSpending / allocatedAmount) * 100 : 0;

      // Calculate daily spending rate
      const dailySpendingRate = daysElapsed > 0 ? currentSpending / daysElapsed : 0;

      // Get historical patterns
      const dayOfMonth = today.getDate();
      const historical = await getHistoricalPatterns(workspaceId, budgetId, dayOfMonth);

      // Get upcoming recurring
      const upcomingRecurring = await getUpcomingRecurring(
        workspaceId,
        budgetId,
        today.toISOString().split("T")[0],
        period.endDate
      );

      // Build prediction factors
      const factors: PredictionFactor[] = [];

      // Factor 1: Current spending rate projection
      const rateProjection = currentSpending + (dailySpendingRate * daysRemaining);
      factors.push({
        type: "spending_rate",
        description: `Current rate: $${dailySpendingRate.toFixed(2)}/day`,
        impact: rateProjection - allocatedAmount,
        confidence: Math.min(daysElapsed / 10, 0.9), // More confident with more data
      });

      // Factor 2: Upcoming recurring transactions
      if (upcomingRecurring > 0) {
        factors.push({
          type: "recurring",
          description: `Expected recurring expenses: $${upcomingRecurring.toFixed(2)}`,
          impact: upcomingRecurring,
          confidence: 0.7,
        });
      }

      // Factor 3: Historical average comparison
      if (historical.average > 0) {
        const historicalDiff = historical.average - allocatedAmount;
        factors.push({
          type: "historical",
          description: `Historical average: $${historical.average.toFixed(2)}`,
          impact: historicalDiff,
          confidence: 0.6,
        });
      }

      // Factor 4: End of month pattern
      if (dayOfMonth > 25) {
        factors.push({
          type: "end_of_month",
          description: "End of month spending typically increases",
          impact: dailySpendingRate * daysRemaining * 0.15,
          confidence: 0.5,
        });
      }

      // Calculate weighted prediction
      const projectedFromRate = currentSpending + (dailySpendingRate * daysRemaining);
      const projectedWithRecurring = currentSpending + upcomingRecurring + (dailySpendingRate * daysRemaining * 0.4);
      const projectedFromHistorical = (historical.average || allocatedAmount) * historical.endOfMonthMultiplier;

      // Weighted ensemble prediction
      const predictedEndSpending =
        projectedFromRate * cfg.currentRateWeight +
        projectedWithRecurring * cfg.recurringWeight +
        projectedFromHistorical * cfg.historicalWeight;

      const predictedOverspend = predictedEndSpending - allocatedAmount;
      const predictedPercent = allocatedAmount > 0 ? (predictedEndSpending / allocatedAmount) * 100 : 0;
      const overSpendRisk = calculateRisk(predictedPercent);

      // Calculate recommended daily limit
      const recommendedDailyLimit = daysRemaining > 0 ? Math.max(0, remainingBudget / daysRemaining) : 0;

      // Calculate confidence
      const confidence = Math.min(
        factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length,
        0.95
      );

      const prediction: BudgetOverspendPrediction = {
        budgetId,
        budgetName: budget[0].name,
        periodId: period.id,
        periodStart: period.startDate,
        periodEnd: period.endDate,

        allocatedAmount,
        currentSpending,
        remainingBudget,
        percentUsed,
        daysElapsed,
        daysRemaining,

        predictedEndSpending,
        predictedOverspend,
        overSpendRisk,
        confidence,

        dailySpendingRate,
        projectedDailyRate: projectedFromRate / totalDays,
        historicalAverage: historical.average,
        upcomingRecurring,

        recommendedDailyLimit,
        recommendation: "",
        factors,
      };

      // Generate recommendation
      prediction.recommendation = generateRecommendation(prediction);

      return prediction;
    },

    async predictWorkspaceOverspend(workspaceId: number): Promise<WorkspaceBudgetSummary> {
      // Get all active budgets
      const activeBudgets = await db
        .select({ id: budgets.id })
        .from(budgets)
        .where(
          and(
            eq(budgets.workspaceId, workspaceId),
            eq(budgets.status, "active"),
            isNull(budgets.deletedAt)
          )
        );

      const predictions: BudgetOverspendPrediction[] = [];

      for (const budget of activeBudgets) {
        const prediction = await this.predictOverspend(workspaceId, budget.id);
        if (prediction) {
          predictions.push(prediction);
        }
      }

      // Calculate summary
      const totalAllocated = predictions.reduce((sum, p) => sum + p.allocatedAmount, 0);
      const totalSpent = predictions.reduce((sum, p) => sum + p.currentSpending, 0);
      const totalPredictedOverspend = predictions
        .filter((p) => p.predictedOverspend > 0)
        .reduce((sum, p) => sum + p.predictedOverspend, 0);

      const budgetsAtRisk = predictions.filter((p) => p.overSpendRisk !== "none").length;

      // Overall risk is the highest individual risk
      const riskOrder: OverspendRisk[] = ["none", "low", "medium", "high", "critical"];
      const overallRisk = predictions.reduce((maxRisk, p) => {
        return riskOrder.indexOf(p.overSpendRisk) > riskOrder.indexOf(maxRisk)
          ? p.overSpendRisk
          : maxRisk;
      }, "none" as OverspendRisk);

      return {
        workspaceId,
        predictions,
        totalAllocated,
        totalSpent,
        totalPredictedOverspend,
        budgetsAtRisk,
        overallRisk,
        lastUpdated: new Date().toISOString(),
      };
    },

    async getBudgetsAtRisk(
      workspaceId: number,
      minRisk: OverspendRisk = "low"
    ): Promise<BudgetOverspendPrediction[]> {
      const summary = await this.predictWorkspaceOverspend(workspaceId);

      const riskOrder: OverspendRisk[] = ["none", "low", "medium", "high", "critical"];
      const minRiskIndex = riskOrder.indexOf(minRisk);

      return summary.predictions
        .filter((p) => riskOrder.indexOf(p.overSpendRisk) >= minRiskIndex)
        .sort((a, b) => {
          return riskOrder.indexOf(b.overSpendRisk) - riskOrder.indexOf(a.overSpendRisk);
        });
    },

    async getDailySpendingLimit(
      workspaceId: number,
      budgetId: number
    ): Promise<{ limit: number; currentRate: number; onTrack: boolean }> {
      const prediction = await this.predictOverspend(workspaceId, budgetId);

      if (!prediction) {
        return { limit: 0, currentRate: 0, onTrack: true };
      }

      return {
        limit: prediction.recommendedDailyLimit,
        currentRate: prediction.dailySpendingRate,
        onTrack: prediction.dailySpendingRate <= prediction.recommendedDailyLimit,
      };
    },

    async predictCategoryOverspend(
      workspaceId: number,
      budgetId: number
    ): Promise<Array<{
      categoryId: number;
      categoryName: string;
      allocated: number;
      spent: number;
      predicted: number;
      risk: OverspendRisk;
    }>> {
      // Get budget period
      const period = await getCurrentPeriod(budgetId);
      if (!period) {
        return [];
      }

      // Get categories linked to this budget
      const budgetCats = await db
        .select({
          categoryId: budgetCategories.categoryId,
          categoryName: categories.name,
        })
        .from(budgetCategories)
        .innerJoin(categories, eq(budgetCategories.categoryId, categories.id))
        .where(eq(budgetCategories.budgetId, budgetId));

      if (budgetCats.length === 0) {
        return [];
      }

      const today = new Date();
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDays - daysElapsed);

      // Calculate per-category allocation (equal split for now)
      const perCategoryAllocation = period.allocatedAmount / budgetCats.length;

      const results: Array<{
        categoryId: number;
        categoryName: string;
        allocated: number;
        spent: number;
        predicted: number;
        risk: OverspendRisk;
      }> = [];

      for (const cat of budgetCats) {
        // Get spending for this category
        const spending = await db
          .select({
            total: sql<number>`sum(abs(${transactions.amount}))`.as("total"),
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(accounts.workspaceId, workspaceId),
              eq(transactions.categoryId, cat.categoryId),
              gte(transactions.date, period.startDate),
              lte(transactions.date, today.toISOString().split("T")[0]),
              sql`${transactions.amount} < 0`,
              isNull(transactions.deletedAt)
            )
          );

        const spent = Math.abs(spending[0]?.total || 0);
        const dailyRate = daysElapsed > 0 ? spent / daysElapsed : 0;
        const predicted = spent + (dailyRate * daysRemaining);
        const predictedPercent = perCategoryAllocation > 0 ? (predicted / perCategoryAllocation) * 100 : 0;

        results.push({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName || "Unknown",
          allocated: perCategoryAllocation,
          spent,
          predicted,
          risk: calculateRisk(predictedPercent),
        });
      }

      // Sort by risk (highest first)
      const riskOrder: OverspendRisk[] = ["none", "low", "medium", "high", "critical"];
      results.sort((a, b) => riskOrder.indexOf(b.risk) - riskOrder.indexOf(a.risk));

      return results;
    },
  };
}
