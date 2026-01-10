/**
 * Utility Analytics
 *
 * Advanced analytics for utility accounts including:
 * - Anomaly detection (unusual bills, usage spikes, potential leaks)
 * - Usage forecasting (predict future consumption)
 * - Bill projection (estimate next bill amount)
 */

import type { UtilityUsage } from "$lib/schema/utility-usage";

// ============================================================================
// Types
// ============================================================================

export type AnomalyType =
  | "high_usage"      // Usage significantly above average
  | "low_usage"       // Usage significantly below average (vacation, etc.)
  | "high_cost"       // Cost per unit spike (rate increase)
  | "usage_spike"     // Sudden increase month-over-month
  | "potential_leak"  // Consistent high usage (water leak indicator)
  | "billing_error";  // Cost doesn't match expected calculation

export type AnomalySeverity = "info" | "warning" | "critical";

export interface UsageAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  recordId: number;
  periodStart: string;
  periodEnd: string;
  actualValue: number;
  expectedValue: number;
  deviationPercent: number;
  suggestions?: string[];
}

export interface UsageForecast {
  predictedUsage: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  basedOnMonths: number;
  methodology: "average" | "seasonal" | "trend";
  factors?: {
    seasonalAdjustment?: number;
    trendAdjustment?: number;
  };
}

export interface BillProjection {
  estimatedTotal: number;
  breakdown: {
    baseCharge: number;
    usageCost: number;
    estimatedTaxes: number;
    estimatedFees: number;
  };
  projectedUsage: number;
  basedOnRecords: number;
  confidenceLevel: "high" | "medium" | "low";
  notes?: string;
}

export interface UtilityStats {
  avgUsage: number;
  stdDevUsage: number;
  avgCostPerUnit: number;
  avgTotalBill: number;
  avgBaseCharge: number;
  avgTaxRate: number;
  avgFeeAmount: number;
}

// ============================================================================
// Statistical Helpers
// ============================================================================

/**
 * Calculate mean of an array of numbers
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calculate z-score (number of standard deviations from mean)
 */
function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Get month index (0-11) from date string
 */
function getMonthIndex(dateStr: string): number {
  return new Date(dateStr).getMonth();
}

// ============================================================================
// Utility Statistics
// ============================================================================

/**
 * Calculate aggregate statistics from usage records
 */
export function calculateUtilityStats(records: UtilityUsage[]): UtilityStats | null {
  if (records.length === 0) return null;

  const usageValues = records.map((r) => r.usageAmount);
  const avgUsage = mean(usageValues);
  const stdDevUsage = standardDeviation(usageValues);

  // Cost per unit (only from records with valid data)
  const costPerUnitValues = records
    .filter((r) => r.ratePerUnit && r.ratePerUnit > 0)
    .map((r) => r.ratePerUnit!);
  const avgCostPerUnit = mean(costPerUnitValues);

  // Average total bill
  const totalBills = records.map((r) => r.totalAmount);
  const avgTotalBill = mean(totalBills);

  // Average base charge
  const baseCharges = records.filter((r) => r.baseCharge).map((r) => r.baseCharge!);
  const avgBaseCharge = mean(baseCharges);

  // Average tax rate (as percentage of total)
  const taxRates = records
    .filter((r) => r.taxes && r.totalAmount > 0)
    .map((r) => (r.taxes! / r.totalAmount) * 100);
  const avgTaxRate = mean(taxRates);

  // Average fee amount
  const feeAmounts = records.filter((r) => r.fees).map((r) => r.fees!);
  const avgFeeAmount = mean(feeAmounts);

  return {
    avgUsage,
    stdDevUsage,
    avgCostPerUnit,
    avgTotalBill,
    avgBaseCharge,
    avgTaxRate,
    avgFeeAmount,
  };
}

// ============================================================================
// Anomaly Detection
// ============================================================================

/**
 * Detect anomalies in utility usage records
 * Returns list of detected anomalies sorted by severity
 */
