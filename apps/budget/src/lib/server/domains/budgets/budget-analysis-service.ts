/**
 * Budget Analysis Service
 *
 * Analyzes transaction history to detect spending patterns and generate
 * intelligent budget recommendations for creation and optimization.
 */

import { budgetAccounts, budgetCategories, budgets } from "$lib/schema/budgets";
import { categories } from "$lib/schema/categories";
import { payees } from "$lib/schema/payees";
import type {
  RecommendationMetadata,
  RecommendationPriority,
  RecommendationType,
} from "$lib/schema/recommendations";
import { transactions } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { logger } from "$lib/server/shared/logging";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { BudgetGroupAnalysisService } from "./budget-group-analysis-service";

export interface AnalysisParams {
  accountIds?: number[];
  months?: number; // Default 6
  minTransactions?: number; // Minimum transactions to consider a pattern (default 3)
  minConfidence?: number; // Minimum confidence % to generate recommendation (default 40)
}

export interface SpendingPattern {
  categoryId: number;
  categoryName: string;
  payeeIds: number[];
  payeeName?: string;
  transactionCount: number;
  monthsCovered: number;
  amounts: number[];
  median: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  trend: "increasing" | "decreasing" | "stable";
  frequency: "weekly" | "monthly" | "quarterly" | "sporadic";
  seasonalVariance?: number;
  isRecurring?: boolean;
  predictability?: number; // 0-100 score based on amount variance
  intervalDays?: number; // Average days between transactions
  dates?: string[]; // Transaction dates for interval analysis
}

export interface RecurringExpense {
  payeeId: number;
  payeeName: string;
  categoryId: number | null;
  categoryName: string | null;
  accountId: number;
  amounts: number[];
  dates: string[];
  median: number;
  mean: number;
  stdDev: number;
  predictability: number;
  intervalDays: number;
  frequency: "weekly" | "monthly" | "quarterly";
  transactionCount: number;
}

export interface GoalPattern {
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
  totalSaved: number;
  monthlyAverage: number;
  transactionCount: number;
  goalKeywords: string[];
  confidence: number;
}

export interface AccountSpendingData {
  accountId: number;
  accountName: string;
  monthlyAverage: number;
  transactionCount: number;
  categoryBreakdown: { categoryName: string; amount: number }[];
  hasExistingBudget: boolean;
}

export interface BudgetRecommendationDraft {
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  confidence: number;
  metadata: RecommendationMetadata;
  budgetId?: number;
  accountId?: number;
  categoryId?: number;
  expiresAt?: string;
}

