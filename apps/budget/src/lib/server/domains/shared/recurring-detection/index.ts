// Main service
export { RecurringDetectionService, getRecurringDetectionService } from "./service";

// Types
export type {
  AmountAnalysis,
  DetectionMethod,
  DetectionOptions,
  Frequency,
  GroupedTransactions,
  IntervalAnalysis,
  PatternMatchResult,
  PatternType,
  RecurringPattern,
  ScheduleSuggestion,
  TransactionForAnalysis,
} from "./types";

export { FREQUENCY_RANGES, detectionMethods, frequencies, patternTypes } from "./types";

// Analyzers
export {
  analyzeIntervals,
  calculateIntervals,
  calculateConsistency,
  detectTypicalDayOfMonth,
  detectTypicalDayOfWeek,
  determineFrequency,
  matchesBillingPattern,
  predictNextDate,
} from "./analyzers/interval";

export {
  analyzeAmounts,
  areAmountsConsistent,
  calculateAmountVariation,
  detectAmountTrend,
  detectPriceChanges,
  getRepresentativeAmount,
  groupAmountsByRange,
  isAmountOutlier,
} from "./analyzers/amount";

export {
  analyzePattern,
  calculatePatternScore,
  suggestDisplayName,
} from "./analyzers/pattern";

// Pattern database
export {
  BILL_PATTERNS,
  BILLING_CYCLE_PATTERNS,
  INCOME_PATTERNS,
  SUBSCRIPTION_PATTERNS,
  TRANSFER_KEYWORDS,
  TRANSFER_PATTERNS,
  classifyPatternType,
  getTypicalFrequency,
  isAmountInTypicalRange,
} from "./patterns/database";
