/**
 * Anomaly Detectors
 *
 * Statistical and rule-based anomaly detectors for transaction analysis.
 * Each detector returns a score between 0-1 (0 = normal, 1 = highly anomalous).
 */

import { mean, quantile, standardDeviation } from "simple-statistics";

// =============================================================================
// Types
// =============================================================================

export interface DetectorResult {
  score: number; // 0-1
  triggered: boolean;
  reason: string;
  details?: Record<string, unknown>;
}

export interface TransactionContext {
  amount: number;
  date: string;
  payeeId?: number;
  categoryId?: number;
  accountId?: number;
  description?: string;
}

export interface HistoricalStats {
  amounts: number[];
  mean: number;
  stdDev: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
  count: number;
}

// =============================================================================
// Statistical Detectors
// =============================================================================

/**
 * Z-Score Detector
 * Detects anomalies based on standard deviations from the mean.
 */
export class ZScoreDetector {
  readonly name = "z_score";
  readonly weight = 0.25;

  constructor(private threshold: number = 2.5) {}

  detect(amount: number, stats: HistoricalStats): DetectorResult {
    if (stats.stdDev === 0 || stats.count < 5) {
      return {
        score: 0,
        triggered: false,
        reason: "Insufficient data for Z-score analysis",
      };
    }

    const absAmount = Math.abs(amount);
    const zScore = (absAmount - stats.mean) / stats.stdDev;
    const absZScore = Math.abs(zScore);

    // Convert z-score to 0-1 score using sigmoid-like transformation
    const score = Math.min(1, absZScore / (this.threshold * 2));
    const triggered = absZScore > this.threshold;

    let reason = `Amount is ${absZScore.toFixed(2)} standard deviations from mean`;
    if (triggered) {
      reason = zScore > 0
        ? `Unusually high amount: ${absZScore.toFixed(1)}σ above average`
        : `Unusually low amount: ${Math.abs(absZScore).toFixed(1)}σ below average`;
    }

    return {
      score,
      triggered,
      reason,
      details: { zScore, threshold: this.threshold, mean: stats.mean, stdDev: stats.stdDev },
    };
  }
}

/**
 * IQR (Interquartile Range) Detector
 * Robust to outliers, detects based on quartile distances.
 */
export class IQRDetector {
  readonly name = "iqr";
  readonly weight = 0.2;

  constructor(private multiplier: number = 1.5) {}

  detect(amount: number, stats: HistoricalStats): DetectorResult {
    if (stats.count < 5 || stats.iqr === 0) {
      return {
        score: 0,
        triggered: false,
        reason: "Insufficient data for IQR analysis",
      };
    }

    const absAmount = Math.abs(amount);
    const lowerBound = stats.q1 - this.multiplier * stats.iqr;
    const upperBound = stats.q3 + this.multiplier * stats.iqr;

    // Calculate how far outside the bounds (in IQR units)
    let iqrDistance = 0;
    if (absAmount > upperBound) {
      iqrDistance = (absAmount - upperBound) / stats.iqr;
    } else if (absAmount < lowerBound) {
      iqrDistance = (lowerBound - absAmount) / stats.iqr;
    }

    // Convert to 0-1 score
    const score = Math.min(1, iqrDistance / (this.multiplier * 2));
    const triggered = absAmount < lowerBound || absAmount > upperBound;

    let reason = "Amount within expected range";
    if (triggered) {
      reason = absAmount > upperBound
        ? `Amount exceeds upper fence by ${iqrDistance.toFixed(1)} IQR`
        : `Amount below lower fence by ${iqrDistance.toFixed(1)} IQR`;
    }

    return {
      score,
      triggered,
      reason,
      details: { lowerBound, upperBound, iqrDistance, iqr: stats.iqr },
    };
  }
}

/**
 * Modified Z-Score Detector
 * Uses median instead of mean for robustness against outliers.
 */
export class ModifiedZScoreDetector {
  readonly name = "modified_z_score";
  readonly weight = 0.2;

  constructor(private threshold: number = 3.5) {}

