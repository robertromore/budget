/**
 * ML Service Type Definitions
 *
 * Core types for the ML feature services including time series forecasting,
 * similarity/embeddings, anomaly detection, and user behavior modeling.
 */

// =============================================================================
// Time Series Forecasting Types
// =============================================================================

export interface ForecastPrediction {
  date: string;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
}

export interface ForecastMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number; // Mean Absolute Error
}

export interface TimeSeriesForecast {
  predictions: ForecastPrediction[];
  decomposition: SeasonalDecomposition;
  metrics: ForecastMetrics;
  method?: "exponential" | "holt-winters" | "regression" | "moving-average" | "ensemble";
}

export interface CashFlowPrediction {
  predictions: ForecastPrediction[];
  incomePredictions: ForecastPrediction[];
  expensePredictions: ForecastPrediction[];
  decomposition: SeasonalDecomposition;
  metrics: ForecastMetrics;
  confidence: number;
  lastUpdated: string;
}

export interface SpendingForecast {
  entityType: "payee" | "category" | "account";
  entityId: number;
  horizon: "daily" | "weekly" | "monthly";
  periods: number;
  forecast: TimeSeriesForecast;
  seasonality?: {
    detected: boolean;
    period: number; // in days
    strength: number; // 0-1
  };
}

// =============================================================================
// Similarity & Embeddings Types
// =============================================================================

export interface PayeeSimilarityMatch {
  payeeId: number;
  payeeName: string;
  normalizedName: string;
  similarityScore: number; // 0-1
  matchType: "exact" | "fuzzy" | "semantic" | "canonical";
  canonicalGroupId?: string;
}

export interface MerchantCanonical {
  canonicalName: string;
  canonicalId: string;
  variants: Array<{
    name: string;
    frequency: number;
    confidence: number;
  }>;
  category?: {
    id: number;
    name: string;
    confidence: number;
  };
}

export interface EmbeddingVector {
  entityType: "payee" | "category" | "transaction";
  entityId: number;
  vector: number[];
  dimension: number;
  createdAt: string;
  version: string;
}

export interface SimilaritySearchResult {
  entityId: number;
  entityName: string;
  similarity: number;
  matchedFeatures: string[];
}

// =============================================================================
// Anomaly Detection Types
// =============================================================================

export interface AnomalyScore {
  transactionId: number;
  overallScore: number; // 0-1, higher = more anomalous
  riskLevel: "low" | "medium" | "high" | "critical";
  dimensions: {
    amount: { score: number; reason: string };
    timing: { score: number; reason: string };
    frequency: { score: number; reason: string };
    category: { score: number; reason: string };
    payee: { score: number; reason: string };
  };
  detectors: Array<{
    name: string;
    score: number;
    weight: number;
    triggered: boolean;
  }>;
  explanation: string;
  recommendedActions: string[];
}

export interface AnomalyDetectionConfig {
  sensitivityLevel: "low" | "medium" | "high";
  enabledDetectors: string[];
  customThresholds?: Record<string, number>;
  learningPeriodDays: number;
}

export interface FraudPattern {
  patternId: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  rules: Array<{
    field: string;
    operator: "gt" | "lt" | "eq" | "between" | "matches";
    value: unknown;
    weight: number;
  }>;
}

export interface AnomalyAlert {
  id: string;
  transactionId: number;
  score: AnomalyScore;
  detectedAt: string;
  status: "new" | "reviewed" | "dismissed" | "confirmed";
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

// =============================================================================
// User Behavior Modeling Types
// =============================================================================

export interface UserBehaviorProfile {
  workspaceId: number;
  preferences: {
    confidenceThreshold: number; // User's preferred minimum confidence
    automationLevel: "manual" | "suggested" | "automatic";
    categorySensitivity: Record<number, number>; // Category-specific preferences
  };
  engagement: {
    avgResponseTime: number;
    acceptanceRate: number;
    correctionRate: number;
    lastActiveAt: string;
    sessionFrequency: number;
  };
  learningProgress: {
    totalRecommendations: number;
    acceptedRecommendations: number;
    correctedRecommendations: number;
    confidenceCalibration: number; // How well-calibrated our confidence is
  };
}

export interface AcceptancePrediction {
  recommendationId: string;
  predictedAcceptance: number; // 0-1 probability
  confidence: number;
  factors: Array<{
    factor: string;
    contribution: number; // -1 to 1
    description: string;
  }>;
  recommendedAction: "show" | "show_with_explanation" | "skip" | "auto_apply";
}

export interface EngagementOptimization {
  recommendations: Array<{
    id: string;
    originalOrder: number;
    optimizedOrder: number;
    showReason: string;
    timing: "immediate" | "delayed" | "batch";
  }>;
  explanationLevel: "minimal" | "standard" | "detailed";
  batchingStrategy: "none" | "daily" | "weekly";
}

export interface RecommendationOutcome {
  recommendationId: string;
  outcome: "accepted" | "rejected" | "corrected" | "ignored";
  timeToDecision: number;
  correction?: {
    from: unknown;
    to: unknown;
  };
  feedback?: string;
}

// =============================================================================
// ML Model Storage Types
// =============================================================================

export interface MLModel {
  id: number;
  workspaceId: number;
  modelType: "time_series" | "anomaly" | "similarity" | "behavior";
  modelName: string;
  entityType?: string;
  entityId?: number;
  parameters: Record<string, unknown>;
  metrics?: Record<string, number>;
  version: number;
  isActive: boolean;
  trainedAt: string;
  trainingSamples?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MLPrediction {
  id: number;
  workspaceId: number;
  modelId?: number;
  predictionType: string;
  entityType: string;
  entityId: number;
  predictionData: Record<string, unknown>;
  confidence?: number;
  actualOutcome?: string;
  predictedAt: string;
  resolvedAt?: string;
}

// =============================================================================
// Feature Engineering Types
// =============================================================================

export interface TransactionFeatures {
  // Raw features
  amount: number;
  dayOfWeek: number; // 0-6
  monthOfYear: number; // 1-12
  dayOfMonth: number; // 1-31
  isWeekend: boolean;
  hourOfDay?: number; // 0-23

