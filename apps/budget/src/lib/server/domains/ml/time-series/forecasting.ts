/**
 * Time Series Forecasting Service
 *
 * Provides cash flow predictions, spending projections, and budget forecasting
 * using exponential smoothing, Holt-Winters, and ensemble methods.
 */

import { transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { linearRegression, linearRegressionLine, mean, standardDeviation } from "simple-statistics";
import type { FeatureEngineeringService } from "../feature-engineering";
import type { MLModelStore } from "../model-store";
import type {
  CashFlowPrediction,
  ForecastMetrics,
  ForecastPrediction,
  TimeSeriesForecast
} from "../types";
import { getWorkspaceAccountIds } from "../utils";
import { nowISOString } from "$lib/utils/dates";

export interface ForecastOptions {
  horizon: number;
  confidenceLevel?: number;
  includeDecomposition?: boolean;
  method?: "exponential" | "holt_winters" | "ensemble";
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
}

export class TimeSeriesForecastingService {
  constructor(
    private modelStore: MLModelStore,
    private featureService: FeatureEngineeringService
  ) {}

  // ==========================================================================
  // Cash Flow Predictions
  // ==========================================================================

  /**
   * Generate cash flow predictions for a workspace
   */
  async predictCashFlow(
    workspaceId: number,
    options: {
      horizon: number;
      granularity: "daily" | "weekly" | "monthly";
      accountId?: number;
    }
  ): Promise<CashFlowPrediction> {
    const { horizon, granularity, accountId } = options;

    // If accountId is provided, validate it belongs to the workspace
    if (accountId !== undefined) {
      const workspaceAccountIds = await getWorkspaceAccountIds(workspaceId);
      if (!workspaceAccountIds.includes(accountId)) {
        // Account doesn't belong to this workspace - return empty
        return this.createEmptyPrediction(horizon, granularity);
      }
    }

    // Get historical data
    const historical = await this.getHistoricalCashFlow(workspaceId, granularity, accountId);

    if (historical.length < 3) {
      return this.createEmptyPrediction(horizon, granularity);
    }

    // Generate predictions using ensemble
    const values = historical.map((h) => h.value);
    const forecast = this.forecastEnsemble(values, horizon, 0.95);

    // Calculate income vs expense breakdown
    const { incomePredictions, expensePredictions } = await this.predictIncomeExpense(
      workspaceId,
      horizon,
      granularity,
      accountId
    );

    // Generate date labels for predictions
    const lastDate = new Date(historical[historical.length - 1].date);
    const predictions = forecast.predictions.map((pred, i) => {
      const predDate = this.addPeriod(lastDate, granularity, i + 1);
      return {
        ...pred,
        date: predDate.toISOString().split("T")[0],
      };
    });

    return {
      predictions,
      incomePredictions,
      expensePredictions,
      decomposition: forecast.decomposition,
      metrics: forecast.metrics,
      confidence: this.calculateOverallConfidence(forecast),
      lastUpdated: nowISOString(),
    };
  }

  /**
   * Predict spending for a specific category
   */
  async predictCategorySpending(
    workspaceId: number,
    categoryId: number,
    options: ForecastOptions
  ): Promise<TimeSeriesForecast> {
    const historical = await this.getCategoryHistory(workspaceId, categoryId, 24);

    if (historical.length < 3) {
      return this.createEmptyForecast(options.horizon);
    }

    const values = historical.map((h) => h.value);
    return this.forecastEnsemble(values, options.horizon, options.confidenceLevel ?? 0.95);
  }

  /**
   * Predict spending for a specific payee
   */
  async predictPayeeSpending(
    workspaceId: number,
    payeeId: number,
    options: ForecastOptions
  ): Promise<TimeSeriesForecast> {
    const historical = await this.getPayeeHistory(workspaceId, payeeId, 24);

    if (historical.length < 3) {
      return this.createEmptyForecast(options.horizon);
    }

    const values = historical.map((h) => h.value);
    return this.forecastEnsemble(values, options.horizon, options.confidenceLevel ?? 0.95);
  }

  // ==========================================================================
  // Forecasting Methods
  // ==========================================================================

  /**
   * Ensemble forecast combining multiple methods
   */
  forecastEnsemble(values: number[], horizon: number, confidenceLevel: number): TimeSeriesForecast {
    const forecasts: TimeSeriesForecast[] = [];

    // Simple Exponential Smoothing
    forecasts.push(this.simpleExponentialSmoothing(values, horizon, confidenceLevel));

    // Double Exponential Smoothing (Holt's method) for trend
    if (values.length >= 5) {
      forecasts.push(this.doubleExponentialSmoothing(values, horizon, confidenceLevel));
    }

    // Triple Exponential Smoothing (Holt-Winters) for seasonality
    if (values.length >= 24) {
      forecasts.push(this.tripleExponentialSmoothing(values, horizon, confidenceLevel, 12));
    }

    // Moving Average
    forecasts.push(this.movingAverageForecast(values, horizon, confidenceLevel));

    // Linear Trend
    forecasts.push(this.linearTrendForecast(values, horizon, confidenceLevel));

    // Combine forecasts using weighted average based on fit
    return this.combineForecasts(forecasts, values);
  }

  /**
   * Simple Exponential Smoothing (SES)
   * Good for data without trend or seasonality
   */
  simpleExponentialSmoothing(
    values: number[],
    horizon: number,
    confidenceLevel: number,
    alpha?: number
  ): TimeSeriesForecast {
    const n = values.length;

    // Optimize alpha if not provided
    const optAlpha = alpha ?? this.optimizeAlpha(values);

    // Calculate smoothed values
    const smoothed: number[] = [values[0]];
    for (let i = 1; i < n; i++) {
      smoothed.push(optAlpha * values[i] + (1 - optAlpha) * smoothed[i - 1]);
    }

    // Last smoothed value is the forecast for all future periods
    const lastSmoothed = smoothed[n - 1];

    // Calculate residuals for confidence intervals
    const residuals = values.map((v, i) => v - smoothed[i]);
    const residualStd = standardDeviation(residuals);
    const zScore = this.getZScore(confidenceLevel);

    // Generate predictions
    const predictions: ForecastPrediction[] = [];
    for (let h = 1; h <= horizon; h++) {
      const intervalWidth = zScore * residualStd * Math.sqrt(h);
      predictions.push({
        date: "",
        value: lastSmoothed,
        lowerBound: lastSmoothed - intervalWidth,
        upperBound: lastSmoothed + intervalWidth,
        confidence: confidenceLevel,
      });
    }

    // Calculate fit metrics
    const metrics = this.calculateMetrics(values, smoothed);

    return {
      predictions,
      decomposition: {
        trend: smoothed,
        seasonal: Array(n).fill(0),
        residual: residuals,
      },
      metrics,
    };
  }

  /**
   * Double Exponential Smoothing (Holt's method)
   * Good for data with trend but no seasonality
   */
  doubleExponentialSmoothing(
    values: number[],
    horizon: number,
    confidenceLevel: number,
    alpha?: number,
    beta?: number
  ): TimeSeriesForecast {
    const n = values.length;

    // Optimize parameters if not provided
    const optAlpha = alpha ?? 0.3;
    const optBeta = beta ?? 0.1;

    // Initialize
    const level: number[] = [values[0]];
    const trend: number[] = [values[1] - values[0]];

    // Calculate smoothed values
    for (let i = 1; i < n; i++) {
      const newLevel = optAlpha * values[i] + (1 - optAlpha) * (level[i - 1] + trend[i - 1]);
      const newTrend = optBeta * (newLevel - level[i - 1]) + (1 - optBeta) * trend[i - 1];
      level.push(newLevel);
      trend.push(newTrend);
    }

    // Calculate fitted values
    const fitted = level.map((l, i) => (i > 0 ? level[i - 1] + trend[i - 1] : values[0]));

    // Calculate residuals
    const residuals = values.map((v, i) => v - fitted[i]);
    const residualStd = standardDeviation(residuals);
    const zScore = this.getZScore(confidenceLevel);

    // Generate predictions
    const predictions: ForecastPrediction[] = [];
    const lastLevel = level[n - 1];
    const lastTrend = trend[n - 1];

    for (let h = 1; h <= horizon; h++) {
      const forecast = lastLevel + h * lastTrend;
      const intervalWidth = zScore * residualStd * Math.sqrt(h);
      predictions.push({
        date: "",
        value: forecast,
        lowerBound: forecast - intervalWidth,
        upperBound: forecast + intervalWidth,
        confidence: confidenceLevel,
      });
    }

    // Calculate fit metrics
    const metrics = this.calculateMetrics(values, fitted);

    return {
      predictions,
      decomposition: {
        trend: level,
        seasonal: Array(n).fill(0),
        residual: residuals,
      },
      metrics,
    };
  }

  /**
   * Triple Exponential Smoothing (Holt-Winters)
   * Good for data with trend and seasonality
   */
  tripleExponentialSmoothing(
    values: number[],
    horizon: number,
    confidenceLevel: number,
    seasonLength: number,
    alpha?: number,
    beta?: number,
    gamma?: number
  ): TimeSeriesForecast {
    const n = values.length;

    if (n < seasonLength * 2) {
      return this.doubleExponentialSmoothing(values, horizon, confidenceLevel);
    }

    const optAlpha = alpha ?? 0.3;
    const optBeta = beta ?? 0.1;
    const optGamma = gamma ?? 0.1;

    // Initialize seasonal factors using first complete season
    const seasonal: number[] = [];
    const firstSeasonMean = mean(values.slice(0, seasonLength));
    for (let i = 0; i < seasonLength; i++) {
      seasonal.push(values[i] / (firstSeasonMean || 1));
    }

    // Initialize level and trend
    const level: number[] = [firstSeasonMean];
    const trend: number[] = [(mean(values.slice(seasonLength, seasonLength * 2)) - firstSeasonMean) / seasonLength];

    // Calculate smoothed values
    for (let i = 1; i < n; i++) {
      const seasonIdx = i % seasonLength;
      const prevSeason = seasonal[seasonIdx] || 1;

      const newLevel =
        optAlpha * (values[i] / prevSeason) + (1 - optAlpha) * (level[i - 1] + trend[i - 1]);

      const newTrend = optBeta * (newLevel - level[i - 1]) + (1 - optBeta) * trend[i - 1];

      const newSeasonal = optGamma * (values[i] / newLevel) + (1 - optGamma) * prevSeason;

      level.push(newLevel);
      trend.push(newTrend);
      seasonal[seasonIdx] = newSeasonal;
    }

    // Calculate fitted values
    const fitted = values.map((_, i) => {
      if (i === 0) return values[0];
      const seasonIdx = i % seasonLength;
      return (level[i - 1] + trend[i - 1]) * (seasonal[seasonIdx] || 1);
    });

    // Calculate residuals
    const residuals = values.map((v, i) => v - fitted[i]);
    const residualStd = standardDeviation(residuals);
    const zScore = this.getZScore(confidenceLevel);

    // Generate predictions
    const predictions: ForecastPrediction[] = [];
    const lastLevel = level[n - 1];
    const lastTrend = trend[n - 1];

    for (let h = 1; h <= horizon; h++) {
      const seasonIdx = (n + h - 1) % seasonLength;
      const forecast = (lastLevel + h * lastTrend) * (seasonal[seasonIdx] || 1);
      const intervalWidth = zScore * residualStd * Math.sqrt(h);
      predictions.push({
        date: "",
        value: Math.max(0, forecast),
        lowerBound: Math.max(0, forecast - intervalWidth),
        upperBound: forecast + intervalWidth,
        confidence: confidenceLevel,
      });
    }

    // Create seasonal component array
    const seasonalComponent = values.map((_, i) => seasonal[i % seasonLength] || 1);

    const metrics = this.calculateMetrics(values, fitted);

    return {
      predictions,
      decomposition: {
        trend: level,
        seasonal: seasonalComponent,
        residual: residuals,
      },
      metrics,
    };
  }

  /**
   * Moving Average Forecast
   */
  movingAverageForecast(
    values: number[],
    horizon: number,
    confidenceLevel: number,
    windowSize?: number
  ): TimeSeriesForecast {
    const n = values.length;
    const window = windowSize ?? Math.min(6, Math.floor(n / 2));

    // Calculate moving average for last window
    const recentValues = values.slice(-window);
    const forecastValue = mean(recentValues);

    // Calculate fitted values
    const fitted: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i < window) {
        fitted.push(mean(values.slice(0, i + 1)));
      } else {
        fitted.push(mean(values.slice(i - window + 1, i + 1)));
      }
    }

    // Calculate residuals
    const residuals = values.map((v, i) => v - fitted[i]);
    const residualStd = standardDeviation(residuals);
    const zScore = this.getZScore(confidenceLevel);

    // Generate predictions
    const predictions: ForecastPrediction[] = [];
    for (let h = 1; h <= horizon; h++) {
      const intervalWidth = zScore * residualStd * Math.sqrt(1 + h / window);
      predictions.push({
        date: "",
        value: forecastValue,
        lowerBound: Math.max(0, forecastValue - intervalWidth),
        upperBound: forecastValue + intervalWidth,
        confidence: confidenceLevel,
      });
    }

    const metrics = this.calculateMetrics(values, fitted);

    return {
      predictions,
      decomposition: {
        trend: fitted,
        seasonal: Array(n).fill(0),
        residual: residuals,
      },
      metrics,
    };
  }

  /**
   * Linear Trend Forecast
   */
  linearTrendForecast(values: number[], horizon: number, confidenceLevel: number): TimeSeriesForecast {
    const n = values.length;

    // Create x-y pairs
    const data: [number, number][] = values.map((v, i) => [i, v]);

    // Fit linear regression
    const regression = linearRegression(data);
    const line = linearRegressionLine(regression);

    // Calculate fitted values
    const fitted = values.map((_, i) => line(i));

    // Calculate residuals
    const residuals = values.map((v, i) => v - fitted[i]);
    const residualStd = standardDeviation(residuals);
    const zScore = this.getZScore(confidenceLevel);

    // Generate predictions
    const predictions: ForecastPrediction[] = [];
    for (let h = 1; h <= horizon; h++) {
      const forecast = line(n - 1 + h);
      const intervalWidth = zScore * residualStd * Math.sqrt(1 + (1 / n) + Math.pow(h, 2) / n);
      predictions.push({
        date: "",
        value: Math.max(0, forecast),
        lowerBound: Math.max(0, forecast - intervalWidth),
        upperBound: forecast + intervalWidth,
        confidence: confidenceLevel,
      });
    }

    const metrics = this.calculateMetrics(values, fitted);

    return {
      predictions,
      decomposition: {
        trend: fitted,
        seasonal: Array(n).fill(0),
        residual: residuals,
      },
      metrics,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Combine multiple forecasts using weighted average
   */
  private combineForecasts(forecasts: TimeSeriesForecast[], actualValues: number[]): TimeSeriesForecast {
    if (forecasts.length === 0) {
      throw new Error("No forecasts to combine");
    }

    if (forecasts.length === 1) {
      return forecasts[0];
    }

    // Calculate weights based on inverse MAPE (better fit = higher weight)
    const weights = forecasts.map((f) => {
      const mape = f.metrics.mape || 0.5;
      return 1 / (mape + 0.01); // Add small constant to avoid division by zero
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    // Combine predictions
    const horizon = forecasts[0].predictions.length;
    const combinedPredictions: ForecastPrediction[] = [];

    for (let h = 0; h < horizon; h++) {
      let value = 0;
      let lowerBound = 0;
      let upperBound = 0;

      for (let i = 0; i < forecasts.length; i++) {
        const pred = forecasts[i].predictions[h];
        value += normalizedWeights[i] * pred.value;
        lowerBound += normalizedWeights[i] * pred.lowerBound;
        upperBound += normalizedWeights[i] * pred.upperBound;
      }

      combinedPredictions.push({
        date: forecasts[0].predictions[h].date,
        value,
        lowerBound,
        upperBound,
        confidence: forecasts[0].predictions[h].confidence,
      });
    }

    // Use decomposition from best performing method
    const bestIdx = weights.indexOf(Math.max(...weights));
    const bestForecast = forecasts[bestIdx];

    // Calculate combined metrics
    const combinedMetrics: ForecastMetrics = {
      mape: mean(forecasts.map((f) => f.metrics.mape)),
      rmse: mean(forecasts.map((f) => f.metrics.rmse)),
      mae: mean(forecasts.map((f) => f.metrics.mae)),
    };

    return {
      predictions: combinedPredictions,
      decomposition: bestForecast.decomposition,
      metrics: combinedMetrics,
    };
  }

  /**
   * Calculate forecast accuracy metrics
   */
  private calculateMetrics(actual: number[], fitted: number[]): ForecastMetrics {
    const n = actual.length;
    let sumAbsError = 0;
    let sumSquaredError = 0;
    let sumAbsPercentError = 0;
    let validPctCount = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - fitted[i];
      sumAbsError += Math.abs(error);
      sumSquaredError += error * error;

      if (actual[i] !== 0) {
        sumAbsPercentError += Math.abs(error / actual[i]);
        validPctCount++;
      }
    }

    return {
      mape: validPctCount > 0 ? sumAbsPercentError / validPctCount : 0,
      rmse: Math.sqrt(sumSquaredError / n),
      mae: sumAbsError / n,
    };
  }

  /**
   * Optimize alpha for simple exponential smoothing
   */
  private optimizeAlpha(values: number[]): number {
    let bestAlpha = 0.3;
    let bestError = Infinity;

    for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
      let smoothed = values[0];
      let totalError = 0;

      for (let i = 1; i < values.length; i++) {
        const error = Math.abs(values[i] - smoothed);
        totalError += error;
        smoothed = alpha * values[i] + (1 - alpha) * smoothed;
      }

      if (totalError < bestError) {
        bestError = totalError;
        bestAlpha = alpha;
      }
    }

    return bestAlpha;
  }

  /**
   * Get z-score for confidence level
   */
  private getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = {
      0.8: 1.28,
      0.85: 1.44,
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidenceLevel] || 1.96;
  }

  /**
   * Calculate overall confidence from forecast
   */
  private calculateOverallConfidence(forecast: TimeSeriesForecast): number {
    const mape = forecast.metrics.mape;
    // Convert MAPE to confidence (lower error = higher confidence)
    return Math.max(0, Math.min(1, 1 - mape));
  }

  // ==========================================================================
  // Data Retrieval Methods
  // ==========================================================================

  /**
   * Get historical cash flow data
   * For daily/weekly granularity, fills gaps with zeros to create a complete time series
   */
  private async getHistoricalCashFlow(
    workspaceId: number,
    granularity: "daily" | "weekly" | "monthly",
    accountId?: number
  ): Promise<HistoricalDataPoint[]> {
    const dateFormat =
      granularity === "daily"
        ? "%Y-%m-%d"
        : granularity === "weekly"
          ? "%Y-W%W"
          : "%Y-%m";

    // Get account IDs for workspace filtering
    let accountIds: number[];
    if (accountId !== undefined) {
      // Specific account requested - only use that account
      accountIds = [accountId];
    } else {
      // No specific account - get all workspace accounts
      accountIds = await getWorkspaceAccountIds(workspaceId);
      if (accountIds.length === 0) {
        return [];
      }
    }

    // Calculate cutoff date and period count
    const now = new Date();
    const cutoff = new Date();
    let periodCount: number;

    if (granularity === "daily") {
      cutoff.setDate(cutoff.getDate() - 90);
      periodCount = 90;
    } else if (granularity === "weekly") {
      cutoff.setDate(cutoff.getDate() - 168); // 24 weeks
      periodCount = 24;
    } else {
      cutoff.setMonth(cutoff.getMonth() - 24);
      periodCount = 24;
    }

    const result = await db
      .select({
        period: sql<string>`strftime('${sql.raw(dateFormat)}', ${transactions.date})`,
        total: sql<number>`SUM(${transactions.amount}) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, cutoff.toISOString().split("T")[0])
        )
      )
      .groupBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`)
      .orderBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`);

    // Convert to map for easy lookup
    const dataMap = new Map(result.map((r) => [r.period, r.total ?? 0]));

    // Fill gaps with zeros to create complete time series
    const filledData: HistoricalDataPoint[] = [];

    if (granularity === "daily") {
      // Generate all dates from cutoff to now
      const current = new Date(cutoff);
      while (current <= now) {
        const dateStr = current.toISOString().split("T")[0];
        filledData.push({
          date: dateStr,
          value: dataMap.get(dateStr) ?? 0,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (granularity === "weekly") {
      // Generate all weeks from cutoff to now
      const current = new Date(cutoff);
      // Align to start of week (Monday)
      current.setDate(current.getDate() - current.getDay() + 1);
      while (current <= now) {
        const year = current.getFullYear();
        const weekNum = this.getWeekNumber(current);
        const weekStr = `${year}-W${weekNum.toString().padStart(2, "0")}`;
        filledData.push({
          date: weekStr,
          value: dataMap.get(weekStr) ?? 0,
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Monthly - generate all months from cutoff to now
      const current = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
      const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      while (current <= endMonth) {
        const monthStr = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, "0")}`;
        filledData.push({
          date: monthStr,
          value: dataMap.get(monthStr) ?? 0,
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    return filledData;
  }

  /**
   * Get ISO week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Get category spending history
   */
  private async getCategoryHistory(
    workspaceId: number,
    categoryId: number,
    months: number
  ): Promise<HistoricalDataPoint[]> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return [];
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const result = await db
      .select({
        period: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        total: sql<number>`SUM(ABS(${transactions.amount})) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          eq(transactions.categoryId, categoryId),
          gte(transactions.date, cutoff.toISOString().split("T")[0])
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
      .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

    return result.map((r) => ({
      date: r.period,
      value: r.total ?? 0,
    }));
  }

  /**
   * Get payee spending history
   */
  private async getPayeeHistory(
    workspaceId: number,
    payeeId: number,
    months: number
  ): Promise<HistoricalDataPoint[]> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return [];
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const result = await db
      .select({
        period: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        total: sql<number>`SUM(ABS(${transactions.amount})) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          eq(transactions.payeeId, payeeId),
          gte(transactions.date, cutoff.toISOString().split("T")[0])
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
      .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

    return result.map((r) => ({
      date: r.period,
      value: r.total ?? 0,
    }));
  }

  /**
   * Predict income and expenses separately
   */
  private async predictIncomeExpense(
    workspaceId: number,
    horizon: number,
    granularity: "daily" | "weekly" | "monthly",
    accountId?: number
  ): Promise<{
    incomePredictions: ForecastPrediction[];
    expensePredictions: ForecastPrediction[];
  }> {
    const dateFormat =
      granularity === "daily"
        ? "%Y-%m-%d"
        : granularity === "weekly"
          ? "%Y-W%W"
          : "%Y-%m";

    // Get account IDs for workspace filtering
    let accountIds: number[];
    if (accountId !== undefined) {
      // Specific account requested - only use that account
      accountIds = [accountId];
    } else {
      // No specific account - get all workspace accounts
      accountIds = await getWorkspaceAccountIds(workspaceId);
      if (accountIds.length === 0) {
        return { incomePredictions: [], expensePredictions: [] };
      }
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 24);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    // Get income history
    const incomeResult = await db
      .select({
        period: sql<string>`strftime('${sql.raw(dateFormat)}', ${transactions.date})`,
        total: sql<number>`SUM(${transactions.amount}) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, cutoffDate),
          sql`${transactions.amount} > 0`
        )
      )
      .groupBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`)
      .orderBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`);

    // Get expense history
    const expenseResult = await db
      .select({
        period: sql<string>`strftime('${sql.raw(dateFormat)}', ${transactions.date})`,
        total: sql<number>`SUM(ABS(${transactions.amount})) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, cutoffDate),
          sql`${transactions.amount} < 0`
        )
      )
      .groupBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`)
      .orderBy(sql`strftime('${sql.raw(dateFormat)}', ${transactions.date})`);

    const incomeValues = incomeResult.map((r) => r.total ?? 0);
    const expenseValues = expenseResult.map((r) => r.total ?? 0);

    const incomeForecast =
      incomeValues.length >= 3
        ? this.forecastEnsemble(incomeValues, horizon, 0.95)
        : this.createEmptyForecast(horizon);

    const expenseForecast =
      expenseValues.length >= 3
        ? this.forecastEnsemble(expenseValues, horizon, 0.95)
        : this.createEmptyForecast(horizon);

    return {
      incomePredictions: incomeForecast.predictions,
      expensePredictions: expenseForecast.predictions,
    };
  }

  /**
   * Add period to date based on granularity
   */
  private addPeriod(date: Date, granularity: "daily" | "weekly" | "monthly", periods: number): Date {
    const result = new Date(date);
    if (granularity === "daily") {
      result.setDate(result.getDate() + periods);
    } else if (granularity === "weekly") {
      result.setDate(result.getDate() + periods * 7);
    } else {
      result.setMonth(result.getMonth() + periods);
    }
    return result;
  }

  /**
   * Create empty prediction for insufficient data
   */
  private createEmptyPrediction(horizon: number, granularity: string): CashFlowPrediction {
    return {
      predictions: [],
      incomePredictions: [],
      expensePredictions: [],
      decomposition: { trend: [], seasonal: [], residual: [] },
      metrics: { mape: 0, rmse: 0, mae: 0 },
      confidence: 0,
      lastUpdated: nowISOString(),
    };
  }

  /**
   * Create empty forecast for insufficient data
   */
  private createEmptyForecast(horizon: number): TimeSeriesForecast {
    return {
      predictions: [],
      decomposition: { trend: [], seasonal: [], residual: [] },
      metrics: { mape: 0, rmse: 0, mae: 0 },
    };
  }

  // ==========================================================================
  // Model Persistence
  // ==========================================================================

  /**
   * Save forecast model parameters
   */
  async saveModel(
    workspaceId: number,
    entityType: string,
    entityId: number,
    parameters: Record<string, unknown>,
    metrics: Record<string, number>
  ): Promise<number> {
    return this.modelStore.saveModel(workspaceId, {
      modelType: "time_series",
      modelName: `forecast_${entityType}`,
      entityType,
      entityId,
      parameters,
      metrics,
    });
  }

  /**
   * Load forecast model parameters
   */
  async loadModel(
    workspaceId: number,
    entityType: string,
    entityId: number
  ): Promise<Record<string, unknown> | null> {
    const model = await this.modelStore.getModel(
      workspaceId,
      "time_series",
      `forecast_${entityType}`,
      entityType,
      entityId
    );
    return model?.parameters ?? null;
  }
}

/**
 * Create a time series forecasting service instance
 */
export function createTimeSeriesForecastingService(
  modelStore: MLModelStore,
  featureService: FeatureEngineeringService
): TimeSeriesForecastingService {
  return new TimeSeriesForecastingService(modelStore, featureService);
}
