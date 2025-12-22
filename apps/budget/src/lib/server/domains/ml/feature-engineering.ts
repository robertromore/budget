/**
 * Feature Engineering Service
 *
 * Shared feature extraction pipelines for ML models.
 * Extracts transaction, temporal, payee, and aggregation features.
 */

import { transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { mean, standardDeviation } from "simple-statistics";
import type {
  AggregationFeatures,
  SequenceFeatures,
  TransactionFeatures,
} from "./types";
import { getWorkspaceAccountIds } from "./utils";

export class FeatureEngineeringService {
  // ==========================================================================
  // Transaction Features
  // ==========================================================================

  /**
   * Extract features from a single transaction
   */
  extractTransactionFeatures(transaction: {
    amount: number;
    date: string;
    payeeId?: number;
    categoryId?: number;
    accountId?: number;
  }): TransactionFeatures {
    const date = new Date(transaction.date);
    const dayOfWeek = date.getDay();
    const monthOfYear = date.getMonth() + 1;
    const dayOfMonth = date.getDate();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const hourOfDay = date.getHours();

    return {
      amount: transaction.amount,
      dayOfWeek,
      monthOfYear,
      dayOfMonth,
      isWeekend,
      hourOfDay,
      amountLog: transaction.amount > 0 ? Math.log(transaction.amount) : 0,
    };
  }

  /**
   * Enrich transaction features with context
   */
  async enrichTransactionFeatures(
    workspaceId: number,
    baseFeatures: TransactionFeatures,
    context: {
      payeeId?: number;
      categoryId?: number;
      accountId?: number;
      transactionDate: string;
    }
  ): Promise<TransactionFeatures> {
    const enriched = { ...baseFeatures };

    // Calculate z-score relative to category
    if (context.categoryId) {
      const categoryStats = await this.getCategoryStats(workspaceId, context.categoryId);
      if (categoryStats.mean && categoryStats.stdDev && categoryStats.stdDev > 0) {
        enriched.amountZScore = (baseFeatures.amount - categoryStats.mean) / categoryStats.stdDev;
      }
      if (categoryStats.transactions.length > 0) {
        const sorted = [...categoryStats.transactions].sort((a, b) => a - b);
        const percentile = sorted.filter((v) => v <= baseFeatures.amount).length / sorted.length;
        enriched.amountPercentile = percentile;
      }
    }

    // Get payee context
    if (context.payeeId) {
      const payeeStats = await this.getPayeeStats(workspaceId, context.payeeId);
      enriched.payeeTransactionCount = payeeStats.count;
      enriched.payeeAvgAmount = payeeStats.avgAmount;
      enriched.payeeAmountStdDev = payeeStats.stdDev;

      // Days since last transaction
      if (payeeStats.lastTransactionDate) {
        const lastDate = new Date(payeeStats.lastTransactionDate);
        const currentDate = new Date(context.transactionDate);
        enriched.daysSinceLastTransaction = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    return enriched;
  }

  // ==========================================================================
  // Aggregation Features
  // ==========================================================================

  /**
   * Get rolling aggregation features
   */
  async getAggregationFeatures(
    workspaceId: number,
    entityType: "payee" | "category" | "account",
    entityId: number,
    asOfDate: string
  ): Promise<AggregationFeatures> {
    const date = new Date(asOfDate);

    const day7Ago = new Date(date);
    day7Ago.setDate(day7Ago.getDate() - 7);

    const day30Ago = new Date(date);
    day30Ago.setDate(day30Ago.getDate() - 30);

    const day90Ago = new Date(date);
    day90Ago.setDate(day90Ago.getDate() - 90);

    // Get account IDs for workspace filtering
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return {
        rolling7DaySum: 0,
        rolling7DayCount: 0,
        rolling30DaySum: 0,
        rolling30DayCount: 0,
        rolling90DaySum: 0,
        rolling90DayCount: 0,
        monthlyAvg: 0,
        monthlyStdDev: 0,
      };
    }

    // Build entity filter
    const entityFilter =
      entityType === "payee"
        ? eq(transactions.payeeId, entityId)
        : entityType === "category"
          ? eq(transactions.categoryId, entityId)
          : eq(transactions.accountId, entityId);

    // Get 7-day rolling
    const rolling7 = await db
      .select({
        sum: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
        count: count(),
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          entityFilter,
          gte(transactions.date, day7Ago.toISOString().split("T")[0]),
          lte(transactions.date, asOfDate)
        )
      );

    // Get 30-day rolling
    const rolling30 = await db
      .select({
        sum: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
        count: count(),
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          entityFilter,
          gte(transactions.date, day30Ago.toISOString().split("T")[0]),
          lte(transactions.date, asOfDate)
        )
      );

    // Get 90-day rolling
    const rolling90 = await db
      .select({
        sum: sql<number>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
        count: count(),
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          entityFilter,
          gte(transactions.date, day90Ago.toISOString().split("T")[0]),
          lte(transactions.date, asOfDate)
        )
      );

    // Calculate monthly average and std dev
    const monthlyData = await this.getMonthlyAmounts(workspaceId, entityType, entityId, 6);
    const monthlyAvg = monthlyData.length > 0 ? mean(monthlyData) : 0;
    const monthlyStdDev = monthlyData.length > 1 ? standardDeviation(monthlyData) : 0;

    return {
      rolling7DaySum: rolling7[0]?.sum ?? 0,
      rolling7DayCount: Number(rolling7[0]?.count ?? 0),
      rolling30DaySum: rolling30[0]?.sum ?? 0,
      rolling30DayCount: Number(rolling30[0]?.count ?? 0),
      rolling90DaySum: rolling90[0]?.sum ?? 0,
      rolling90DayCount: Number(rolling90[0]?.count ?? 0),
      monthlyAvg,
      monthlyStdDev,
    };
  }

  // ==========================================================================
  // Sequence Features (for time series)
  // ==========================================================================

  /**
   * Extract features from a sequence of values
   */
  extractSequenceFeatures(values: number[], windowSize: number = 12): SequenceFeatures {
    if (values.length === 0) {
      return {
        values: [],
        mean: 0,
        stdDev: 0,
        trend: 0,
        autocorrelation: [],
      };
    }

    const seq = values.slice(-windowSize);
    const seqMean = mean(seq);
    const seqStdDev = seq.length > 1 ? standardDeviation(seq) : 0;

    // Calculate trend using linear regression slope
    const trend = this.calculateTrend(seq);

    // Calculate autocorrelation for first 3 lags
    const autocorrelation = this.calculateAutocorrelation(seq, 3);

    // Detect seasonality strength (if we have enough data)
    let seasonalityStrength: number | undefined;
    if (seq.length >= 12) {
      seasonalityStrength = this.detectSeasonalityStrength(seq);
    }

    return {
      values: seq,
      mean: seqMean,
      stdDev: seqStdDev,
      trend,
      autocorrelation,
      seasonalityStrength,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getCategoryStats(
    workspaceId: number,
    categoryId: number
  ): Promise<{
    mean: number;
    stdDev: number;
    transactions: number[];
  }> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return { mean: 0, stdDev: 0, transactions: [] };
    }

    const result = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          eq(transactions.categoryId, categoryId)
        )
      )
      .limit(1000);

    const amounts = result.map((r) => Math.abs(r.amount ?? 0));

    return {
      mean: amounts.length > 0 ? mean(amounts) : 0,
      stdDev: amounts.length > 1 ? standardDeviation(amounts) : 0,
      transactions: amounts,
    };
  }

  private async getPayeeStats(
    workspaceId: number,
    payeeId: number
  ): Promise<{
    count: number;
    avgAmount: number;
    stdDev: number;
    lastTransactionDate: string | null;
  }> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return { count: 0, avgAmount: 0, stdDev: 0, lastTransactionDate: null };
    }

    const result = await db
      .select({
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          eq(transactions.payeeId, payeeId)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(100);

    const amounts = result.map((r) => Math.abs(r.amount ?? 0));

    return {
      count: result.length,
      avgAmount: amounts.length > 0 ? mean(amounts) : 0,
      stdDev: amounts.length > 1 ? standardDeviation(amounts) : 0,
      lastTransactionDate: result.length > 0 ? result[0].date : null,
    };
  }

  private async getMonthlyAmounts(
    workspaceId: number,
    entityType: "payee" | "category" | "account",
    entityId: number,
    months: number
  ): Promise<number[]> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return [];
    }

    const entityFilter =
      entityType === "payee"
        ? eq(transactions.payeeId, entityId)
        : entityType === "category"
          ? eq(transactions.categoryId, entityId)
          : eq(transactions.accountId, entityId);

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const result = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        total: sql<number>`SUM(ABS(${transactions.amount}))`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          entityFilter,
          gte(transactions.date, cutoffDate.toISOString().split("T")[0])
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
      .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

    return result.map((r) => r.total ?? 0);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = i - xMean;
      const yDiff = values[i] - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }

    if (denominator === 0) return 0;

    // Normalize slope to -1 to 1 range
    const slope = numerator / denominator;
    const maxSlope = yMean / n; // Maximum expected slope

    if (maxSlope === 0) return 0;

    return Math.max(-1, Math.min(1, slope / maxSlope));
  }

  private calculateAutocorrelation(values: number[], maxLag: number): number[] {
    if (values.length < maxLag + 1) return [];

    const n = values.length;
    const valueMean = mean(values);
    const autocorr: number[] = [];

    // Calculate variance
    let variance = 0;
    for (let i = 0; i < n; i++) {
      variance += Math.pow(values[i] - valueMean, 2);
    }

    if (variance === 0) return Array(maxLag).fill(0);

    for (let lag = 1; lag <= maxLag; lag++) {
      let covariance = 0;
      for (let i = 0; i < n - lag; i++) {
        covariance += (values[i] - valueMean) * (values[i + lag] - valueMean);
      }
      autocorr.push(covariance / variance);
    }

    return autocorr;
  }

  private detectSeasonalityStrength(values: number[]): number {
    if (values.length < 12) return 0;

    // Simple seasonality detection using autocorrelation at lag 12
    const autocorr = this.calculateAutocorrelation(values, 12);
    if (autocorr.length < 12) return 0;

    // The autocorrelation at lag 12 indicates yearly seasonality
    const seasonalAC = autocorr[11];

    // Return strength as absolute value (0 to 1)
    return Math.abs(seasonalAC);
  }

  // ==========================================================================
  // Normalization Utilities
  // ==========================================================================

  /**
   * Normalize features using min-max scaling
   */
  normalizeMinMax(
    features: Record<string, number>,
    mins: Record<string, number>,
    maxs: Record<string, number>
  ): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(features)) {
      const min = mins[key] ?? 0;
      const max = maxs[key] ?? 1;
      const range = max - min;

      normalized[key] = range > 0 ? (value - min) / range : 0;
    }

    return normalized;
  }

  /**
   * Normalize features using z-score scaling
   */
  normalizeZScore(
    features: Record<string, number>,
    means: Record<string, number>,
    stdDevs: Record<string, number>
  ): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(features)) {
      const featureMean = means[key] ?? 0;
      const featureStdDev = stdDevs[key] ?? 1;

      normalized[key] = featureStdDev > 0 ? (value - featureMean) / featureStdDev : 0;
    }

    return normalized;
  }
}

/**
 * Create a feature engineering service instance
 */
export function createFeatureEngineeringService(): FeatureEngineeringService {
  return new FeatureEngineeringService();
}
