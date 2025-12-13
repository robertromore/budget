/**
 * Shared utility for confidence score color styling
 *
 * Supports both 0-1 (decimal) and 0-100 (percentage) ranges.
 * Auto-normalizes to 0-1 range internally.
 */

export type ConfidenceLevel = "high" | "medium-high" | "medium" | "low" | "none";

export interface ConfidenceColorOptions {
  /** If true, includes background classes. If false, text classes only. Default: false */
  withBackground?: boolean;
  /** Enable 4-tier mode with medium-high (blue). Default: false (3-tier mode) */
  fourTier?: boolean;
  /** Custom thresholds (in 0-1 range). */
  thresholds?: {
    high?: number;
    mediumHigh?: number;
    medium?: number;
  };
}

const defaultThresholds = {
  high: 0.8,
  mediumHigh: 0.7,
  medium: 0.6,
};

const fourTierThresholds = {
  high: 0.9,
  mediumHigh: 0.7,
  medium: 0.5,
};

/**
 * Normalizes a confidence score to the 0-1 range
 * Scores > 1 are assumed to be in 0-100 range
 */
export function normalizeConfidence(score: number | null | undefined): number {
  if (score == null) return 0;
  return score > 1 ? score / 100 : score;
}

/**
 * Gets the confidence level based on score and options
 */
export function getConfidenceLevel(
  score: number | null | undefined,
  options: ConfidenceColorOptions = {}
): ConfidenceLevel {
  const normalized = normalizeConfidence(score);
  const { fourTier = false, thresholds } = options;

  const baseThresholds = fourTier ? fourTierThresholds : defaultThresholds;
  const high = thresholds?.high ?? baseThresholds.high;
  const mediumHigh = thresholds?.mediumHigh ?? baseThresholds.mediumHigh;
  const medium = thresholds?.medium ?? baseThresholds.medium;

  if (normalized >= high) return "high";
  if (fourTier && normalized >= mediumHigh) return "medium-high";
  if (normalized >= medium) return "medium";
  if (normalized > 0) return "low";
  return "none";
}

/**
 * Text-only confidence colors (for use with badges, inline text)
 */
const textOnlyColors: Record<ConfidenceLevel, string> = {
  high: "text-green-600 dark:text-green-400",
  "medium-high": "text-blue-600 dark:text-blue-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-orange-600 dark:text-orange-400",
  none: "text-muted-foreground",
};

/**
 * Background + text confidence colors (for use with cards, badges with bg)
 */
const backgroundColors: Record<ConfidenceLevel, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "medium-high": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  none: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

/**
 * Gets confidence color classes for a given score
 *
 * @param score - Confidence score (0-1 or 0-100, auto-detected)
 * @param options - Optional configuration for styling and thresholds
 * @returns Tailwind CSS classes for the confidence level
 *
 * @example
 * // Text-only (default, 3-tier)
 * getConfidenceColor(0.85) // "text-green-600 dark:text-green-400"
 * getConfidenceColor(85)   // Same as above (auto-normalized)
 *
 * // With background
 * getConfidenceColor(0.7, { withBackground: true })
 * // "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
 *
 * // 4-tier mode (includes blue for medium-high)
 * getConfidenceColor(0.75, { fourTier: true, withBackground: true })
 * // "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
 */
export function getConfidenceColor(
  score: number | null | undefined,
  options: ConfidenceColorOptions = {}
): string {
  const { withBackground = false } = options;
  const level = getConfidenceLevel(score, options);

  return withBackground ? backgroundColors[level] : textOnlyColors[level];
}

/**
 * Formats a confidence score as a percentage string
 *
 * @param score - Confidence score (0-1 or 0-100)
 * @returns Formatted percentage string (e.g., "85%")
 */
export function formatConfidence(score: number | null | undefined): string {
  if (score == null) return "0%";
  const normalized = normalizeConfidence(score);
  return `${Math.round(normalized * 100)}%`;
}
