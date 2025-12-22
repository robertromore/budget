/**
 * Anomaly Detection Service
 *
 * Orchestrates multiple anomaly detectors to score transactions
 * and identify potentially fraudulent or unusual patterns.
 */

import { transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { MLModelStore } from "../model-store";
import type { AnomalyDetectionConfig, AnomalyScore, FraudPattern } from "../types";
import { getWorkspaceAccountIds } from "../utils";
import {
  type DetectorResult,
  type HistoricalStats,
  calculateHistoricalStats,
  FrequencyAnomalyDetector,
  IQRDetector,
  IsolationForestDetector,
  ModifiedZScoreDetector,
  PercentileDetector,
  RepeatedAmountDetector,
  RoundNumberDetector,
  TimeOfDayDetector,
  ZScoreDetector,
} from "./detectors";

// =============================================================================
// Types
// =============================================================================

interface TransactionForScoring {
  id: number;
  amount: number;
  date: string;
  payeeId?: number | null;
  categoryId?: number | null;
  accountId: number;
  notes?: string | null;
}

interface ScoringContext {
  payeeStats?: HistoricalStats;
  categoryStats?: HistoricalStats;
  accountStats?: HistoricalStats;
  globalStats: HistoricalStats;
  recentAmounts: number[];
  daysSinceLastTransaction?: number;
  recentTransactionCount: number;
  expectedTransactionCount: number;
  hour?: number;
}

// =============================================================================
// Default Fraud Patterns
// =============================================================================

const DEFAULT_FRAUD_PATTERNS: FraudPattern[] = [
  {
    patternId: "round_thousand",
    name: "Round Thousand Amount",
    description: "Large round amounts in thousands may indicate fraud",
    severity: "medium",
    rules: [
      { field: "amount", operator: "gt", value: 1000, weight: 0.5 },
      { field: "amount_mod_1000", operator: "eq", value: 0, weight: 0.5 },
    ],
  },
  {
    patternId: "just_under_limit",
    name: "Just Under Reporting Limit",
    description: "Amounts just under $10,000 may be structuring",
    severity: "high",
    rules: [
      { field: "amount", operator: "between", value: [9500, 9999], weight: 1.0 },
    ],
  },
  {
    patternId: "rapid_succession",
    name: "Rapid Succession",
    description: "Multiple transactions in quick succession",
    severity: "medium",
    rules: [
      { field: "recent_count_1h", operator: "gt", value: 5, weight: 0.7 },
      { field: "recent_count_1h", operator: "gt", value: 10, weight: 1.0 },
    ],
  },
  {
    patternId: "unusual_time",
    name: "Unusual Time Transaction",
    description: "Transactions at unusual hours",
    severity: "low",
    rules: [
      { field: "hour", operator: "between", value: [23, 5], weight: 0.5 },
    ],
  },
  {
    patternId: "new_payee_large",
    name: "Large Amount to New Payee",
    description: "Large transaction to a first-time payee",
    severity: "medium",
    rules: [
      { field: "payee_transaction_count", operator: "eq", value: 1, weight: 0.5 },
      { field: "amount", operator: "gt", value: 500, weight: 0.5 },
    ],
  },
];

// =============================================================================
// Anomaly Detection Service
// =============================================================================

export class AnomalyDetectionService {
  private config: AnomalyDetectionConfig;
  private fraudPatterns: FraudPattern[];

  // Detectors
  private zScoreDetector = new ZScoreDetector();
  private iqrDetector = new IQRDetector();
  private modifiedZScoreDetector = new ModifiedZScoreDetector();
  private isolationForestDetector = new IsolationForestDetector();
  private percentileDetector = new PercentileDetector();
  private roundNumberDetector = new RoundNumberDetector();
  private frequencyAnomalyDetector = new FrequencyAnomalyDetector();
  private timeOfDayDetector = new TimeOfDayDetector();
  private repeatedAmountDetector = new RepeatedAmountDetector();

  constructor(
    private modelStore: MLModelStore,
    config?: Partial<AnomalyDetectionConfig>
  ) {
    this.config = {
      sensitivityLevel: config?.sensitivityLevel ?? "medium",
      enabledDetectors: config?.enabledDetectors ?? [
        "z_score",
        "iqr",
        "modified_z_score",
        "isolation_forest",
        "percentile",
        "round_number",
        "frequency_anomaly",
        "time_of_day",
        "repeated_amount",
      ],
      customThresholds: config?.customThresholds,
      learningPeriodDays: config?.learningPeriodDays ?? 90,
    };
    this.fraudPatterns = DEFAULT_FRAUD_PATTERNS;
  }

  // ==========================================================================
  // Main Scoring Methods
  // ==========================================================================

  /**
   * Score a single transaction for anomalies
   */
  async scoreTransaction(
    workspaceId: number,
    transaction: TransactionForScoring
  ): Promise<AnomalyScore> {
    // Get historical context
    const context = await this.buildScoringContext(workspaceId, transaction);

    // Run all enabled detectors
    const detectorResults = this.runDetectors(transaction, context);

    // Calculate dimension scores
    const dimensions = this.calculateDimensionScores(transaction, context, detectorResults);

    // Calculate overall score using weighted ensemble
    const { overallScore, triggeredDetectors } = this.calculateEnsembleScore(detectorResults);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallScore);

    // Generate explanation
    const explanation = this.generateExplanation(transaction, dimensions, triggeredDetectors);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendations(riskLevel, dimensions, triggeredDetectors);

    return {
      transactionId: transaction.id,
      overallScore,
      riskLevel,
      dimensions,
      detectors: detectorResults.map((r) => ({
        name: r.name,
        score: r.result.score,
        weight: r.weight,
        triggered: r.result.triggered,
      })),
      explanation,
      recommendedActions,
    };
  }

  /**
   * Score multiple transactions in batch
   */
  async scoreTransactions(
    workspaceId: number,
    transactionIds: number[]
  ): Promise<AnomalyScore[]> {
    // Get account IDs for workspace
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return [];
    }

    // Fetch transactions
    const txns = await db
      .select()
      .from(transactions)
      .where(
        and(
          inArray(transactions.id, transactionIds),
          inArray(transactions.accountId, accountIds)
        )
      );

    // Score each transaction
    const scores: AnomalyScore[] = [];
    for (const txn of txns) {
      const score = await this.scoreTransaction(workspaceId, {
        id: txn.id,
        amount: txn.amount,
        date: txn.date,
        payeeId: txn.payeeId,
        categoryId: txn.categoryId,
        accountId: txn.accountId,
        notes: txn.notes,
      });
      scores.push(score);
    }

    return scores;
  }

  /**
   * Scan recent transactions for anomalies
   */
  async scanRecentTransactions(
    workspaceId: number,
    options?: {
      days?: number;
      limit?: number;
      minRiskLevel?: "low" | "medium" | "high" | "critical";
    }
  ): Promise<AnomalyScore[]> {
    const days = options?.days ?? 7;
    const limit = options?.limit ?? 100;
    const minRiskLevel = options?.minRiskLevel ?? "medium";

    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch recent transactions
    const recentTxns = await db
      .select()
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, cutoffDate.toISOString().split("T")[0])
        )
      )
      .orderBy(desc(transactions.date))
      .limit(limit);

    // Score all transactions
    const allScores: AnomalyScore[] = [];
    for (const txn of recentTxns) {
      const score = await this.scoreTransaction(workspaceId, {
        id: txn.id,
        amount: txn.amount,
        date: txn.date,
        payeeId: txn.payeeId,
        categoryId: txn.categoryId,
        accountId: txn.accountId,
        notes: txn.notes,
      });
      allScores.push(score);
    }

    // Filter by minimum risk level
    const riskLevelOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minRiskOrder = riskLevelOrder[minRiskLevel];

    return allScores.filter(
      (score) => riskLevelOrder[score.riskLevel] >= minRiskOrder
    );
  }

  /**
   * Get anomaly profile for a payee
   */
  async getPayeeAnomalyProfile(
    workspaceId: number,
    payeeId: number
  ): Promise<{
    payeeId: number;
    totalTransactions: number;
    anomalyRate: number;
    avgAnomalyScore: number;
    riskDistribution: Record<string, number>;
    commonAnomalyTypes: string[];
  }> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return {
        payeeId,
        totalTransactions: 0,
        anomalyRate: 0,
        avgAnomalyScore: 0,
        riskDistribution: {},
        commonAnomalyTypes: [],
      };
    }

    // Get payee transactions
    const payeeTxns = await db
      .select()
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          eq(transactions.payeeId, payeeId)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(100);

    if (payeeTxns.length === 0) {
      return {
        payeeId,
        totalTransactions: 0,
        anomalyRate: 0,
        avgAnomalyScore: 0,
        riskDistribution: {},
        commonAnomalyTypes: [],
      };
    }

    // Score transactions
    const scores: AnomalyScore[] = [];
    for (const txn of payeeTxns) {
      const score = await this.scoreTransaction(workspaceId, {
        id: txn.id,
        amount: txn.amount,
        date: txn.date,
        payeeId: txn.payeeId,
        categoryId: txn.categoryId,
        accountId: txn.accountId,
        notes: txn.notes,
      });
      scores.push(score);
    }

    // Calculate statistics
    const anomalousCount = scores.filter((s) => s.riskLevel !== "low").length;
    const avgScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length;

    const riskDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const anomalyTypeCounts: Record<string, number> = {};

    for (const score of scores) {
      riskDistribution[score.riskLevel]++;

      for (const detector of score.detectors) {
        if (detector.triggered) {
          anomalyTypeCounts[detector.name] = (anomalyTypeCounts[detector.name] || 0) + 1;
        }
      }
    }

    // Get top anomaly types
    const commonAnomalyTypes = Object.entries(anomalyTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);

    return {
      payeeId,
      totalTransactions: payeeTxns.length,
      anomalyRate: anomalousCount / payeeTxns.length,
      avgAnomalyScore: avgScore,
      riskDistribution,
      commonAnomalyTypes,
    };
  }

  // ==========================================================================
  // Context Building
  // ==========================================================================

  private async buildScoringContext(
    workspaceId: number,
    transaction: TransactionForScoring
  ): Promise<ScoringContext> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);

    // Get cutoff for historical data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.learningPeriodDays);

    // Get global stats (all transactions)
    const globalAmounts = await this.getHistoricalAmounts(accountIds, cutoffDate, {});
    const globalStats = calculateHistoricalStats(globalAmounts);

    // Get payee-specific stats
    let payeeStats: HistoricalStats | undefined;
    if (transaction.payeeId) {
      const payeeAmounts = await this.getHistoricalAmounts(accountIds, cutoffDate, {
        payeeId: transaction.payeeId,
      });
      if (payeeAmounts.length >= 5) {
        payeeStats = calculateHistoricalStats(payeeAmounts);
      }
    }

    // Get category-specific stats
    let categoryStats: HistoricalStats | undefined;
    if (transaction.categoryId) {
      const categoryAmounts = await this.getHistoricalAmounts(accountIds, cutoffDate, {
        categoryId: transaction.categoryId,
      });
      if (categoryAmounts.length >= 5) {
        categoryStats = calculateHistoricalStats(categoryAmounts);
      }
    }

    // Get account-specific stats
    const accountAmounts = await this.getHistoricalAmounts(accountIds, cutoffDate, {
      accountId: transaction.accountId,
    });
    const accountStats = calculateHistoricalStats(accountAmounts);

    // Get recent transactions for frequency analysis
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    const recentTxns = await db
      .select({ amount: transactions.amount, date: transactions.date })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, recentDate.toISOString().split("T")[0])
        )
      )
      .orderBy(desc(transactions.date))
      .limit(100);

    const recentAmounts = recentTxns.map((t) => t.amount);

    // Calculate days since last transaction
    let daysSinceLastTransaction: number | undefined;
    if (transaction.payeeId) {
      const lastTxn = await db
        .select({ date: transactions.date })
        .from(transactions)
        .where(
          and(
            inArray(transactions.accountId, accountIds),
            eq(transactions.payeeId, transaction.payeeId),
            sql`${transactions.date} < ${transaction.date}`
          )
        )
        .orderBy(desc(transactions.date))
        .limit(1);

      if (lastTxn.length > 0) {
        const lastDate = new Date(lastTxn[0].date);
        const currentDate = new Date(transaction.date);
        daysSinceLastTransaction = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // Get hour from transaction date
    const txnDate = new Date(transaction.date);
    const hour = txnDate.getHours();

    // Calculate expected transaction count (based on historical average)
    const expectedTransactionCount = Math.max(1, recentTxns.length / 30) * 30;

    return {
      payeeStats,
      categoryStats,
      accountStats,
      globalStats,
      recentAmounts,
      daysSinceLastTransaction,
      recentTransactionCount: recentTxns.length,
      expectedTransactionCount,
      hour,
    };
  }

  private async getHistoricalAmounts(
    accountIds: number[],
    cutoffDate: Date,
    filters: { payeeId?: number; categoryId?: number; accountId?: number }
  ): Promise<number[]> {
    if (accountIds.length === 0) {
      return [];
    }

    const conditions = [
      inArray(transactions.accountId, accountIds),
      gte(transactions.date, cutoffDate.toISOString().split("T")[0]),
    ];

    if (filters.payeeId) {
      conditions.push(eq(transactions.payeeId, filters.payeeId));
    }
    if (filters.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }
    if (filters.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }

    const result = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(and(...conditions))
      .limit(1000);

    return result.map((r) => r.amount);
  }

  // ==========================================================================
  // Detector Execution
  // ==========================================================================

  private runDetectors(
    transaction: TransactionForScoring,
    context: ScoringContext
  ): Array<{ name: string; weight: number; result: DetectorResult }> {
    const results: Array<{ name: string; weight: number; result: DetectorResult }> = [];

    // Use the most specific stats available (payee > category > account > global)
    const primaryStats = context.payeeStats ?? context.categoryStats ?? context.accountStats ?? context.globalStats;

    // Statistical detectors
    if (this.config.enabledDetectors.includes("z_score")) {
      results.push({
        name: this.zScoreDetector.name,
        weight: this.zScoreDetector.weight,
        result: this.zScoreDetector.detect(transaction.amount, primaryStats),
      });
    }

    if (this.config.enabledDetectors.includes("iqr")) {
      results.push({
        name: this.iqrDetector.name,
        weight: this.iqrDetector.weight,
        result: this.iqrDetector.detect(transaction.amount, primaryStats),
      });
    }

    if (this.config.enabledDetectors.includes("modified_z_score")) {
      results.push({
        name: this.modifiedZScoreDetector.name,
        weight: this.modifiedZScoreDetector.weight,
        result: this.modifiedZScoreDetector.detect(transaction.amount, primaryStats),
      });
    }

    if (this.config.enabledDetectors.includes("isolation_forest")) {
      results.push({
        name: this.isolationForestDetector.name,
        weight: this.isolationForestDetector.weight,
        result: this.isolationForestDetector.detect(transaction.amount, context.globalStats),
      });
    }

    if (this.config.enabledDetectors.includes("percentile")) {
      results.push({
        name: this.percentileDetector.name,
        weight: this.percentileDetector.weight,
        result: this.percentileDetector.detect(transaction.amount, context.globalStats),
      });
    }

    // Rule-based detectors
    if (this.config.enabledDetectors.includes("round_number")) {
      results.push({
        name: this.roundNumberDetector.name,
        weight: this.roundNumberDetector.weight,
        result: this.roundNumberDetector.detect(transaction.amount, primaryStats),
      });
    }

    if (this.config.enabledDetectors.includes("frequency_anomaly")) {
      results.push({
        name: this.frequencyAnomalyDetector.name,
        weight: this.frequencyAnomalyDetector.weight,
        result: this.frequencyAnomalyDetector.detect(transaction.amount, primaryStats, {
          recentTransactionCount: context.recentTransactionCount,
          expectedCount: context.expectedTransactionCount,
          daysSinceLastTransaction: context.daysSinceLastTransaction ?? 0,
        }),
      });
    }

    if (this.config.enabledDetectors.includes("time_of_day") && context.hour !== undefined) {
      results.push({
        name: this.timeOfDayDetector.name,
        weight: this.timeOfDayDetector.weight,
        result: this.timeOfDayDetector.detect(transaction.amount, primaryStats, { hour: context.hour }),
      });
    }

    if (this.config.enabledDetectors.includes("repeated_amount")) {
      results.push({
        name: this.repeatedAmountDetector.name,
        weight: this.repeatedAmountDetector.weight,
        result: this.repeatedAmountDetector.detect(transaction.amount, primaryStats, {
          recentAmounts: context.recentAmounts,
        }),
      });
    }

    return results;
  }

  // ==========================================================================
  // Score Calculation
  // ==========================================================================

  private calculateDimensionScores(
    transaction: TransactionForScoring,
    context: ScoringContext,
    detectorResults: Array<{ name: string; weight: number; result: DetectorResult }>
  ): AnomalyScore["dimensions"] {
    // Amount dimension - use Z-score, IQR, modified Z-score results
    const amountDetectors = detectorResults.filter((r) =>
      ["z_score", "iqr", "modified_z_score", "percentile"].includes(r.name)
    );
    const amountScore = this.aggregateDetectorScores(amountDetectors);
    const amountReason = amountDetectors.find((r) => r.result.triggered)?.result.reason ?? "Amount within normal range";

    // Timing dimension
    const timingDetectors = detectorResults.filter((r) =>
      ["time_of_day", "frequency_anomaly"].includes(r.name)
    );
    const timingScore = this.aggregateDetectorScores(timingDetectors);
    const timingReason = timingDetectors.find((r) => r.result.triggered)?.result.reason ?? "Normal timing pattern";

    // Frequency dimension
    const frequencyDetectors = detectorResults.filter((r) =>
      ["frequency_anomaly", "repeated_amount"].includes(r.name)
    );
    const frequencyScore = this.aggregateDetectorScores(frequencyDetectors);
    const frequencyReason = frequencyDetectors.find((r) => r.result.triggered)?.result.reason ?? "Normal frequency";

    // Category dimension - based on category stats comparison
    let categoryScore = 0;
    let categoryReason = "No category assigned";
    if (context.categoryStats) {
      const absAmount = Math.abs(transaction.amount);
      if (context.categoryStats.stdDev > 0) {
        const zScore = Math.abs((absAmount - context.categoryStats.mean) / context.categoryStats.stdDev);
        categoryScore = Math.min(1, zScore / 5);
        categoryReason = zScore > 2
          ? `Unusual for this category (${zScore.toFixed(1)}σ from mean)`
          : "Typical for this category";
      }
    }

    // Payee dimension - based on payee stats comparison
    let payeeScore = 0;
    let payeeReason = "No payee assigned";
    if (context.payeeStats) {
      const absAmount = Math.abs(transaction.amount);
      if (context.payeeStats.stdDev > 0) {
        const zScore = Math.abs((absAmount - context.payeeStats.mean) / context.payeeStats.stdDev);
        payeeScore = Math.min(1, zScore / 5);
        payeeReason = zScore > 2
          ? `Unusual for this payee (${zScore.toFixed(1)}σ from mean)`
          : "Typical for this payee";
      } else if (context.payeeStats.count === 1) {
        payeeScore = 0.3;
        payeeReason = "First transaction from this payee";
      }
    }

    return {
      amount: { score: amountScore, reason: amountReason },
      timing: { score: timingScore, reason: timingReason },
      frequency: { score: frequencyScore, reason: frequencyReason },
      category: { score: categoryScore, reason: categoryReason },
      payee: { score: payeeScore, reason: payeeReason },
    };
  }

  private aggregateDetectorScores(
    detectors: Array<{ name: string; weight: number; result: DetectorResult }>
  ): number {
    if (detectors.length === 0) return 0;

    const totalWeight = detectors.reduce((sum, d) => sum + d.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = detectors.reduce((sum, d) => sum + d.result.score * d.weight, 0);
    return weightedSum / totalWeight;
  }

  private calculateEnsembleScore(
    detectorResults: Array<{ name: string; weight: number; result: DetectorResult }>
  ): { overallScore: number; triggeredDetectors: string[] } {
    const triggeredDetectors = detectorResults
      .filter((r) => r.result.triggered)
      .map((r) => r.name);

    // Weighted average
    const totalWeight = detectorResults.reduce((sum, d) => sum + d.weight, 0);
    if (totalWeight === 0) {
      return { overallScore: 0, triggeredDetectors };
    }

    let weightedSum = detectorResults.reduce((sum, d) => sum + d.result.score * d.weight, 0);
    let score = weightedSum / totalWeight;

    // Apply sensitivity adjustment
    const sensitivityMultiplier =
      this.config.sensitivityLevel === "low" ? 0.7 :
        this.config.sensitivityLevel === "high" ? 1.3 : 1.0;

    score = Math.min(1, score * sensitivityMultiplier);

    // Boost score if multiple detectors triggered
    if (triggeredDetectors.length >= 3) {
      score = Math.min(1, score * 1.2);
    }

    return { overallScore: score, triggeredDetectors };
  }

  private determineRiskLevel(score: number): AnomalyScore["riskLevel"] {
    if (score >= 0.8) return "critical";
    if (score >= 0.6) return "high";
    if (score >= 0.4) return "medium";
    return "low";
  }

  // ==========================================================================
  // Explanation Generation
  // ==========================================================================

  private generateExplanation(
    transaction: TransactionForScoring,
    dimensions: AnomalyScore["dimensions"],
    triggeredDetectors: string[]
  ): string {
    if (triggeredDetectors.length === 0) {
      return "This transaction appears normal based on historical patterns.";
    }

    const parts: string[] = [];
    const absAmount = Math.abs(transaction.amount).toFixed(2);

    // Add dimension-specific explanations
    if (dimensions.amount.score > 0.5) {
      parts.push(`The amount of $${absAmount} is unusual: ${dimensions.amount.reason}.`);
    }

    if (dimensions.timing.score > 0.5) {
      parts.push(dimensions.timing.reason);
    }

    if (dimensions.frequency.score > 0.5) {
      parts.push(dimensions.frequency.reason);
    }

    if (dimensions.payee.score > 0.5) {
      parts.push(dimensions.payee.reason);
    }

    if (dimensions.category.score > 0.5) {
      parts.push(dimensions.category.reason);
    }

    if (parts.length === 0) {
      return `This transaction triggered ${triggeredDetectors.length} anomaly detector(s) but with moderate scores.`;
    }

    return parts.join(" ");
  }

  private generateRecommendations(
    riskLevel: AnomalyScore["riskLevel"],
    dimensions: AnomalyScore["dimensions"],
    triggeredDetectors: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === "critical") {
      recommendations.push("Review this transaction immediately");
      recommendations.push("Consider contacting your financial institution");
    } else if (riskLevel === "high") {
      recommendations.push("Review this transaction soon");
      recommendations.push("Verify this transaction is legitimate");
    } else if (riskLevel === "medium") {
      recommendations.push("Review this transaction when convenient");
    }

    // Specific recommendations based on dimensions
    if (dimensions.amount.score > 0.7) {
      recommendations.push("Verify the amount is correct");
    }

    if (dimensions.payee.score > 0.5 && triggeredDetectors.includes("round_number")) {
      recommendations.push("Confirm this payee is legitimate");
    }

    if (dimensions.timing.score > 0.5) {
      recommendations.push("Check if this timing is expected");
    }

    if (triggeredDetectors.includes("repeated_amount")) {
      recommendations.push("Review for potential duplicate transactions");
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  // ==========================================================================
  // Alert Management
  // ==========================================================================

  /**
   * Create an alert for an anomalous transaction
   */
  async createAlert(workspaceId: number, score: AnomalyScore): Promise<number> {
    return this.modelStore.createAnomalyAlert(workspaceId, {
      transactionId: score.transactionId,
      overallScore: score.overallScore,
      riskLevel: score.riskLevel,
      scoreDetails: {
        dimensions: score.dimensions,
        detectors: score.detectors,
      },
      explanation: score.explanation,
      recommendedActions: score.recommendedActions,
    });
  }

  /**
   * Auto-create alerts for high-risk transactions
   */
  async autoCreateAlerts(
    workspaceId: number,
    scores: AnomalyScore[],
    minRiskLevel: "medium" | "high" | "critical" = "high"
  ): Promise<number[]> {
    const riskLevelOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minRiskOrder = riskLevelOrder[minRiskLevel];

    const alertIds: number[] = [];

    for (const score of scores) {
      if (riskLevelOrder[score.riskLevel] >= minRiskOrder) {
        const alertId = await this.createAlert(workspaceId, score);
        alertIds.push(alertId);
      }
    }

    return alertIds;
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an anomaly detection service instance
 */
export function createAnomalyDetectionService(
  modelStore: MLModelStore,
  config?: Partial<AnomalyDetectionConfig>
): AnomalyDetectionService {
  return new AnomalyDetectionService(modelStore, config);
}
