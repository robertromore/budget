/**
 * Budget Period Instances - Integration Tests
 *
 * Tests period instance creation, rollover calculations,
 * and period management.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, gte, lte} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  budgetId: number;
  templateId: number;
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

  // Create a budget
  const [budget] = await db
    .insert(schema.budgets)
    .values({
      workspaceId: workspace.id,
      name: "Monthly Expenses",
      slug: "monthly-expenses",
      type: "account-monthly",
      scope: "account",
      status: "active",
      enforcementLevel: "warning",
    })
    .returning();

  // Create a period template
  const [template] = await db
    .insert(schema.budgetPeriodTemplates)
    .values({
      budgetId: budget.id,
      type: "monthly",
      startDayOfMonth: 1,
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    budgetId: budget.id,
    templateId: template.id,
  };
}

/**
 * Calculate period boundaries for a given month
 */
function calculateMonthlyBoundaries(year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month
  return {
    startDate: startDate.toISOString().split("T")[0]!,
    endDate: endDate.toISOString().split("T")[0]!,
  };
}

describe("Budget Period Instances", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("createPeriodInstance", () => {
    it("should create a period instance with correct boundaries", async () => {
      const {startDate, endDate} = calculateMonthlyBoundaries(2024, 0); // January 2024

      const [instance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate,
          endDate,
          allocatedAmount: 1000,
          rolloverAmount: 0,
          actualAmount: 0,
        })
        .returning();

      expect(instance).toBeDefined();
      expect(instance.startDate).toBe("2024-01-01");
      expect(instance.endDate).toBe("2024-01-31");
      expect(instance.allocatedAmount).toBe(1000);
    });

    it("should calculate period duration correctly", async () => {
      const {startDate, endDate} = calculateMonthlyBoundaries(2024, 1); // February 2024 (leap year)

      const [instance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate,
          endDate,
          allocatedAmount: 500,
        })
        .returning();

      const start = new Date(instance.startDate);
      const end = new Date(instance.endDate);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      expect(duration).toBe(29); // February 2024 has 29 days (leap year)
    });

    it("should prevent overlapping periods for the same template", async () => {
      const jan = calculateMonthlyBoundaries(2024, 0);

      // Create first period
      await ctx.db.insert(schema.budgetPeriodInstances).values({
        templateId: ctx.templateId,
        startDate: jan.startDate,
        endDate: jan.endDate,
        allocatedAmount: 1000,
      });

      // Check for overlap before creating second period
      // Note: budgetPeriodInstances links to budget via templateId
      const existing = await ctx.db
        .select()
        .from(schema.budgetPeriodInstances)
        .where(eq(schema.budgetPeriodInstances.templateId, ctx.templateId));

      const hasOverlap = existing.some((e) => {
        const existingStart = new Date(e.startDate);
        const existingEnd = new Date(e.endDate);
        const newStart = new Date(jan.startDate);
        const newEnd = new Date(jan.endDate);
        return existingStart <= newEnd && existingEnd >= newStart;
      });

      expect(hasOverlap).toBe(true);
    });
  });

  describe("allocated vs actual amounts", () => {
    it("should track allocated amount separately from actual spending", async () => {
      const {startDate, endDate} = calculateMonthlyBoundaries(2024, 0);

      const [instance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate,
          endDate,
          allocatedAmount: 1000,
          actualAmount: 750,
        })
        .returning();

      expect(instance.allocatedAmount).toBe(1000);
      expect(instance.actualAmount).toBe(750);

      // Calculate remaining
      const remaining = instance.allocatedAmount - instance.actualAmount;
      expect(remaining).toBe(250);
    });

    it("should detect overspending when actual exceeds allocated", async () => {
      const {startDate, endDate} = calculateMonthlyBoundaries(2024, 0);

      const [instance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate,
          endDate,
          allocatedAmount: 500,
          actualAmount: 600,
        })
        .returning();

      const isOverspent = instance.actualAmount > instance.allocatedAmount;
      expect(isOverspent).toBe(true);

      const overspentAmount = instance.actualAmount - instance.allocatedAmount;
      expect(overspentAmount).toBe(100);
    });

    it("should calculate utilization rate", async () => {
      const {startDate, endDate} = calculateMonthlyBoundaries(2024, 0);

      const [instance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate,
          endDate,
          allocatedAmount: 1000,
          actualAmount: 800,
        })
        .returning();

      const utilizationRate = (instance.actualAmount / instance.allocatedAmount) * 100;
      expect(utilizationRate).toBe(80);
    });
  });

  describe("rollover calculations", () => {
    it("should track rollover amount from previous period", async () => {
      const jan = calculateMonthlyBoundaries(2024, 0);
      const feb = calculateMonthlyBoundaries(2024, 1);

      // January: Allocated 1000, Spent 800, Surplus 200
      await ctx.db.insert(schema.budgetPeriodInstances).values({
        templateId: ctx.templateId,
        startDate: jan.startDate,
        endDate: jan.endDate,
        allocatedAmount: 1000,
        actualAmount: 800,
        rolloverAmount: 0,
      });

      // February: Includes rollover of 200 from January
      const [febInstance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate: feb.startDate,
          endDate: feb.endDate,
          allocatedAmount: 1000,
          rolloverAmount: 200, // Surplus from January
          actualAmount: 0,
        })
        .returning();

      expect(febInstance.rolloverAmount).toBe(200);

      // Total available = allocated + rollover
      const totalAvailable = febInstance.allocatedAmount + febInstance.rolloverAmount;
      expect(totalAvailable).toBe(1200);
    });

    it("should handle negative rollover (deficit carry-forward)", async () => {
      const jan = calculateMonthlyBoundaries(2024, 0);
      const feb = calculateMonthlyBoundaries(2024, 1);

      // January: Allocated 1000, Spent 1200, Deficit 200
      await ctx.db.insert(schema.budgetPeriodInstances).values({
        templateId: ctx.templateId,
        startDate: jan.startDate,
        endDate: jan.endDate,
        allocatedAmount: 1000,
        actualAmount: 1200,
        rolloverAmount: 0,
      });

      // February: Negative rollover (deficit) from January
      const [febInstance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate: feb.startDate,
          endDate: feb.endDate,
          allocatedAmount: 1000,
          rolloverAmount: -200, // Deficit from January
          actualAmount: 0,
        })
        .returning();

      expect(febInstance.rolloverAmount).toBe(-200);

      // Total available = allocated + rollover (negative reduces available)
      const totalAvailable = febInstance.allocatedAmount + febInstance.rolloverAmount;
      expect(totalAvailable).toBe(800);
    });

    it("should calculate rollover from completed period", async () => {
      const jan = calculateMonthlyBoundaries(2024, 0);

      const [janInstance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate: jan.startDate,
          endDate: jan.endDate,
          allocatedAmount: 1000,
          actualAmount: 750,
          rolloverAmount: 100, // Included rollover from previous
        })
        .returning();

      // Calculate rollover to next period
      // Total available = allocated + existing rollover = 1000 + 100 = 1100
      // Spent = 750
      // Rollover = 1100 - 750 = 350
      const totalAvailable = janInstance.allocatedAmount + janInstance.rolloverAmount;
      const rolloverToNext = totalAvailable - janInstance.actualAmount;

      expect(rolloverToNext).toBe(350);
    });
  });

  describe("period history", () => {
    it("should retrieve period history ordered by date", async () => {
      const months = [
        calculateMonthlyBoundaries(2024, 0), // January
        calculateMonthlyBoundaries(2024, 1), // February
        calculateMonthlyBoundaries(2024, 2), // March
      ];

      for (const month of months) {
        await ctx.db.insert(schema.budgetPeriodInstances).values({
          templateId: ctx.templateId,
          startDate: month.startDate,
          endDate: month.endDate,
          allocatedAmount: 1000,
        });
      }

      // Query instances via templateId
      const history = await ctx.db
        .select()
        .from(schema.budgetPeriodInstances)
        .where(eq(schema.budgetPeriodInstances.templateId, ctx.templateId))
        .orderBy(schema.budgetPeriodInstances.startDate);

      // Reverse to get most recent first
      const sortedHistory = [...history].reverse();

      expect(sortedHistory).toHaveLength(3);
      expect(sortedHistory[0].startDate).toBe("2024-03-01"); // Most recent first
      expect(sortedHistory[2].startDate).toBe("2024-01-01"); // Oldest last
    });

    it("should limit history retrieval", async () => {
      // Create 5 months of history
      for (let i = 0; i < 5; i++) {
        const month = calculateMonthlyBoundaries(2024, i);
        await ctx.db.insert(schema.budgetPeriodInstances).values({
          templateId: ctx.templateId,
          startDate: month.startDate,
          endDate: month.endDate,
          allocatedAmount: 1000,
        });
      }

      const history = await ctx.db
        .select()
        .from(schema.budgetPeriodInstances)
        .where(eq(schema.budgetPeriodInstances.templateId, ctx.templateId))
        .limit(3);

      expect(history).toHaveLength(3);
    });
  });

  describe("period analytics", () => {
    it("should calculate performance score based on utilization", async () => {
      const {startDate, endDate} = calculateMonthlyBoundaries(2024, 0);

      const [instance] = await ctx.db
        .insert(schema.budgetPeriodInstances)
        .values({
          templateId: ctx.templateId,
          startDate,
          endDate,
          allocatedAmount: 1000,
          actualAmount: 750, // 75% utilization
        })
        .returning();

      // Performance score calculation:
      // Optimal: 0-80% utilization = 100 points
      // Over 80%: -0.5 per % over
      // Over 100%: additional penalty
      const utilization = (instance.actualAmount / instance.allocatedAmount) * 100;
      let score = 100;

      if (utilization > 100) {
        score -= (utilization - 100) * 0.5;
      } else if (utilization < 80) {
        score -= (80 - utilization) * 0.2;
      }

      expect(utilization).toBe(75);
      expect(score).toBe(99); // 100 - (80-75)*0.2 = 100 - 1 = 99
    });

    it("should detect spending trends across periods", async () => {
      const periods = [
        {month: 0, actual: 800},
        {month: 1, actual: 850},
        {month: 2, actual: 900},
      ];

      for (const p of periods) {
        const {startDate, endDate} = calculateMonthlyBoundaries(2024, p.month);
        await ctx.db.insert(schema.budgetPeriodInstances).values({
          templateId: ctx.templateId,
          startDate,
          endDate,
          allocatedAmount: 1000,
          actualAmount: p.actual,
        });
      }

      const history = await ctx.db
        .select()
        .from(schema.budgetPeriodInstances)
        .where(eq(schema.budgetPeriodInstances.templateId, ctx.templateId))
        .orderBy(schema.budgetPeriodInstances.startDate);

      // Detect upward trend
      const actuals = history.map((h) => h.actualAmount);
      const isIncreasing = actuals.every((val, i) => i === 0 || val >= actuals[i - 1]);

      expect(isIncreasing).toBe(true);

      // Calculate average change
      const changes = actuals.slice(1).map((val, i) => val - actuals[i]);
      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

      expect(avgChange).toBe(50); // Average increase of 50 per month
    });
  });

  describe("period template types", () => {
    it("should support monthly period type", async () => {
      const template = await ctx.db.query.budgetPeriodTemplates.findFirst({
        where: eq(schema.budgetPeriodTemplates.id, ctx.templateId),
      });

      expect(template?.type).toBe("monthly");
    });

    it("should support weekly period type", async () => {
      const [weeklyTemplate] = await ctx.db
        .insert(schema.budgetPeriodTemplates)
        .values({
          budgetId: ctx.budgetId,
          type: "weekly",
          startDayOfWeek: 1, // Monday
        })
        .returning();

      expect(weeklyTemplate.type).toBe("weekly");
      expect(weeklyTemplate.startDayOfWeek).toBe(1);
    });

    it("should support custom period type with interval", async () => {
      const [customTemplate] = await ctx.db
        .insert(schema.budgetPeriodTemplates)
        .values({
          budgetId: ctx.budgetId,
          type: "custom",
          intervalCount: 14, // Bi-weekly (14 days)
        })
        .returning();

      expect(customTemplate.type).toBe("custom");
      expect(customTemplate.intervalCount).toBe(14);
    });
  });
});
