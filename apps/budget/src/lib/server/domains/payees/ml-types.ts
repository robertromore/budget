// Comprehensive ML Coordinator Types
// This file exports all interfaces and types related to the unified ML system

export type {
  UnifiedRecommendations,
  CrossSystemLearning,
  BehaviorChangeDetection,
  ActionableInsight,
  MLPerformanceMetrics,
} from "./ml-coordinator";

// Additional helper types for ML coordination
export interface MLSystemStatus {
  system: "intelligence" | "learning" | "budget_allocation" | "coordinator";
  status: "healthy" | "degraded" | "error" | "offline";
  lastUpdate: string;
  confidence: number;
  errorRate: number;
  responseTime: number;
  dataQualityScore: number;
}

export interface MLEnsembleConfig {
  weightingStrategy: "equal" | "confidence_based" | "performance_based" | "hybrid";
  minimumConfidence: number;
  agreementThreshold: number;
  outlierDetection: boolean;
  dynamicWeighting: boolean;
}

export interface MLAutomationRule {
  id: string;
  name: string;
  description: string;
  type: "category" | "budget" | "alert" | "prediction";
  conditions: {
    confidenceThreshold: number;
    minimumDataPoints: number;
    agreementRequired: boolean;
    riskTolerance: number;
  };
  actions: {
    autoApply: boolean;
    requiresApproval: boolean;
    notifyUser: boolean;
    logDecision: boolean;
  };
  monitoring: {
    trackPerformance: boolean;
    alertOnFailure: boolean;
    reviewPeriodDays: number;
  };
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface MLDataPipeline {
  source: "transactions" | "corrections" | "budgets" | "user_feedback";
  stage: "collection" | "preprocessing" | "feature_extraction" | "model_training" | "inference";
  status: "running" | "paused" | "error" | "completed";
  progress: number; // 0-1
  recordsProcessed: number;
  errorsEncountered: number;
  lastProcessedAt: string;
  estimatedCompletion?: string;
}

export interface MLModelMetadata {
  modelId: string;
  modelType: "classification" | "regression" | "clustering" | "ensemble";
  version: string;
  trainingDate: string;
  features: string[];
  targetVariable: string;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc?: number;
  };
  hyperparameters: Record<string, any>;
  datasetSize: {
    training: number;
    validation: number;
    test: number;
  };
  isActive: boolean;
}

export interface MLFeatureImportance {
  feature: string;
  importance: number; // 0-1
  category:
    | "transaction_amount"
    | "frequency"
    | "category"
    | "seasonal"
    | "behavioral"
    | "contextual";
  description: string;
  stability: number; // How stable this importance is across different models
}

export interface MLPredictionExplanation {
  prediction: any;
  confidence: number;
  mainFactors: Array<{
    factor: string;
    contribution: number; // -1 to 1
    evidence: string;
  }>;
  alternatives: Array<{
    prediction: any;
    probability: number;
    reason: string;
  }>;
  uncertaintySource: string[];
  recommendedAction: string;
}

export interface MLSystemConfiguration {
  ensemble: MLEnsembleConfig;
  automationRules: MLAutomationRule[];
  models: MLModelMetadata[];
  dataPipelines: MLDataPipeline[];
  performanceThresholds: {
    minimumAccuracy: number;
    maximumResponseTime: number;
    maximumErrorRate: number;
    minimumDataQuality: number;
  };
  retrainingTriggers: {
    accuracyDrop: number;
    dataVolumeIncrease: number;
    timeSinceLastTraining: number; // days
    significantDrift: boolean;
  };
  explainabilityRequirements: {
    requireExplanations: boolean;
    detailLevel: "basic" | "detailed" | "comprehensive";
    userFacingExplanations: boolean;
  };
}

export interface MLAuditLog {
  id: string;
  timestamp: string;
  system: string;
  action: "prediction" | "recommendation" | "automation" | "training" | "configuration_change";
  payeeId?: number;
  input: Record<string, any>;
  output: Record<string, any>;
  confidence: number;
  modelVersion: string;
  userFeedback?: {
    accepted: boolean;
    corrected: boolean;
    feedback: string;
  };
  explanation?: MLPredictionExplanation;
  executionTime: number;
  success: boolean;
  error?: string;
}

