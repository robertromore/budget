/**
 * Unified ML Coordinator
 *
 * Integrates all ML services to provide comprehensive recommendations,
 * anomaly detection, similarity matching, and user behavior modeling.
 */

import { PayeeMLCoordinator, type UnifiedRecommendations } from "../payees/ml-coordinator";
import { AnomalyDetectionService } from "./anomaly-detection";
import { FeatureEngineeringService } from "./feature-engineering";
import { createMLModelStore, type MLModelStore } from "./model-store";
import { createSimilarityService, type SimilarityService } from "./similarity";
import { TimeSeriesForecastingService } from "./time-series";
import type {
  AnomalyScore,
  CashFlowPrediction,
  MerchantCanonical,
  PayeeSimilarityMatch,
} from "./types";
import { createUserBehaviorService, type UserBehaviorService } from "./user-behavior";

// =============================================================================
// Types
// =============================================================================

export interface EnhancedRecommendations extends UnifiedRecommendations {
  forecast?: {
    cashFlow: CashFlowPrediction | null;
    spendingTrend: "increasing" | "decreasing" | "stable";
    confidence: number;
  };
  anomalyProfile?: {
    recentAnomalies: AnomalyScore[];
    riskLevel: "low" | "medium" | "high" | "critical";
    alertCount: number;
  };
  similarPayees?: {
    matches: PayeeSimilarityMatch[];
    canonicalGroup?: MerchantCanonical;
  };
  acceptancePrediction?: {
    predictedAcceptance: number;
    factors: Array<{ factor: string; contribution: number; description: string }>;
    recommendedAction: "show" | "show_with_explanation" | "skip" | "auto_apply";
  };
}

