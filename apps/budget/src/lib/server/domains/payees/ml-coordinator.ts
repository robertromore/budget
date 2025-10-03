import {db} from "$lib/server/db";
import {payees, transactions} from "$lib/schema";
import {eq, and, isNull, count, gte, lte} from "drizzle-orm";
import {currentDate, toISOString} from "$lib/utils/dates";
import {PayeeIntelligenceService} from "./intelligence";
import {CategoryLearningService} from "./category-learning";
import {BudgetAllocationService} from "./budget-allocation";
import {logger} from "$lib/server/shared/logging";

// Unified ML Recommendation Interfaces
export interface UnifiedRecommendations {
  payeeId: number;
  payeeName: string;
  overall: {
    confidence: number; // Meta-confidence across all ML systems
    priority: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
    action: 'update_category' | 'adjust_budget' | 'review_patterns' | 'no_action';
    reasoning: string[];
  };
  categoryRecommendation: {
    recommendedCategoryId: number;
    recommendedCategoryName: string;
    confidence: number;
    systemSource: 'intelligence' | 'learning' | 'ensemble';
    alternatives: Array<{
      categoryId: number;
      categoryName: string;
      confidence: number;
      source: string;
    }>;
  };
  budgetRecommendation: {
    suggestedAllocation: number;
    adjustmentType: 'increase' | 'decrease' | 'new' | 'maintain';
    confidence: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    seasonalAdjustments: Array<{
      month: number;
      adjustment: number;
      reason: string;
    }>;
  };
  riskAssessment: {
    overallRisk: number; // 0-1 scale
    riskFactors: Array<{
      factor: string;
      severity: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
    confidence: number;
  };
  automationSuggestions: Array<{
    type: 'auto_categorize' | 'auto_budget' | 'predictive_alert' | 'scheduled_review';
    description: string;
    confidence: number;
    implementation: 'immediate' | 'gradual' | 'user_approval';
  }>;
  performanceMetrics: {
    predictionAccuracy: number;
    improvementPotential: number;
    dataQuality: number;
    systemReliability: number;
  };
}

export interface CrossSystemLearning {
  payeeId: number;
  payeeName: string;
  patterns: Array<{
    patternType: 'category_budget_correlation' | 'seasonal_behavior' | 'amount_frequency_relation' | 'user_preference_drift';
    description: string;
    confidence: number;
    evidence: {
      dataPoints: number;
      timeSpan: string;
      sources: string[];
    };
    implications: string[];
    actionableInsights: string[];
  }>;
  correlations: Array<{
    factor1: string;
    factor2: string;
    correlationStrength: number; // -1 to 1
    statisticalSignificance: number;
    businessImplication: string;
  }>;
  emergentBehaviors: Array<{
    behavior: string;
    detectionDate: string;
    confidence: number;
    impact: 'positive' | 'negative' | 'neutral';
    recommendedResponse: string;
  }>;
}

export interface BehaviorChangeDetection {
  payeeId: number;
  payeeName: string;
  changeDetected: boolean;
  changeType: 'category_shift' | 'spending_pattern' | 'frequency_change' | 'seasonal_drift' | 'amount_variance';
  severity: 'major' | 'moderate' | 'minor';
  confidence: number;
  detectionMethod: 'statistical_analysis' | 'machine_learning' | 'pattern_recognition' | 'ensemble';
  changeDetails: {
    beforePeriod: {
      startDate: string;
      endDate: string;
      characteristics: Record<string, any>;
    };
    afterPeriod: {
      startDate: string;
      endDate: string;
      characteristics: Record<string, any>;
    };
    keyChanges: Array<{
      metric: string;
      beforeValue: number | string;
      afterValue: number | string;
      changePercent: number;
      significance: number;
    }>;
  };
  potentialCauses: Array<{
    cause: string;
    probability: number;
    evidence: string[];
  }>;
  recommendedActions: Array<{
    action: string;
    priority: 'immediate' | 'soon' | 'monitor';
    description: string;
    expectedImpact: string;
  }>;
  monitoringPlan: {
    reviewPeriod: number; // days
    keyMetrics: string[];
    alertThresholds: Record<string, number>;
  };
}

export interface ActionableInsight {
  id: string;
  payeeId: number;
  payeeName: string;
  type: 'optimization' | 'correction' | 'prediction' | 'automation' | 'alert';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  insight: string;
  confidence: number;
  sources: string[]; // Which ML systems contributed
  recommendedActions: Array<{
    action: string;
    description: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    timeline: string;
    implementation: {
      manual: boolean;
      automated: boolean;
      requiresApproval: boolean;
      steps: string[];
    };
  }>;
  expectedOutcomes: Array<{
    outcome: string;
    probability: number;
    value: string;
    timeframe: string;
  }>;
  riskMitigation: Array<{
    risk: string;
    mitigation: string;
    contingency: string;
  }>;
  trackingMetrics: Array<{
    metric: string;
    currentValue: number | string;
    targetValue: number | string;
    measurementFrequency: string;
  }>;
  generatedAt: string;
  expiresAt: string;
  status: 'active' | 'implemented' | 'dismissed' | 'expired';
}

export interface MLPerformanceMetrics {
  system: 'intelligence' | 'learning' | 'budget_allocation' | 'coordinator' | 'ensemble';
  period: {
    startDate: string;
    endDate: string;
    periodType: 'daily' | 'weekly' | 'monthly';
  };
  accuracy: {
    overall: number;
    categoryPrediction: number;
    budgetPrediction: number;
    behaviorPrediction: number;
  };
  precision: {
    overall: number;
    byCategory: Record<string, number>;
    byBudgetRange: Record<string, number>;
  };
  recall: {
    overall: number;
    byCategory: Record<string, number>;
    byBudgetRange: Record<string, number>;
  };
  f1Score: number;
  confidenceCalibration: {
    overconfidenceRate: number;
    underconfidenceRate: number;
    calibrationScore: number;
  };
  adaptationMetrics: {
    learningRate: number;
    forgettingRate: number;
    adaptationSpeed: number;
  };
  userFeedback: {
    acceptanceRate: number;
    correctionRate: number;
    satisfactionScore: number;
  };
  systemLoad: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  dataQuality: {
    completeness: number;
    consistency: number;
    freshness: number;
  };
}

/**
 * PayeeMLCoordinator - Unified Machine Learning System
 *
 * This is the orchestrating service that coordinates all ML capabilities for payees,
 * providing sophisticated unified recommendations, cross-system learning, behavioral
 * change detection, and automated optimization.
 */
export class PayeeMLCoordinator {
  private payeeIntelligence: PayeeIntelligenceService;
  private categoryLearning: CategoryLearningService;
  private budgetAllocation: BudgetAllocationService;

