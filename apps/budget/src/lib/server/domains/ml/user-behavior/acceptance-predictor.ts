/**
 * Acceptance Prediction Model
 *
 * Predicts whether a user will accept a recommendation based on
 * historical behavior, recommendation features, and context.
 * Uses a combination of logistic regression and Naive Bayes.
 */

import type { AcceptancePrediction, UserBehaviorProfile } from "../types";
import { formatPercent } from "$lib/server/utils/formatters";

// =============================================================================
// Types
// =============================================================================

export interface RecommendationFeatures {
  recommendationId: string;
  confidence: number;
  entityType: string;
  entityId?: number;
  categoryId?: number;
  amount?: number;
  isRecurring?: boolean;
  dayOfWeek?: number;
  hourOfDay?: number;
  similarityScore?: number;
  hasExplanation?: boolean;
}

export interface PredictionContext {
  profile: UserBehaviorProfile;
  recentAcceptanceRate?: number;
  sessionRecommendationCount?: number;
  timeSinceLastInteraction?: number;
}

export interface PredictorWeights {
  confidenceWeight: number;
  categoryWeight: number;
  recencyWeight: number;
  similarityWeight: number;
  explanationBonus: number;
  fatigueDecay: number;
}

const DEFAULT_WEIGHTS: PredictorWeights = {
  confidenceWeight: 0.4,
  categoryWeight: 0.2,
  recencyWeight: 0.15,
  similarityWeight: 0.15,
  explanationBonus: 0.1,
  fatigueDecay: 0.02,
};

// =============================================================================
// Feature Extractors
// =============================================================================

/**
 * Extract features from recommendation for prediction
 */
export function extractFeatures(
  features: RecommendationFeatures,
  context: PredictionContext
): Map<string, number> {
  const featureMap = new Map<string, number>();

  // Base confidence
  featureMap.set("confidence", features.confidence);
  featureMap.set("confidence_squared", features.confidence * features.confidence);

  // Category-specific acceptance rate
  if (features.categoryId !== undefined) {
    const categoryRate = context.profile.preferences.categorySensitivity[features.categoryId];
    featureMap.set("category_acceptance_rate", categoryRate ?? context.profile.engagement.acceptanceRate);
  } else {
    featureMap.set("category_acceptance_rate", context.profile.engagement.acceptanceRate);
  }

  // Historical acceptance rate
  featureMap.set("historical_acceptance_rate", context.profile.engagement.acceptanceRate);

  // Recent acceptance rate (if available)
  if (context.recentAcceptanceRate !== undefined) {
    featureMap.set("recent_acceptance_rate", context.recentAcceptanceRate);
  }

  // Session fatigue (more recommendations in session = lower acceptance)
  if (context.sessionRecommendationCount !== undefined) {
    const fatigue = Math.exp(-DEFAULT_WEIGHTS.fatigueDecay * context.sessionRecommendationCount);
    featureMap.set("session_fatigue", fatigue);
  } else {
    featureMap.set("session_fatigue", 1);
  }

  // Time-based features
  if (features.dayOfWeek !== undefined) {
    featureMap.set("is_weekend", features.dayOfWeek === 0 || features.dayOfWeek === 6 ? 1 : 0);
  }

  // Similarity score
  if (features.similarityScore !== undefined) {
    featureMap.set("similarity_score", features.similarityScore);
  }

  // Explanation bonus
  featureMap.set("has_explanation", features.hasExplanation ? 1 : 0);

  // Calibration quality
  featureMap.set("calibration", context.profile.learningProgress.confidenceCalibration);

  // Amount features (if available)
  if (features.amount !== undefined) {
    featureMap.set("amount_log", Math.log(Math.abs(features.amount) + 1));
    featureMap.set("is_income", features.amount > 0 ? 1 : 0);
  }

  // Recurring transaction bonus
  featureMap.set("is_recurring", features.isRecurring ? 1 : 0);

  return featureMap;
}

// =============================================================================
// Prediction Models
// =============================================================================

/**
 * Logistic regression predictor
 */