  detect(amount: number, stats: HistoricalStats): DetectorResult {
    if (stats.count < 5) {
      return {
        score: 0,
        triggered: false,
        reason: "Insufficient data for modified Z-score analysis",
      };
    }

    const absAmount = Math.abs(amount);

    // Calculate MAD (Median Absolute Deviation)
    const absDeviations = stats.amounts.map((a) => Math.abs(Math.abs(a) - stats.median));
    const mad = absDeviations.length > 0 ? quantile(absDeviations, 0.5) : 0;

    if (mad === 0) {
      // All values are the same as median
      const isAnomaly = absAmount !== stats.median;
      return {
        score: isAnomaly ? 0.5 : 0,
        triggered: isAnomaly,
        reason: isAnomaly ? "Amount differs from constant value" : "Amount matches expected value",
      };
    }

    // Modified Z-score = 0.6745 * (xi - median) / MAD
    const modifiedZScore = (0.6745 * (absAmount - stats.median)) / mad;
    const absModifiedZ = Math.abs(modifiedZScore);

    const score = Math.min(1, absModifiedZ / (this.threshold * 2));
    const triggered = absModifiedZ > this.threshold;

    return {
      score,
      triggered,
      reason: triggered
        ? `Modified Z-score of ${absModifiedZ.toFixed(2)} exceeds threshold`
        : `Modified Z-score of ${absModifiedZ.toFixed(2)} within normal range`,
      details: { modifiedZScore, mad, threshold: this.threshold },
    };
  }
}

/**
 * Simplified Isolation Forest Detector
 * Uses random sampling and isolation depth to detect anomalies.
 * Simpler implementation suitable for single-dimension (amount) analysis.
 */
export class IsolationForestDetector {
  readonly name = "isolation_forest";
  readonly weight = 0.15;

  constructor(
    private numTrees: number = 100,
    private sampleSize: number = 256
  ) {}

  detect(amount: number, stats: HistoricalStats): DetectorResult {
    if (stats.count < 10) {
      return {
        score: 0,
        triggered: false,
        reason: "Insufficient data for isolation forest analysis",
      };
    }

    const absAmount = Math.abs(amount);
    const absAmounts = stats.amounts.map((a) => Math.abs(a));

    // Calculate average path length across trees
    let totalPathLength = 0;
    for (let t = 0; t < this.numTrees; t++) {
      // Sample subset of data
      const sample = this.randomSample(absAmounts, Math.min(this.sampleSize, absAmounts.length));
      const pathLength = this.isolate(absAmount, sample, 0, Math.ceil(Math.log2(sample.length)));
      totalPathLength += pathLength;
    }

    const avgPathLength = totalPathLength / this.numTrees;

    // Calculate anomaly score using isolation forest formula
    const c = this.averagePathLength(stats.count);
    const anomalyScore = Math.pow(2, -avgPathLength / c);

    // Normalize to 0-1 (isolation forest scores are already in this range)
    const score = Math.min(1, Math.max(0, anomalyScore));
    const triggered = score > 0.6; // Higher threshold for isolation forest

    return {
      score,
      triggered,
      reason: triggered
        ? `Easily isolated from normal patterns (score: ${score.toFixed(3)})`
        : `Consistent with normal patterns (score: ${score.toFixed(3)})`,
      details: { avgPathLength, expectedPathLength: c, anomalyScore },
    };
  }

  private randomSample(arr: number[], size: number): number[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }

  private isolate(value: number, sample: number[], depth: number, maxDepth: number): number {
    if (depth >= maxDepth || sample.length <= 1) {
      return depth + this.averagePathLength(sample.length);
    }

    const min = Math.min(...sample);
    const max = Math.max(...sample);

    if (min === max) {
      return depth;
    }

    // Random split point
    const splitPoint = min + Math.random() * (max - min);

    // Partition
    const left = sample.filter((v) => v < splitPoint);
    const right = sample.filter((v) => v >= splitPoint);

    if (value < splitPoint) {
      return this.isolate(value, left, depth + 1, maxDepth);
    } else {
      return this.isolate(value, right, depth + 1, maxDepth);
    }
  }

  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    // Harmonic number approximation
    const H = Math.log(n - 1) + 0.5772156649; // Euler-Mascheroni constant
    return 2 * H - (2 * (n - 1)) / n;
  }
}

/**
 * Percentile Detector
 * Detects values in extreme percentiles.
 */
export class PercentileDetector {
  readonly name = "percentile";
  readonly weight = 0.1;

  constructor(
    private lowerThreshold: number = 0.01,
    private upperThreshold: number = 0.99
  ) {}

