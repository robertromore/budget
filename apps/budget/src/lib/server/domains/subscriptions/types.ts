import type {
  InsertSubscription,
  InsertSubscriptionAlert,
  InsertSubscriptionPriceHistory,
  Subscription,
  SubscriptionAlert,
  SubscriptionPriceHistory,
  SubscriptionWithRelations,
} from "$lib/schema/subscriptions-table";
import type {
  BillingCycle,
  SubscriptionStatus,
  SubscriptionType,
} from "$lib/schema/subscriptions";

// ==================== RE-EXPORTS ====================

export type {
  Subscription,
  InsertSubscription,
  SubscriptionPriceHistory,
  InsertSubscriptionPriceHistory,
  SubscriptionAlert,
  InsertSubscriptionAlert,
  SubscriptionWithRelations,
};

// ==================== DETECTION TYPES ====================

export interface DetectionMethod {
  method: "pattern_matching" | "frequency_analysis" | "amount_analysis" | "merchant_database" | "category_heuristics" | "user_confirmation";
  confidence: number;
  evidence: string[];
}

export interface DetectionResult {
  payeeId: number;
  payeeName: string;
  detectionConfidence: number;
  subscriptionType: SubscriptionType;
  billingCycle: BillingCycle;
  estimatedAmount: number;
  detectionMethods: DetectionMethod[];
  suggestedName: string;
  accountId?: number;
  existingSubscriptionId?: number;
  isAlreadyTracked: boolean;
}

export interface DetectionOptions {
  payeeIds?: number[];
  includeAlreadyTracked?: boolean;
  minConfidence?: number;
  accountId?: number;
}

export interface TransactionBasedDetectionOptions {
  accountIds?: number[];
  months?: number; // Default 6
  minTransactions?: number; // Minimum transactions to consider a pattern (default 3)
  minConfidence?: number; // Minimum confidence % to include (default 50)
  minPredictability?: number; // Minimum amount predictability % (default 60)
}

export interface TransactionBasedDetectionResult {
  payeeId: number;
  payeeName: string;
  accountId: number;
  accountName?: string;
  detectionConfidence: number;
  subscriptionType: import("$lib/schema/subscriptions").SubscriptionType;
  billingCycle: import("$lib/schema/subscriptions").BillingCycle;
  estimatedAmount: number;
  amountVariance: number;
  transactionCount: number;
  transactionIds: number[];
  intervalDays: number;
  intervalVariance: number;
  predictability: number;
  firstTransactionDate: string;
  lastTransactionDate: string;
  suggestedStartDate: string;
  suggestedRenewalDate: string;
  isAlreadyTracked: boolean;
  existingSubscriptionId?: number;
  categoryId?: number;
  categoryName?: string;
  detectionMethods: DetectionMethod[];
}

// ==================== SERVICE INPUT TYPES ====================

export interface CreateSubscriptionInput {
  payeeId?: number | null;
  accountId?: number | null;
  name: string;
  type: SubscriptionType;
  billingCycle: BillingCycle;
  amount: number;
  currency?: string | null;
  status?: SubscriptionStatus | null;
  startDate?: string | null;
  renewalDate?: string | null;
  trialEndsAt?: string | null;
  detectionConfidence?: number | null;
  isManuallyAdded?: boolean | null;
  isUserConfirmed?: boolean | null;
  autoRenewal?: boolean | null;
  metadata?: Record<string, unknown> | null;
  alertPreferences?: {
    renewalReminder?: boolean;
    renewalReminderDays?: number;
    priceChangeAlert?: boolean;
    unusedAlert?: boolean;
    unusedAlertDays?: number;
  } | null;
}

export interface UpdateSubscriptionInput {
  id: number;
  payeeId?: number | null;
  accountId?: number | null;
  name?: string;
  type?: SubscriptionType;
  billingCycle?: BillingCycle;
  amount?: number;
  currency?: string | null;
  status?: SubscriptionStatus | null;
  startDate?: string | null;
  renewalDate?: string | null;
  cancelledAt?: string | null;
  trialEndsAt?: string | null;
  isUserConfirmed?: boolean | null;
  autoRenewal?: boolean | null;
  metadata?: Record<string, unknown> | null;
  alertPreferences?: {
    renewalReminder?: boolean;
    renewalReminderDays?: number;
    priceChangeAlert?: boolean;
    unusedAlert?: boolean;
    unusedAlertDays?: number;
  } | null;
}

export interface ConfirmDetectionInput {
  payeeId: number;
  name?: string;
  type?: SubscriptionType;
  billingCycle?: BillingCycle;
  amount?: number;
  accountId?: number;
  renewalDate?: string;
}

export interface RejectDetectionInput {
  payeeId: number;
}

// ==================== PRICE TRACKING TYPES ====================

export interface RecordPriceChangeInput {
  subscriptionId: number;
  newAmount: number;
  effectiveDate?: string;
  transactionId?: number;
}

export interface PriceChange {
  subscriptionId: number;
  subscriptionName: string;
  oldAmount: number;
  newAmount: number;
  changePercentage: number;
  effectiveDate: string;
  transactionId?: number;
}

// ==================== ALERT TYPES ====================

export interface CreateAlertInput {
  subscriptionId: number;
  alertType: SubscriptionAlert["alertType"];
  triggerDate: string;
  metadata?: Record<string, unknown>;
}

export interface AlertWithSubscription extends SubscriptionAlert {
  subscription: Subscription;
}

// ==================== ANALYTICS TYPES ====================

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  byStatus: Record<string, number>;
  byType: Record<string, { count: number; monthlyCost: number }>;
  byBillingCycle: Record<string, number>;
  averageSubscriptionCost: number;
  priceChangeStats: {
    totalIncreases: number;
    totalDecreases: number;
    averageIncreasePercent: number;
  };
  upcomingRenewals: number;
  trialEnding: number;
}

export interface CalendarEntry {
  date: string;
  subscriptions: Array<{
    id: number;
    name: string;
    amount: number;
    type: SubscriptionType;
    eventType: "renewal" | "trial_end" | "cancelled";
  }>;
  totalAmount: number;
}

// ==================== QUERY FILTERS ====================

export interface SubscriptionFilters {
  status?: SubscriptionStatus | SubscriptionStatus[];
  type?: SubscriptionType | SubscriptionType[];
  billingCycle?: BillingCycle | BillingCycle[];
  accountId?: number;
  payeeId?: number;
  minAmount?: number;
  maxAmount?: number;
  isManuallyAdded?: boolean;
  isUserConfirmed?: boolean;
  search?: string;
}

export interface SubscriptionSortOptions {
  field: "name" | "amount" | "renewalDate" | "createdAt" | "type" | "status";
  direction: "asc" | "desc";
}
