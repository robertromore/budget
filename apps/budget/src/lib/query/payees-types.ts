// Query layer types for payees
// Re-export server types for use in query layer

export type {
  BulkUpdateResult,
  CreatePayeeData, PayeeAnalytics, PayeeWithRelations, PayeeWithStats
} from "$lib/server/domains/payees/services";

export type {
  PayeeIntelligence, PayeeSearchFilters, PayeeStats, PayeeSuggestions, UpdatePayeeData
} from "$lib/server/domains/payees/repository";

export interface UnifiedMLRecommendations {
  payeeId: number;
  recommendations: {
    category: {
      suggested: {
        categoryId: number;
        categoryName: string;
        confidence: number;
      } | null;
      alternatives: Array<{
        categoryId: number;
        categoryName: string;
        confidence: number;
      }>;
    };
    budget: {
      suggested: {
        budgetId: number;
        budgetName: string;
        allocatedAmount: number;
        confidence: number;
      } | null;
      alternatives: Array<{
        budgetId: number;
        budgetName: string;
        allocatedAmount: number;
        confidence: number;
      }>;
    };
    automation: {
      rules: Array<{
        ruleType: "category_assignment" | "budget_allocation" | "notification";
        description: string;
        confidence: number;
        enabled: boolean;
      }>;
    };
  };
  insights: {
    spendingPattern: "regular" | "irregular" | "seasonal" | "declining" | "growing";
    riskLevel: "low" | "medium" | "high";
    dataQuality: "excellent" | "good" | "fair" | "poor";
    suggestions: string[];
  };
}

export interface DuplicateGroup {
  primaryPayeeId: number;
  duplicatePayeeIds: number[];
  similarityScore: number;
  similarities: Array<{
    field: "name" | "phone" | "email" | "website" | "address";
    primaryValue: string;
    duplicateValue: string;
    matchType: "exact" | "fuzzy" | "normalized" | "semantic";
    confidence: number;
  }>;
  recommendedAction: "merge" | "review" | "ignore";
  riskLevel: "low" | "medium" | "high";
}

export interface ContactValidationResult {
  payeeId: number;
  validationResults: {
    phone: {
      isValid: boolean;
      formatted: string | null;
      issues: string[];
    } | null;
    email: {
      isValid: boolean;
      issues: string[];
    } | null;
    website: {
      isValid: boolean;
      issues: string[];
    } | null;
    address: {
      isValid: boolean;
      formatted: any | null;
      issues: string[];
    } | null;
  };
  overallScore: number;
  recommendations: string[];
}

export interface SubscriptionDetectionResult {
  payeeId: number;
  isLikelySubscription: boolean;
  confidence: number;
  detectedPattern: {
    frequency: "weekly" | "monthly" | "quarterly" | "yearly" | null;
    averageAmount: number;
    variability: number;
    lastOccurrence: string | null;
    nextExpected: string | null;
  };
  subscriptionType: "streaming" | "software" | "utility" | "membership" | "other" | null;
  recommendations: string[];
}

export interface BulkOperationResult {
  operationId: string;
  operationType:
    | "bulk_delete"
    | "bulk_status_change"
    | "bulk_category_assignment"
    | "bulk_tag_management"
    | "bulk_intelligence_application"
    | "bulk_cleanup"
    | "merge_duplicates";
  affectedPayeeIds: number[];
  successCount: number;
  failureCount: number;
  errors: Array<{
    payeeId: number;
    error: string;
  }>;
  canUndo: boolean;
  timestamp: string;
}

export interface OperationHistory {
  operations: Array<{
    operationId: string;
    operationType:
      | "bulk_delete"
      | "bulk_status_change"
      | "bulk_category_assignment"
      | "bulk_tag_management"
      | "bulk_intelligence_application"
      | "bulk_cleanup"
      | "merge_duplicates";
    timestamp: string;
    affectedCount: number;
    canUndo: boolean;
    description: string;
  }>;
  totalCount: number;
  hasMore: boolean;
}
