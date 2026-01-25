import { mean, standardDeviation, median } from "$lib/utils/chart-statistics";
import { FREQUENCY_RANGES, type Frequency, type IntervalAnalysis } from "../types";

/**
 * Calculates intervals between consecutive transaction dates
 */
export function calculateIntervals(dates: string[]): number[] {
  if (dates.length < 2) return [];

  const sorted = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const daysDiff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(daysDiff);
  }

  return intervals;
}

/**
 * Determines the frequency from average interval using defined ranges
 */
export function determineFrequency(avgInterval: number): Frequency {
  for (const [frequency, range] of Object.entries(FREQUENCY_RANGES)) {
    if (avgInterval >= range.min && avgInterval <= range.max) {
      return frequency as Frequency;
    }
  }

  // Find closest match for intervals outside defined ranges
  if (avgInterval < FREQUENCY_RANGES.daily.min) return "daily";
  if (avgInterval > FREQUENCY_RANGES.annual.max) return "annual";

  // For intervals between defined ranges, find closest
  let closestFrequency: Frequency = "irregular";
  let smallestDistance = Infinity;

  for (const [frequency, range] of Object.entries(FREQUENCY_RANGES)) {
    const midpoint = (range.min + range.max) / 2;
    const distance = Math.abs(avgInterval - midpoint);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestFrequency = frequency as Frequency;
    }
  }

  return closestFrequency;
}

/**
 * Calculates interval consistency score (0-1)
 * 1 = perfectly consistent intervals
 * 0 = highly variable intervals
 */
export function calculateConsistency(intervals: number[]): number {
  if (intervals.length === 0) return 0;
  if (intervals.length === 1) return 1;

  const avg = mean(intervals);
  if (avg === 0) return 0;

  const stdDev = standardDeviation(intervals);
  const coefficientOfVariation = stdDev / avg;

  // Convert CV to a 0-1 score (lower CV = higher consistency)
  // CV of 0 = score 1, CV of 1+ = score 0
  return Math.max(0, 1 - coefficientOfVariation);
}

/**
 * Performs comprehensive interval analysis on a set of dates
 */
export function analyzeIntervals(dates: string[]): IntervalAnalysis | null {
  if (dates.length < 2) return null;

  const intervals = calculateIntervals(dates);
  if (intervals.length === 0) return null;

  const avg = mean(intervals);
  const stdDev = standardDeviation(intervals);
  const consistency = calculateConsistency(intervals);
  const frequency = determineFrequency(avg);

  return {
    intervals,
    average: avg,
    stdDev,
    consistency,
    frequency,
  };
}

/**
 * Detects the typical day of month for monthly patterns
 */
export function detectTypicalDayOfMonth(dates: string[]): number | undefined {
  if (dates.length < 3) return undefined;

  const daysOfMonth = dates.map((d) => new Date(d).getDate());
  const dayCounts = new Map<number, number>();

  for (const day of daysOfMonth) {
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }

  // Find the most common day
  let maxCount = 0;
  let typicalDay: number | undefined;

  for (const [day, count] of dayCounts) {
    if (count > maxCount) {
      maxCount = count;
      typicalDay = day;
    }
  }

  // Only return if at least 60% of transactions fall on this day (±2 days)
  const threshold = dates.length * 0.6;
  if (typicalDay && maxCount >= threshold) {
    return typicalDay;
  }

  // Check for clustering within ±2 days
  if (typicalDay) {
    const cluster = daysOfMonth.filter(
      (d) => Math.abs(d - typicalDay!) <= 2 || Math.abs(d - typicalDay! + 30) <= 2
    );
    if (cluster.length >= threshold) {
      return typicalDay;
    }
  }

  return undefined;
}

/**
 * Detects the typical day of week for weekly patterns
 * Returns 0 (Sunday) through 6 (Saturday)
 */
export function detectTypicalDayOfWeek(dates: string[]): number | undefined {
  if (dates.length < 3) return undefined;

  const daysOfWeek = dates.map((d) => new Date(d).getDay());
  const dayCounts = new Map<number, number>();

  for (const day of daysOfWeek) {
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }

  // Find the most common day
  let maxCount = 0;
  let typicalDay: number | undefined;

  for (const [day, count] of dayCounts) {
    if (count > maxCount) {
      maxCount = count;
      typicalDay = day;
    }
  }

  // Only return if at least 70% of transactions fall on this day
  const threshold = dates.length * 0.7;
  if (typicalDay !== undefined && maxCount >= threshold) {
    return typicalDay;
  }

  return undefined;
}

/**
 * Predicts the next occurrence date based on pattern analysis
 */
export function predictNextDate(
  lastDate: string,
  frequency: Frequency,
  typicalDayOfMonth?: number,
  typicalDayOfWeek?: number
): string {
  const last = new Date(lastDate);
  const next = new Date(last);

  // Add the appropriate interval
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      // If we have a typical day, adjust to it
      if (typicalDayOfMonth) {
        next.setDate(Math.min(typicalDayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())));
      }
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      if (typicalDayOfMonth) {
        next.setDate(Math.min(typicalDayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())));
      }
      break;
    case "semi_annual":
      next.setMonth(next.getMonth() + 6);
      if (typicalDayOfMonth) {
        next.setDate(Math.min(typicalDayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())));
      }
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      // For irregular, assume monthly
      next.setMonth(next.getMonth() + 1);
  }

  // For weekly patterns, adjust to typical day of week if known
  if ((frequency === "weekly" || frequency === "biweekly") && typicalDayOfWeek !== undefined) {
    const currentDay = next.getDay();
    const daysToAdd = (typicalDayOfWeek - currentDay + 7) % 7;
    if (daysToAdd > 0 && daysToAdd < 4) {
      // Only adjust if within a few days
      next.setDate(next.getDate() + daysToAdd);
    }
  }

  return next.toISOString().split("T")[0];
}

/**
 * Helper: Get days in a month
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Checks if intervals match a known billing pattern
 */
export function matchesBillingPattern(
  avgInterval: number,
  stdDev: number
): { matches: boolean; frequency?: Frequency; confidence: number } {
  const billingPatterns = [
    { days: 1, tolerance: 0.5, frequency: "daily" as Frequency },
    { days: 7, tolerance: 1, frequency: "weekly" as Frequency },
    { days: 14, tolerance: 2, frequency: "biweekly" as Frequency },
    { days: 30, tolerance: 5, frequency: "monthly" as Frequency },
    { days: 90, tolerance: 10, frequency: "quarterly" as Frequency },
    { days: 180, tolerance: 14, frequency: "semi_annual" as Frequency },
    { days: 365, tolerance: 30, frequency: "annual" as Frequency },
  ];

  for (const pattern of billingPatterns) {
    if (Math.abs(avgInterval - pattern.days) <= pattern.tolerance) {
      // Higher confidence if standard deviation is low relative to the pattern
      const confidence = Math.max(0, 1 - stdDev / pattern.tolerance);
      return { matches: true, frequency: pattern.frequency, confidence };
    }
  }

  return { matches: false, confidence: 0 };
}
