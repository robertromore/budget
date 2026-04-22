/**
 * Recurring-pattern → schedule-suggestion unit tests.
 *
 * The recurring-detection service identifies subscriptions and other
 * periodic transactions, and feeds the RecurringPatternCard plus the
 * "create schedule from pattern" flow. Most of the service is
 * DB-backed and covered separately, but `suggestScheduleFromPattern`
 * is the pure translation layer that maps a detected pattern into
 * the shape the Schedule creation form expects.
 *
 * A regression here causes the "Create Schedule" button on the
 * RecurringPatternCard to prefill the wrong frequency, interval, or
 * amount type — silent data entry bugs.
 */

import { describe, it, expect } from "vitest";
import { RecurringTransactionDetectionService } from "$core/server/domains/ml/recurring-detection/service";
import type {
  RecurringFrequency,
  RecurringPattern,
} from "$core/server/domains/ml/types";

function makeService(): RecurringTransactionDetectionService {
  // Pure translation doesn't touch the model store.
  return new RecurringTransactionDetectionService(null as never);
}

function buildPattern(overrides: Partial<RecurringPattern>): RecurringPattern {
  return {
    patternId: "p1",
    payeeId: 1,
    payeeName: "Netflix",
    accountId: 1,
    frequency: "monthly",
    interval: 30,
    confidence: 0.95,
    averageAmount: -15.99,
    amountStdDev: 0,
    amountMin: -15.99,
    amountMax: -15.99,
    amountType: "exact",
    lastOccurrence: "2026-03-15",
    nextPredicted: "2026-04-14",
    matchingTransactions: [],
    occurrenceCount: 6,
    firstOccurrence: "2025-10-15",
    consistencyScore: 1,
    isActive: true,
    ...overrides,
  };
}

describe("suggestScheduleFromPattern — frequency translation", () => {
  const svc = makeService();

  const cases: Array<[RecurringFrequency, "daily" | "weekly" | "monthly" | "yearly", number]> = [
    ["daily", "daily", 1],
    ["weekly", "weekly", 1],
    ["biweekly", "weekly", 2],
    ["monthly", "monthly", 1],
    ["quarterly", "monthly", 3],
    ["yearly", "yearly", 1],
  ];

  for (const [input, expectedFreq, expectedInterval] of cases) {
    it(`maps ${input} → ${expectedFreq} (every ${expectedInterval})`, () => {
      const pattern = buildPattern({ frequency: input });
      const schedule = svc.suggestScheduleFromPattern(pattern)!;
      expect(schedule.frequency).toBe(expectedFreq);
      expect(schedule.interval).toBe(expectedInterval);
    });
  }

  it("irregular patterns with interval ≤ 7 days fall back to weekly", () => {
    const pattern = buildPattern({ frequency: "irregular", interval: 5 });
    expect(svc.suggestScheduleFromPattern(pattern)!.frequency).toBe("weekly");
  });

  it("irregular patterns with interval ≤ 45 days fall back to monthly", () => {
    const pattern = buildPattern({ frequency: "irregular", interval: 30 });
    expect(svc.suggestScheduleFromPattern(pattern)!.frequency).toBe("monthly");
  });

  it("irregular patterns with interval > 45 days fall back to yearly", () => {
    const pattern = buildPattern({ frequency: "irregular", interval: 180 });
    expect(svc.suggestScheduleFromPattern(pattern)!.frequency).toBe("yearly");
  });
});

describe("suggestScheduleFromPattern — amount type", () => {
  const svc = makeService();

  it("uses 'exact' when CV < 2% (subscription at a fixed price)", () => {
    const pattern = buildPattern({
      averageAmount: -15.99,
      amountStdDev: 0.1, // cv ≈ 0.006
      amountMin: -15.99,
      amountMax: -15.99,
    });
    const s = svc.suggestScheduleFromPattern(pattern)!;
    expect(s.amount_type).toBe("exact");
    expect(s.amount_2).toBeUndefined();
  });

  it("uses 'approximate' when CV is 2–10% (utility bill with small variation)", () => {
    const pattern = buildPattern({
      averageAmount: -100,
      amountStdDev: 5, // cv = 0.05
      amountMin: -90,
      amountMax: -110,
    });
    const s = svc.suggestScheduleFromPattern(pattern)!;
    expect(s.amount_type).toBe("approximate");
  });

  it("uses 'range' when CV > 10% and surfaces max as amount_2", () => {
    const pattern = buildPattern({
      averageAmount: -100,
      amountStdDev: 25, // cv = 0.25
      amountMin: -60,
      amountMax: -140,
    });
    const s = svc.suggestScheduleFromPattern(pattern)!;
    expect(s.amount_type).toBe("range");
    expect(s.amount_2).toBe(140); // |amountMax|
  });
});

describe("suggestScheduleFromPattern — metadata passthrough", () => {
  const svc = makeService();

  it("uses the payee name as the schedule name", () => {
    const pattern = buildPattern({ payeeName: "Spotify Premium" });
    expect(svc.suggestScheduleFromPattern(pattern)!.name).toBe("Spotify Premium");
  });

  it("surfaces the absolute average amount (not signed)", () => {
    const pattern = buildPattern({
      averageAmount: -42.5,
      amountStdDev: 0,
      amountType: "exact",
    });
    expect(svc.suggestScheduleFromPattern(pattern)!.amount).toBe(42.5);
  });
});