  detect(amount: number, stats: HistoricalStats): DetectorResult {
    if (stats.count < 10) {
      return {
        score: 0,
        triggered: false,
        reason: "Insufficient data for percentile analysis",
      };
    }

    const absAmount = Math.abs(amount);
    const sorted = [...stats.amounts].map((a) => Math.abs(a)).sort((a, b) => a - b);

    // Find percentile of the amount
    const countBelow = sorted.filter((v) => v < absAmount).length;
    const percentile = countBelow / sorted.length;

    // Calculate score based on how extreme the percentile is
    let score = 0;
    let triggered = false;

    if (percentile < this.lowerThreshold) {
      score = (this.lowerThreshold - percentile) / this.lowerThreshold;
      triggered = true;
    } else if (percentile > this.upperThreshold) {
      score = (percentile - this.upperThreshold) / (1 - this.upperThreshold);
      triggered = true;
    }

    const percentileStr = (percentile * 100).toFixed(1);

    return {
      score,
      triggered,
      reason: triggered
        ? `Amount in ${percentileStr}th percentile (extreme)`
        : `Amount in ${percentileStr}th percentile (normal range)`,
      details: { percentile, lowerThreshold: this.lowerThreshold, upperThreshold: this.upperThreshold },
    };
  }
}

// =============================================================================
// Rule-Based Detectors
// =============================================================================

/**
 * Round Number Detector
 * Flags suspiciously round numbers which may indicate fraud or estimation.
 */
export class RoundNumberDetector {
  readonly name = "round_number";
  readonly weight = 0.05;

  detect(amount: number, _stats: HistoricalStats): DetectorResult {
    const absAmount = Math.abs(amount);

    // Check various levels of "roundness"
    let roundnessScore = 0;
    let roundnessLevel = "";

    if (absAmount >= 1000 && absAmount % 1000 === 0) {
      roundnessScore = 0.8;
      roundnessLevel = "thousand";
    } else if (absAmount >= 100 && absAmount % 100 === 0) {
      roundnessScore = 0.5;
      roundnessLevel = "hundred";
    } else if (absAmount >= 10 && absAmount % 10 === 0) {
      roundnessScore = 0.2;
      roundnessLevel = "ten";
    } else if (absAmount % 1 === 0) {
      roundnessScore = 0.1;
      roundnessLevel = "whole";
    }

    // Only flag if amount is significant
    if (absAmount < 50) {
      roundnessScore *= 0.3; // Reduce score for small amounts
    }

    const triggered = roundnessScore >= 0.5;

    return {
      score: roundnessScore,
      triggered,
      reason: roundnessScore > 0
        ? `Suspiciously round amount (${roundnessLevel})`
        : "Amount not suspiciously round",
      details: { roundnessLevel, originalAmount: amount },
    };
  }
}

/**
 * Frequency Anomaly Detector
 * Detects unusual transaction frequency patterns.
 */
export class FrequencyAnomalyDetector {
  readonly name = "frequency_anomaly";
  readonly weight = 0.1;

  detect(
    _amount: number,
    _stats: HistoricalStats,
    context?: { recentTransactionCount: number; expectedCount: number; daysSinceLastTransaction: number }
  ): DetectorResult {
    if (!context) {
      return {
        score: 0,
        triggered: false,
        reason: "No frequency context provided",
      };
    }

    const { recentTransactionCount, expectedCount, daysSinceLastTransaction } = context;
    let score = 0;
    const reasons: string[] = [];

    // Check for unusual frequency
    if (expectedCount > 0) {
      const frequencyRatio = recentTransactionCount / expectedCount;
      if (frequencyRatio > 3) {
        score = Math.min(1, (frequencyRatio - 1) / 5);
        reasons.push(`${frequencyRatio.toFixed(1)}x more transactions than usual`);
      } else if (frequencyRatio < 0.3 && expectedCount >= 3) {
        score = Math.min(1, (1 - frequencyRatio) / 2);
        reasons.push(`Unusually few transactions (${frequencyRatio.toFixed(1)}x expected)`);
      }
    }

    // Check for unusual gap since last transaction
    if (daysSinceLastTransaction > 60) {
      const gapScore = Math.min(1, (daysSinceLastTransaction - 30) / 90);
      score = Math.max(score, gapScore);
      reasons.push(`${daysSinceLastTransaction} days since last transaction`);
    }

    const triggered = score > 0.5;

    return {
      score,
      triggered,
      reason: reasons.length > 0 ? reasons.join("; ") : "Normal transaction frequency",
      details: context,
    };
  }
}

/**
 * Time of Day Detector
 * Detects transactions at unusual times.
 */
export class TimeOfDayDetector {
  readonly name = "time_of_day";
  readonly weight = 0.05;

  constructor(
    private unusualHoursStart: number = 23, // 11 PM
    private unusualHoursEnd: number = 5 // 5 AM
  ) {}

