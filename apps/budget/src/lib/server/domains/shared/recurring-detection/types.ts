import type { ScheduleSubscriptionType } from "$lib/schema/schedules";

// ==================== FREQUENCY TYPES ====================

export const frequencies = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "irregular",
] as const;

export type Frequency = (typeof frequencies)[number];

// ==================== PATTERN TYPES ====================

export const patternTypes = [
  "subscription", // Streaming, software, memberships
  "bill", // Utilities, rent, insurance
  "income", // Salary, regular deposits
  "transfer", // Between accounts
  "other", // Unclassified recurring
] as const;

export type PatternType = (typeof patternTypes)[number];

// ==================== DETECTION METHOD ====================

export const detectionMethods = [
  "interval_analysis",
  "amount_consistency",
  "pattern_matching",
  "merchant_code",
  "ml_classification",
] as const;

export type DetectionMethod = (typeof detectionMethods)[number];

// ==================== FREQUENCY RANGES ====================

export const FREQUENCY_RANGES: Record<Exclude<Frequency, "irregular">, { min: number; max: number }> = {
  daily: { min: 0.5, max: 1.5 },
  weekly: { min: 6, max: 8 },
  biweekly: { min: 13, max: 16 },
  monthly: { min: 27, max: 33 },
  quarterly: { min: 85, max: 100 },
  semi_annual: { min: 175, max: 195 },
  annual: { min: 355, max: 380 },
};

// ==================== DETECTION OPTIONS ====================

export interface DetectionOptions {
  /**
   * Filter to specific accounts
   */
  accountIds?: number[];

  /**
   * How many months of data to analyze
   * @default 6
   */
  months?: number;

  /**
   * Minimum transactions required to consider a pattern
   * @default 3
   */
  minTransactions?: number;

  /**
   * Minimum confidence score (0-100) to include in results
   * @default 50
   */
  minConfidence?: number;

  /**
   * Minimum amount predictability (0-100)
   * @default 60
   */
  minPredictability?: number;

  /**
   * Include patterns already tracked as schedules
   * @default false
   */
  includeExisting?: boolean;

  /**
   * Filter by pattern type
   */
  patternTypes?: PatternType[];
}

// ==================== RECURRING PATTERN ====================

export interface RecurringPattern {
  // Identity
  payeeId: number;
  payeeName: string;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;

  // Timing
  frequency: Frequency;
  intervalDays: number;
  intervalConsistency: number; // 0-1, how consistent intervals are

  // Amount
  amount: {
    median: number;
    mean: number;
    min: number;
    max: number;
    predictability: number; // 0-100
  };

  // Classification
  patternType: PatternType;
  subscriptionType?: ScheduleSubscriptionType; // If subscription detected

  // Confidence
  overallConfidence: number; // 0-100
  detectionMethods: DetectionMethod[];
  confidenceBreakdown: {
    intervalScore: number;
    amountScore: number;
    patternScore: number;
    occurrenceScore: number;
  };

  // Transaction data
  transactionCount: number;
  transactionIds: number[];
  firstDate: string;
  lastDate: string;
  suggestedNextDate: string;

  // Day patterns
  typicalDayOfMonth?: number;
  typicalDayOfWeek?: number;

  // Flags
  isExpense: boolean;
  existingScheduleId?: number;
}

// ==================== INTERNAL TYPES ====================

export interface TransactionForAnalysis {
  id: number;
  date: string;
  amount: number;
  payeeId: number;
  payeeName: string;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
}

export interface GroupedTransactions {
  payeeId: number;
  payeeName: string;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
  transactions: TransactionForAnalysis[];
  amounts: number[];
  dates: string[];
  isExpense: boolean;
}

export interface IntervalAnalysis {
  intervals: number[];
  average: number;
  stdDev: number;
  consistency: number; // 0-1 (1 = perfectly consistent)
  frequency: Frequency;
}

export interface AmountAnalysis {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  predictability: number; // 0-100
}

export interface PatternMatchResult {
  matched: boolean;
  patternType: PatternType;
  subscriptionType?: ScheduleSubscriptionType;
  confidence: number; // 0-1
  matchedKeywords: string[];
  matchedPatterns: string[];
}

// ==================== SCHEDULE SUGGESTION ====================

export interface ScheduleSuggestion {
  name: string;
  amount: number;
  frequency: Frequency;
  suggestedStartDate: string;
  isSubscription: boolean;
  subscriptionType?: ScheduleSubscriptionType;
  subscriptionStatus?: "active" | "trial";
}
