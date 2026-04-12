// Pure analytics utilities for investment account performance and fee drag.
// All inputs are InvestmentValueSnapshot arrays; all outputs are plain data
// arrays suitable for direct use in LayerChart components.

export interface SnapshotPoint {
  snapshotDate: string; // ISO YYYY-MM-DD
  value: number;
}

// ===== Performance series =====

export interface PerformanceDataPoint {
  date: Date;
  value: number;
  /** Cumulative return since the first snapshot, as a decimal (e.g. 0.08 = +8%). */
  cumulativeReturn: number;
  /** Single-period return since the previous snapshot, as a decimal. */
  periodReturn: number;
}

/**
 * Produces a time-weighted return series from an ordered list of value snapshots.
 *
 * The first snapshot is anchored at 0% return; each subsequent point computes the
 * period return vs. the preceding snapshot and accumulates multiplicatively.
 *
 * Returns an empty array if fewer than 2 snapshots are provided.
 */
export function calculatePerformanceSeries(
  snapshots: SnapshotPoint[]
): PerformanceDataPoint[] {
  if (snapshots.length < 2) return [];

  const sorted = [...snapshots].sort((a, b) =>
    a.snapshotDate.localeCompare(b.snapshotDate)
  );

  const result: PerformanceDataPoint[] = [];
  let cumulativeFactor = 1;

  for (let i = 0; i < sorted.length; i++) {
    const snap = sorted[i];
    let periodReturn = 0;

    if (i > 0) {
      const prev = sorted[i - 1];
      // Avoid division by zero when prior value was 0
      periodReturn = prev.value !== 0 ? (snap.value - prev.value) / prev.value : 0;
      cumulativeFactor *= 1 + periodReturn;
    }

    result.push({
      date: new Date(snap.snapshotDate),
      value: snap.value,
      cumulativeReturn: cumulativeFactor - 1,
      periodReturn,
    });
  }

  return result;
}

// ===== Fee drag series =====

export interface FeeDragDataPoint {
  date: Date;
  value: number;
  /** Cumulative fee drag (total fees paid from first snapshot to this date). */
  cumulativeDrag: number;
  /** Fee drag incurred in this specific period. */
  periodDrag: number;
  /** Portfolio value net of cumulative drag (what you'd have without the fees). */
  valueWithoutFees: number;
}

/**
 * Estimates cumulative fee drag over the snapshot history for a given annual
 * expense ratio (expressed as a percentage, e.g. 0.03 for 0.03% = 3 bps).
 *
 * Each period's drag = average_AUM × (expenseRatio / 100) × (days_in_period / 365).
 *
 * Returns an empty array if fewer than 2 snapshots are provided or if
 * expenseRatio is 0 or negative.
 */
export function calculateFeeDragSeries(
  snapshots: SnapshotPoint[],
  expenseRatio: number
): FeeDragDataPoint[] {
  if (snapshots.length < 2) return [];
  if (expenseRatio <= 0) return [];

  const sorted = [...snapshots].sort((a, b) =>
    a.snapshotDate.localeCompare(b.snapshotDate)
  );

  const result: FeeDragDataPoint[] = [];
  let cumulativeDrag = 0;

  for (let i = 0; i < sorted.length; i++) {
    const snap = sorted[i];
    let periodDrag = 0;

    if (i > 0) {
      const prev = sorted[i - 1];
      const prevDate = new Date(prev.snapshotDate);
      const currDate = new Date(snap.snapshotDate);
      const days =
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      const avgValue = (prev.value + snap.value) / 2;
      periodDrag = avgValue * (expenseRatio / 100) * (days / 365);
      cumulativeDrag += periodDrag;
    }

    result.push({
      date: new Date(snap.snapshotDate),
      value: snap.value,
      cumulativeDrag,
      periodDrag,
      // Approximation: adds drag back to observed value rather than compounding it.
      // Understates true drag for high ratios or long time horizons, but accurate
      // enough for typical index fund expense ratios (< 1%) and annual snapshots.
      valueWithoutFees: snap.value + cumulativeDrag,
    });
  }

  return result;
}

/**
 * Returns the current (latest) total-return percentage from a performance series,
 * or null if the series is empty.
 */
export function getLatestReturn(series: PerformanceDataPoint[]): number | null {
  if (series.length === 0) return null;
  return series[series.length - 1].cumulativeReturn;
}

/**
 * Returns the total cumulative fee drag from a fee drag series,
 * or null if the series is empty.
 */
export function getTotalDrag(series: FeeDragDataPoint[]): number | null {
  if (series.length === 0) return null;
  return series[series.length - 1].cumulativeDrag;
}
