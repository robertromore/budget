/**
 * Anomaly detector unit tests.
 *
 * Each detector translates raw transaction data into a 0-1 anomaly
 * score + a `triggered` boolean. Those scores drive the Intelligence
 * dashboard's flag counts, the per-row alerts, and downstream
 * "AI enhancement" decisions. Threshold tweaks silently shift what
 * gets flagged — hence the characterization-test style here: lock
 * the expected band each detector returns on a fixed fixture so a
 * future tuning pass can't quietly change user-visible behaviour.
 *
 * Focus: detectors with pure inputs (amount + historical stats /
 * context). Service-level orchestration is covered separately when
 * it needs tests.
 */

import { describe, it, expect } from "vitest";
import {
  calculateHistoricalStats,
  FrequencyAnomalyDetector,
  IQRDetector,
  IsolationForestDetector,
  ModifiedZScoreDetector,
  PercentileDetector,
  RepeatedAmountDetector,
  RoundNumberDetector,
  TimeOfDayDetector,
  ZScoreDetector,
} from "$core/server/domains/ml/anomaly-detection/detectors";

/**
 * Standard coffee-spend fixture. 20 historical charges clustering
 * around $5, with a couple of legitimate outliers to give the
 * median/MAD detectors something to work with.
 */
const COFFEE_SPEND = [
  4.25, 4.5, 4.75, 4.85, 5.0, 5.0, 5.0, 5.25, 5.25, 5.25, 5.5, 5.5, 5.5, 5.75, 6.0, 6.25, 6.5,
  6.75, 7.0, 8.0,
];

/**
 * Sparse fixture — only 3 historical amounts. Used to assert
 * "insufficient data" short-circuits on the statistical detectors.
 */
const SPARSE = [5, 6, 7];

describe("calculateHistoricalStats", () => {
  it("returns the identity stats for an empty array", () => {
    const stats = calculateHistoricalStats([]);
    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
    expect(stats.stdDev).toBe(0);
    expect(stats.iqr).toBe(0);
  });

  it("operates on absolute values (mixes inflows + outflows)", () => {
    const stats = calculateHistoricalStats([-100, -50, 25, -75]);
    expect(stats.min).toBe(25);
    expect(stats.max).toBe(100);
    expect(stats.count).toBe(4);
    // Mean of |[-100, -50, 25, -75]| = (100+50+25+75) / 4 = 62.5
    expect(stats.mean).toBe(62.5);
  });

  it("stdDev is 0 for a single-value fixture", () => {
    expect(calculateHistoricalStats([42]).stdDev).toBe(0);
  });

  it("produces the expected bands on the coffee fixture", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    expect(stats.count).toBe(20);
    // Median of the 20-amount fixture sits between the 10th/11th
    // sorted value — 5.25 and 5.5 → 5.375 (actual median).
    expect(stats.median).toBeCloseTo(5.375, 2);
    // The IQR should be narrow since the fixture clusters tightly.
    expect(stats.iqr).toBeGreaterThan(0);
    expect(stats.iqr).toBeLessThan(2);
  });
});

describe("ZScoreDetector", () => {
  const detector = new ZScoreDetector(2.5);

  it("does not trigger on insufficient data (count < 5)", () => {
    const stats = calculateHistoricalStats(SPARSE);
    const result = detector.detect(100, stats);
    expect(result.triggered).toBe(false);
    expect(result.score).toBe(0);
  });

  it("does not trigger when amount is near the mean", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(5.5, stats);
    expect(result.triggered).toBe(false);
    expect(result.score).toBeLessThan(0.3);
  });

  it("triggers on a clearly anomalous amount", () => {
    // $500 coffee is well beyond any reasonable z-score band.
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(500, stats);
    expect(result.triggered).toBe(true);
    expect(result.score).toBeGreaterThan(0.8);
    expect(result.reason).toMatch(/high/i);
  });

  it("score scales with distance from the mean", () => {
    // On the tight coffee cluster, stdDev is small (~1), so even
    // modest deviations map to high z-scores. Assert monotonicity:
    // a $50 spend should score at least as high as an $8 spend.
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const small = detector.detect(8, stats);
    const big = detector.detect(50, stats);
    expect(big.score).toBeGreaterThanOrEqual(small.score);
    expect(small.score).toBeGreaterThan(0);
  });
});

describe("IQRDetector", () => {
  const detector = new IQRDetector(1.5);

  it("does not trigger on insufficient data", () => {
    const stats = calculateHistoricalStats(SPARSE);
    const result = detector.detect(100, stats);
    expect(result.triggered).toBe(false);
  });

  it("does not trigger inside the whisker bounds", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(5.5, stats);
    expect(result.triggered).toBe(false);
  });

  it("triggers above the upper fence", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(50, stats);
    expect(result.triggered).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reason).toMatch(/upper fence/i);
  });
});

