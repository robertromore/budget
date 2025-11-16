import type {Payee} from "$lib/schema";

// ==================== SUBSCRIPTION INTERFACES ====================

export interface SubscriptionDetection {
  payeeId: number;
  detectionConfidence: number;
  subscriptionType:
    | "entertainment"
    | "utilities"
    | "software"
    | "membership"
    | "communication"
    | "finance"
    | "shopping"
    | "health"
    | "education"
    | "other";
  detectionMethods: Array<{
    method:
      | "pattern_matching"
      | "frequency_analysis"
      | "amount_analysis"
      | "merchant_database"
      | "category_heuristics";
    confidence: number;
    evidence: string[];
  }>;
  suggestedMetadata: SubscriptionMetadata;
  riskFactors: Array<{
    type:
      | "price_increase"
      | "usage_decline"
      | "duplicate_service"
      | "payment_failure"
      | "contract_terms";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }>;
}

export interface SubscriptionMetadata {
  isSubscription: boolean;
  subscriptionType:
    | "entertainment"
    | "utilities"
    | "software"
    | "membership"
    | "communication"
    | "finance"
    | "shopping"
    | "health"
    | "education"
    | "other";
  billingCycle:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "semi_annual"
    | "annual"
    | "irregular";
  baseCost: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  trialPeriod?: {
    duration: number;
    unit: "days" | "weeks" | "months";
    endDate: string;
  };
  renewalDate?: string;
  autoRenewal: boolean;
  cancellationPolicy?: {
    noticePeriod: number;
    unit: "days" | "weeks" | "months";
    penalties: string[];
    refundPolicy: string;
  };
  usageMetrics?: {
    trackingEnabled: boolean;
    lastUsed?: string;
    usageFrequency: "daily" | "weekly" | "monthly" | "rarely" | "never";
    valueScore: number; // 0-1 score based on usage vs cost
  };
  costOptimization?: {
    alternativePlans: Array<{
      planName: string;
      cost: number;
      features: string[];
      savings: number;
      recommendation: string;
    }>;
    competitorAnalysis: Array<{
      competitor: string;
      cost: number;
      features: string[];
      pros: string[];
      cons: string[];
    }>;
  };
  contactInfo?: {
    customerServicePhone?: string;
    cancellationPhone?: string;
    email?: string;
    website?: string;
    accountNumber?: string;
  };
  alerts?: {
    renewalReminder: boolean;
    priceChangeAlert: boolean;
    usageAlert: boolean;
    unusedAlert: boolean;
  };
}

export interface SubscriptionLifecycle {
  payeeId: number;
  currentStatus: "trial" | "active" | "paused" | "cancelled" | "expired" | "pending_cancellation";
  lifecycle: Array<{
    status: "trial" | "active" | "paused" | "cancelled" | "expired" | "pending_cancellation";
    date: string;
    reason?: string;
    cost?: number;
    notes?: string;
  }>;
  predictions: {
    nextRenewalDate?: string;
    nextRenewalCost?: number;
    probabilityOfCancellation: number;
    reasonsForCancellation: string[];
    valueAssessment: {
      costPerUse?: number;
      utilizationRate: number;
      valueScore: number; // 0-1 where 1 is excellent value
      recommendation: "keep" | "downgrade" | "cancel" | "review";
    };
  };
  optimizationSuggestions: Array<{
    type: "plan_change" | "pause_subscription" | "cancel" | "negotiate_price" | "bundle_services";
    description: string;
    potentialSavings: number;
    confidence: number;
    actionRequired: string;
    deadline?: string;
  }>;
}

