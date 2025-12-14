import type { PaymentFrequency } from "$lib/schema";
import { categories, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";

// Comprehensive analysis interfaces for payee intelligence
export interface SpendingAnalysis {
  payeeId: number;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  medianAmount: number;
  standardDeviation: number;
  minAmount: number;
  maxAmount: number;
  amountRange: { min: number; max: number; quartiles: [number, number, number] };
  trendDirection: "increasing" | "decreasing" | "stable";
  trendStrength: number; // 0-1 scale
  volatility: number; // 0-1 scale, based on coefficient of variation
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;
  timeSpanDays: number;
  outlierTransactions: Array<{
    date: string;
    amount: number;
    deviationScore: number; // How many standard deviations from mean
  }>;
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  percentOfTotal: number;
  seasonalMultiplier: number; // Compared to yearly average (1.0 = average)
  confidence: number; // Based on data availability
}

export interface DayOfWeekPattern {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  dayName: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  percentOfTransactions: number;
  preference: number; // 0-1 scale relative to other days
}

export interface FrequencyAnalysis {
  detectedFrequency: PaymentFrequency | null;
  confidence: number; // 0-1 confidence in the detection
  averageDaysBetween: number;
  standardDeviationDays: number;
  regularityScore: number; // 0-1, how regular the transactions are
  predictabilityScore: number; // 0-1, how predictable next transaction is
  intervals: number[]; // All intervals between transactions in days
  irregularPatterns: {
    clusters: Array<{
      averageInterval: number;
      count: number;
      description: string;
    }>;
    hasSeasonalBreaks: boolean;
    unusualGaps: Array<{
      startDate: string;
      endDate: string;
      gapDays: number;
      reason?: string;
    }>;
  };
}

export interface TransactionPrediction {
  nextTransactionDate: string | null;
  predictedAmount: number | null;
  amountRange: { min: number; max: number } | null;
  confidence: number; // 0-1 confidence in prediction
  predictionMethod: "frequency_based" | "seasonal_based" | "trend_based" | "insufficient_data";
  reasoning: string;
  alternativeScenarios: Array<{
    scenario: string;
    date: string;
    amount: number;
    probability: number;
  }>;
}

export interface BudgetAllocationSuggestion {
  suggestedMonthlyAllocation: number;
  allocationRange: { min: number; max: number };
  confidence: number;
  reasoning: string;
  seasonalAdjustments: Array<{
    month: number;
    monthName: string;
    suggestedAdjustment: number;
    adjustmentPercent: number;
    reason: string;
  }>;
  budgetCategory: {
    primaryCategoryId: number | null;
    primaryCategoryName: string | null;
    categoryConfidence: number;
    alternativeCategories: Array<{
      categoryId: number;
      categoryName: string;
      usagePercent: number;
      confidence: number;
    }>;
  };
}

export interface ConfidenceMetrics {
  overall: number; // 0-1 overall confidence
  dataQuality: {
    score: number; // 0-1
    factors: {
      transactionCount: number;
      timeSpanMonths: number;
      dataConsistency: number;
      outlierRatio: number;
    };
  };
  patternReliability: {
    score: number; // 0-1
    factors: {
      frequencyConsistency: number;
      amountConsistency: number;
      seasonalStability: number;
      trendContinuity: number;
    };
  };
  predictionAccuracy: {
    score: number; // 0-1
    factors: {
      historicalAccuracy: number;
      patternStrength: number;
      externalFactors: number;
    };
  };
  explanation: string;
}

export interface CategoryConsistency {
  primaryCategoryId: number | null;
  primaryCategoryName: string | null;
  consistencyScore: number; // 0-1, how often the primary category is used
  categoryDistribution: Array<{
    categoryId: number;
    categoryName: string;
    transactionCount: number;
    totalAmount: number;
    usagePercent: number;
  }>;
  categoryMigration: Array<{
    fromCategoryId: number | null;
    toCategoryId: number;
    fromCategoryName: string | null;
    toCategoryName: string;
    migrationDate: string;
    confidence: number;
  }>;
}

export interface AmountClustering {
  clusters: Array<{
    centerAmount: number;
    minAmount: number;
    maxAmount: number;
    transactionCount: number;
    description: string;
    confidence: number;
    examples: Array<{
      date: string;
      amount: number;
    }>;
  }>;
  primaryCluster: {
    centerAmount: number;
    usagePercent: number;
    description: string;
  } | null;
  anomalousAmounts: Array<{
    date: string;
    amount: number;
    deviationScore: number;
    possibleReason: string;
  }>;
}

/**
 * Advanced Payee Intelligence Service
 * Provides sophisticated analysis and prediction algorithms for payee behavior
 */
export class PayeeIntelligenceService {
  /**
   * Analyze comprehensive spending patterns for a payee
   */
  async analyzeSpendingPatterns(payeeId: number): Promise<SpendingAnalysis> {
    // Get all transaction data for analysis
    const transactionData = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .orderBy(asc(transactions.date));

    if (transactionData.length === 0) {
      return this.createEmptySpendingAnalysis(payeeId);
    }

    const amounts = transactionData.map((t) => t.amount || 0);
    const dates = transactionData.map((t) => new Date(t.date));

    // Calculate basic statistics
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    const averageAmount = totalAmount / amounts.length;
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const medianAmount = this.calculateMedian(sortedAmounts);
    const standardDeviation = this.calculateStandardDeviation(amounts, averageAmount);
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);

    // Calculate quartiles
    const quartiles = this.calculateQuartiles(sortedAmounts);

    // Analyze trend
    const { trendDirection, trendStrength } = this.analyzeTrend(transactionData);

    // Calculate volatility (coefficient of variation)
    const volatility = averageAmount !== 0 ? standardDeviation / Math.abs(averageAmount) : 0;

    // Find outliers (transactions more than 2 standard deviations from mean)
    const outlierTransactions = transactionData
      .filter((t) => Math.abs((t.amount || 0) - averageAmount) > 2 * standardDeviation)
      .map((t) => ({
        date: t.date,
        amount: t.amount || 0,
        deviationScore: Math.abs((t.amount || 0) - averageAmount) / standardDeviation,
      }))
      .sort((a, b) => b.deviationScore - a.deviationScore);

    // Calculate time span
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const timeSpanDays =
      dates.length > 1
        ? Math.round(
            (dates[dates.length - 1]!.getTime() - dates[0]!.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

    return {
      payeeId,
      totalAmount,
      transactionCount: amounts.length,
      averageAmount,
      medianAmount,
      standardDeviation,
      minAmount,
      maxAmount,
      amountRange: {
        min: minAmount,
        max: maxAmount,
        quartiles,
      },
      trendDirection,
      trendStrength,
      volatility: Math.min(1, volatility),
      firstTransactionDate: transactionData[0]?.date || null,
      lastTransactionDate: transactionData[transactionData.length - 1]?.date || null,
      timeSpanDays,
      outlierTransactions: outlierTransactions.slice(0, 10), // Limit to top 10 outliers
    };
  }

  /**
   * Detect seasonal spending patterns
   */
  async detectSeasonality(payeeId: number): Promise<SeasonalPattern[]> {
    const monthlyData = await db
      .select({
        month: sql<number>`CAST(strftime('%m', ${transactions.date}) AS INTEGER)`,
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        averageAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .groupBy(sql`strftime('%m', ${transactions.date})`)
      .orderBy(sql`CAST(strftime('%m', ${transactions.date}) AS INTEGER)`);

    if (monthlyData.length === 0) {
      return [];
    }

    const totalYearlyAmount = monthlyData.reduce((sum, month) => sum + month.totalAmount, 0);
    const totalYearlyTransactions = monthlyData.reduce(
      (sum, month) => sum + month.transactionCount,
      0
    );
    const yearlyAverageAmount = totalYearlyAmount / totalYearlyTransactions;

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return monthlyData.map((month) => {
      const percentOfTotal =
        totalYearlyAmount > 0 ? (month.totalAmount / totalYearlyAmount) * 100 : 0;
      const seasonalMultiplier =
        yearlyAverageAmount > 0 ? month.averageAmount / yearlyAverageAmount : 1;

      // Confidence based on transaction count and data spread
      const confidence =
        Math.min(1, month.transactionCount / 10) *
        (monthlyData.length >= 6 ? 1 : monthlyData.length / 6);

      return {
        month: month.month,
        monthName: monthNames[month.month - 1] ?? "Unknown",
        transactionCount: month.transactionCount,
        totalAmount: month.totalAmount,
        averageAmount: month.averageAmount,
        percentOfTotal,
        seasonalMultiplier,
        confidence,
      };
    });
  }

  /**
   * Analyze day-of-week spending patterns
   */
  async analyzeDayOfWeekPatterns(payeeId: number): Promise<DayOfWeekPattern[]> {
    const dayOfWeekData = await db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${transactions.date}) AS INTEGER)`,
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        averageAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .groupBy(sql`strftime('%w', ${transactions.date})`)
      .orderBy(sql`CAST(strftime('%w', ${transactions.date}) AS INTEGER)`);

    if (dayOfWeekData.length === 0) {
      return [];
    }

    const totalTransactions = dayOfWeekData.reduce((sum, day) => sum + day.transactionCount, 0);
    const maxTransactions = Math.max(...dayOfWeekData.map((day) => day.transactionCount));

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return dayOfWeekData.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      dayName: dayNames[day.dayOfWeek] ?? "Unknown",
      transactionCount: day.transactionCount,
      totalAmount: day.totalAmount,
      averageAmount: day.averageAmount,
      percentOfTransactions:
        totalTransactions > 0 ? (day.transactionCount / totalTransactions) * 100 : 0,
      preference: maxTransactions > 0 ? day.transactionCount / maxTransactions : 0,
    }));
  }

  /**
   * Advanced frequency pattern analysis with irregular pattern support
   */
  async analyzeFrequencyPattern(payeeId: number): Promise<FrequencyAnalysis> {
    const transactionDates = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .orderBy(asc(transactions.date));

    if (transactionDates.length < 2) {
      return {
        detectedFrequency: null,
        confidence: 0,
        averageDaysBetween: 0,
        standardDeviationDays: 0,
        regularityScore: 0,
        predictabilityScore: 0,
        intervals: [],
        irregularPatterns: {
          clusters: [],
          hasSeasonalBreaks: false,
          unusualGaps: [],
        },
      };
    }

    // Calculate intervals between consecutive transactions
    const intervals: number[] = [];
    for (let i = 1; i < transactionDates.length; i++) {
      const prevTransaction = transactionDates[i - 1];
      const currTransaction = transactionDates[i];
      if (prevTransaction && currTransaction) {
        const prev = new Date(prevTransaction.date);
        const curr = new Date(currTransaction.date);
        const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
      }
    }

    const averageDaysBetween =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const standardDeviationDays = this.calculateStandardDeviation(intervals, averageDaysBetween);

    // Calculate regularity score (inverse of coefficient of variation)
    const coefficientOfVariation =
      averageDaysBetween > 0 ? standardDeviationDays / averageDaysBetween : 1;
    const regularityScore = Math.max(0, 1 - Math.min(1, coefficientOfVariation));

    // Detect frequency based on average interval
    const { detectedFrequency, confidence } = this.detectFrequencyFromInterval(
      averageDaysBetween,
      regularityScore
    );

    // Analyze interval clusters
    const clusters = this.analyzeIntervalClusters(intervals);

    // Find unusual gaps (more than 2x the average interval)
    const unusualGaps = this.findUnusualGaps(transactionDates, averageDaysBetween);

    // Check for seasonal breaks
    const hasSeasonalBreaks = this.detectSeasonalBreaks(transactionDates, averageDaysBetween);

    // Calculate predictability score
    const predictabilityScore = this.calculatePredictabilityScore(intervals, detectedFrequency);

    return {
      detectedFrequency,
      confidence,
      averageDaysBetween,
      standardDeviationDays,
      regularityScore,
      predictabilityScore,
      intervals,
      irregularPatterns: {
        clusters,
        hasSeasonalBreaks,
        unusualGaps,
      },
    };
  }

  /**
   * Predict next transaction timing and amount
   */
  async predictNextTransaction(payeeId: number): Promise<TransactionPrediction> {
    const spendingAnalysis = await this.analyzeSpendingPatterns(payeeId);
    const frequencyAnalysis = await this.analyzeFrequencyPattern(payeeId);
    const seasonalPatterns = await this.detectSeasonality(payeeId);

    if (spendingAnalysis.transactionCount < 2) {
      return {
        nextTransactionDate: null,
        predictedAmount: null,
        amountRange: null,
        confidence: 0,
        predictionMethod: "insufficient_data",
        reasoning: "Insufficient transaction history for prediction",
        alternativeScenarios: [],
      };
    }

    const lastTransactionDate = spendingAnalysis.lastTransactionDate;
    if (!lastTransactionDate) {
      return this.createInsufficientDataPrediction();
    }

    let nextTransactionDate: string | null = null;
    let predictionMethod: TransactionPrediction["predictionMethod"] = "insufficient_data";
    let confidence = 0;
    let reasoning = "";

    // Method 1: Frequency-based prediction
    if (frequencyAnalysis.detectedFrequency && frequencyAnalysis.confidence > 0.5) {
      const lastDate = new Date(lastTransactionDate);
      const predictedDate = new Date(lastDate);
      predictedDate.setDate(lastDate.getDate() + Math.round(frequencyAnalysis.averageDaysBetween));

      nextTransactionDate = predictedDate.toISOString().split("T")[0] ?? null;
      predictionMethod = "frequency_based";
      confidence = frequencyAnalysis.confidence * frequencyAnalysis.regularityScore;
      reasoning = `Based on ${frequencyAnalysis.detectedFrequency} payment pattern with ${Math.round(frequencyAnalysis.averageDaysBetween)} day average interval`;
    }

    // Method 2: Seasonal adjustment
    if (seasonalPatterns.length > 0 && nextTransactionDate) {
      const predictedMonth = new Date(nextTransactionDate).getMonth() + 1;
      const seasonalData = seasonalPatterns.find((sp) => sp.month === predictedMonth);

      if (seasonalData && seasonalData.confidence > 0.3) {
        // Adjust prediction confidence based on seasonal reliability
        confidence = Math.min(1, confidence * (1 + seasonalData.confidence * 0.3));
        reasoning += `. Seasonal pattern suggests ${seasonalData.seasonalMultiplier > 1 ? "higher" : "lower"} activity in ${seasonalData.monthName}`;
        predictionMethod = "seasonal_based";
      }
    }

    // Predict amount with range
    const predictedAmount = spendingAnalysis.averageAmount;
    const amountStdDev = spendingAnalysis.standardDeviation;
    const amountRange = {
      min: Math.max(0, predictedAmount - amountStdDev),
      max: predictedAmount + amountStdDev,
    };

    // Generate alternative scenarios
    const alternativeScenarios = this.generateAlternativeScenarios(
      spendingAnalysis,
      frequencyAnalysis,
      lastTransactionDate
    );

    return {
      nextTransactionDate,
      predictedAmount,
      amountRange,
      confidence,
      predictionMethod,
      reasoning,
      alternativeScenarios,
    };
  }

  /**
   * Suggest optimal budget allocation
   */
  async suggestBudgetAllocation(payeeId: number): Promise<BudgetAllocationSuggestion> {
    const spendingAnalysis = await this.analyzeSpendingPatterns(payeeId);
    const seasonalPatterns = await this.detectSeasonality(payeeId);
    const categoryConsistency = await this.analyzeCategoryConsistency(payeeId);

    if (spendingAnalysis.transactionCount === 0) {
      return this.createEmptyBudgetSuggestion();
    }

    // Calculate monthly allocation based on historical data
    const monthlyMultiplier = 30.44; // Average days per month
    const suggestedMonthlyAllocation =
      spendingAnalysis.timeSpanDays > 0
        ? (spendingAnalysis.totalAmount / spendingAnalysis.timeSpanDays) * monthlyMultiplier
        : spendingAnalysis.averageAmount * 4; // Fallback: assume weekly frequency

    // Calculate range based on variability
    const volatilityBuffer = spendingAnalysis.volatility * suggestedMonthlyAllocation;
    const allocationRange = {
      min: Math.max(0, suggestedMonthlyAllocation - volatilityBuffer),
      max: suggestedMonthlyAllocation + volatilityBuffer,
    };

    // Calculate confidence based on data quality
    const dataQualityScore = this.calculateDataQualityScore(spendingAnalysis);
    const confidence = Math.min(1, dataQualityScore * (spendingAnalysis.transactionCount / 20));

    // Generate seasonal adjustments
    const seasonalAdjustments = seasonalPatterns
      .filter((sp) => sp.seasonalMultiplier !== 1)
      .map((sp) => ({
        month: sp.month,
        monthName: sp.monthName,
        suggestedAdjustment: suggestedMonthlyAllocation * (sp.seasonalMultiplier - 1),
        adjustmentPercent: (sp.seasonalMultiplier - 1) * 100,
        reason:
          sp.seasonalMultiplier > 1
            ? `Higher spending typically occurs in ${sp.monthName}`
            : `Lower spending typically occurs in ${sp.monthName}`,
      }));

    const reasoning = this.generateBudgetReasoning(spendingAnalysis, seasonalPatterns, confidence);

    return {
      suggestedMonthlyAllocation,
      allocationRange,
      confidence,
      reasoning,
      seasonalAdjustments,
      budgetCategory: categoryConsistency,
    };
  }

  /**
   * Calculate comprehensive confidence scores
   */
  async calculateConfidenceScores(payeeId: number): Promise<ConfidenceMetrics> {
    const spendingAnalysis = await this.analyzeSpendingPatterns(payeeId);
    const frequencyAnalysis = await this.analyzeFrequencyPattern(payeeId);
    const seasonalPatterns = await this.detectSeasonality(payeeId);

    // Data quality assessment
    const dataQuality = this.assessDataQuality(spendingAnalysis, frequencyAnalysis);

    // Pattern reliability assessment
    const patternReliability = this.assessPatternReliability(
      spendingAnalysis,
      frequencyAnalysis,
      seasonalPatterns
    );

    // Prediction accuracy assessment
    const predictionAccuracy = this.assessPredictionAccuracy(spendingAnalysis, frequencyAnalysis);

    const overall = (dataQuality.score + patternReliability.score + predictionAccuracy.score) / 3;

    const explanation = this.generateConfidenceExplanation(
      overall,
      dataQuality,
      patternReliability,
      predictionAccuracy
    );

    return {
      overall,
      dataQuality,
      patternReliability,
      predictionAccuracy,
      explanation,
    };
  }

  /**
   * Analyze category usage consistency
   */
  private async analyzeCategoryConsistency(
    payeeId: number
  ): Promise<BudgetAllocationSuggestion["budgetCategory"]> {
    const categoryData = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.payeeId, payeeId), isNull(transactions.deletedAt)))
      .groupBy(transactions.categoryId, categories.name)
      .orderBy(desc(count(transactions.id)));

    if (categoryData.length === 0) {
      return {
        primaryCategoryId: null,
        primaryCategoryName: null,
        categoryConfidence: 0,
        alternativeCategories: [],
      };
    }

    const totalTransactions = categoryData.reduce((sum, cat) => sum + cat.transactionCount, 0);
    const primaryCategory = categoryData[0]!; // Safe because we checked length above

    const categoryConfidence =
      totalTransactions > 0 ? primaryCategory.transactionCount / totalTransactions : 0;

    const alternativeCategories = categoryData.slice(1, 4).map((cat) => ({
      categoryId: cat.categoryId || 0,
      categoryName: cat.categoryName || "Uncategorized",
      usagePercent: totalTransactions > 0 ? (cat.transactionCount / totalTransactions) * 100 : 0,
      confidence: totalTransactions > 0 ? cat.transactionCount / totalTransactions : 0,
    }));

    return {
      primaryCategoryId: primaryCategory.categoryId,
      primaryCategoryName: primaryCategory.categoryName || "Uncategorized",
      categoryConfidence,
      alternativeCategories,
    };
  }

  // Helper methods for statistical calculations and analysis

  private calculateMedian(sortedNumbers: number[]): number {
    const mid = Math.floor(sortedNumbers.length / 2);
    return sortedNumbers.length % 2 !== 0
      ? (sortedNumbers[mid] ?? 0)
      : ((sortedNumbers[mid - 1] ?? 0) + (sortedNumbers[mid] ?? 0)) / 2;
  }

  private calculateQuartiles(sortedNumbers: number[]): [number, number, number] {
    const q1Index = Math.floor(sortedNumbers.length * 0.25);
    const q2Index = Math.floor(sortedNumbers.length * 0.5);
    const q3Index = Math.floor(sortedNumbers.length * 0.75);

    return [sortedNumbers[q1Index] ?? 0, sortedNumbers[q2Index] ?? 0, sortedNumbers[q3Index] ?? 0];
  }

  private calculateStandardDeviation(numbers: number[], mean: number): number {
    const variance =
      numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  private analyzeTrend(transactionData: Array<{ date: string; amount: number | null }>): {
    trendDirection: "increasing" | "decreasing" | "stable";
    trendStrength: number;
  } {
    if (transactionData.length < 3) {
      return { trendDirection: "stable", trendStrength: 0 };
    }

    // Use linear regression to detect trend
    const points = transactionData.map((t, index) => ({
      x: index,
      y: t.amount || 0,
    }));

    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate R-squared for trend strength
    const meanY = sumY / n;
    const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    const ssResidual = points.reduce((sum, p) => {
      const predicted = slope * p.x + (sumY - slope * sumX) / n;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);

    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    const trendDirection =
      Math.abs(slope) < 0.01 ? "stable" : slope > 0 ? "increasing" : "decreasing";
    const trendStrength = Math.min(1, Math.abs(rSquared));

    return { trendDirection, trendStrength };
  }

  private detectFrequencyFromInterval(
    averageInterval: number,
    regularityScore: number
  ): { detectedFrequency: PaymentFrequency | null; confidence: number } {
    const frequencyRanges = [
      { frequency: "weekly" as const, min: 6, max: 8, ideal: 7 },
      { frequency: "bi_weekly" as const, min: 13, max: 15, ideal: 14 },
      { frequency: "monthly" as const, min: 28, max: 32, ideal: 30 },
      { frequency: "quarterly" as const, min: 85, max: 95, ideal: 90 },
      { frequency: "annual" as const, min: 350, max: 380, ideal: 365 },
    ];

    for (const range of frequencyRanges) {
      if (averageInterval >= range.min && averageInterval <= range.max) {
        const deviation = Math.abs(averageInterval - range.ideal) / (range.max - range.min);
        const intervalConfidence = 1 - deviation;
        const confidence = intervalConfidence * regularityScore;

        return {
          detectedFrequency: range.frequency,
          confidence: Math.min(1, confidence),
        };
      }
    }

    return {
      detectedFrequency: "irregular",
      confidence: Math.min(0.5, regularityScore),
    };
  }

  private analyzeIntervalClusters(
    intervals: number[]
  ): Array<{ averageInterval: number; count: number; description: string }> {
    if (intervals.length === 0) return [];

    // Simple clustering: group intervals within 20% of each other
    const clusters: Array<{ intervals: number[]; center: number }> = [];

    for (const interval of intervals) {
      let foundCluster = false;

      for (const cluster of clusters) {
        const tolerance = cluster.center * 0.2;
        if (Math.abs(interval - cluster.center) <= tolerance) {
          cluster.intervals.push(interval);
          cluster.center =
            cluster.intervals.reduce((sum, i) => sum + i, 0) / cluster.intervals.length;
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({ intervals: [interval], center: interval });
      }
    }

    return clusters
      .filter((cluster) => cluster.intervals.length >= 2)
      .map((cluster) => ({
        averageInterval: cluster.center,
        count: cluster.intervals.length,
        description: this.describeInterval(cluster.center),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private describeInterval(days: number): string {
    if (days <= 1) return "Daily";
    if (days <= 7) return "Weekly";
    if (days <= 14) return "Bi-weekly";
    if (days <= 31) return "Monthly";
    if (days <= 93) return "Quarterly";
    if (days <= 186) return "Semi-annually";
    if (days <= 380) return "Annually";
    return "Very infrequent";
  }

  private findUnusualGaps(
    transactionDates: Array<{ date: string }>,
    averageInterval: number
  ): Array<{ startDate: string; endDate: string; gapDays: number; reason?: string }> {
    const gaps: Array<{ startDate: string; endDate: string; gapDays: number; reason?: string }> =
      [];
    const threshold = Math.max(60, averageInterval * 2); // At least 60 days or 2x average

    for (let i = 1; i < transactionDates.length; i++) {
      const prevTransaction = transactionDates[i - 1];
      const currTransaction = transactionDates[i];
      if (!prevTransaction || !currTransaction) continue;

      const prev = new Date(prevTransaction.date);
      const curr = new Date(currTransaction.date);
      const gapDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (gapDays > threshold) {
        gaps.push({
          startDate: prevTransaction.date,
          endDate: currTransaction.date,
          gapDays,
          reason: this.inferGapReason(gapDays, prev, curr),
        });
      }
    }

    return gaps.sort((a, b) => b.gapDays - a.gapDays);
  }

  private inferGapReason(gapDays: number, startDate: Date, endDate: Date): string {
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();

    if (gapDays >= 300) return "Extended hiatus or service cancellation";
    if (gapDays >= 150) return "Possible seasonal break or temporary suspension";
    if (gapDays >= 60) {
      if ((startMonth >= 5 && startMonth <= 7) || (endMonth >= 5 && endMonth <= 7)) {
        return "Possible summer break";
      }
      if ((startMonth >= 10 && startMonth <= 11) || (endMonth >= 0 && endMonth <= 1)) {
        return "Possible holiday season break";
      }
      return "Extended gap in service or payments";
    }
    return "Unusual delay";
  }

  private detectSeasonalBreaks(
    transactionDates: Array<{ date: string }>,
    averageInterval: number
  ): boolean {
    // Look for consistent gaps during specific seasons
    const summerGaps = transactionDates.filter((t) => {
      const month = new Date(t.date).getMonth();
      return month >= 5 && month <= 7; // June, July, August
    });

    const winterGaps = transactionDates.filter((t) => {
      const month = new Date(t.date).getMonth();
      return month === 11 || month === 0 || month === 1; // December, January, February
    });

    // If there are consistent gaps during these periods, it suggests seasonal breaks
    return (
      summerGaps.length < transactionDates.length * 0.1 ||
      winterGaps.length < transactionDates.length * 0.1
    );
  }

  private calculatePredictabilityScore(
    intervals: number[],
    detectedFrequency: PaymentFrequency | null
  ): number {
    if (intervals.length < 3 || !detectedFrequency) return 0;

    const expectedInterval = this.getExpectedInterval(detectedFrequency);
    if (!expectedInterval) return 0;

    // Score based on how close intervals are to the expected frequency
    const deviations = intervals.map(
      (interval) => Math.abs(interval - expectedInterval) / expectedInterval
    );
    const averageDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;

    return Math.max(0, 1 - averageDeviation);
  }

  private getExpectedInterval(frequency: PaymentFrequency): number | null {
    const frequencyMap: Record<PaymentFrequency, number> = {
      weekly: 7,
      bi_weekly: 14,
      monthly: 30,
      quarterly: 90,
      annual: 365,
      irregular: 0,
    };

    return frequencyMap[frequency] || null;
  }

  private generateAlternativeScenarios(
    spendingAnalysis: SpendingAnalysis,
    frequencyAnalysis: FrequencyAnalysis,
    lastTransactionDate: string
  ): Array<{ scenario: string; date: string; amount: number; probability: number }> {
    const scenarios: Array<{
      scenario: string;
      date: string;
      amount: number;
      probability: number;
    }> = [];
    const lastDate = new Date(lastTransactionDate);

    // Early scenario (if interval varies)
    if (frequencyAnalysis.standardDeviationDays > 0) {
      const earlyDate = new Date(lastDate);
      earlyDate.setDate(
        lastDate.getDate() +
          Math.round(frequencyAnalysis.averageDaysBetween - frequencyAnalysis.standardDeviationDays)
      );

      scenarios.push({
        scenario: "Early payment",
        date: earlyDate.toISOString().split("T")[0] ?? "",
        amount: spendingAnalysis.averageAmount,
        probability: 0.25,
      });
    }

    // Late scenario
    if (frequencyAnalysis.standardDeviationDays > 0) {
      const lateDate = new Date(lastDate);
      lateDate.setDate(
        lastDate.getDate() +
          Math.round(frequencyAnalysis.averageDaysBetween + frequencyAnalysis.standardDeviationDays)
      );

      scenarios.push({
        scenario: "Delayed payment",
        date: lateDate.toISOString().split("T")[0] ?? "",
        amount: spendingAnalysis.averageAmount,
        probability: 0.25,
      });
    }

    // High amount scenario
    if (spendingAnalysis.standardDeviation > 0) {
      const normalDate = new Date(lastDate);
      normalDate.setDate(lastDate.getDate() + Math.round(frequencyAnalysis.averageDaysBetween));

      scenarios.push({
        scenario: "Higher than average amount",
        date: normalDate.toISOString().split("T")[0] ?? "",
        amount: spendingAnalysis.averageAmount + spendingAnalysis.standardDeviation,
        probability: 0.15,
      });
    }

    return scenarios;
  }

  private assessDataQuality(
    spendingAnalysis: SpendingAnalysis,
    frequencyAnalysis: FrequencyAnalysis
  ): ConfidenceMetrics["dataQuality"] {
    const transactionCountScore = Math.min(1, spendingAnalysis.transactionCount / 20);
    const timeSpanScore = Math.min(1, spendingAnalysis.timeSpanDays / 365);
    const consistencyScore = frequencyAnalysis.regularityScore;
    const outlierRatio =
      spendingAnalysis.outlierTransactions.length / spendingAnalysis.transactionCount;
    const outlierScore = Math.max(0, 1 - outlierRatio * 2);

    const score = (transactionCountScore + timeSpanScore + consistencyScore + outlierScore) / 4;

    return {
      score,
      factors: {
        transactionCount: spendingAnalysis.transactionCount,
        timeSpanMonths: Math.round(spendingAnalysis.timeSpanDays / 30.44),
        dataConsistency: consistencyScore,
        outlierRatio,
      },
    };
  }

  private assessPatternReliability(
    spendingAnalysis: SpendingAnalysis,
    frequencyAnalysis: FrequencyAnalysis,
    seasonalPatterns: SeasonalPattern[]
  ): ConfidenceMetrics["patternReliability"] {
    const frequencyConsistency = frequencyAnalysis.confidence;
    const amountConsistency = 1 - Math.min(1, spendingAnalysis.volatility);
    const seasonalStability =
      seasonalPatterns.length > 0
        ? seasonalPatterns.reduce((sum, sp) => sum + sp.confidence, 0) / seasonalPatterns.length
        : 0;
    const trendContinuity = spendingAnalysis.trendStrength;

    const score =
      (frequencyConsistency + amountConsistency + seasonalStability + trendContinuity) / 4;

    return {
      score,
      factors: {
        frequencyConsistency,
        amountConsistency,
        seasonalStability,
        trendContinuity,
      },
    };
  }

  private assessPredictionAccuracy(
    spendingAnalysis: SpendingAnalysis,
    frequencyAnalysis: FrequencyAnalysis
  ): ConfidenceMetrics["predictionAccuracy"] {
    // This would typically be based on historical prediction accuracy
    // For now, we'll estimate based on pattern strength
    const historicalAccuracy = 0.7; // Placeholder
    const patternStrength =
      (frequencyAnalysis.regularityScore + frequencyAnalysis.predictabilityScore) / 2;
    const externalFactors = 0.8; // Placeholder for external factor consideration

    const score = (historicalAccuracy + patternStrength + externalFactors) / 3;

    return {
      score,
      factors: {
        historicalAccuracy,
        patternStrength,
        externalFactors,
      },
    };
  }

  private generateConfidenceExplanation(
    overall: number,
    dataQuality: ConfidenceMetrics["dataQuality"],
    patternReliability: ConfidenceMetrics["patternReliability"],
    predictionAccuracy: ConfidenceMetrics["predictionAccuracy"]
  ): string {
    const confidenceLevel =
      overall > 0.8 ? "High" : overall > 0.6 ? "Medium" : overall > 0.4 ? "Low" : "Very Low";

    const explanations = [];

    if (dataQuality.score < 0.5) {
      explanations.push("limited transaction history");
    }

    if (patternReliability.score < 0.5) {
      explanations.push("irregular spending patterns");
    }

    if (predictionAccuracy.score < 0.5) {
      explanations.push("unpredictable transaction timing");
    }

    const baseExplanation = `${confidenceLevel} confidence in predictions`;

    if (explanations.length > 0) {
      return `${baseExplanation} due to ${explanations.join(", ")}.`;
    }

    return `${baseExplanation} based on consistent patterns and sufficient data.`;
  }

  private calculateDataQualityScore(spendingAnalysis: SpendingAnalysis): number {
    const transactionScore = Math.min(1, spendingAnalysis.transactionCount / 10);
    const timeScore = Math.min(1, spendingAnalysis.timeSpanDays / 180);
    const consistencyScore = 1 - Math.min(1, spendingAnalysis.volatility);

    return (transactionScore + timeScore + consistencyScore) / 3;
  }

  private generateBudgetReasoning(
    spendingAnalysis: SpendingAnalysis,
    seasonalPatterns: SeasonalPattern[],
    confidence: number
  ): string {
    const parts = [];

    parts.push(
      `Based on ${spendingAnalysis.transactionCount} transactions over ${Math.round(spendingAnalysis.timeSpanDays / 30.44)} months`
    );

    if (spendingAnalysis.trendDirection !== "stable") {
      parts.push(`with ${spendingAnalysis.trendDirection} trend`);
    }

    if (seasonalPatterns.length > 0) {
      const seasonalMonths = seasonalPatterns.filter(
        (sp) => Math.abs(sp.seasonalMultiplier - 1) > 0.2
      );
      if (seasonalMonths.length > 0) {
        parts.push(`and seasonal variations`);
      }
    }

    const confidenceText =
      confidence > 0.7
        ? "high confidence"
        : confidence > 0.4
          ? "medium confidence"
          : "low confidence";
    parts.push(`(${confidenceText})`);

    return parts.join(" ");
  }

  // Empty/fallback result creators
  private createEmptySpendingAnalysis(payeeId: number): SpendingAnalysis {
    return {
      payeeId,
      totalAmount: 0,
      transactionCount: 0,
      averageAmount: 0,
      medianAmount: 0,
      standardDeviation: 0,
      minAmount: 0,
      maxAmount: 0,
      amountRange: { min: 0, max: 0, quartiles: [0, 0, 0] },
      trendDirection: "stable",
      trendStrength: 0,
      volatility: 0,
      firstTransactionDate: null,
      lastTransactionDate: null,
      timeSpanDays: 0,
      outlierTransactions: [],
    };
  }

  private createInsufficientDataPrediction(): TransactionPrediction {
    return {
      nextTransactionDate: null,
      predictedAmount: null,
      amountRange: null,
      confidence: 0,
      predictionMethod: "insufficient_data",
      reasoning: "Insufficient transaction history for reliable prediction",
      alternativeScenarios: [],
    };
  }

  private createEmptyBudgetSuggestion(): BudgetAllocationSuggestion {
    return {
      suggestedMonthlyAllocation: 0,
      allocationRange: { min: 0, max: 0 },
      confidence: 0,
      reasoning: "No transaction history available for budget allocation suggestion",
      seasonalAdjustments: [],
      budgetCategory: {
        primaryCategoryId: null,
        primaryCategoryName: null,
        categoryConfidence: 0,
        alternativeCategories: [],
      },
    };
  }
}
