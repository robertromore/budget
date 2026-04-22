/**
 * Time-series forecasting unit tests.
 *
 * The forecasting service powers the Forecasts page, per-account +
 * per-budget projections, and feeds the BudgetRiskCard. Its public
 * forecasting primitives (exponential smoothing variants, moving
 * average, linear trend, ensemble) are pure math — they depend on
 * the `modelStore` / `featureService` only for DB-backed flows.
 *
 * These tests exercise the pure primitives directly and lock
 * invariants that would break any UI consumer:
 *   - predictions.length === horizon
 *   - lowerBound <= value <= upperBound
 *   - metrics.mape / rmse / mae are non-negative finite
 *   - on a trending series, the linear + double-exp methods track
 *     the trend into the forecast horizon
 */

import { describe, it, expect } from "vitest";
import { TimeSeriesForecastingService } from "$core/server/domains/ml/time-series/forecasting";

/** The public forecasting methods don't touch the injected deps. */
function makeService(): TimeSeriesForecastingService {
  return new TimeSeriesForecastingService(null as never, null as never);
}

/** Flat series around $100. SES/MA should track ~100 into the horizon. */
const FLAT_SERIES = [100, 102, 98, 101, 99, 100, 103, 97, 101, 100];

/** Monotonic upward trend. Linear + Holt methods should extrapolate upward. */
const TREND_SERIES = Array.from({ length: 12 }, (_, i) => 100 + i * 5);

/** Monthly seasonality (period 12) with mild trend — enough for Holt-Winters. */
const SEASONAL_SERIES = Array.from({ length: 36 }, (_, i) => {
  const seasonalFactor = 1 + 0.2 * Math.sin((2 * Math.PI * i) / 12);
  return (100 + i) * seasonalFactor;
});

function assertForecastShape(forecast: {
  predictions: Array<{ value: number; lowerBound: number; upperBound: number }>;
  metrics: { mape: number; rmse: number; mae: number };
}, horizon: number) {
  expect(forecast.predictions.length).toBe(horizon);
  for (const pred of forecast.predictions) {
    expect(pred.lowerBound).toBeLessThanOrEqual(pred.value);
    expect(pred.value).toBeLessThanOrEqual(pred.upperBound);
    expect(Number.isFinite(pred.value)).toBe(true);
  }
  expect(forecast.metrics.mape).toBeGreaterThanOrEqual(0);
  expect(forecast.metrics.rmse).toBeGreaterThanOrEqual(0);
  expect(forecast.metrics.mae).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(forecast.metrics.rmse)).toBe(true);
}

describe("simpleExponentialSmoothing", () => {
  const svc = makeService();

  it("produces horizon predictions with valid bounds", () => {
    const forecast = svc.simpleExponentialSmoothing(FLAT_SERIES, 6, 0.95);
    assertForecastShape(forecast, 6);
  });

  it("forecast on a flat series stays near the series mean", () => {
    const forecast = svc.simpleExponentialSmoothing(FLAT_SERIES, 3, 0.95);
    // Series hovers around 100; forecast should be within ~10% of that.
    for (const pred of forecast.predictions) {
      expect(pred.value).toBeGreaterThan(90);
      expect(pred.value).toBeLessThan(110);
    }
  });

  it("all SES predictions have the same point value", () => {
    // SES collapses to the last smoothed level — h>1 only widens the band.
    const forecast = svc.simpleExponentialSmoothing(FLAT_SERIES, 5, 0.95);
    const first = forecast.predictions[0].value;
    for (const pred of forecast.predictions) {
      expect(pred.value).toBeCloseTo(first, 10);
    }
  });

  it("confidence interval widens with horizon", () => {
    const forecast = svc.simpleExponentialSmoothing(FLAT_SERIES, 10, 0.95);
    const firstWidth =
      forecast.predictions[0].upperBound - forecast.predictions[0].lowerBound;
    const lastWidth =
      forecast.predictions[9].upperBound - forecast.predictions[9].lowerBound;
    expect(lastWidth).toBeGreaterThan(firstWidth);
  });
});

