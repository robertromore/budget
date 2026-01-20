/**
 * Math Utilities
 *
 * Centralized mathematical and statistical functions for consistent
 * calculations across the application.
 */

// Import sum from array-utilities to avoid duplication
import { sum } from "./array-utilities";

// ============================================================================
// Rounding Utilities
// ============================================================================

/**
 * Round to cents (2 decimal places) for currency calculations
 * @example roundToCents(10.456) => 10.46
 */
export function roundToCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Round to specified number of decimal places
 * @example roundTo(3.14159, 2) => 3.14
 */
export function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/**
 * Floor to specified number of decimal places
 * @example floorTo(3.149, 2) => 3.14
 */
export function floorTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(n * factor) / factor;
}

/**
 * Ceiling to specified number of decimal places
 * @example ceilTo(3.141, 2) => 3.15
 */
export function ceilTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(n * factor) / factor;
}

/**
 * Truncate decimal places without rounding
 * @example truncateDecimals(3.149, 2) => 3.14
 */
export function truncateDecimals(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.trunc(n * factor) / factor;
}

// ============================================================================
// Basic Statistics
// ============================================================================

// Note: sum is imported from array-utilities to avoid duplication

/**
 * Calculate arithmetic mean (average)
 * @example mean([1, 2, 3, 4, 5]) => 3
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Calculate median (middle value)
 * @example median([1, 2, 3, 4, 5]) => 3
 * @example median([1, 2, 3, 4]) => 2.5
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate mode (most frequent value)
 * Returns first mode if multiple exist
 * @example mode([1, 2, 2, 3, 3, 3]) => 3
 */
export function mode(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<number, number>();
  let maxCount = 0;
  let modeValue = values[0];

  for (const val of values) {
    const count = (counts.get(val) || 0) + 1;
    counts.set(val, count);
    if (count > maxCount) {
      maxCount = count;
      modeValue = val;
    }
  }
  return modeValue;
}

/**
 * Calculate variance (population variance)
 * @example variance([1, 2, 3, 4, 5]) => 2
 */
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
  return sum(squaredDiffs) / values.length;
}

/**
 * Calculate standard deviation (population)
 * @example standardDeviation([1, 2, 3, 4, 5]) => 1.414...
 */
export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Calculate sample variance
 * @example sampleVariance([1, 2, 3, 4, 5]) => 2.5
 */
export function sampleVariance(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
  return sum(squaredDiffs) / (values.length - 1);
}

/**
 * Calculate sample standard deviation
 * @example sampleStandardDeviation([1, 2, 3, 4, 5]) => 1.581...
 */
export function sampleStandardDeviation(values: number[]): number {
  return Math.sqrt(sampleVariance(values));
}

/**
 * Get basic statistics object
 */
export interface BasicStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  stdDev: number;
}

/**
 * Calculate all basic statistics at once
 * @example getBasicStats([1, 2, 3, 4, 5])
 *          => { count: 5, sum: 15, mean: 3, median: 3, min: 1, max: 5, range: 4, stdDev: 1.414 }
 */
export function getBasicStats(values: number[]): BasicStats {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      range: 0,
      stdDev: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  const sumVal = sum(values);
  const meanVal = sumVal / values.length;

  return {
    count: values.length,
    sum: sumVal,
    mean: meanVal,
    median: median(values),
    min: minVal,
    max: maxVal,
    range: maxVal - minVal,
    stdDev: standardDeviation(values),
  };
}

// ============================================================================
// Percentile and Quantile
// ============================================================================

/**
 * Calculate percentile value
 * @example percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50) => 5.5
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculate quartiles (Q1, Q2, Q3)
 * @example quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
 *          => { q1: 3, q2: 5.5, q3: 8 }
 */
export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  return {
    q1: percentile(values, 25),
    q2: percentile(values, 50),
    q3: percentile(values, 75),
  };
}

/**
 * Calculate interquartile range (IQR)
 * @example iqr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) => 5
 */
export function iqr(values: number[]): number {
  const q = quartiles(values);
  return q.q3 - q.q1;
}

// ============================================================================
// Trend and Change Detection
// ============================================================================

/**
 * Calculate percentage change between two values
 * @example percentageChange(100, 150) => 50
 * @example percentageChange(100, 50) => -50
 */
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : newValue > 0 ? 100 : -100;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Calculate growth rate (as decimal)
 * @example growthRate(100, 150) => 0.5
 */
