import { categories, payees, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, eq, isNull } from "drizzle-orm";
import { formatPercentRaw } from "$lib/utils/formatters";
import { CategoryLearningService } from "./category-learning";
import { PayeeIntelligenceService } from "./intelligence";

// Budget optimization analysis interfaces
export interface BudgetOptimizationAnalysis {
  payeeId: number;
  payeeName: string;
  currentBudgetAllocation: number | null;
  actualSpending: {
    monthly: number;
    average: number;
    trend: "increasing" | "decreasing" | "stable";
    volatility: number;
    seasonalVariation: number;
  };
  efficiency: {
    score: number; // 0-1 scale
    budgetUtilization: number; // Actual vs. budgeted
    overBudgetFrequency: number; // How often over budget
    underBudgetAmount: number; // Average under-budget amount
    wasteScore: number; // Unused budget allocation
  };
  riskAssessment: {
    volatilityRisk: number; // 0-1 scale
    trendRisk: number; // Risk of increasing spending
    seasonalRisk: number; // Risk from seasonal variations
    frequencyRisk: number; // Risk from irregular payments
    overallRisk: number; // Combined risk score
  };
  recommendations: {
    optimizedAllocation: number;
    adjustmentPercent: number;
    adjustmentAmount: number;
    confidence: number;
    priority: "high" | "medium" | "low";
    reasoning: string[];
  };
}

export interface BudgetAllocationSuggestion {
  payeeId: number;
  payeeName: string;
  categoryId: number | null;
  categoryName: string | null;
  currentAllocation: number | null;
  suggestedAllocation: number;
  allocationRange: {
    conservative: number;
    optimistic: number;
    realistic: number;
  };
  adjustmentType: "increase" | "decrease" | "new" | "remove";
  adjustmentAmount: number;
  adjustmentPercent: number;
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  seasonalAdjustments: Array<{
    month: number;
    monthName: string;
    adjustment: number;
    adjustmentPercent: number;
    reason: string;
  }>;
  riskFactors: Array<{
    factor: string;
    impact: "high" | "medium" | "low";
    description: string;
    mitigation: string;
  }>;
}

export interface BudgetForecast {
  payeeId: number;
  payeeName: string;
  forecastPeriod: "monthly" | "quarterly" | "yearly";
  predictions: Array<{
    period: string; // ISO date or period identifier
    predictedAmount: number;
    confidenceInterval: {
      lower: number;
      upper: number;
      confidence: number; // 0-1 scale (e.g., 0.95 for 95% confidence)
    };
    seasonalMultiplier: number;
    trendComponent: number;
    baseAmount: number;
    riskFactors: string[];
  }>;
  accuracy: {
    historicalAccuracy: number; // Based on past predictions
    methodAccuracy: number; // Accuracy of the forecasting method
    confidenceScore: number; // Overall confidence in forecast
  };
  scenarios: {
    conservative: Array<{ period: string; amount: number }>;
    optimistic: Array<{ period: string; amount: number }>;
    realistic: Array<{ period: string; amount: number }>;
  };
}

export interface BudgetHealthMetrics {
  payeeId: number;
  payeeName: string;
  overallHealth: number; // 0-100 score
  healthCategories: {
    allocation: {
      score: number;
      status: "excellent" | "good" | "fair" | "poor";
      issues: string[];
      recommendations: string[];
    };
    utilization: {
      score: number;
      status: "excellent" | "good" | "fair" | "poor";
      issues: string[];
      recommendations: string[];
    };
    predictability: {
      score: number;
      status: "excellent" | "good" | "fair" | "poor";
      issues: string[];
      recommendations: string[];
    };
    efficiency: {
      score: number;
      status: "excellent" | "good" | "fair" | "poor";
      issues: string[];
      recommendations: string[];
    };
  };
  trends: {
    healthTrend: "improving" | "stable" | "declining";
    trendStrength: number;
    timeToRecommendation: number; // Days until recommendation should be implemented
  };
  alerts: Array<{
    severity: "critical" | "warning" | "info";
    message: string;
    action: string;
    daysUntilCritical?: number;
  }>;
}

export interface BudgetRebalancingPlan {
  accountId?: number;
  accountName?: string;
  totalCurrentBudget: number;
  totalOptimizedBudget: number;
  totalAdjustment: number;
  adjustmentPercent: number;
  rebalancingStrategy: "conservative" | "aggressive" | "balanced";
  payeeAdjustments: Array<{
    payeeId: number;
    payeeName: string;
    currentAllocation: number;
    newAllocation: number;
    adjustment: number;
    adjustmentPercent: number;
    priority: number; // 1-10 scale
    reasoning: string;
    riskLevel: "low" | "medium" | "high";
  }>;
  crossPayeeOptimizations: Array<{
    fromPayeeId: number;
    fromPayeeName: string;
    toPayeeId: number;
    toPayeeName: string;
    amount: number;
    reason: string;
    confidence: number;
  }>;
  implementationPlan: {
    phase1: Array<{ payeeId: number; adjustment: number; reason: string }>;
    phase2: Array<{ payeeId: number; adjustment: number; reason: string }>;
    phase3: Array<{ payeeId: number; adjustment: number; reason: string }>;
  };
  monitoring: {
    reviewPeriod: number; // Days
    keyMetrics: string[];
    alertThresholds: Record<string, number>;
  };
}

export interface BudgetScenario {
  name: string;
  description: string;
  type: "conservative" | "optimistic" | "realistic" | "stress_test";
  assumptions: Record<string, any>;
  results: {
    totalBudget: number;
    payeeAllocations: Record<number, number>;
    riskScore: number;
    confidenceScore: number;
    expectedUtilization: number;
  };
}

/**
 * Advanced Budget Allocation Service
 *
 * Provides sophisticated algorithms for budget optimization, allocation suggestions,
 * predictive modeling, and comprehensive budget health analysis.
 */
export class BudgetAllocationService {
  private payeeIntelligence: PayeeIntelligenceService;
  private categoryLearning: CategoryLearningService;

  constructor(
    payeeIntelligence?: PayeeIntelligenceService,
    categoryLearning?: CategoryLearningService
  ) {
    this.payeeIntelligence = payeeIntelligence || new PayeeIntelligenceService();
    this.categoryLearning = categoryLearning || new CategoryLearningService();
  }

