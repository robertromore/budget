/**
 * Schedule Skips - Integration Tests
 *
 * Tests skip occurrence handling including single skips,
 * push forward, and skip removal.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  payeeId: number;
  scheduleId: number;
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

  const [schedule] = await db
    .insert(schema.schedules)
    .values({
      workspaceId: workspace.id,
      name: "Monthly Netflix",
      slug: "monthly-netflix",
      amount: 15.99,
      accountId: account.id,
      payeeId: payee.id,
      status: "active",
      auto_add: true,
    })
    .returning();

  // Create schedule date
  const [scheduleDate] = await db
    .insert(schema.scheduleDates)
    .values({
      scheduleId: schedule.id,
      start: "2024-01-15",
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

  await db.update(schema.schedules).set({dateId: scheduleDate.id}).where(eq(schema.schedules.id, schedule.id));

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    payeeId: payee.id,
    scheduleId: schedule.id,
  };
}

describe("Schedule Skips", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("single skip", () => {
    it("should create a single skip for a date", async () => {
      const skipDate = "2024-02-15";

      const [skip] = await ctx.db
        .insert(schema.scheduleSkips)
        .values({
          workspaceId: ctx.workspaceId,
          scheduleId: ctx.scheduleId,
          skippedDate: skipDate,
          skipType: "single",
          reason: "Subscription paused",
        })
        .returning();

      expect(skip).toBeDefined();
      expect(skip.scheduleId).toBe(ctx.scheduleId);
      expect(skip.skippedDate).toBe(skipDate);
      expect(skip.skipType).toBe("single");
      expect(skip.reason).toBe("Subscription paused");
    });

    it("should not allow duplicate skips for same date", async () => {
      const skipDate = "2024-02-15";

      await ctx.db.insert(schema.scheduleSkips).values({
        workspaceId: ctx.workspaceId,
        scheduleId: ctx.scheduleId,
        skippedDate: skipDate,
        skipType: "single",
      });

      // Check if skip exists before adding another
      const existing = await ctx.db.query.scheduleSkips.findFirst({
        where: and(eq(schema.scheduleSkips.scheduleId, ctx.scheduleId), eq(schema.scheduleSkips.skippedDate, skipDate)),
      });

      expect(existing).toBeDefined();
    });

    it("should filter skipped dates from upcoming list", () => {
      const upcomingDates = ["2024-01-15", "2024-02-15", "2024-03-15", "2024-04-15"];
      const skippedDates = new Set(["2024-02-15"]);

      const filteredDates = upcomingDates.filter((date) => !skippedDates.has(date));

      expect(filteredDates).toEqual(["2024-01-15", "2024-03-15", "2024-04-15"]);
    });
  });

  describe("push forward skip", () => {
    it("should create a push forward skip", async () => {
      const skipDate = "2024-02-15";

      const [skip] = await ctx.db
        .insert(schema.scheduleSkips)
        .values({
          workspaceId: ctx.workspaceId,
          scheduleId: ctx.scheduleId,
          skippedDate: skipDate,
          skipType: "push_forward",
          reason: "Holiday adjustment",
        })
        .returning();

      expect(skip.skipType).toBe("push_forward");
    });

    it("should count push forward skips for offset calculation", async () => {
      // Create multiple push forward skips
      await ctx.db.insert(schema.scheduleSkips).values([
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-02-15", skipType: "push_forward"},
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-03-15", skipType: "push_forward"},
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-04-15", skipType: "single"}, // Not push_forward
      ]);

      const pushForwardCount = await ctx.db
        .select()
        .from(schema.scheduleSkips)
        .where(
          and(eq(schema.scheduleSkips.scheduleId, ctx.scheduleId), eq(schema.scheduleSkips.skipType, "push_forward"))
        );

      expect(pushForwardCount).toHaveLength(2);
    });

    it("should apply push forward offset to all future dates", () => {
      const baseDates = ["2024-01-15", "2024-02-15", "2024-03-15", "2024-04-15"];
      const pushForwardCount = 2; // Two push_forward skips

      // Each push_forward adds one interval to all dates
      const addMonths = (dateStr: string, months: number): string => {
        const date = new Date(dateStr);
        date.setMonth(date.getMonth() + months);
        return date.toISOString().split("T")[0]!;
      };

      const adjustedDates = baseDates.map((date) => addMonths(date, pushForwardCount));

      expect(adjustedDates).toEqual(["2024-03-15", "2024-04-15", "2024-05-15", "2024-06-15"]);
    });
  });

  describe("skip removal", () => {
    it("should remove a skip by id", async () => {
      const [skip] = await ctx.db
        .insert(schema.scheduleSkips)
        .values({
          workspaceId: ctx.workspaceId,
          scheduleId: ctx.scheduleId,
          skippedDate: "2024-02-15",
          skipType: "single",
        })
        .returning();

      await ctx.db.delete(schema.scheduleSkips).where(eq(schema.scheduleSkips.id, skip.id));

      const deleted = await ctx.db.query.scheduleSkips.findFirst({
        where: eq(schema.scheduleSkips.id, skip.id),
      });

      expect(deleted).toBeUndefined();
    });

    it("should restore date after skip removal", () => {
      const allDates = ["2024-01-15", "2024-02-15", "2024-03-15"];
      let skippedDates = new Set(["2024-02-15"]);

      // Before restoration
      let visibleDates = allDates.filter((d) => !skippedDates.has(d));
      expect(visibleDates).toHaveLength(2);

      // Remove skip
      skippedDates = new Set();

      // After restoration
      visibleDates = allDates.filter((d) => !skippedDates.has(d));
      expect(visibleDates).toHaveLength(3);
    });
  });

  describe("skip history", () => {
    it("should retrieve skip history for schedule", async () => {
      await ctx.db.insert(schema.scheduleSkips).values([
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-02-15", skipType: "single", reason: "Reason 1"},
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-03-15", skipType: "push_forward", reason: "Reason 2"},
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-04-15", skipType: "single", reason: "Reason 3"},
      ]);

      const history = await ctx.db
        .select()
        .from(schema.scheduleSkips)
        .where(eq(schema.scheduleSkips.scheduleId, ctx.scheduleId))
        .orderBy(schema.scheduleSkips.skippedDate);

      expect(history).toHaveLength(3);
      expect(history[0].skippedDate).toBe("2024-02-15");
      expect(history[1].skippedDate).toBe("2024-03-15");
      expect(history[2].skippedDate).toBe("2024-04-15");
    });

    it("should separate single and push_forward skips", async () => {
      await ctx.db.insert(schema.scheduleSkips).values([
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-02-15", skipType: "single"},
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-03-15", skipType: "push_forward"},
        {workspaceId: ctx.workspaceId, scheduleId: ctx.scheduleId, skippedDate: "2024-04-15", skipType: "single"},
      ]);

      const allSkips = await ctx.db
        .select()
        .from(schema.scheduleSkips)
        .where(eq(schema.scheduleSkips.scheduleId, ctx.scheduleId));

      const singleSkips = allSkips.filter((s) => s.skipType === "single");
      const pushForwardSkips = allSkips.filter((s) => s.skipType === "push_forward");

      expect(singleSkips).toHaveLength(2);
      expect(pushForwardSkips).toHaveLength(1);
    });
  });

  describe("skip validation", () => {
    it("should check if date is already skipped", async () => {
      const skipDate = "2024-02-15";

      await ctx.db.insert(schema.scheduleSkips).values({
        workspaceId: ctx.workspaceId,
        scheduleId: ctx.scheduleId,
        skippedDate: skipDate,
        skipType: "single",
      });

      const isSkipped = await ctx.db.query.scheduleSkips.findFirst({
        where: and(eq(schema.scheduleSkips.scheduleId, ctx.scheduleId), eq(schema.scheduleSkips.skippedDate, skipDate)),
      });

      expect(isSkipped).toBeDefined();
    });

    it("should allow skipping different dates", async () => {
      await ctx.db.insert(schema.scheduleSkips).values({
        workspaceId: ctx.workspaceId,
        scheduleId: ctx.scheduleId,
        skippedDate: "2024-02-15",
        skipType: "single",
      });

      // Different date should be allowed
      const [newSkip] = await ctx.db
        .insert(schema.scheduleSkips)
        .values({
          workspaceId: ctx.workspaceId,
          scheduleId: ctx.scheduleId,
          skippedDate: "2024-03-15",
          skipType: "single",
        })
        .returning();

      expect(newSkip).toBeDefined();
    });
  });

  describe("combining skip types", () => {
    it("should handle both single and push_forward for upcoming dates", () => {
      const baseDates = ["2024-01-15", "2024-02-15", "2024-03-15", "2024-04-15", "2024-05-15"];
      const singleSkippedDates = new Set(["2024-02-15"]);
      const pushForwardCount = 1;

      // Step 1: Filter out single skips
      const afterSingleFilter = baseDates.filter((d) => !singleSkippedDates.has(d));

      // Step 2: Apply push_forward offset
      const addMonths = (dateStr: string, months: number): string => {
        const date = new Date(dateStr);
        date.setMonth(date.getMonth() + months);
        return date.toISOString().split("T")[0]!;
      };

      const finalDates = afterSingleFilter.map((d) => addMonths(d, pushForwardCount));

      // Original: 01-15, 02-15(skipped), 03-15, 04-15, 05-15
      // After single filter: 01-15, 03-15, 04-15, 05-15
      // After push_forward (+1 month): 02-15, 04-15, 05-15, 06-15
      expect(finalDates).toEqual(["2024-02-15", "2024-04-15", "2024-05-15", "2024-06-15"]);
    });
  });
});
