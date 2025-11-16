/**
 * Payees domain type definitions
 *
 * This file contains type definitions for payee-related operations including
 * ML intelligence, contact management, subscriptions, and budget allocation.
 */

import type {Payee, PayeeType, PaymentFrequency} from "$lib/schema/payees";
import type {Category} from "$lib/schema/categories";
import type {Budget} from "$lib/schema/budgets";

/**
 * Subscription information for recurring payees
 */
export interface SubscriptionInfo {
  monthlyCost: number;
  renewalDate: string; // ISO date string
  cancellationInfo?: {
    url?: string;
    phone?: string;
    method: "online" | "phone" | "email";
  };
  isActive: boolean;
  billingCycle?: "monthly" | "quarterly" | "yearly";
  trialEndDate?: string; // ISO date string
  notes?: string;
}

/**
 * Structured address information
 */
export interface PayeeAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
}

// Alias for consistency with other domains
export type AddressData = PayeeAddress;

/**
 * Preferred payment methods for a payee
 */
export type PaymentMethodReference = number; // Account ID reference

/**
 * Tags for payee categorization and filtering
 */
export type PayeeTags = string[];

/**
 * Payee database result with relations
 */
export interface PayeeWithRelations extends Payee {
  defaultCategory?: Category | null;
  defaultBudget?: Budget | null;
}

/**
 * Payee update data
 * Type-safe alternative to 'updateData: any'
 */
export interface PayeeUpdateData {
  name?: string;
  slug?: string;
  notes?: string | null;
  defaultCategoryId?: number | null;
  defaultBudgetId?: number | null;
  payeeType?: PayeeType | null;
  avgAmount?: number | null;
  paymentFrequency?: PaymentFrequency | null;
  lastTransactionDate?: string | null;
  taxRelevant?: boolean;
  isActive?: boolean;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: AddressData | null;
  accountNumber?: string | null;
  alertThreshold?: number | null;
  isSeasonal?: boolean;
  subscriptionInfo?: SubscriptionInfo | null;
  tags?: string | null;
  preferredPaymentMethods?: string | null;
  merchantCategoryCode?: string | null;
  updatedAt?: string;
  deletedAt?: string | null;
}

/**
 * Spending analysis data
 * Used in budget allocation and ML systems
 */
export interface SpendingAnalysis {
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  standardDeviation: number;
  trend: "increasing" | "decreasing" | "stable";
  periodStart: string;
  periodEnd: string;
}

/**
 * Budget efficiency metrics
 */
export interface BudgetEfficiency {
  utilizationRate: number; // 0-1 scale
  overBudgetCount: number;
  underBudgetCount: number;
  averageVariance: number;
  consistencyScore: number; // 0-1 scale
}

/**
 * Risk assessment data
 */
export interface RiskAssessment {
  level: "low" | "medium" | "high";
  factors: string[];
  score: number; // 0-1 scale
  recommendations: string[];
}

/**
 * Temporal context for ML predictions
 */
export interface TemporalContext {
  dayOfWeek: number;
  dayOfMonth: number;
  month: number;
  quarter: number;
  isWeekend: boolean;
  isHoliday?: boolean;
}

/**
 * ML prediction result
 */
export interface MLPrediction {
  categoryId: number | null;
  budgetId: number | null;
  amount: number | null;
  confidence: number; // 0-1 scale
  reasoning: string[];
}

/**
 * Field change tracking
 */
export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  confidence: number;
}

/**
 * Field recommendation
 */
export interface FieldRecommendation {
  field: string;
  suggestion: unknown;
  confidence: number;
  reason: string;
}

/**
 * Payee intelligence summary
 */
export interface PayeeIntelligenceSummary {
  changes: FieldChange[];
  recommendations: FieldRecommendation[];
  confidence: number;
  lastUpdated: string;
}

/**
 * Contact data for payee
 */
export interface ContactData {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: AddressData | null;
}

/**
 * Standardized address result
 */
export interface StandardizedAddress {
  standardized: AddressData;
  confidence: number;
  corrections: string[];
}

/**
 * Contact validation result
 */
export interface ContactValidationResult {
  isValid: boolean;
  errors: Array<{field: string; message: string}>;
  suggestions: Array<{field: string; value: unknown; confidence: number}>;
}

/**
 * Contact field with metadata
 */
export interface ContactField {
  field: string;
  value: unknown;
  lastVerified?: string;
  source?: string;
}

/**
 * Payee merge conflict
 */
export interface PayeeMergeConflict {
  field: string;
  primaryValue: unknown;
  duplicateValue: unknown;
  resolution: string;
}

/**
 * Payee merge result
 */
export interface PayeeMergeResult {
  mergedPayee: Payee;
  conflicts: PayeeMergeConflict[];
  preservedData: Record<string, unknown>;
  transactionsMoved: number;
}

/**
 * Frequency analysis result
 */
export interface FrequencyAnalysis {
  detectedFrequency: PaymentFrequency | null;
  confidence: number;
  averageDaysBetween: number;
  variance: number;
}

/**
 * Behavior change detection
 */
export interface BehaviorChangeDetection {
  detected: boolean;
  changeType:
    | "category_shift"
    | "spending_pattern"
    | "frequency"
    | "seasonal_drift"
    | "amount_variance";
  significance: number; // 0-1 scale
  details: Record<string, unknown>;
  monitoringPlan?: {
    checkFrequency: string;
    alertThreshold: number;
    actions: string[];
  };
}

/**
 * ML system reliability assessment
 */
export interface SystemReliabilityAssessment {
  overallConfidence: number; // 0-1 scale
  dataQuality: {
    completeness: number;
    consistency: number;
    recency: number;
  };
  systemPerformance: {
    categoryAccuracy: number;
    budgetAccuracy: number;
    amountAccuracy: number;
  };
  recommendations: string[];
}

/**
 * Applied intelligence change
 */
export interface AppliedChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Intelligence application result
 */
export interface IntelligenceApplicationResult {
  applied: AppliedChange[];
  skipped: string[];
  errors: Array<{field: string; error: string}>;
}

/**
 * Anonymized export data
 */
export interface AnonymizedPayeeData {
  name: string;
  payeeType?: PayeeType | null;
  address?: AddressData;
  anonymizedAddress?: AddressData;
  avgAmount?: number | null;
  paymentFrequency?: PaymentFrequency | null;
  isActive: boolean;
  taxRelevant: boolean;
}