  /**
   * Analyze budget optimization opportunities for a specific payee
   */
  async analyzeBudgetOptimization(payeeId: number): Promise<BudgetOptimizationAnalysis> {
    // Get payee basic info
    const payeeInfo = await this.getPayeeInfo(payeeId);

    // Get comprehensive spending analysis
    const spendingAnalysis = await this.payeeIntelligence.analyzeSpendingPatterns(payeeId);
    const seasonalPatterns = await this.payeeIntelligence.detectSeasonality(payeeId);
    const frequencyAnalysis = await this.payeeIntelligence.analyzeFrequencyPattern(payeeId);

    // Calculate actual spending metrics
    const actualSpending = await this.calculateActualSpendingMetrics(
      payeeId,
      spendingAnalysis,
      seasonalPatterns
    );

    // Get current budget allocation (if any)
    const currentBudgetAllocation = await this.getCurrentBudgetAllocation(payeeId);

    // Calculate efficiency metrics
    const efficiency = await this.calculateBudgetEfficiency(
      payeeId,
      currentBudgetAllocation,
      actualSpending
    );

    // Assess risk factors
    const riskAssessment = this.assessBudgetRisk(
      spendingAnalysis,
      seasonalPatterns,
      frequencyAnalysis
    );

    // Generate optimization recommendations
    const recommendations = await this.generateOptimizationRecommendations(
      payeeId,
      currentBudgetAllocation,
      actualSpending,
      efficiency,
      riskAssessment
    );

    return {
      payeeId,
      payeeName: payeeInfo.name,
      currentBudgetAllocation,
      actualSpending,
      efficiency,
      riskAssessment,
      recommendations,
    };
  }

