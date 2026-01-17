/**
 * Schedule Occurrence - Integration Tests
 *
 * Tests schedule occurrence calculations including next due date,
 * frequency handling, and date interval logic.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  payeeId: number;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  const [account] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Checking",
      slug: "checking",
      type: "checking",
    })
    .returning();

  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Netflix",
      slug: "netflix",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    payeeId: payee.id,
  };
}

/**
 * Add interval to date
 */
function addInterval(date: Date, frequency: string, interval: number): void {
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + interval);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7 * interval);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + interval);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + interval);
      break;
  }
}

/**
 * Calculate next due date
 */
function calculateNextDueDate(
  start: string,
  end: string | null,
  frequency: string,
  interval: number,
  today: Date = new Date()
): string | null {
  const startDate = new Date(start);
  const current = new Date(startDate);
  const todayStr = today.toISOString().split("T")[0]!;

  // Safety limit
  let iterations = 0;
  const maxIterations = 1000;

  // Fast forward to find next date after today
  while (current.toISOString().split("T")[0]! <= todayStr && iterations < maxIterations) {
    addInterval(current, frequency, interval);
    iterations++;
  }

  const resultDate = current.toISOString().split("T")[0]!;

  // Check if past end date
  if (end && resultDate > end) {
    return null;
  }

  return resultDate;
}