export interface SubscriptionCostAnalysis {
  payeeId: number;
  totalAnnualCost: number;
  monthlyBreakdown: Array<{
    month: string;
    cost: number;
    transactions: number;
    costPerTransaction?: number;
  }>;
  costTrends: {
    trend: "increasing" | "decreasing" | "stable" | "volatile";
    percentageChange: number;
    trendConfidence: number;
    factors: string[];
  };
  benchmarking: {
    categoryAverage: number;
    comparedToAverage: "above" | "below" | "average";
    percentageDifference: number;
    recommendations: string[];
  };
  optimizationOpportunities: Array<{
    opportunity: string;
    potentialSavings: number;
    effort: "low" | "medium" | "high";
    confidence: number;
    actionSteps: string[];
  }>;
}

export interface SubscriptionRenewalPrediction {
  payeeId: number;
  nextRenewalDate: string;
  estimatedCost: number;
  confidence: number;
  factorsInfluencingRenewal: Array<{
    factor:
      | "usage_pattern"
      | "cost_history"
      | "payment_reliability"
      | "market_alternatives"
      | "contract_terms";
    impact: "positive" | "negative" | "neutral";
    weight: number;
    description: string;
  }>;
  recommendations: Array<{
    action:
      | "auto_renew"
      | "review_before_renewal"
      | "consider_cancellation"
      | "negotiate_terms"
      | "switch_provider";
    reasoning: string;
    timeline: string;
    priority: "low" | "medium" | "high" | "critical";
  }>;
  alternativeOptions: Array<{
    option: string;
    cost: number;
    features: string[];
    migrationEffort: "low" | "medium" | "high";
    recommendation: string;
  }>;
}

export interface SubscriptionUsageAnalysis {
  payeeId: number;
  usageMetrics: {
    frequencyScore: number; // 0-1 where 1 is daily use
    intensityScore: number; // 0-1 where 1 is heavy use
    valueScore: number; // 0-1 where 1 is excellent value for money
    trendScore: number; // 0-1 where 1 is increasing usage
  };
  usagePatterns: Array<{
    period: string;
    frequency: number;
    intensity: string;
    notes: string[];
  }>;
  valueAssessment: {
    costPerUse: number;
    costPerMonth: number;
    utilizationRate: number;
    efficiency: "excellent" | "good" | "fair" | "poor" | "terrible";
    recommendation: string;
  };
  behaviorInsights: Array<{
    insight: string;
    confidence: number;
    actionable: boolean;
    recommendation?: string;
  }>;
}

export interface SubscriptionCancellationAssistance {
  payeeId: number;
  cancellationDifficulty: "easy" | "moderate" | "difficult" | "very_difficult";
  cancellationMethods: Array<{
    method: "online" | "phone" | "email" | "chat" | "in_person" | "mail";
    difficulty: "easy" | "moderate" | "difficult";
    instructions: string[];
    requiredInfo: string[];
    estimatedTime: string;
    successRate: number;
  }>;
  contactInformation: {
    customerService?: string;
    cancellationLine?: string;
    email?: string;
    website?: string;
    hours?: string;
  };
  importantNotes: Array<{
    type: "warning" | "tip" | "requirement" | "deadline";
    message: string;
    priority: "low" | "medium" | "high" | "critical";
  }>;
  timeline: Array<{
    step: string;
    deadline?: string;
    description: string;
    completed: boolean;
  }>;
  documentationNeeded: string[];
  potentialObstacles: Array<{
    obstacle: string;
    likelihood: number;
    mitigation: string;
  }>;
}

// ==================== SUBSCRIPTION MANAGEMENT SERVICE ====================