  /**
   * Generate optimal budget allocation suggestions
   */
  async suggestOptimalAllocations(
    accountId?: number,
    options: {
      strategy?: "conservative" | "aggressive" | "balanced";
      riskTolerance?: number; // 0-1 scale
      timeHorizon?: number; // months
    } = {}
  ): Promise<BudgetAllocationSuggestion[]> {
    const { strategy = "balanced", riskTolerance = 0.5, timeHorizon = 12 } = options;

    // Get all payees for the account or globally
    const payeeIds = await this.getRelevantPayees(accountId);

    const suggestions: BudgetAllocationSuggestion[] = [];

    for (const payeeId of payeeIds) {
      const optimization = await this.analyzeBudgetOptimization(payeeId);
      const categoryInfo = await this.getPayeeCategoryInfo(payeeId);

      // Calculate allocation suggestion based on strategy
      const suggestion = await this.calculateAllocationSuggestion(
        optimization,
        categoryInfo,
        strategy,
        riskTolerance,
        timeHorizon
      );

      if (suggestion.confidence >= 0.3) {
        // Only include reasonably confident suggestions
        suggestions.push(suggestion);
      }
    }

    // Sort by priority and confidence
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Predict future budget requirements
   */
  async predictFutureBudgetNeeds(
    payeeId: number,
    forecastPeriod: "monthly" | "quarterly" | "yearly" = "monthly",
    periodsAhead: number = 12
  ): Promise<BudgetForecast> {
    const payeeInfo = await this.getPayeeInfo(payeeId);
    const spendingAnalysis = await this.payeeIntelligence.analyzeSpendingPatterns(payeeId);
    const seasonalPatterns = await this.payeeIntelligence.detectSeasonality(payeeId);
    const frequencyAnalysis = await this.payeeIntelligence.analyzeFrequencyPattern(payeeId);

    // Generate predictions for each period
    const predictions: BudgetForecast["predictions"] = [];
    const scenarios: BudgetForecast["scenarios"] = {
      conservative: [],
      optimistic: [],
      realistic: [],
    };

    for (let i = 1; i <= periodsAhead; i++) {
      const periodPrediction = await this.generatePeriodPrediction(
        i,
        forecastPeriod,
        spendingAnalysis,
        seasonalPatterns,
        frequencyAnalysis
      );

      predictions.push(periodPrediction);

      // Generate scenario variations
      const conservativeAmount = periodPrediction.predictedAmount * 0.8;
      const optimisticAmount = periodPrediction.predictedAmount * 1.3;
      const realisticAmount = periodPrediction.predictedAmount;

      scenarios.conservative.push({
        period: periodPrediction.period,
        amount: conservativeAmount,
      });
      scenarios.optimistic.push({
        period: periodPrediction.period,
        amount: optimisticAmount,
      });
      scenarios.realistic.push({
        period: periodPrediction.period,
        amount: realisticAmount,
      });
    }

    // Calculate forecast accuracy metrics
    const accuracy = await this.calculateForecastAccuracy(payeeId);

    return {
      payeeId,
      payeeName: payeeInfo.name,
      forecastPeriod,
      predictions,
      accuracy,
      scenarios,
    };
  }

  /**
   * Generate comprehensive budget rebalancing recommendations
   */
  async generateBudgetRebalancing(
    accountId?: number,
    strategy: "conservative" | "aggressive" | "balanced" = "balanced"
  ): Promise<BudgetRebalancingPlan> {
    const payeeIds = await this.getRelevantPayees(accountId);
    const accountInfo = accountId ? await this.getAccountInfo(accountId) : null;

    // Get current budget allocations and optimization analysis for all payees
    const payeeAnalyses = await Promise.all(
      payeeIds.map(async (payeeId) => ({
        payeeId,
        analysis: await this.analyzeBudgetOptimization(payeeId),
      }))
    );

    // Calculate total current budget and optimal budget
    const totalCurrentBudget = payeeAnalyses.reduce(
      (sum, { analysis }) => sum + (analysis.currentBudgetAllocation || 0),
      0
    );

    const totalOptimizedBudget = payeeAnalyses.reduce(
      (sum, { analysis }) => sum + analysis.recommendations.optimizedAllocation,
      0
    );

    const totalAdjustment = totalOptimizedBudget - totalCurrentBudget;
    const adjustmentPercent =
      totalCurrentBudget > 0 ? (totalAdjustment / totalCurrentBudget) * 100 : 0;

    // Generate payee-specific adjustments
    const payeeAdjustments = payeeAnalyses.map(({ payeeId, analysis }) => {
      const currentAllocation = analysis.currentBudgetAllocation || 0;
      const newAllocation = analysis.recommendations.optimizedAllocation;
      const adjustment = newAllocation - currentAllocation;
      const adjustmentPercent = currentAllocation > 0 ? (adjustment / currentAllocation) * 100 : 0;

      return {
        payeeId,
        payeeName: analysis.payeeName,
        currentAllocation,
        newAllocation,
        adjustment,
        adjustmentPercent,
        priority: this.calculateRebalancingPriority(analysis),
        reasoning: analysis.recommendations.reasoning.join("; "),
        riskLevel: this.assessAdjustmentRisk(
          adjustment,
          adjustmentPercent,
          analysis.riskAssessment.overallRisk
        ),
      };
    });

    // Identify cross-payee optimization opportunities
    const crossPayeeOptimizations = this.identifyCrossPayeeOptimizations(payeeAdjustments);

    // Create implementation plan
    const implementationPlan = this.createImplementationPlan(payeeAdjustments, strategy);

    // Define monitoring parameters
    const monitoring = {
      reviewPeriod: strategy === "aggressive" ? 30 : strategy === "balanced" ? 60 : 90,
      keyMetrics: [
        "budget_utilization",
        "over_budget_frequency",
        "spending_volatility",
        "allocation_efficiency",
      ],
      alertThresholds: {
        over_budget_frequency: 0.2, // Alert if over budget >20% of time
        utilization_variance: 0.3, // Alert if utilization varies >30%
        efficiency_drop: 0.1, // Alert if efficiency drops >10%
      },
    };

    const result: BudgetRebalancingPlan = {
      accountName: accountInfo?.name || "All Accounts",
      totalCurrentBudget,
      totalOptimizedBudget,
      totalAdjustment,
      adjustmentPercent,
      rebalancingStrategy: strategy,
      payeeAdjustments,
      crossPayeeOptimizations,
      implementationPlan,
      monitoring,
    };

    if (accountId !== undefined) {
      result.accountId = accountId;
    }

    return result;
  }

  /**
   * Calculate comprehensive budget efficiency metrics
   */
  async calculateBudgetEfficiency(
    payeeId: number,
    currentBudget?: number | null,
    actualSpending?: any
  ): Promise<BudgetOptimizationAnalysis["efficiency"]> {
    if (!currentBudget) {
      return {
        score: 0,
        budgetUtilization: 0,
        overBudgetFrequency: 0,
        underBudgetAmount: 0,
        wasteScore: 0,
      };
    }

    const spendingData = actualSpending || (await this.calculateActualSpendingMetrics(payeeId));
    const monthlySpending = spendingData.monthly;

    // Calculate utilization (how much of budget is actually used)
    const budgetUtilization = monthlySpending / currentBudget;

    // Calculate over-budget frequency
    const overBudgetFrequency = await this.calculateOverBudgetFrequency(payeeId, currentBudget);

    // Calculate average under-budget amount
    const underBudgetAmount = Math.max(0, currentBudget - monthlySpending);

    // Calculate waste score (unused budget allocation)
    const wasteScore = budgetUtilization < 1 ? 1 - budgetUtilization : 0;

    // Calculate overall efficiency score
    const utilizationScore = Math.min(1, budgetUtilization) * 0.4;
    const overBudgetPenalty = overBudgetFrequency * 0.3;
    const wasteScore_adjusted = wasteScore * 0.2;
    const volatilityPenalty = spendingData.volatility * 0.1;

    const score = Math.max(
      0,
      utilizationScore - overBudgetPenalty - wasteScore_adjusted - volatilityPenalty
    );

    return {
      score,
      budgetUtilization,
      overBudgetFrequency,
      underBudgetAmount,
      wasteScore,
    };
  }

  /**
   * Calculate comprehensive budget health metrics for a payee
   */
  async calculateBudgetHealth(payeeId: number): Promise<BudgetHealthMetrics> {
    const payeeInfo = await this.getPayeeInfo(payeeId);
    const optimization = await this.analyzeBudgetOptimization(payeeId);

    // Calculate health scores for each category
    const allocation = this.assessAllocationHealth(optimization);
    const utilization = this.assessUtilizationHealth(optimization);
    const predictability = this.assessPredictabilityHealth(optimization);
    const efficiency = this.assessEfficiencyHealth(optimization);

    // Calculate overall health score
    const overallHealth = Math.round(
      ((allocation.score + utilization.score + predictability.score + efficiency.score) / 4) * 100
    );

    // Analyze trends
    const trends = await this.analyzeBudgetHealthTrends(payeeId);

    // Generate alerts
    const alerts = this.generateBudgetHealthAlerts(
      optimization,
      allocation,
      utilization,
      predictability,
      efficiency
    );

    return {
      payeeId,
      payeeName: payeeInfo.name,
      overallHealth,
      healthCategories: {
        allocation,
        utilization,
        predictability,
        efficiency,
      },
      trends,
      alerts,
    };
  }

  /**
   * Optimize budget allocations across multiple payees
   */
  async optimizeMultiPayeeBudgets(
    payeeIds: number[],
    totalBudgetConstraint?: number,
    objectives: {
      minimizeRisk?: boolean;
      maximizeUtilization?: boolean;
      balanceAllocations?: boolean;
    } = {}
  ): Promise<{
    optimizedAllocations: Record<number, number>;
    totalOptimizedBudget: number;
    optimizationScore: number;
    constraintsSatisfied: boolean;
    recommendations: string[];
  }> {
    const {
      minimizeRisk = true,
      maximizeUtilization = true,
      balanceAllocations = false,
    } = objectives;

    // Get optimization analysis for all payees
    const analyses = await Promise.all(
      payeeIds.map(async (payeeId) => ({
        payeeId,
        analysis: await this.analyzeBudgetOptimization(payeeId),
      }))
    );

    // Calculate unconstrained optimal allocations
    const unconstrainedAllocations: Record<number, number> = {};
    let totalUnconstrained = 0;

    analyses.forEach(({ payeeId, analysis }) => {
      const allocation = analysis.recommendations.optimizedAllocation;
      unconstrainedAllocations[payeeId] = allocation;
      totalUnconstrained += allocation;
    });

    // Apply budget constraint if specified
    let optimizedAllocations = unconstrainedAllocations;
    let constraintsSatisfied = true;

    if (totalBudgetConstraint && totalUnconstrained > totalBudgetConstraint) {
      optimizedAllocations = this.applyBudgetConstraint(analyses, totalBudgetConstraint, {
        minimizeRisk,
        maximizeUtilization,
        balanceAllocations,
      });
      constraintsSatisfied = false;
    }

    const totalOptimizedBudget = Object.values(optimizedAllocations).reduce(
      (sum, allocation) => sum + allocation,
      0
    );

    // Calculate optimization score
    const optimizationScore = this.calculateOptimizationScore(analyses, optimizedAllocations);

    // Generate recommendations
    const recommendations = this.generateMultiPayeeRecommendations(
      analyses,
      optimizedAllocations,
      totalBudgetConstraint,
      constraintsSatisfied
    );

    return {
      optimizedAllocations,
      totalOptimizedBudget,
      optimizationScore,
      constraintsSatisfied,
      recommendations,
    };
  }

  // Private helper methods

  private async getPayeeInfo(payeeId: number): Promise<{ name: string }> {
    const payee = await db
      .select({ name: payees.name })
      .from(payees)
      .where(eq(payees.id, payeeId))
      .limit(1);

    return { name: payee[0]?.name || "Unknown Payee" };
  }

  private async getCurrentBudgetAllocation(payeeId: number): Promise<number | null> {
    // This would integrate with the actual budget system when implemented
    // For now, return null as placeholder
    return null;
  }

  private async calculateActualSpendingMetrics(
    payeeId: number,
    spendingAnalysis?: any,
    seasonalPatterns?: any[]
  ): Promise<BudgetOptimizationAnalysis["actualSpending"]> {
    const analysis =
      spendingAnalysis || (await this.payeeIntelligence.analyzeSpendingPatterns(payeeId));
    const seasonal = seasonalPatterns || (await this.payeeIntelligence.detectSeasonality(payeeId));

    // Calculate monthly spending from historical data
    const monthlySpending =
      analysis.timeSpanDays > 0
        ? (analysis.totalAmount / analysis.timeSpanDays) * 30.44 // Average days per month
        : 0;

    // Calculate seasonal variation coefficient
    const seasonalVariation =
      seasonal.length > 0
        ? seasonal.reduce((sum, s) => sum + Math.abs(s.seasonalMultiplier - 1), 0) / seasonal.length
        : 0;

    return {
      monthly: monthlySpending,
      average: analysis.averageAmount,
      trend: analysis.trendDirection,
      volatility: analysis.volatility,
      seasonalVariation,
    };
  }

  private assessBudgetRisk(
    spendingAnalysis: any,
    seasonalPatterns: any[],
    frequencyAnalysis: any
  ): BudgetOptimizationAnalysis["riskAssessment"] {
    // Volatility risk based on spending variance
    const volatilityRisk = Math.min(1, spendingAnalysis.volatility);

    // Trend risk based on increasing spending pattern
    const trendRisk =
      spendingAnalysis.trendDirection === "increasing" ? spendingAnalysis.trendStrength : 0;

    // Seasonal risk based on seasonal variations
    const seasonalRisk =
      seasonalPatterns.length > 0
        ? seasonalPatterns.reduce((max, s) => Math.max(max, Math.abs(s.seasonalMultiplier - 1)), 0)
        : 0;

    // Frequency risk based on payment irregularity
    const frequencyRisk = 1 - frequencyAnalysis.regularityScore;

    // Combined risk score
    const overallRisk =
      volatilityRisk * 0.3 + trendRisk * 0.25 + seasonalRisk * 0.25 + frequencyRisk * 0.2;

    return {
      volatilityRisk,
      trendRisk,
      seasonalRisk,
      frequencyRisk,
      overallRisk,
    };
  }

  private async generateOptimizationRecommendations(
    payeeId: number,
    currentBudget: number | null,
    actualSpending: any,
    efficiency: any,
    riskAssessment: any
  ): Promise<BudgetOptimizationAnalysis["recommendations"]> {
    // Calculate base optimized allocation
    let optimizedAllocation = actualSpending.monthly;

    // Adjust for trend
    if (actualSpending.trend === "increasing") {
      optimizedAllocation *= 1 + riskAssessment.trendRisk * 0.2;
    }

    // Adjust for volatility (add buffer)
    optimizedAllocation *= 1 + actualSpending.volatility * 0.15;

    // Adjust for seasonal variation
    optimizedAllocation *= 1 + actualSpending.seasonalVariation * 0.1;

    // Calculate adjustment metrics
    const adjustmentAmount = currentBudget
      ? optimizedAllocation - currentBudget
      : optimizedAllocation;
    const adjustmentPercent = currentBudget ? (adjustmentAmount / currentBudget) * 100 : 0;

    // Calculate confidence based on data quality
    const confidence = this.calculateRecommendationConfidence(
      actualSpending,
      efficiency,
      riskAssessment
    );

    // Determine priority
    const priority = this.determinePriority(
      adjustmentPercent,
      riskAssessment.overallRisk,
      efficiency.score
    );

    // Generate reasoning
    const reasoning = this.generateRecommendationReasoning(
      currentBudget,
      actualSpending,
      efficiency,
      riskAssessment,
      adjustmentPercent
    );

    return {
      optimizedAllocation,
      adjustmentPercent,
      adjustmentAmount,
      confidence,
      priority,
      reasoning,
    };
  }

  private calculateRecommendationConfidence(
    actualSpending: any,
    efficiency: any,
    riskAssessment: any
  ): number {
    // Base confidence from data quality
    let confidence = 0.7;

    // Reduce confidence for high volatility
    confidence -= actualSpending.volatility * 0.2;

    // Reduce confidence for high risk
    confidence -= riskAssessment.overallRisk * 0.15;

    // Increase confidence for good efficiency
    confidence += efficiency.score * 0.1;

    return Math.max(0.1, Math.min(1, confidence));
  }

  private determinePriority(
    adjustmentPercent: number,
    overallRisk: number,
    efficiencyScore: number
  ): "high" | "medium" | "low" {
    const absAdjustment = Math.abs(adjustmentPercent);

    if (absAdjustment > 50 || overallRisk > 0.7 || efficiencyScore < 0.3) {
      return "high";
    } else if (absAdjustment > 20 || overallRisk > 0.4 || efficiencyScore < 0.6) {
      return "medium";
    } else {
      return "low";
    }
  }

  private generateRecommendationReasoning(
    currentBudget: number | null,
    actualSpending: any,
    efficiency: any,
    riskAssessment: any,
    adjustmentPercent: number
  ): string[] {
    const reasoning: string[] = [];

    if (!currentBudget) {
      reasoning.push(
        "No current budget allocation - suggesting initial budget based on spending history"
      );
    } else if (Math.abs(adjustmentPercent) > 20) {
      reasoning.push(
        `Current allocation is ${formatPercentRaw(Math.abs(adjustmentPercent), 1)} ${adjustmentPercent > 0 ? "below" : "above"} optimal level`
      );
    }

    if (actualSpending.trend === "increasing") {
      reasoning.push("Spending trend is increasing - recommending higher allocation buffer");
    }

    if (actualSpending.volatility > 0.3) {
      reasoning.push("High spending volatility detected - adding safety buffer");
    }

    if (actualSpending.seasonalVariation > 0.2) {
      reasoning.push("Significant seasonal variation - accounting for peak periods");
    }

    if (efficiency.score < 0.5) {
      reasoning.push("Current budget efficiency is low - optimization needed");
    }

    if (riskAssessment.overallRisk > 0.6) {
      reasoning.push("High risk factors identified - conservative allocation recommended");
    }

    return reasoning;
  }

  private async getRelevantPayees(accountId?: number): Promise<number[]> {
    if (accountId) {
      // Query payees with transactions in specific account
      const result = await db
        .select({ id: payees.id })
        .from(payees)
        .leftJoin(transactions, eq(transactions.payeeId, payees.id))
        .where(
          and(
            eq(transactions.accountId, accountId),
            isNull(payees.deletedAt),
            isNull(transactions.deletedAt)
          )
        );

      return result.map((p) => p.id);
    } else {
      // Query all non-deleted payees
      const result = await db
        .select({ id: payees.id })
        .from(payees)
        .where(isNull(payees.deletedAt));

      return result.map((p) => p.id);
    }
  }

  private async getPayeeCategoryInfo(
    payeeId: number
  ): Promise<{ categoryId: number | null; categoryName: string | null }> {
    const payee = await db
      .select({
        defaultCategoryId: payees.defaultCategoryId,
      })
      .from(payees)
      .where(eq(payees.id, payeeId))
      .limit(1);

    if (!payee[0]?.defaultCategoryId) {
      return { categoryId: null, categoryName: null };
    }

    const category = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, payee[0].defaultCategoryId))
      .limit(1);

