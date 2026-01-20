/**
 * Confidence Calibration
 *
 * Adjusts prediction confidence scores to better reflect actual probabilities.
 * Uses isotonic regression and Platt scaling for calibration.
 */

import { nowISOString } from "$lib/utils/dates";

// =============================================================================
// Types
// =============================================================================

export interface CalibrationData {
  predictedConfidence: number;
  actualOutcome: boolean; // true = accepted, false = rejected
  timestamp: string;
  entityType?: string;
  categoryId?: number;
}

export interface CalibrationBucket {
  minConfidence: number;
  maxConfidence: number;
  midpoint: number;
  count: number;
  positives: number;
  actualRate: number;
}

export interface CalibrationReport {
  overallScore: number; // 0-1, higher is better
  expectedCalibrationError: number; // ECE, lower is better
  maxCalibrationError: number; // MCE, lower is better
  buckets: CalibrationBucket[];
  recommendations: string[];
}

export interface CalibrationConfig {
  numBuckets: number;
  minSamplesPerBucket: number;
  plattLearningRate: number;
  plattIterations: number;
}

const DEFAULT_CONFIG: CalibrationConfig = {
  numBuckets: 10,
  minSamplesPerBucket: 10,
  plattLearningRate: 0.1,
  plattIterations: 100,
};

// =============================================================================
// Calibration Methods
// =============================================================================

/**
 * Build calibration buckets from data
 */
export function buildCalibrationBuckets(
  data: CalibrationData[],
  numBuckets: number
): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [];
  const bucketSize = 1 / numBuckets;

  for (let i = 0; i < numBuckets; i++) {
    const minConf = i * bucketSize;
    const maxConf = (i + 1) * bucketSize;

    const bucketData = data.filter(
      (d) => d.predictedConfidence >= minConf && d.predictedConfidence < maxConf
    );

    const count = bucketData.length;
    const positives = bucketData.filter((d) => d.actualOutcome).length;

    buckets.push({
      minConfidence: minConf,
      maxConfidence: maxConf,
      midpoint: (minConf + maxConf) / 2,
      count,
      positives,
      actualRate: count > 0 ? positives / count : 0,
    });
  }

  return buckets;
}

/**
 * Calculate Expected Calibration Error (ECE)
 */
export function calculateECE(buckets: CalibrationBucket[]): number {
  const totalSamples = buckets.reduce((sum, b) => sum + b.count, 0);
  if (totalSamples === 0) return 0;

  let ece = 0;
  for (const bucket of buckets) {
    if (bucket.count === 0) continue;
    const error = Math.abs(bucket.midpoint - bucket.actualRate);
    ece += (bucket.count / totalSamples) * error;
  }

  return ece;
}

/**
 * Calculate Maximum Calibration Error (MCE)
 */
export function calculateMCE(buckets: CalibrationBucket[]): number {
  let maxError = 0;

  for (const bucket of buckets) {
    if (bucket.count === 0) continue;
    const error = Math.abs(bucket.midpoint - bucket.actualRate);
    maxError = Math.max(maxError, error);
  }

  return maxError;
}

/**
 * Platt scaling parameters (sigmoid calibration)
 */
export interface PlattParameters {
  A: number; // Scale parameter
  B: number; // Shift parameter
}

/**
 * Fit Platt scaling parameters using gradient descent
 */
export function fitPlattScaling(
  data: CalibrationData[],
  config: CalibrationConfig = DEFAULT_CONFIG
): PlattParameters {
  if (data.length < 10) {
    return { A: 1, B: 0 }; // Default (no transformation)
  }

  let A = 1;
  let B = 0;

  // Simple gradient descent
  for (let iter = 0; iter < config.plattIterations; iter++) {
    let gradA = 0;
    let gradB = 0;

    for (const d of data) {
      const z = A * d.predictedConfidence + B;
      const p = 1 / (1 + Math.exp(-z)); // Sigmoid
      const y = d.actualOutcome ? 1 : 0;

      // Cross-entropy gradient
      const error = p - y;
      gradA += error * d.predictedConfidence;
      gradB += error;
    }

    // Update parameters
    A -= (config.plattLearningRate / data.length) * gradA;
    B -= (config.plattLearningRate / data.length) * gradB;
  }

  return { A, B };
}

/**
 * Apply Platt scaling to a confidence score
 */