describe("doubleExponentialSmoothing (Holt)", () => {
  const svc = makeService();

  it("extrapolates an upward trend", () => {
    const forecast = svc.doubleExponentialSmoothing(TREND_SERIES, 3, 0.95);
    const lastObserved = TREND_SERIES[TREND_SERIES.length - 1];
    // Each horizon step should continue climbing.
    expect(forecast.predictions[0].value).toBeGreaterThan(lastObserved * 0.9);
    expect(forecast.predictions[2].value).toBeGreaterThan(
      forecast.predictions[0].value,
    );
  });

  it("produces horizon predictions with valid bounds", () => {
    const forecast = svc.doubleExponentialSmoothing(TREND_SERIES, 4, 0.95);
    assertForecastShape(forecast, 4);
  });
});

describe("tripleExponentialSmoothing (Holt-Winters)", () => {
  const svc = makeService();

  it("falls back to double-exp when series is too short for the season", () => {
    // Season length 12 needs at least 24 samples; give it only 10.
    const forecast = svc.tripleExponentialSmoothing(FLAT_SERIES, 3, 0.95, 12);
    assertForecastShape(forecast, 3);
  });

  it("handles a seasonal series end-to-end", () => {
    const forecast = svc.tripleExponentialSmoothing(SEASONAL_SERIES, 6, 0.95, 12);
    assertForecastShape(forecast, 6);
    // Values are clamped to >= 0 in the HW implementation.
    for (const pred of forecast.predictions) {
      expect(pred.value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("movingAverageForecast", () => {
  const svc = makeService();

  it("produces a constant forecast equal to the trailing-window mean", () => {
    const forecast = svc.movingAverageForecast(FLAT_SERIES, 4, 0.95, 3);
    // All horizon values are identical (constant extrapolation).
    const first = forecast.predictions[0].value;
    for (const pred of forecast.predictions) {
      expect(pred.value).toBeCloseTo(first, 10);
    }
    // And the value equals the mean of the last 3 observations.
    const expected =
      (FLAT_SERIES[7] + FLAT_SERIES[8] + FLAT_SERIES[9]) / 3;
    expect(first).toBeCloseTo(expected, 5);
  });

  it("picks a reasonable default window when none is supplied", () => {
    const forecast = svc.movingAverageForecast(FLAT_SERIES, 2, 0.95);
    assertForecastShape(forecast, 2);
  });
});

describe("linearTrendForecast", () => {
  const svc = makeService();

  it("extrapolates a perfect linear trend accurately", () => {
    // TREND_SERIES is 100, 105, 110, ..., 155.
    // Next value should be 160, then 165, then 170.
    const forecast = svc.linearTrendForecast(TREND_SERIES, 3, 0.95);
    expect(forecast.predictions[0].value).toBeCloseTo(160, 0);
    expect(forecast.predictions[1].value).toBeCloseTo(165, 0);
    expect(forecast.predictions[2].value).toBeCloseTo(170, 0);
  });

  it("has near-zero MAPE on a perfect linear series", () => {
    const forecast = svc.linearTrendForecast(TREND_SERIES, 3, 0.95);
    expect(forecast.metrics.mape).toBeLessThan(0.01);
    expect(forecast.metrics.rmse).toBeLessThan(0.01);
  });
});

describe("forecastEnsemble", () => {
  const svc = makeService();

  it("combines methods and returns a valid forecast on flat data", () => {
    const forecast = svc.forecastEnsemble(FLAT_SERIES, 4, 0.95);
    assertForecastShape(forecast, 4);
  });

  it("tracks the trend on a trending series", () => {
    const forecast = svc.forecastEnsemble(TREND_SERIES, 3, 0.95);
    assertForecastShape(forecast, 3);
    // Ensemble is a weighted blend — shouldn't predict below the
    // series mean on a strictly upward trend.
    const seriesMean =
      TREND_SERIES.reduce((a, b) => a + b, 0) / TREND_SERIES.length;
    expect(forecast.predictions[0].value).toBeGreaterThan(seriesMean);
  });

  it("handles short series (skips methods with minimum-sample gates)", () => {
    // 4 samples: only SES, MA, and linear should fire; double-exp
    // needs >=5, Holt-Winters needs >=24.
    const forecast = svc.forecastEnsemble([10, 12, 11, 13], 2, 0.95);
    assertForecastShape(forecast, 2);
  });
});
