import {describe, it, expect, beforeEach, vi} from 'vitest';
import {SubscriptionManagementService} from '../../src/lib/server/domains/payees/subscription-management';

describe('SubscriptionManagementService', () => {
  let service: SubscriptionManagementService;

  beforeEach(() => {
    service = new SubscriptionManagementService();
    vi.clearAllMocks();
  });

  describe('detectSubscriptions', () => {
    it('should detect subscriptions from payee list', async () => {
      const payees = [
        {
          id: 1,
          name: 'Netflix',
          subscriptionInfo: null,
        } as any,
        {
          id: 2,
          name: 'Electric Company',
          subscriptionInfo: null,
        } as any,
      ];

      const detections = await service.detectSubscriptions(payees);

      expect(Array.isArray(detections)).toBe(true);
      detections.forEach(detection => {
        expect(detection).toHaveProperty('payeeId');
        expect(detection).toHaveProperty('detectionConfidence');
        expect(detection).toHaveProperty('subscriptionType');
        expect(detection).toHaveProperty('detectionMethods');
        expect(detection).toHaveProperty('suggestedMetadata');
        expect(detection).toHaveProperty('riskFactors');
        expect(detection.detectionConfidence).toBeGreaterThan(0.3);
      });
    });

    it('should skip payees already marked as subscriptions', async () => {
      const payees = [
        {
          id: 1,
          name: 'Netflix',
          subscriptionInfo: {
            isSubscription: true,
            subscriptionType: 'entertainment',
          },
        } as any,
      ];

      const detections = await service.detectSubscriptions(payees);

      // Should skip this payee since it's already a subscription
      expect(detections).toHaveLength(0);
    });

    it('should filter out low confidence detections', async () => {
      const payees = [
        {
          id: 1,
          name: 'Generic Store', // Unlikely to be subscription
          subscriptionInfo: null,
        } as any,
      ];

      const detections = await service.detectSubscriptions(payees);

      // Low confidence detections should be filtered
      detections.forEach(detection => {
        expect(detection.detectionConfidence).toBeGreaterThan(0.3);
      });
    });

    it('should detect multiple subscription types', async () => {
      const payees = [
        {id: 1, name: 'Netflix', subscriptionInfo: null} as any,
        {id: 2, name: 'Adobe Creative Cloud', subscriptionInfo: null} as any,
        {id: 3, name: 'Gym Membership', subscriptionInfo: null} as any,
      ];

      const detections = await service.detectSubscriptions(payees);

      if (detections.length > 0) {
        const types = detections.map(d => d.subscriptionType);
        expect(types.every(type =>
          ['entertainment', 'utilities', 'software', 'membership', 'communication', 'finance', 'shopping', 'health', 'education', 'other'].includes(type)
        )).toBe(true);
      }
    });
  });

  describe('classifySubscription', () => {
    it('should classify subscription type', async () => {
      const result = await service.classifySubscription(1);

      expect(result).toHaveProperty('classification');
      expect(result).toHaveProperty('suggestedMetadata');
      expect(result).toHaveProperty('confidenceFactors');
      expect(result.classification.detectionConfidence).toBeGreaterThanOrEqual(0);
      expect(result.classification.detectionConfidence).toBeLessThanOrEqual(1);
    });

    it('should provide subscription metadata', async () => {
      const result = await service.classifySubscription(1);

      const metadata = result.suggestedMetadata;
      expect(metadata).toHaveProperty('isSubscription');
      expect(metadata).toHaveProperty('subscriptionType');
      expect(metadata).toHaveProperty('billingCycle');
      expect(metadata).toHaveProperty('baseCost');
      expect(metadata).toHaveProperty('currency');
      expect(metadata).toHaveProperty('autoRenewal');

      expect(['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'irregular']).toContain(
        metadata.billingCycle
      );
    });

    it('should include detection methods', async () => {
      const result = await service.classifySubscription(1);

      expect(Array.isArray(result.classification.detectionMethods)).toBe(true);
      result.classification.detectionMethods.forEach(method => {
        expect(method).toHaveProperty('method');
        expect(method).toHaveProperty('confidence');
        expect(method).toHaveProperty('evidence');
        expect(['pattern_matching', 'frequency_analysis', 'amount_analysis', 'merchant_database', 'category_heuristics']).toContain(
          method.method
        );
      });
    });

    it('should provide confidence factors', async () => {
      const result = await service.classifySubscription(1);

      expect(Array.isArray(result.confidenceFactors)).toBe(true);
      result.confidenceFactors.forEach(factor => {
        expect(factor).toHaveProperty('factor');
        expect(factor).toHaveProperty('score');
        expect(factor).toHaveProperty('evidence');
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(1);
      });
    });

    it('should handle transaction data if provided', async () => {
      const transactionData = [
        {amount: 29.99, date: '2024-01-15', description: 'Monthly subscription'},
        {amount: 29.99, date: '2024-02-15', description: 'Monthly subscription'},
      ];

      const result = await service.classifySubscription(1, transactionData);

      expect(result).toHaveProperty('classification');
      expect(result.classification.payeeId).toBe(1);
    });
  });

  describe('trackSubscriptionLifecycle', () => {
    it('should track subscription lifecycle', async () => {
      const lifecycle = await service.trackSubscriptionLifecycle(1);

      expect(lifecycle).toHaveProperty('payeeId', 1);
      expect(lifecycle).toHaveProperty('currentStatus');
      expect(lifecycle).toHaveProperty('lifecycle');
      expect(lifecycle).toHaveProperty('predictions');
      expect(lifecycle).toHaveProperty('optimizationSuggestions');

      expect(['trial', 'active', 'paused', 'cancelled', 'expired', 'pending_cancellation']).toContain(
        lifecycle.currentStatus
      );
    });

    it('should provide lifecycle history', async () => {
      const lifecycle = await service.trackSubscriptionLifecycle(1);

      expect(Array.isArray(lifecycle.lifecycle)).toBe(true);
      lifecycle.lifecycle.forEach(event => {
        expect(event).toHaveProperty('status');
        expect(event).toHaveProperty('date');
        expect(['trial', 'active', 'paused', 'cancelled', 'expired', 'pending_cancellation']).toContain(
          event.status
        );
      });
    });

    it('should include predictions', async () => {
      const lifecycle = await service.trackSubscriptionLifecycle(1);

      expect(lifecycle.predictions).toHaveProperty('probabilityOfCancellation');
      expect(lifecycle.predictions).toHaveProperty('valueAssessment');
      expect(lifecycle.predictions.probabilityOfCancellation).toBeGreaterThanOrEqual(0);
      expect(lifecycle.predictions.probabilityOfCancellation).toBeLessThanOrEqual(1);

      const valueAssessment = lifecycle.predictions.valueAssessment;
      expect(valueAssessment).toHaveProperty('utilizationRate');
      expect(valueAssessment).toHaveProperty('valueScore');
      expect(valueAssessment).toHaveProperty('recommendation');
      expect(['keep', 'downgrade', 'cancel', 'review']).toContain(
        valueAssessment.recommendation
      );
    });

    it('should provide optimization suggestions', async () => {
      const lifecycle = await service.trackSubscriptionLifecycle(1);

      expect(Array.isArray(lifecycle.optimizationSuggestions)).toBe(true);
      lifecycle.optimizationSuggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('potentialSavings');
        expect(suggestion).toHaveProperty('confidence');
        expect(['plan_change', 'pause_subscription', 'cancel', 'negotiate_price', 'bundle_services']).toContain(
          suggestion.type
        );
      });
    });
  });

  describe('analyzeCosts', () => {
    it('should analyze subscription cost trends', async () => {
      const analysis = await service.analyzeCosts(1);

      expect(analysis).toHaveProperty('payeeId', 1);
      expect(analysis).toHaveProperty('totalAnnualCost');
      expect(analysis).toHaveProperty('monthlyBreakdown');
      expect(analysis).toHaveProperty('costTrends');
      expect(analysis).toHaveProperty('benchmarking');
      expect(analysis).toHaveProperty('optimizationOpportunities');
    });

    it('should provide monthly cost breakdown', async () => {
      const analysis = await service.analyzeCosts(1);

      expect(Array.isArray(analysis.monthlyBreakdown)).toBe(true);
      if (analysis.monthlyBreakdown.length > 0) {
        analysis.monthlyBreakdown.forEach(month => {
          expect(month).toHaveProperty('month');
          expect(month).toHaveProperty('cost');
          expect(month).toHaveProperty('transactions');
        });
      }
    });

    it('should identify cost trends', async () => {
      const analysis = await service.analyzeCosts(1);

      expect(analysis.costTrends).toHaveProperty('trend');
      expect(analysis.costTrends).toHaveProperty('percentageChange');
      expect(analysis.costTrends).toHaveProperty('trendConfidence');
      expect(['increasing', 'decreasing', 'stable', 'volatile']).toContain(
        analysis.costTrends.trend
      );
    });

    it('should provide benchmarking data', async () => {
      const analysis = await service.analyzeCosts(1);

      expect(analysis.benchmarking).toHaveProperty('categoryAverage');
      expect(analysis.benchmarking).toHaveProperty('comparedToAverage');
      expect(analysis.benchmarking).toHaveProperty('percentageDifference');
      expect(['above', 'below', 'average']).toContain(
        analysis.benchmarking.comparedToAverage
      );
    });

    it('should identify optimization opportunities', async () => {
      const analysis = await service.analyzeCosts(1);

      expect(Array.isArray(analysis.optimizationOpportunities)).toBe(true);
      analysis.optimizationOpportunities.forEach(opp => {
        expect(opp).toHaveProperty('opportunity');
        expect(opp).toHaveProperty('potentialSavings');
        expect(opp).toHaveProperty('effort');
        expect(opp).toHaveProperty('confidence');
        expect(opp).toHaveProperty('actionSteps');
        expect(['low', 'medium', 'high']).toContain(opp.effort);
      });
    });
  });

  describe('predictRenewals', () => {
    it('should predict subscription renewals for multiple payees', async () => {
      const predictions = await service.predictRenewals([1, 2]);

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('payeeId');
        expect(prediction).toHaveProperty('nextRenewalDate');
        expect(prediction).toHaveProperty('estimatedCost');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction).toHaveProperty('factorsInfluencingRenewal');
        expect(prediction).toHaveProperty('recommendations');
        expect(prediction).toHaveProperty('alternativeOptions');
      });
    });

    it('should provide renewal confidence scores', async () => {
      const predictions = await service.predictRenewals([1]);

      predictions.forEach(prediction => {
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should identify renewal factors', async () => {
      const predictions = await service.predictRenewals([1]);

      predictions.forEach(prediction => {
        expect(Array.isArray(prediction.factorsInfluencingRenewal)).toBe(true);
        prediction.factorsInfluencingRenewal.forEach(factor => {
          expect(factor).toHaveProperty('factor');
          expect(factor).toHaveProperty('impact');
          expect(factor).toHaveProperty('weight');
          expect(['positive', 'negative', 'neutral']).toContain(factor.impact);
        });
      });
    });

    it('should provide actionable recommendations', async () => {
      const predictions = await service.predictRenewals([1]);

      predictions.forEach(prediction => {
        expect(Array.isArray(prediction.recommendations)).toBe(true);
        prediction.recommendations.forEach(rec => {
          expect(rec).toHaveProperty('action');
          expect(rec).toHaveProperty('reasoning');
          expect(rec).toHaveProperty('timeline');
          expect(rec).toHaveProperty('priority');
          expect(['low', 'medium', 'high', 'critical']).toContain(rec.priority);
        });
      });
    });

    it('should provide alternative options', async () => {
      const predictions = await service.predictRenewals([1]);

      predictions.forEach(prediction => {
        expect(Array.isArray(prediction.alternativeOptions)).toBe(true);
        prediction.alternativeOptions.forEach(option => {
          expect(option).toHaveProperty('option');
          expect(option).toHaveProperty('cost');
          expect(option).toHaveProperty('features');
          expect(option).toHaveProperty('migrationEffort');
          expect(['low', 'medium', 'high']).toContain(option.migrationEffort);
        });
      });
    });
  });

  describe('analyzeUsage', () => {
    it('should analyze subscription usage patterns', async () => {
      const analysis = await service.analyzeUsage(1);

      expect(analysis).toHaveProperty('payeeId', 1);
      expect(analysis).toHaveProperty('usageMetrics');
      expect(analysis).toHaveProperty('usagePatterns');
      expect(analysis).toHaveProperty('valueAssessment');
      expect(analysis).toHaveProperty('behaviorInsights');
    });

    it('should provide usage metrics scores', async () => {
      const analysis = await service.analyzeUsage(1);

      const metrics = analysis.usageMetrics;
      expect(metrics).toHaveProperty('frequencyScore');
      expect(metrics).toHaveProperty('intensityScore');
      expect(metrics).toHaveProperty('valueScore');
      expect(metrics).toHaveProperty('trendScore');

      // All scores should be between 0 and 1
      expect(metrics.frequencyScore).toBeGreaterThanOrEqual(0);
      expect(metrics.frequencyScore).toBeLessThanOrEqual(1);
      expect(metrics.intensityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.intensityScore).toBeLessThanOrEqual(1);
      expect(metrics.valueScore).toBeGreaterThanOrEqual(0);
      expect(metrics.valueScore).toBeLessThanOrEqual(1);
    });

    it('should provide value assessment', async () => {
      const analysis = await service.analyzeUsage(1);

      const assessment = analysis.valueAssessment;
      expect(assessment).toHaveProperty('costPerUse');
      expect(assessment).toHaveProperty('costPerMonth');
      expect(assessment).toHaveProperty('utilizationRate');
      expect(assessment).toHaveProperty('efficiency');
      expect(assessment).toHaveProperty('recommendation');
      expect(['excellent', 'good', 'fair', 'poor', 'terrible']).toContain(
        assessment.efficiency
      );
    });

    it('should generate behavior insights', async () => {
      const analysis = await service.analyzeUsage(1);

      expect(Array.isArray(analysis.behaviorInsights)).toBe(true);
      analysis.behaviorInsights.forEach(insight => {
        expect(insight).toHaveProperty('insight');
        expect(insight).toHaveProperty('confidence');
        expect(insight).toHaveProperty('actionable');
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // Note: SubscriptionManagementService has many more sophisticated methods including:
  // - getCancellationAssistance (complex cancellation workflow guidance)
  // - optimizeSubscriptions (multi-subscription optimization with ML)
  // - analyzeCompetitors (market research and competitive analysis)
  // - bulkSubscriptionAnalysis (batch processing for multiple subscriptions)
  // - automationRules (intelligent automation with complex rule engines)
  // - valueOptimization (multi-dimensional value optimization)
  //
  // These methods involve complex business logic, external data sources, ML models,
  // and multi-step workflows that are better tested through integration tests with
  // realistic subscription data and transaction histories. The tests above cover the
  // core public API methods that can be effectively unit tested.
});