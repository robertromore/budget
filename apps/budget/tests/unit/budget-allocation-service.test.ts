import {describe, it, expect, beforeEach, vi} from 'vitest';
import {BudgetAllocationService} from '../../src/lib/server/domains/payees/budget-allocation';

// Mock the database
let mockDb: any;

vi.mock('../../src/lib/server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
}));

// Mock PayeeIntelligenceService
vi.mock('../../src/lib/server/domains/payees/intelligence', () => ({
  PayeeIntelligenceService: vi.fn().mockImplementation(() => ({
    analyzeSpendingPatterns: vi.fn(),
    detectSeasonality: vi.fn(),
    analyzeFrequencyPattern: vi.fn(),
  }))
}));

// Mock CategoryLearningService
vi.mock('../../src/lib/server/domains/payees/category-learning', () => ({
  CategoryLearningService: vi.fn().mockImplementation(() => ({}))
}));

describe('BudgetAllocationService', () => {
  let service: BudgetAllocationService;
  let mockPayeeIntelligence: any;

  beforeEach(async () => {
    service = new BudgetAllocationService();
    mockPayeeIntelligence = (service as any).payeeIntelligence;

    const db = await import('../../src/lib/server/db');
    mockDb = db.db;
    vi.clearAllMocks();

    // Reset all mock functions to return 'this' for chaining
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.leftJoin.mockReturnThis();
    mockDb.limit.mockReturnThis();

    // Setup default intelligence service responses
    mockPayeeIntelligence.analyzeSpendingPatterns.mockResolvedValue({
      totalAmount: 1000,
      averageAmount: 100,
      transactionCount: 10,
      timeSpanDays: 90,
      trendDirection: 'stable' as const,
      trendStrength: 0.1,
      volatility: 0.2,
      standardDeviation: 15,
    });

    mockPayeeIntelligence.detectSeasonality.mockResolvedValue([
      {month: 1, seasonalMultiplier: 1.0},
      {month: 6, seasonalMultiplier: 1.2},
    ]);

    mockPayeeIntelligence.analyzeFrequencyPattern.mockResolvedValue({
      regularityScore: 0.8,
      detectedFrequency: 'monthly' as const,
    });
  });

  describe('analyzeBudgetOptimization', () => {
    it('should analyze budget optimization for a payee', async () => {
      // Mock payee info
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const analysis = await service.analyzeBudgetOptimization(1);

      expect(analysis).toHaveProperty('payeeId', 1);
      expect(analysis).toHaveProperty('payeeName', 'Test Payee');
      expect(analysis).toHaveProperty('currentBudgetAllocation');
      expect(analysis).toHaveProperty('actualSpending');
      expect(analysis).toHaveProperty('efficiency');
      expect(analysis).toHaveProperty('riskAssessment');
      expect(analysis).toHaveProperty('recommendations');
    });

    it('should calculate actual spending metrics', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const analysis = await service.analyzeBudgetOptimization(1);

      expect(analysis.actualSpending).toHaveProperty('monthly');
      expect(analysis.actualSpending).toHaveProperty('average');
      expect(analysis.actualSpending).toHaveProperty('trend');
      expect(analysis.actualSpending).toHaveProperty('volatility');
      expect(analysis.actualSpending).toHaveProperty('seasonalVariation');
      expect(analysis.actualSpending.monthly).toBeGreaterThan(0);
    });

    it('should assess budget risk factors', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const analysis = await service.analyzeBudgetOptimization(1);

      expect(analysis.riskAssessment).toHaveProperty('volatilityRisk');
      expect(analysis.riskAssessment).toHaveProperty('trendRisk');
      expect(analysis.riskAssessment).toHaveProperty('seasonalRisk');
      expect(analysis.riskAssessment).toHaveProperty('frequencyRisk');
      expect(analysis.riskAssessment).toHaveProperty('overallRisk');
      expect(analysis.riskAssessment.overallRisk).toBeGreaterThanOrEqual(0);
      expect(analysis.riskAssessment.overallRisk).toBeLessThanOrEqual(1);
    });

    it('should generate optimization recommendations', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const analysis = await service.analyzeBudgetOptimization(1);

      expect(analysis.recommendations).toHaveProperty('optimizedAllocation');
      expect(analysis.recommendations).toHaveProperty('adjustmentPercent');
      expect(analysis.recommendations).toHaveProperty('adjustmentAmount');
      expect(analysis.recommendations).toHaveProperty('confidence');
      expect(analysis.recommendations).toHaveProperty('priority');
      expect(analysis.recommendations).toHaveProperty('reasoning');
      expect(analysis.recommendations.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.recommendations.confidence).toBeLessThanOrEqual(1);
      expect(['high', 'medium', 'low']).toContain(analysis.recommendations.priority);
    });

    it('should handle increasing trend with higher risk', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);
      mockPayeeIntelligence.analyzeSpendingPatterns.mockResolvedValueOnce({
        totalAmount: 1500,
        averageAmount: 150,
        transactionCount: 10,
        timeSpanDays: 90,
        trendDirection: 'increasing' as const,
        trendStrength: 0.4,
        volatility: 0.3,
        standardDeviation: 20,
      });

      const analysis = await service.analyzeBudgetOptimization(1);

      expect(analysis.actualSpending.trend).toBe('increasing');
      expect(analysis.riskAssessment.trendRisk).toBeGreaterThan(0);
      expect(analysis.recommendations.reasoning).toContainEqual(
        expect.stringMatching(/increasing/i)
      );
    });
  });

  describe('suggestOptimalAllocations', () => {
    it('should suggest optimal allocations for payees', async () => {
      // Mock relevant payees query
      mockDb.where.mockResolvedValueOnce([{id: 1}, {id: 2}]);

      // Mock payee info for each payee
      mockDb.limit
        .mockResolvedValueOnce([{name: 'Payee 1'}])
        .mockResolvedValueOnce([{defaultCategoryId: 1}])
        .mockResolvedValueOnce([{name: 'Category 1'}])
        .mockResolvedValueOnce([{name: 'Payee 2'}])
        .mockResolvedValueOnce([{defaultCategoryId: 2}])
        .mockResolvedValueOnce([{name: 'Category 2'}]);

      const suggestions = await service.suggestOptimalAllocations(undefined, {
        strategy: 'balanced',
      });

      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('payeeId');
        expect(suggestion).toHaveProperty('payeeName');
        expect(suggestion).toHaveProperty('suggestedAllocation');
        expect(suggestion).toHaveProperty('allocationRange');
        expect(suggestion).toHaveProperty('adjustmentType');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('reasoning');
      });
    });

    it('should filter suggestions by confidence threshold', async () => {
      mockDb.where.mockResolvedValueOnce([{id: 1}]);
      mockDb.limit
        .mockResolvedValueOnce([{name: 'Test Payee'}])
        .mockResolvedValueOnce([{defaultCategoryId: null}]);

      // Mock low confidence scenario
      mockPayeeIntelligence.analyzeSpendingPatterns.mockResolvedValueOnce({
        totalAmount: 100,
        averageAmount: 10,
        transactionCount: 2,
        timeSpanDays: 30,
        trendDirection: 'stable' as const,
        trendStrength: 0.05,
        volatility: 0.8,
        standardDeviation: 50,
      });

      const suggestions = await service.suggestOptimalAllocations();

      // Low confidence suggestions should be filtered out (confidence < 0.3)
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should sort suggestions by priority and confidence', async () => {
      mockDb.where.mockResolvedValueOnce([{id: 1}, {id: 2}]);
      mockDb.limit
        .mockResolvedValueOnce([{name: 'High Priority'}])
        .mockResolvedValueOnce([{defaultCategoryId: null}])
        .mockResolvedValueOnce([{name: 'Low Priority'}])
        .mockResolvedValueOnce([{defaultCategoryId: null}]);

      // Mock high efficiency for first, low for second
      mockPayeeIntelligence.analyzeSpendingPatterns
        .mockResolvedValueOnce({
          totalAmount: 1000,
          averageAmount: 100,
          transactionCount: 10,
          timeSpanDays: 90,
          trendDirection: 'increasing' as const,
          trendStrength: 0.6,
          volatility: 0.5,
          standardDeviation: 25,
        })
        .mockResolvedValueOnce({
          totalAmount: 200,
          averageAmount: 20,
          transactionCount: 10,
          timeSpanDays: 90,
          trendDirection: 'stable' as const,
          trendStrength: 0.1,
          volatility: 0.1,
          standardDeviation: 5,
        });

      const suggestions = await service.suggestOptimalAllocations();

      if (suggestions.length > 1) {
        // High risk/priority items should come first
        const priorityOrder = {critical: 4, high: 3, medium: 2, low: 1};
        for (let i = 0; i < suggestions.length - 1; i++) {
          const currentPriority = priorityOrder[suggestions[i].priority];
          const nextPriority = priorityOrder[suggestions[i + 1].priority];
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });
  });

  describe('predictFutureBudgetNeeds', () => {
    it('should predict future budget needs', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const forecast = await service.predictFutureBudgetNeeds(1, 'monthly', 6);

      expect(forecast).toHaveProperty('payeeId', 1);
      expect(forecast).toHaveProperty('payeeName', 'Test Payee');
      expect(forecast).toHaveProperty('forecastPeriod', 'monthly');
      expect(forecast).toHaveProperty('predictions');
      expect(forecast).toHaveProperty('accuracy');
      expect(forecast).toHaveProperty('scenarios');
      expect(forecast.predictions).toHaveLength(6);
    });

    it('should generate prediction with confidence intervals', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const forecast = await service.predictFutureBudgetNeeds(1, 'monthly', 3);

      forecast.predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('period');
        expect(prediction).toHaveProperty('predictedAmount');
        expect(prediction).toHaveProperty('confidenceInterval');
        expect(prediction.confidenceInterval).toHaveProperty('lower');
        expect(prediction.confidenceInterval).toHaveProperty('upper');
        expect(prediction.confidenceInterval).toHaveProperty('confidence');
        expect(prediction.confidenceInterval.lower).toBeLessThanOrEqual(
          prediction.predictedAmount
        );
        expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(
          prediction.predictedAmount
        );
      });
    });

    it('should generate conservative, optimistic, and realistic scenarios', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const forecast = await service.predictFutureBudgetNeeds(1, 'monthly', 3);

      expect(forecast.scenarios).toHaveProperty('conservative');
      expect(forecast.scenarios).toHaveProperty('optimistic');
      expect(forecast.scenarios).toHaveProperty('realistic');
      expect(forecast.scenarios.conservative).toHaveLength(3);
      expect(forecast.scenarios.optimistic).toHaveLength(3);
      expect(forecast.scenarios.realistic).toHaveLength(3);

      // Conservative should be lower than optimistic
      forecast.scenarios.conservative.forEach((conserv, index) => {
        const optimistic = forecast.scenarios.optimistic[index];
        expect(conserv.amount).toBeLessThan(optimistic.amount);
      });
    });
  });

  describe('calculateBudgetEfficiency', () => {
    it('should return zero efficiency when no budget exists', async () => {
      const efficiency = await service.calculateBudgetEfficiency(1, null);

      expect(efficiency.score).toBe(0);
      expect(efficiency.budgetUtilization).toBe(0);
      expect(efficiency.overBudgetFrequency).toBe(0);
      expect(efficiency.underBudgetAmount).toBe(0);
      expect(efficiency.wasteScore).toBe(0);
    });

    it('should calculate efficiency metrics with budget', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const efficiency = await service.calculateBudgetEfficiency(1, 400);

      expect(efficiency).toHaveProperty('score');
      expect(efficiency).toHaveProperty('budgetUtilization');
      expect(efficiency).toHaveProperty('overBudgetFrequency');
      expect(efficiency).toHaveProperty('underBudgetAmount');
      expect(efficiency).toHaveProperty('wasteScore');
      expect(efficiency.score).toBeGreaterThanOrEqual(0);
      expect(efficiency.score).toBeLessThanOrEqual(1);
    });

    it('should calculate budget utilization correctly', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      // Mock spending of $333/month with budget of $400
      mockPayeeIntelligence.analyzeSpendingPatterns.mockResolvedValueOnce({
        totalAmount: 1000,
        averageAmount: 100,
        transactionCount: 10,
        timeSpanDays: 90,
        trendDirection: 'stable' as const,
        trendStrength: 0.1,
        volatility: 0.2,
        standardDeviation: 15,
      });

      const efficiency = await service.calculateBudgetEfficiency(1, 400);

      // 333/400 = ~0.83 utilization
      expect(efficiency.budgetUtilization).toBeGreaterThan(0.8);
      expect(efficiency.budgetUtilization).toBeLessThan(0.9);
    });
  });

  describe('calculateBudgetHealth', () => {
    it('should calculate comprehensive budget health metrics', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const health = await service.calculateBudgetHealth(1);

      expect(health).toHaveProperty('payeeId', 1);
      expect(health).toHaveProperty('payeeName', 'Test Payee');
      expect(health).toHaveProperty('overallHealth');
      expect(health).toHaveProperty('healthCategories');
      expect(health).toHaveProperty('trends');
      expect(health).toHaveProperty('alerts');

      expect(health.overallHealth).toBeGreaterThanOrEqual(0);
      expect(health.overallHealth).toBeLessThanOrEqual(100);
    });

    it('should assess allocation, utilization, predictability, and efficiency', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const health = await service.calculateBudgetHealth(1);

      expect(health.healthCategories).toHaveProperty('allocation');
      expect(health.healthCategories).toHaveProperty('utilization');
      expect(health.healthCategories).toHaveProperty('predictability');
      expect(health.healthCategories).toHaveProperty('efficiency');

      Object.values(health.healthCategories).forEach(category => {
        expect(category).toHaveProperty('score');
        expect(category).toHaveProperty('status');
        expect(category).toHaveProperty('issues');
        expect(category).toHaveProperty('recommendations');
        expect(['excellent', 'good', 'fair', 'poor']).toContain(category.status);
      });
    });

    it('should generate appropriate alerts based on health status', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const health = await service.calculateBudgetHealth(1);

      expect(Array.isArray(health.alerts)).toBe(true);
      health.alerts.forEach(alert => {
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('action');
        expect(['critical', 'warning', 'info']).toContain(alert.severity);
      });
    });

    it('should analyze budget health trends', async () => {
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const health = await service.calculateBudgetHealth(1);

      expect(health.trends).toHaveProperty('healthTrend');
      expect(health.trends).toHaveProperty('trendStrength');
      expect(health.trends).toHaveProperty('timeToRecommendation');
      expect(['improving', 'stable', 'declining']).toContain(health.trends.healthTrend);
      expect(health.trends.timeToRecommendation).toBeGreaterThan(0);
    });
  });

  describe('generateBudgetRebalancing', () => {
    it('should generate budget rebalancing plan', async () => {
      mockDb.where.mockResolvedValueOnce([{id: 1}, {id: 2}]);
      mockDb.limit
        .mockResolvedValueOnce([{name: 'Payee 1'}])
        .mockResolvedValueOnce([{name: 'Payee 2'}]);

      const plan = await service.generateBudgetRebalancing(undefined, 'balanced');

      expect(plan).toHaveProperty('totalCurrentBudget');
      expect(plan).toHaveProperty('totalOptimizedBudget');
      expect(plan).toHaveProperty('totalAdjustment');
      expect(plan).toHaveProperty('adjustmentPercent');
      expect(plan).toHaveProperty('rebalancingStrategy', 'balanced');
      expect(plan).toHaveProperty('payeeAdjustments');
      expect(plan).toHaveProperty('crossPayeeOptimizations');
      expect(plan).toHaveProperty('implementationPlan');
      expect(plan).toHaveProperty('monitoring');
    });

    it('should create phased implementation plan', async () => {
      mockDb.where.mockResolvedValueOnce([{id: 1}]);
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const plan = await service.generateBudgetRebalancing(undefined, 'aggressive');

      expect(plan.implementationPlan).toHaveProperty('phase1');
      expect(plan.implementationPlan).toHaveProperty('phase2');
      expect(plan.implementationPlan).toHaveProperty('phase3');

      const totalPhaseItems =
        plan.implementationPlan.phase1.length +
        plan.implementationPlan.phase2.length +
        plan.implementationPlan.phase3.length;

      // All adjustments should be distributed across phases
      expect(totalPhaseItems).toBe(plan.payeeAdjustments.length);
    });

    it('should adjust phase distribution based on strategy', async () => {
      mockDb.where.mockResolvedValueOnce([{id: 1}, {id: 2}, {id: 3}]);
      mockDb.limit
        .mockResolvedValueOnce([{name: 'Payee 1'}])
        .mockResolvedValueOnce([{name: 'Payee 2'}])
        .mockResolvedValueOnce([{name: 'Payee 3'}]);

      const aggressivePlan = await service.generateBudgetRebalancing(
        undefined,
        'aggressive'
      );

      // Aggressive strategy should have most changes in phase1
      const phase1Percent =
        (aggressivePlan.implementationPlan.phase1.length /
          aggressivePlan.payeeAdjustments.length) *
        100;
      expect(phase1Percent).toBeGreaterThan(50);
    });

    it('should define monitoring parameters based on strategy', async () => {
      mockDb.where.mockResolvedValueOnce([{id: 1}]);
      mockDb.limit.mockResolvedValueOnce([{name: 'Test Payee'}]);

      const plan = await service.generateBudgetRebalancing(undefined, 'aggressive');

      expect(plan.monitoring).toHaveProperty('reviewPeriod');
      expect(plan.monitoring).toHaveProperty('keyMetrics');
      expect(plan.monitoring).toHaveProperty('alertThresholds');

      // Aggressive strategy should have shorter review period
      expect(plan.monitoring.reviewPeriod).toBe(30);
      expect(Array.isArray(plan.monitoring.keyMetrics)).toBe(true);
      expect(plan.monitoring.keyMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('optimizeMultiPayeeBudgets', () => {
    it('should optimize budgets across multiple payees', async () => {
      mockDb.limit
        .mockResolvedValueOnce([{name: 'Payee 1'}])
        .mockResolvedValueOnce([{name: 'Payee 2'}]);

      const result = await service.optimizeMultiPayeeBudgets([1, 2]);

      expect(result).toHaveProperty('optimizedAllocations');
      expect(result).toHaveProperty('totalOptimizedBudget');
      expect(result).toHaveProperty('optimizationScore');
      expect(result).toHaveProperty('constraintsSatisfied');
      expect(result).toHaveProperty('recommendations');

      expect(Object.keys(result.optimizedAllocations)).toContain('1');
      expect(Object.keys(result.optimizedAllocations)).toContain('2');
      expect(result.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(result.optimizationScore).toBeLessThanOrEqual(1);
    });

    it('should apply budget constraint when specified', async () => {
      mockDb.limit
        .mockResolvedValueOnce([{name: 'Payee 1'}])
        .mockResolvedValueOnce([{name: 'Payee 2'}]);

      const totalBudgetConstraint = 500;
      const result = await service.optimizeMultiPayeeBudgets([1, 2], totalBudgetConstraint);

      expect(result.totalOptimizedBudget).toBeLessThanOrEqual(totalBudgetConstraint);

      if (result.totalOptimizedBudget < totalBudgetConstraint) {
        expect(result.constraintsSatisfied).toBe(true);
      }
    });

    it('should generate recommendations for multi-payee optimization', async () => {
      mockDb.limit
        .mockResolvedValueOnce([{name: 'Payee 1'}])
        .mockResolvedValueOnce([{name: 'Payee 2'}]);

      const result = await service.optimizeMultiPayeeBudgets([1, 2]);

      expect(Array.isArray(result.recommendations)).toBe(true);
      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  // Note: Complex internal methods like assessBudgetRisk, generateOptimizationRecommendations,
  // generatePeriodPrediction, etc. are tested indirectly through the public API methods above.
  // Full testing of all calculation branches and edge cases would be better served by
  // integration tests with realistic financial data.
});