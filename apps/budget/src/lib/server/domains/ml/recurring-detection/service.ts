/**
 * Recurring Transaction Detection Service
 *
 * Detects recurring patterns in transactions by analyzing:
 * - Temporal patterns (weekly, monthly, etc.)
 * - Amount consistency
 * - Payee groupings
 *
 * Use cases:
 * - Auto-suggest scheduled transactions
 * - Alert when expected recurring transaction is missing
 * - Identify subscription creep
 */

import { accounts, categories, payees, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { roundToCents } from "$lib/utils/math-utilities";
import { and, eq, gte, isNull, ne, sql } from "drizzle-orm";
import type { MLModelStore } from "../model-store";
import type {
  AmountType,
  PatternAnalysis,
  RecurringDetectionConfig,
  RecurringDetectionSummary,
  RecurringFrequency,
  RecurringPattern
} from "../types";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: RecurringDetectionConfig = {
  minOccurrences: 3,
  minConfidence: 0.6,
  lookbackMonths: 12,
  toleranceDays: 5,
  amountTolerancePercent: 0.15,
};

// Frequency detection thresholds (in days)
const FREQUENCY_RANGES = {
  daily: { min: 0.5, max: 1.5 },
  weekly: { min: 6, max: 8 },
  biweekly: { min: 13, max: 16 },
  monthly: { min: 27, max: 33 },
  quarterly: { min: 85, max: 100 },
  yearly: { min: 355, max: 380 },
} as const;

// =============================================================================
// Helper Types
// =============================================================================

interface TransactionForAnalysis {
  id: number;
  date: string;
  amount: number;
  payeeId: number | null;
  payeeName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  accountId: number;
}

interface PayeeGroup {
  payeeId: number;
  payeeName: string;
  transactions: TransactionForAnalysis[];
}

// =============================================================================
// Service Implementation
// =============================================================================

export class RecurringTransactionDetectionService {
  private config: RecurringDetectionConfig;
  private modelStore: MLModelStore;

  constructor(modelStore: MLModelStore, config?: Partial<RecurringDetectionConfig>) {
    this.modelStore = modelStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect all recurring patterns for a workspace
   */
  async detectPatterns(
    workspaceId: number,
    options?: Partial<RecurringDetectionConfig> & { accountId?: number }
  ): Promise<{
    patterns: RecurringPattern[];
    summary: RecurringDetectionSummary;
  }> {
    const config = { ...this.config, ...options };

    // Get transactions grouped by payee
    const payeeGroups = await this.getTransactionsByPayee(
      workspaceId,
      config.lookbackMonths,
      options?.accountId
    );

    const patterns: RecurringPattern[] = [];

    // Analyze each payee group for recurring patterns
    for (const group of payeeGroups) {
      if (group.transactions.length < config.minOccurrences) {
        continue;
      }

      const detectedPatterns = this.analyzePayeeTransactions(group, config);
      patterns.push(...detectedPatterns.filter((p) => p.confidence >= config.minConfidence));
    }

    // Sort by confidence (highest first)
    patterns.sort((a, b) => b.confidence - a.confidence);

    // Generate summary
    const summary = this.generateSummary(patterns);

    return { patterns, summary };
  }

  /**
   * Detect recurring patterns for a specific payee
   */
  async detectForPayee(
    workspaceId: number,
    payeeId: number,
    options?: Partial<RecurringDetectionConfig>
  ): Promise<RecurringPattern[]> {
    const config = { ...this.config, ...options };

    // Get workspace account IDs
    const workspaceAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.workspaceId, workspaceId), isNull(accounts.deletedAt)));

    const accountIds = workspaceAccounts.map((a) => a.id);

    if (accountIds.length === 0) {
      return [];
    }

    // Get payee info
    const payeeInfo = await db.select().from(payees).where(eq(payees.id, payeeId)).limit(1);

    if (payeeInfo.length === 0 || !payeeInfo[0].name) {
      return [];
    }

    const payeeName = payeeInfo[0].name;

    // Calculate lookback date
    const lookbackDate = new Date();
    lookbackDate.setMonth(lookbackDate.getMonth() - config.lookbackMonths);

    // Get transactions for this payee
    const result = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        payeeId: transactions.payeeId,
        categoryId: transactions.categoryId,
        accountId: transactions.accountId,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.payeeId, payeeId),
          sql`${transactions.accountId} IN ${accountIds}`,
          gte(transactions.date, lookbackDate.toISOString().split("T")[0]),
          isNull(transactions.deletedAt),
          ne(transactions.status, "scheduled")
        )
      )
      .orderBy(transactions.date);

    if (result.length < config.minOccurrences) {
      return [];
    }

    const group: PayeeGroup = {
      payeeId,
      payeeName,
      transactions: result.map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        payeeId: t.payeeId,
        payeeName,
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        accountId: t.accountId,
      })),
    };

    return this.analyzePayeeTransactions(group, config).filter(
      (p) => p.confidence >= config.minConfidence
    );
  }

  /**
   * Analyze a specific pattern in detail
   */
  async analyzePattern(workspaceId: number, patternId: string): Promise<PatternAnalysis | null> {
    // Parse pattern ID to get payee and account
    const [payeeIdStr, accountIdStr] = patternId.split("-");
    const payeeId = parseInt(payeeIdStr, 10);
    const accountId = parseInt(accountIdStr, 10);

    if (isNaN(payeeId) || isNaN(accountId)) {
      return null;
    }

    // Detect the pattern
    const patterns = await this.detectForPayee(workspaceId, payeeId);
    const pattern = patterns.find((p) => p.patternId === patternId);

    if (!pattern) {
      return null;
    }

    // Calculate additional analysis
    const missedOccurrences = this.detectMissedOccurrences(pattern);
    const anomalies = this.detectAmountAnomalies(pattern);
    const nextExpectedDates = this.predictNextDates(pattern, 5);
    const trends = this.detectTrends(pattern);

    // Calculate health score
    const healthScore = this.calculateHealthScore(pattern, missedOccurrences, anomalies);

    return {
      pattern,
      healthScore,
      missedOccurrences,
      anomalies,
      nextExpectedDates,
      trends,
    };
  }

  /**
   * Get suggested schedule for a pattern
   */
  suggestScheduleFromPattern(pattern: RecurringPattern): RecurringPattern["suggestedSchedule"] {
    // Determine schedule frequency
    let scheduleFrequency: "daily" | "weekly" | "monthly" | "yearly";
    let interval = 1;

    switch (pattern.frequency) {
      case "daily":
        scheduleFrequency = "daily";
        break;
      case "weekly":
        scheduleFrequency = "weekly";
        break;
      case "biweekly":
        scheduleFrequency = "weekly";
        interval = 2;
        break;
      case "monthly":
        scheduleFrequency = "monthly";
        break;
      case "quarterly":
        scheduleFrequency = "monthly";
        interval = 3;
        break;
      case "yearly":
        scheduleFrequency = "yearly";
        break;
      default:
        // For irregular patterns, try to find the best fit
        if (pattern.interval <= 7) {
          scheduleFrequency = "weekly";
        } else if (pattern.interval <= 45) {
          scheduleFrequency = "monthly";
        } else {
          scheduleFrequency = "yearly";
        }
    }

    // Determine amount configuration
    const amount = Math.abs(pattern.averageAmount);
    const cv = pattern.amountStdDev / Math.abs(pattern.averageAmount);

    let amount_type: AmountType;
    let amount_2: number | undefined;

    if (cv < 0.02) {
      amount_type = "exact";
    } else if (cv < 0.1) {
      amount_type = "approximate";
    } else {
      amount_type = "range";
      amount_2 = Math.abs(pattern.amountMax);
    }

    return {
      name: pattern.payeeName,
      amount: pattern.amountType === "exact" ? amount : roundToCents(amount),
      amount_2,
      amount_type,
      frequency: scheduleFrequency,
      interval,
    };
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Get transactions grouped by payee
   */
  private async getTransactionsByPayee(
    workspaceId: number,
    lookbackMonths: number,
    accountId?: number
  ): Promise<PayeeGroup[]> {
    // Get workspace account IDs
    const accountsQuery = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          isNull(accounts.deletedAt),
          accountId ? eq(accounts.id, accountId) : undefined
        )
      );

    const workspaceAccounts = await accountsQuery;
    const accountIds = workspaceAccounts.map((a) => a.id);

    if (accountIds.length === 0) {
      return [];
    }

    // Calculate lookback date
    const lookbackDate = new Date();
    lookbackDate.setMonth(lookbackDate.getMonth() - lookbackMonths);

    // Get all transactions with payees
    const result = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        payeeId: transactions.payeeId,
        payeeName: payees.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .leftJoin(payees, eq(transactions.payeeId, payees.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          sql`${transactions.accountId} IN ${accountIds}`,
          gte(transactions.date, lookbackDate.toISOString().split("T")[0]),
          isNull(transactions.deletedAt),
          ne(transactions.status, "scheduled"),
          sql`${transactions.payeeId} IS NOT NULL`
        )
      )
      .orderBy(transactions.payeeId, transactions.date);

    // Group by payee
    const groups = new Map<number, PayeeGroup>();

    for (const t of result) {
      if (!t.payeeId || !t.payeeName) continue;

      if (!groups.has(t.payeeId)) {
        groups.set(t.payeeId, {
          payeeId: t.payeeId,
          payeeName: t.payeeName,
          transactions: [],
        });
      }

      groups.get(t.payeeId)!.transactions.push({
        id: t.id,
        date: t.date,
        amount: t.amount,
        payeeId: t.payeeId,
        payeeName: t.payeeName,
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        accountId: t.accountId,
      });
    }

    return Array.from(groups.values());
  }

  /**
   * Analyze a payee's transactions for recurring patterns
   */
  private analyzePayeeTransactions(
    group: PayeeGroup,
    config: RecurringDetectionConfig
  ): RecurringPattern[] {
    // Further group by account + similar amount range for multiple patterns per payee
    const subGroups = this.groupByAmountRange(group.transactions);
    const patterns: RecurringPattern[] = [];

    for (const subGroup of subGroups) {
      if (subGroup.length < config.minOccurrences) {
        continue;
      }

      const pattern = this.detectPattern(group.payeeId, group.payeeName, subGroup, config);
      if (pattern && pattern.confidence >= config.minConfidence) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Group transactions by similar amount ranges (for detecting multiple recurring patterns per payee)
   */
  private groupByAmountRange(transactions: TransactionForAnalysis[]): TransactionForAnalysis[][] {
    // If all amounts are similar, return as single group
    const amounts = transactions.map((t) => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = this.calculateStdDev(amounts);

    // If coefficient of variation is low, treat as single pattern
    if (Math.abs(avgAmount) > 0 && stdDev / Math.abs(avgAmount) < 0.5) {
      return [transactions];
    }

    // Otherwise, cluster by amount similarity
    // Simple approach: separate income (positive) from expenses (negative)
    // and further split large deviations
    const income = transactions.filter((t) => t.amount > 0);
    const expenses = transactions.filter((t) => t.amount < 0);

    const groups: TransactionForAnalysis[][] = [];

    if (income.length >= 2) {
      groups.push(income);
    }

    if (expenses.length >= 2) {
      groups.push(expenses);
    }

    return groups.length > 0 ? groups : [transactions];
  }

  /**
   * Detect recurring pattern in a set of transactions
   */
  private detectPattern(
    payeeId: number,
    payeeName: string,
    transactions: TransactionForAnalysis[],
    config: RecurringDetectionConfig
  ): RecurringPattern | null {
    if (transactions.length < config.minOccurrences) {
      return null;
    }

    // Sort by date
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate intervals between transactions
    const intervals = this.calculateIntervals(sorted);

    if (intervals.length === 0) {
      return null;
    }

    // Detect frequency
    const { frequency, avgInterval, intervalStdDev } = this.detectFrequency(intervals);

    // Calculate amount statistics
    const amounts = sorted.map((t) => t.amount);
    const amountStats = this.calculateAmountStats(amounts);

    // Calculate confidence based on interval and amount consistency
    const intervalCV = avgInterval > 0 ? intervalStdDev / avgInterval : 1;
    const amountCV =
      Math.abs(amountStats.average) > 0
        ? amountStats.stdDev / Math.abs(amountStats.average)
        : 1;

    // Confidence scoring
    const intervalScore = Math.max(0, 1 - intervalCV);
    const amountScore = Math.max(0, 1 - amountCV);
    const occurrenceScore = Math.min(1, sorted.length / 6); // Max out at 6 occurrences

    const confidence =
      0.4 * intervalScore +
      0.3 * amountScore +
      0.2 * occurrenceScore +
      0.1 * (frequency !== "irregular" ? 1 : 0);

    // Determine typical day patterns
    const typicalDayOfMonth = this.detectTypicalDayOfMonth(sorted);
    const typicalDayOfWeek = this.detectTypicalDayOfWeek(sorted);

    // Predict next occurrence
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const nextPredicted = this.predictNextDate(lastDate, frequency, Math.round(avgInterval));

    // Check if pattern is still active
    const daysSinceLast =
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    const isActive = daysSinceLast < avgInterval * 2;

    // Get most common category
    const categoryId = this.getMostCommonCategory(sorted);
    const categoryName = sorted.find((t) => t.categoryId === categoryId)?.categoryName;

    // Get first account (patterns might span accounts, use first seen)
    const accountId = sorted[0].accountId;

    // Determine amount type
    let amountType: AmountType;
    if (amountCV < 0.02) {
      amountType = "exact";
    } else if (amountCV < 0.1) {
      amountType = "approximate";
    } else {
      amountType = "range";
    }

    // Generate pattern ID
    const patternId = `${payeeId}-${accountId}-${frequency}`;

    const pattern: RecurringPattern = {
      patternId,
      payeeId,
      payeeName,
      categoryId: categoryId ?? undefined,
      categoryName: categoryName ?? undefined,
      accountId,
      frequency,
      interval: Math.round(avgInterval),
      confidence,
      averageAmount: amountStats.average,
      amountStdDev: amountStats.stdDev,
      amountMin: amountStats.min,
      amountMax: amountStats.max,
      amountType,
      typicalDayOfMonth,
      typicalDayOfWeek: frequency === "weekly" || frequency === "biweekly" ? typicalDayOfWeek : undefined,
      lastOccurrence: sorted[sorted.length - 1].date,
      nextPredicted: nextPredicted.toISOString().split("T")[0],
      matchingTransactions: sorted.map((t) => ({
        transactionId: t.id,
        date: t.date,
        amount: t.amount,
      })),
      occurrenceCount: sorted.length,
      firstOccurrence: sorted[0].date,
      consistencyScore: intervalScore,
      isActive,
    };

    // Add schedule suggestion
    pattern.suggestedSchedule = this.suggestScheduleFromPattern(pattern);

    return pattern;
  }

  /**
   * Calculate intervals between sorted transactions
   */
  private calculateIntervals(sorted: TransactionForAnalysis[]): number[] {
    const intervals: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const daysDiff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(daysDiff);
    }

    return intervals;
  }

  /**
   * Detect frequency from intervals
   */
  private detectFrequency(intervals: number[]): {
    frequency: RecurringFrequency;
    avgInterval: number;
    intervalStdDev: number;
  } {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalStdDev = this.calculateStdDev(intervals);

    // Check each frequency range
    for (const [freq, range] of Object.entries(FREQUENCY_RANGES)) {
      if (avgInterval >= range.min && avgInterval <= range.max) {
        return {
          frequency: freq as RecurringFrequency,
          avgInterval,
          intervalStdDev,
        };
      }
    }

    return {
      frequency: "irregular",
      avgInterval,
      intervalStdDev,
    };
  }

  /**
   * Calculate amount statistics
   */
  private calculateAmountStats(amounts: number[]): {
    average: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = this.calculateStdDev(amounts);

    return {
      average,
      stdDev,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => (v - mean) ** 2);
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Detect typical day of month for monthly patterns
   */
  private detectTypicalDayOfMonth(transactions: TransactionForAnalysis[]): number | undefined {
    const days = transactions.map((t) => new Date(t.date).getDate());
    const counts = new Map<number, number>();

    for (const day of days) {
      counts.set(day, (counts.get(day) || 0) + 1);
    }

    // Find most common day
    let maxCount = 0;
    let typicalDay: number | undefined;

    for (const [day, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        typicalDay = day;
      }
    }

    // Only return if there's a clear pattern (>50% of occurrences)
    if (typicalDay && maxCount > transactions.length / 2) {
      return typicalDay;
    }

    // Check for "last day of month" pattern
    const lastDays = transactions.filter((t) => {
      const d = new Date(t.date);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return d.getDate() >= lastDay - 2; // Within 2 days of end
    });

    if (lastDays.length > transactions.length / 2) {
      return 31; // Represents "last day"
    }

    return undefined;
  }

  /**
   * Detect typical day of week for weekly patterns
   */
  private detectTypicalDayOfWeek(transactions: TransactionForAnalysis[]): number | undefined {
    const days = transactions.map((t) => new Date(t.date).getDay());
    const counts = new Map<number, number>();

    for (const day of days) {
      counts.set(day, (counts.get(day) || 0) + 1);
    }

    let maxCount = 0;
    let typicalDay: number | undefined;

    for (const [day, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        typicalDay = day;
      }
    }

    // Only return if there's a clear pattern
    if (typicalDay !== undefined && maxCount > transactions.length / 2) {
      return typicalDay;
    }

    return undefined;
  }

  /**
   * Get most common category ID
   */
  private getMostCommonCategory(transactions: TransactionForAnalysis[]): number | null {
    const counts = new Map<number, number>();

    for (const t of transactions) {
      if (t.categoryId) {
        counts.set(t.categoryId, (counts.get(t.categoryId) || 0) + 1);
      }
    }

    let maxCount = 0;
    let mostCommon: number | null = null;

    for (const [id, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = id;
      }
    }

    return mostCommon;
  }

  /**
   * Predict next occurrence date
   */
  private predictNextDate(
    lastDate: Date,
    frequency: RecurringFrequency,
    interval: number
  ): Date {
    const next = new Date(lastDate);

    switch (frequency) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setDate(next.getDate() + interval);
    }

    return next;
  }

  /**
   * Predict next N occurrence dates
   */
  private predictNextDates(pattern: RecurringPattern, count: number): string[] {
    const dates: string[] = [];
    let current = new Date(pattern.lastOccurrence);

    for (let i = 0; i < count; i++) {
      current = this.predictNextDate(current, pattern.frequency, pattern.interval);
      dates.push(current.toISOString().split("T")[0]);
    }

    return dates;
  }

  /**
   * Detect missed occurrences based on expected pattern
   */
  private detectMissedOccurrences(pattern: RecurringPattern): string[] {
    const missed: string[] = [];
    const transactions = pattern.matchingTransactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 1; i < transactions.length; i++) {
      const prev = new Date(transactions[i - 1].date);
      const curr = new Date(transactions[i].date);
      const daysDiff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

      // If gap is more than 1.5x expected interval, there might be missed occurrences
      const expectedInterval = pattern.interval;
      if (daysDiff > expectedInterval * 1.5) {
        // Calculate how many were missed
        const expectedOccurrences = Math.floor(daysDiff / expectedInterval);
        for (let j = 1; j < expectedOccurrences; j++) {
          const missedDate = new Date(prev);
          missedDate.setDate(missedDate.getDate() + expectedInterval * j);
          missed.push(missedDate.toISOString().split("T")[0]);
        }
      }
    }

    return missed;
  }

  /**
   * Detect amount anomalies
   */
  private detectAmountAnomalies(
    pattern: RecurringPattern
  ): PatternAnalysis["anomalies"] {
    const anomalies: PatternAnalysis["anomalies"] = [];
    const threshold = 2; // 2 standard deviations

    for (const t of pattern.matchingTransactions) {
      if (pattern.amountStdDev === 0) continue;

      const deviation = (t.amount - pattern.averageAmount) / pattern.amountStdDev;

      if (Math.abs(deviation) > threshold) {
        anomalies.push({
          date: t.date,
          expectedAmount: pattern.averageAmount,
          actualAmount: t.amount,
          deviation,
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect trends in pattern
   */
  private detectTrends(pattern: RecurringPattern): PatternAnalysis["trends"] {
    const transactions = pattern.matchingTransactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Amount trend
    let amountTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (transactions.length >= 3) {
      const firstHalf = transactions.slice(0, Math.floor(transactions.length / 2));
      const secondHalf = transactions.slice(Math.floor(transactions.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b.amount, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b.amount, 0) / secondHalf.length;

      const change = (secondAvg - firstAvg) / Math.abs(firstAvg);
      if (change > 0.1) {
        amountTrend = "increasing";
      } else if (change < -0.1) {
        amountTrend = "decreasing";
      }
    }

    // Frequency trend
    let frequencyTrend: "more_frequent" | "less_frequent" | "stable" = "stable";
    if (transactions.length >= 4) {
      const intervals: number[] = [];
      for (let i = 1; i < transactions.length; i++) {
        const prev = new Date(transactions[i - 1].date);
        const curr = new Date(transactions[i].date);
        intervals.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      }

      const firstHalfIntervals = intervals.slice(0, Math.floor(intervals.length / 2));
      const secondHalfIntervals = intervals.slice(Math.floor(intervals.length / 2));

      const firstAvg = firstHalfIntervals.reduce((a, b) => a + b, 0) / firstHalfIntervals.length;
      const secondAvg = secondHalfIntervals.reduce((a, b) => a + b, 0) / secondHalfIntervals.length;

      const change = (secondAvg - firstAvg) / firstAvg;
      if (change > 0.15) {
        frequencyTrend = "less_frequent";
      } else if (change < -0.15) {
        frequencyTrend = "more_frequent";
      }
    }

    return { amountTrend, frequencyTrend };
  }

  /**
   * Calculate overall health score for a pattern
   */
  private calculateHealthScore(
    pattern: RecurringPattern,
    missedOccurrences: string[],
    anomalies: PatternAnalysis["anomalies"]
  ): number {
    let score = 1.0;

    // Penalize for missed occurrences
    const missedPenalty = missedOccurrences.length * 0.1;
    score -= Math.min(0.4, missedPenalty);

    // Penalize for anomalies
    const anomalyPenalty = anomalies.length * 0.05;
    score -= Math.min(0.2, anomalyPenalty);

    // Penalize for inactive patterns
    if (!pattern.isActive) {
      score -= 0.3;
    }

    // Boost for high consistency
    score += pattern.consistencyScore * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(patterns: RecurringPattern[]): RecurringDetectionSummary {
    const byFrequency: Record<RecurringFrequency, number> = {
      daily: 0,
      weekly: 0,
      biweekly: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0,
      irregular: 0,
    };

    let totalMonthlyValue = 0;
    let subscriptions = 0;
    let bills = 0;
    let income = 0;

    for (const p of patterns) {
      byFrequency[p.frequency]++;

      // Calculate monthly equivalent value
      let monthlyMultiplier = 1;
      switch (p.frequency) {
        case "daily":
          monthlyMultiplier = 30;
          break;
        case "weekly":
          monthlyMultiplier = 4.33;
          break;
        case "biweekly":
          monthlyMultiplier = 2.17;
          break;
        case "monthly":
          monthlyMultiplier = 1;
          break;
        case "quarterly":
          monthlyMultiplier = 0.33;
          break;
        case "yearly":
          monthlyMultiplier = 1 / 12;
          break;
        default:
          monthlyMultiplier = 30 / p.interval;
      }

      totalMonthlyValue += Math.abs(p.averageAmount) * monthlyMultiplier;

      // Categorize patterns
      if (p.averageAmount > 0) {
        income++;
      } else if (p.amountType === "exact" && Math.abs(p.averageAmount) < 100) {
        subscriptions++;
      } else {
        bills++;
      }
    }

    return {
      total: patterns.length,
      byFrequency,
      highConfidence: patterns.filter((p) => p.confidence > 0.8).length,
      totalMonthlyValue,
      subscriptions,
      bills,
      income,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createRecurringTransactionDetectionService(
  modelStore: MLModelStore,
  config?: Partial<RecurringDetectionConfig>
): RecurringTransactionDetectionService {
  return new RecurringTransactionDetectionService(modelStore, config);
}
