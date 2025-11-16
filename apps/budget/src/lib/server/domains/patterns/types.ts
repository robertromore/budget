import type { SuggestedScheduleConfig } from "$lib/schema/detected-patterns";

/**
 * Detection criteria for pattern analysis
 */
export interface DetectionCriteria {
  /** Minimum number of occurrences required to consider a pattern (default: 3) */
  minOccurrences: number;
  /** Acceptable amount variance as a percentage (default: 10%) */
  amountVariancePercent: number;
  /** Tolerance in days for each frequency type */
  intervalToleranceDays: {
    daily: number; // ±1 day
    weekly: number; // ±2 days
    monthly: number; // ±3 days
    yearly: number; // ±7 days
  };
  /** Minimum confidence score to accept a pattern (default: 70) */
  minConfidenceScore: number;
  /** How many months back to analyze (default: 12) */
  lookbackMonths: number;
  /** Number of transactions to process per batch (default: 1000) */
  batchSize: number;
}

/**
 * Default detection criteria
 */
export const DEFAULT_DETECTION_CRITERIA: DetectionCriteria = {
  minOccurrences: 3,
  amountVariancePercent: 10,
  intervalToleranceDays: {
    daily: 1,
    weekly: 2,
    monthly: 3,
    yearly: 7,
  },
  minConfidenceScore: 70,
  lookbackMonths: 12,
  batchSize: 1000,
};

/**
 * Detected pattern with all calculated data
 */
export interface DetectedPatternData {
  accountId: number;
  patternType: "daily" | "weekly" | "monthly" | "yearly";
  confidenceScore: number;
  sampleTransactionIds: number[];
  payeeId: number | null;
  categoryId: number | null;
  amountMin: number;
  amountMax: number;
  amountAvg: number;
  intervalDays: number;
  lastOccurrence: string;
  nextExpected: string;
  suggestedScheduleConfig: SuggestedScheduleConfig;
}

/**
 * Transaction data for pattern detection
 */
export interface TransactionForDetection {
  id: number;
  accountId: number;
  date: string;
  amount: number;
  payeeId: number | null;
  categoryId: number | null;
  scheduleId: number | null;
  isTransfer: boolean;
  deletedAt: string | null;
}

/**
 * Grouped transactions with similarity
 */
export interface TransactionGroup {
  payeeId: number | null;
  categoryId: number | null;
  avgAmount: number;
  transactions: TransactionForDetection[];
}

/**
 * Interval data between transactions
 */
export interface IntervalData {
  daysBetween: number;
  fromDate: string;
  toDate: string;
  fromTransactionId: number;
  toTransactionId: number;
}

/**
 * Pattern candidate with interval analysis
 */
export interface PatternCandidate {
  group: TransactionGroup;
  intervals: IntervalData[];
  avgInterval: number;
  intervalVariance: number;
  patternType: "daily" | "weekly" | "monthly" | "yearly" | null;
}
