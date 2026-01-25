import { mean, standardDeviation, median } from "$lib/utils/chart-statistics";
import type { AmountAnalysis } from "../types";

/**
 * Performs comprehensive amount analysis on a set of transaction amounts
 */
export function analyzeAmounts(amounts: number[]): AmountAnalysis | null {
  if (amounts.length === 0) return null;

  const meanVal = mean(amounts);
  const medianVal = median(amounts);
  const stdDev = standardDeviation(amounts);
  const minVal = Math.min(...amounts);
  const maxVal = Math.max(...amounts);

  // Predictability: inverse of coefficient of variation, scaled to 0-100
  const absMedian = Math.abs(medianVal);
  const coefficientOfVariation = absMedian > 0 ? stdDev / absMedian : 1;
  const predictability = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));

  return {
    mean: meanVal,
    median: medianVal,
    stdDev,
    min: minVal,
    max: maxVal,
    predictability,
  };
}

/**
 * Calculates the coefficient of variation for amounts
 * Lower values indicate more consistent amounts
 */
export function calculateAmountVariation(amounts: number[]): number {
  if (amounts.length === 0) return 1;

  const meanVal = mean(amounts);
  if (Math.abs(meanVal) < 0.01) return 1; // Avoid division by near-zero

  const stdDev = standardDeviation(amounts);
  return stdDev / Math.abs(meanVal);
}

/**
 * Checks if amounts are consistent enough to be considered recurring
 * @param amounts Array of transaction amounts
 * @param threshold Maximum allowed coefficient of variation (default 0.25 = 25%)
 */
export function areAmountsConsistent(amounts: number[], threshold: number = 0.25): boolean {
  const variation = calculateAmountVariation(amounts);
  return variation < threshold;
}

/**
 * Detects if there's a price trend (increasing or decreasing)
 */
export function detectAmountTrend(
  amounts: number[],
  dates: string[]
): { trend: "increasing" | "decreasing" | "stable"; changePercent: number } | null {
  if (amounts.length < 3 || amounts.length !== dates.length) return null;

  // Sort by date
  const paired = amounts
    .map((amount, i) => ({ amount, date: dates[i] }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const sortedAmounts = paired.map((p) => p.amount);

  // Simple linear regression
  const n = sortedAmounts.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(sortedAmounts);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (sortedAmounts[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  if (denominator === 0) return { trend: "stable", changePercent: 0 };

  const slope = numerator / denominator;

  // Calculate total change over the period
  const firstAmount = sortedAmounts[0];
  const lastAmount = sortedAmounts[n - 1];

  if (Math.abs(firstAmount) < 0.01) return { trend: "stable", changePercent: 0 };

  const changePercent = ((lastAmount - firstAmount) / Math.abs(firstAmount)) * 100;

  // Determine trend based on slope significance
  const avgAmount = Math.abs(yMean);
  const slopeSignificance = avgAmount > 0 ? Math.abs(slope) / avgAmount : 0;

  if (slopeSignificance < 0.01) {
    return { trend: "stable", changePercent: 0 };
  } else if (slope > 0) {
    return { trend: "increasing", changePercent };
  } else {
    return { trend: "decreasing", changePercent };
  }
}

/**
 * Groups amounts to detect if there are multiple distinct patterns
 * (e.g., two different subscription tiers)
 */
export function groupAmountsByRange(
  amounts: number[],
  tolerance: number = 0.15
): number[][] {
  if (amounts.length === 0) return [];

  const sorted = [...amounts].sort((a, b) => Math.abs(a) - Math.abs(b));
  const groups: number[][] = [];
  let currentGroup: number[] = [sorted[0]];
  let groupMedian = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const amount = sorted[i];
    const diff = Math.abs(Math.abs(amount) - Math.abs(groupMedian));
    const relDiff = Math.abs(groupMedian) > 0 ? diff / Math.abs(groupMedian) : diff;

    if (relDiff <= tolerance) {
      currentGroup.push(amount);
      // Recalculate median
      groupMedian = median(currentGroup);
    } else {
      groups.push(currentGroup);
      currentGroup = [amount];
      groupMedian = amount;
    }
  }

  groups.push(currentGroup);
  return groups;
}

/**
 * Detects potential price changes by finding significant jumps in amount
 */
export function detectPriceChanges(
  amounts: number[],
  dates: string[],
  threshold: number = 0.1
): Array<{
  fromAmount: number;
  toAmount: number;
  date: string;
  changePercent: number;
}> {
  if (amounts.length < 2 || amounts.length !== dates.length) return [];

  // Sort by date
  const paired = amounts
    .map((amount, i) => ({ amount, date: dates[i] }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const changes: Array<{
    fromAmount: number;
    toAmount: number;
    date: string;
    changePercent: number;
  }> = [];

  let lastStableAmount = paired[0].amount;

  for (let i = 1; i < paired.length; i++) {
    const { amount, date } = paired[i];
    const diff = Math.abs(amount - lastStableAmount);
    const relDiff = Math.abs(lastStableAmount) > 0 ? diff / Math.abs(lastStableAmount) : diff;

    if (relDiff >= threshold) {
      changes.push({
        fromAmount: lastStableAmount,
        toAmount: amount,
        date,
        changePercent: ((amount - lastStableAmount) / Math.abs(lastStableAmount)) * 100,
      });
      lastStableAmount = amount;
    }
  }

  return changes;
}

/**
 * Calculates the representative amount for a pattern
 * Uses median for better outlier resistance
 */
export function getRepresentativeAmount(amounts: number[]): number {
  return median(amounts);
}

/**
 * Checks if an amount is an outlier relative to the pattern
 */
export function isAmountOutlier(
  amount: number,
  amounts: number[],
  stdDevMultiple: number = 2
): boolean {
  if (amounts.length < 3) return false;

  const medianVal = median(amounts);
  const stdDev = standardDeviation(amounts);

  return Math.abs(amount - medianVal) > stdDev * stdDevMultiple;
}