export interface MLHealthStatus {
  overall: "healthy" | "degraded" | "critical";
  score: number;
  services: {
    name: string;
    status: "healthy" | "degraded" | "error" | "offline" | "no_data";
    lastCheck: string;
    responseTime: number;
    errorRate: number;
  }[];
  alerts: {
    severity: "info" | "warning" | "error" | "critical";
    message: string;
    timestamp: string;
    service: string;
  }[];
  metrics: {
    totalPredictions: number;
    averageAccuracy: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface UnifiedMLCoordinatorConfig {
  enableForecasting: boolean;
  enableAnomalyDetection: boolean;
  enableSimilarity: boolean;
  enableUserBehavior: boolean;
  anomalySensitivity: "low" | "medium" | "high";
  forecastHorizon: number;
  similarityThreshold: number;
}

const DEFAULT_CONFIG: UnifiedMLCoordinatorConfig = {
  enableForecasting: true,
  enableAnomalyDetection: true,
  enableSimilarity: true,
  enableUserBehavior: true,
  anomalySensitivity: "medium",
  forecastHorizon: 30,
  similarityThreshold: 0.6,
};

// =============================================================================
// Unified ML Coordinator
// =============================================================================

export class UnifiedMLCoordinator {
  private payeeMLCoordinator: PayeeMLCoordinator;
  private modelStore: MLModelStore;
  private featureService: FeatureEngineeringService;
  private timeSeriesService: TimeSeriesForecastingService;
  private anomalyService: AnomalyDetectionService;
  private similarityService: SimilarityService;
  private userBehaviorService: UserBehaviorService;
  private config: UnifiedMLCoordinatorConfig;

  // Service health tracking
  private serviceHealth: Map<string, { lastCheck: string; responseTime: number; errors: number }> =
    new Map();

  constructor(config: Partial<UnifiedMLCoordinatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize core services
    this.modelStore = createMLModelStore();
    this.featureService = new FeatureEngineeringService();

    // Initialize ML services
    this.timeSeriesService = new TimeSeriesForecastingService(
      this.modelStore,
      this.featureService
    );
    this.anomalyService = new AnomalyDetectionService(this.modelStore, {
      sensitivityLevel: this.config.anomalySensitivity,
    });
    this.similarityService = createSimilarityService(this.modelStore, {
      similarityThreshold: this.config.similarityThreshold,
    });
    this.userBehaviorService = createUserBehaviorService(this.modelStore);

    // Initialize payee ML coordinator
    this.payeeMLCoordinator = new PayeeMLCoordinator();

    // Initialize health tracking
    this.initializeHealthTracking();
  }

  // ===========================================================================
  // Enhanced Recommendations
  // ===========================================================================

  /**
   * Generate enhanced unified recommendations combining all ML systems
   */
  async generateEnhancedRecommendations(
    payeeId: number,
    workspaceId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
      userPreferences?: Record<string, unknown>;
      riskTolerance?: number;
    }
  ): Promise<EnhancedRecommendations> {
    const startTime = Date.now();

    // Get base recommendations from PayeeMLCoordinator
    const baseRecommendations =
      await this.payeeMLCoordinator.generateUnifiedRecommendations(payeeId, context);

    const enhanced: EnhancedRecommendations = { ...baseRecommendations };

    // Add forecasting data
    if (this.config.enableForecasting) {
      try {
        const forecast = await this.timeSeriesService.predictCashFlow(workspaceId, {
          horizon: this.config.forecastHorizon,
          granularity: "monthly",
        });

        enhanced.forecast = {
          cashFlow: forecast,
          spendingTrend: this.determineSpendingTrend(forecast),
          confidence: forecast.confidence,
        };
        this.recordServiceHealth("forecasting", Date.now() - startTime, true);
      } catch (error) {
        this.recordServiceHealth("forecasting", Date.now() - startTime, false);
      }
    }

    // Add anomaly profile
    if (this.config.enableAnomalyDetection) {
      try {
        const anomalyStartTime = Date.now();
        const recentAnomalies = await this.anomalyService.scanRecentTransactions(workspaceId, {
          limit: 10,
          minRiskLevel: "low",
        });

        enhanced.anomalyProfile = {
          recentAnomalies,
          riskLevel: this.calculateOverallRiskLevel(recentAnomalies),
          alertCount: recentAnomalies.filter((a: AnomalyScore) => a.riskLevel !== "low").length,
        };
        this.recordServiceHealth("anomalyDetection", Date.now() - anomalyStartTime, true);
      } catch (error) {
        this.recordServiceHealth("anomalyDetection", Date.now() - startTime, false);
      }
    }

    // Add similarity data
    if (this.config.enableSimilarity) {
      try {
        const similarityStartTime = Date.now();
        const matches = await this.similarityService.findSimilarPayees(
          workspaceId,
          baseRecommendations.payeeName,
          { limit: 5, minScore: this.config.similarityThreshold }
        );

        const canonical = await this.similarityService.getCanonical(
          workspaceId,
          baseRecommendations.payeeName
        );

        enhanced.similarPayees = {
          matches: matches.map((m) => ({
            payeeId: m.payeeId,
            payeeName: m.payeeName,
            normalizedName: m.payeeName.toLowerCase().trim(),
            similarityScore: m.similarityScore,
            matchType: m.matchType === "lsh" ? "semantic" as const : m.matchType as "exact" | "fuzzy" | "semantic" | "canonical",
          })),
          canonicalGroup: canonical ?? undefined,
        };
        this.recordServiceHealth("similarity", Date.now() - similarityStartTime, true);
      } catch (error) {
        this.recordServiceHealth("similarity", Date.now() - startTime, false);
      }
    }

    // Add user behavior prediction
    if (this.config.enableUserBehavior) {
      try {
        const behaviorStartTime = Date.now();
        const prediction = await this.userBehaviorService.predictAcceptance(workspaceId, {
          recommendationId: `rec_${payeeId}_${Date.now()}`,
          confidence: baseRecommendations.categoryRecommendation.confidence,
          entityType: "category",
          entityId: baseRecommendations.categoryRecommendation.recommendedCategoryId,
          categoryId: baseRecommendations.categoryRecommendation.recommendedCategoryId,
        });

        enhanced.acceptancePrediction = {
          predictedAcceptance: prediction.predictedAcceptance,
          factors: prediction.factors,
          recommendedAction: prediction.recommendedAction,
        };
        this.recordServiceHealth("userBehavior", Date.now() - behaviorStartTime, true);
      } catch (error) {
        this.recordServiceHealth("userBehavior", Date.now() - startTime, false);
      }
    }

    return enhanced;
  }

  // ===========================================================================
  // Transaction Analysis
  // ===========================================================================

  /**
   * Analyze a transaction for anomalies and get category suggestions
   */
  async analyzeTransaction(
    workspaceId: number,
    transaction: {
      amount: number;
      date: string;
      description: string;
      payeeId?: number;
      categoryId?: number;
      accountId: number;
    }
  ): Promise<{
    anomalyScore: AnomalyScore | null;
    suggestedPayee: PayeeSimilarityMatch | null;
    suggestedCategory: { id: number; name: string; confidence: number } | null;
    isHighRisk: boolean;
  }> {
    const results = await Promise.allSettled([
      // Score for anomalies
      this.anomalyService.scoreTransaction(workspaceId, {
        id: 0, // Temporary ID for new transaction
        amount: transaction.amount,
        date: transaction.date,
        payeeId: transaction.payeeId,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId,
      }),

      // Find matching payee
      this.similarityService.matchPayee(workspaceId, transaction.description),

      // Suggest category based on payee
      this.similarityService.suggestCategoryByPayee(workspaceId, transaction.description),
    ]);

    const anomalyScore =
      results[0].status === "fulfilled" ? results[0].value : null;
    const suggestedPayee =
      results[1].status === "fulfilled" ? results[1].value : null;
    const rawCategory =
      results[2].status === "fulfilled" ? results[2].value : null;

    // Transform category to expected format
    const suggestedCategory = rawCategory
      ? { id: rawCategory.categoryId, name: rawCategory.categoryName, confidence: rawCategory.confidence }
      : null;

    return {
      anomalyScore,
      suggestedPayee,
      suggestedCategory,
      isHighRisk:
        anomalyScore?.riskLevel === "high" || anomalyScore?.riskLevel === "critical",
    };
  }

  // ===========================================================================
  // Forecasting
  // ===========================================================================

  /**
   * Get cash flow forecast for workspace
   */
  async getCashFlowForecast(
    workspaceId: number,
    options: {
      horizon?: number;
      granularity?: "daily" | "weekly" | "monthly";
      accountId?: number;
    } = {}
  ): Promise<CashFlowPrediction> {
    return this.timeSeriesService.predictCashFlow(workspaceId, {
      horizon: options.horizon ?? this.config.forecastHorizon,
      granularity: options.granularity ?? "monthly",
      accountId: options.accountId,
    });
  }

  /**
   * Get category spending forecast
   */
  async getCategoryForecast(
    workspaceId: number,
    categoryId: number,
    horizon: number = 3
  ) {
    return this.timeSeriesService.predictCategorySpending(workspaceId, categoryId, {
      horizon,
    });
  }

  // ===========================================================================
  // Anomaly Detection
  // ===========================================================================

  /**
   * Get anomaly alerts for workspace
   */
  async getAnomalyAlerts(
    workspaceId: number,
    options: { limit?: number; minRiskLevel?: "low" | "medium" | "high" | "critical" } = {}
  ): Promise<AnomalyScore[]> {
    return this.anomalyService.scanRecentTransactions(workspaceId, options);
  }

  /**
   * Batch score transactions for anomalies
   */
  async batchScoreTransactions(
    workspaceId: number,
    transactionIds: number[]
  ): Promise<AnomalyScore[]> {
    return this.anomalyService.scoreTransactions(workspaceId, transactionIds);
  }

  // ===========================================================================
  // Similarity & Matching
  // ===========================================================================

  /**
   * Find similar payees
   */
  async findSimilarPayees(
    workspaceId: number,
    query: string,
    options: { limit?: number; minScore?: number } = {}
  ) {
    return this.similarityService.findSimilarPayees(workspaceId, query, options);
  }

  /**
   * Get canonical groups
   */
  async getCanonicalGroups(workspaceId: number) {
    return this.similarityService.getCanonicalGroups(workspaceId);
  }

  /**
   * Initialize LSH index for fast matching
   */
  async initializeSimilarityIndex(workspaceId: number): Promise<void> {
    return this.similarityService.initializeLSHIndex(workspaceId);
  }

  // ===========================================================================
  // User Behavior
  // ===========================================================================

  /**
   * Track user interaction with recommendation
   */
  trackInteraction(
    workspaceId: number,
    interactionType:
      | "recommendation_shown"
      | "recommendation_accepted"
      | "recommendation_rejected"
      | "recommendation_corrected"
      | "recommendation_ignored"
      | "category_selected"
      | "payee_selected"
      | "threshold_adjusted",
    entityType: string,
    metadata?: Record<string, unknown>
  ): void {
    this.userBehaviorService.trackInteraction(workspaceId, interactionType, entityType, metadata);
  }

  /**
   * Get user behavior profile
   */
  async getUserProfile(workspaceId: number) {
    return this.userBehaviorService.getProfile(workspaceId);
  }

  /**
   * Get personalized confidence threshold
   */
  async getPersonalizedThreshold(
    workspaceId: number,
    targetAcceptanceRate: number = 0.8
  ): Promise<number> {
    return this.userBehaviorService.getPersonalizedThreshold(workspaceId, targetAcceptanceRate);
  }

  // ===========================================================================
  // Health Monitoring
  // ===========================================================================

  /**
   * Get ML system health status
   */
  async getHealthStatus(workspaceId: number): Promise<MLHealthStatus> {
    const services: MLHealthStatus["services"] = [];
    const alerts: MLHealthStatus["alerts"] = [];
    let totalScore = 0;

    // Check each service
    const serviceNames = ["forecasting", "anomalyDetection", "similarity", "userBehavior"];

    for (const name of serviceNames) {
      const health = this.serviceHealth.get(name);
      const status = this.calculateServiceStatus(health);

      services.push({
        name,
        status: status.status,
        lastCheck: health?.lastCheck ?? new Date().toISOString(),
        responseTime: health?.responseTime ?? 0,
        errorRate: health ? health.errors / Math.max(1, health.errors + 10) : 0,
      });

      totalScore += status.score;

      if (status.status !== "healthy") {
        alerts.push({
          severity: status.status === "error" ? "error" : "warning",
          message: `${name} service is ${status.status}`,
          timestamp: new Date().toISOString(),
          service: name,
        });
      }
    }

    const avgScore = totalScore / serviceNames.length;
    const overall: MLHealthStatus["overall"] =
      avgScore > 0.8 ? "healthy" : avgScore > 0.5 ? "degraded" : "critical";

    // Get metrics from user behavior service
    const behaviorMetrics = await this.userBehaviorService.getHealthMetrics(workspaceId);

    return {
      overall,
      score: avgScore,
      services,
      alerts,
      metrics: {
        totalPredictions: behaviorMetrics.interactionCount,
        averageAccuracy: behaviorMetrics.predictionAccuracy,
        averageResponseTime: services.reduce((sum, s) => sum + s.responseTime, 0) / services.length,
        errorRate: services.reduce((sum, s) => sum + s.errorRate, 0) / services.length,
      },
    };
  }

  /**
   * Retrain all ML models for a workspace
   */
  async retrainModels(workspaceId: number): Promise<{
    success: boolean;
    modelsTrained: string[];
    errors: string[];
  }> {
    const modelsTrained: string[] = [];
    const errors: string[] = [];

    // Retrain user behavior models
    try {
      await this.userBehaviorService.retrainModels(workspaceId);
      modelsTrained.push("user_behavior");
    } catch (error) {
      errors.push(`user_behavior: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Initialize similarity index
    try {
      await this.similarityService.initializeLSHIndex(workspaceId);
      modelsTrained.push("similarity_lsh");
    } catch (error) {
      errors.push(`similarity_lsh: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return {
      success: errors.length === 0,
      modelsTrained,
      errors,
    };
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private initializeHealthTracking(): void {
    const services = ["forecasting", "anomalyDetection", "similarity", "userBehavior"];
    const now = new Date().toISOString();

    for (const service of services) {
      this.serviceHealth.set(service, {
        lastCheck: now,
        responseTime: 0,
        errors: 0,
      });
    }
  }

  private recordServiceHealth(service: string, responseTime: number, success: boolean): void {
    const current = this.serviceHealth.get(service) ?? { lastCheck: "", responseTime: 0, errors: 0 };

    this.serviceHealth.set(service, {
      lastCheck: new Date().toISOString(),
      responseTime: (current.responseTime + responseTime) / 2, // Rolling average
      errors: success ? Math.max(0, current.errors - 1) : current.errors + 1,
    });
  }

  private calculateServiceStatus(
    health: { lastCheck: string; responseTime: number; errors: number } | undefined
  ): { status: "healthy" | "degraded" | "error" | "offline" | "no_data"; score: number } {
    // No health data at all - service has never been used
    if (!health) {
      return { status: "no_data", score: 0 };
    }

    // Service was initialized but never actually called (responseTime is still 0)
    if (health.responseTime === 0 && health.errors === 0) {
      return { status: "no_data", score: 0 };
    }

    const lastCheckAge = Date.now() - new Date(health.lastCheck).getTime();
    const isStale = lastCheckAge > 60000; // 1 minute

    // Service was working but hasn't responded recently
    if (isStale) {
      return { status: "offline", score: 0.2 };
    }

    if (health.errors > 5) {
      return { status: "error", score: 0.3 };
    }

    if (health.errors > 2 || health.responseTime > 5000) {
      return { status: "degraded", score: 0.6 };
    }

    return { status: "healthy", score: 1.0 };
  }

  private determineSpendingTrend(
    forecast: CashFlowPrediction
  ): "increasing" | "decreasing" | "stable" {
    if (!forecast.predictions || forecast.predictions.length < 2) {
      return "stable";
    }

    const values = forecast.predictions.map((p) => p.value);
    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));

    const firstAvg = first.reduce((sum, v) => sum + v, 0) / first.length;
    const secondAvg = second.reduce((sum, v) => sum + v, 0) / second.length;

    const changePercent = (secondAvg - firstAvg) / Math.abs(firstAvg);

    if (changePercent > 0.1) return "increasing";
    if (changePercent < -0.1) return "decreasing";
    return "stable";
  }

  private calculateOverallRiskLevel(
    anomalies: AnomalyScore[]
  ): "low" | "medium" | "high" | "critical" {
    if (anomalies.length === 0) return "low";

    const riskLevels = anomalies.map((a) => a.riskLevel);
    if (riskLevels.includes("critical")) return "critical";
    if (riskLevels.filter((r) => r === "high").length > 2) return "high";
    if (riskLevels.includes("high")) return "medium";
    if (riskLevels.filter((r) => r === "medium").length > 3) return "medium";
    return "low";
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let unifiedCoordinator: UnifiedMLCoordinator | null = null;

/**
 * Get the unified ML coordinator (singleton)
 */
export function getUnifiedMLCoordinator(
  config?: Partial<UnifiedMLCoordinatorConfig>
): UnifiedMLCoordinator {
  if (!unifiedCoordinator) {
    unifiedCoordinator = new UnifiedMLCoordinator(config);
  }
  return unifiedCoordinator;
}

/**
 * Reset the unified ML coordinator (for testing)
 */
export function resetUnifiedMLCoordinator(): void {
  unifiedCoordinator = null;
}
