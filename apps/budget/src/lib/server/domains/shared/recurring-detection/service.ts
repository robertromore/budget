import { db } from "$lib/server/db";
import { accounts, payees, categories, transactions, schedules } from "$lib/schema";
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { analyzeAmounts, getRepresentativeAmount } from "./analyzers/amount";
import {
  analyzeIntervals,
  detectTypicalDayOfMonth,
  detectTypicalDayOfWeek,
  predictNextDate,
} from "./analyzers/interval";
import { analyzePattern, calculatePatternScore } from "./analyzers/pattern";
import type {
  DetectionOptions,
  GroupedTransactions,
  RecurringPattern,
  ScheduleSuggestion,
  TransactionForAnalysis,
} from "./types";

// ==================== DEFAULT OPTIONS ====================

const DEFAULT_OPTIONS: Required<DetectionOptions> = {
  accountIds: [],
  months: 6,
  minTransactions: 3,
  minConfidence: 50,
  minPredictability: 60,
  includeExisting: false,
  patternTypes: [],
};

// ==================== SERVICE ====================

export class RecurringDetectionService {
  /**
   * Detects recurring payment patterns from transaction history
   */
  async detectPatterns(
    workspaceId: number,
    options?: DetectionOptions
  ): Promise<RecurringPattern[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // 1. Query transactions with related data
    const txns = await this.queryTransactions(workspaceId, opts);
    if (txns.length === 0) return [];

    // 2. Group transactions by payee + account
    const groups = this.groupTransactions(txns);

    // 3. Get existing schedules to check for duplicates
    const existingSchedules = opts.includeExisting
      ? []
      : await this.getExistingSchedules(workspaceId, opts.accountIds);

    // 4. Analyze each group and build patterns
    const patterns: RecurringPattern[] = [];

    for (const group of groups.values()) {
      // Skip if too few transactions
      if (group.transactions.length < opts.minTransactions) continue;

      // Analyze intervals
      const intervalAnalysis = analyzeIntervals(group.dates);
      if (!intervalAnalysis) continue;

      // Check interval consistency (allow 25% variance)
      if (intervalAnalysis.consistency < 0.75) continue;

      // Analyze amounts
      const amountAnalysis = analyzeAmounts(group.amounts);
      if (!amountAnalysis) continue;

      // Check amount predictability
      if (amountAnalysis.predictability < opts.minPredictability) continue;

      // Pattern matching on payee name
      const patternResult = analyzePattern(
        group.payeeName,
        amountAnalysis.median,
        undefined // No merchant code available from standard transactions
      );

      // Filter by pattern type if specified
      if (opts.patternTypes.length > 0 && !opts.patternTypes.includes(patternResult.patternType)) {
        continue;
      }

      // Calculate confidence scores
      const intervalScore = intervalAnalysis.consistency;
      const amountScore = amountAnalysis.predictability / 100;
      const patternScore = calculatePatternScore(patternResult);
      const occurrenceScore = Math.min(1, group.transactions.length / 12); // Max at 12 occurrences

      // Weighted confidence: 40% interval, 30% amount, 20% pattern, 10% occurrences
      const overallConfidence =
        (intervalScore * 0.4 + amountScore * 0.3 + patternScore * 0.2 + occurrenceScore * 0.1) * 100;

      // Skip if below minimum confidence
      if (overallConfidence < opts.minConfidence) continue;

      // Check if this pattern already has a schedule
      const existingSchedule = existingSchedules.find(
        (s) => s.payeeId === group.payeeId && s.accountId === group.accountId
      );

      // Skip if exists and not including existing
      if (existingSchedule && !opts.includeExisting) continue;

      // Detect day patterns
      const typicalDayOfMonth =
        intervalAnalysis.frequency === "monthly" ||
        intervalAnalysis.frequency === "quarterly" ||
        intervalAnalysis.frequency === "semi_annual" ||
        intervalAnalysis.frequency === "annual"
          ? detectTypicalDayOfMonth(group.dates)
          : undefined;

      const typicalDayOfWeek =
        intervalAnalysis.frequency === "weekly" || intervalAnalysis.frequency === "biweekly"
          ? detectTypicalDayOfWeek(group.dates)
          : undefined;

      // Predict next date
      const sortedDates = [...group.dates].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );
      const lastDate = sortedDates[0];
      const firstDate = sortedDates[sortedDates.length - 1];
      const suggestedNextDate = predictNextDate(
        lastDate,
        intervalAnalysis.frequency,
        typicalDayOfMonth,
        typicalDayOfWeek
      );

      // Build detection methods list
      const detectionMethods: RecurringPattern["detectionMethods"] = ["interval_analysis"];
      if (amountScore > 0.7) detectionMethods.push("amount_consistency");
      if (patternResult.matched) detectionMethods.push("pattern_matching");

      // Create the pattern
      const pattern: RecurringPattern = {
        // Identity
        payeeId: group.payeeId,
        payeeName: group.payeeName,
        accountId: group.accountId,
        accountName: group.accountName,
        categoryId: group.categoryId,
        categoryName: group.categoryName,

        // Timing
        frequency: intervalAnalysis.frequency,
        intervalDays: intervalAnalysis.average,
        intervalConsistency: intervalAnalysis.consistency,

        // Amount
        amount: {
          median: amountAnalysis.median,
          mean: amountAnalysis.mean,
          min: amountAnalysis.min,
          max: amountAnalysis.max,
          predictability: amountAnalysis.predictability,
        },

        // Classification
        patternType: patternResult.patternType,
        subscriptionType: patternResult.subscriptionType,

        // Confidence
        overallConfidence,
        detectionMethods,
        confidenceBreakdown: {
          intervalScore,
          amountScore,
          patternScore,
          occurrenceScore,
        },

        // Transaction data
        transactionCount: group.transactions.length,
        transactionIds: group.transactions.map((t) => t.id),
        firstDate,
        lastDate,
        suggestedNextDate,

        // Day patterns
        typicalDayOfMonth,
        typicalDayOfWeek,

        // Flags
        isExpense: group.isExpense,
        existingScheduleId: existingSchedule?.id,
      };

      patterns.push(pattern);
    }

