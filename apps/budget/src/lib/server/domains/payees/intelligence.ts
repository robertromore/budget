import type { PaymentFrequency, IntelligenceProfile, WorkspacePreferences } from "$lib/schema";
import { categories, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { formatDayOrdinal } from "$lib/utils/date-formatters";
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { createIntelligenceCoordinator, type StrategyResult } from "$lib/server/ai/intelligence-coordinator";
import type { ProviderInstance } from "$lib/server/ai/providers";
import { generateText } from "ai";

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

export interface DayOfMonthPattern {
  dayOfMonth: number; // 1-31
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  percentOfTransactions: number;
  preference: number; // 0-1 scale relative to other days
}

export interface MonthlyPattern {
  /** Days of the month that commonly have transactions (e.g., [10, 25] for bi-monthly) */
  commonDays: number[];
  /** Whether this is a regular bi-monthly pattern (e.g., 1st and 15th, 10th and 25th) */
  isBiMonthly: boolean;
  /** Whether this is a monthly pattern on a specific day */
  isMonthly: boolean;
  /** The primary day of month for monthly patterns */
  primaryDayOfMonth: number | null;
  /** Confidence in the detected pattern */
  confidence: number;
}

export interface FrequencyAnalysis {
  detectedFrequency: PaymentFrequency | null;
  confidence: number; // 0-1 confidence in the detection
  averageDaysBetween: number;
  standardDeviationDays: number;
  regularityScore: number; // 0-1, how regular the transactions are
  predictabilityScore: number; // 0-1, how predictable next transaction is
  intervals: number[]; // All intervals between transactions in days
  /** Day-of-month pattern analysis for monthly/bi-monthly payees */
  monthlyPattern: MonthlyPattern | null;
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
  /** Prediction tier: statistical, ml, or ai */
  tier?: "statistical" | "ml" | "ai";
  /** AI-generated explanation (only present when tier is 'ai') */
  aiExplanation?: string;
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
  /** Prediction tier: statistical, ml, or ai */
  tier?: "statistical" | "ml" | "ai";
  /** AI-generated explanation (only present when tier is 'ai') */
  aiExplanation?: string;
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
   * Build SQL filter conditions based on intelligence profile settings
   */
  private buildFilterConditions(
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): SQL[] {
    const conditions: SQL[] = [
      eq(transactions.payeeId, payeeId),
      isNull(transactions.deletedAt),
    ];

    // If profile is not enabled or doesn't exist, return base conditions
    if (!profile?.enabled || !profile?.filters) {
      return conditions;
    }

    const filters = profile.filters;

    // Amount sign filter
    if (filters.amountSign === "positive") {
      conditions.push(gt(transactions.amount, 0));
    } else if (filters.amountSign === "negative") {
      conditions.push(lt(transactions.amount, 0));
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange.type !== "all") {
      const now = new Date();
      let startDate: Date | null = null;

      if (filters.dateRange.type === "last_n_months" && filters.dateRange.months) {
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - filters.dateRange.months);
      } else if (filters.dateRange.type === "last_n_years" && filters.dateRange.months) {
        // months field stores the total months for years too
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - filters.dateRange.months);
      }

      if (startDate) {
        conditions.push(gte(transactions.date, startDate.toISOString().split("T")[0]!));
      }
    }

    // Amount threshold filters
    if (filters.minAmount !== undefined) {
      conditions.push(sql`ABS(${transactions.amount}) >= ${filters.minAmount}`);
    }
    if (filters.maxAmount !== undefined) {
      conditions.push(sql`ABS(${transactions.amount}) <= ${filters.maxAmount}`);
    }

    return conditions;
  }

  /**
   * Build category type filter conditions (requires join with categories)
   * Returns null if no category filtering is needed
   */
  private buildCategoryFilter(profile?: IntelligenceProfile | null): SQL | null {
    if (!profile?.enabled || !profile?.filters) {
      return null;
    }

    const filters = profile.filters;
    const categoryConditions: SQL[] = [];

    // Category type filter
    if (filters.categoryTypes && filters.categoryTypes.length > 0) {
      categoryConditions.push(inArray(categories.categoryType, filters.categoryTypes));
    }

    // Exclude transfers filter
    if (filters.excludeTransfers) {
      categoryConditions.push(
        or(
          isNull(categories.categoryType),
          sql`${categories.categoryType} != 'transfer'`
        )!
      );
    }

    if (categoryConditions.length === 0) {
      return null;
    }

    return categoryConditions.length === 1
      ? categoryConditions[0]!
      : and(...categoryConditions)!;
  }

  /**
   * Analyze comprehensive spending patterns for a payee
   */
  async analyzeSpendingPatterns(
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): Promise<SpendingAnalysis> {
    // Build filter conditions from profile
    const baseConditions = this.buildFilterConditions(payeeId, profile);
    const categoryFilter = this.buildCategoryFilter(profile);

    // Get all transaction data for analysis
    let query = db
      .select({
        date: transactions.date,
        amount: transactions.amount,
      })
      .from(transactions);

    // Join with categories if we need category filtering
    if (categoryFilter) {
      query = query.leftJoin(categories, eq(transactions.categoryId, categories.id)) as typeof query;
    }

    const allConditions = categoryFilter
      ? [...baseConditions, categoryFilter]
      : baseConditions;

    const transactionData = await query
      .where(and(...allConditions))
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
  async detectSeasonality(
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): Promise<SeasonalPattern[]> {
    const baseConditions = this.buildFilterConditions(payeeId, profile);
    const categoryFilter = this.buildCategoryFilter(profile);

    let query = db
      .select({
        month: sql<number>`CAST(strftime('%m', ${transactions.date}) AS INTEGER)`,
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        averageAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
      })
      .from(transactions);

    if (categoryFilter) {
      query = query.leftJoin(categories, eq(transactions.categoryId, categories.id)) as typeof query;
    }

    const allConditions = categoryFilter
      ? [...baseConditions, categoryFilter]
      : baseConditions;

    const monthlyData = await query
      .where(and(...allConditions))
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
  async analyzeDayOfWeekPatterns(
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): Promise<DayOfWeekPattern[]> {
    const baseConditions = this.buildFilterConditions(payeeId, profile);
    const categoryFilter = this.buildCategoryFilter(profile);

    let query = db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${transactions.date}) AS INTEGER)`,
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        averageAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
      })
      .from(transactions);

    if (categoryFilter) {
      query = query.leftJoin(categories, eq(transactions.categoryId, categories.id)) as typeof query;
    }

    const allConditions = categoryFilter
      ? [...baseConditions, categoryFilter]
      : baseConditions;

    const dayOfWeekData = await query
      .where(and(...allConditions))
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
  async analyzeFrequencyPattern(
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): Promise<FrequencyAnalysis> {
    const baseConditions = this.buildFilterConditions(payeeId, profile);
    const categoryFilter = this.buildCategoryFilter(profile);

    let query = db
      .select({ date: transactions.date })
      .from(transactions);

    if (categoryFilter) {
      query = query.leftJoin(categories, eq(transactions.categoryId, categories.id)) as typeof query;
    }

    const allConditions = categoryFilter
      ? [...baseConditions, categoryFilter]
      : baseConditions;

    const transactionDates = await query
      .where(and(...allConditions))
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
        monthlyPattern: null,
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

    // Analyze day-of-month patterns for monthly/bi-monthly detection
    const monthlyPattern = this.analyzeDayOfMonthPattern(transactionDates.map((t) => t.date));

    return {
      detectedFrequency,
      confidence,
      averageDaysBetween,
      standardDeviationDays,
      regularityScore,
      predictabilityScore,
      intervals,
      monthlyPattern,
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
  async predictNextTransaction(
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): Promise<TransactionPrediction> {
    const spendingAnalysis = await this.analyzeSpendingPatterns(payeeId, profile);
    const frequencyAnalysis = await this.analyzeFrequencyPattern(payeeId, profile);
    const seasonalPatterns = await this.detectSeasonality(payeeId, profile);

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

    const now = new Date();
    // Set to start of today for comparison
    now.setHours(0, 0, 0, 0);

    // Method 1: Day-of-month pattern (for bi-monthly or monthly payees like payroll)
    const monthlyPattern = frequencyAnalysis.monthlyPattern;
    if (monthlyPattern && monthlyPattern.confidence > 0.4) {
      let predictedDate: Date;

      if (monthlyPattern.isBiMonthly && monthlyPattern.commonDays.length >= 2) {
        // Bi-monthly pattern (e.g., 10th and 25th)
        predictedDate = this.getNextBiMonthlyDate(now, monthlyPattern.commonDays);
        predictionMethod = "frequency_based";
        confidence = monthlyPattern.confidence * 0.95;
        reasoning = `Bi-monthly pattern detected: transactions typically occur on the ${monthlyPattern.commonDays.map(d => formatDayOrdinal(d)).join(" and ")}`;
      } else if (monthlyPattern.isMonthly && monthlyPattern.primaryDayOfMonth) {
        // Monthly pattern (single day)
        predictedDate = this.getNextDayOfMonthDate(now, monthlyPattern.primaryDayOfMonth);
        predictionMethod = "frequency_based";
        confidence = monthlyPattern.confidence * 0.95;
        const dayDesc = monthlyPattern.primaryDayOfMonth === 31
          ? "end of month"
          : formatDayOrdinal(monthlyPattern.primaryDayOfMonth);
        reasoning = `Monthly pattern detected: transactions typically occur on the ${dayDesc}`;
      } else {
        // Fall through to interval-based
        predictedDate = new Date(now);
      }

      // Ensure it's in the future
      if (predictedDate > now) {
        nextTransactionDate = predictedDate.toISOString().split("T")[0] ?? null;
      }
    }

    // Method 2: Frequency-based prediction (fallback or when day-of-month pattern not detected)
    if (!nextTransactionDate && frequencyAnalysis.detectedFrequency && frequencyAnalysis.confidence > 0.5) {
      const lastDate = new Date(lastTransactionDate);
      let predictedDate = new Date(lastDate);
      predictedDate.setDate(lastDate.getDate() + Math.round(frequencyAnalysis.averageDaysBetween));

      // If predicted date is in the past, advance to future
      while (predictedDate <= now) {
        predictedDate.setDate(predictedDate.getDate() + Math.round(frequencyAnalysis.averageDaysBetween));
      }

      nextTransactionDate = predictedDate.toISOString().split("T")[0] ?? null;
      predictionMethod = "frequency_based";
      confidence = frequencyAnalysis.confidence * frequencyAnalysis.regularityScore;
      reasoning = `Based on ${frequencyAnalysis.detectedFrequency} payment pattern with ${Math.round(frequencyAnalysis.averageDaysBetween)} day average interval`;
    }

    // Method 3: Seasonal adjustment
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
    // Use median for predicted amount (more robust to outliers/bimodal distributions)
    const predictedAmount = spendingAnalysis.medianAmount;
    // Use actual min/max from transaction history for the range
    // This is more useful than mean±stddev for bimodal distributions
    // (e.g., regular payments of $3500 plus occasional $50 fees)
    const amountRange = {
      min: spendingAnalysis.minAmount,
      max: spendingAnalysis.maxAmount,
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
  async suggestBudgetAllocation(
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): Promise<BudgetAllocationSuggestion> {
    const spendingAnalysis = await this.analyzeSpendingPatterns(payeeId, profile);
    const seasonalPatterns = await this.detectSeasonality(payeeId, profile);
    const categoryConsistency = await this.analyzeCategoryConsistency(payeeId, profile);

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

  // ==========================================================================
  // ML and AI Enhancement Methods
  // ==========================================================================

  /**
   * Enhance a prediction with ML-based forecasting
   * Uses time-series forecasting to improve prediction accuracy
   */
  async enhanceWithML(
    prediction: TransactionPrediction,
    workspaceId: number,
    payeeId: number
  ): Promise<TransactionPrediction> {
    try {
      // Import the forecasting service dynamically to avoid circular dependencies
      const { getUnifiedMLCoordinator } = await import("../ml/unified-coordinator");
      const mlCoordinator = getUnifiedMLCoordinator();

      // Get ML-based spending forecast for this payee
      const forecast = await mlCoordinator.getCashFlowForecast(workspaceId, {
        horizon: 3,
        granularity: "monthly",
      });

      if (!forecast || forecast.predictions.length === 0) {
        // ML couldn't improve prediction, return with tier marker
        return {
          ...prediction,
          tier: "statistical",
        };
      }

      // Use ML forecast to refine prediction
      const mlPredictedAmount = forecast.predictions[0]?.value ?? prediction.predictedAmount;
      const mlConfidence = forecast.confidence ?? 0;

      // Blend ML prediction with statistical prediction
      // Weight ML higher when it has good confidence
      const mlWeight = Math.min(0.7, mlConfidence);
      const blendedAmount = prediction.predictedAmount !== null
        ? (prediction.predictedAmount * (1 - mlWeight)) + ((mlPredictedAmount ?? 0) * mlWeight)
        : mlPredictedAmount;

      // Adjust confidence based on ML
      const blendedConfidence = Math.min(1, (prediction.confidence + mlConfidence) / 1.5);

      return {
        ...prediction,
        predictedAmount: blendedAmount,
        confidence: blendedConfidence,
        reasoning: `${prediction.reasoning}. ML forecasting ${mlConfidence > 0.6 ? "confirms" : "suggests adjustments to"} this prediction.`,
        tier: "ml",
      };
    } catch (error) {
      // ML enhancement failed, return original with statistical tier
      console.warn("ML enhancement failed:", error);
      return {
        ...prediction,
        tier: "statistical",
      };
    }
  }

  /**
   * Enhance a prediction with AI-generated natural language explanation
   * Uses LLM to provide user-friendly context and insights
   */
  async enhanceWithAI(
    prediction: TransactionPrediction,
    llmProvider: ProviderInstance,
    payeeName: string
  ): Promise<TransactionPrediction> {
    try {
      const prompt = `You are a financial advisor analyzing payment predictions for a budget app. Based on the following prediction data, provide a brief (2-3 sentences) explanation that helps the user understand what to expect and why.

Payee: ${payeeName}
Predicted Next Transaction Date: ${prediction.nextTransactionDate ?? "Unknown"}
Predicted Amount: ${prediction.predictedAmount !== null ? `$${Math.abs(prediction.predictedAmount / 100).toFixed(2)}` : "Unknown"}
Prediction Method: ${prediction.predictionMethod}
Confidence Level: ${Math.round(prediction.confidence * 100)}%
Statistical Reasoning: ${prediction.reasoning}

Write a helpful, conversational explanation of this prediction. Focus on:
1. When and why they should expect this transaction
2. Any factors that could affect the timing or amount
3. If confidence is low, what the user might want to consider

Keep the tone helpful and reassuring, not alarming. Do not repeat the exact numbers, instead provide context.`;

      const result = await generateText({
        model: llmProvider.provider(llmProvider.model),
        prompt,
        maxOutputTokens: 200,
        temperature: 0.7,
      });

      return {
        ...prediction,
        tier: "ai",
        aiExplanation: result.text.trim(),
      };
    } catch (error) {
      // AI enhancement failed, return with ML tier (or statistical if no ML)
      console.warn("AI enhancement failed:", error);
      return {
        ...prediction,
        tier: prediction.tier === "ml" ? "ml" : "statistical",
      };
    }
  }

  /**
   * Enhance a budget suggestion with AI-generated explanation
   */
  async enhanceBudgetSuggestionWithAI(
    suggestion: BudgetAllocationSuggestion,
    llmProvider: ProviderInstance,
    payeeName: string
  ): Promise<BudgetAllocationSuggestion> {
    try {
      const prompt = `You are a financial advisor helping with budget planning. Based on the following budget allocation suggestion, provide a brief (2-3 sentences) explanation that helps the user understand the recommendation.

Payee: ${payeeName}
Suggested Monthly Allocation: $${Math.abs(suggestion.suggestedMonthlyAllocation / 100).toFixed(2)}
Allocation Range: $${Math.abs(suggestion.allocationRange.min / 100).toFixed(2)} - $${Math.abs(suggestion.allocationRange.max / 100).toFixed(2)}
Confidence: ${Math.round(suggestion.confidence * 100)}%
Statistical Reasoning: ${suggestion.reasoning}
${suggestion.seasonalAdjustments.length > 0 ? `Seasonal Adjustments: ${suggestion.seasonalAdjustments.map(a => `${a.monthName}: ${a.adjustmentPercent > 0 ? "+" : ""}${Math.round(a.adjustmentPercent)}%`).join(", ")}` : ""}

Write a helpful explanation of this budget recommendation. Focus on:
1. Why this amount makes sense based on their history
2. Any seasonal patterns they should plan for
3. Practical advice for managing this expense

Keep the tone helpful and actionable.`;

      const result = await generateText({
        model: llmProvider.provider(llmProvider.model),
        prompt,
        maxOutputTokens: 200,
        temperature: 0.7,
      });

      return {
        ...suggestion,
        tier: "ai",
        aiExplanation: result.text.trim(),
      };
    } catch (error) {
      console.warn("AI enhancement for budget suggestion failed:", error);
      return {
        ...suggestion,
        tier: suggestion.tier === "ml" ? "ml" : "statistical",
      };
    }
  }

  /**
   * Get prediction tier based on workspace preferences and per-payee override
   */
  determinePredictionTier(
    workspacePreferences: WorkspacePreferences,
    profilePredictionMethod?: "default" | "statistical" | "ml" | "ai" | null
  ): {
    tier: "statistical" | "ml" | "ai";
    strategy: StrategyResult;
    useML: boolean;
    useAI: boolean;
  } {
    // Check for per-payee override first
    if (profilePredictionMethod && profilePredictionMethod !== "default") {
      const coordinator = createIntelligenceCoordinator(workspacePreferences);
      const strategy = coordinator.getStrategy("forecasting");

      return {
        tier: profilePredictionMethod,
        strategy,
        useML: profilePredictionMethod === "ml" || profilePredictionMethod === "ai",
        useAI: profilePredictionMethod === "ai",
      };
    }

    // Use global workspace settings via intelligence coordinator
    const coordinator = createIntelligenceCoordinator(workspacePreferences);
    const strategy = coordinator.getStrategy("forecasting");

    // Determine tier based on strategy
    let tier: "statistical" | "ml" | "ai" = "statistical";
    if (strategy.useLLM) {
      tier = "ai";
    } else if (strategy.useML) {
      tier = "ml";
    }

    return {
      tier,
      strategy,
      useML: strategy.useML,
      useAI: strategy.useLLM,
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
    payeeId: number,
    profile?: IntelligenceProfile | null
  ): Promise<BudgetAllocationSuggestion["budgetCategory"]> {
    const baseConditions = this.buildFilterConditions(payeeId, profile);
    const categoryFilter = this.buildCategoryFilter(profile);

    const allConditions = categoryFilter
      ? [...baseConditions, categoryFilter]
      : baseConditions;

    const categoryData = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...allConditions))
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

  /**
   * Analyze day-of-month patterns to detect monthly/bi-monthly payment schedules
   * (e.g., payroll on 10th and 25th, rent on the 1st)
   * Uses fuzzy clustering to handle transactions that occur "around" certain dates
   */
  private analyzeDayOfMonthPattern(dates: string[]): MonthlyPattern | null {
    if (dates.length < 3) return null;

    // Count occurrences of each day of month
    const dayCounts: Map<number, number> = new Map();
    for (const dateStr of dates) {
      const day = new Date(dateStr).getDate();
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    const totalTransactions = dates.length;

    // First, try fuzzy clustering to group nearby days
    // Use ±3 day tolerance to handle real-world variance (bank processing, weekends, etc.)
    const clusters = this.clusterDaysOfMonth(dayCounts, 3);

    // Sort clusters by total count
    const sortedClusters = clusters
      .map(cluster => ({
        centerDay: cluster.centerDay,
        count: cluster.count,
        days: cluster.days,
      }))
      .sort((a, b) => b.count - a.count);

    if (sortedClusters.length === 0) return null;

    const topCluster = sortedClusters[0]!;
    const secondCluster = sortedClusters[1];

    // Calculate percentages using clusters
    const topClusterPercent = topCluster.count / totalTransactions;
    const topTwoClustersPercent = secondCluster
      ? (topCluster.count + secondCluster.count) / totalTransactions
      : topClusterPercent;

    // Detect bi-monthly pattern using clusters
    if (
      secondCluster &&
      topTwoClustersPercent >= 0.5 && // At least 50% on two clusters (forgiving for real-world data)
      topCluster.count >= 2 && secondCluster.count >= 2
    ) {
      const days = [topCluster.centerDay, secondCluster.centerDay].sort((a, b) => a - b);

      // Check if the clusters are roughly half-month apart (typical bi-monthly patterns)
      const dayDiff = Math.abs(days[1]! - days[0]!);
      const isSemiMonthly = dayDiff >= 10 && dayDiff <= 20; // Relaxed range for fuzzy

      return {
        commonDays: days,
        isBiMonthly: true,
        isMonthly: false,
        primaryDayOfMonth: days[0]!,
        confidence: Math.min(1, topTwoClustersPercent * (isSemiMonthly ? 1.0 : 0.85)),
      };
    }

    // Detect monthly pattern using clusters
    if (topClusterPercent >= 0.4 && topCluster.count >= 3) { // Forgiving threshold for real-world data
      return {
        commonDays: [topCluster.centerDay],
        isBiMonthly: false,
        isMonthly: true,
        primaryDayOfMonth: topCluster.centerDay,
        confidence: Math.min(1, topClusterPercent),
      };
    }

    // Check for end-of-month patterns (days 28-31 should be grouped)
    const endOfMonthDays = [28, 29, 30, 31];
    const endOfMonthCount = endOfMonthDays.reduce(
      (sum, day) => sum + (dayCounts.get(day) || 0),
      0
    );
    const endOfMonthPercent = endOfMonthCount / totalTransactions;

    if (endOfMonthPercent >= 0.4 && endOfMonthCount >= 3) {
      return {
        commonDays: [31], // Use 31 to represent "end of month"
        isBiMonthly: false,
        isMonthly: true,
        primaryDayOfMonth: 31, // Convention: 31 means end of month
        confidence: Math.min(1, endOfMonthPercent * 0.9),
      };
    }

    return null;
  }

  /**
   * Cluster days of month together based on proximity
   * Groups days within ±tolerance of each other into a single cluster
   */
  private clusterDaysOfMonth(
    dayCounts: Map<number, number>,
    tolerance: number
  ): Array<{ centerDay: number; count: number; days: number[] }> {
    // Sort days by count (descending) to start with most frequent
    const sortedDays = Array.from(dayCounts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    const clusters: Array<{ centerDay: number; count: number; days: number[] }> = [];
    const usedDays = new Set<number>();

    for (const [day, count] of sortedDays) {
      if (usedDays.has(day)) continue;

      // Start a new cluster centered on this day
      const clusterDays: number[] = [day];
      let totalCount = count;
      usedDays.add(day);

      // Find nearby days within tolerance
      for (let offset = 1; offset <= tolerance; offset++) {
        // Check day - offset
        const lowerDay = day - offset;
        if (lowerDay >= 1 && !usedDays.has(lowerDay) && dayCounts.has(lowerDay)) {
          clusterDays.push(lowerDay);
          totalCount += dayCounts.get(lowerDay)!;
          usedDays.add(lowerDay);
        }

        // Check day + offset
        const upperDay = day + offset;
        if (upperDay <= 31 && !usedDays.has(upperDay) && dayCounts.has(upperDay)) {
          clusterDays.push(upperDay);
          totalCount += dayCounts.get(upperDay)!;
          usedDays.add(upperDay);
        }
      }

      // Calculate weighted center day
      let weightedSum = 0;
      let weightTotal = 0;
      for (const d of clusterDays) {
        const c = dayCounts.get(d) || 0;
        weightedSum += d * c;
        weightTotal += c;
      }
      const centerDay = Math.round(weightedSum / weightTotal);

      clusters.push({
        centerDay,
        count: totalCount,
        days: clusterDays.sort((a, b) => a - b),
      });
    }

    return clusters;
  }

  /**
   * Calculate the next occurrence of a day-of-month pattern from a given date
   */
  private getNextDayOfMonthDate(fromDate: Date, dayOfMonth: number): Date {
    const result = new Date(fromDate);
    const currentDay = result.getDate();

    // Handle end-of-month (day 31 convention)
    if (dayOfMonth >= 28) {
      // Move to next month and get the last day
      result.setMonth(result.getMonth() + 1, 0); // Day 0 = last day of previous month
      const lastDayOfMonth = result.getDate();

      if (dayOfMonth === 31) {
        // End of month pattern - use actual last day
        result.setDate(lastDayOfMonth);
      } else {
        // Specific day (28, 29, 30) - use min of target day and last day
        result.setMonth(result.getMonth(), Math.min(dayOfMonth, lastDayOfMonth));
      }

      // If this date is still in the past or today, move to next month
      if (result <= fromDate) {
        result.setMonth(result.getMonth() + 1);
        const nextLastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
        result.setDate(dayOfMonth === 31 ? nextLastDay : Math.min(dayOfMonth, nextLastDay));
      }
      return result;
    }

    // For days 1-27
    if (currentDay >= dayOfMonth) {
      // Move to next month
      result.setMonth(result.getMonth() + 1, dayOfMonth);
    } else {
      // Use this month
      result.setDate(dayOfMonth);
    }

    // Verify the result is in the future
    if (result <= fromDate) {
      result.setMonth(result.getMonth() + 1, dayOfMonth);
    }

    return result;
  }

  /**
   * Get the next predicted date based on bi-monthly pattern
   */
  private getNextBiMonthlyDate(fromDate: Date, days: number[]): Date {
    if (days.length < 2) {
      return this.getNextDayOfMonthDate(fromDate, days[0] || 1);
    }

    const sortedDays = [...days].sort((a, b) => a - b);
    const [firstDay, secondDay] = sortedDays as [number, number];
    const currentDay = fromDate.getDate();

    const result = new Date(fromDate);

    // Find the next occurrence
    if (currentDay < firstDay) {
      // Next occurrence is first day of current month
      result.setDate(firstDay);
    } else if (currentDay < secondDay) {
      // Next occurrence is second day of current month
      result.setDate(secondDay);
    } else {
      // Next occurrence is first day of next month
      result.setMonth(result.getMonth() + 1, firstDay);
    }

    // Verify the result is in the future
    if (result <= fromDate) {
      // If still not in future, advance to next occurrence
      if (result.getDate() === firstDay) {
        result.setDate(secondDay);
      } else {
        result.setMonth(result.getMonth() + 1, firstDay);
      }
    }

    return result;
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
      one_time: 0,
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