  constructor() {
    this.payeeIntelligence = new PayeeIntelligenceService();
    this.categoryLearning = new CategoryLearningService();
    this.budgetAllocation = new BudgetAllocationService();
  }

  /**
   * Generate comprehensive unified recommendations combining all ML systems
   */
  async generateUnifiedRecommendations(
    payeeId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
      userPreferences?: Record<string, any>;
      riskTolerance?: number;
    }
  ): Promise<UnifiedRecommendations> {
    // Get recommendations from all ML systems
    const [
      intelligenceAnalysis,
      learningRecommendation,
      budgetOptimization,
      payeeInfo
    ] = await Promise.all([
      this.payeeIntelligence.analyzeSpendingPatterns(payeeId),
      this.categoryLearning.getCategoryRecommendations(payeeId, context),
      this.budgetAllocation.analyzeBudgetOptimization(payeeId),
      this.getPayeeInfo(payeeId)
    ]);

    // Perform ensemble learning for category recommendation
    const categoryRecommendation = await this.performCategoryEnsemble(
      payeeId,
      intelligenceAnalysis,
      learningRecommendation,
      context
    );

    // Calculate unified budget recommendation
    const budgetRecommendation = await this.unifyBudgetRecommendations(
      budgetOptimization,
      intelligenceAnalysis
    );

    // Assess combined risk factors
    const riskAssessment = await this.performUnifiedRiskAssessment(
      payeeId,
      intelligenceAnalysis,
      budgetOptimization,
      learningRecommendation
    );

    // Generate automation suggestions
    const automationSuggestions = await this.generateAutomationSuggestions(
      payeeId,
      categoryRecommendation,
      budgetRecommendation,
      riskAssessment
    );

    // Calculate meta-confidence across all systems
    const metaConfidence = this.calculateMetaConfidence([
      learningRecommendation.confidence,
      budgetOptimization.recommendations.confidence,
      categoryRecommendation.confidence
    ]);

    // Generate overall recommendation
    const overallRecommendation = await this.generateOverallRecommendation(
      payeeId,
      categoryRecommendation,
      budgetRecommendation,
      riskAssessment,
      metaConfidence
    );

    // Calculate performance metrics
    const performanceMetrics = await this.calculateSystemPerformanceMetrics(payeeId);

    return {
      payeeId,
      payeeName: payeeInfo.name,
      overall: overallRecommendation,
      categoryRecommendation,
      budgetRecommendation,
      riskAssessment,
      automationSuggestions,
      performanceMetrics
    };
  }

  /**
   * Perform sophisticated cross-system learning to identify patterns spanning multiple domains
   */
  async performCrossSystemLearning(payeeId: number): Promise<CrossSystemLearning> {
    const payeeInfo = await this.getPayeeInfo(payeeId);

    // Get comprehensive data from all systems
    const [
      spendingAnalysis,
      seasonalPatterns,
      frequencyAnalysis,
      correctionPatterns,
      budgetOptimization
    ] = await Promise.all([
      this.payeeIntelligence.analyzeSpendingPatterns(payeeId),
      this.payeeIntelligence.detectSeasonality(payeeId),
      this.payeeIntelligence.analyzeFrequencyPattern(payeeId),
      this.categoryLearning.analyzeCorrectionPatterns(payeeId),
      this.budgetAllocation.analyzeBudgetOptimization(payeeId)
    ]);

    // Analyze cross-domain patterns
    const patterns = await this.identifyCrossDomainPatterns(
      payeeId,
      spendingAnalysis,
      seasonalPatterns,
      frequencyAnalysis,
      correctionPatterns,
      budgetOptimization
    );

    // Calculate correlations between different factors
    const correlations = await this.calculateCrossSystemCorrelations(
      payeeId,
      spendingAnalysis,
      correctionPatterns,
      budgetOptimization
    );

    // Detect emergent behaviors
    const emergentBehaviors = await this.detectEmergentBehaviors(
      payeeId,
      patterns,
      correlations
    );

    return {
      payeeId,
      payeeName: payeeInfo.name,
      patterns,
      correlations,
      emergentBehaviors
    };
  }