  // Derived features
  amountLog: number;
  amountZScore?: number;
  amountPercentile?: number;
  daysSinceLastTransaction?: number;

  // Context features
  payeeTransactionCount?: number;
  payeeAvgAmount?: number;
  payeeAmountStdDev?: number;
  categorySpendingRatio?: number;
  accountBalanceRatio?: number;
}

export interface AggregationFeatures {
  rolling7DaySum: number;
  rolling7DayCount: number;
  rolling30DaySum: number;
  rolling30DayCount: number;
  rolling90DaySum: number;
  rolling90DayCount: number;
  monthlyAvg: number;
  monthlyStdDev: number;
}

export interface SequenceFeatures {
  values: number[];
  mean: number;
  stdDev: number;
  trend: number; // -1 to 1
  autocorrelation: number[];
  seasonalityStrength?: number;
}

// =============================================================================
// ML Service Health Types
// =============================================================================

export interface MLServiceHealth {
  serviceName: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: string;
  metrics: {
    modelsLoaded: number;
    predictionLatencyMs: number;
    errorRate: number;
    accuracy?: number;
  };
  issues: string[];
}

export interface MLSystemHealth {
  services: Record<string, MLServiceHealth>;
  modelStatus: {
    total: number;
    active: number;
    stale: number;
  };
  recentPredictionAccuracy: number;
  recommendations: string[];
}

// =============================================================================
// Recurring Transaction Detection Types
// =============================================================================

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "irregular";

export type AmountType = "exact" | "approximate" | "range";

export interface RecurringPatternMatch {
  transactionId: number;
  date: string;
  amount: number;
}

export interface RecurringPattern {
  patternId: string;
  payeeId: number;
  payeeName: string;
  categoryId?: number;
  categoryName?: string;
  accountId: number;

  // Pattern characteristics
  frequency: RecurringFrequency;
  interval: number; // Days between occurrences
  confidence: number; // 0-1

  // Amount patterns
  averageAmount: number;
  amountStdDev: number;
  amountMin: number;
  amountMax: number;
  amountType: AmountType;

  // Temporal patterns
  typicalDayOfMonth?: number; // 1-31 for monthly
  typicalDayOfWeek?: number; // 0-6 for weekly (Sunday=0)
  lastOccurrence: string; // ISO date
  nextPredicted: string; // ISO date

  // Supporting evidence
  matchingTransactions: RecurringPatternMatch[];
  occurrenceCount: number;
  firstOccurrence: string;

  // Health indicators
  consistencyScore: number; // 0-1, how regular the pattern is
  isActive: boolean; // Recent activity within expected range

  // Schedule suggestion
  suggestedSchedule?: {
    name: string;
    amount: number;
    amount_2?: number;
    amount_type: AmountType;
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
  };
}

export interface PatternAnalysis {
  pattern: RecurringPattern;
  healthScore: number; // 0-1, overall pattern health
  missedOccurrences: string[]; // Dates where pattern expected but missing
  anomalies: Array<{
    date: string;
    expectedAmount: number;
    actualAmount: number;
    deviation: number; // Standard deviations from mean
  }>;
  nextExpectedDates: string[]; // Next N predicted occurrence dates
  trends: {
    amountTrend: "increasing" | "decreasing" | "stable";
    frequencyTrend: "more_frequent" | "less_frequent" | "stable";
  };
}

export interface RecurringDetectionConfig {
  minOccurrences: number; // Minimum transactions to detect pattern
  minConfidence: number; // Minimum confidence threshold
  lookbackMonths: number; // How far back to analyze
  toleranceDays: number; // Days of variance allowed for pattern match
  amountTolerancePercent: number; // Amount variance allowed (e.g., 0.1 for 10%)
}

export interface RecurringDetectionSummary {
  total: number;
  byFrequency: Record<RecurringFrequency, number>;
  highConfidence: number;
  totalMonthlyValue: number; // Sum of all monthly recurring amounts
  subscriptions: number; // Count of likely subscription patterns
  bills: number; // Count of likely bill patterns
  income: number; // Count of likely income patterns
}