export function detectAnomalies(
  records: UtilityUsage[],
  options: {
    zsScoreThreshold?: number; // Default: 2 (2 standard deviations)
    monthOverMonthThreshold?: number; // Default: 50 (50% change triggers spike)
    potentialLeakDays?: number; // Default: 60 (days of high usage for leak warning)
  } = {}
): UsageAnomaly[] {
  if (records.length < 3) return []; // Need at least 3 records for meaningful analysis

  const {
    zsScoreThreshold = 2,
    monthOverMonthThreshold = 50,
    potentialLeakDays = 60,
  } = options;

  const anomalies: UsageAnomaly[] = [];
  const stats = calculateUtilityStats(records);

  if (!stats) return [];

  // Sort records by date (oldest first)
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  );

  // Track consecutive high usage periods for leak detection
  let consecutiveHighUsageDays = 0;
  let leakStartRecord: UtilityUsage | null = null;

  for (let i = 0; i < sortedRecords.length; i++) {
    const record = sortedRecords[i];
    const prevRecord = i > 0 ? sortedRecords[i - 1] : null;

    // Calculate z-score for usage
    const usageZScore = zScore(record.usageAmount, stats.avgUsage, stats.stdDevUsage);

    // High usage anomaly (> 2 std devs above mean)
    if (usageZScore > zsScoreThreshold) {
      const deviationPercent = ((record.usageAmount - stats.avgUsage) / stats.avgUsage) * 100;

      anomalies.push({
        type: "high_usage",
        severity: usageZScore > 3 ? "critical" : "warning",
        message: `Usage ${deviationPercent.toFixed(0)}% above average`,
        recordId: record.id,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        actualValue: record.usageAmount,
        expectedValue: stats.avgUsage,
        deviationPercent,
        suggestions: [
          "Check for equipment issues or changes in usage patterns",
          "Compare with same month last year for seasonal context",
          record.usageUnit === "gallons" || record.usageUnit === "hcf"
            ? "Check for water leaks (running toilets, dripping faucets)"
            : undefined,
        ].filter(Boolean) as string[],
      });

      // Track for potential leak detection
      consecutiveHighUsageDays += record.daysInPeriod || 30;
      if (!leakStartRecord) leakStartRecord = record;
    } else {
      consecutiveHighUsageDays = 0;
      leakStartRecord = null;
    }

    // Low usage anomaly (< 2 std devs below mean)
    if (usageZScore < -zsScoreThreshold) {
      const deviationPercent = ((stats.avgUsage - record.usageAmount) / stats.avgUsage) * 100;

      anomalies.push({
        type: "low_usage",
        severity: "info",
        message: `Usage ${deviationPercent.toFixed(0)}% below average`,
        recordId: record.id,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        actualValue: record.usageAmount,
        expectedValue: stats.avgUsage,
        deviationPercent: -deviationPercent,
        suggestions: [
          "Possibly due to vacation or reduced occupancy",
          "Could indicate meter issues if unexpected",
        ],
      });
    }

    // Month-over-month spike detection
    if (prevRecord && prevRecord.usageAmount > 0) {
      const changePercent =
        ((record.usageAmount - prevRecord.usageAmount) / prevRecord.usageAmount) * 100;

      if (changePercent > monthOverMonthThreshold) {
        anomalies.push({
          type: "usage_spike",
          severity: changePercent > 100 ? "critical" : "warning",
          message: `${changePercent.toFixed(0)}% increase from previous period`,
          recordId: record.id,
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          actualValue: record.usageAmount,
          expectedValue: prevRecord.usageAmount,
          deviationPercent: changePercent,
          suggestions: [
            "Check for new appliances or equipment",
            "Review for seasonal changes (heating/cooling)",
            "Verify meter readings are correct",
          ],
        });
      }
    }

    // Cost per unit anomaly (rate increase detection)
    if (record.ratePerUnit && stats.avgCostPerUnit > 0) {
      const rateZScore = zScore(
        record.ratePerUnit,
        stats.avgCostPerUnit,
        standardDeviation(
          records.filter((r) => r.ratePerUnit).map((r) => r.ratePerUnit!)
        )
      );

      if (rateZScore > 2) {
        const deviationPercent =
          ((record.ratePerUnit - stats.avgCostPerUnit) / stats.avgCostPerUnit) * 100;

        anomalies.push({
          type: "high_cost",
          severity: deviationPercent > 50 ? "warning" : "info",
          message: `Rate ${deviationPercent.toFixed(0)}% above average`,
          recordId: record.id,
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          actualValue: record.ratePerUnit,
          expectedValue: stats.avgCostPerUnit,
          deviationPercent,
          suggestions: [
            "Utility may have raised rates",
            "Check for tier changes due to high usage",
            "Review your rate plan options",
          ],
        });
      }
    }

    // Billing error detection (actual cost doesn't match calculated)
    if (record.usageAmount > 0 && record.ratePerUnit && record.usageCost) {
      const expectedUsageCost = record.usageAmount * record.ratePerUnit;
      const costDiff = Math.abs(record.usageCost - expectedUsageCost);
      const costDiffPercent = (costDiff / expectedUsageCost) * 100;

      if (costDiffPercent > 10 && costDiff > 5) {
        // More than 10% off and more than $5 difference
        anomalies.push({
          type: "billing_error",
          severity: costDiffPercent > 25 ? "warning" : "info",
          message: `Usage cost differs from expected by ${costDiffPercent.toFixed(0)}%`,
          recordId: record.id,
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          actualValue: record.usageCost,
          expectedValue: expectedUsageCost,
          deviationPercent: costDiffPercent,
          suggestions: [
            "This may be due to tiered pricing",
            "Check for additional charges or credits",
            "Contact utility if discrepancy is significant",
          ],
        });
      }
    }
  }

  // Potential leak detection (water/gas accounts)
  if (
    consecutiveHighUsageDays >= potentialLeakDays &&
    leakStartRecord &&
    (leakStartRecord.usageUnit === "gallons" ||
      leakStartRecord.usageUnit === "hcf" ||
      leakStartRecord.usageUnit === "ccf")
  ) {
    anomalies.push({
      type: "potential_leak",
      severity: "critical",
      message: `Consistently high water usage for ${consecutiveHighUsageDays} days - possible leak`,
      recordId: leakStartRecord.id,
      periodStart: leakStartRecord.periodStart,
      periodEnd: sortedRecords[sortedRecords.length - 1].periodEnd,
      actualValue: consecutiveHighUsageDays,
      expectedValue: 0,
      deviationPercent: 100,
      suggestions: [
        "Check all faucets and toilets for leaks",
        "Inspect water heater for issues",
        "Look for wet spots in yard (underground leak)",
        "Consider hiring a plumber for inspection",
      ],
    });
  }

  // Sort by severity (critical first, then warning, then info)
  const severityOrder: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