export function applyPlattScaling(confidence: number, params: PlattParameters): number {
  const z = params.A * confidence + params.B;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Isotonic regression calibration
 */
export interface IsotonicCalibrator {
  thresholds: number[];
  values: number[];
}

/**
 * Fit isotonic regression (Pool Adjacent Violators Algorithm)
 */
export function fitIsotonicRegression(data: CalibrationData[]): IsotonicCalibrator {
  if (data.length < 10) {
    return { thresholds: [0, 1], values: [0, 1] };
  }

  // Sort by predicted confidence
  const sorted = [...data].sort((a, b) => a.predictedConfidence - b.predictedConfidence);

  // Initialize with actual outcomes
  const values: number[] = sorted.map((d) => (d.actualOutcome ? 1 : 0));
  const weights: number[] = sorted.map(() => 1);

  // Pool Adjacent Violators
  let i = 0;
  while (i < values.length - 1) {
    if (values[i] > values[i + 1]) {
      // Pool these two points
      const pooledValue = (values[i] * weights[i] + values[i + 1] * weights[i + 1]) /
        (weights[i] + weights[i + 1]);
      values[i] = pooledValue;
      weights[i] = weights[i] + weights[i + 1];
      values.splice(i + 1, 1);
      weights.splice(i + 1, 1);

      // Check backwards
      if (i > 0) i--;
    } else {
      i++;
    }
  }

  // Build thresholds
  const thresholds = sorted.map((d) => d.predictedConfidence);
  const uniqueThresholds: number[] = [];
  const uniqueValues: number[] = [];

  let currentIdx = 0;
  for (let j = 0; j < sorted.length; j++) {
    if (uniqueThresholds.length === 0 || thresholds[j] !== uniqueThresholds[uniqueThresholds.length - 1]) {
      uniqueThresholds.push(thresholds[j]);
      uniqueValues.push(values[Math.min(currentIdx, values.length - 1)]);
    }
    if (j < sorted.length - 1 && currentIdx < values.length - 1) {
      currentIdx++;
    }
  }

  return {
    thresholds: uniqueThresholds.length > 0 ? uniqueThresholds : [0, 1],
    values: uniqueValues.length > 0 ? uniqueValues : [0, 1],
  };
}

/**
 * Apply isotonic calibration
 */
export function applyIsotonicCalibration(
  confidence: number,
  calibrator: IsotonicCalibrator
): number {
  const { thresholds, values } = calibrator;

  // Binary search for the right interval
  let left = 0;
  let right = thresholds.length - 1;

  if (confidence <= thresholds[0]) return values[0];
  if (confidence >= thresholds[thresholds.length - 1]) return values[values.length - 1];

  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (thresholds[mid] <= confidence) {
      left = mid;
    } else {
      right = mid;
    }
  }

  // Linear interpolation
  const t = (confidence - thresholds[left]) / (thresholds[right] - thresholds[left]);
  return values[left] + t * (values[right] - values[left]);
}

// =============================================================================
// Confidence Calibrator Service
// =============================================================================

export interface ConfidenceCalibrator {
  /**
   * Add calibration data point
   */
  addDataPoint(data: CalibrationData): void;

  /**
   * Calibrate a confidence score
   */
  calibrate(confidence: number, entityType?: string): number;

  /**
   * Get calibration report
   */
  getReport(): CalibrationReport;

  /**
   * Retrain calibration models
   */
  retrain(): void;

  /**
   * Get personalized confidence threshold
   */
  getPersonalizedThreshold(
    targetAcceptanceRate: number,
    entityType?: string
  ): number;

  /**
   * Export calibration state
   */
  export(): {
    data: CalibrationData[];
    plattParams: PlattParameters;
    isotonicCalibrator: IsotonicCalibrator;
  };

  /**
   * Import calibration state
   */
  import(state: {
    data: CalibrationData[];
    plattParams: PlattParameters;
    isotonicCalibrator: IsotonicCalibrator;
  }): void;
}

/**
 * Create a confidence calibrator
 */
