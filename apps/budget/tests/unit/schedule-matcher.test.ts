import { describe, it, expect } from "vitest";
import { ScheduleMatcher } from "$core/server/import/matchers/schedule-matcher";
import type { Schedule } from "$core/schema/schedules";
import type { Payee } from "$core/schema/payees";

/**
 * Creates a minimal Schedule object for testing.
 * The scheduleDate field controls how date scoring works.
 */
function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 1,
    seq: 1,
    workspaceId: 1,
    name: "Test Schedule",
    slug: "test-schedule",
    status: "active",
    amount: 100,
    amount_2: 0,
    amount_type: "exact",
    recurring: true,
    auto_add: false,
    dateId: 1,
    payeeId: 1,
    categoryId: null,
    accountId: 1,
    budgetId: null,
    isSubscription: false,
    subscriptionType: null,
    subscriptionStatus: null,
    subscriptionProvider: null,
    subscriptionUrl: null,
    subscriptionCancellationUrl: null,
    subscriptionRenewalDate: null,
    subscriptionTrialEndDate: null,
    subscriptionAutoRenew: null,
    subscriptionBillingCycle: null,
    subscriptionSharedWith: null,
    notes: null,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    deletedAt: null,
    ...overrides,
  } as Schedule;
}

function makePayee(id: number, name: string): Payee {
  return { id, name, slug: name.toLowerCase(), deletedAt: null } as Payee;
}

