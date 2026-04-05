import { z } from "zod/v4";

// ==================== SUBSCRIPTION ENUMS ====================

export const subscriptionTypes = [
  "entertainment",
  "utilities",
  "software",
  "membership",
  "communication",
  "finance",
  "shopping",
  "health",
  "education",
  "other",
] as const;

export const billingCycles = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "irregular",
] as const;

export const subscriptionStatuses = [
  "trial",
  "active",
  "paused",
  "cancelled",
  "expired",
  "pending_cancellation",
] as const;

export const usageFrequencies = ["daily", "weekly", "monthly", "rarely", "never"] as const;

export const optimizationStrategies = [
  "cost_reduction",
  "value_maximization",
  "usage_optimization",
  "risk_minimization",
] as const;

export const riskToleranceLevels = ["low", "medium", "high"] as const;

export const cancellationMethods = [
  "online",
  "phone",
  "email",
  "chat",
  "in_person",
  "mail",
] as const;

export const optimizationTypes = [
  "cancel",
  "downgrade",
  "switch",
  "negotiate",
  "bundle",
  "pause",
] as const;

export const detectionMethods = [
  "pattern_matching",
  "frequency_analysis",
  "amount_analysis",
  "merchant_database",
  "category_heuristics",
] as const;

export const riskFactorTypes = [
  "price_increase",
  "usage_decline",
  "duplicate_service",
  "payment_failure",
  "contract_terms",
] as const;

export const severityLevels = ["low", "medium", "high", "critical"] as const;

export const priorityLevels = ["low", "medium", "high", "critical"] as const;

// ==================== TYPE DEFINITIONS ====================

export type SubscriptionType = (typeof subscriptionTypes)[number];
export type BillingCycle = (typeof billingCycles)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type UsageFrequency = (typeof usageFrequencies)[number];
export type OptimizationStrategy = (typeof optimizationStrategies)[number];
export type RiskTolerance = (typeof riskToleranceLevels)[number];
export type CancellationMethod = (typeof cancellationMethods)[number];
export type OptimizationType = (typeof optimizationTypes)[number];
export type DetectionMethod = (typeof detectionMethods)[number];
export type RiskFactorType = (typeof riskFactorTypes)[number];
export type SeverityLevel = (typeof severityLevels)[number];
export type PriorityLevel = (typeof priorityLevels)[number];

// ==================== VALIDATION SCHEMAS ====================