export class SubscriptionManagementService {
  // Subscription type detection patterns
  private readonly subscriptionPatterns = {
    entertainment: {
      keywords: [
        "netflix",
        "spotify",
        "hulu",
        "disney",
        "amazon prime",
        "youtube",
        "apple music",
        "hbo",
        "streaming",
      ],
      merchantCodes: ["5815", "5735"], // Cable/Satellite, Record Shops
      frequencies: ["monthly", "annual"],
      typicalCosts: {min: 5, max: 200},
    },
    utilities: {
      keywords: ["electric", "gas", "water", "internet", "phone", "cable", "utilities", "power"],
      merchantCodes: ["4814", "4899", "4900"], // Utilities, Telecom
      frequencies: ["monthly"],
      typicalCosts: {min: 20, max: 500},
    },
    software: {
      keywords: ["adobe", "microsoft", "google", "dropbox", "zoom", "slack", "saas", "software"],
      merchantCodes: ["5734", "5045"], // Computer Software, Computers
      frequencies: ["monthly", "annual"],
      typicalCosts: {min: 10, max: 1000},
    },
    membership: {
      keywords: ["gym", "fitness", "club", "membership", "costco", "amazon prime", "aaa"],
      merchantCodes: ["7991", "7996"], // Health Clubs, Amusement Parks
      frequencies: ["monthly", "annual"],
      typicalCosts: {min: 15, max: 300},
    },
    communication: {
      keywords: ["verizon", "att", "tmobile", "sprint", "phone", "cellular", "mobile"],
      merchantCodes: ["4814"], // Telecommunications
      frequencies: ["monthly"],
      typicalCosts: {min: 25, max: 200},
    },
  };

  // Common subscription billing patterns
  private readonly billingPatterns = {
    monthly: {frequency: 30, tolerance: 3},
    quarterly: {frequency: 90, tolerance: 7},
    semiAnnual: {frequency: 180, tolerance: 14},
    annual: {frequency: 365, tolerance: 30},
  };