// ============================================================================
// Usage Forecasting
// ============================================================================

/**
 * Forecast next period's usage based on historical data
 */
export function forecastUsage(
  records: UtilityUsage[],
  options: {
    targetMonth?: number; // 0-11, defaults to next month
    useSeasonal?: boolean; // Use seasonal patterns if enough data
  } = {}
): UsageForecast | null {
  if (records.length < 3) return null;

  const { targetMonth, useSeasonal = true } = options;

  // Sort records by date (oldest first)
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  );

  const usageValues = sortedRecords.map((r) => r.usageAmount);
  const avgUsage = mean(usageValues);
  const stdDev = standardDeviation(usageValues);

  // Determine target month
  const lastRecord = sortedRecords[sortedRecords.length - 1];
  const lastDate = new Date(lastRecord.periodEnd);
  const nextMonth = targetMonth ?? ((lastDate.getMonth() + 1) % 12);

  // Check if we have enough data for seasonal analysis (at least 12 months)
  const hasSeasonalData = sortedRecords.length >= 12 && useSeasonal;

  let predictedUsage: number;
  let methodology: "average" | "seasonal" | "trend";
  let seasonalAdjustment: number | undefined;
  let trendAdjustment: number | undefined;

  if (hasSeasonalData) {
    // Group records by month
    const monthlyUsage: Record<number, number[]> = {};
    for (const record of sortedRecords) {
      const month = getMonthIndex(record.periodStart);
      if (!monthlyUsage[month]) monthlyUsage[month] = [];
      monthlyUsage[month].push(record.usageAmount);
    }

    // Calculate seasonal factor for target month
    const targetMonthUsage = monthlyUsage[nextMonth] || [];
    const targetMonthAvg = targetMonthUsage.length > 0 ? mean(targetMonthUsage) : avgUsage;
    seasonalAdjustment = avgUsage > 0 ? targetMonthAvg / avgUsage : 1;

    // Calculate trend (linear regression on recent data)
    const recentRecords = sortedRecords.slice(-6); // Last 6 months
    if (recentRecords.length >= 3) {
      const trend = calculateTrend(recentRecords.map((r) => r.usageAmount));
      trendAdjustment = trend;
    }

    predictedUsage = targetMonthAvg * (1 + (trendAdjustment || 0) / 100);
    methodology = "seasonal";
  } else {
    // Simple average with trend
    const recentRecords = sortedRecords.slice(-6);
    if (recentRecords.length >= 3) {
      const trend = calculateTrend(recentRecords.map((r) => r.usageAmount));
      const recentAvg = mean(recentRecords.map((r) => r.usageAmount));
      predictedUsage = recentAvg * (1 + trend / 100);
      trendAdjustment = trend;
      methodology = "trend";
    } else {
      predictedUsage = avgUsage;
      methodology = "average";
    }
  }

  // Calculate confidence interval (±1.5 std devs)
  const margin = stdDev * 1.5;

  return {
    predictedUsage: Math.max(0, predictedUsage),
    confidenceInterval: {
      low: Math.max(0, predictedUsage - margin),
      high: predictedUsage + margin,
    },
    basedOnMonths: sortedRecords.length,
    methodology,
    factors: {
      seasonalAdjustment,
      trendAdjustment,
    },
  };
}

