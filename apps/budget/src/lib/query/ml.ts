/**
 * ML Query Layer
 *
 * Query definitions for ML features including health monitoring,
 * forecasting, anomaly detection, similarity matching, and user behavior.
 */

import type { AnomalyScore, UserBehaviorProfile } from "$lib/server/domains/ml/types";
import { trpc } from "$lib/trpc/client";
import { cachePatterns, queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// =============================================================================
// Query Keys
// =============================================================================

export const mlKeys = createQueryKeys("ml", {
  // Health
  health: () => ["ml", "health"] as const,

  // Forecasting
  cashFlowForecast: (params: {
    horizon?: number;
    granularity?: "daily" | "weekly" | "monthly";
    accountId?: number;
  }) => ["ml", "forecast", "cashFlow", params] as const,
  categoryForecast: (categoryId: number, horizon?: number) =>
    ["ml", "forecast", "category", categoryId, horizon] as const,
  payeeForecast: (payeeId: number, horizon?: number) =>
    ["ml", "forecast", "payee", payeeId, horizon] as const,
  bulkCategoryForecasts: (categoryIds: number[], horizon?: number) =>
    ["ml", "forecast", "categories", categoryIds, horizon] as const,

  // Anomaly Detection
  anomalyAlerts: (params: { limit?: number; minRiskLevel?: string }) =>
    ["ml", "anomaly", "alerts", params] as const,
  transactionScore: (transactionId: number) =>
    ["ml", "anomaly", "score", transactionId] as const,
  batchScores: (transactionIds: number[]) =>
    ["ml", "anomaly", "batch", transactionIds] as const,
  scanRecent: (days: number, minRiskLevel: string) =>
    ["ml", "anomaly", "scan", days, minRiskLevel] as const,
  payeeAnomalyProfile: (payeeId: number) => ["ml", "anomaly", "payee", payeeId] as const,

  // Transaction Analysis
  transactionAnalysis: (params: {
    amount: number;
    date: string;
    description: string;
    accountId: number;
    payeeId?: number;
    categoryId?: number;
  }) => ["ml", "analysis", params] as const,

  // Similarity
  similarPayees: (query: string, limit?: number, minScore?: number) =>
    ["ml", "similarity", "payees", query, limit, minScore] as const,
  canonicalGroups: () => ["ml", "similarity", "canonical"] as const,

  // Recurring Detection
  recurringSummary: (params?: { accountId?: number }) =>
    ["ml", "recurring", "summary", params] as const,
  recurringPatterns: (params?: { accountId?: number; minConfidence?: number }) =>
    ["ml", "recurring", "patterns", params] as const,
  missingPatterns: (params?: { daysAhead?: number }) =>
    ["ml", "recurring", "missing", params] as const,

  // User Behavior
  userProfile: () => ["ml", "userProfile"] as const,
  personalizedThreshold: (targetAcceptanceRate?: number) =>
    ["ml", "threshold", targetAcceptanceRate] as const,

  // Enhanced Recommendations
  enhancedRecommendations: (
    payeeId: number,
    transactionAmount?: number,
    transactionDate?: string
  ) => ["ml", "recommendations", payeeId, transactionAmount, transactionDate] as const,

  // Natural Language Search
  nlSearch: (query: string, limit?: number) => ["ml", "nl", "search", query, limit] as const,
  nlParse: (query: string) => ["ml", "nl", "parse", query] as const,
  nlSuggestions: (partialQuery: string) => ["ml", "nl", "suggestions", partialQuery] as const,
  nlExamples: () => ["ml", "nl", "examples"] as const,
});

// =============================================================================
// Health Queries
// =============================================================================

/**
 * Get ML system health status
 */
export const getMLHealthStatus = () =>
  defineQuery({
    queryKey: mlKeys.health(),
    queryFn: () => trpc().mlHealthRoutes.getHealthStatus.query(),
    options: {
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  });

// =============================================================================
// Forecasting Queries
// =============================================================================

/**
 * Get cash flow forecast (global or account-specific)
 */
export const getCashFlowForecast = (params: {
  horizon?: number;
  granularity?: "daily" | "weekly" | "monthly";
  accountId?: number;
}) =>
  defineQuery({
    queryKey: mlKeys.cashFlowForecast(params),
    queryFn: () =>
      trpc().mlHealthRoutes.getCashFlowForecast.query({
        horizon: params.horizon ?? 30,
        granularity: params.granularity ?? "monthly",
        accountId: params.accountId,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get category spending forecast
 */
export const getCategoryForecast = (categoryId: number, horizon: number = 3) =>
  defineQuery({
    queryKey: mlKeys.categoryForecast(categoryId, horizon),
    queryFn: () =>
      trpc().mlHealthRoutes.getCategoryForecast.query({
        categoryId,
        horizon,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get payee spending forecast via forecasting routes
 */
export const getPayeeForecast = (payeeId: number, horizon: number = 3) =>
  defineQuery({
    queryKey: mlKeys.payeeForecast(payeeId, horizon),
    queryFn: () =>
      trpc().forecastingRoutes.payeeSpending.query({
        payeeId,
        horizon,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get bulk category forecasts
 */
export const getBulkCategoryForecasts = (categoryIds: number[], horizon: number = 3) =>
  defineQuery({
    queryKey: mlKeys.bulkCategoryForecasts(categoryIds, horizon),
    queryFn: () =>
      trpc().forecastingRoutes.bulkCategoryForecasts.query({
        categoryIds,
        horizon,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

// =============================================================================
// Anomaly Detection Queries
// =============================================================================

/**
 * Get anomaly alerts
 */
export const getAnomalyAlerts = (params: {
  limit?: number;
  minRiskLevel?: "low" | "medium" | "high" | "critical";
}) =>
  defineQuery({
    queryKey: mlKeys.anomalyAlerts(params),
    queryFn: () =>
      trpc().mlHealthRoutes.getAnomalyAlerts.query({
        limit: params.limit ?? 20,
        minRiskLevel: params.minRiskLevel ?? "low",
      }),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Score a single transaction for anomalies
 */
export const getTransactionAnomalyScore = (params: {
  transactionId: number;
  amount: number;
  date: string;
  accountId: number;
  payeeId?: number;
  categoryId?: number;
  notes?: string;
}) =>
  defineQuery<AnomalyScore>({
    queryKey: mlKeys.transactionScore(params.transactionId),
    queryFn: () => trpc().anomalyDetectionRoutes.scoreTransaction.query(params),
  });

/**
 * Batch score transactions for anomalies
 */
export const getBatchTransactionScores = (transactionIds: number[]) =>
  defineQuery({
    queryKey: mlKeys.batchScores(transactionIds),
    queryFn: () =>
      trpc().mlHealthRoutes.batchScoreTransactions.query({
        transactionIds,
      }),
  });

/**
 * Scan recent transactions for anomalies
 */
export const scanRecentAnomalies = (
  days: number = 7,
  minRiskLevel: "low" | "medium" | "high" | "critical" = "medium"
) =>
  defineQuery({
    queryKey: mlKeys.scanRecent(days, minRiskLevel),
    queryFn: () =>
      trpc().anomalyDetectionRoutes.scanRecent.query({
        days,
        minRiskLevel,
      }),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Get payee anomaly profile
 */
export const getPayeeAnomalyProfile = (payeeId: number) =>
  defineQuery({
    queryKey: mlKeys.payeeAnomalyProfile(payeeId),
    queryFn: () =>
      trpc().anomalyDetectionRoutes.payeeProfile.query({
        payeeId,
      }),
  });

// =============================================================================
// Transaction Analysis Queries
// =============================================================================

/**
 * Analyze a transaction for anomalies and suggestions
 */
export const analyzeTransaction = (params: {
  amount: number;
  date: string;
  description: string;
  accountId: number;
  payeeId?: number;
  categoryId?: number;
}) =>
  defineQuery({
    queryKey: mlKeys.transactionAnalysis(params),
    queryFn: () => trpc().mlHealthRoutes.analyzeTransaction.query(params),
    options: {
      staleTime: 1000 * 30, // 30 seconds - real-time analysis
    },
  });

// =============================================================================
// Similarity Queries
// =============================================================================

/**
 * Find similar payees by name
 */
export const findSimilarPayees = (query: string, limit: number = 10, minScore: number = 0.6) =>
  defineQuery({
    queryKey: mlKeys.similarPayees(query, limit, minScore),
    queryFn: () =>
      trpc().mlHealthRoutes.findSimilarPayees.query({
        query,
        limit,
        minScore,
      }),
  });

/**
 * Get canonical payee groups
 */
export const getCanonicalGroups = () =>
  defineQuery({
    queryKey: mlKeys.canonicalGroups(),
    queryFn: () => trpc().mlHealthRoutes.getCanonicalGroups.query(),
    options: {
      staleTime: 1000 * 60 * 30, // 30 minutes
    },
  });

// =============================================================================
// Recurring Detection Queries
// =============================================================================

/**
 * Get recurring transaction summary
 */
export const getRecurringSummary = (params?: { accountId?: number }) =>
  defineQuery({
    queryKey: mlKeys.recurringSummary(params),
    queryFn: () =>
      trpc().recurringDetectionRoutes.getSummary.query({
        accountId: params?.accountId,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Detect all recurring patterns
 */
export const getRecurringPatterns = (params?: {
  accountId?: number;
  minConfidence?: number;
  lookbackMonths?: number;
}) =>
  defineQuery({
    queryKey: mlKeys.recurringPatterns(params),
    queryFn: () =>
      trpc().recurringDetectionRoutes.detectPatterns.query({
        accountId: params?.accountId,
        minConfidence: params?.minConfidence ?? 0.6,
        lookbackMonths: params?.lookbackMonths ?? 12,
      }),
    options: {
      staleTime: 1000 * 60 * 15, // 15 minutes
    },
  });

/**
 * Get missing expected recurring transactions
 */
export const getMissingPatterns = (params?: { daysAhead?: number }) =>
  defineQuery({
    queryKey: mlKeys.missingPatterns(params),
    queryFn: () =>
      trpc().recurringDetectionRoutes.checkMissing.query({
        daysAhead: params?.daysAhead ?? 7,
      }),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

// =============================================================================
// User Behavior Queries
// =============================================================================

/**
 * Get user behavior profile
 */
export const getUserProfile = () =>
  defineQuery<UserBehaviorProfile>({
    queryKey: mlKeys.userProfile(),
    queryFn: () => trpc().mlHealthRoutes.getUserProfile.query(),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get personalized confidence threshold
 */
export const getPersonalizedThreshold = (targetAcceptanceRate: number = 0.8) =>
  defineQuery({
    queryKey: mlKeys.personalizedThreshold(targetAcceptanceRate),
    queryFn: () =>
      trpc().mlHealthRoutes.getPersonalizedThreshold.query({
        targetAcceptanceRate,
      }),
  });

// =============================================================================
// Enhanced Recommendations Queries
// =============================================================================

/**
 * Get enhanced ML recommendations for a payee
 */
export const getEnhancedRecommendations = (
  payeeId: number,
  transactionAmount?: number,
  transactionDate?: string
) =>
  defineQuery({
    queryKey: mlKeys.enhancedRecommendations(payeeId, transactionAmount, transactionDate),
    queryFn: () =>
      trpc().mlHealthRoutes.getEnhancedRecommendations.query({
        payeeId,
        transactionAmount,
        transactionDate,
      }),
  });

// =============================================================================
// Mutations
// =============================================================================

/**
 * Retrain ML models for workspace
 */
export const retrainModels = () =>
  defineMutation({
    mutationFn: () => trpc().mlHealthRoutes.retrainModels.mutate(),
    onSuccess: () => {
      cachePatterns.invalidatePrefix(mlKeys.health());
    },
    successMessage: "Models retrained successfully",
    errorMessage: "Failed to retrain models",
  });

/**
 * Initialize similarity index for fast matching
 */
export const initializeSimilarityIndex = () =>
  defineMutation({
    mutationFn: () => trpc().mlHealthRoutes.initializeSimilarityIndex.mutate(),
    onSuccess: () => {
      cachePatterns.invalidatePrefix(mlKeys.canonicalGroups());
    },
    successMessage: "Similarity index initialized",
    errorMessage: "Failed to initialize similarity index",
  });

/**
 * Track user interaction for ML learning
 */
export const trackInteraction = () =>
  defineMutation<
    {
      interactionType:
        | "recommendation_shown"
        | "recommendation_accepted"
        | "recommendation_rejected"
        | "recommendation_corrected"
        | "recommendation_ignored"
        | "category_selected"
        | "payee_selected"
        | "threshold_adjusted";
      entityType: string;
      metadata?: Record<string, unknown>;
    },
    { success: boolean }
  >({
    mutationFn: (input) => trpc().mlHealthRoutes.trackInteraction.mutate(input),
    // No success message - this is background tracking
  });

/**
 * Create anomaly alerts for scored transactions
 */
export const createAnomalyAlerts = () =>
  defineMutation<
    {
      transactionIds: number[];
      minRiskLevel?: "medium" | "high" | "critical";
    },
    { alertsCreated: number; alertIds: number[]; scoresProcessed: number }
  >({
    mutationFn: (input) => trpc().anomalyDetectionRoutes.createAlerts.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml", "anomaly"] });
    },
    successMessage: (data) => `Created ${data.alertsCreated} anomaly alerts`,
    errorMessage: "Failed to create anomaly alerts",
  });

/**
 * Run anomaly scan and create alerts
 */
export const scanAndAlert = () =>
  defineMutation<
    {
      days?: number;
      minRiskLevel?: "medium" | "high" | "critical";
    },
    {
      transactionsScanned: number;
      alertsCreated: number;
      alertIds: number[];
      summary: { critical: number; high: number; medium: number };
    }
  >({
    mutationFn: (input) => trpc().anomalyDetectionRoutes.scanAndAlert.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml", "anomaly"] });
    },
    successMessage: (data) =>
      `Scanned ${data.transactionsScanned} transactions, created ${data.alertsCreated} alerts`,
    errorMessage: "Failed to run anomaly scan",
  });

/**
 * Update anomaly alert status
 */
export const updateAlertStatus = () =>
  defineMutation<
    {
      alertId: number;
      status: "reviewed" | "dismissed" | "confirmed";
      notes?: string;
    },
    { success: boolean }
  >({
    mutationFn: (input) => trpc().forecastingRoutes.updateAlertStatus.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml", "anomaly", "alerts"] });
    },
    successMessage: "Alert status updated",
    errorMessage: "Failed to update alert status",
  });

/**
 * Track behavior event for ML learning (via forecasting routes)
 */
export const trackBehavior = () =>
  defineMutation<
    {
      eventType:
        | "recommendation_shown"
        | "recommendation_accepted"
        | "recommendation_rejected"
        | "recommendation_corrected"
        | "recommendation_ignored"
        | "category_changed"
        | "transaction_edited";
      recommendationId?: string;
      entityType?: string;
      entityId?: number;
      eventData?: Record<string, unknown>;
      timeToAction?: number;
    },
    { eventId: number }
  >({
    mutationFn: (input) => trpc().forecastingRoutes.trackBehavior.mutate(input),
    // No success message - this is background tracking
  });

// =============================================================================
// Budget Overspend Prediction Queries
// =============================================================================

/**
 * Get overspend prediction for a specific budget
 */
export const getBudgetPrediction = (budgetId: number) =>
  defineQuery({
    queryKey: ["ml", "budgetPrediction", budgetId] as const,
    queryFn: () =>
      trpc().budgetPredictionRoutes.predict.query({
        budgetId,
      }),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Get overspend predictions for all budgets
 */
export const getAllBudgetPredictions = () =>
  defineQuery({
    queryKey: ["ml", "budgetPrediction", "all"] as const,
    queryFn: () => trpc().budgetPredictionRoutes.predictAll.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Get budgets at risk of overspending
 */
export const getBudgetsAtRisk = (minRisk: "low" | "medium" | "high" | "critical" = "low") =>
  defineQuery({
    queryKey: ["ml", "budgetPrediction", "atRisk", minRisk] as const,
    queryFn: () =>
      trpc().budgetPredictionRoutes.atRisk.query({
        minRisk,
      }),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Get daily spending limit for a budget
 */
export const getDailySpendingLimit = (budgetId: number) =>
  defineQuery({
    queryKey: ["ml", "budgetPrediction", "dailyLimit", budgetId] as const,
    queryFn: () =>
      trpc().budgetPredictionRoutes.dailyLimit.query({
        budgetId,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get budget health summary for dashboard
 */
export const getBudgetHealthSummary = () =>
  defineQuery({
    queryKey: ["ml", "budgetPrediction", "healthSummary"] as const,
    queryFn: () => trpc().budgetPredictionRoutes.healthSummary.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

// =============================================================================
// Income vs Expense Breakdown Queries
// =============================================================================

/**
 * Get comprehensive income/expense breakdown
 */
export const getIncomeExpenseBreakdown = (params?: {
  months?: number;
  forecastHorizon?: number;
  accountId?: number;
}) =>
  defineQuery({
    queryKey: ["ml", "incomeExpense", "breakdown", params] as const,
    queryFn: () =>
      trpc().incomeExpenseRoutes.breakdown.query({
        months: params?.months ?? 12,
        forecastHorizon: params?.forecastHorizon ?? 3,
        accountId: params?.accountId,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get income/expense trends
 */
export const getIncomeExpenseTrends = () =>
  defineQuery({
    queryKey: ["ml", "incomeExpense", "trends"] as const,
    queryFn: () => trpc().incomeExpenseRoutes.trends.query(),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get income/expense summary for dashboard
 */
export const getIncomeExpenseSummary = () =>
  defineQuery({
    queryKey: ["ml", "incomeExpense", "summary"] as const,
    queryFn: () => trpc().incomeExpenseRoutes.summary.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Get period comparison (month/quarter/year)
 */
export const getPeriodComparison = (periodType: "month" | "quarter" | "year") =>
  defineQuery({
    queryKey: ["ml", "incomeExpense", "compare", periodType] as const,
    queryFn: () =>
      trpc().incomeExpenseRoutes.compare.query({
        periodType,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get income/expense history
 */
export const getIncomeExpenseHistory = (months: number = 12, accountId?: number) =>
  defineQuery({
    queryKey: ["ml", "incomeExpense", "history", months, accountId] as const,
    queryFn: () =>
      trpc().incomeExpenseRoutes.history.query({
        months,
        accountId,
      }),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

// =============================================================================
// Savings Opportunities Queries
// =============================================================================

/**
 * Get all savings opportunities
 */
export const getSavingsOpportunities = (params?: { lookbackMonths?: number; minAmount?: number }) =>
  defineQuery({
    queryKey: ["ml", "savings", "all", params] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.getAll.query(params),
    options: {
      staleTime: 1000 * 60 * 15, // 15 minutes - expensive computation
    },
  });

/**
 * Get savings opportunities summary for dashboard
 */
export const getSavingsSummary = () =>
  defineQuery({
    queryKey: ["ml", "savings", "summary"] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.summary.query(),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get unused subscriptions
 */
export const getUnusedSubscriptions = () =>
  defineQuery({
    queryKey: ["ml", "savings", "unusedSubscriptions"] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.unusedSubscriptions.query(),
    options: {
      staleTime: 1000 * 60 * 15, // 15 minutes
    },
  });

/**
 * Get price increases
 */
export const getPriceIncreases = () =>
  defineQuery({
    queryKey: ["ml", "savings", "priceIncreases"] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.priceIncreases.query(),
    options: {
      staleTime: 1000 * 60 * 15, // 15 minutes
    },
  });

/**
 * Get duplicate services
 */
export const getDuplicateServices = () =>
  defineQuery({
    queryKey: ["ml", "savings", "duplicates"] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.duplicates.query(),
    options: {
      staleTime: 1000 * 60 * 15, // 15 minutes
    },
  });

/**
 * Get spending increases
 */
export const getSpendingIncreases = () =>
  defineQuery({
    queryKey: ["ml", "savings", "spendingIncreases"] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.spendingIncreases.query(),
    options: {
      staleTime: 1000 * 60 * 15, // 15 minutes
    },
  });

/**
 * Get high priority savings opportunities
 */
export const getHighPrioritySavings = () =>
  defineQuery({
    queryKey: ["ml", "savings", "highPriority"] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.highPriority.query(),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Get negotiation candidates (bills that could be negotiated for better rates)
 */
export const getNegotiationCandidates = () =>
  defineQuery({
    queryKey: ["ml", "savings", "negotiationCandidates"] as const,
    queryFn: () => trpc().savingsOpportunityRoutes.negotiationCandidates.query(),
    options: {
      staleTime: 1000 * 60 * 15, // 15 minutes
    },
  });

// =============================================================================
// Smart Category Suggestions Queries
// =============================================================================

/**
 * Get smart category suggestions for a transaction
 */
export const getSmartCategorySuggestions = (params: {
  description: string;
  amount: number;
  date: string;
  payeeId?: number;
  payeeName?: string;
  memo?: string;
  isRecurring?: boolean;
  limit?: number;
}) => {
  const { limit, ...transaction } = params;
  return defineQuery({
    queryKey: ["ml", "smartCategory", "suggest", params] as const,
    queryFn: () => trpc().smartCategoryRoutes.suggest.query({ transaction, limit }),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });
};

/**
 * Get top category suggestion
 */
export const getTopCategorySuggestion = (params: {
  description: string;
  amount: number;
  date: string;
  payeeId?: number;
  payeeName?: string;
}) =>
  defineQuery({
    queryKey: ["ml", "smartCategory", "suggestTop", params] as const,
    queryFn: () => trpc().smartCategoryRoutes.suggestTop.query(params),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Analyze transaction type
 */
export const analyzeTransactionType = (params: {
  description: string;
  amount: number;
  date: string;
  payeeId?: number;
  payeeName?: string;
  memo?: string;
  isRecurring?: boolean;
}) =>
  defineQuery({
    queryKey: ["ml", "smartCategory", "analyzeType", params] as const,
    queryFn: () => trpc().smartCategoryRoutes.analyzeType.query(params),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Detect if transaction is a subscription
 */
export const detectSubscription = (params: {
  description: string;
  amount: number;
  date: string;
  payeeId?: number;
  payeeName?: string;
  memo?: string;
  isRecurring?: boolean;
}) =>
  defineQuery({
    queryKey: ["ml", "smartCategory", "detectSubscription", params] as const,
    queryFn: () => trpc().smartCategoryRoutes.detectSubscription.query(params),
    options: {
      staleTime: 1000 * 60 * 10, // 10 minutes
    },
  });

/**
 * Record category selection for learning
 */
export const recordCategorySelection = () =>
  defineMutation<
    {
      transaction: {
        description: string;
        amount: number;
        date: string;
        payeeId?: number;
        payeeName?: string;
        memo?: string;
        isRecurring?: boolean;
      };
      selectedCategoryId: number;
      suggestedCategoryId?: number;
    },
    { success: boolean; message: string }
  >({
    mutationFn: (input) => trpc().smartCategoryRoutes.recordSelection.mutate(input),
    // No success message - this is background tracking
  });

// =============================================================================
// Natural Language Search Queries
// =============================================================================

/**
 * Search transactions using natural language
 */
export const nlSearch = (query: string, limit?: number) =>
  defineQuery({
    queryKey: mlKeys.nlSearch(query, limit),
    queryFn: () => trpc().nlSearchRoutes.search.query({ query, limit }),
    options: {
      staleTime: 1000 * 30, // 30 seconds - search results may change
      enabled: query.trim().length > 0,
    },
  });

/**
 * Parse a natural language query without executing it
 */
export const nlParse = (query: string) =>
  defineQuery({
    queryKey: mlKeys.nlParse(query),
    queryFn: () => trpc().nlSearchRoutes.parse.query({ query }),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes - parsing is deterministic
      enabled: query.trim().length > 0,
    },
  });

/**
 * Get search suggestions based on partial query
 */
export const nlSuggestions = (partialQuery: string) =>
  defineQuery({
    queryKey: mlKeys.nlSuggestions(partialQuery),
    queryFn: () => trpc().nlSearchRoutes.suggestions.query({ partialQuery }),
    options: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: partialQuery.length > 0,
    },
  });

/**
 * Get example queries to help users
 */
export const nlExamples = () =>
  defineQuery({
    queryKey: mlKeys.nlExamples(),
    queryFn: () => trpc().nlSearchRoutes.examples.query(),
    options: {
      staleTime: 1000 * 60 * 60, // 1 hour - examples don't change
    },
  });

// =============================================================================
// Namespace Export
// =============================================================================

export const ML = {
  keys: mlKeys,

  // Health
  getHealthStatus: getMLHealthStatus,

  // Forecasting
  getCashFlowForecast,
  getCategoryForecast,
  getPayeeForecast,
  getBulkCategoryForecasts,

  // Anomaly Detection
  getAnomalyAlerts,
  getTransactionAnomalyScore,
  getBatchTransactionScores,
  scanRecentAnomalies,
  getPayeeAnomalyProfile,

  // Transaction Analysis
  analyzeTransaction,

  // Similarity
  findSimilarPayees,
  getCanonicalGroups,

  // Recurring Detection
  getRecurringSummary,
  getRecurringPatterns,
  getMissingPatterns,

  // User Behavior
  getUserProfile,
  getPersonalizedThreshold,

  // Enhanced Recommendations
  getEnhancedRecommendations,

  // Budget Overspend Prediction
  getBudgetPrediction,
  getAllBudgetPredictions,
  getBudgetsAtRisk,
  getDailySpendingLimit,
  getBudgetHealthSummary,

  // Income vs Expense Breakdown
  getIncomeExpenseBreakdown,
  getIncomeExpenseTrends,
  getIncomeExpenseSummary,
  getPeriodComparison,
  getIncomeExpenseHistory,

  // Savings Opportunities
  getSavingsOpportunities,
  getSavingsSummary,
  getUnusedSubscriptions,
  getPriceIncreases,
  getDuplicateServices,
  getSpendingIncreases,
  getHighPrioritySavings,
  getNegotiationCandidates,

  // Smart Category Suggestions
  getSmartCategorySuggestions,
  getTopCategorySuggestion,
  analyzeTransactionType,
  detectSubscription,

  // Natural Language Search
  nlSearch,
  nlParse,
  nlSuggestions,
  nlExamples,

  // Mutations
  retrainModels,
  initializeSimilarityIndex,
  trackInteraction,
  createAnomalyAlerts,
  scanAndAlert,
  updateAlertStatus,
  trackBehavior,
  recordCategorySelection,
};