    return {
      categoryId: payee[0].defaultCategoryId,
      categoryName: category[0]?.name || null,
    };
  }

  private async calculateAllocationSuggestion(
    optimization: BudgetOptimizationAnalysis,
    categoryInfo: { categoryId: number | null; categoryName: string | null },
    strategy: string,
    riskTolerance: number,
    timeHorizon: number
  ): Promise<BudgetAllocationSuggestion> {
    const baseAllocation = optimization.recommendations.optimizedAllocation;

    // Adjust allocation based on strategy
    const strategyMultipliers = {
      conservative: 0.85,
      balanced: 1.0,
      aggressive: 1.15,
    };

    const adjustedAllocation =
      baseAllocation * strategyMultipliers[strategy as keyof typeof strategyMultipliers];

    // Calculate allocation range
    const allocationRange = {
      conservative: adjustedAllocation * 0.8,
      realistic: adjustedAllocation,
      optimistic: adjustedAllocation * 1.2,
    };

    const currentAllocation = optimization.currentBudgetAllocation;
    const adjustmentAmount = adjustedAllocation - (currentAllocation || 0);
    const adjustmentPercent = currentAllocation ? (adjustmentAmount / currentAllocation) * 100 : 0;

    // Determine adjustment type
    let adjustmentType: BudgetAllocationSuggestion["adjustmentType"];
    if (!currentAllocation) {
      adjustmentType = "new";
    } else if (adjustmentAmount > 0) {
      adjustmentType = "increase";
    } else if (adjustmentAmount < 0) {
      adjustmentType = "decrease";
    } else {
      adjustmentType = currentAllocation === 0 ? "remove" : "decrease";
    }

    // Map priority
    const priorityMap = { high: "high" as const, medium: "medium" as const, low: "low" as const };
    const priority =
      optimization.efficiency.score < 0.3
        ? ("critical" as const)
        : priorityMap[optimization.recommendations.priority];

    // Generate seasonal adjustments (placeholder)
    const seasonalAdjustments: BudgetAllocationSuggestion["seasonalAdjustments"] = [];

    // Generate risk factors
    const riskFactors = this.generateRiskFactors(optimization.riskAssessment);

    return {
      payeeId: optimization.payeeId,
      payeeName: optimization.payeeName,
      categoryId: categoryInfo.categoryId,
      categoryName: categoryInfo.categoryName,
      currentAllocation,
      suggestedAllocation: adjustedAllocation,
      allocationRange,
      adjustmentType,
      adjustmentAmount,
      adjustmentPercent,
      confidence: optimization.recommendations.confidence,
      priority,
      reasoning: optimization.recommendations.reasoning.join("; "),
      seasonalAdjustments,
      riskFactors,
    };
  }

  private generateRiskFactors(
    riskAssessment: BudgetOptimizationAnalysis["riskAssessment"]
  ): BudgetAllocationSuggestion["riskFactors"] {
    const riskFactors: BudgetAllocationSuggestion["riskFactors"] = [];

    if (riskAssessment.volatilityRisk > 0.5) {
      riskFactors.push({
        factor: "High Spending Volatility",
        impact: riskAssessment.volatilityRisk > 0.7 ? "high" : "medium",
        description: "Spending amounts vary significantly between transactions",
        mitigation: "Add buffer to budget allocation and monitor closely",
      });
    }

    if (riskAssessment.trendRisk > 0.3) {
      riskFactors.push({
        factor: "Increasing Spending Trend",
        impact: riskAssessment.trendRisk > 0.6 ? "high" : "medium",
        description: "Spending is trending upward over time",
        mitigation: "Regular budget reviews and trend monitoring",
      });
    }

    if (riskAssessment.seasonalRisk > 0.3) {
      riskFactors.push({
        factor: "Seasonal Spending Variation",
        impact: riskAssessment.seasonalRisk > 0.5 ? "high" : "medium",
        description: "Spending varies significantly by season",
        mitigation: "Account for seasonal peaks in budget planning",
      });
    }

    if (riskAssessment.frequencyRisk > 0.4) {
      riskFactors.push({
        factor: "Irregular Payment Pattern",
        impact: riskAssessment.frequencyRisk > 0.6 ? "high" : "medium",
        description: "Payments occur at irregular intervals",
        mitigation: "Build flexible budget with irregular payment accommodation",
      });
    }

    return riskFactors;
  }

  private async generatePeriodPrediction(
    periodIndex: number,
    forecastPeriod: "monthly" | "quarterly" | "yearly",
    spendingAnalysis: any,
    seasonalPatterns: any[],
    frequencyAnalysis: any
  ): Promise<BudgetForecast["predictions"][0]> {
    // Calculate base amount from historical average
    const baseAmount = spendingAnalysis.averageAmount;

    // Apply trend component
    const trendComponent =
      spendingAnalysis.trendDirection === "increasing"
        ? baseAmount * spendingAnalysis.trendStrength * (periodIndex * 0.1)
        : spendingAnalysis.trendDirection === "decreasing"
          ? baseAmount * spendingAnalysis.trendStrength * -(periodIndex * 0.1)
          : 0;

    // Calculate seasonal multiplier for the period
    const currentDate = new Date();
    const targetMonth = ((currentDate.getMonth() + periodIndex) % 12) + 1;
    const seasonalPattern = seasonalPatterns.find((sp) => sp.month === targetMonth);
    const seasonalMultiplier = seasonalPattern?.seasonalMultiplier || 1;

    // Calculate predicted amount
    const predictedAmount = (baseAmount + trendComponent) * seasonalMultiplier;

    // Calculate confidence interval
    const standardError =
      spendingAnalysis.standardDeviation / Math.sqrt(spendingAnalysis.transactionCount);
    const confidenceLevel = 0.95;
    const zScore = 1.96; // 95% confidence
    const marginOfError = zScore * standardError;

    const confidenceInterval = {
      lower: Math.max(0, predictedAmount - marginOfError),
      upper: predictedAmount + marginOfError,
      confidence: confidenceLevel,
    };

    // Generate period identifier
    const periodDate = new Date(currentDate);
    if (forecastPeriod === "monthly") {
      periodDate.setMonth(currentDate.getMonth() + periodIndex);
    } else if (forecastPeriod === "quarterly") {
      periodDate.setMonth(currentDate.getMonth() + periodIndex * 3);
    } else {
      periodDate.setFullYear(currentDate.getFullYear() + periodIndex);
    }

    const period = periodDate.toISOString().split("T")[0] || periodDate.toISOString();

    // Identify risk factors for this period
    const riskFactors = [];
    if (spendingAnalysis.volatility > 0.3) riskFactors.push("High volatility");
    if (seasonalMultiplier > 1.2) riskFactors.push("Seasonal peak");
    if (frequencyAnalysis.regularityScore < 0.5) riskFactors.push("Irregular payments");

    return {
      period,
      predictedAmount,
      confidenceInterval,
      seasonalMultiplier,
      trendComponent,
      baseAmount,
      riskFactors,
    };
  }

  private async calculateForecastAccuracy(payeeId: number): Promise<BudgetForecast["accuracy"]> {
    // This would require historical prediction data to calculate actual accuracy
    // For now, return estimated accuracy based on data quality

    const spendingAnalysis = await this.payeeIntelligence.analyzeSpendingPatterns(payeeId);

    // Estimate accuracy based on data quality factors
    const dataQualityScore = Math.min(1, spendingAnalysis.transactionCount / 20);
    const volatilityPenalty = spendingAnalysis.volatility * 0.3;
    const timeSpanScore = Math.min(1, spendingAnalysis.timeSpanDays / 365);

    const historicalAccuracy = Math.max(0.3, dataQualityScore - volatilityPenalty);
    const methodAccuracy = 0.75; // Placeholder for method accuracy
    const confidenceScore = (historicalAccuracy + methodAccuracy + timeSpanScore) / 3;

    return {
      historicalAccuracy,
      methodAccuracy,
      confidenceScore,
    };
  }

  private async getAccountInfo(accountId: number): Promise<{ name: string } | null> {
    // This would query the accounts table when available
    // For now, return placeholder
    return { name: `Account ${accountId}` };
  }

  private calculateRebalancingPriority(analysis: BudgetOptimizationAnalysis): number {
    // Calculate priority score (1-10) based on various factors
    let score = 5; // Base score

    // Efficiency impact
    if (analysis.efficiency.score < 0.3) score += 3;
    else if (analysis.efficiency.score < 0.6) score += 1;

    // Risk impact
    if (analysis.riskAssessment.overallRisk > 0.7) score += 2;
    else if (analysis.riskAssessment.overallRisk > 0.4) score += 1;

    // Adjustment magnitude
    if (Math.abs(analysis.recommendations.adjustmentPercent) > 50) score += 2;
    else if (Math.abs(analysis.recommendations.adjustmentPercent) > 20) score += 1;

    return Math.min(10, Math.max(1, score));
  }

  private assessAdjustmentRisk(
    adjustment: number,
    adjustmentPercent: number,
    overallRisk: number
  ): "low" | "medium" | "high" {
    const absPercent = Math.abs(adjustmentPercent);

    if (absPercent > 50 || overallRisk > 0.7) return "high";
    if (absPercent > 20 || overallRisk > 0.4) return "medium";
    return "low";
  }

  private identifyCrossPayeeOptimizations(
    payeeAdjustments: BudgetRebalancingPlan["payeeAdjustments"]
  ): BudgetRebalancingPlan["crossPayeeOptimizations"] {
    const optimizations: BudgetRebalancingPlan["crossPayeeOptimizations"] = [];

    // Find opportunities to move budget from over-allocated to under-allocated payees
    const overAllocated = payeeAdjustments.filter((p) => p.adjustment < -50); // Significant decrease needed
    const underAllocated = payeeAdjustments.filter((p) => p.adjustment > 50); // Significant increase needed

    for (const over of overAllocated) {
      for (const under of underAllocated) {
        const transferAmount = Math.min(Math.abs(over.adjustment), under.adjustment) * 0.5;

        if (transferAmount > 10) {
          // Only suggest transfers over $10
          optimizations.push({
            fromPayeeId: over.payeeId,
            fromPayeeName: over.payeeName,
            toPayeeId: under.payeeId,
            toPayeeName: under.payeeName,
            amount: transferAmount,
            reason: `Transfer excess budget from over-allocated to under-allocated payee`,
            confidence: 0.7,
          });
        }
      }
    }

    return optimizations.slice(0, 5); // Limit to top 5 recommendations
  }

  private createImplementationPlan(
    payeeAdjustments: BudgetRebalancingPlan["payeeAdjustments"],
    strategy: string
  ): BudgetRebalancingPlan["implementationPlan"] {
    // Sort adjustments by priority and risk
    const sortedAdjustments = [...payeeAdjustments].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.riskLevel !== b.riskLevel) {
        const riskOrder = { low: 3, medium: 2, high: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return Math.abs(b.adjustmentPercent) - Math.abs(a.adjustmentPercent);
    });

    const phase1: Array<{ payeeId: number; adjustment: number; reason: string }> = [];
    const phase2: Array<{ payeeId: number; adjustment: number; reason: string }> = [];
    const phase3: Array<{ payeeId: number; adjustment: number; reason: string }> = [];

    // Distribute adjustments across phases based on strategy
    sortedAdjustments.forEach((adjustment, index) => {
      const adjustmentData = {
        payeeId: adjustment.payeeId,
        adjustment: adjustment.adjustment,
        reason: adjustment.reasoning,
      };

      if (strategy === "aggressive") {
        // Implement most changes immediately
        if (index < sortedAdjustments.length * 0.7) phase1.push(adjustmentData);
        else if (index < sortedAdjustments.length * 0.9) phase2.push(adjustmentData);
        else phase3.push(adjustmentData);
      } else if (strategy === "balanced") {
        // Distribute evenly across phases
        if (index < sortedAdjustments.length * 0.4) phase1.push(adjustmentData);
        else if (index < sortedAdjustments.length * 0.7) phase2.push(adjustmentData);
        else phase3.push(adjustmentData);
      } else {
        // Conservative: implement changes gradually
        if (index < sortedAdjustments.length * 0.3) phase1.push(adjustmentData);
        else if (index < sortedAdjustments.length * 0.6) phase2.push(adjustmentData);
        else phase3.push(adjustmentData);
      }
    });

    return { phase1, phase2, phase3 };
  }

  private applyBudgetConstraint(
    analyses: Array<{ payeeId: number; analysis: BudgetOptimizationAnalysis }>,
    totalBudgetConstraint: number,
    objectives: any
  ): Record<number, number> {
    // Use priority-based allocation within budget constraint
    const sortedAnalyses = analyses.sort((a, b) => {
      const aPriority =
        a.analysis.recommendations.priority === "high"
          ? 3
          : a.analysis.recommendations.priority === "medium"
            ? 2
            : 1;
      const bPriority =
        b.analysis.recommendations.priority === "high"
          ? 3
          : b.analysis.recommendations.priority === "medium"
            ? 2
            : 1;

      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.analysis.recommendations.confidence - a.analysis.recommendations.confidence;
    });

    const allocations: Record<number, number> = {};
    let remainingBudget = totalBudgetConstraint;

    // First pass: allocate minimum viable amounts
    for (const { payeeId, analysis } of sortedAnalyses) {
      const minAllocation = analysis.recommendations.optimizedAllocation * 0.6;
      const allocation = Math.min(minAllocation, remainingBudget);
      allocations[payeeId] = allocation;
      remainingBudget -= allocation;
    }

    // Second pass: distribute remaining budget by priority
    for (const { payeeId, analysis } of sortedAnalyses) {
      if (remainingBudget <= 0) break;

      const currentAllocation = allocations[payeeId] ?? 0;
      const targetAllocation = analysis.recommendations.optimizedAllocation;
      const additionalNeeded = targetAllocation - currentAllocation;

      if (additionalNeeded > 0) {
        const additionalAllocation = Math.min(additionalNeeded, remainingBudget);
        allocations[payeeId] = (allocations[payeeId] ?? 0) + additionalAllocation;
        remainingBudget -= additionalAllocation;
      }
    }

    return allocations;
  }

  private calculateOptimizationScore(
    analyses: Array<{ payeeId: number; analysis: BudgetOptimizationAnalysis }>,
    optimizedAllocations: Record<number, number>
  ): number {
    // Calculate weighted average of efficiency improvements
    let totalWeight = 0;
    let weightedScore = 0;

    analyses.forEach(({ payeeId, analysis }) => {
      const allocation = optimizedAllocations[payeeId] ?? 0;
      const weight = allocation; // Weight by allocation amount
      const currentEfficiency = analysis.efficiency.score;

      // Estimate efficiency improvement (simplified calculation)
      const improvementEstimate = Math.min(0.3, (1 - currentEfficiency) * 0.5);
      const projectedEfficiency = currentEfficiency + improvementEstimate;

      totalWeight += weight;
      weightedScore += projectedEfficiency * weight;
    });

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  private generateMultiPayeeRecommendations(
    analyses: Array<{ payeeId: number; analysis: BudgetOptimizationAnalysis }>,
    optimizedAllocations: Record<number, number>,
    totalBudgetConstraint?: number,
    constraintsSatisfied?: boolean
  ): string[] {
    const recommendations: string[] = [];

    // Budget constraint recommendations
    if (totalBudgetConstraint && !constraintsSatisfied) {
      recommendations.push(
        "Budget constraint required trade-offs - prioritized high-impact allocations"
      );
      recommendations.push("Consider increasing total budget for optimal allocation");
    }

    // High-risk payee recommendations
    const highRiskPayees = analyses.filter((a) => a.analysis.riskAssessment.overallRisk > 0.7);
    if (highRiskPayees.length > 0) {
      recommendations.push(
        `${highRiskPayees.length} payees have high risk factors - monitor closely`
      );
    }

    // Efficiency improvement opportunities
    const lowEfficiencyPayees = analyses.filter((a) => a.analysis.efficiency.score < 0.4);
    if (lowEfficiencyPayees.length > 0) {
      recommendations.push(
        `${lowEfficiencyPayees.length} payees have poor budget efficiency - prioritize optimization`
      );
    }

    // Large adjustment warnings
    const largeAdjustments = analyses.filter(
      (a) => Math.abs(a.analysis.recommendations.adjustmentPercent) > 50
    );
    if (largeAdjustments.length > 0) {
      recommendations.push(
        `${largeAdjustments.length} payees require significant budget adjustments - implement gradually`
      );
    }

    return recommendations;
  }

  private async calculateOverBudgetFrequency(
    payeeId: number,
    budgetAmount: number
  ): Promise<number> {
    // This would require monthly budget tracking data
    // For now, return a simple estimation based on volatility
    const spendingAnalysis = await this.payeeIntelligence.analyzeSpendingPatterns(payeeId);

    // Estimate based on how often transactions exceed average + budget buffer
    const budgetBuffer = budgetAmount - spendingAnalysis.averageAmount;
    if (budgetBuffer <= 0) return 0.8; // Likely over budget frequently

    // Simple estimation: higher volatility = higher over-budget frequency
    return Math.min(0.5, spendingAnalysis.volatility * 0.6);
  }

  // Budget Health Assessment Methods

  private assessAllocationHealth(
    optimization: BudgetOptimizationAnalysis
  ): BudgetHealthMetrics["healthCategories"]["allocation"] {
    const currentBudget = optimization.currentBudgetAllocation;
    const actualSpending = optimization.actualSpending.monthly;
    const adjustmentPercent = Math.abs(optimization.recommendations.adjustmentPercent);

    let score = 1.0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!currentBudget) {
      score = 0.3;
      issues.push("No budget allocation exists");
      recommendations.push("Create initial budget allocation based on spending history");
    } else {
      // Score based on how close current allocation is to optimal
      if (adjustmentPercent > 50) {
        score = 0.2;
        issues.push("Budget allocation is severely misaligned with spending");
        recommendations.push("Significant budget adjustment needed");
      } else if (adjustmentPercent > 25) {
        score = 0.5;
        issues.push("Budget allocation needs substantial adjustment");
        recommendations.push("Review and adjust budget allocation");
      } else if (adjustmentPercent > 10) {
        score = 0.7;
        issues.push("Budget allocation could be optimized");
        recommendations.push("Minor budget adjustment recommended");
      }

      // Additional factors
      if (optimization.riskAssessment.overallRisk > 0.7) {
        score *= 0.8;
        issues.push("High risk factors affect allocation reliability");
        recommendations.push("Add risk buffer to budget allocation");
      }
    }

    const status = score > 0.8 ? "excellent" : score > 0.6 ? "good" : score > 0.4 ? "fair" : "poor";

    return { score, status, issues, recommendations };
  }

  private assessUtilizationHealth(
    optimization: BudgetOptimizationAnalysis
  ): BudgetHealthMetrics["healthCategories"]["utilization"] {
    const utilization = optimization.efficiency.budgetUtilization;
    const overBudgetFreq = optimization.efficiency.overBudgetFrequency;

    let score = 1.0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Ideal utilization is 80-95%
    if (utilization < 0.5) {
      score = 0.4;
      issues.push("Budget significantly under-utilized");
      recommendations.push("Consider reducing budget allocation");
    } else if (utilization < 0.7) {
      score = 0.6;
      issues.push("Budget under-utilized");
      recommendations.push("Review budget necessity or find additional uses");
    } else if (utilization > 1.2) {
      score = 0.3;
      issues.push("Consistently over budget");
      recommendations.push("Increase budget allocation immediately");
    } else if (utilization > 1.05) {
      score = 0.7;
      issues.push("Frequently exceeds budget");
      recommendations.push("Consider increasing budget buffer");
    }

    // Factor in over-budget frequency
    if (overBudgetFreq > 0.3) {
      score *= 0.7;
      issues.push("High frequency of budget overruns");
      recommendations.push("Improve budget planning or increase allocation");
    }

    const status = score > 0.8 ? "excellent" : score > 0.6 ? "good" : score > 0.4 ? "fair" : "poor";

    return { score, status, issues, recommendations };
  }

  private assessPredictabilityHealth(
    optimization: BudgetOptimizationAnalysis
  ): BudgetHealthMetrics["healthCategories"]["predictability"] {
    const volatility = optimization.actualSpending.volatility;
    const seasonalVariation = optimization.actualSpending.seasonalVariation;
    const overallRisk = optimization.riskAssessment.overallRisk;

    let score = 1.0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Score based on predictability factors
    if (volatility > 0.6) {
      score *= 0.5;
      issues.push("High spending volatility makes budgeting difficult");
      recommendations.push("Monitor spending patterns closely and add volatility buffer");
    } else if (volatility > 0.3) {
      score *= 0.7;
      issues.push("Moderate spending volatility");
      recommendations.push("Track spending trends for better prediction");
    }

    if (seasonalVariation > 0.5) {
      score *= 0.7;
      issues.push("Significant seasonal spending variation");
      recommendations.push("Plan for seasonal spending peaks");
    } else if (seasonalVariation > 0.3) {
      score *= 0.9;
      recommendations.push("Consider seasonal budget adjustments");
    }

    if (overallRisk > 0.7) {
      score *= 0.6;
      issues.push("Multiple risk factors reduce predictability");
      recommendations.push("Implement comprehensive risk monitoring");
    }

    const status = score > 0.8 ? "excellent" : score > 0.6 ? "good" : score > 0.4 ? "fair" : "poor";

    return { score, status, issues, recommendations };
  }

  private assessEfficiencyHealth(
    optimization: BudgetOptimizationAnalysis
  ): BudgetHealthMetrics["healthCategories"]["efficiency"] {
    const efficiencyScore = optimization.efficiency.score;
    const wasteScore = optimization.efficiency.wasteScore;

    let score = efficiencyScore;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (efficiencyScore < 0.3) {
      issues.push("Very poor budget efficiency");
      recommendations.push("Complete budget review and optimization needed");
    } else if (efficiencyScore < 0.5) {
      issues.push("Poor budget efficiency");
      recommendations.push("Significant efficiency improvements possible");
    } else if (efficiencyScore < 0.7) {
      issues.push("Budget efficiency could be improved");
      recommendations.push("Fine-tune budget allocation for better efficiency");
    }

    if (wasteScore > 0.3) {
      issues.push("Significant unused budget allocation");
      recommendations.push("Reduce budget allocation or find productive uses");
    }

    const status = score > 0.8 ? "excellent" : score > 0.6 ? "good" : score > 0.4 ? "fair" : "poor";

    return { score, status, issues, recommendations };
  }

  private async analyzeBudgetHealthTrends(payeeId: number): Promise<BudgetHealthMetrics["trends"]> {
    // This would require historical health data to calculate actual trends
    // For now, return estimated trends based on spending analysis

    const spendingAnalysis = await this.payeeIntelligence.analyzeSpendingPatterns(payeeId);

    let healthTrend: "improving" | "stable" | "declining" = "stable";
    let trendStrength = 0;

    // Use spending trend as proxy for health trend
    if (spendingAnalysis.trendDirection === "increasing") {
      healthTrend = "declining"; // Increasing spending = declining budget health
      trendStrength = spendingAnalysis.trendStrength;
    } else if (spendingAnalysis.trendDirection === "decreasing") {
      healthTrend = "improving"; // Decreasing spending = improving budget health
      trendStrength = spendingAnalysis.trendStrength;
    }

    // Estimate time to recommendation implementation
    const timeToRecommendation =
      spendingAnalysis.volatility > 0.5
        ? 7 // High volatility = urgent
        : spendingAnalysis.volatility > 0.3
          ? 30 // Medium volatility = monthly
          : 90; // Low volatility = quarterly

    return {
      healthTrend,
      trendStrength,
      timeToRecommendation,
    };
  }

  private generateBudgetHealthAlerts(
    optimization: BudgetOptimizationAnalysis,
    allocation: any,
    utilization: any,
    predictability: any,
    efficiency: any
  ): BudgetHealthMetrics["alerts"] {
    const alerts: BudgetHealthMetrics["alerts"] = [];

    // Critical alerts
    if (!optimization.currentBudgetAllocation) {
      alerts.push({
        severity: "critical",
        message: "No budget allocation exists for this payee",
        action: "Create budget allocation immediately",
      });
    } else if (optimization.efficiency.overBudgetFrequency > 0.5) {
      alerts.push({
        severity: "critical",
        message: "Frequently exceeding budget allocation",
        action: "Increase budget allocation or review spending",
        daysUntilCritical: 7,
      });
    }

    // Warning alerts
    if (Math.abs(optimization.recommendations.adjustmentPercent) > 30) {
      alerts.push({
        severity: "warning",
        message: "Budget allocation needs significant adjustment",
        action: "Review and update budget allocation",
      });
    }

    if (optimization.riskAssessment.overallRisk > 0.7) {
      alerts.push({
        severity: "warning",
        message: "High risk factors detected",
        action: "Add risk buffers and monitor closely",
      });
    }

    // Info alerts
    if (
      optimization.actualSpending.trend === "increasing" &&
      optimization.actualSpending.volatility > 0.3
    ) {
      alerts.push({
        severity: "info",
        message: "Spending trend increasing with high volatility",
        action: "Monitor spending patterns for budget impact",
      });
    }

    return alerts;
  }
}