// Basic subscription metadata schema
export const subscriptionMetadataSchema = z.object({
  isSubscription: z.boolean(),
  subscriptionType: z.enum(subscriptionTypes),
  billingCycle: z.enum(billingCycles),
  baseCost: z.number().positive(),
  currency: z.string().default("USD"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  trialPeriod: z
    .object({
      duration: z.number().positive(),
      unit: z.enum(["days", "weeks", "months"]),
      endDate: z.string(),
    })
    .optional(),
  renewalDate: z.string().optional(),
  autoRenewal: z.boolean(),
  cancellationPolicy: z
    .object({
      noticePeriod: z.number().positive(),
      unit: z.enum(["days", "weeks", "months"]),
      penalties: z.array(z.string()),
      refundPolicy: z.string(),
    })
    .optional(),
  usageMetrics: z
    .object({
      trackingEnabled: z.boolean(),
      lastUsed: z.string().optional(),
      usageFrequency: z.enum(usageFrequencies),
      valueScore: z.number().min(0).max(1),
    })
    .optional(),
  costOptimization: z
    .object({
      alternativePlans: z.array(
        z.object({
          planName: z.string(),
          cost: z.number().positive(),
          features: z.array(z.string()),
          savings: z.number(),
          recommendation: z.string(),
        })
      ),
      competitorAnalysis: z.array(
        z.object({
          competitor: z.string(),
          cost: z.number().positive(),
          features: z.array(z.string()),
          pros: z.array(z.string()),
          cons: z.array(z.string()),
        })
      ),
    })
    .optional(),
  contactInfo: z
    .object({
      customerServicePhone: z.string().optional(),
      cancellationPhone: z.string().optional(),
      email: z.string().email({ message: "Invalid email format" }).optional(),
      website: z.string().url({ message: "Invalid URL format" }).optional(),
      accountNumber: z.string().optional(),
    })
    .optional(),
  alerts: z
    .object({
      renewalReminder: z.boolean(),
      priceChangeAlert: z.boolean(),
      usageAlert: z.boolean(),
      unusedAlert: z.boolean(),
    })
    .optional(),
});

// Subscription detection schema
export const subscriptionDetectionSchema = z.object({
  payeeId: z.number().positive(),
  detectionConfidence: z.number().min(0).max(1),
  subscriptionType: z.enum(subscriptionTypes),
  detectionMethods: z.array(
    z.object({
      method: z.enum(detectionMethods),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
    })
  ),
  suggestedMetadata: subscriptionMetadataSchema,
  riskFactors: z.array(
    z.object({
      type: z.enum(riskFactorTypes),
      severity: z.enum(severityLevels),
      description: z.string(),
      recommendation: z.string(),
    })
  ),
});

// Subscription lifecycle schema
export const subscriptionLifecycleSchema = z.object({
  payeeId: z.number().positive(),
  currentStatus: z.enum(subscriptionStatuses),
  lifecycle: z.array(
    z.object({
      status: z.enum(subscriptionStatuses),
      date: z.string(),
      reason: z.string().optional(),
      cost: z.number().optional(),
      notes: z.string().optional(),
    })
  ),
  predictions: z.object({
    nextRenewalDate: z.string().optional(),
    nextRenewalCost: z.number().optional(),
    probabilityOfCancellation: z.number().min(0).max(1),
    reasonsForCancellation: z.array(z.string()),
    valueAssessment: z.object({
      costPerUse: z.number().optional(),
      utilizationRate: z.number().min(0).max(1),
      valueScore: z.number().min(0).max(1),
      recommendation: z.enum(["keep", "downgrade", "cancel", "review"]),
    }),
  }),
  optimizationSuggestions: z.array(
    z.object({
      type: z.enum(optimizationTypes),
      description: z.string(),
      potentialSavings: z.number(),
      confidence: z.number().min(0).max(1),
      actionRequired: z.string(),
      deadline: z.string().optional(),
    })
  ),
});

// Subscription cost analysis schema
export const subscriptionCostAnalysisSchema = z.object({
  payeeId: z.number().positive(),
  totalAnnualCost: z.number(),
  monthlyBreakdown: z.array(
    z.object({
      month: z.string(),
      cost: z.number(),
      transactions: z.number(),
      costPerTransaction: z.number().optional(),
    })
  ),
  costTrends: z.object({
    trend: z.enum(["increasing", "decreasing", "stable", "volatile"]),
    percentageChange: z.number(),
    trendConfidence: z.number().min(0).max(1),
    factors: z.array(z.string()),
  }),
  benchmarking: z.object({
    categoryAverage: z.number(),
    comparedToAverage: z.enum(["above", "below", "average"]),
    percentageDifference: z.number(),
    recommendations: z.array(z.string()),
  }),
  optimizationOpportunities: z.array(
    z.object({
      opportunity: z.string(),
      potentialSavings: z.number(),
      effort: z.enum(["low", "medium", "high"]),
      confidence: z.number().min(0).max(1),
      actionSteps: z.array(z.string()),
    })
  ),
});

// Subscription renewal prediction schema
export const subscriptionRenewalPredictionSchema = z.object({
  payeeId: z.number().positive(),
  nextRenewalDate: z.string(),
  estimatedCost: z.number(),
  confidence: z.number().min(0).max(1),
  factorsInfluencingRenewal: z.array(
    z.object({
      factor: z.enum([
        "usage_pattern",
        "cost_history",
        "payment_reliability",
        "market_alternatives",
        "contract_terms",
      ]),
      impact: z.enum(["positive", "negative", "neutral"]),
      weight: z.number().min(0).max(1),
      description: z.string(),
    })
  ),
  recommendations: z.array(
    z.object({
      action: z.enum([
        "auto_renew",
        "review_before_renewal",
        "consider_cancellation",
        "negotiate_terms",
        "switch_provider",
      ]),
      reasoning: z.string(),
      timeline: z.string(),
      priority: z.enum(priorityLevels),
    })
  ),
  alternativeOptions: z.array(
    z.object({
      option: z.string(),
      cost: z.number(),
      features: z.array(z.string()),
      migrationEffort: z.enum(["low", "medium", "high"]),
      recommendation: z.string(),
    })
  ),
});

// Subscription usage analysis schema
export const subscriptionUsageAnalysisSchema = z.object({
  payeeId: z.number().positive(),
  usageMetrics: z.object({
    frequencyScore: z.number().min(0).max(1),
    intensityScore: z.number().min(0).max(1),
    valueScore: z.number().min(0).max(1),
    trendScore: z.number().min(0).max(1),
  }),
  usagePatterns: z.array(
    z.object({
      period: z.string(),
      frequency: z.number(),
      intensity: z.string(),
      notes: z.array(z.string()),
    })
  ),
  valueAssessment: z.object({
    costPerUse: z.number(),
    costPerMonth: z.number(),
    utilizationRate: z.number().min(0).max(1),
    efficiency: z.enum(["excellent", "good", "fair", "poor", "terrible"]),
    recommendation: z.string(),
  }),
  behaviorInsights: z.array(
    z.object({
      insight: z.string(),
      confidence: z.number().min(0).max(1),
      actionable: z.boolean(),
      recommendation: z.string().optional(),
    })
  ),
});

// Subscription cancellation assistance schema
export const subscriptionCancellationAssistanceSchema = z.object({
  payeeId: z.number().positive(),
  cancellationDifficulty: z.enum(["easy", "moderate", "difficult", "very_difficult"]),
  cancellationMethods: z.array(
    z.object({
      method: z.enum(cancellationMethods),
      difficulty: z.enum(["easy", "moderate", "difficult"]),
      instructions: z.array(z.string()),
      requiredInfo: z.array(z.string()),
      estimatedTime: z.string(),
      successRate: z.number().min(0).max(1),
    })
  ),
  contactInformation: z.object({
    customerService: z.string().optional(),
    cancellationLine: z.string().optional(),
    email: z.string().email({ message: "Invalid email format" }).optional(),
    website: z.string().url({ message: "Invalid URL format" }).optional(),
    hours: z.string().optional(),
  }),
  importantNotes: z.array(
    z.object({
      type: z.enum(["warning", "tip", "requirement", "deadline"]),
      message: z.string(),
      priority: z.enum(priorityLevels),
    })
  ),
  timeline: z.array(
    z.object({
      step: z.string(),
      deadline: z.string().optional(),
      description: z.string(),
      completed: z.boolean(),
    })
  ),
  documentationNeeded: z.array(z.string()),
  potentialObstacles: z.array(
    z.object({
      obstacle: z.string(),
      likelihood: z.number().min(0).max(1),
      mitigation: z.string(),
    })
  ),
});

// Bulk subscription analysis schema
export const bulkSubscriptionAnalysisSchema = z.object({
  totalSubscriptions: z.number(),
  totalMonthlyCost: z.number(),
  totalAnnualCost: z.number(),
  subscriptionsByCategory: z.record(z.string(), z.number()),
  topCostlySubscriptions: z.array(
    z.object({
      payeeId: z.number().positive(),
      name: z.string(),
      cost: z.number(),
      category: z.string(),
    })
  ),
  underutilizedSubscriptions: z.array(
    z.object({
      payeeId: z.number().positive(),
      name: z.string(),
      cost: z.number(),
      utilizationScore: z.number().min(0).max(1),
      recommendation: z.string(),
    })
  ),
  savingsOpportunities: z.object({
    totalPotentialSavings: z.number(),
    easyWins: z.number(),
    recommendations: z.array(
      z.object({
        description: z.string(),
        savings: z.number(),
        affectedSubscriptions: z.number(),
      })
    ),
  }),
});

// ==================== INPUT VALIDATION SCHEMAS ====================

// Subscription detection input
export const detectSubscriptionsInputSchema = z.object({
  payeeIds: z.array(z.number().positive()).optional(),
  includeInactive: z.boolean().default(false),
  minConfidence: z.number().min(0).max(1).default(0.3),
});

// Subscription classification input
export const classifySubscriptionInputSchema = z.object({
  payeeId: z.number().positive(),
  transactionData: z
    .array(
      z.object({
        amount: z.number(),
        date: z.string(),
        description: z.string(),
      })
    )
    .optional(),
});

// Subscription lifecycle analysis input
export const subscriptionLifecycleAnalysisInputSchema = z.object({
  payeeId: z.number().positive(),
});

// Subscription cost analysis input
export const subscriptionCostAnalysisInputSchema = z.object({
  payeeId: z.number().positive(),
  timeframeDays: z.number().positive().default(365),
});

// Subscription renewal predictions input
export const subscriptionRenewalPredictionsInputSchema = z.object({
  payeeIds: z.array(z.number().positive()),
  forecastMonths: z.number().positive().default(12),
});

// Subscription usage analysis input
export const subscriptionUsageAnalysisInputSchema = z.object({
  payeeId: z.number().positive(),
});

// Subscription cancellation assistance input
export const subscriptionCancellationAssistanceInputSchema = z.object({
  payeeId: z.number().positive(),
});

// Subscription optimization recommendations input
export const subscriptionOptimizationRecommendationsInputSchema = z.object({
  payeeIds: z.array(z.number().positive()),
  optimizationGoals: z.object({
    maximizeSavings: z.boolean().default(true),
    maintainValueThreshold: z.number().min(0).max(1).default(0.7),
    riskTolerance: z.enum(riskToleranceLevels).default("medium"),
  }),
});

// Bulk subscription analysis input
export const bulkSubscriptionAnalysisInputSchema = z.object({
  payeeIds: z.array(z.number().positive()).optional(),
  analysisOptions: z.object({
    includeCostBreakdown: z.boolean().default(true),
    includeUsageMetrics: z.boolean().default(true),
    includeOptimizationSuggestions: z.boolean().default(true),
    timeframeDays: z.number().positive().default(365),
  }),
});

// Update subscription metadata input
export const updateSubscriptionMetadataInputSchema = z.object({
  payeeId: z.number().positive(),
  subscriptionMetadata: subscriptionMetadataSchema,
});

// Mark subscription cancelled input
export const markSubscriptionCancelledInputSchema = z.object({
  payeeId: z.number().positive(),
  cancellationDate: z.string(),
  reason: z.string().optional(),
  refundAmount: z.number().optional(),
  notes: z.string().optional(),
});

// Subscription value optimization input
export const subscriptionValueOptimizationInputSchema = z.object({
  payeeIds: z.array(z.number().positive()),
  optimizationStrategy: z.enum(optimizationStrategies).default("value_maximization"),
  constraints: z.object({
    maxCostIncrease: z.number().default(0),
    minValueScore: z.number().min(0).max(1).default(0.6),
    preserveEssentialServices: z.boolean().default(true),
  }),
});

// Subscription competitor analysis input
export const subscriptionCompetitorAnalysisInputSchema = z.object({
  payeeId: z.number().positive(),
  includeFeatureComparison: z.boolean().default(true),
  includePricingTiers: z.boolean().default(true),
});

// Subscription automation rules input
export const subscriptionAutomationRulesInputSchema = z.object({
  payeeId: z.number().positive(),
  rules: z.object({
    autoDetectPriceChanges: z.boolean().default(true),
    autoGenerateUsageReports: z.boolean().default(false),
    autoSuggestOptimizations: z.boolean().default(true),
    autoMarkUnused: z.object({
      enabled: z.boolean().default(false),
      thresholdDays: z.number().positive().default(60),
    }),
    autoRenewalReminders: z.object({
      enabled: z.boolean().default(true),
      daysBefore: z.number().positive().default(7),
    }),
  }),
});

// ==================== INFERRED TYPES ====================

export type SubscriptionMetadata = z.infer<typeof subscriptionMetadataSchema>;
export type SubscriptionDetection = z.infer<typeof subscriptionDetectionSchema>;
export type SubscriptionLifecycle = z.infer<typeof subscriptionLifecycleSchema>;
export type SubscriptionCostAnalysis = z.infer<typeof subscriptionCostAnalysisSchema>;
export type SubscriptionRenewalPrediction = z.infer<typeof subscriptionRenewalPredictionSchema>;
export type SubscriptionUsageAnalysis = z.infer<typeof subscriptionUsageAnalysisSchema>;
export type SubscriptionCancellationAssistance = z.infer<
  typeof subscriptionCancellationAssistanceSchema
>;
export type BulkSubscriptionAnalysis = z.infer<typeof bulkSubscriptionAnalysisSchema>;

// Input types
export type DetectSubscriptionsInput = z.infer<typeof detectSubscriptionsInputSchema>;
export type ClassifySubscriptionInput = z.infer<typeof classifySubscriptionInputSchema>;
export type SubscriptionLifecycleAnalysisInput = z.infer<
  typeof subscriptionLifecycleAnalysisInputSchema
>;
export type SubscriptionCostAnalysisInput = z.infer<typeof subscriptionCostAnalysisInputSchema>;
export type SubscriptionRenewalPredictionsInput = z.infer<
  typeof subscriptionRenewalPredictionsInputSchema
>;
export type SubscriptionUsageAnalysisInput = z.infer<typeof subscriptionUsageAnalysisInputSchema>;
export type SubscriptionCancellationAssistanceInput = z.infer<
  typeof subscriptionCancellationAssistanceInputSchema
>;
export type SubscriptionOptimizationRecommendationsInput = z.infer<
  typeof subscriptionOptimizationRecommendationsInputSchema
>;
export type BulkSubscriptionAnalysisInput = z.infer<typeof bulkSubscriptionAnalysisInputSchema>;
export type UpdateSubscriptionMetadataInput = z.infer<typeof updateSubscriptionMetadataInputSchema>;
export type MarkSubscriptionCancelledInput = z.infer<typeof markSubscriptionCancelledInputSchema>;
export type SubscriptionValueOptimizationInput = z.infer<
  typeof subscriptionValueOptimizationInputSchema
>;
export type SubscriptionCompetitorAnalysisInput = z.infer<
  typeof subscriptionCompetitorAnalysisInputSchema
>;
export type SubscriptionAutomationRulesInput = z.infer<
  typeof subscriptionAutomationRulesInputSchema
>;
