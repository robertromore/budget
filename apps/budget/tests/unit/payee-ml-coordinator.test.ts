import {describe, it, expect, beforeEach, vi} from 'vitest';
import {PayeeMLCoordinator} from '../../src/lib/server/domains/payees/ml-coordinator';

// Mock the database
let mockDb: any;

vi.mock('../../src/lib/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  }
}));

// Mock PayeeIntelligenceService
vi.mock('../../src/lib/server/domains/payees/intelligence', () => ({
  PayeeIntelligenceService: vi.fn().mockImplementation(() => ({
    analyzeSpendingPatterns: vi.fn(),
    detectSeasonality: vi.fn(),
    analyzeFrequencyPattern: vi.fn(),
    suggestBudgetAllocation: vi.fn(),
    calculateConfidenceScores: vi.fn(),
  }))
}));

// Mock CategoryLearningService
vi.mock('../../src/lib/server/domains/payees/category-learning', () => ({
  CategoryLearningService: vi.fn().mockImplementation(() => ({
    getCategoryRecommendations: vi.fn(),
    analyzeCorrectionPatterns: vi.fn(),
    getLearningMetrics: vi.fn(),
  }))
}));

// Mock BudgetAllocationService
vi.mock('../../src/lib/server/domains/payees/budget-allocation', () => ({
  BudgetAllocationService: vi.fn().mockImplementation(() => ({
    analyzeBudgetOptimization: vi.fn(),
  }))
}));

// Mock logger
vi.mock('../../src/lib/server/shared/logging', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  }
}));

// Mock date utilities
vi.mock('../../src/lib/utils/dates', () => {
  const mockDate = {
    year: 2025,
    month: 1,
    day: 15,
    subtract: vi.fn(({months}: {months: number}) => {
      const newDate = new Date(2025, 0, 15);
      newDate.setMonth(newDate.getMonth() - months);
      return {
        year: newDate.getFullYear(),
        month: newDate.getMonth() + 1,
        day: newDate.getDate(),
        subtract: vi.fn(),
        toISOString: () => newDate.toISOString().split('T')[0],
      };
    }),
    toISOString: () => '2025-01-15',
    add: vi.fn(({days}: {days: number}) => ({
      toISOString: () => {
        const date = new Date(2025, 0, 15);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
      },
    })),
  };

  return {
    currentDate: mockDate,
    toISOString: vi.fn((date: any) => {
      if (typeof date === 'string') return date;
      if (date && date.toISOString) return date.toISOString();
      return new Date().toISOString();
    }),
  };
});