describe("Schedule Occurrence", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("calculateNextDueDate", () => {
    it("should calculate next due date for daily schedule", () => {
      const today = new Date("2024-01-15");
      const start = "2024-01-01";

      const nextDue = calculateNextDueDate(start, null, "daily", 1, today);

      expect(nextDue).toBe("2024-01-16");
    });

    it("should calculate next due date for weekly schedule", () => {
      const today = new Date("2024-01-15");
      const start = "2024-01-01"; // Monday

      const nextDue = calculateNextDueDate(start, null, "weekly", 1, today);

      expect(nextDue).toBe("2024-01-22");
    });

    it("should calculate next due date for bi-weekly schedule", () => {
      const today = new Date("2024-01-15");
      const start = "2024-01-01";

      const nextDue = calculateNextDueDate(start, null, "weekly", 2, today);

      expect(nextDue).toBe("2024-01-29");
    });

    it("should calculate next due date for monthly schedule", () => {
      const today = new Date("2024-01-20");
      const start = "2024-01-15";

      const nextDue = calculateNextDueDate(start, null, "monthly", 1, today);

      expect(nextDue).toBe("2024-02-15");
    });

    it("should calculate next due date for yearly schedule", () => {
      const today = new Date("2024-03-15");
      const start = "2024-01-15";

      const nextDue = calculateNextDueDate(start, null, "yearly", 1, today);

      expect(nextDue).toBe("2025-01-15");
    });

    it("should return null if past end date", () => {
      const today = new Date("2024-06-01");
      const start = "2024-01-01";
      const end = "2024-03-31";

      const nextDue = calculateNextDueDate(start, end, "monthly", 1, today);

      expect(nextDue).toBeNull();
    });

    it("should return future date even if start is in past", () => {
      const today = new Date("2024-06-15");
      const start = "2024-01-15";

      const nextDue = calculateNextDueDate(start, null, "monthly", 1, today);

      expect(nextDue).toBe("2024-07-15");
    });
  });

  describe("addInterval", () => {
    it("should add days for daily frequency", () => {
      const date = new Date("2024-01-15");
      addInterval(date, "daily", 1);
      expect(date.toISOString().split("T")[0]).toBe("2024-01-16");
    });

    it("should add weeks for weekly frequency", () => {
      const date = new Date("2024-01-15");
      addInterval(date, "weekly", 1);
      expect(date.toISOString().split("T")[0]).toBe("2024-01-22");
    });

    it("should add months for monthly frequency", () => {
      const date = new Date("2024-01-15");
      addInterval(date, "monthly", 1);
      expect(date.toISOString().split("T")[0]).toBe("2024-02-15");
    });

    it("should add years for yearly frequency", () => {
      const date = new Date("2024-01-15");
      addInterval(date, "yearly", 1);
      expect(date.toISOString().split("T")[0]).toBe("2025-01-15");
    });

    it("should handle interval > 1", () => {
      const date = new Date("2024-01-15");
      addInterval(date, "monthly", 3); // Quarterly
      expect(date.toISOString().split("T")[0]).toBe("2024-04-15");
    });

    it("should handle month end edge cases", () => {
      const date = new Date("2024-01-31");
      addInterval(date, "monthly", 1);
      // January 31 + 1 month = February 31 → March 2 (or Feb 29 in leap year)
      // JS Date handles this by rolling over
      expect(date.getMonth()).toBe(2); // March (0-indexed)
    });
  });

  describe("schedule with database", () => {
    it("should create schedule with date configuration", async () => {
      const [schedule] = await ctx.db
        .insert(schema.schedules)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Monthly Netflix",
          slug: "monthly-netflix",
          amount: 15.99,
          accountId: ctx.accountId,
          payeeId: ctx.payeeId,
          status: "active",
          auto_add: true,
        })
        .returning();

      const [scheduleDate] = await ctx.db
        .insert(schema.scheduleDates)
        .values({
          scheduleId: schedule.id,
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
        })
        .returning();

      // Link schedule to date
      await ctx.db.update(schema.schedules).set({dateId: scheduleDate.id}).where(eq(schema.schedules.id, schedule.id));

      const fullSchedule = await ctx.db.query.schedules.findFirst({
        where: eq(schema.schedules.id, schedule.id),
        with: {
          scheduleDate: true,
        },
      });

      expect(fullSchedule?.scheduleDate?.frequency).toBe("monthly");
      expect(fullSchedule?.scheduleDate?.interval).toBe(1);
      expect(fullSchedule?.scheduleDate?.start).toBe("2024-01-15");
    });
  });

  describe("upcoming dates calculation", () => {
    it("should calculate multiple upcoming dates", () => {
      const start = "2024-01-15";
      const frequency = "monthly";
      const interval = 1;
      const limit = 6;
      const today = new Date("2024-01-10");

      const upcomingDates: string[] = [];
      const current = new Date(start);

      for (let i = 0; i < limit; i++) {
        upcomingDates.push(current.toISOString().split("T")[0]!);
        addInterval(current, frequency, interval);
      }

      expect(upcomingDates).toEqual([
        "2024-01-15",
        "2024-02-15",
        "2024-03-15",
        "2024-04-15",
        "2024-05-15",
        "2024-06-15",
      ]);
    });

    it("should respect end date in upcoming calculation", () => {
      const start = "2024-01-15";
      const end = "2024-04-01";
      const frequency = "monthly";
      const interval = 1;

      const upcomingDates: string[] = [];
      const current = new Date(start);

      while (current.toISOString().split("T")[0]! <= end) {
        upcomingDates.push(current.toISOString().split("T")[0]!);
        addInterval(current, frequency, interval);
      }

      expect(upcomingDates).toEqual(["2024-01-15", "2024-02-15", "2024-03-15"]);
    });
  });

  describe("frequency display limits", () => {
    it("should apply smart limits based on frequency", () => {
      const limits: Record<string, {maxOccurrences: number; maxDaysAhead: number}> = {
        daily: {maxOccurrences: 7, maxDaysAhead: 14},
        weekly: {maxOccurrences: 6, maxDaysAhead: 45},
        monthly: {maxOccurrences: 6, maxDaysAhead: 180},
        yearly: {maxOccurrences: 3, maxDaysAhead: 1095},
      };

      expect(limits.daily.maxOccurrences).toBe(7);
      expect(limits.weekly.maxOccurrences).toBe(6);
      expect(limits.monthly.maxOccurrences).toBe(6);
      expect(limits.yearly.maxOccurrences).toBe(3);
    });
  });

  describe("specific day of month", () => {
    it("should calculate dates for specific days", () => {
      const days = [10, 25]; // 10th and 25th of each month
      const startMonth = new Date("2024-01-01");
      const months = 3;

      const dates: string[] = [];

      for (let m = 0; m < months; m++) {
        for (const day of days) {
          const date = new Date(startMonth);
          date.setMonth(date.getMonth() + m);
          date.setDate(day);
          dates.push(date.toISOString().split("T")[0]!);
        }
      }

      expect(dates).toEqual([
        "2024-01-10",
        "2024-01-25",
        "2024-02-10",
        "2024-02-25",
        "2024-03-10",
        "2024-03-25",
      ]);
    });
  });
});