  /**
   * Execute adaptive optimization that automatically optimizes payee settings based on ML insights
   */
  async executeAdaptiveOptimization(
    payeeId: number,
    options: {
      applyCategorizationUpdates?: boolean;
      applyBudgetUpdates?: boolean;
      applyAutomationRules?: boolean;
      confidenceThreshold?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<{
    applied: Array<{
      type: 'category' | 'budget' | 'automation';
      change: string;
      oldValue: any;
      newValue: any;
      confidence: number;
      reasoning: string;
    }>;
    skipped: Array<{
      type: string;
      reason: string;
      recommendation: string;
    }>;
    performance: {
      processingTime: number;
      systemsConsulted: string[];
      dataPointsAnalyzed: number;
    };
  }> {
    const startTime = Date.now();
    const {
      applyCategorizationUpdates = true,
      applyBudgetUpdates = true,
      applyAutomationRules = false,
      confidenceThreshold = 0.8,
      dryRun = false
    } = options;

    const applied = [];
    const skipped = [];
    const systemsConsulted = [];
    let dataPointsAnalyzed = 0;

    try {
      // Get unified recommendations
      const recommendations = await this.generateUnifiedRecommendations(payeeId);
      systemsConsulted.push('unified_recommendations');
      dataPointsAnalyzed += 100; // Estimate

      // Apply category updates if confidence is high enough
      if (applyCategorizationUpdates &&
          recommendations.categoryRecommendation.confidence >= confidenceThreshold) {

        const currentPayee = await this.getPayeeInfo(payeeId);
        const oldCategoryId = currentPayee.defaultCategoryId;
        const newCategoryId = recommendations.categoryRecommendation.recommendedCategoryId;

        if (oldCategoryId !== newCategoryId) {
          if (!dryRun) {
            await this.updatePayeeDefaultCategory(payeeId, newCategoryId);
          }

          applied.push({
            type: 'category',
            change: 'Updated default category',
            oldValue: oldCategoryId,
            newValue: newCategoryId,
            confidence: recommendations.categoryRecommendation.confidence,
            reasoning: `High-confidence ML recommendation based on ${recommendations.categoryRecommendation.systemSource}`
          });
        }
      } else if (applyCategorizationUpdates) {
        skipped.push({
          type: 'category',
          reason: `Confidence ${recommendations.categoryRecommendation.confidence.toFixed(2)} below threshold ${confidenceThreshold}`,
          recommendation: `Category: ${recommendations.categoryRecommendation.recommendedCategoryName}`
        });
      }

      // Apply budget updates if confidence is high enough
      if (applyBudgetUpdates &&
          recommendations.budgetRecommendation.confidence >= confidenceThreshold &&
          recommendations.budgetRecommendation.adjustmentType !== 'maintain') {

        const currentBudget = await this.getCurrentBudgetAllocation(payeeId);
        const suggestedBudget = recommendations.budgetRecommendation.suggestedAllocation;

        if (Math.abs((currentBudget || 0) - suggestedBudget) > 1) { // Only apply if meaningful change
          if (!dryRun) {
            await this.updatePayeeBudgetAllocation(payeeId, suggestedBudget);
          }

          applied.push({
            type: 'budget',
            change: `${recommendations.budgetRecommendation.adjustmentType} budget allocation`,
            oldValue: currentBudget,
            newValue: suggestedBudget,
            confidence: recommendations.budgetRecommendation.confidence,
            reasoning: `ML-driven budget optimization for improved efficiency`
          });
        }
      } else if (applyBudgetUpdates) {
        skipped.push({
          type: 'budget',
          reason: `Confidence ${recommendations.budgetRecommendation.confidence.toFixed(2)} below threshold or no change needed`,
          recommendation: `Budget: $${recommendations.budgetRecommendation.suggestedAllocation.toFixed(2)}`
        });
      }

      // Apply automation rules if enabled and confidence is high
      if (applyAutomationRules) {
        const automationApplied = await this.applyAutomationRules(
          payeeId,
          recommendations.automationSuggestions,
          confidenceThreshold,
          dryRun
        );
        applied.push(...automationApplied.applied);
        skipped.push(...automationApplied.skipped);
      }

      const processingTime = Date.now() - startTime;

      return {
        applied,
        skipped,
        performance: {
          processingTime,
          systemsConsulted,
          dataPointsAnalyzed
        }
      };

    } catch (error) {
      logger.error('Adaptive optimization failed', error, {payeeId});
      throw new Error(`Adaptive optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assess meta-confidence across all ML systems
   */
  async assessSystemConfidence(payeeId: number): Promise<{
    overall: number;
    systemConfidences: {
      intelligence: number;
      learning: number;
      budgetAllocation: number;
      ensemble: number;
    };
    dataQuality: {
      score: number;
      factors: {
        completeness: number;
        recency: number;
        volume: number;
        consistency: number;
      };
    };
    reliability: {
      score: number;
      factors: {
        historicalAccuracy: number;
        predictionStability: number;
        systemAgreement: number;
      };
    };
    recommendations: string[];
  }> {
    // Get confidence metrics from each system
    const [
      intelligenceConfidence,
      learningMetrics,
      budgetOptimization
    ] = await Promise.all([
      this.payeeIntelligence.calculateConfidenceScores(payeeId),
      this.categoryLearning.getLearningMetrics(6),
      this.budgetAllocation.analyzeBudgetOptimization(payeeId)
    ]);

    // Calculate individual system confidences
    const systemConfidences = {
      intelligence: intelligenceConfidence.overall,
      learning: learningMetrics.correctionAccuracy,
      budgetAllocation: budgetOptimization.recommendations.confidence,
      ensemble: 0 // Will be calculated
    };

    // Calculate ensemble confidence (weighted average with agreement penalty)
    const systemValues = Object.values(systemConfidences).slice(0, 3); // Exclude ensemble
    const agreement = this.calculateSystemAgreement(systemValues);
    const ensemble = systemValues.reduce((sum, conf) => sum + conf, 0) / systemValues.length;
    systemConfidences.ensemble = ensemble * agreement; // Apply agreement penalty

    // Calculate overall confidence
    const overall = systemConfidences.ensemble;

    // Assess data quality
    const dataQuality = await this.assessDataQuality(payeeId);

    // Assess system reliability
    const reliability = await this.assessSystemReliability(payeeId, systemConfidences);

    // Generate confidence-based recommendations
    const recommendations = this.generateConfidenceRecommendations(
      overall,
      systemConfidences,
      dataQuality,
      reliability
    );

    return {
      overall,
      systemConfidences,
      dataQuality,
      reliability,
      recommendations
    };
  }

  /**
   * Detect significant changes in payee behavior patterns
   */
  async detectPayeeBehaviorChanges(
    payeeId: number,
    lookbackMonths: number = 6
  ): Promise<BehaviorChangeDetection> {
    const payeeInfo = await this.getPayeeInfo(payeeId);

    // Define time periods for comparison
    const now = currentDate;
    const splitDate = now.subtract({ months: Math.floor(lookbackMonths / 2) });
    const startDate = now.subtract({ months: lookbackMonths });

    // Get data for both periods
    const [beforeData, afterData] = await Promise.all([
      this.getPayeeBehaviorData(payeeId, toISOString(startDate), toISOString(splitDate)),
      this.getPayeeBehaviorData(payeeId, toISOString(splitDate), toISOString(now))
    ]);

    // Analyze for different types of changes
    const changeAnalyses = await Promise.all([
      this.detectCategoryShiftChange(beforeData, afterData),
      this.detectSpendingPatternChange(beforeData, afterData),
      this.detectFrequencyChange(beforeData, afterData),
      this.detectSeasonalDriftChange(beforeData, afterData),
      this.detectAmountVarianceChange(beforeData, afterData)
    ]);

    // Find the most significant change
    const significantChange = changeAnalyses.reduce((most, current) =>
      current.significance > most.significance ? current : most
    );

    // Generate potential causes and recommended actions
    const potentialCauses = await this.inferBehaviorChangeCauses(
      payeeId,
      significantChange,
      beforeData,
      afterData
    );

    const recommendedActions = await this.generateBehaviorChangeActions(
      payeeId,
      significantChange,
      potentialCauses
    );

    const monitoringPlan = this.createBehaviorMonitoringPlan(significantChange);

    return {
      payeeId,
      payeeName: payeeInfo.name,
      changeDetected: significantChange.significance > 0.3, // 30% threshold
      changeType: significantChange.type,
      severity: significantChange.significance > 0.7 ? 'major' :
                significantChange.significance > 0.4 ? 'moderate' : 'minor',
      confidence: significantChange.confidence,
      detectionMethod: significantChange.method,
      changeDetails: {
        beforePeriod: {
          startDate: startDate.toISOString(),
          endDate: splitDate.toISOString(),
          characteristics: beforeData
        },
        afterPeriod: {
          startDate: splitDate.toISOString(),
          endDate: now.toISOString(),
          characteristics: afterData
        },
        keyChanges: significantChange.keyChanges
      },
      potentialCauses,
      recommendedActions,
      monitoringPlan
    };
  }

  /**
   * Generate specific actionable insights with implementation steps
   */
  async generateActionableInsights(
    payeeId: number,
    insightTypes: Array<'optimization' | 'correction' | 'prediction' | 'automation' | 'alert'> =
      ['optimization', 'correction', 'prediction', 'automation', 'alert']
  ): Promise<ActionableInsight[]> {
    const insights: ActionableInsight[] = [];
    const payeeInfo = await this.getPayeeInfo(payeeId);

    // Get comprehensive analysis
    const [
      unifiedRecommendations,
      crossSystemLearning,
      behaviorChanges,
      systemConfidence
    ] = await Promise.all([
      this.generateUnifiedRecommendations(payeeId),
      this.performCrossSystemLearning(payeeId),
      this.detectPayeeBehaviorChanges(payeeId),
      this.assessSystemConfidence(payeeId)
    ]);

    // Generate optimization insights
    if (insightTypes.includes('optimization')) {
      const optimizationInsights = await this.generateOptimizationInsights(
        payeeId,
        payeeInfo.name,
        unifiedRecommendations
      );
      insights.push(...optimizationInsights);
    }

    // Generate correction insights
    if (insightTypes.includes('correction')) {
      const correctionInsights = await this.generateCorrectionInsights(
        payeeId,
        payeeInfo.name,
        crossSystemLearning,
        behaviorChanges
      );
      insights.push(...correctionInsights);
    }

    // Generate prediction insights
    if (insightTypes.includes('prediction')) {
      const predictionInsights = await this.generatePredictionInsights(
        payeeId,
        payeeInfo.name,
        unifiedRecommendations,
        systemConfidence
      );
      insights.push(...predictionInsights);
    }

    // Generate automation insights
    if (insightTypes.includes('automation')) {
      const automationInsights = await this.generateAutomationInsights(
        payeeId,
        payeeInfo.name,
        unifiedRecommendations.automationSuggestions
      );
      insights.push(...automationInsights);
    }

    // Generate alert insights
    if (insightTypes.includes('alert')) {
      const alertInsights = await this.generateAlertInsights(
        payeeId,
        payeeInfo.name,
        behaviorChanges,
        systemConfidence
      );
      insights.push(...alertInsights);
    }

    // Sort by priority and confidence
    return insights.sort((a, b) => {
      const priorityOrder = {critical: 4, high: 3, medium: 2, low: 1};
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.confidence - a.confidence;
    });
  }

  // Private helper methods

  private async getPayeeInfo(payeeId: number): Promise<{name: string; defaultCategoryId: number | null}> {
    const payee = await db
      .select({
        name: payees.name,
        defaultCategoryId: payees.defaultCategoryId
      })
      .from(payees)
      .where(eq(payees.id, payeeId))
      .limit(1);

    return {
      name: payee[0]?.name || 'Unknown Payee',
      defaultCategoryId: payee[0]?.defaultCategoryId || null
    };
  }

  private async performCategoryEnsemble(
    payeeId: number,
    intelligenceAnalysis: any,
    learningRecommendation: any,
    context?: any
  ): Promise<UnifiedRecommendations['categoryRecommendation']> {
    // Get category suggestions from intelligence service
    const intelligenceSuggestion = await this.payeeIntelligence.suggestBudgetAllocation(payeeId);

    // Combine recommendations using ensemble method
    const suggestions = [
      {
        categoryId: learningRecommendation.recommendedCategoryId,
        categoryName: learningRecommendation.recommendedCategoryName,
        confidence: learningRecommendation.confidence,
        source: 'learning'
      },
      {
        categoryId: intelligenceSuggestion.budgetCategory.primaryCategoryId,
        categoryName: intelligenceSuggestion.budgetCategory.primaryCategoryName,
        confidence: intelligenceSuggestion.budgetCategory.categoryConfidence,
        source: 'intelligence'
      }
    ].filter(s => s.categoryId); // Remove null categories

    if (suggestions.length === 0) {
      return {
        recommendedCategoryId: 0,
        recommendedCategoryName: 'Uncategorized',
        confidence: 0,
        systemSource: 'ensemble',
        alternatives: []
      };
    }

    // Use weighted voting based on confidence
    const primarySuggestion = suggestions.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    // Calculate ensemble confidence
    const ensembleConfidence = this.calculateEnsembleConfidence(suggestions);

    return {
      recommendedCategoryId: primarySuggestion.categoryId,
      recommendedCategoryName: primarySuggestion.categoryName,
      confidence: ensembleConfidence,
      systemSource: 'ensemble',
      alternatives: suggestions
        .filter(s => s.categoryId !== primarySuggestion.categoryId)
        .map(s => ({
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          confidence: s.confidence,
          source: s.source
        }))
    };
  }

  private async unifyBudgetRecommendations(
    budgetOptimization: any,
    intelligenceAnalysis: any
  ): Promise<UnifiedRecommendations['budgetRecommendation']> {
    return {
      suggestedAllocation: budgetOptimization.recommendations.optimizedAllocation,
      adjustmentType: budgetOptimization.currentBudgetAllocation
        ? (budgetOptimization.recommendations.optimizedAllocation > budgetOptimization.currentBudgetAllocation ? 'increase' : 'decrease')
        : 'new',
      confidence: budgetOptimization.recommendations.confidence,
      priority: budgetOptimization.recommendations.priority,
      seasonalAdjustments: [] // Would be populated from seasonal analysis
    };
  }

  private async performUnifiedRiskAssessment(
    payeeId: number,
    intelligenceAnalysis: any,
    budgetOptimization: any,
    learningRecommendation: any
  ): Promise<UnifiedRecommendations['riskAssessment']> {
    const riskFactors = [];

    // Add risk factors from budget analysis
    if (budgetOptimization.riskAssessment.overallRisk > 0.7) {
      riskFactors.push({
        factor: 'High Budget Risk',
        severity: 'high' as const,
        mitigation: 'Implement conservative budget allocation with regular monitoring'
      });
    }

    // Add risk factors from intelligence analysis
    if (intelligenceAnalysis.volatility > 0.5) {
      riskFactors.push({
        factor: 'High Spending Volatility',
        severity: intelligenceAnalysis.volatility > 0.7 ? 'high' as const : 'medium' as const,
        mitigation: 'Add volatility buffer to budget and implement predictive alerts'
      });
    }

    // Add risk factors from learning confidence
    if (learningRecommendation.confidence < 0.4) {
      riskFactors.push({
        factor: 'Low ML Confidence',
        severity: 'medium' as const,
        mitigation: 'Increase data collection and manual validation of recommendations'
      });
    }

    const overallRisk = Math.max(
      budgetOptimization.riskAssessment.overallRisk,
      intelligenceAnalysis.volatility,
      1 - learningRecommendation.confidence
    );

    const confidence = Math.min(
      budgetOptimization.recommendations.confidence,
      learningRecommendation.confidence,
      intelligenceAnalysis.trendStrength || 0.5
    );

    return {
      overallRisk,
      riskFactors,
      confidence
    };
  }

  private async generateAutomationSuggestions(
    payeeId: number,
    categoryRecommendation: any,
    budgetRecommendation: any,
    riskAssessment: any
  ): Promise<UnifiedRecommendations['automationSuggestions']> {
    const suggestions = [];

    // Auto-categorization suggestion
    if (categoryRecommendation.confidence > 0.8) {
      suggestions.push({
        type: 'auto_categorize' as const,
        description: `Automatically categorize future transactions as ${categoryRecommendation.recommendedCategoryName}`,
        confidence: categoryRecommendation.confidence,
        implementation: 'immediate' as const
      });
    }

    // Auto-budget suggestion
    if (budgetRecommendation.confidence > 0.7 && riskAssessment.overallRisk < 0.5) {
      suggestions.push({
        type: 'auto_budget' as const,
        description: `Automatically apply budget allocation of $${budgetRecommendation.suggestedAllocation.toFixed(2)}`,
        confidence: budgetRecommendation.confidence,
        implementation: 'user_approval' as const
      });
    }

    // Predictive alert suggestion
    if (riskAssessment.overallRisk > 0.6) {
      suggestions.push({
        type: 'predictive_alert' as const,
        description: 'Enable predictive alerts for unusual spending patterns',
        confidence: riskAssessment.confidence,
        implementation: 'immediate' as const
      });
    }

    return suggestions;
  }

  private calculateMetaConfidence(confidences: number[]): number {
    if (confidences.length === 0) return 0;

    // Calculate weighted average with agreement bonus
    const average = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - average, 2), 0) / confidences.length;
    const agreement = 1 - Math.sqrt(variance); // Lower variance = higher agreement

    return Math.min(1, average * (0.8 + 0.2 * agreement)); // Bonus for agreement
  }

  private async generateOverallRecommendation(
    payeeId: number,
    categoryRecommendation: any,
    budgetRecommendation: any,
    riskAssessment: any,
    metaConfidence: number
  ): Promise<UnifiedRecommendations['overall']> {
    const reasoning = [];
    let action: UnifiedRecommendations['overall']['action'] = 'no_action';
    let priority: UnifiedRecommendations['overall']['priority'] = 'low';

    if (categoryRecommendation.confidence > 0.7) {
      reasoning.push(`High-confidence category recommendation: ${categoryRecommendation.recommendedCategoryName}`);
      action = 'update_category';
      priority = 'high';
    }

    if (budgetRecommendation.confidence > 0.7 && budgetRecommendation.adjustmentType !== 'maintain') {
      reasoning.push(`Budget optimization suggests ${budgetRecommendation.adjustmentType} to $${budgetRecommendation.suggestedAllocation.toFixed(2)}`);
      if (action === 'no_action') action = 'adjust_budget';
      if (priority === 'low') priority = 'medium';
    }

    if (riskAssessment.overallRisk > 0.7) {
      reasoning.push('High risk factors detected requiring attention');
      action = 'review_patterns';
      priority = 'critical';
    }

    const recommendation = reasoning.length > 0
      ? reasoning.join('; ')
      : 'No significant recommendations at this time';

    return {
      confidence: metaConfidence,
      priority,
      recommendation,
      action,
      reasoning
    };
  }

  private async calculateSystemPerformanceMetrics(payeeId: number): Promise<UnifiedRecommendations['performanceMetrics']> {
    // This would typically track historical performance
    // For now, return estimated metrics
    return {
      predictionAccuracy: 0.78,
      improvementPotential: 0.23,
      dataQuality: 0.85,
      systemReliability: 0.82
    };
  }

  private calculateEnsembleConfidence(suggestions: any[]): number {
    if (suggestions.length === 0) return 0;
    if (suggestions.length === 1) return suggestions[0].confidence;

    // Weight by confidence and apply agreement bonus
    const confidences = suggestions.map(s => s.confidence);
    const average = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const agreement = this.calculateSystemAgreement(confidences);

    return Math.min(1, average * agreement);
  }

  private calculateSystemAgreement(values: number[]): number {
    if (values.length <= 1) return 1;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to agreement score (lower deviation = higher agreement)
    return Math.max(0.5, 1 - (standardDeviation * 2)); // Minimum 50% agreement
  }

  private async identifyCrossDomainPatterns(
    payeeId: number,
    spendingAnalysis: any,
    seasonalPatterns: any[],
    frequencyAnalysis: any,
    correctionPatterns: any[],
    budgetOptimization: any
  ): Promise<CrossSystemLearning['patterns']> {
    const patterns = [];

    // Category-Budget Correlation Pattern
    if (correctionPatterns.length > 0 && budgetOptimization.currentBudgetAllocation) {
      patterns.push({
        patternType: 'category_budget_correlation' as const,
        description: 'Category corrections correlate with budget efficiency',
        confidence: 0.7,
        evidence: {
          dataPoints: correctionPatterns.length,
          timeSpan: '6 months',
          sources: ['category_learning', 'budget_allocation']
        },
        implications: ['Better categorization leads to improved budget accuracy'],
        actionableInsights: ['Prioritize category accuracy for budget optimization']
      });
    }

    // Seasonal Behavior Pattern
    if (seasonalPatterns.length > 6) {
      const seasonalVariation = seasonalPatterns.reduce((sum, sp) => sum + Math.abs(sp.seasonalMultiplier - 1), 0) / seasonalPatterns.length;
      if (seasonalVariation > 0.2) {
        patterns.push({
          patternType: 'seasonal_behavior' as const,
          description: 'Strong seasonal spending patterns detected',
          confidence: 0.8,
          evidence: {
            dataPoints: seasonalPatterns.length,
            timeSpan: '12 months',
            sources: ['payee_intelligence']
          },
          implications: ['Budget allocations should account for seasonal variations'],
          actionableInsights: ['Implement seasonal budget adjustments']
        });
      }
    }

    return patterns;
  }

  private async calculateCrossSystemCorrelations(
    payeeId: number,
    spendingAnalysis: any,
    correctionPatterns: any[],
    budgetOptimization: any
  ): Promise<CrossSystemLearning['correlations']> {
    const correlations = [];

    // Spending volatility vs. correction frequency
    if (correctionPatterns.length > 0) {
      const correctionFrequency = correctionPatterns.length / 6; // Corrections per month
      const spendingVolatility = spendingAnalysis.volatility;

      // Simple correlation calculation (would be more sophisticated in practice)
      const correlation = spendingVolatility > 0.5 && correctionFrequency > 2 ? 0.65 : 0.3;

      correlations.push({
        factor1: 'Spending Volatility',
        factor2: 'Category Correction Frequency',
        correlationStrength: correlation,
        statisticalSignificance: 0.05,
        businessImplication: 'Higher spending volatility leads to more category corrections'
      });
    }

    return correlations;
  }

  private async detectEmergentBehaviors(
    payeeId: number,
    patterns: any[],
    correlations: any[]
  ): Promise<CrossSystemLearning['emergentBehaviors']> {
    const behaviors = [];

    // Example emergent behavior detection
    if (patterns.length > 2 && correlations.length > 0) {
      behaviors.push({
        behavior: 'Adaptive categorization improving budget efficiency',
        detectionDate: toISOString(currentDate),
        confidence: 0.75,
        impact: 'positive' as const,
        recommendedResponse: 'Continue current ML-driven categorization approach'
      });
    }

    return behaviors;
  }

  private async getCurrentBudgetAllocation(payeeId: number): Promise<number | null> {
    // This would query the budget system when implemented
    return null;
  }

  private async updatePayeeDefaultCategory(payeeId: number, categoryId: number): Promise<void> {
    await db
      .update(payees)
      .set({
        defaultCategoryId: categoryId,
        updatedAt: toISOString(currentDate)
      })
      .where(eq(payees.id, payeeId));
  }

  private async updatePayeeBudgetAllocation(payeeId: number, allocation: number): Promise<void> {
    // This would update the budget system when implemented
    logger.debug('Budget allocation update placeholder', {payeeId, allocation});
  }

  private async applyAutomationRules(
    payeeId: number,
    automationSuggestions: any[],
    confidenceThreshold: number,
    dryRun: boolean
  ): Promise<{applied: any[]; skipped: any[]}> {
    const applied = [];
    const skipped = [];

    for (const suggestion of automationSuggestions) {
      if (suggestion.confidence >= confidenceThreshold) {
        if (!dryRun) {
          // Apply automation rule (would implement actual automation)
          logger.debug('Automation application placeholder', {
            type: suggestion.type,
            description: suggestion.description,
            confidence: suggestion.confidence
          });
        }

        applied.push({
          type: 'automation' as const,
          change: suggestion.description,
          oldValue: null,
          newValue: suggestion.type,
          confidence: suggestion.confidence,
          reasoning: `High-confidence automation recommendation`
        });
      } else {
        skipped.push({
          type: 'automation' as const,
          reason: `Confidence ${suggestion.confidence.toFixed(2)} below threshold ${confidenceThreshold}`,
          recommendation: suggestion.description
        });
      }
    }

    return {applied, skipped};
  }

  private async assessDataQuality(payeeId: number): Promise<any> {
    // Assess various data quality metrics
    const transactionCount = await db
      .select({count: count()})
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, payeeId),
        isNull(transactions.deletedAt)
      ));

    const completeness = Math.min(1, (transactionCount[0]?.count || 0) / 20);
    const consistency = 0.85; // Would calculate based on data consistency
    const recency = 0.9; // Would calculate based on data recency
    const volume = Math.min(1, (transactionCount[0]?.count || 0) / 50);

    return {
      score: (completeness + consistency + recency + volume) / 4,
      factors: {
        completeness,
        recency,
        volume,
        consistency
      }
    };
  }

  private async assessSystemReliability(payeeId: number, systemConfidences: any): Promise<any> {
    // This would assess historical reliability
    return {
      score: 0.8,
      factors: {
        historicalAccuracy: 0.75,
        predictionStability: 0.82,
        systemAgreement: this.calculateSystemAgreement(Object.values(systemConfidences).slice(0, 3) as number[])
      }
    };
  }

  private generateConfidenceRecommendations(
    overall: number,
    systemConfidences: any,
    dataQuality: any,
    reliability: any
  ): string[] {
    const recommendations = [];

    if (overall < 0.5) {
      recommendations.push('Low overall confidence - increase data collection and manual validation');
    }

    if (dataQuality.score < 0.6) {
      recommendations.push('Poor data quality detected - focus on data completeness and consistency');
    }

    if (reliability.score < 0.7) {
      recommendations.push('System reliability concerns - review and calibrate ML models');
    }

    const systemVariance = this.calculateSystemAgreement(Object.values(systemConfidences).slice(0, 3) as number[]);
    if (systemVariance < 0.7) {
      recommendations.push('Low system agreement - investigate conflicting recommendations');
    }

    return recommendations.length > 0 ? recommendations : ['System confidence is adequate'];
  }

  // Behavior change detection helper methods

  private async getPayeeBehaviorData(payeeId: number, startDate: string, endDate: string): Promise<any> {
    // Get comprehensive behavior data for the period
    const transactionData = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
        categoryId: transactions.categoryId
      })
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, payeeId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        isNull(transactions.deletedAt)
      ))
      .orderBy(transactions.date);

    if (transactionData.length === 0) {
      return {
        transactionCount: 0,
        averageAmount: 0,
        totalAmount: 0,
        categories: {},
        frequency: 0
      };
    }

    const amounts = transactionData.map(t => t.amount || 0);
    const categories = transactionData.reduce((acc, t) => {
      const catId = t.categoryId || 0;
      acc[catId] = (acc[catId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      transactionCount: transactionData.length,
      averageAmount: amounts.reduce((sum, a) => sum + a, 0) / amounts.length,
      totalAmount: amounts.reduce((sum, a) => sum + a, 0),
      categories,
      frequency: transactionData.length / Math.max(1, this.daysBetween(startDate, endDate) / 30)
    };
  }

  private async detectCategoryShiftChange(beforeData: any, afterData: any): Promise<any> {
    const beforeTop = this.getTopCategory(beforeData.categories);
    const afterTop = this.getTopCategory(afterData.categories);

    const hasShift = beforeTop.categoryId !== afterTop.categoryId;
    const significance = hasShift ? 0.6 : 0;

    return {
      type: 'category_shift',
      significance,
      confidence: 0.8,
      method: 'statistical_analysis',
      keyChanges: hasShift ? [{
        metric: 'Primary Category',
        beforeValue: beforeTop.categoryId,
        afterValue: afterTop.categoryId,
        changePercent: 100,
        significance: 0.8
      }] : []
    };
  }

  private async detectSpendingPatternChange(beforeData: any, afterData: any): Promise<any> {
    const changePercent = beforeData.averageAmount > 0
      ? Math.abs(afterData.averageAmount - beforeData.averageAmount) / beforeData.averageAmount
      : 0;

    return {
      type: 'spending_pattern',
      significance: Math.min(1, changePercent),
      confidence: 0.7,
      method: 'statistical_analysis',
      keyChanges: [{
        metric: 'Average Amount',
        beforeValue: beforeData.averageAmount,
        afterValue: afterData.averageAmount,
        changePercent: changePercent * 100,
        significance: Math.min(1, changePercent)
      }]
    };
  }

  private async detectFrequencyChange(beforeData: any, afterData: any): Promise<any> {
    const changePercent = beforeData.frequency > 0
      ? Math.abs(afterData.frequency - beforeData.frequency) / beforeData.frequency
      : 0;

    return {
      type: 'frequency_change',
      significance: Math.min(1, changePercent * 0.5), // Weight frequency changes less
      confidence: 0.6,
      method: 'statistical_analysis',
      keyChanges: [{
        metric: 'Transaction Frequency',
        beforeValue: beforeData.frequency,
        afterValue: afterData.frequency,
        changePercent: changePercent * 100,
        significance: Math.min(1, changePercent)
      }]
    };
  }

  private async detectSeasonalDriftChange(beforeData: any, afterData: any): Promise<any> {
    // Placeholder for seasonal drift detection
    return {
      type: 'seasonal_drift',
      significance: 0,
      confidence: 0.5,
      method: 'pattern_recognition',
      keyChanges: []
    };
  }

  private async detectAmountVarianceChange(beforeData: any, afterData: any): Promise<any> {
    // Placeholder for amount variance detection
    return {
      type: 'amount_variance',
      significance: 0,
      confidence: 0.5,
      method: 'statistical_analysis',
      keyChanges: []
    };
  }

  private getTopCategory(categories: Record<number, number>): {categoryId: number; count: number} {
    let topCategory = {categoryId: 0, count: 0};

    for (const [categoryId, count] of Object.entries(categories)) {
      if (count > topCategory.count) {
        topCategory = {categoryId: parseInt(categoryId), count};
      }
    }

    return topCategory;
  }

  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async inferBehaviorChangeCauses(
    payeeId: number,
    significantChange: any,
    beforeData: any,
    afterData: any
  ): Promise<BehaviorChangeDetection['potentialCauses']> {
    const causes = [];

    if (significantChange.type === 'category_shift') {
      causes.push({
        cause: 'Business model change',
        probability: 0.6,
        evidence: ['Consistent category change across recent transactions']
      });
    }

    if (significantChange.type === 'spending_pattern') {
      if (afterData.averageAmount > beforeData.averageAmount * 1.2) {
        causes.push({
          cause: 'Service expansion or price increase',
          probability: 0.7,
          evidence: ['Significant increase in transaction amounts']
        });
      }
    }

    return causes;
  }

  private async generateBehaviorChangeActions(
    payeeId: number,
    significantChange: any,
    potentialCauses: any[]
  ): Promise<BehaviorChangeDetection['recommendedActions']> {
    const actions = [];

    if (significantChange.type === 'category_shift') {
      actions.push({
        action: 'Update default category',
        priority: 'soon' as const,
        description: 'Update payee default category to match new behavior pattern',
        expectedImpact: 'Improved categorization accuracy'
      });
    }

    if (significantChange.significance > 0.5) {
      actions.push({
        action: 'Review budget allocation',
        priority: 'immediate' as const,
        description: 'Review and potentially adjust budget allocation based on behavior change',
        expectedImpact: 'Better budget accuracy and planning'
      });
    }

    return actions;
  }

  private createBehaviorMonitoringPlan(significantChange: any): BehaviorChangeDetection['monitoringPlan'] {
    return {
      reviewPeriod: significantChange.significance > 0.7 ? 14 : 30,
      keyMetrics: ['transaction_frequency', 'average_amount', 'category_consistency'],
      alertThresholds: {
        amount_change: 0.3,
        frequency_change: 0.5,
        category_drift: 0.2
      }
    };
  }

  // Actionable insight generation methods

  private async generateOptimizationInsights(
    payeeId: number,
    payeeName: string,
    unifiedRecommendations: UnifiedRecommendations
  ): Promise<ActionableInsight[]> {
    const insights = [];

    if (unifiedRecommendations.overall.priority === 'high' || unifiedRecommendations.overall.priority === 'critical') {
      insights.push({
        id: `opt_${payeeId}_${Date.now()}`,
        payeeId,
        payeeName,
        type: 'optimization' as const,
        priority: unifiedRecommendations.overall.priority as 'critical' | 'high' | 'medium' | 'low',
        title: 'Budget and Category Optimization Available',
        description: unifiedRecommendations.overall.recommendation,
        insight: `ML analysis suggests ${unifiedRecommendations.overall.action} with ${(unifiedRecommendations.overall.confidence * 100).toFixed(0)}% confidence`,
        confidence: unifiedRecommendations.overall.confidence,
        sources: ['unified_ml'],
        recommendedActions: [{
          action: unifiedRecommendations.overall.action,
          description: unifiedRecommendations.overall.reasoning.join('; '),
          effort: 'low' as const,
          impact: 'high' as const,
          timeline: '1-2 days',
          implementation: {
            manual: true,
            automated: false,
            requiresApproval: true,
            steps: [`Apply ${unifiedRecommendations.overall.action}`, 'Monitor results', 'Validate improvement']
          }
        }],
        expectedOutcomes: [{
          outcome: 'Improved accuracy',
          probability: unifiedRecommendations.overall.confidence,
          value: '15-25% improvement',
          timeframe: '2-4 weeks'
        }],
        riskMitigation: [{
          risk: 'Recommendation inaccuracy',
          mitigation: 'Monitor results closely',
          contingency: 'Revert changes if needed'
        }],
        trackingMetrics: [{
          metric: 'Categorization accuracy',
          currentValue: 'Unknown',
          targetValue: '90%+',
          measurementFrequency: 'Weekly'
        }],
        generatedAt: toISOString(currentDate),
        expiresAt: toISOString(currentDate.add({ days: 30 })),
        status: 'active' as const
      });
    }

    return insights;
  }

  private async generateCorrectionInsights(
    payeeId: number,
    payeeName: string,
    crossSystemLearning: CrossSystemLearning,
    behaviorChanges: BehaviorChangeDetection
  ): Promise<ActionableInsight[]> {
    const insights = [];

    if (behaviorChanges.changeDetected && behaviorChanges.severity !== 'minor') {
      insights.push({
        id: `corr_${payeeId}_${Date.now()}`,
        payeeId,
        payeeName,
        type: 'correction' as const,
        priority: (behaviorChanges.severity === 'major' ? 'critical' : 'high') as 'critical' | 'high',
        title: 'Behavior Change Requires Attention',
        description: `${behaviorChanges.changeType} detected with ${behaviorChanges.severity} severity`,
        insight: `Payee behavior has changed significantly, requiring manual review and potential corrections`,
        confidence: behaviorChanges.confidence,
        sources: ['behavior_analysis'],
        recommendedActions: behaviorChanges.recommendedActions.map(action => ({
          action: action.action,
          description: action.description,
          effort: (action.priority === 'immediate' ? 'high' : 'medium') as 'high' | 'medium',
          impact: 'high' as const,
          timeline: action.priority === 'immediate' ? 'Immediate' : '1 week',
          implementation: {
            manual: true,
            automated: false,
            requiresApproval: true,
            steps: [action.description, 'Monitor for additional changes']
          }
        })),
        expectedOutcomes: [{
          outcome: 'Restored accuracy',
          probability: 0.8,
          value: 'Accuracy restored to previous levels',
          timeframe: '1-2 weeks'
        }],
        riskMitigation: [{
          risk: 'Continued drift',
          mitigation: 'Implement enhanced monitoring',
          contingency: 'Manual oversight increase'
        }],
        trackingMetrics: [{
          metric: 'Behavior stability',
          currentValue: 'Changing',
          targetValue: 'Stable',
          measurementFrequency: 'Daily'
        }],
        generatedAt: toISOString(currentDate),
        expiresAt: toISOString(currentDate.add({ days: 14 })),
        status: 'active' as const
      });
    }

    return insights;
  }

  private async generatePredictionInsights(
    payeeId: number,
    payeeName: string,
    unifiedRecommendations: UnifiedRecommendations,
    systemConfidence: any
  ): Promise<ActionableInsight[]> {
    const insights = [];

    if (unifiedRecommendations.performanceMetrics.predictionAccuracy < 0.7) {
      insights.push({
        id: `pred_${payeeId}_${Date.now()}`,
        payeeId,
        payeeName,
        type: 'prediction' as const,
        priority: 'medium' as const,
        title: 'Prediction Accuracy Below Optimal',
        description: `ML prediction accuracy is ${(unifiedRecommendations.performanceMetrics.predictionAccuracy * 100).toFixed(0)}%, below optimal threshold`,
        insight: 'Low prediction accuracy may lead to suboptimal recommendations and automation decisions',
        confidence: 0.9,
        sources: ['performance_monitoring'],
        recommendedActions: [{
          action: 'Improve data quality',
          description: 'Focus on data completeness and consistency to improve prediction accuracy',
          effort: 'medium' as const,
          impact: 'high' as const,
          timeline: '2-4 weeks',
          implementation: {
            manual: true,
            automated: false,
            requiresApproval: false,
            steps: ['Review data gaps', 'Increase transaction categorization', 'Validate historical data']
          }
        }],
        expectedOutcomes: [{
          outcome: 'Improved predictions',
          probability: 0.8,
          value: '10-20% accuracy improvement',
          timeframe: '4-6 weeks'
        }],
        riskMitigation: [{
          risk: 'Poor automation decisions',
          mitigation: 'Reduce automation confidence thresholds',
          contingency: 'Increase manual oversight'
        }],
        trackingMetrics: [{
          metric: 'Prediction accuracy',
          currentValue: unifiedRecommendations.performanceMetrics.predictionAccuracy,
          targetValue: 0.8,
          measurementFrequency: 'Weekly'
        }],
        generatedAt: toISOString(currentDate),
        expiresAt: toISOString(currentDate.add({ days: 60 })),
        status: 'active' as const
      });
    }

    return insights;
  }

  private async generateAutomationInsights(
    payeeId: number,
    payeeName: string,
    automationSuggestions: UnifiedRecommendations['automationSuggestions']
  ): Promise<ActionableInsight[]> {
    const insights = [];

    const highConfidenceAutomation = automationSuggestions.filter(s => s.confidence > 0.8);

    if (highConfidenceAutomation.length > 0) {
      insights.push({
        id: `auto_${payeeId}_${Date.now()}`,
        payeeId,
        payeeName,
        type: 'automation' as const,
        priority: 'medium' as const,
        title: 'High-Confidence Automation Available',
        description: `${highConfidenceAutomation.length} automation opportunities with high confidence`,
        insight: 'ML systems have identified opportunities for reliable automation that could save time and improve accuracy',
        confidence: Math.max(...highConfidenceAutomation.map(s => s.confidence)),
        sources: ['automation_analysis'],
        recommendedActions: highConfidenceAutomation.map(suggestion => ({
          action: `Enable ${suggestion.type.replace('_', ' ')}`,
          description: suggestion.description,
          effort: 'low' as const,
          impact: 'medium' as const,
          timeline: '1 day',
          implementation: {
            manual: false,
            automated: true,
            requiresApproval: suggestion.implementation === 'user_approval',
            steps: [`Configure ${suggestion.type}`, 'Test automation', 'Monitor results']
          }
        })),
        expectedOutcomes: [{
          outcome: 'Time savings',
          probability: 0.9,
          value: '5-10 minutes per week',
          timeframe: 'Immediate'
        }],
        riskMitigation: [{
          risk: 'Automation errors',
          mitigation: 'Start with review mode',
          contingency: 'Disable if errors occur'
        }],
        trackingMetrics: [{
          metric: 'Automation accuracy',
          currentValue: 'N/A',
          targetValue: '95%+',
          measurementFrequency: 'Daily'
        }],
        generatedAt: toISOString(currentDate),
        expiresAt: toISOString(currentDate.add({ days: 30 })),
        status: 'active' as const
      });
    }

    return insights;
  }

  private async generateAlertInsights(
    payeeId: number,
    payeeName: string,
    behaviorChanges: BehaviorChangeDetection,
    systemConfidence: any
  ): Promise<ActionableInsight[]> {
    const insights = [];

    if (systemConfidence.overall < 0.5) {
      insights.push({
        id: `alert_${payeeId}_${Date.now()}`,
        payeeId,
        payeeName,
        type: 'alert' as const,
        priority: 'high' as const,
        title: 'Low System Confidence Alert',
        description: `Overall ML confidence is ${(systemConfidence.overall * 100).toFixed(0)}%, below acceptable threshold`,
        insight: 'Low system confidence indicates potential data quality issues or model performance problems',
        confidence: 0.95,
        sources: ['confidence_monitoring'],
        recommendedActions: [{
          action: 'Manual review and validation',
          description: 'Manually review recent transactions and ML recommendations for this payee',
          effort: 'high' as const,
          impact: 'high' as const,
          timeline: '1-2 days',
          implementation: {
            manual: true,
            automated: false,
            requiresApproval: false,
            steps: ['Review recent transactions', 'Validate categorizations', 'Provide corrective feedback']
          }
        }],
        expectedOutcomes: [{
          outcome: 'Improved confidence',
          probability: 0.8,
          value: 'Confidence increase to 70%+',
          timeframe: '1-2 weeks'
        }],
        riskMitigation: [{
          risk: 'Continued low confidence',
          mitigation: 'Increase manual oversight',
          contingency: 'Disable automation for this payee'
        }],
        trackingMetrics: [{
          metric: 'System confidence',
          currentValue: systemConfidence.overall,
          targetValue: 0.7,
          measurementFrequency: 'Daily'
        }],
        generatedAt: toISOString(currentDate),
        expiresAt: toISOString(currentDate.add({ days: 7 })),
        status: 'active' as const
      });
    }

    return insights;
  }
}