export function createConfidenceCalibrator(
  config: Partial<CalibrationConfig> = {}
): ConfidenceCalibrator {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // State
  let data: CalibrationData[] = [];
  let plattParams: PlattParameters = { A: 1, B: 0 };
  let isotonicCalibrator: IsotonicCalibrator = { thresholds: [0, 1], values: [0, 1] };
  let lastTrainedAt: string | null = null;

  return {
    addDataPoint(dataPoint: CalibrationData): void {
      data.push(dataPoint);

      // Limit data size
      if (data.length > 10000) {
        // Remove oldest 10%
        data = data.slice(Math.floor(data.length * 0.1));
      }
    },

    calibrate(confidence: number, entityType?: string): number {
      // Filter data by entity type if provided
      const relevantData = entityType
        ? data.filter((d) => d.entityType === entityType)
        : data;

      if (relevantData.length < cfg.minSamplesPerBucket * cfg.numBuckets) {
        // Not enough data, use minimal calibration
        return applyPlattScaling(confidence, plattParams);
      }

      // Ensemble of Platt and isotonic
      const plattCalibrated = applyPlattScaling(confidence, plattParams);
      const isotonicCalibrated = applyIsotonicCalibration(confidence, isotonicCalibrator);

      // Weight based on data availability
      const weight = Math.min(1, relevantData.length / 500);
      return plattCalibrated * (1 - weight * 0.5) + isotonicCalibrated * (weight * 0.5);
    },

    getReport(): CalibrationReport {
      const buckets = buildCalibrationBuckets(data, cfg.numBuckets);
      const ece = calculateECE(buckets);
      const mce = calculateMCE(buckets);

      // Overall score (1 - ECE, bounded)
      const overallScore = Math.max(0, 1 - ece * 2);

      // Generate recommendations
      const recommendations: string[] = [];

      if (data.length < 100) {
        recommendations.push("Collect more interaction data for better calibration");
      }

      if (ece > 0.15) {
        recommendations.push("Calibration error is high - predictions may not reflect true probabilities");
      }

      // Check for systematic bias
      const lowConfBuckets = buckets.filter((b) => b.midpoint < 0.3 && b.count > 10);
      const highConfBuckets = buckets.filter((b) => b.midpoint > 0.7 && b.count > 10);

      const avgLowActual = lowConfBuckets.length > 0
        ? lowConfBuckets.reduce((sum, b) => sum + b.actualRate, 0) / lowConfBuckets.length
        : 0;
      const avgHighActual = highConfBuckets.length > 0
        ? highConfBuckets.reduce((sum, b) => sum + b.actualRate, 0) / highConfBuckets.length
        : 1;

      if (avgLowActual > 0.4) {
        recommendations.push("Low confidence predictions are being accepted more often than expected");
      }

      if (avgHighActual < 0.6) {
        recommendations.push("High confidence predictions are being rejected more often than expected");
      }

      return {
        overallScore,
        expectedCalibrationError: ece,
        maxCalibrationError: mce,
        buckets,
        recommendations,
      };
    },

    retrain(): void {
      if (data.length < cfg.minSamplesPerBucket) {
        return; // Not enough data
      }

      plattParams = fitPlattScaling(data, cfg);
      isotonicCalibrator = fitIsotonicRegression(data);
      lastTrainedAt = nowISOString();
    },

    getPersonalizedThreshold(
      targetAcceptanceRate: number,
      entityType?: string
    ): number {
      const relevantData = entityType
        ? data.filter((d) => d.entityType === entityType)
        : data;

      if (relevantData.length < 20) {
        // Default threshold
        return 0.7;
      }

      // Find confidence threshold that achieves target acceptance rate
      // Sort by predicted confidence descending
      const sorted = [...relevantData].sort(
        (a, b) => b.predictedConfidence - a.predictedConfidence
      );

      let accepted = 0;
      let shown = 0;

      for (const d of sorted) {
        shown++;
        if (d.actualOutcome) accepted++;

        const currentRate = accepted / shown;
        if (currentRate <= targetAcceptanceRate) {
          return d.predictedConfidence;
        }
      }

      // If we can't achieve the target, return the minimum confidence in data
      return Math.min(...relevantData.map((d) => d.predictedConfidence));
    },

    export() {
      return {
        data: [...data],
        plattParams: { ...plattParams },
        isotonicCalibrator: {
          thresholds: [...isotonicCalibrator.thresholds],
          values: [...isotonicCalibrator.values],
        },
      };
    },

    import(state: {
      data: CalibrationData[];
      plattParams: PlattParameters;
      isotonicCalibrator: IsotonicCalibrator;
    }): void {
      data = [...state.data];
      plattParams = { ...state.plattParams };
      isotonicCalibrator = {
        thresholds: [...state.isotonicCalibrator.thresholds],
        values: [...state.isotonicCalibrator.values],
      };
    },
  };
}