  detect(_amount: number, _stats: HistoricalStats, context?: { hour: number }): DetectorResult {
    if (!context || context.hour === undefined) {
      return {
        score: 0,
        triggered: false,
        reason: "No time context provided",
      };
    }

    const { hour } = context;
    const isUnusualHour =
      hour >= this.unusualHoursStart || hour < this.unusualHoursEnd;

    // Score based on distance from "normal" hours
    let score = 0;
    if (isUnusualHour) {
      if (hour >= this.unusualHoursStart) {
        score = (hour - this.unusualHoursStart + 1) / (24 - this.unusualHoursStart + this.unusualHoursEnd);
      } else {
        score = (this.unusualHoursEnd - hour + (24 - this.unusualHoursStart)) /
          (24 - this.unusualHoursStart + this.unusualHoursEnd);
      }
      score = Math.min(score, 0.6); // Cap at 0.6 - time alone isn't super suspicious
    }

    return {
      score,
      triggered: isUnusualHour,
      reason: isUnusualHour
        ? `Transaction at unusual hour (${hour}:00)`
        : `Transaction at normal hour (${hour}:00)`,
      details: { hour, unusualHoursStart: this.unusualHoursStart, unusualHoursEnd: this.unusualHoursEnd },
    };
  }
}

/**
 * Repeated Amount Detector
 * Detects suspiciously repeated exact amounts.
 */
export class RepeatedAmountDetector {
  readonly name = "repeated_amount";
  readonly weight = 0.1;

  detect(amount: number, stats: HistoricalStats, context?: { recentAmounts: number[] }): DetectorResult {
    if (!context?.recentAmounts || context.recentAmounts.length < 3) {
      return {
        score: 0,
        triggered: false,
        reason: "Insufficient recent transaction data",
      };
    }

    const absAmount = Math.abs(amount);
    const recentAbsAmounts = context.recentAmounts.map((a) => Math.abs(a));

    // Count exact matches in recent transactions
    const exactMatches = recentAbsAmounts.filter((a) => a === absAmount).length;
    const matchRatio = exactMatches / recentAbsAmounts.length;

    // Check for suspicious repetition (3+ matches is suspicious)
    let score = 0;
    if (exactMatches >= 3) {
      score = Math.min(1, matchRatio * 1.5);
    }

    // Also check if amount appears more frequently than expected
    const totalMatches = stats.amounts.filter((a) => Math.abs(a) === absAmount).length;
    const expectedFrequency = 1 / Math.max(10, stats.count * 0.1);
    const actualFrequency = totalMatches / stats.count;

    if (actualFrequency > expectedFrequency * 5) {
      score = Math.max(score, Math.min(1, actualFrequency / expectedFrequency / 10));
    }

    const triggered = score > 0.4;

    return {
      score,
      triggered,
      reason: triggered
        ? `Amount $${absAmount.toFixed(2)} repeated ${exactMatches} times recently`
        : "Amount repetition within normal bounds",
      details: { exactMatches, matchRatio, totalMatches, expectedFrequency, actualFrequency },
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate historical statistics from an array of amounts
 */
export function calculateHistoricalStats(amounts: number[]): HistoricalStats {
  if (amounts.length === 0) {
    return {
      amounts: [],
      mean: 0,
      stdDev: 0,
      median: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      min: 0,
      max: 0,
      count: 0,
    };
  }

  const absAmounts = amounts.map((a) => Math.abs(a));
  const sorted = [...absAmounts].sort((a, b) => a - b);

  const statsMean = mean(absAmounts);
  const statsStdDev = absAmounts.length > 1 ? standardDeviation(absAmounts) : 0;
  const statsMedian = quantile(sorted, 0.5);
  const statsQ1 = quantile(sorted, 0.25);
  const statsQ3 = quantile(sorted, 0.75);

  return {
    amounts: absAmounts,
    mean: statsMean,
    stdDev: statsStdDev,
    median: statsMedian,
    q1: statsQ1,
    q3: statsQ3,
    iqr: statsQ3 - statsQ1,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: amounts.length,
  };
}

// =============================================================================
// Detector Registry
// =============================================================================

export const statisticalDetectors = {
  zScore: new ZScoreDetector(),
  iqr: new IQRDetector(),
  modifiedZScore: new ModifiedZScoreDetector(),
  isolationForest: new IsolationForestDetector(),
  percentile: new PercentileDetector(),
};

export const ruleBasedDetectors = {
  roundNumber: new RoundNumberDetector(),
  frequencyAnomaly: new FrequencyAnomalyDetector(),
  timeOfDay: new TimeOfDayDetector(),
  repeatedAmount: new RepeatedAmountDetector(),
};

export const allDetectors = {
  ...statisticalDetectors,
  ...ruleBasedDetectors,
};