/**
 * Calculate trend as percentage change per period
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  // Simple linear trend calculation
  const n = values.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avg = sumY / n;

  // Return trend as percentage of average
  return avg > 0 ? (slope / avg) * 100 : 0;
}

// ============================================================================
// Bill Projection
// ============================================================================

/**
 * Project next bill amount based on usage forecast and historical costs
 */
export function projectBill(
  records: UtilityUsage[],
  options: {
    projectedUsage?: number; // Override usage forecast
    targetMonth?: number; // For seasonal rate adjustments
  } = {}
): BillProjection | null {
  if (records.length < 3) return null;

  const stats = calculateUtilityStats(records);
  if (!stats) return null;

  // Get usage forecast
  const usageForecast = forecastUsage(records, {
    targetMonth: options.targetMonth,
  });

  const projectedUsage = options.projectedUsage ?? usageForecast?.predictedUsage ?? stats.avgUsage;

  // Calculate cost components
  const baseCharge = stats.avgBaseCharge || 0;
  const usageCost = projectedUsage * stats.avgCostPerUnit;
  const subtotal = baseCharge + usageCost;

  // Estimate taxes and fees based on historical ratios
  const estimatedTaxes = subtotal * (stats.avgTaxRate / 100);
  const estimatedFees = stats.avgFeeAmount || 0;

  const estimatedTotal = baseCharge + usageCost + estimatedTaxes + estimatedFees;

  // Determine confidence level
  let confidenceLevel: "high" | "medium" | "low";
  if (records.length >= 12) {
    confidenceLevel = "high";
  } else if (records.length >= 6) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "low";
  }

  // Generate notes
  const notes: string[] = [];
  if (usageForecast?.factors?.seasonalAdjustment) {
    const adj = usageForecast.factors.seasonalAdjustment;
    if (adj > 1.1) {
      notes.push("Seasonal increase expected (heating/cooling season)");
    } else if (adj < 0.9) {
      notes.push("Seasonal decrease expected (mild weather)");
    }
  }
  if (usageForecast?.factors?.trendAdjustment) {
    const trend = usageForecast.factors.trendAdjustment;
    if (trend > 5) {
      notes.push("Upward usage trend detected");
    } else if (trend < -5) {
      notes.push("Downward usage trend detected");
    }
  }

  return {
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    breakdown: {
      baseCharge: Math.round(baseCharge * 100) / 100,
      usageCost: Math.round(usageCost * 100) / 100,
      estimatedTaxes: Math.round(estimatedTaxes * 100) / 100,
      estimatedFees: Math.round(estimatedFees * 100) / 100,
    },
    projectedUsage: Math.round(projectedUsage * 100) / 100,
    basedOnRecords: records.length,
    confidenceLevel,
    notes: notes.length > 0 ? notes.join(". ") : undefined,
  };
}