export function growthRate(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return (newValue - oldValue) / Math.abs(oldValue);
}

/**
 * Check if values show upward trend
 * Uses simple linear regression slope
 * @example isTrendingUp([1, 2, 3, 4, 5]) => true
 * @example isTrendingUp([5, 4, 3, 2, 1]) => false
 */
export function isTrendingUp(values: number[], threshold = 0): boolean {
  if (values.length < 2) return false;
  const slope = linearRegressionSlope(values);
  return slope > threshold;
}

/**
 * Check if values show downward trend
 * @example isTrendingDown([5, 4, 3, 2, 1]) => true
 */
export function isTrendingDown(values: number[], threshold = 0): boolean {
  if (values.length < 2) return false;
  const slope = linearRegressionSlope(values);
  return slope < -threshold;
}

/**
 * Calculate simple linear regression slope
 * @example linearRegressionSlope([1, 2, 3, 4, 5]) => 1
 */
export function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Calculate trend strength (R-squared)
 * Returns value between 0 and 1
 * @example trendStrength([1, 2, 3, 4, 5]) => 1 (perfect linear)
 */
export function trendStrength(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const slope = linearRegressionSlope(values);
  const avgY = mean(values);
  const avgX = (n - 1) / 2;
  const intercept = avgY - slope * avgX;

  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTot += Math.pow(values[i] - avgY, 2);
    ssRes += Math.pow(values[i] - predicted, 2);
  }

  if (ssTot === 0) return 1;
  return 1 - ssRes / ssTot;
}

// ============================================================================
// Moving Averages
// ============================================================================

/**
 * Calculate simple moving average
 * @example simpleMovingAverage([1, 2, 3, 4, 5], 3) => [2, 3, 4]
 */
export function simpleMovingAverage(values: number[], window: number): number[] {
  if (window > values.length) return [];
  const result: number[] = [];
  for (let i = window - 1; i < values.length; i++) {
    const windowValues = values.slice(i - window + 1, i + 1);
    result.push(mean(windowValues));
  }
  return result;
}

/**
 * Calculate exponential moving average
 * @example exponentialMovingAverage([1, 2, 3, 4, 5], 0.5)
 */
export function exponentialMovingAverage(
  values: number[],
  alpha: number
): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// ============================================================================
// Outlier Detection
// ============================================================================

/**
 * Detect outliers using IQR method
 * Returns indices of outlier values
 * @example findOutlierIndices([1, 2, 3, 4, 100]) => [4]
 */
export function findOutlierIndices(
  values: number[],
  multiplier = 1.5
): number[] {
  const q = quartiles(values);
  const iqrVal = q.q3 - q.q1;
  const lowerBound = q.q1 - multiplier * iqrVal;
  const upperBound = q.q3 + multiplier * iqrVal;

  const outliers: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] < lowerBound || values[i] > upperBound) {
      outliers.push(i);
    }
  }
  return outliers;
}

/**
 * Calculate z-score for a value
 * @example zScore(5, 3, 1) => 2 (value is 2 std devs above mean)
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Check if value is an outlier based on z-score
 * @example isOutlier(100, [1, 2, 3, 4, 5], 2) => true
 */
export function isOutlier(
  value: number,
  values: number[],
  zThreshold = 2
): boolean {
  const stats = getBasicStats(values);
  if (stats.stdDev === 0) return false;
  const z = Math.abs(zScore(value, stats.mean, stats.stdDev));
  return z > zThreshold;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp value between min and max
 * @example clamp(5, 0, 10) => 5
 * @example clamp(-5, 0, 10) => 0
 * @example clamp(15, 0, 10) => 10
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @example lerp(0, 100, 0.5) => 50
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Map value from one range to another
 * @example mapRange(5, 0, 10, 0, 100) => 50
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Check if number is within range (inclusive)
 * @example inRange(5, 0, 10) => true
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Get sign of number (-1, 0, or 1)
 * @example sign(-5) => -1
 * @example sign(0) => 0
 * @example sign(5) => 1
 */
export function sign(n: number): -1 | 0 | 1 {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

/**
 * Check if number is approximately equal to another
 * @example approxEqual(0.1 + 0.2, 0.3) => true
 */
export function approxEqual(
  a: number,
  b: number,
  epsilon = 0.0001
): boolean {
  return Math.abs(a - b) < epsilon;
}