export interface MLSystemHealth {
  overall: {
    status: "healthy" | "degraded" | "critical";
    score: number; // 0-100
    lastCheck: string;
  };
  systems: MLSystemStatus[];
  alerts: Array<{
    severity: "info" | "warning" | "error" | "critical";
    system: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  trends: {
    accuracyTrend: "improving" | "stable" | "declining";
    performanceTrend: "improving" | "stable" | "declining";
    usageTrend: "increasing" | "stable" | "decreasing";
  };
  recommendations: string[];
}

export interface MLTrainingJob {
  id: string;
  modelType: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  startedAt?: string;
  completedAt?: string;
  datasetSize: number;
  epochs: number;
  currentEpoch?: number;
  metrics: Record<string, number>;
  artifacts: string[];
  logs: string[];
  error?: string;
}

export interface MLExperiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  parameters: Record<string, any>;
  results: {
    baseline: MLModelMetadata;
    experiment: MLModelMetadata;
    improvement: number;
    significance: number;
    recommendation: "adopt" | "reject" | "continue_testing";
  };
  status: "running" | "completed" | "failed";
  startDate: string;
  endDate?: string;
  conclusions: string[];
}

// Utility types for ML operations
export type MLConfidenceLevel = "very_low" | "low" | "medium" | "high" | "very_high";
export type MLPriority = "critical" | "high" | "medium" | "low";
export type MLSystemType =
  | "intelligence"
  | "learning"
  | "budget_allocation"
  | "coordinator"
  | "ensemble";
export type MLInsightType = "optimization" | "correction" | "prediction" | "automation" | "alert";
export type MLAutomationType = "category" | "budget" | "alert" | "prediction" | "optimization";

// Type guards and validation helpers
export const isMLConfidenceLevel = (value: any): value is MLConfidenceLevel => {
  return ["very_low", "low", "medium", "high", "very_high"].includes(value);
};

export const isMLPriority = (value: any): value is MLPriority => {
  return ["critical", "high", "medium", "low"].includes(value);
};

export const isMLSystemType = (value: any): value is MLSystemType => {
  return ["intelligence", "learning", "budget_allocation", "coordinator", "ensemble"].includes(
    value
  );
};

// Helper functions for ML operations
export const getMLConfidenceLevel = (confidence: number): MLConfidenceLevel => {
  if (confidence >= 0.9) return "very_high";
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.5) return "medium";
  if (confidence >= 0.3) return "low";
  return "very_low";
};

export const getMLPriorityFromConfidence = (
  confidence: number,
  riskLevel: number = 0
): MLPriority => {
  const adjustedConfidence = confidence * (1 - riskLevel * 0.3);

  if (adjustedConfidence >= 0.8) return "critical";
  if (adjustedConfidence >= 0.6) return "high";
  if (adjustedConfidence >= 0.4) return "medium";
  return "low";
};

// ML Coordinator Response Templates
export interface MLResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    modelVersions: Record<string, string>;
    confidence: number;
    cacheHit: boolean;
  };
}

export interface MLBatchResponse<T = any> {
  success: boolean;
  results: Array<{
    id: string | number;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageConfidence: number;
    processingTime: number;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    batchSize: number;
    modelVersions: Record<string, string>;
  };
}

// Advanced ML Analytics Types
export interface MLAnalyticsReport {
  period: {
    start: string;
    end: string;
    type: "daily" | "weekly" | "monthly" | "quarterly";
  };
  overview: {
    totalPredictions: number;
    averageAccuracy: number;
    userSatisfaction: number;
    automationRate: number;
    errorRate: number;
  };
  systemPerformance: {
    responseTime: {
      average: number;
      p95: number;
      p99: number;
    };
    throughput: number;
    availability: number;
    resourceUtilization: number;
  };
  businessImpact: {
    timeSaved: number; // minutes
    errorsAvoided: number;
    accuracyImprovement: number;
    userProductivity: number;
  };
  recommendations: Array<{
    category: "performance" | "accuracy" | "user_experience" | "cost_optimization";
    priority: MLPriority;
    recommendation: string;
    expectedImpact: string;
    effort: "low" | "medium" | "high";
  }>;
  trends: Record<string, Array<{timestamp: string; value: number}>>;
}

export interface MLDataQualityReport {
  overall: {
    score: number; // 0-100
    status: "excellent" | "good" | "fair" | "poor";
  };
  dimensions: {
    completeness: {
      score: number;
      missingValues: number;
      requiredFieldsPresent: number;
    };
    accuracy: {
      score: number;
      inconsistencies: number;
      validationErrors: number;
    };
    timeliness: {
      score: number;
      averageAge: number; // days
      staleRecords: number;
    };
    consistency: {
      score: number;
      formatIssues: number;
      duplicates: number;
    };
  };
  issues: Array<{
    severity: "critical" | "high" | "medium" | "low";
    category: string;
    description: string;
    count: number;
    examples: string[];
    suggestedFix: string;
  }>;
  recommendations: string[];
}
