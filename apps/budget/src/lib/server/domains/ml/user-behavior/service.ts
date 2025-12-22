/**
 * User Behavior Modeling Service
 *
 * Main service for user behavior analysis, acceptance prediction,
 * confidence calibration, and engagement optimization.
 */

import type { MLModelStore } from "../model-store";
import type {
  AcceptancePrediction,
  EngagementOptimization,
  RecommendationOutcome,
  UserBehaviorProfile,
} from "../types";
import {
  createAcceptancePredictor,
  type AcceptancePredictor,
  type PredictionContext,
  type RecommendationFeatures,
} from "./acceptance-predictor";
import {
  createBehaviorTracker,
  type BehaviorTracker,
  type InteractionStats,
  type TrackedInteraction,
} from "./behavior-tracker";
import {
  createConfidenceCalibrator,
  type CalibrationReport,
  type ConfidenceCalibrator
} from "./confidence-calibration";

// =============================================================================
// Types
// =============================================================================

export interface UserBehaviorServiceConfig {
  minInteractionsForPrediction: number;
  defaultConfidenceThreshold: number;
  engagementBatchSize: number;
  retrainIntervalHours: number;
}

export interface RecommendationInput {
  recommendationId: string;
  confidence: number;
  entityType: string;
  entityId?: number;
  categoryId?: number;
  amount?: number;
  isRecurring?: boolean;
  similarityScore?: number;
  explanation?: string;
}

export interface OptimizedRecommendation {
  recommendation: RecommendationInput;
  prediction: AcceptancePrediction;
  calibratedConfidence: number;
  shouldShow: boolean;
  showOrder: number;
  timing: "immediate" | "delayed" | "batch";
}

const DEFAULT_CONFIG: UserBehaviorServiceConfig = {
  minInteractionsForPrediction: 10,
  defaultConfidenceThreshold: 0.7,
  engagementBatchSize: 5,
  retrainIntervalHours: 24,
};

// =============================================================================
// User Behavior Service
// =============================================================================

export interface UserBehaviorService {
  /**
   * Track a user interaction
   */
  trackInteraction(
    workspaceId: number,
    interactionType: TrackedInteraction["interactionType"],
    entityType: string,
    metadata?: Record<string, unknown>
  ): void;

  /**
   * Record recommendation outcome
   */
  recordOutcome(workspaceId: number, outcome: RecommendationOutcome): void;

  /**
   * Predict acceptance for a single recommendation
   */
  predictAcceptance(
    workspaceId: number,
    recommendation: RecommendationInput
  ): Promise<AcceptancePrediction>;

  /**
   * Predict acceptance for multiple recommendations
   */
  batchPredictAcceptance(
    workspaceId: number,
    recommendations: RecommendationInput[]
  ): Promise<AcceptancePrediction[]>;

  /**
   * Optimize recommendation presentation order and timing
   */
  optimizeEngagement(
    workspaceId: number,
    recommendations: RecommendationInput[]
  ): Promise<EngagementOptimization>;

  /**
   * Get optimized recommendations with predictions
   */
  getOptimizedRecommendations(
    workspaceId: number,
    recommendations: RecommendationInput[]
  ): Promise<OptimizedRecommendation[]>;

  /**
   * Get user behavior profile
   */
  getProfile(workspaceId: number): Promise<UserBehaviorProfile>;

  /**
   * Get interaction statistics
   */
  getInteractionStats(
    workspaceId: number,
    options?: { entityType?: string; daysBack?: number }
  ): InteractionStats;

  /**
   * Get calibration report
   */
  getCalibrationReport(workspaceId: number): CalibrationReport;

  /**
   * Calibrate a confidence score
   */
  calibrateConfidence(
    workspaceId: number,
    confidence: number,
    entityType?: string
  ): number;

  /**
   * Get personalized confidence threshold
   */
  getPersonalizedThreshold(
    workspaceId: number,
    targetAcceptanceRate?: number
  ): Promise<number>;

  /**
   * Retrain models for a workspace
   */
  retrainModels(workspaceId: number): Promise<void>;

  /**
   * Get service health metrics
   */
  getHealthMetrics(workspaceId: number): Promise<{
    interactionCount: number;
    calibrationScore: number;
    predictionAccuracy: number;
    lastRetrainedAt: string | null;
  }>;
}

/**
 * Create the user behavior service
 */