export function logisticPredict(features: Map<string, number>, weights: PredictorWeights): number {
  // Simple logistic regression with hand-tuned weights
  let logit = 0;

  // Confidence is the primary driver
  const confidence = features.get("confidence") ?? 0.5;
  logit += weights.confidenceWeight * (confidence - 0.5) * 4; // Scale to [-2, 2]

  // Category acceptance rate
  const categoryRate = features.get("category_acceptance_rate") ?? 0.5;
  logit += weights.categoryWeight * (categoryRate - 0.5) * 2;

  // Session fatigue
  const fatigue = features.get("session_fatigue") ?? 1;
  logit += weights.recencyWeight * (fatigue - 0.5) * 2;

  // Similarity bonus
  const similarity = features.get("similarity_score") ?? 0.5;
  logit += weights.similarityWeight * (similarity - 0.5) * 2;

  // Explanation bonus
  const hasExplanation = features.get("has_explanation") ?? 0;
  logit += weights.explanationBonus * hasExplanation * 2;

  // Historical acceptance rate as prior
  const historicalRate = features.get("historical_acceptance_rate") ?? 0.5;
  logit += 0.5 * (historicalRate - 0.5) * 2;

  // Sigmoid function
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Naive Bayes predictor (simplified)
 */
export function naiveBayesPredict(
  features: Map<string, number>,
  profile: UserBehaviorProfile
): number {
  // Prior probability based on historical acceptance
  let logProbAccept = Math.log(Math.max(0.01, profile.engagement.acceptanceRate));
  let logProbReject = Math.log(Math.max(0.01, 1 - profile.engagement.acceptanceRate));

  // Confidence likelihood
  const confidence = features.get("confidence") ?? 0.5;
  // P(confidence | accept) - beta distribution approximation
  logProbAccept += Math.log(betaPDF(confidence, 3, 1.5)); // Higher confidence more likely if accept
  logProbReject += Math.log(betaPDF(confidence, 1.5, 3)); // Lower confidence more likely if reject

  // Category likelihood
  const categoryRate = features.get("category_acceptance_rate") ?? 0.5;
  logProbAccept += Math.log(Math.max(0.01, categoryRate));
  logProbReject += Math.log(Math.max(0.01, 1 - categoryRate));

  // Convert log probabilities to probability
  const maxLog = Math.max(logProbAccept, logProbReject);
  const probAccept = Math.exp(logProbAccept - maxLog);
  const probReject = Math.exp(logProbReject - maxLog);

  return probAccept / (probAccept + probReject);
}

/**
 * Beta distribution PDF (simplified)
 */
function betaPDF(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0.001;
  // Simplified beta PDF (not normalized, but relative values are correct)
  return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
}

// =============================================================================
// Ensemble Predictor
// =============================================================================

export interface AcceptancePredictor {
  /**
   * Predict acceptance probability for a recommendation
   */
  predict(
    features: RecommendationFeatures,
    context: PredictionContext
  ): AcceptancePrediction;

  /**
   * Batch predict for multiple recommendations
   */
  batchPredict(
    recommendations: RecommendationFeatures[],
    context: PredictionContext
  ): AcceptancePrediction[];

  /**
   * Determine optimal action based on prediction
   */
  getRecommendedAction(
    prediction: number,
    profile: UserBehaviorProfile
  ): AcceptancePrediction["recommendedAction"];

  /**
   * Get feature importance for explainability
   */
  getFeatureImportance(
    features: RecommendationFeatures,
    context: PredictionContext
  ): Array<{ factor: string; contribution: number; description: string }>;
}

/**
 * Create an acceptance predictor
 */
export function createAcceptancePredictor(
  weights: Partial<PredictorWeights> = {}
): AcceptancePredictor {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  return {
    predict(
      features: RecommendationFeatures,
      context: PredictionContext
    ): AcceptancePrediction {
      const extractedFeatures = extractFeatures(features, context);

      // Ensemble prediction (weighted average of models)
      const logisticPred = logisticPredict(extractedFeatures, w);
      const bayesPred = naiveBayesPredict(extractedFeatures, context.profile);

      // Weighted ensemble (favor logistic for calibration)
      const calibration = context.profile.learningProgress.confidenceCalibration;
      const ensemblePred = logisticPred * (0.6 + 0.2 * calibration) + bayesPred * (0.4 - 0.2 * calibration);

      // Clamp to valid range
      const predictedAcceptance = Math.max(0.01, Math.min(0.99, ensemblePred));

      // Calculate confidence based on model agreement and data quality
      const modelAgreement = 1 - Math.abs(logisticPred - bayesPred);
      const dataQuality = Math.min(1, context.profile.learningProgress.totalRecommendations / 100);
      const confidence = 0.3 + 0.4 * modelAgreement + 0.3 * dataQuality;

      // Get factors
      const factors = this.getFeatureImportance(features, context);

      // Determine action
      const recommendedAction = this.getRecommendedAction(predictedAcceptance, context.profile);

      return {
        recommendationId: features.recommendationId,
        predictedAcceptance,
        confidence,
        factors,
        recommendedAction,
      };
    },

    batchPredict(
      recommendations: RecommendationFeatures[],
      context: PredictionContext
    ): AcceptancePrediction[] {
      return recommendations.map((rec, index) => {
        // Adjust context for session position
        const adjustedContext: PredictionContext = {
          ...context,
          sessionRecommendationCount: (context.sessionRecommendationCount ?? 0) + index,
        };
        return this.predict(rec, adjustedContext);
      });
    },

    getRecommendedAction(
      prediction: number,
      profile: UserBehaviorProfile
    ): AcceptancePrediction["recommendedAction"] {
      const threshold = profile.preferences.confidenceThreshold;
      const automationLevel = profile.preferences.automationLevel;

      if (automationLevel === "automatic" && prediction >= 0.95) {
        return "auto_apply";
      }

      if (prediction >= threshold + 0.2) {
        return "show";
      }

      if (prediction >= threshold) {
        return "show_with_explanation";
      }

      if (prediction >= threshold - 0.2) {
        return "show_with_explanation";
      }

      return "skip";
    },

    getFeatureImportance(
      features: RecommendationFeatures,
      context: PredictionContext
    ): Array<{ factor: string; contribution: number; description: string }> {
      const factors: Array<{ factor: string; contribution: number; description: string }> = [];

      // Confidence contribution
      const confidenceContrib = (features.confidence - 0.5) * w.confidenceWeight * 2;
      factors.push({
        factor: "confidence",
        contribution: confidenceContrib,
        description:
          confidenceContrib > 0
            ? `High confidence (${formatPercent(features.confidence)}) increases acceptance likelihood`
            : `Low confidence (${formatPercent(features.confidence)}) decreases acceptance likelihood`,
      });

      // Category rate contribution
      if (features.categoryId !== undefined) {
        const categoryRate = context.profile.preferences.categorySensitivity[features.categoryId];
        if (categoryRate !== undefined) {
          const categoryContrib = (categoryRate - 0.5) * w.categoryWeight * 2;
          factors.push({
            factor: "category_history",
            contribution: categoryContrib,
            description:
              categoryContrib > 0
                ? `You often accept recommendations for this category (${formatPercent(categoryRate)})`
                : `You rarely accept recommendations for this category (${formatPercent(categoryRate)})`,
          });
        }
      }

      // Historical acceptance contribution
      const historicalContrib =
        (context.profile.engagement.acceptanceRate - 0.5) * 0.5 * 2;
      factors.push({
        factor: "historical_behavior",
        contribution: historicalContrib,
        description: `Your overall acceptance rate is ${formatPercent(context.profile.engagement.acceptanceRate)}`,
      });

      // Session fatigue
      if (context.sessionRecommendationCount !== undefined && context.sessionRecommendationCount > 5) {
        const fatigueContrib = -w.fatigueDecay * context.sessionRecommendationCount;
        factors.push({
          factor: "session_fatigue",
          contribution: fatigueContrib,
          description: `You've seen ${context.sessionRecommendationCount} recommendations this session`,
        });
      }

      // Similarity contribution
      if (features.similarityScore !== undefined && features.similarityScore > 0.7) {
        const similarityContrib = (features.similarityScore - 0.5) * w.similarityWeight * 2;
        factors.push({
          factor: "similarity",
          contribution: similarityContrib,
          description: `Strong match with similar transactions (${formatPercent(features.similarityScore)})`,
        });
      }

      // Sort by absolute contribution
      factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

      return factors.slice(0, 5); // Return top 5 factors
    },
  };
}