describe("ModifiedZScoreDetector", () => {
  const detector = new ModifiedZScoreDetector(3.5);

  it("does not trigger on insufficient data", () => {
    const stats = calculateHistoricalStats(SPARSE);
    const result = detector.detect(100, stats);
    expect(result.triggered).toBe(false);
  });

  it("uses median-based stats that are robust to a single prior outlier", () => {
    // Adding a $1,000 legitimate prior drags `mean` up meaningfully
    // but leaves the median essentially untouched. The modified
    // z-score relies on (median, MAD), so the shift in mean has no
    // effect on detection — demonstrated here by comparing the
    // detector's score on the same probe with and without the
    // outlier added.
    const withoutOutlier = calculateHistoricalStats(COFFEE_SPEND);
    const withOutlier = calculateHistoricalStats([...COFFEE_SPEND, 1000]);

    // Mean IS dragged up by the outlier — confirms the regression
    // risk we're defending against.
    expect(withOutlier.mean).toBeGreaterThan(withoutOutlier.mean * 5);

    // But median stays essentially the same.
    expect(Math.abs(withOutlier.median - withoutOutlier.median)).toBeLessThan(0.5);

    // So the modified-z detector gives a very similar reading on a
    // modest $15 probe in both cases.
    const probeWithout = detector.detect(15, withoutOutlier);
    const probeWith = detector.detect(15, withOutlier);
    expect(Math.abs(probeWith.score - probeWithout.score)).toBeLessThan(0.1);
  });

  it("triggers on a clearly anomalous amount", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(500, stats);
    expect(result.triggered).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });
});

describe("PercentileDetector", () => {
  const detector = new PercentileDetector(0.01, 0.99);

  it("does not trigger on insufficient data (count < 10)", () => {
    const stats = calculateHistoricalStats(SPARSE);
    const result = detector.detect(100, stats);
    expect(result.triggered).toBe(false);
  });

  it("does not trigger on an amount inside the 1st-99th percentile", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(5.5, stats);
    expect(result.triggered).toBe(false);
  });

  it("triggers above the 99th percentile", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(50, stats);
    expect(result.triggered).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("IsolationForestDetector", () => {
  const detector = new IsolationForestDetector();

  it("returns a score in [0,1]", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(50, stats);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("does not trigger on normal amounts", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(5.5, stats);
    expect(result.triggered).toBe(false);
  });
});

describe("RoundNumberDetector", () => {
  const detector = new RoundNumberDetector();

  it("flags multiples of 1,000 as highly suspicious", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(5000, stats);
    expect(result.triggered).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    expect(result.details?.roundnessLevel).toBe("thousand");
  });

  it("flags multiples of 100 above $50 as moderately suspicious", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(300, stats);
    expect(result.triggered).toBe(true);
    expect(result.details?.roundnessLevel).toBe("hundred");
  });

  it("reduces score for small round amounts (<$50)", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(10, stats);
    // $10 is a round ten but under the $50 floor — should not trigger.
    expect(result.triggered).toBe(false);
  });

  it("does not flag non-round amounts", () => {
    const stats = calculateHistoricalStats(COFFEE_SPEND);
    const result = detector.detect(37.42, stats);
    expect(result.triggered).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe("FrequencyAnomalyDetector", () => {
  const detector = new FrequencyAnomalyDetector();
  const stats = calculateHistoricalStats(COFFEE_SPEND);

  it("does not trigger without frequency context", () => {
    const result = detector.detect(5, stats);
    expect(result.triggered).toBe(false);
  });

  it("flags massively over-expected frequency", () => {
    const result = detector.detect(5, stats, {
      recentTransactionCount: 50,
      expectedCount: 5,
      daysSinceLastTransaction: 1,
    });
    expect(result.score).toBeGreaterThan(0);
  });

  it("does not flag expected-frequency patterns", () => {
    const result = detector.detect(5, stats, {
      recentTransactionCount: 5,
      expectedCount: 5,
      daysSinceLastTransaction: 1,
    });
    expect(result.triggered).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe("TimeOfDayDetector", () => {
  const detector = new TimeOfDayDetector();
  const stats = calculateHistoricalStats(COFFEE_SPEND);

  it("does not trigger for daytime transactions", () => {
    // 2 PM — squarely in the normal band.
    const result = detector.detect(5, stats, { hour: 14 });
    expect(result.triggered).toBe(false);
  });

  it("returns a score in [0,1]", () => {
    // 3 AM — inside the unusual-hours window.
    const result = detector.detect(5, stats, { hour: 3 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

describe("RepeatedAmountDetector", () => {
  const detector = new RepeatedAmountDetector();
  const stats = calculateHistoricalStats(COFFEE_SPEND);

  it("does not trigger without context", () => {
    const result = detector.detect(5, stats);
    expect(result.triggered).toBe(false);
  });

  it("flags many identical recent amounts", () => {
    const result = detector.detect(99.99, stats, {
      recentAmounts: [99.99, 99.99, 99.99, 99.99, 99.99],
    });
    expect(result.score).toBeGreaterThan(0);
  });

  it("does not flag a one-off amount", () => {
    const result = detector.detect(99.99, stats, {
      recentAmounts: [5, 6, 7, 8],
    });
    expect(result.triggered).toBe(false);
  });
});