export class BudgetAnalysisService {
  /**
   * Analyze transaction history and generate budget recommendations
   */
  async analyzeTransactionHistory(params: AnalysisParams = {}): Promise<BudgetRecommendationDraft[]> {
    const {
      accountIds,
      months = 6,
      minTransactions = 3,
      minConfidence = 40,
    } = params;

    try {
      logger.info("Starting transaction history analysis", { params });

      const recommendations: BudgetRecommendationDraft[] = [];

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const startDateStr = startDate.toISOString().split("T")[0]!;
      const endDateStr = endDate.toISOString().split("T")[0]!;
      const detectionParams = {
        ...(accountIds && { accountIds }),
        startDate: startDateStr,
        endDate: endDateStr,
        minTransactions,
      };

      // 1. Detect scheduled expenses (highest priority - recurring bills)
      try {
        const scheduledExpenses = await this.detectScheduledExpenses(detectionParams);
        for (const expense of scheduledExpenses) {
          const rec = this.generateScheduledExpenseRecommendation(expense);
          if (rec.confidence >= minConfidence) {
            recommendations.push(rec);
          }
        }
      } catch (error) {
        logger.error("Error detecting scheduled expenses", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue with other detection methods
      }

      // 2. Analyze spending patterns for category-envelope budgets
      const patterns = await this.detectSpendingPatterns(detectionParams);

      for (const pattern of patterns) {
        // Skip if we already recommended a scheduled expense for this category+payee
        const hasScheduledRec = recommendations.some(
          (r) =>
            r.categoryId === pattern.categoryId &&
            r.metadata.payeeIds &&
            pattern.payeeIds.some((pid) => r.metadata.payeeIds?.includes(pid))
        );
        if (hasScheduledRec) continue;

        // Check if budget already exists for this category
        const existingBudget = await this.findBudgetForCategory(pattern.categoryId);

        if (!existingBudget) {
          // Recommend creating new category-envelope budget
          const createRec = this.generateCreateBudgetRecommendation(pattern, accountIds);
          if (createRec.confidence >= minConfidence) {
            recommendations.push(createRec);
          }
        } else {
          // Analyze existing budget for optimization
          const optimizations = await this.analyzeExistingBudget(
            existingBudget.id,
            pattern
          );
          recommendations.push(
            ...optimizations.filter((rec) => rec.confidence >= minConfidence)
          );
        }
      }

      // 3. Detect account-level spending for account-monthly budgets
      try {
        const accountSpending = await this.detectAccountLevelSpending({
          ...(accountIds && { accountIds }),
          startDate: startDateStr,
          endDate: endDateStr,
        });
        for (const accountData of accountSpending) {
          const rec = this.generateAccountMonthlyRecommendation(accountData);
          if (rec.confidence >= minConfidence) {
            recommendations.push(rec);
          }
        }
      } catch (error) {
        logger.error("Error detecting account-level spending", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue with other detection methods
      }

      // 4. Detect goal-based patterns (lowest priority)
      try {
        const goalPatterns = await this.detectGoalPatterns(detectionParams);
        for (const goal of goalPatterns) {
          const rec = this.generateGoalBasedRecommendation(goal);
          if (rec.confidence >= minConfidence) {
            recommendations.push(rec);
          }
        }
      } catch (error) {
        logger.error("Error detecting goal patterns", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue with other detection methods
      }

      // 5. Find missing categories (frequent uncategorized transactions)
      const missingCategoryRecs = await this.findMissingCategories(detectionParams);
      recommendations.push(
        ...missingCategoryRecs.filter((rec) => rec.confidence >= minConfidence)
      );

      // 6. Generate budget group recommendations
      try {
        const groupAnalysis = new BudgetGroupAnalysisService();
        const groupRecommendations = await groupAnalysis.generateAllGroupRecommendations({
          ...(accountIds !== undefined && { accountIds }),
          minSimilarityScore: minConfidence,
        });
        recommendations.push(
          ...groupRecommendations.filter((rec) => rec.confidence >= minConfidence)
        );
      } catch (error) {
        logger.error("Error generating group recommendations", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue even if group analysis fails
      }

      logger.info("Analysis complete", {
        patternsFound: patterns.length,
        recommendationsGenerated: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      logger.error("Error analyzing transaction history", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        params
      });
      throw error;
    }
  }

  /**
   * Detect spending patterns by category
   */
  async detectSpendingPatterns(params: {
    accountIds?: number[];
    startDate: string;
    endDate: string;
    minTransactions: number;
  }): Promise<SpendingPattern[]> {
    const { accountIds, startDate, endDate, minTransactions } = params;

    // Build query conditions
    const conditions = [
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      isNull(transactions.deletedAt),
    ];

    if (accountIds && accountIds.length > 0) {
      conditions.push(inArray(transactions.accountId, accountIds));
    }

    // Get transactions grouped by category
    const txnsByCategory = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        payeeId: transactions.payeeId,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(transactions.date);

    // Group by category and analyze
    const categoryMap = new Map<
      number,
      {
        name: string;
        amounts: number[];
        dates: string[];
        payeeIds: Set<number>;
      }
    >();

    for (const txn of txnsByCategory) {
      if (!txn.categoryId) continue;

      if (!categoryMap.has(txn.categoryId)) {
        categoryMap.set(txn.categoryId, {
          name: txn.categoryName || "Unknown",
          amounts: [],
          dates: [],
          payeeIds: new Set(),
        });
      }

      const data = categoryMap.get(txn.categoryId)!;
      data.amounts.push(Math.abs(txn.amount));
      data.dates.push(txn.date);
      if (txn.payeeId) data.payeeIds.add(txn.payeeId);
    }

    // Convert to patterns
    const patterns: SpendingPattern[] = [];

    for (const [categoryId, data] of categoryMap.entries()) {
      if (data.amounts.length < minTransactions) continue;

      const sorted = [...data.amounts].sort((a, b) => a - b);
      const median = this.calculateMedian(sorted);
      const mean = this.calculateMean(sorted);
      const stdDev = this.calculateStdDev(sorted, mean);

      // Calculate trend
      const trend = this.detectTrend(data.amounts);

      // Estimate frequency
      const frequency = this.estimateFrequency(data.dates);

      // Calculate months covered
      const firstDate = new Date(data.dates[0]!);
      const lastDate = new Date(data.dates[data.dates.length - 1]!);
      const monthsCovered = Math.ceil(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      patterns.push({
        categoryId,
        categoryName: data.name,
        payeeIds: Array.from(data.payeeIds),
        transactionCount: data.amounts.length,
        monthsCovered,
        amounts: data.amounts,
        median,
        mean,
        stdDev,
        min: Math.min(...sorted),
        max: Math.max(...sorted),
        trend,
        frequency,
      });
    }

    return patterns;
  }

  /**
   * Generate create budget recommendation from pattern
   */
  private generateCreateBudgetRecommendation(
    pattern: SpendingPattern,
    accountIds?: number[]
  ): BudgetRecommendationDraft {
    // Use 75th percentile + 10% buffer for suggested amount
    const sorted = [...pattern.amounts].sort((a, b) => a - b);
    const p75Index = Math.floor(sorted.length * 0.75);
    const p75 = sorted[p75Index] || pattern.median;
    const suggestedAmount = Math.round((p75 * 1.1) / 25) * 25; // Round to nearest $25

    // Calculate confidence based on data quality
    let confidence = 50;
    if (pattern.monthsCovered >= 6) confidence += 20;
    if (pattern.transactionCount >= 10) confidence += 15;
    if (pattern.stdDev / pattern.mean < 0.3) confidence += 15; // Low variance

    // Determine priority
    let priority: RecommendationPriority = "medium";
    if (pattern.mean > 200) priority = "high";
    else if (pattern.mean < 50) priority = "low";

    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const recommendation: BudgetRecommendationDraft = {
      type: "create_budget",
      priority,
      title: `Create budget for ${pattern.categoryName}`,
      description: `Based on ${pattern.transactionCount} transactions over ${pattern.monthsCovered} months.\nWe recommend creating a ${pattern.frequency} budget for this category.`,
      confidence,
      metadata: {
        analysisTimeRange: {
          startDate: "",
          endDate: "",
          monthsAnalyzed: pattern.monthsCovered,
        },
        transactionCount: pattern.transactionCount,
        averageMonthlySpend: pattern.mean,
        medianMonthlySpend: pattern.median,
        spendingVariance: pattern.stdDev,
        trend: pattern.trend,
        suggestedAmount,
        suggestedType: "category-envelope",
        suggestedScope: "category",
        detectedFrequency: pattern.frequency,
        payeeIds: pattern.payeeIds,
      },
      categoryId: pattern.categoryId,
      expiresAt: expiresAt.toISOString(),
    };

    if (accountIds?.[0]) {
      recommendation.accountId = accountIds[0];
    }

    return recommendation;
  }

  /**
   * Generate scheduled-expense budget recommendation
   */
  private generateScheduledExpenseRecommendation(
    expense: RecurringExpense
  ): BudgetRecommendationDraft {
    // Use median for suggested amount (more stable than mean)
    const suggestedAmount = Math.round(expense.median / 25) * 25; // Round to nearest $25

    // Calculate confidence based on predictability and transaction count
    let confidence = Math.round(expense.predictability);
    if (expense.transactionCount >= 6) confidence = Math.min(100, confidence + 10);

    // Determine priority based on amount
    let priority: RecommendationPriority = "medium";
    if (expense.mean > 500) priority = "high";
    else if (expense.mean < 100) priority = "low";

    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const description = expense.categoryName
      ? `Based on ${expense.transactionCount} ${expense.frequency} payments to ${expense.payeeName}, we recommend creating a scheduled expense budget.`
      : `Create a ${expense.frequency} scheduled budget for ${expense.payeeName} payments.`;

    const recommendation: BudgetRecommendationDraft = {
      type: "create_budget",
      priority,
      title: `Create scheduled budget for ${expense.payeeName}`,
      description,
      confidence,
      metadata: {
        transactionCount: expense.transactionCount,
        averageMonthlySpend: expense.mean,
        medianMonthlySpend: expense.median,
        spendingVariance: expense.stdDev,
        suggestedAmount,
        suggestedType: "scheduled-expense",
        suggestedScope: expense.categoryId ? "category" : "account",
        detectedFrequency: expense.frequency,
        payeeIds: [expense.payeeId],
        predictability: expense.predictability,
        intervalDays: expense.intervalDays,
      },
      accountId: expense.accountId,
      expiresAt: expiresAt.toISOString(),
    };

    // Only add categoryId if it exists
    if (expense.categoryId) {
      recommendation.categoryId = expense.categoryId;
    }

    return recommendation;
  }

  /**
   * Generate goal-based budget recommendation
   */
  private generateGoalBasedRecommendation(
    goal: GoalPattern
  ): BudgetRecommendationDraft {
    // Suggest a 12-month savings goal based on current rate
    const targetAmount = Math.round((goal.monthlyAverage * 12) / 100) * 100; // Round to $100
    const suggestedMonthlyContribution = Math.round(goal.monthlyAverage / 25) * 25;

    // Priority based on consistency and amount
    let priority: RecommendationPriority = "medium";
    if (goal.monthlyAverage > 500) priority = "high";
    else if (goal.monthlyAverage < 100) priority = "low";

    // Set target date 12 months from now
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 12);

    // Set expiration (60 days - longer for goals)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    const keywordText = goal.goalKeywords.length > 0
      ? ` (detected keywords: ${goal.goalKeywords.join(", ")})`
      : "";

    const recommendation: BudgetRecommendationDraft = {
      type: "create_budget",
      priority,
      title: `Create savings goal for ${goal.accountName}`,
      description: `Based on ${goal.transactionCount} deposits averaging $${goal.monthlyAverage.toFixed(0)}/month${keywordText}.\nWe recommend creating a goal-based budget.`,
      confidence: goal.confidence,
      metadata: {
        transactionCount: goal.transactionCount,
        averageMonthlySpend: goal.monthlyAverage,
        suggestedAmount: suggestedMonthlyContribution,
        suggestedType: "goal-based",
        suggestedScope: "account",
        goalMetadata: {
          targetAmount,
          targetDate: targetDate.toISOString().split("T")[0]!,
          contributionFrequency: "monthly",
          monthlyContribution: suggestedMonthlyContribution,
        },
      },
      accountId: goal.accountId,
      expiresAt: expiresAt.toISOString(),
    };

    // Only add categoryId if it exists
    if (goal.categoryId) {
      recommendation.categoryId = goal.categoryId;
    }

    return recommendation;
  }

  /**
   * Generate account-monthly budget recommendation
   */
  private generateAccountMonthlyRecommendation(
    accountData: AccountSpendingData
  ): BudgetRecommendationDraft {
    // Suggest monthly limit with 10% buffer
    const suggestedAmount = Math.round((accountData.monthlyAverage * 1.1) / 100) * 100;

    // High priority for high-spending accounts
    let priority: RecommendationPriority = "high";
    if (accountData.monthlyAverage < 3000) priority = "medium";

    // Confidence based on transaction count
    let confidence = 70;
    if (accountData.transactionCount > 50) confidence = 85;

    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const topCategories = accountData.categoryBreakdown
      .slice(0, 3)
      .map((c) => c.categoryName)
      .join(", ");

    return {
      type: "create_budget",
      priority,
      title: `Create monthly budget for ${accountData.accountName}`,
      description: `Your ${accountData.accountName} averages $${accountData.monthlyAverage.toFixed(0)}/month in spending.\nTop categories: ${topCategories}.\nConsider setting a monthly spending limit.`,
      confidence,
      metadata: {
        transactionCount: accountData.transactionCount,
        averageMonthlySpend: accountData.monthlyAverage,
        suggestedAmount,
        suggestedType: "account-monthly",
        suggestedScope: "account",
        categoryBreakdown: accountData.categoryBreakdown,
      },
      accountId: accountData.accountId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Analyze existing budget and suggest optimizations
   */
  async analyzeExistingBudget(
    budgetId: number,
    pattern?: SpendingPattern
  ): Promise<BudgetRecommendationDraft[]> {
    const recommendations: BudgetRecommendationDraft[] = [];

    // Get budget details
    const budget = await db.query.budgets.findFirst({
      where: eq(budgets.id, budgetId),
      with: {
        categories: { with: { category: true } },
        periodTemplates: { with: { periods: true } },
      },
    });

    if (!budget) return recommendations;

    // If pattern provided, compare with budget allocation
    if (pattern) {
      const currentAmount =
        (budget.metadata as any)?.allocatedAmount ||
        budget.periodTemplates?.[0]?.periods?.[0]?.allocatedAmount ||
        0;

      const utilizationRate = currentAmount > 0 ? (pattern.mean / currentAmount) * 100 : 0;

      // Recommend increase if consistently overspending
      if (utilizationRate > 90 && pattern.trend === "increasing") {
        const suggestedAmount = Math.round((pattern.median * 1.15) / 25) * 25;

        recommendations.push({
          type: "increase_budget",
          priority: "high",
          title: `Increase budget for ${budget.name}`,
          description: `Your ${budget.name} budget is being exceeded.\nBased on recent spending patterns, we recommend increasing it.`,
          confidence: 75,
          metadata: {
            currentAmount,
            recommendedAmount: suggestedAmount,
            utilizationRate,
            monthsExceeded: Math.floor(pattern.monthsCovered * 0.7),
            averageMonthlySpend: pattern.mean,
            medianMonthlySpend: pattern.median,
            trend: pattern.trend,
          },
          budgetId,
        });
      }

      // Recommend decrease if consistently underutilized
      if (utilizationRate < 40 && pattern.trend !== "increasing") {
        const suggestedAmount = Math.round((pattern.median * 1.1) / 25) * 25;

        recommendations.push({
          type: "decrease_budget",
          priority: "low",
          title: `Decrease budget for ${budget.name}`,
          description: `Your ${budget.name} budget is underutilized.\nConsider reducing it to free up funds.`,
          confidence: 65,
          metadata: {
            currentAmount,
            recommendedAmount: suggestedAmount,
            utilizationRate,
            monthsUnderutilized: Math.floor(pattern.monthsCovered * 0.6),
            averageMonthlySpend: pattern.mean,
            medianMonthlySpend: pattern.median,
            trend: pattern.trend,
          },
          budgetId,
        });
      }
    }

    return recommendations;
  }

  /**
   * Detect recurring expenses for scheduled-expense budget recommendations
   */
  async detectScheduledExpenses(params: {
    accountIds?: number[];
    startDate: string;
    endDate: string;
    minTransactions: number;
  }): Promise<RecurringExpense[]> {
    const { accountIds, startDate, endDate, minTransactions } = params;

    // Build query conditions
    const conditions = [
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      isNull(transactions.deletedAt),
    ];

    if (accountIds && accountIds.length > 0) {
      conditions.push(inArray(transactions.accountId, accountIds));
    }

    // Get transactions grouped by payee
    const txnsByPayee = await db
      .select({
        payeeId: transactions.payeeId,
        payeeName: payees.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        accountId: transactions.accountId,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .leftJoin(payees, eq(transactions.payeeId, payees.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(transactions.date);

    // Group by payee + account combination
    const payeeMap = new Map<
      string,
      {
        payeeId: number;
        payeeName: string;
        categoryId: number | null;
        categoryName: string | null;
        accountId: number;
        amounts: number[];
        dates: string[];
      }
    >();

    for (const txn of txnsByPayee) {
      if (!txn.payeeId) continue;

      const key = `${txn.payeeId}-${txn.accountId}`;
      if (!payeeMap.has(key)) {
        payeeMap.set(key, {
          payeeId: txn.payeeId,
          payeeName: txn.payeeName || "Unknown",
          categoryId: txn.categoryId,
          categoryName: txn.categoryName,
          accountId: txn.accountId,
          amounts: [],
          dates: [],
        });
      }

      const data = payeeMap.get(key)!;
      data.amounts.push(Math.abs(txn.amount));
      data.dates.push(txn.date);
    }

    // Analyze for recurring patterns
    const recurringExpenses: RecurringExpense[] = [];

    for (const [_, data] of payeeMap.entries()) {
      if (data.amounts.length < minTransactions) continue;

      // Calculate interval consistency
      const intervals: number[] = [];
      for (let i = 1; i < data.dates.length; i++) {
        const days =
          (new Date(data.dates[i]!).getTime() - new Date(data.dates[i - 1]!).getTime()) /
          (1000 * 60 * 60 * 24);
        intervals.push(days);
      }

      if (intervals.length === 0) continue;

      const avgInterval = this.calculateMean(intervals);
      const intervalStdDev = this.calculateStdDev(intervals, avgInterval);

      // Check if intervals are consistent (recurring pattern)
      // Allow 20% variance in intervals
      const isRecurring = intervalStdDev / avgInterval < 0.2;
      if (!isRecurring) continue;

      // Determine frequency from interval
      let frequency: "weekly" | "monthly" | "quarterly";
      if (avgInterval <= 10) frequency = "weekly";
      else if (avgInterval <= 35) frequency = "monthly";
      else frequency = "quarterly";

      // Calculate amount predictability
      const sorted = [...data.amounts].sort((a, b) => a - b);
      const median = this.calculateMedian(sorted);
      const mean = this.calculateMean(data.amounts);
      const stdDev = this.calculateStdDev(data.amounts, mean);

      // Predictability: lower variance = higher predictability
      const varianceCoefficient = stdDev / mean;
      const predictability = Math.max(0, Math.min(100, 100 - varianceCoefficient * 100));

      // Only include if amounts are relatively consistent (>60% predictability)
      if (predictability < 60) continue;

      recurringExpenses.push({
        payeeId: data.payeeId,
        payeeName: data.payeeName,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        accountId: data.accountId,
        amounts: data.amounts,
        dates: data.dates,
        median,
        mean,
        stdDev,
        predictability,
        intervalDays: avgInterval,
        frequency,
        transactionCount: data.amounts.length,
      });
    }

    return recurringExpenses;
  }

  /**
   * Detect goal-based savings patterns
   */
  async detectGoalPatterns(params: {
    accountIds?: number[];
    startDate: string;
    endDate: string;
    minTransactions: number;
  }): Promise<GoalPattern[]> {
    const { accountIds, startDate, endDate, minTransactions } = params;

    // Goal patterns are typically:
    // 1. Regular positive amounts (transfers/deposits)
    // 2. To savings/investment accounts
    // 3. May have keywords like "savings", "emergency", "vacation" in notes

    const conditions = [
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      isNull(transactions.deletedAt),
      sql`${transactions.amount} > 0`, // Positive amounts (deposits/transfers)
    ];

    if (accountIds && accountIds.length > 0) {
      conditions.push(inArray(transactions.accountId, accountIds));
    }

    // Get positive transactions that might be savings
    const savingsTxns = await db
      .select({
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        amount: transactions.amount,
        notes: transactions.notes,
        date: transactions.date,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(transactions.date);

    // Group by account (goal patterns are usually account-specific)
    const accountMap = new Map<
      number,
      {
        categoryIds: Set<number | null>;
        categoryNames: Set<string>;
        amounts: number[];
        dates: string[];
        goalKeywords: Set<string>;
      }
    >();

    const goalKeywordList = [
      "saving",
      "savings",
      "emergency",
      "vacation",
      "goal",
      "fund",
      "retirement",
      "college",
      "down payment",
      "house",
      "car",
    ];

    for (const txn of savingsTxns) {
      if (!accountMap.has(txn.accountId)) {
        accountMap.set(txn.accountId, {
          categoryIds: new Set(),
          categoryNames: new Set(),
          amounts: [],
          dates: [],
          goalKeywords: new Set(),
        });
      }

      const data = accountMap.get(txn.accountId)!;
      data.amounts.push(txn.amount);
      data.dates.push(txn.date);
      if (txn.categoryId) data.categoryIds.add(txn.categoryId);
      if (txn.categoryName) data.categoryNames.add(txn.categoryName);

      // Check for goal keywords in notes
      if (txn.notes) {
        const notesLower = txn.notes.toLowerCase();
        for (const keyword of goalKeywordList) {
          if (notesLower.includes(keyword)) {
            data.goalKeywords.add(keyword);
          }
        }
      }
    }

    const goalPatterns: GoalPattern[] = [];

    // Get account names
    const accountsData = await db.query.accounts.findMany({
      columns: { id: true, name: true },
    });
    const accountNamesMap = new Map(accountsData.map((a) => [a.id, a.name]));

    for (const [accountId, data] of accountMap.entries()) {
      if (data.amounts.length < minTransactions) continue;

      // Calculate monthly average
      const firstDate = new Date(data.dates[0]!);
      const lastDate = new Date(data.dates[data.dates.length - 1]!);
      const monthsCovered = Math.max(
        1,
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const monthlyAverage = data.amounts.reduce((sum, amt) => sum + amt, 0) / monthsCovered;

      // Calculate confidence based on regularity and keywords
      let confidence = 40;
      if (data.goalKeywords.size > 0) confidence += 30;
      if (data.amounts.length >= 6) confidence += 15;
      if (monthlyAverage > 100) confidence += 15; // Significant amounts

      const categoryIdArray = Array.from(data.categoryIds).filter((id): id is number => id !== null && id !== undefined);
      const categoryNameArray = Array.from(data.categoryNames).filter((name): name is string => !!name);

      goalPatterns.push({
        accountId,
        accountName: accountNamesMap.get(accountId) || "Unknown Account",
        categoryId: categoryIdArray.length === 1 ? categoryIdArray[0]! : null,
        categoryName: categoryNameArray.length === 1 ? categoryNameArray[0]! : null,
        totalSaved: data.amounts.reduce((sum, amt) => sum + amt, 0),
        monthlyAverage,
        transactionCount: data.amounts.length,
        goalKeywords: Array.from(data.goalKeywords),
        confidence,
      });
    }

    return goalPatterns.filter((p) => p.confidence >= 60);
  }

  /**
   * Detect account-level spending patterns for account-monthly budgets
   */
  async detectAccountLevelSpending(params: {
    accountIds?: number[];
    startDate: string;
    endDate: string;
  }): Promise<AccountSpendingData[]> {
    const { accountIds, startDate, endDate } = params;

    const conditions = [
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      isNull(transactions.deletedAt),
      sql`${transactions.amount} < 0`, // Negative amounts (expenses)
    ];

    if (accountIds && accountIds.length > 0) {
      conditions.push(inArray(transactions.accountId, accountIds));
    }

    // Get all expense transactions by account
    const expenseTxns = await db
      .select({
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        amount: transactions.amount,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions));

    // Group by account
    const accountMap = new Map<
      number,
      {
        totalSpent: number;
        transactionCount: number;
        categoryBreakdown: Map<string, number>;
      }
    >();

    for (const txn of expenseTxns) {
      if (!accountMap.has(txn.accountId)) {
        accountMap.set(txn.accountId, {
          totalSpent: 0,
          transactionCount: 0,
          categoryBreakdown: new Map(),
        });
      }

      const data = accountMap.get(txn.accountId)!;
      data.totalSpent += Math.abs(txn.amount);
      data.transactionCount++;

      const categoryName = txn.categoryName || "Uncategorized";
      data.categoryBreakdown.set(
        categoryName,
        (data.categoryBreakdown.get(categoryName) || 0) + Math.abs(txn.amount)
      );
    }

    // Get account names and check for existing budgets
    const accountsData = await db.query.accounts.findMany({
      columns: { id: true, name: true },
    });
    const accountNamesMap = new Map(accountsData.map((a) => [a.id, a.name]));

    // Check for existing account-monthly budgets
    const existingBudgets = await db
      .select({
        accountId: budgetAccounts.accountId,
      })
      .from(budgetAccounts)
      .innerJoin(budgets, eq(budgetAccounts.budgetId, budgets.id))
      .where(
        and(
          eq(budgets.type, "account-monthly"),
          eq(budgets.status, "active"),
          isNull(budgets.deletedAt)
        )
      );

    const accountsWithBudgets = new Set(existingBudgets.map((b) => b.accountId));

    // Calculate monthly averages
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const monthsCovered = Math.max(
      1,
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const accountSpendingData: AccountSpendingData[] = [];

    for (const [accountId, data] of accountMap.entries()) {
      const monthlyAverage = data.totalSpent / monthsCovered;

      // Only recommend if significant spending (>$2000/month) and no existing budget
      if (monthlyAverage < 2000) continue;

      const categoryBreakdown = Array.from(data.categoryBreakdown.entries())
        .map(([categoryName, amount]) => ({ categoryName, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 categories

      accountSpendingData.push({
        accountId,
        accountName: accountNamesMap.get(accountId) || "Unknown Account",
        monthlyAverage,
        transactionCount: data.transactionCount,
        categoryBreakdown,
        hasExistingBudget: accountsWithBudgets.has(accountId),
      });
    }

    // Filter out accounts with existing budgets
    return accountSpendingData.filter((data) => !data.hasExistingBudget);
  }

  /**
   * Find frequently used categories without budgets
   */
  async findMissingCategories(params: {
    accountIds?: number[];
    startDate: string;
    endDate: string;
    minTransactions: number;
  }): Promise<BudgetRecommendationDraft[]> {
    // Similar to detectSpendingPatterns but focuses on uncategorized
    return [];
  }

  /**
   * Find existing budget for category
   */
  private async findBudgetForCategory(categoryId: number) {
    return await db.query.budgets.findFirst({
      where: and(
        eq(budgets.status, "active"),
        isNull(budgets.deletedAt)
      ),
      with: {
        categories: {
          where: eq(budgetCategories.categoryId, categoryId),
        },
      },
    }).then((budget) => {
      if (!budget || !budget.categories || budget.categories.length === 0) {
        return null;
      }
      return budget;
    });
  }

  // Statistical helper methods
  private calculateMedian(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  private detectTrend(amounts: number[]): "increasing" | "decreasing" | "stable" {
    if (amounts.length < 3) return "stable";

    // Simple linear regression slope
    const n = amounts.length;
    const xMean = (n - 1) / 2;
    const yMean = this.calculateMean(amounts);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (amounts[i]! - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = numerator / denominator;
    const threshold = yMean * 0.05; // 5% threshold

    if (slope > threshold) return "increasing";
    if (slope < -threshold) return "decreasing";
    return "stable";
  }

  private estimateFrequency(dates: string[]): "weekly" | "monthly" | "quarterly" | "sporadic" {
    if (dates.length < 2) return "sporadic";

    // Calculate average days between transactions
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const days =
        (new Date(dates[i]!).getTime() - new Date(dates[i - 1]!).getTime()) /
        (1000 * 60 * 60 * 24);
      gaps.push(days);
    }

    const avgGap = this.calculateMean(gaps);

    if (avgGap <= 10) return "weekly";
    if (avgGap <= 35) return "monthly";
    if (avgGap <= 100) return "quarterly";
    return "sporadic";
  }
}