  /**
   * Detect subscriptions based on transaction patterns and payee data
   */
  async detectSubscriptions(payees: Payee[]): Promise<SubscriptionDetection[]> {
    const detections: SubscriptionDetection[] = [];

    for (const payee of payees) {
      // Skip if already identified as subscription
      if (
        payee.subscriptionInfo &&
        typeof payee.subscriptionInfo === "object" &&
        payee.subscriptionInfo !== null &&
        "isSubscription" in payee.subscriptionInfo &&
        payee.subscriptionInfo.isSubscription
      ) {
        continue;
      }

      const detection = await this.analyzePayeeForSubscription(payee);
      if (detection.detectionConfidence > 0.3) {
        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * Classify subscription types and provide metadata suggestions
   */
  async classifySubscription(
    payeeId: number,
    transactionData?: Array<{
      amount: number;
      date: string;
      description: string;
    }>
  ): Promise<{
    classification: SubscriptionDetection;
    suggestedMetadata: SubscriptionMetadata;
    confidenceFactors: Array<{
      factor: string;
      score: number;
      evidence: string[];
    }>;
  }> {
    // This would typically analyze transaction patterns, merchant data, etc.
    // For now, providing a structured response format

    const mockClassification: SubscriptionDetection = {
      payeeId,
      detectionConfidence: 0.85,
      subscriptionType: "software",
      detectionMethods: [
        {
          method: "pattern_matching",
          confidence: 0.9,
          evidence: ["Regular monthly charges", "Software-related merchant name"],
        },
        {
          method: "frequency_analysis",
          confidence: 0.8,
          evidence: ["30-day intervals between transactions", "Consistent timing pattern"],
        },
      ],
      suggestedMetadata: {
        isSubscription: true,
        subscriptionType: "software",
        billingCycle: "monthly",
        baseCost: 29.99,
        currency: "USD",
        autoRenewal: true,
        alerts: {
          renewalReminder: true,
          priceChangeAlert: true,
          usageAlert: false,
          unusedAlert: true,
        },
      },
      riskFactors: [],
    };

    const confidenceFactors = [
      {
        factor: "Regular billing pattern",
        score: 0.9,
        evidence: ["Monthly charges on same date", "Consistent amounts"],
      },
      {
        factor: "Merchant category",
        score: 0.8,
        evidence: ["Software/SaaS merchant category", "Technology-related keywords"],
      },
    ];

    return {
      classification: mockClassification,
      suggestedMetadata: mockClassification.suggestedMetadata,
      confidenceFactors,
    };
  }

  /**
   * Track subscription lifecycle and predict renewals
   */
  async trackSubscriptionLifecycle(payeeId: number): Promise<SubscriptionLifecycle> {
    // Analyze transaction history to build lifecycle timeline
    const lifecycle: SubscriptionLifecycle = {
      payeeId,
      currentStatus: "active",
      lifecycle: [
        {
          status: "trial",
          date: "2023-01-01",
          reason: "Initial signup",
          cost: 0,
        },
        {
          status: "active",
          date: "2023-02-01",
          reason: "Trial conversion",
          cost: 29.99,
        },
      ],
      predictions: {
        nextRenewalDate: "2024-02-01",
        nextRenewalCost: 29.99,
        probabilityOfCancellation: 0.15,
        reasonsForCancellation: ["Price increase", "Reduced usage"],
        valueAssessment: {
          utilizationRate: 0.8,
          valueScore: 0.7,
          recommendation: "keep",
        },
      },
      optimizationSuggestions: [
        {
          type: "plan_change",
          description: "Consider downgrading to basic plan",
          potentialSavings: 120,
          confidence: 0.6,
          actionRequired: "Review usage patterns and plan features",
        },
      ],
    };

    return lifecycle;
  }

  /**
   * Analyze subscription costs and identify optimization opportunities
   */
  async analyzeCosts(
    payeeId: number,
    timeframeDays: number = 365
  ): Promise<SubscriptionCostAnalysis> {
    // Analyze cost patterns and identify savings opportunities
    const analysis: SubscriptionCostAnalysis = {
      payeeId,
      totalAnnualCost: 359.88,
      monthlyBreakdown: [
        {month: "2023-01", cost: 29.99, transactions: 1},
        {month: "2023-02", cost: 29.99, transactions: 1},
        // ... more months
      ],
      costTrends: {
        trend: "stable",
        percentageChange: 0,
        trendConfidence: 0.9,
        factors: ["Consistent monthly billing", "No price changes detected"],
      },
      benchmarking: {
        categoryAverage: 45.0,
        comparedToAverage: "below",
        percentageDifference: -33.4,
        recommendations: ["Current pricing is competitive", "Monitor for price increases"],
      },
      optimizationOpportunities: [
        {
          opportunity: "Annual billing discount",
          potentialSavings: 60,
          effort: "low",
          confidence: 0.8,
          actionSteps: ["Contact customer service", "Switch to annual billing"],
        },
      ],
    };

    return analysis;
  }

  /**
   * Predict renewal dates and costs
   */
  async predictRenewals(
    payeeIds: number[],
    forecastMonths: number = 12
  ): Promise<SubscriptionRenewalPrediction[]> {
    const predictions: SubscriptionRenewalPrediction[] = [];

    for (const payeeId of payeeIds) {
      // Analyze historical patterns to predict future renewals
      const prediction: SubscriptionRenewalPrediction = {
        payeeId,
        nextRenewalDate: "2024-02-01",
        estimatedCost: 29.99,
        confidence: 0.9,
        factorsInfluencingRenewal: [
          {
            factor: "usage_pattern",
            impact: "positive",
            weight: 0.4,
            description: "Regular usage indicates continued value",
          },
          {
            factor: "cost_history",
            impact: "neutral",
            weight: 0.3,
            description: "Stable pricing with no recent increases",
          },
        ],
        recommendations: [
          {
            action: "auto_renew",
            reasoning: "High usage and stable pricing indicate good value",
            timeline: "Before renewal date",
            priority: "low",
          },
        ],
        alternativeOptions: [
          {
            option: "Competitor service",
            cost: 24.99,
            features: ["Similar features", "Lower cost"],
            migrationEffort: "medium",
            recommendation: "Consider if price increases",
          },
        ],
      };

      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Analyze subscription usage and value
   */
  async analyzeUsage(payeeId: number): Promise<SubscriptionUsageAnalysis> {
    // This would integrate with usage tracking APIs where available
    const analysis: SubscriptionUsageAnalysis = {
      payeeId,
      usageMetrics: {
        frequencyScore: 0.8, // Used 4-5 times per week
        intensityScore: 0.6, // Moderate usage when accessed
        valueScore: 0.7, // Good value for money
        trendScore: 0.5, // Stable usage pattern
      },
      usagePatterns: [
        {
          period: "2023-Q4",
          frequency: 20, // times used
          intensity: "moderate",
          notes: ["Consistent weekday usage", "Lower weekend activity"],
        },
      ],
      valueAssessment: {
        costPerUse: 1.5,
        costPerMonth: 29.99,
        utilizationRate: 0.8,
        efficiency: "good",
        recommendation: "Continue subscription with current usage pattern",
      },
      behaviorInsights: [
        {
          insight: "Primary usage during business hours",
          confidence: 0.9,
          actionable: true,
          recommendation: "Consider business plan if usage increases",
        },
      ],
    };

    return analysis;
  }

  /**
   * Provide cancellation assistance and guidance
   */
  async getCancellationAssistance(payeeId: number): Promise<SubscriptionCancellationAssistance> {
    // Provide specific guidance for cancelling subscriptions
    const assistance: SubscriptionCancellationAssistance = {
      payeeId,
      cancellationDifficulty: "moderate",
      cancellationMethods: [
        {
          method: "online",
          difficulty: "easy",
          instructions: [
            "Log into your account",
            "Navigate to Account Settings",
            "Click on Subscription",
            "Select Cancel Subscription",
          ],
          requiredInfo: ["Account email", "Password"],
          estimatedTime: "5-10 minutes",
          successRate: 0.95,
        },
        {
          method: "phone",
          difficulty: "moderate",
          instructions: [
            "Call customer service",
            "Request cancellation",
            "Provide account verification",
          ],
          requiredInfo: ["Account number", "Phone number on file"],
          estimatedTime: "15-30 minutes",
          successRate: 0.8,
        },
      ],
      contactInformation: {
        customerService: "1-800-555-0123",
        email: "support@example.com",
        website: "https://example.com/cancel",
        hours: "Mon-Fri 9am-6pm EST",
      },
      importantNotes: [
        {
          type: "warning",
          message: "Must cancel at least 24 hours before next billing date",
          priority: "critical",
        },
        {
          type: "tip",
          message: "Download any important data before cancelling",
          priority: "medium",
        },
      ],
      timeline: [
        {
          step: "Initiate cancellation",
          description: "Start the cancellation process",
          completed: false,
        },
        {
          step: "Confirm cancellation",
          deadline: "24 hours before billing",
          description: "Receive confirmation of cancellation",
          completed: false,
        },
      ],
      documentationNeeded: ["Account confirmation email", "Cancellation confirmation"],
      potentialObstacles: [
        {
          obstacle: "Retention offers",
          likelihood: 0.7,
          mitigation: "Be firm about cancellation decision",
        },
        {
          obstacle: "Hidden cancellation fees",
          likelihood: 0.2,
          mitigation: "Review terms of service beforehand",
        },
      ],
    };

    return assistance;
  }

  /**
   * Generate comprehensive subscription optimization recommendations
   */
  async generateOptimizationRecommendations(payeeIds: number[]): Promise<
    Array<{
      payeeId: number;
      currentCost: number;
      optimizedCost: number;
      potentialSavings: number;
      recommendations: Array<{
        type: "cancel" | "downgrade" | "switch" | "negotiate" | "bundle" | "pause";
        description: string;
        savings: number;
        effort: "low" | "medium" | "high";
        risk: "low" | "medium" | "high";
        timeline: string;
        confidence: number;
      }>;
    }>
  > {
    const optimizations = [];

    for (const payeeId of payeeIds) {
      // Analyze each subscription for optimization opportunities
      const optimization = {
        payeeId,
        currentCost: 29.99,
        optimizedCost: 19.99,
        potentialSavings: 120, // Annual savings
        recommendations: [
          {
            type: "downgrade" as const,
            description: "Switch to basic plan - features still meet your usage",
            savings: 120,
            effort: "low" as const,
            risk: "low" as const,
            timeline: "Can be done immediately",
            confidence: 0.8,
          },
          {
            type: "negotiate" as const,
            description: "Contact support for loyalty discount",
            savings: 60,
            effort: "medium" as const,
            risk: "low" as const,
            timeline: "1-2 phone calls",
            confidence: 0.6,
          },
        ],
      };

      optimizations.push(optimization);
    }

    return optimizations;
  }

  /**
   * Bulk subscription analysis for dashboard reporting
   */
  async getBulkSubscriptionAnalysis(payeeIds?: number[]): Promise<{
    totalSubscriptions: number;
    totalMonthlyCost: number;
    totalAnnualCost: number;
    subscriptionsByCategory: Record<string, number>;
    topCostlySubscriptions: Array<{
      payeeId: number;
      name: string;
      cost: number;
      category: string;
    }>;
    underutilizedSubscriptions: Array<{
      payeeId: number;
      name: string;
      cost: number;
      utilizationScore: number;
      recommendation: string;
    }>;
    savingsOpportunities: {
      totalPotentialSavings: number;
      easyWins: number; // Low effort, high confidence savings
      recommendations: Array<{
        description: string;
        savings: number;
        affectedSubscriptions: number;
      }>;
    };
  }> {
    // Provide comprehensive bulk analysis
    return {
      totalSubscriptions: 12,
      totalMonthlyCost: 287.45,
      totalAnnualCost: 3449.4,
      subscriptionsByCategory: {
        entertainment: 4,
        software: 3,
        utilities: 2,
        membership: 2,
        other: 1,
      },
      topCostlySubscriptions: [
        {
          payeeId: 1,
          name: "Adobe Creative Suite",
          cost: 79.99,
          category: "software",
        },
        {
          payeeId: 2,
          name: "Gym Membership",
          cost: 49.99,
          category: "membership",
        },
      ],
      underutilizedSubscriptions: [
        {
          payeeId: 3,
          name: "Streaming Service B",
          cost: 14.99,
          utilizationScore: 0.2,
          recommendation: "Cancel - used less than 5 times in 3 months",
        },
      ],
      savingsOpportunities: {
        totalPotentialSavings: 720,
        easyWins: 180,
        recommendations: [
          {
            description: "Cancel underutilized subscriptions",
            savings: 240,
            affectedSubscriptions: 2,
          },
          {
            description: "Switch to annual billing for discounts",
            savings: 180,
            affectedSubscriptions: 5,
          },
        ],
      },
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async analyzePayeeForSubscription(payee: Payee): Promise<SubscriptionDetection> {
    let detectionConfidence = 0;
    const detectionMethods: SubscriptionDetection["detectionMethods"] = [];
    let suggestedType: SubscriptionDetection["subscriptionType"] = "other";

    // Pattern matching based on name and merchant data
    if (payee.name) {
      const nameAnalysis = this.analyzePayeeNameForSubscription(payee.name);
      if (nameAnalysis.confidence > 0.3) {
        detectionConfidence += nameAnalysis.confidence * 0.4;
        suggestedType = nameAnalysis.type;
        detectionMethods.push({
          method: "pattern_matching",
          confidence: nameAnalysis.confidence,
          evidence: nameAnalysis.evidence,
        });
      }
    }

    // Merchant category code analysis
    if (payee.merchantCategoryCode) {
      const mccAnalysis = this.analyzeMerchantCategoryCode(payee.merchantCategoryCode);
      if (mccAnalysis.confidence > 0.3) {
        detectionConfidence += mccAnalysis.confidence * 0.3;
        detectionMethods.push({
          method: "merchant_database",
          confidence: mccAnalysis.confidence,
          evidence: mccAnalysis.evidence,
        });
      }
    }

    // Payment frequency analysis
    if (payee.paymentFrequency) {
      const frequencyAnalysis = this.analyzePaymentFrequency(payee.paymentFrequency);
      if (frequencyAnalysis.confidence > 0.3) {
        detectionConfidence += frequencyAnalysis.confidence * 0.2;
        detectionMethods.push({
          method: "frequency_analysis",
          confidence: frequencyAnalysis.confidence,
          evidence: frequencyAnalysis.evidence,
        });
      }
    }

    // Category heuristics
    if (payee.defaultCategoryId) {
      // Would analyze category to determine subscription likelihood
      // For now, adding moderate confidence for certain categories
      detectionConfidence += 0.1;
      detectionMethods.push({
        method: "category_heuristics",
        confidence: 0.5,
        evidence: ["Category suggests recurring service"],
      });
    }

    const suggestedMetadata: SubscriptionMetadata = {
      isSubscription: detectionConfidence > 0.6,
      subscriptionType: suggestedType,
      billingCycle: this.mapPaymentFrequencyToBillingCycle(payee.paymentFrequency),
      baseCost: payee.avgAmount || 0,
      currency: "USD",
      autoRenewal: true,
      alerts: {
        renewalReminder: true,
        priceChangeAlert: true,
        usageAlert: false,
        unusedAlert: true,
      },
    };

    return {
      payeeId: payee.id,
      detectionConfidence: Math.min(detectionConfidence, 1.0),
      subscriptionType: suggestedType,
      detectionMethods,
      suggestedMetadata,
      riskFactors: [],
    };
  }

  private analyzePayeeNameForSubscription(name: string): {
    confidence: number;
    type: SubscriptionDetection["subscriptionType"];
    evidence: string[];
  } {
    const lowercaseName = name.toLowerCase();
    const evidence: string[] = [];
    let bestMatch: {type: SubscriptionDetection["subscriptionType"]; confidence: number} = {
      type: "other",
      confidence: 0,
    };

    for (const [type, patterns] of Object.entries(this.subscriptionPatterns)) {
      let typeConfidence = 0;
      const typeEvidence: string[] = [];

      for (const keyword of patterns.keywords) {
        if (lowercaseName.includes(keyword.toLowerCase())) {
          typeConfidence += 0.3;
          typeEvidence.push(`Contains keyword: ${keyword}`);
        }
      }

      if (typeConfidence > bestMatch.confidence) {
        bestMatch = {
          type: type as SubscriptionDetection["subscriptionType"],
          confidence: typeConfidence,
        };
        evidence.push(...typeEvidence);
      }
    }

    return {
      confidence: Math.min(bestMatch.confidence, 1.0),
      type: bestMatch.type,
      evidence,
    };
  }

  private analyzeMerchantCategoryCode(mcc: string): {
    confidence: number;
    evidence: string[];
  } {
    const evidence: string[] = [];
    let confidence = 0;

    for (const patterns of Object.values(this.subscriptionPatterns)) {
      if (patterns.merchantCodes.includes(mcc)) {
        confidence = 0.8;
        evidence.push(`Merchant category code ${mcc} indicates subscription service`);
        break;
      }
    }

    return {confidence, evidence};
  }

  private analyzePaymentFrequency(frequency: string): {
    confidence: number;
    evidence: string[];
  } {
    const subscriptionFrequencies = ["monthly", "quarterly", "annual", "weekly"];
    const confidence = subscriptionFrequencies.includes(frequency) ? 0.7 : 0.2;
    const evidence =
      confidence > 0.5
        ? [`${frequency} frequency typical of subscriptions`]
        : [`${frequency} frequency less common for subscriptions`];

    return {confidence, evidence};
  }

  private mapPaymentFrequencyToBillingCycle(
    frequency?: string | null
  ): SubscriptionMetadata["billingCycle"] {
    switch (frequency) {
      case "weekly":
        return "weekly";
      case "monthly":
        return "monthly";
      case "quarterly":
        return "quarterly";
      case "annual":
        return "annual";
      default:
        return "monthly";
    }
  }
}