    // Sort by confidence (highest first)
    return patterns.sort((a, b) => b.overallConfidence - a.overallConfidence);
  }

  /**
   * Generates a schedule suggestion from a detected pattern
   */
  generateScheduleSuggestion(pattern: RecurringPattern): ScheduleSuggestion {
    return {
      name: pattern.payeeName,
      amount: getRepresentativeAmount([pattern.amount.median]),
      frequency: pattern.frequency,
      suggestedStartDate: pattern.suggestedNextDate,
      isSubscription: pattern.patternType === "subscription",
      subscriptionType: pattern.subscriptionType,
      subscriptionStatus: "active",
    };
  }

  /**
   * Queries transactions for analysis
   */
  private async queryTransactions(
    workspaceId: number,
    opts: Required<DetectionOptions>
  ): Promise<TransactionForAnalysis[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - opts.months);
    const startDateStr = startDate.toISOString().split("T")[0];

    const conditions = [
      eq(transactions.workspaceId, workspaceId),
      gte(transactions.date, startDateStr),
      isNull(transactions.deletedAt),
    ];

    if (opts.accountIds.length > 0) {
      conditions.push(inArray(transactions.accountId, opts.accountIds));
    }

    const results = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        payeeId: transactions.payeeId,
        payeeName: payees.name,
        accountId: transactions.accountId,
        accountName: accounts.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(payees, eq(transactions.payeeId, payees.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(transactions.date);

    // Filter out transactions without payees
    return results.filter((t) => t.payeeId != null && t.payeeName != null) as TransactionForAnalysis[];
  }

  /**
   * Groups transactions by payee + account
   */
  private groupTransactions(txns: TransactionForAnalysis[]): Map<string, GroupedTransactions> {
    const groups = new Map<string, GroupedTransactions>();

    for (const txn of txns) {
      const key = `${txn.payeeId}-${txn.accountId}`;

      if (!groups.has(key)) {
        groups.set(key, {
          payeeId: txn.payeeId,
          payeeName: txn.payeeName,
          accountId: txn.accountId,
          accountName: txn.accountName,
          categoryId: txn.categoryId,
          categoryName: txn.categoryName,
          transactions: [],
          amounts: [],
          dates: [],
          isExpense: false,
        });
      }

      const group = groups.get(key)!;
      group.transactions.push(txn);
      group.amounts.push(txn.amount);
      group.dates.push(txn.date);

      // Update isExpense based on median (most transactions)
      if (group.amounts.length > 0) {
        const negativeCount = group.amounts.filter((a) => a < 0).length;
        group.isExpense = negativeCount > group.amounts.length / 2;
      }

      // Update category if not set (use first non-null)
      if (!group.categoryId && txn.categoryId) {
        group.categoryId = txn.categoryId;
        group.categoryName = txn.categoryName;
      }
    }

    return groups;
  }

  /**
   * Gets existing schedules for the workspace
   */
  private async getExistingSchedules(
    workspaceId: number,
    accountIds: number[]
  ): Promise<Array<{ id: number; payeeId: number; accountId: number }>> {
    const conditions = [eq(schedules.workspaceId, workspaceId)];

    if (accountIds.length > 0) {
      conditions.push(inArray(schedules.accountId, accountIds));
    }

    return await db
      .select({
        id: schedules.id,
        payeeId: schedules.payeeId,
        accountId: schedules.accountId,
      })
      .from(schedules)
      .where(and(...conditions));
  }
}

// ==================== SINGLETON ====================

let instance: RecurringDetectionService | null = null;

export function getRecurringDetectionService(): RecurringDetectionService {
  if (!instance) {
    instance = new RecurringDetectionService();
  }
  return instance;
}