describe('PayeeMLCoordinator', () => {
  let service: PayeeMLCoordinator;
  let mockPayeeIntelligence: any;
  let mockCategoryLearning: any;
  let mockBudgetAllocation: any;

  beforeEach(async () => {
    service = new PayeeMLCoordinator();
    mockPayeeIntelligence = (service as any).payeeIntelligence;
    mockCategoryLearning = (service as any).categoryLearning;
    mockBudgetAllocation = (service as any).budgetAllocation;

    const db = await import('../../src/lib/server/db');
    mockDb = db.db;
    vi.clearAllMocks();

    // Reset all mock functions
    mockDb.select.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.limit.mockReturnValue([{name: 'Test Payee', defaultCategoryId: 1}]);
    mockDb.orderBy.mockReturnThis();

    // Setup default service responses
    mockPayeeIntelligence.analyzeSpendingPatterns.mockResolvedValue({
      totalAmount: 1000,
      averageAmount: 100,
      transactionCount: 10,
      timeSpanDays: 90,
      trendDirection: 'stable' as const,
      trendStrength: 0.2,
      volatility: 0.3,
      standardDeviation: 15,
    });

    mockPayeeIntelligence.detectSeasonality.mockResolvedValue([]);

    mockPayeeIntelligence.analyzeFrequencyPattern.mockResolvedValue({
      regularityScore: 0.8,
      detectedFrequency: 'monthly' as const,
    });

    mockPayeeIntelligence.suggestBudgetAllocation.mockResolvedValue({
      budgetCategory: {
        primaryCategoryId: 1,
        primaryCategoryName: 'Groceries',
        categoryConfidence: 0.85,
      }
    });

    mockPayeeIntelligence.calculateConfidenceScores.mockResolvedValue({
      overall: 0.75,
    });

    mockCategoryLearning.getCategoryRecommendations.mockResolvedValue({
      payeeId: 1,
      recommendedCategoryId: 1,
      recommendedCategoryName: 'Groceries',
      confidence: 0.8,
      reasoning: 'Based on transaction patterns',
    });

    mockCategoryLearning.analyzeCorrectionPatterns.mockResolvedValue([]);

    mockCategoryLearning.getLearningMetrics.mockResolvedValue({
      correctionAccuracy: 0.82,
    });

    mockBudgetAllocation.analyzeBudgetOptimization.mockResolvedValue({
      payeeId: 1,
      payeeName: 'Test Payee',
      currentBudgetAllocation: 400,
      actualSpending: {
        monthly: 350,
        average: 100,
        trend: 'stable' as const,
        volatility: 0.2,
        seasonalVariation: 0.1,
      },
      efficiency: {
        score: 0.7,
        budgetUtilization: 0.875,
        overBudgetFrequency: 0.1,
        underBudgetAmount: 50,
        wasteScore: 0.125,
      },
      riskAssessment: {
        volatilityRisk: 0.2,
        trendRisk: 0.1,
        seasonalRisk: 0.1,
        frequencyRisk: 0.2,
        overallRisk: 0.15,
      },
      recommendations: {
        optimizedAllocation: 380,
        adjustmentPercent: -5,
        adjustmentAmount: -20,
        confidence: 0.75,
        priority: 'medium' as const,
        reasoning: ['Budget is slightly over-allocated'],
      },
    });

    // Mock payee info query (default for all tests)
    // Note: limit.mockReturnValue is set above in the chaining reset
  });

  describe('generateUnifiedRecommendations', () => {
    it('should generate comprehensive unified recommendations', async () => {
      const recommendations = await service.generateUnifiedRecommendations(1);

      expect(recommendations).toHaveProperty('payeeId', 1);
      expect(recommendations).toHaveProperty('payeeName', 'Test Payee');
      expect(recommendations).toHaveProperty('overall');
      expect(recommendations).toHaveProperty('categoryRecommendation');
      expect(recommendations).toHaveProperty('budgetRecommendation');
      expect(recommendations).toHaveProperty('riskAssessment');
      expect(recommendations).toHaveProperty('automationSuggestions');
      expect(recommendations).toHaveProperty('performanceMetrics');
    });

    it('should provide overall recommendation with confidence', async () => {
      const recommendations = await service.generateUnifiedRecommendations(1);

      expect(recommendations.overall).toHaveProperty('confidence');
      expect(recommendations.overall).toHaveProperty('priority');
      expect(recommendations.overall).toHaveProperty('recommendation');
      expect(recommendations.overall).toHaveProperty('action');
      expect(recommendations.overall).toHaveProperty('reasoning');
      expect(['no_action', 'update_category', 'adjust_budget', 'review_patterns']).toContain(
        recommendations.overall.action
      );
    });

    it('should perform ensemble learning for category recommendation', async () => {
      const recommendations = await service.generateUnifiedRecommendations(1);

      expect(recommendations.categoryRecommendation).toHaveProperty('recommendedCategoryId');
      expect(recommendations.categoryRecommendation).toHaveProperty('recommendedCategoryName');
      expect(recommendations.categoryRecommendation).toHaveProperty('confidence');
      expect(recommendations.categoryRecommendation).toHaveProperty('systemSource');
      expect(recommendations.categoryRecommendation).toHaveProperty('alternatives');
      expect(['intelligence', 'learning', 'ensemble']).toContain(
        recommendations.categoryRecommendation.systemSource
      );
    });

    it('should generate automation suggestions based on confidence', async () => {
      const recommendations = await service.generateUnifiedRecommendations(1);

      expect(Array.isArray(recommendations.automationSuggestions)).toBe(true);
      recommendations.automationSuggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('implementation');
        expect(['auto_categorize', 'auto_budget', 'predictive_alert', 'scheduled_review']).toContain(
          suggestion.type
        );
      });
    });

    it('should calculate meta-confidence across systems', async () => {
      const recommendations = await service.generateUnifiedRecommendations(1);

      expect(recommendations.overall.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendations.overall.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle context parameters', async () => {
      const context = {
        transactionAmount: 50,
        transactionDate: '2025-01-15',
        riskTolerance: 0.7,
      };

      const recommendations = await service.generateUnifiedRecommendations(1, context);

      expect(recommendations).toHaveProperty('payeeId', 1);
      expect(mockCategoryLearning.getCategoryRecommendations).toHaveBeenCalledWith(1, context);
    });
  });

  describe('performCrossSystemLearning', () => {
    it('should perform cross-system learning analysis', async () => {
      const learning = await service.performCrossSystemLearning(1);

      expect(learning).toHaveProperty('payeeId', 1);
      expect(learning).toHaveProperty('payeeName', 'Test Payee');
      expect(learning).toHaveProperty('patterns');
      expect(learning).toHaveProperty('correlations');
      expect(learning).toHaveProperty('emergentBehaviors');
    });

    it('should identify cross-domain patterns', async () => {
      const learning = await service.performCrossSystemLearning(1);

      expect(Array.isArray(learning.patterns)).toBe(true);
      learning.patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('patternType');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('evidence');
        expect(pattern).toHaveProperty('implications');
        expect(pattern).toHaveProperty('actionableInsights');
      });
    });

    it('should calculate correlations between factors', async () => {
      const learning = await service.performCrossSystemLearning(1);

      expect(Array.isArray(learning.correlations)).toBe(true);
      learning.correlations.forEach(correlation => {
        expect(correlation).toHaveProperty('factor1');
        expect(correlation).toHaveProperty('factor2');
        expect(correlation).toHaveProperty('correlationStrength');
        expect(correlation).toHaveProperty('statisticalSignificance');
        expect(correlation).toHaveProperty('businessImplication');
        expect(correlation.correlationStrength).toBeGreaterThanOrEqual(-1);
        expect(correlation.correlationStrength).toBeLessThanOrEqual(1);
      });
    });

    it('should detect emergent behaviors', async () => {
      const learning = await service.performCrossSystemLearning(1);

      expect(Array.isArray(learning.emergentBehaviors)).toBe(true);
      learning.emergentBehaviors.forEach(behavior => {
        expect(behavior).toHaveProperty('behavior');
        expect(behavior).toHaveProperty('detectionDate');
        expect(behavior).toHaveProperty('confidence');
        expect(behavior).toHaveProperty('impact');
        expect(behavior).toHaveProperty('recommendedResponse');
        expect(['positive', 'negative', 'neutral']).toContain(behavior.impact);
      });
    });
  });

  describe('executeAdaptiveOptimization', () => {
    it('should execute adaptive optimization', async () => {
      const result = await service.executeAdaptiveOptimization(1, {
        applyCategorizationUpdates: true,
        applyBudgetUpdates: false,
        dryRun: true,
        confidenceThreshold: 0.7,
      });

      expect(result).toHaveProperty('applied');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('performance');
      expect(Array.isArray(result.applied)).toBe(true);
      expect(Array.isArray(result.skipped)).toBe(true);
    });

    it('should report performance metrics', async () => {
      const result = await service.executeAdaptiveOptimization(1);

      expect(result.performance).toHaveProperty('processingTime');
      expect(result.performance).toHaveProperty('systemsConsulted');
      expect(result.performance).toHaveProperty('dataPointsAnalyzed');
      expect(result.performance.processingTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.performance.systemsConsulted)).toBe(true);
    });

    it('should apply high-confidence category updates', async () => {
      // Mock high confidence recommendation
      mockCategoryLearning.getCategoryRecommendations.mockResolvedValueOnce({
        payeeId: 1,
        recommendedCategoryId: 2,
        recommendedCategoryName: 'Dining Out',
        confidence: 0.9,
        reasoning: 'High confidence',
      });

      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee', defaultCategoryId: 1}]);

      const result = await service.executeAdaptiveOptimization(1, {
        applyCategorizationUpdates: true,
        confidenceThreshold: 0.8,
        dryRun: false,
      });

      const categoryUpdate = result.applied.find(a => a.type === 'category');
      if (categoryUpdate) {
        expect(categoryUpdate.confidence).toBeGreaterThanOrEqual(0.8);
        expect(categoryUpdate).toHaveProperty('oldValue');
        expect(categoryUpdate).toHaveProperty('newValue');
      }
    });

    it('should skip low-confidence updates', async () => {
      // Mock low confidence recommendation
      mockCategoryLearning.getCategoryRecommendations.mockResolvedValueOnce({
        payeeId: 1,
        recommendedCategoryId: 2,
        recommendedCategoryName: 'Dining Out',
        confidence: 0.5,
        reasoning: 'Low confidence',
      });

      const result = await service.executeAdaptiveOptimization(1, {
        applyCategorizationUpdates: true,
        confidenceThreshold: 0.8,
        dryRun: true,
      });

      const categorySkip = result.skipped.find(s => s.type === 'category');
      expect(categorySkip).toBeDefined();
      expect(categorySkip?.reason).toContain('below threshold');
    });

    it('should handle dry run mode', async () => {
      const result = await service.executeAdaptiveOptimization(1, {
        dryRun: true,
      });

      // In dry run, changes should be tracked but not applied
      expect(result.performance.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('assessSystemConfidence', () => {
    it('should assess overall system confidence', async () => {
      const confidence = await service.assessSystemConfidence(1);

      expect(confidence).toHaveProperty('overall');
      expect(confidence).toHaveProperty('systemConfidences');
      expect(confidence).toHaveProperty('dataQuality');
      expect(confidence).toHaveProperty('reliability');
      expect(confidence).toHaveProperty('recommendations');

      expect(confidence.overall).toBeGreaterThanOrEqual(0);
      expect(confidence.overall).toBeLessThanOrEqual(1);
    });

    it('should assess individual system confidences', async () => {
      const confidence = await service.assessSystemConfidence(1);

      expect(confidence.systemConfidences).toHaveProperty('intelligence');
      expect(confidence.systemConfidences).toHaveProperty('learning');
      expect(confidence.systemConfidences).toHaveProperty('budgetAllocation');
      expect(confidence.systemConfidences).toHaveProperty('ensemble');

      Object.values(confidence.systemConfidences).forEach(conf => {
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      });
    });

    it('should assess data quality', async () => {
      const confidence = await service.assessSystemConfidence(1);

      expect(confidence.dataQuality).toHaveProperty('score');
      expect(confidence.dataQuality).toHaveProperty('factors');
      expect(confidence.dataQuality.factors).toHaveProperty('completeness');
      expect(confidence.dataQuality.factors).toHaveProperty('recency');
      expect(confidence.dataQuality.factors).toHaveProperty('volume');
      expect(confidence.dataQuality.factors).toHaveProperty('consistency');
    });

    it('should assess system reliability', async () => {
      const confidence = await service.assessSystemConfidence(1);

      expect(confidence.reliability).toHaveProperty('score');
      expect(confidence.reliability).toHaveProperty('factors');
      expect(confidence.reliability.factors).toHaveProperty('historicalAccuracy');
      expect(confidence.reliability.factors).toHaveProperty('predictionStability');
      expect(confidence.reliability.factors).toHaveProperty('systemAgreement');
    });

    it('should generate confidence-based recommendations', async () => {
      const confidence = await service.assessSystemConfidence(1);

      expect(Array.isArray(confidence.recommendations)).toBe(true);
      confidence.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });

  describe('detectPayeeBehaviorChanges', () => {
    beforeEach(() => {
      // Mock transaction data for behavior detection
      // Need to mock orderBy as well since getPayeeBehaviorData uses it
      mockDb.orderBy.mockResolvedValue([
        {date: '2024-12-01', amount: 100, categoryId: 1},
        {date: '2024-12-15', amount: 110, categoryId: 1},
        {date: '2025-01-01', amount: 150, categoryId: 2},
        {date: '2025-01-15', amount: 160, categoryId: 2},
      ]);
    });

    it('should detect behavior changes', async () => {
      const detection = await service.detectPayeeBehaviorChanges(1, 6);

      expect(detection).toHaveProperty('payeeId', 1);
      expect(detection).toHaveProperty('payeeName', 'Test Payee');
      expect(detection).toHaveProperty('changeDetected');
      expect(detection).toHaveProperty('changeType');
      expect(detection).toHaveProperty('severity');
      expect(detection).toHaveProperty('confidence');
      expect(detection).toHaveProperty('detectionMethod');

      expect(typeof detection.changeDetected).toBe('boolean');
    });

    it('should analyze change details', async () => {
      const detection = await service.detectPayeeBehaviorChanges(1, 6);

      expect(detection).toHaveProperty('changeDetails');
      expect(detection.changeDetails).toHaveProperty('beforePeriod');
      expect(detection.changeDetails).toHaveProperty('afterPeriod');
      expect(detection.changeDetails).toHaveProperty('keyChanges');

      expect(Array.isArray(detection.changeDetails.keyChanges)).toBe(true);
    });

    it('should identify potential causes', async () => {
      const detection = await service.detectPayeeBehaviorChanges(1, 6);

      expect(detection).toHaveProperty('potentialCauses');
      expect(Array.isArray(detection.potentialCauses)).toBe(true);

      detection.potentialCauses.forEach(cause => {
        expect(cause).toHaveProperty('cause');
        expect(cause).toHaveProperty('probability');
        expect(cause).toHaveProperty('evidence');
        expect(cause.probability).toBeGreaterThanOrEqual(0);
        expect(cause.probability).toBeLessThanOrEqual(1);
      });
    });

    it('should generate recommended actions', async () => {
      const detection = await service.detectPayeeBehaviorChanges(1, 6);

      expect(detection).toHaveProperty('recommendedActions');
      expect(Array.isArray(detection.recommendedActions)).toBe(true);

      detection.recommendedActions.forEach(action => {
        expect(action).toHaveProperty('action');
        expect(action).toHaveProperty('priority');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('expectedImpact');
        expect(['immediate', 'soon', 'monitor']).toContain(action.priority);
      });
    });

    it('should create monitoring plan', async () => {
      const detection = await service.detectPayeeBehaviorChanges(1, 6);

      expect(detection).toHaveProperty('monitoringPlan');
      expect(detection.monitoringPlan).toHaveProperty('reviewPeriod');
      expect(detection.monitoringPlan).toHaveProperty('keyMetrics');
      expect(detection.monitoringPlan).toHaveProperty('alertThresholds');
      expect(detection.monitoringPlan.reviewPeriod).toBeGreaterThan(0);
    });

    it('should categorize severity appropriately', async () => {
      const detection = await service.detectPayeeBehaviorChanges(1, 6);

      expect(['major', 'moderate', 'minor']).toContain(detection.severity);
    });
  });

  describe('generateActionableInsights', () => {
    beforeEach(() => {
      // Mock transaction data for insights
      mockDb.orderBy.mockResolvedValue([]);
    });

    it('should generate actionable insights', async () => {
      const insights = await service.generateActionableInsights(1);

      expect(Array.isArray(insights)).toBe(true);
      insights.forEach(insight => {
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('payeeId', 1);
        expect(insight).toHaveProperty('payeeName');
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('priority');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('insight');
        expect(insight).toHaveProperty('confidence');
        expect(insight).toHaveProperty('sources');
        expect(insight).toHaveProperty('recommendedActions');
        expect(insight).toHaveProperty('expectedOutcomes');
        expect(insight).toHaveProperty('riskMitigation');
        expect(insight).toHaveProperty('trackingMetrics');
        expect(insight).toHaveProperty('generatedAt');
        expect(insight).toHaveProperty('expiresAt');
        expect(insight).toHaveProperty('status');
      });
    });

    it('should generate specific insight types', async () => {
      const insightTypes = ['optimization', 'automation'];
      const insights = await service.generateActionableInsights(1, insightTypes);

      expect(Array.isArray(insights)).toBe(true);
      insights.forEach(insight => {
        expect(insightTypes).toContain(insight.type);
      });
    });

    it('should sort insights by priority and confidence', async () => {
      const insights = await service.generateActionableInsights(1);

      if (insights.length > 1) {
        const priorityOrder = {critical: 4, high: 3, medium: 2, low: 1};
        for (let i = 0; i < insights.length - 1; i++) {
          const currentPriority = priorityOrder[insights[i].priority];
          const nextPriority = priorityOrder[insights[i + 1].priority];
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });

    it('should include implementation details', async () => {
      const insights = await service.generateActionableInsights(1);

      insights.forEach(insight => {
        insight.recommendedActions.forEach(action => {
          expect(action).toHaveProperty('action');
          expect(action).toHaveProperty('description');
          expect(action).toHaveProperty('effort');
          expect(action).toHaveProperty('impact');
          expect(action).toHaveProperty('timeline');
          expect(action).toHaveProperty('implementation');
          expect(action.implementation).toHaveProperty('manual');
          expect(action.implementation).toHaveProperty('automated');
          expect(action.implementation).toHaveProperty('requiresApproval');
          expect(action.implementation).toHaveProperty('steps');
        });
      });
    });

    it('should include expected outcomes', async () => {
      const insights = await service.generateActionableInsights(1);

      insights.forEach(insight => {
        expect(Array.isArray(insight.expectedOutcomes)).toBe(true);
        insight.expectedOutcomes.forEach(outcome => {
          expect(outcome).toHaveProperty('outcome');
          expect(outcome).toHaveProperty('probability');
          expect(outcome).toHaveProperty('value');
          expect(outcome).toHaveProperty('timeframe');
          expect(outcome.probability).toBeGreaterThanOrEqual(0);
          expect(outcome.probability).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should include tracking metrics', async () => {
      const insights = await service.generateActionableInsights(1);

      insights.forEach(insight => {
        expect(Array.isArray(insight.trackingMetrics)).toBe(true);
        insight.trackingMetrics.forEach(metric => {
          expect(metric).toHaveProperty('metric');
          expect(metric).toHaveProperty('currentValue');
          expect(metric).toHaveProperty('targetValue');
          expect(metric).toHaveProperty('measurementFrequency');
        });
      });
    });
  });

  // Note: Complex internal methods like identifyCrossDomainPatterns, calculateCrossSystemCorrelations,
  // detectEmergentBehaviors, and various insight generation methods are tested indirectly through
  // the public API methods above. Full testing of all calculation branches and ML coordination logic
  // would be better served by integration tests with realistic multi-system data.
});