export function createUserBehaviorService(
  modelStore: MLModelStore,
  config: Partial<UserBehaviorServiceConfig> = {}
): UserBehaviorService {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Per-workspace state
  const trackers = new Map<number, BehaviorTracker>();
  const calibrators = new Map<number, ConfidenceCalibrator>();
  const predictors = new Map<number, AcceptancePredictor>();
  const lastRetrainedAt = new Map<number, string>();

  // Get or create tracker for workspace
  function getTracker(workspaceId: number): BehaviorTracker {
    if (!trackers.has(workspaceId)) {
      trackers.set(workspaceId, createBehaviorTracker());
    }
    return trackers.get(workspaceId)!;
  }

  // Get or create calibrator for workspace
  function getCalibrator(workspaceId: number): ConfidenceCalibrator {
    if (!calibrators.has(workspaceId)) {
      calibrators.set(workspaceId, createConfidenceCalibrator());
    }
    return calibrators.get(workspaceId)!;
  }

  // Get or create predictor for workspace
  function getPredictor(workspaceId: number): AcceptancePredictor {
    if (!predictors.has(workspaceId)) {
      predictors.set(workspaceId, createAcceptancePredictor());
    }
    return predictors.get(workspaceId)!;
  }

  // Build prediction context from workspace data
  async function buildPredictionContext(workspaceId: number): Promise<PredictionContext> {
    const tracker = getTracker(workspaceId);
    const profile = tracker.buildBehaviorProfile(workspaceId);
    const recentStats = tracker.getInteractionStats(workspaceId, { daysBack: 7 });

    return {
      profile,
      recentAcceptanceRate: recentStats.acceptanceRate,
      sessionRecommendationCount: 0, // Will be updated per-call
    };
  }

  return {
    trackInteraction(
      workspaceId: number,
      interactionType: TrackedInteraction["interactionType"],
      entityType: string,
      metadata: Record<string, unknown> = {}
    ): void {
      const tracker = getTracker(workspaceId);
      tracker.trackInteraction({
        workspaceId,
        interactionType,
        entityType,
        metadata,
      });

      // Add to calibration data if it's a recommendation outcome
      if (
        interactionType === "recommendation_accepted" ||
        interactionType === "recommendation_rejected"
      ) {
        const calibrator = getCalibrator(workspaceId);
        const confidence = metadata.confidence as number | undefined;

        if (confidence !== undefined) {
          calibrator.addDataPoint({
            predictedConfidence: confidence,
            actualOutcome: interactionType === "recommendation_accepted",
            timestamp: new Date().toISOString(),
            entityType,
          });
        }
      }
    },

    recordOutcome(workspaceId: number, outcome: RecommendationOutcome): void {
      const tracker = getTracker(workspaceId);
      tracker.recordRecommendationOutcome(workspaceId, outcome);
    },

    async predictAcceptance(
      workspaceId: number,
      recommendation: RecommendationInput
    ): Promise<AcceptancePrediction> {
      const predictor = getPredictor(workspaceId);
      const calibrator = getCalibrator(workspaceId);
      const context = await buildPredictionContext(workspaceId);

      // Calibrate input confidence
      const calibratedConfidence = calibrator.calibrate(
        recommendation.confidence,
        recommendation.entityType
      );

      const features: RecommendationFeatures = {
        recommendationId: recommendation.recommendationId,
        confidence: calibratedConfidence,
        entityType: recommendation.entityType,
        entityId: recommendation.entityId,
        categoryId: recommendation.categoryId,
        amount: recommendation.amount,
        isRecurring: recommendation.isRecurring,
        dayOfWeek: new Date().getDay(),
        hourOfDay: new Date().getHours(),
        similarityScore: recommendation.similarityScore,
        hasExplanation: !!recommendation.explanation,
      };

      return predictor.predict(features, context);
    },

    async batchPredictAcceptance(
      workspaceId: number,
      recommendations: RecommendationInput[]
    ): Promise<AcceptancePrediction[]> {
      const predictor = getPredictor(workspaceId);
      const calibrator = getCalibrator(workspaceId);
      const context = await buildPredictionContext(workspaceId);

      const featuresList: RecommendationFeatures[] = recommendations.map((rec) => ({
        recommendationId: rec.recommendationId,
        confidence: calibrator.calibrate(rec.confidence, rec.entityType),
        entityType: rec.entityType,
        entityId: rec.entityId,
        categoryId: rec.categoryId,
        amount: rec.amount,
        isRecurring: rec.isRecurring,
        dayOfWeek: new Date().getDay(),
        hourOfDay: new Date().getHours(),
        similarityScore: rec.similarityScore,
        hasExplanation: !!rec.explanation,
      }));

      return predictor.batchPredict(featuresList, context);
    },

    async optimizeEngagement(
      workspaceId: number,
      recommendations: RecommendationInput[]
    ): Promise<EngagementOptimization> {
      const predictions = await this.batchPredictAcceptance(workspaceId, recommendations);
      const tracker = getTracker(workspaceId);
      const profile = tracker.buildBehaviorProfile(workspaceId);

      // Sort by predicted acceptance (high to low) with some diversification
      const indexed = predictions.map((p, i) => ({ prediction: p, originalIndex: i }));

      // Score-based sorting with category diversification
      indexed.sort((a, b) => {
        const scoreA = a.prediction.predictedAcceptance;
        const scoreB = b.prediction.predictedAcceptance;
        return scoreB - scoreA;
      });

      // Determine explanation level based on profile
      let explanationLevel: "minimal" | "standard" | "detailed" = "standard";
      if (profile.engagement.correctionRate > 0.2) {
        explanationLevel = "detailed";
      } else if (profile.engagement.acceptanceRate > 0.8) {
        explanationLevel = "minimal";
      }

      // Determine batching strategy
      let batchingStrategy: "none" | "daily" | "weekly" = "none";
      if (profile.preferences.automationLevel === "automatic") {
        batchingStrategy = "daily";
      } else if (profile.engagement.sessionFrequency < 1) {
        batchingStrategy = "weekly";
      }

      // Build optimized list
      const optimizedRecommendations = indexed.map((item, optimizedOrder) => {
        let timing: "immediate" | "delayed" | "batch" = "immediate";

        // Delay low-confidence recommendations
        if (item.prediction.predictedAcceptance < 0.5) {
          timing = "batch";
        } else if (item.prediction.recommendedAction === "show_with_explanation") {
          timing = "delayed";
        }

        return {
          id: item.prediction.recommendationId,
          originalOrder: item.originalIndex,
          optimizedOrder,
          showReason: getShowReason(item.prediction),
          timing,
        };
      });

      return {
        recommendations: optimizedRecommendations,
        explanationLevel,
        batchingStrategy,
      };
    },

    async getOptimizedRecommendations(
      workspaceId: number,
      recommendations: RecommendationInput[]
    ): Promise<OptimizedRecommendation[]> {
      const predictions = await this.batchPredictAcceptance(workspaceId, recommendations);
      const calibrator = getCalibrator(workspaceId);
      const tracker = getTracker(workspaceId);
      const profile = tracker.buildBehaviorProfile(workspaceId);

      // Combine and sort
      const combined = recommendations.map((rec, i) => ({
        recommendation: rec,
        prediction: predictions[i],
        calibratedConfidence: calibrator.calibrate(rec.confidence, rec.entityType),
      }));

      // Sort by predicted acceptance
      combined.sort((a, b) => b.prediction.predictedAcceptance - a.prediction.predictedAcceptance);

      // Add metadata
      return combined.map((item, index) => {
        const shouldShow = item.prediction.recommendedAction !== "skip";
        let timing: "immediate" | "delayed" | "batch" = "immediate";

        if (item.prediction.recommendedAction === "show_with_explanation") {
          timing = "delayed";
        } else if (!shouldShow || index >= cfg.engagementBatchSize) {
          timing = "batch";
        }

        return {
          ...item,
          shouldShow,
          showOrder: index,
          timing,
        };
      });
    },

    async getProfile(workspaceId: number): Promise<UserBehaviorProfile> {
      const tracker = getTracker(workspaceId);
      return tracker.buildBehaviorProfile(workspaceId);
    },

    getInteractionStats(
      workspaceId: number,
      options?: { entityType?: string; daysBack?: number }
    ): InteractionStats {
      const tracker = getTracker(workspaceId);
      return tracker.getInteractionStats(workspaceId, options);
    },

    getCalibrationReport(workspaceId: number): CalibrationReport {
      const calibrator = getCalibrator(workspaceId);
      return calibrator.getReport();
    },

    calibrateConfidence(
      workspaceId: number,
      confidence: number,
      entityType?: string
    ): number {
      const calibrator = getCalibrator(workspaceId);
      return calibrator.calibrate(confidence, entityType);
    },

    async getPersonalizedThreshold(
      workspaceId: number,
      targetAcceptanceRate: number = 0.8
    ): Promise<number> {
      const calibrator = getCalibrator(workspaceId);
      const threshold = calibrator.getPersonalizedThreshold(targetAcceptanceRate);

      // Clamp to reasonable range
      return Math.max(0.5, Math.min(0.95, threshold));
    },

    async retrainModels(workspaceId: number): Promise<void> {
      const calibrator = getCalibrator(workspaceId);
      calibrator.retrain();
      lastRetrainedAt.set(workspaceId, new Date().toISOString());

      // Persist model state
      const calibratorState = calibrator.export();
      await modelStore.saveModel(workspaceId, {
        modelType: "behavior",
        modelName: "confidence_calibrator",
        parameters: calibratorState as unknown as Record<string, unknown>,
      });
    },

    async getHealthMetrics(workspaceId: number): Promise<{
      interactionCount: number;
      calibrationScore: number;
      predictionAccuracy: number;
      lastRetrainedAt: string | null;
    }> {
      const tracker = getTracker(workspaceId);
      const calibrator = getCalibrator(workspaceId);

      const stats = tracker.getInteractionStats(workspaceId, { daysBack: 30 });
      const calibrationReport = calibrator.getReport();

      // Estimate prediction accuracy from calibration
      const predictionAccuracy = 1 - calibrationReport.expectedCalibrationError;

      return {
        interactionCount: stats.total,
        calibrationScore: calibrationReport.overallScore,
        predictionAccuracy,
        lastRetrainedAt: lastRetrainedAt.get(workspaceId) ?? null,
      };
    },
  };

  // Helper method for show reason
  function getShowReason(prediction: AcceptancePrediction): string {
    if (prediction.predictedAcceptance >= 0.8) {
      return "High likelihood of acceptance based on your history";
    }
    if (prediction.predictedAcceptance >= 0.6) {
      return "Moderate confidence - similar to previously accepted recommendations";
    }
    if (prediction.factors.length > 0) {
      const topFactor = prediction.factors[0];
      return topFactor.description;
    }
    return "Recommendation based on pattern matching";
  }
}