describe("ScheduleMatcher", () => {
  describe("Date Scoring", () => {
    it("should score 1.0 for exact date match on a monthly schedule", () => {
      const matcher = new ScheduleMatcher();
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-15",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Transaction on March 15 should match a monthly schedule starting Jan 15
      const match = matcher.findBestMatch(
        { date: "2024-03-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );

      // Date score should be 1.0 (exact), contributing 0.3 to total
      // Amount score is 1.0 (exact), contributing 0.5
      // Total should be 0.8
      expect(match.score).toBeCloseTo(0.8, 1);
      expect(match.matchedOn).toContain("date");
      expect(match.matchedOn).toContain("amount");
    });

    it("should score lower for dates a few days off from expected occurrence", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 7 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-15",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Transaction 3 days after expected date (March 18 vs expected March 15)
      const match = matcher.findBestMatch(
        { date: "2024-03-18", amount: 100, accountId: 1 },
        [schedule],
        []
      );

      // Date score = 1.0 - 3/7 ≈ 0.571, contributing ~0.171
      // Amount = 1.0 contributing 0.5
      // Total ≈ 0.671
      expect(match.score).toBeGreaterThan(0.5);
      expect(match.score).toBeLessThan(0.8);
      expect(match.matchedOn).toContain("date");
    });

    it("should score 0 for dates beyond tolerance", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 7 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-15",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Transaction on March 1 — 14 days from the nearest occurrence (March 15)
      const matchFar = matcher.findBestMatch(
        { date: "2024-03-01", amount: 100, accountId: 1 },
        [schedule],
        []
      );

      // Date score should be 0 (14 days > 7 day tolerance)
      // Only amount contributes 0.5
      expect(matchFar.score).toBeCloseTo(0.5, 1);
      expect(matchFar.matchedOn).not.toContain("date");
    });

    it("should handle weekly schedules correctly", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 3 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-01", // Monday
          end: null,
          frequency: "weekly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Jan 8 is exactly 1 week after start — should be exact match
      const matchExact = matcher.findBestMatch(
        { date: "2024-01-08", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchExact.matchedOn).toContain("date");

      // Jan 9 is 1 day off from expected Jan 8
      const matchClose = matcher.findBestMatch(
        { date: "2024-01-09", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchClose.matchedOn).toContain("date");
      expect(matchClose.score).toBeLessThan(matchExact.score);
    });

    it("should handle monthly schedules with specific days", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 3 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-01",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: true,
          on_type: "day",
          days: [10, 25], // Paid on 10th and 25th
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Transaction on March 10 — exact match on a specific day
      const matchExact = matcher.findBestMatch(
        { date: "2024-03-10", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchExact.matchedOn).toContain("date");
      expect(matchExact.score).toBeCloseTo(0.8, 1); // date 1.0 + amount 1.0

      // Transaction on March 26 — 1 day off from the 25th
      const matchClose = matcher.findBestMatch(
        { date: "2024-03-26", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchClose.matchedOn).toContain("date");
      expect(matchClose.score).toBeGreaterThan(0.5);

      // Transaction on March 17 — equidistant from 10th and 25th (7 days each), beyond tolerance of 3
      const matchFar = matcher.findBestMatch(
        { date: "2024-03-17", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchFar.matchedOn).not.toContain("date");
    });

    it("should handle yearly schedules", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 7 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2023-06-15",
          end: null,
          frequency: "yearly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // June 15, 2024 — exactly 1 year later
      const match = matcher.findBestMatch(
        { date: "2024-06-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(match.matchedOn).toContain("date");
      expect(match.score).toBeCloseTo(0.8, 1);

      // December — nowhere near June
      const matchFar = matcher.findBestMatch(
        { date: "2024-12-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchFar.matchedOn).not.toContain("date");
    });

    it("should handle biweekly schedules (interval=2)", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 3 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-05", // Friday
          end: null,
          frequency: "weekly",
          interval: 2, // Every 2 weeks
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Jan 19 is exactly 2 weeks after Jan 5
      const matchExact = matcher.findBestMatch(
        { date: "2024-01-19", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchExact.matchedOn).toContain("date");

      // Jan 12 is 1 week after start — NOT a biweekly occurrence
      const matchMid = matcher.findBestMatch(
        { date: "2024-01-12", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      // 7 days from nearest occurrence (Jan 5 or Jan 19) — beyond 3-day tolerance
      expect(matchMid.matchedOn).not.toContain("date");
    });

    it("should return neutral 0.5 when scheduleDate is missing", () => {
      const matcher = new ScheduleMatcher();
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: undefined, // No date config
      });

      const match = matcher.findBestMatch(
        { date: "2024-03-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );

      // Date contributes 0.5 * 0.3 = 0.15, amount contributes 0.5
      // Total = 0.65
      expect(match.score).toBeCloseTo(0.65, 1);
      expect(match.matchedOn).toContain("date");
    });

    it("should respect schedule end dates", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 3 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-15",
          end: "2024-03-15", // Ends March 15
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // March 15 — last occurrence, should match
      const matchValid = matcher.findBestMatch(
        { date: "2024-03-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchValid.matchedOn).toContain("date");

      // April 15 — after end date, should not match on date
      const matchExpired = matcher.findBestMatch(
        { date: "2024-04-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchExpired.matchedOn).not.toContain("date");
    });

    it("should not match on date before schedule start", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 3 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-06-01",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: true,
          on_type: "day",
          days: [15],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // March 15 — before schedule start of June 1
      const match = matcher.findBestMatch(
        { date: "2024-03-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(match.matchedOn).not.toContain("date");
    });

    it("should handle monthly schedule starting on the 31st (day-of-month drift)", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 3 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-31",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Feb 29 (2024 is a leap year) — should match since Jan 31 + 1 month clamps to Feb 29
      const matchFeb = matcher.findBestMatch(
        { date: "2024-02-29", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchFeb.matchedOn).toContain("date");

      // Mar 31 — should be an exact occurrence (no drift from Feb 28/29)
      const matchMar = matcher.findBestMatch(
        { date: "2024-03-31", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchMar.matchedOn).toContain("date");
      // date 1.0 * 0.3 + amount 1.0 * 0.5 = 0.8 (exact date match)
      expect(matchMar.score).toBeCloseTo(0.8, 1);

      // Apr 30 — should match (31st clamped to 30th in April)
      const matchApr = matcher.findBestMatch(
        { date: "2024-04-30", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchApr.matchedOn).toContain("date");
      expect(matchApr.score).toBeCloseTo(0.8, 1);

      // May 31 — should be exact again (May has 31 days)
      const matchMay = matcher.findBestMatch(
        { date: "2024-05-31", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchMay.matchedOn).toContain("date");
      expect(matchMay.score).toBeCloseTo(0.8, 1);
    });

    it("should handle quarterly schedules (monthly interval=3)", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 5 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-15",
          end: null,
          frequency: "monthly",
          interval: 3,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // April 15 — exactly 1 quarter later, should match
      const matchQ2 = matcher.findBestMatch(
        { date: "2024-04-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchQ2.matchedOn).toContain("date");

      // Feb 15 — NOT a quarterly occurrence (only 1 month from start)
      const matchFeb = matcher.findBestMatch(
        { date: "2024-02-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchFeb.matchedOn).not.toContain("date");
    });

    it("should handle one-time (non-recurring) schedules with a start date", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 5 });
      const schedule = makeSchedule({
        recurring: false,
        scheduleDate: {
          id: 1,
          start: "2024-06-15",
          end: null,
          frequency: null,
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Exact date match
      const matchExact = matcher.findBestMatch(
        { date: "2024-06-15", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchExact.matchedOn).toContain("date");
      expect(matchExact.score).toBeCloseTo(0.8, 1);

      // 3 days off
      const matchClose = matcher.findBestMatch(
        { date: "2024-06-18", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchClose.matchedOn).toContain("date");
      expect(matchClose.score).toBeLessThan(matchExact.score);

      // 10 days off — beyond tolerance of 5
      const matchFar = matcher.findBestMatch(
        { date: "2024-06-25", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchFar.matchedOn).not.toContain("date");
    });

    it("should match transaction on the exact start date", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 7 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-03-01",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      const match = matcher.findBestMatch(
        { date: "2024-03-01", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(match.matchedOn).toContain("date");
      expect(match.score).toBeCloseTo(0.8, 1); // date 1.0 * 0.3 + amount 1.0 * 0.5
    });

    it("should handle daily schedules with large intervals", () => {
      const matcher = new ScheduleMatcher({ dateTolerance: 3 });
      const schedule = makeSchedule({
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-01",
          end: null,
          frequency: "daily",
          interval: 10, // Every 10 days
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      // Jan 11 — exactly 10 days after start
      const matchExact = matcher.findBestMatch(
        { date: "2024-01-11", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchExact.matchedOn).toContain("date");

      // Jan 6 — 5 days from nearest occurrences (Jan 1 and Jan 11), beyond tolerance of 3
      const matchMid = matcher.findBestMatch(
        { date: "2024-01-06", amount: 100, accountId: 1 },
        [schedule],
        []
      );
      expect(matchMid.matchedOn).not.toContain("date");
    });
  });

  describe("Combined Scoring", () => {
    it("should combine amount and date scores correctly", () => {
      const matcher = new ScheduleMatcher();
      const schedule = makeSchedule({
        recurring: true,
        amount: 50,
        amount_type: "exact",
        payeeId: 1,
        scheduleDate: {
          id: 1,
          start: "2024-01-15",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      const payees = [makePayee(1, "Netflix")];

      // Perfect match: exact amount + exact date + exact payee
      const perfectMatch = matcher.findBestMatch(
        { date: "2024-02-15", amount: 50, payeeId: 1, accountId: 1 },
        [schedule],
        payees
      );

      // Amount 1.0*0.5 + Date 1.0*0.3 + Payee 1.0*0.15 = 0.95
      expect(perfectMatch.score).toBeCloseTo(0.95, 1);
      expect(perfectMatch.confidence).toBe("high");
      expect(perfectMatch.matchedOn).toContain("amount");
      expect(perfectMatch.matchedOn).toContain("date");
      expect(perfectMatch.matchedOn).toContain("payee");
    });

    it("should select best schedule when multiple candidates exist", () => {
      const matcher = new ScheduleMatcher();
      const monthlySchedule = makeSchedule({
        id: 1,
        name: "Monthly Bill",
        amount: 100,
        recurring: true,
        scheduleDate: {
          id: 1,
          start: "2024-01-15",
          end: null,
          frequency: "monthly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 1,
        },
      });

      const weeklySchedule = makeSchedule({
        id: 2,
        name: "Weekly Sub",
        amount: 100,
        recurring: true,
        scheduleDate: {
          id: 2,
          start: "2024-01-01",
          end: null,
          frequency: "weekly",
          interval: 1,
          limit: 0,
          move_weekends: "none",
          move_holidays: "none",
          specific_dates: [],
          on: false,
          on_type: "day",
          days: [],
          weeks: [],
          weeks_days: [],
          week_days: [],
          scheduleId: 2,
        },
      });

      // March 15 — matches monthly exactly, but is 1 day off from weekly (March 14)
      const match = matcher.findBestMatch(
        { date: "2024-03-15", amount: 100, accountId: 1 },
        [monthlySchedule, weeklySchedule],
        []
      );

      // Monthly schedule should win because March 15 is an exact occurrence
      expect(match.schedule?.id).toBe(1);
    });
  });
});
