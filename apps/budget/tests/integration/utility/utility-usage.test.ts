/**
 * Utility Usage - Integration Tests
 *
 * Tests utility usage tracking including record creation,
 * period calculations, and analytics.
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
  accountId: number;
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
      name: "Electric Company",
      slug: "electric-company",
      type: "utility",
      utilitySubtype: "electric",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
  };
}

/**
 * Calculate average daily usage
 */
function calculateAverageDailyUsage(
  usageAmount: number,
  periodStart: string,
  periodEnd: string
): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? usageAmount / days : 0;
}

/**
 * Calculate cost per unit
 */
function calculateCostPerUnit(
  totalAmount: number,
  baseCharge: number | null,
  usageAmount: number
): number | null {
  if (usageAmount <= 0) return null;
  const usageCost = totalAmount - (baseCharge || 0);
  return usageCost / usageAmount;
}

describe("Utility Usage", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("usage record creation", () => {
    it("should create a basic usage record", async () => {
      const [record] = await ctx.db
        .insert(schema.utilityUsage)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 850,
          usageUnit: "kwh",
          totalAmount: 125.50,
        })
        .returning();

      expect(record).toBeDefined();
      expect(record.usageAmount).toBe(850);
      expect(record.usageUnit).toBe("kwh");
      expect(record.totalAmount).toBe(125.50);
    });

    it("should create record with all fields", async () => {
      const [record] = await ctx.db
        .insert(schema.utilityUsage)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 850,
          usageUnit: "kwh",
          totalAmount: 125.50,
          baseCharge: 15.00,
          usageCost: 102.00,
          taxes: 5.50,
          fees: 3.00,
          ratePerUnit: 0.12,
          meterReadingStart: 10000,
          meterReadingEnd: 10850,
          averageDailyUsage: 27.42,
          daysInPeriod: 31,
        })
        .returning();

      expect(record.baseCharge).toBe(15.00);
      expect(record.usageCost).toBe(102.00);
      expect(record.taxes).toBe(5.50);
      expect(record.fees).toBe(3.00);
      expect(record.meterReadingStart).toBe(10000);
      expect(record.meterReadingEnd).toBe(10850);
    });

    it("should link usage record to transaction", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -125.50,
          date: "2024-02-05",
          status: "cleared",
        })
        .returning();

      const [record] = await ctx.db
        .insert(schema.utilityUsage)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          transactionId: transaction.id,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 850,
          usageUnit: "kwh",
          totalAmount: 125.50,
        })
        .returning();

      expect(record.transactionId).toBe(transaction.id);
    });
  });

  describe("period calculations", () => {
    it("should calculate average daily usage", () => {
      const usageAmount = 930;
      const periodStart = "2024-01-01";
      const periodEnd = "2024-01-31";

      const avgDaily = calculateAverageDailyUsage(usageAmount, periodStart, periodEnd);

      expect(avgDaily).toBe(30); // 930 / 31 days
    });

    it("should calculate cost per unit", () => {
      const totalAmount = 125.50;
      const baseCharge = 15.00;
      const usageAmount = 850;

      const costPerUnit = calculateCostPerUnit(totalAmount, baseCharge, usageAmount);

      expect(costPerUnit).toBeCloseTo(0.13, 2); // (125.50 - 15) / 850
    });

    it("should handle zero usage", () => {
      const costPerUnit = calculateCostPerUnit(15.00, 15.00, 0);
      expect(costPerUnit).toBeNull();
    });

    it("should calculate days in period", () => {
      const calculateDaysInPeriod = (start: string, end: string): number => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      };

      expect(calculateDaysInPeriod("2024-01-01", "2024-01-31")).toBe(31);
      expect(calculateDaysInPeriod("2024-02-01", "2024-02-29")).toBe(29); // Leap year
      expect(calculateDaysInPeriod("2024-03-01", "2024-03-31")).toBe(31);
    });
  });

  describe("usage queries", () => {
    beforeEach(async () => {
      // Create historical usage records
      await ctx.db.insert(schema.utilityUsage).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 850,
          usageUnit: "kwh",
          totalAmount: 125.50,
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          periodStart: "2024-02-01",
          periodEnd: "2024-02-29",
          usageAmount: 780,
          usageUnit: "kwh",
          totalAmount: 118.00,
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          periodStart: "2024-03-01",
          periodEnd: "2024-03-31",
          usageAmount: 650,
          usageUnit: "kwh",
          totalAmount: 105.00,
        },
      ]);
    });

    it("should fetch usage history for account", async () => {
      const history = await ctx.db
        .select()
        .from(schema.utilityUsage)
        .where(eq(schema.utilityUsage.accountId, ctx.accountId))
        .orderBy(schema.utilityUsage.periodStart);

      expect(history).toHaveLength(3);
      expect(history[0].periodStart).toBe("2024-01-01");
    });

    it("should filter usage by date range", async () => {
      const filtered = await ctx.db
        .select()
        .from(schema.utilityUsage)
        .where(
          and(
            eq(schema.utilityUsage.accountId, ctx.accountId),
            gte(schema.utilityUsage.periodStart, "2024-02-01"),
            lte(schema.utilityUsage.periodStart, "2024-03-01")
          )
        );

      expect(filtered).toHaveLength(2);
    });

    it("should calculate total usage for period", async () => {
      const records = await ctx.db
        .select()
        .from(schema.utilityUsage)
        .where(eq(schema.utilityUsage.accountId, ctx.accountId));

      const totalUsage = records.reduce((sum, r) => sum + r.usageAmount, 0);
      expect(totalUsage).toBe(2280); // 850 + 780 + 650
    });

    it("should calculate average usage", async () => {
      const records = await ctx.db
        .select()
        .from(schema.utilityUsage)
        .where(eq(schema.utilityUsage.accountId, ctx.accountId));

      const avgUsage = records.reduce((sum, r) => sum + r.usageAmount, 0) / records.length;
      expect(avgUsage).toBe(760); // 2280 / 3
    });
  });

  describe("usage comparison", () => {
    beforeEach(async () => {
      // Create year-over-year data (monotonically decreasing)
      await ctx.db.insert(schema.utilityUsage).values([
        // 2023 data
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, periodStart: "2023-01-01", periodEnd: "2023-01-31", usageAmount: 900, usageUnit: "kwh", totalAmount: 130.00},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, periodStart: "2023-02-01", periodEnd: "2023-02-28", usageAmount: 860, usageUnit: "kwh", totalAmount: 126.00},
        // 2024 data
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, periodStart: "2024-01-01", periodEnd: "2024-01-31", usageAmount: 850, usageUnit: "kwh", totalAmount: 125.50},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, periodStart: "2024-02-01", periodEnd: "2024-02-29", usageAmount: 780, usageUnit: "kwh", totalAmount: 118.00},
      ]);
    });

    it("should compare year-over-year usage", async () => {
      const jan2023 = await ctx.db.query.utilityUsage.findFirst({
        where: eq(schema.utilityUsage.periodStart, "2023-01-01"),
      });

      const jan2024 = await ctx.db.query.utilityUsage.findFirst({
        where: eq(schema.utilityUsage.periodStart, "2024-01-01"),
      });

      const change = jan2024!.usageAmount - jan2023!.usageAmount;
      const percentChange = (change / jan2023!.usageAmount) * 100;

      expect(change).toBe(-50); // 850 - 900
      expect(percentChange).toBeCloseTo(-5.56, 1);
    });

    it("should detect usage trend", async () => {
      const records = await ctx.db
        .select()
        .from(schema.utilityUsage)
        .where(eq(schema.utilityUsage.accountId, ctx.accountId))
        .orderBy(schema.utilityUsage.periodStart);

      // Check if usage is decreasing
      let isDecreasing = true;
      for (let i = 1; i < records.length; i++) {
        if (records[i].usageAmount > records[i - 1].usageAmount) {
          isDecreasing = false;
          break;
        }
      }

      expect(isDecreasing).toBe(true);
    });
  });

  describe("unit conversions", () => {
    it("should convert water units", () => {
      const convertWaterUnits = (
        amount: number,
        from: "gallons" | "hcf" | "cubic_feet",
        to: "gallons" | "hcf" | "cubic_feet"
      ): number => {
        // Convert to gallons first
        let gallons: number;
        switch (from) {
          case "gallons":
            gallons = amount;
            break;
          case "hcf":
            gallons = amount * 748;
            break;
          case "cubic_feet":
            gallons = amount * 7.48;
            break;
        }

        // Convert from gallons to target
        switch (to) {
          case "gallons":
            return gallons;
          case "hcf":
            return gallons / 748;
          case "cubic_feet":
            return gallons / 7.48;
        }
      };

      expect(convertWaterUnits(1, "hcf", "gallons")).toBe(748);
      expect(convertWaterUnits(748, "gallons", "hcf")).toBe(1);
      expect(convertWaterUnits(100, "cubic_feet", "hcf")).toBe(1);
    });

    it("should convert gas units", () => {
      const convertGasUnits = (
        amount: number,
        from: "therms" | "ccf" | "mcf",
        to: "therms" | "ccf" | "mcf"
      ): number => {
        // Convert to therms first
        let therms: number;
        switch (from) {
          case "therms":
            therms = amount;
            break;
          case "ccf":
            therms = amount * 1.024;
            break;
          case "mcf":
            therms = amount * 10.24;
            break;
        }

        // Convert from therms to target
        switch (to) {
          case "therms":
            return therms;
          case "ccf":
            return therms / 1.024;
          case "mcf":
            return therms / 10.24;
        }
      };

      expect(convertGasUnits(1, "ccf", "therms")).toBeCloseTo(1.024, 3);
      expect(convertGasUnits(10.24, "therms", "mcf")).toBe(1);
    });
  });

  describe("meter readings", () => {
    it("should calculate usage from meter readings", () => {
      const calculateFromReadings = (start: number, end: number): number => {
        return Math.abs(end - start);
      };

      expect(calculateFromReadings(10000, 10850)).toBe(850);
      expect(calculateFromReadings(99950, 100800)).toBe(850);
    });

    it("should store meter readings with record", async () => {
      const [record] = await ctx.db
        .insert(schema.utilityUsage)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 850,
          usageUnit: "kwh",
          totalAmount: 125.50,
          meterReadingStart: 10000,
          meterReadingEnd: 10850,
        })
        .returning();

      const calculated = Math.abs(record.meterReadingEnd! - record.meterReadingStart!);
      expect(calculated).toBe(record.usageAmount);
    });
  });

  describe("different utility types", () => {
    it("should create water utility account and usage", async () => {
      const [waterAccount] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Water Company",
          slug: "water-company",
          type: "utility",
          utilitySubtype: "water",
        })
        .returning();

      const [record] = await ctx.db
        .insert(schema.utilityUsage)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: waterAccount.id,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 4500,
          usageUnit: "gallons",
          totalAmount: 45.00,
        })
        .returning();

      expect(record.usageUnit).toBe("gallons");
    });

    it("should create gas utility account and usage", async () => {
      const [gasAccount] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Gas Company",
          slug: "gas-company",
          type: "utility",
          utilitySubtype: "gas",
        })
        .returning();

      const [record] = await ctx.db
        .insert(schema.utilityUsage)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: gasAccount.id,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 85,
          usageUnit: "therms",
          totalAmount: 95.00,
        })
        .returning();

      expect(record.usageUnit).toBe("therms");
    });
  });

  describe("cost breakdown", () => {
    it("should calculate cost components", () => {
      const record = {
        baseCharge: 15.00,
        usageCost: 102.00,
        taxes: 5.50,
        fees: 3.00,
        totalAmount: 125.50,
      };

      const calculatedTotal =
        record.baseCharge + record.usageCost + record.taxes + record.fees;

      expect(calculatedTotal).toBe(record.totalAmount);
    });

    it("should store and retrieve cost breakdown", async () => {
      const [record] = await ctx.db
        .insert(schema.utilityUsage)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          periodStart: "2024-01-01",
          periodEnd: "2024-01-31",
          usageAmount: 850,
          usageUnit: "kwh",
          totalAmount: 125.50,
          baseCharge: 15.00,
          usageCost: 102.00,
          taxes: 5.50,
          fees: 3.00,
        })
        .returning();

      expect(record.baseCharge).toBe(15.00);
      expect(record.usageCost).toBe(102.00);
      expect(record.taxes).toBe(5.50);
      expect(record.fees).toBe(3.00);
    });
  });
});
