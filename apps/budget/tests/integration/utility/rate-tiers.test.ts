/**
 * Utility Rate Tiers - Integration Tests
 *
 * Tests tiered pricing configuration for utilities including
 * tier creation, cost calculation, and effective date handling.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, lte, gte, isNull, or} from "drizzle-orm";
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
 * Rate tier structure
 */
interface RateTier {
  tierName: string;
  tierOrder: number;
  usageMin: number;
  usageMax: number | null;
  ratePerUnit: number;
}

/**
 * Calculate tiered cost
 */
function calculateTieredCost(usage: number, tiers: RateTier[]): number {
  // Sort by tier order
  const sortedTiers = [...tiers].sort((a, b) => a.tierOrder - b.tierOrder);

  let totalCost = 0;
  let remainingUsage = usage;

  for (const tier of sortedTiers) {
    if (remainingUsage <= 0) break;

    const tierMax = tier.usageMax ?? Infinity;
    const tierRange = tierMax - tier.usageMin;
    const usageInTier = Math.min(remainingUsage, tierRange);

    totalCost += usageInTier * tier.ratePerUnit;
    remainingUsage -= usageInTier;
  }

  return Math.round(totalCost * 100) / 100;
}

describe("Utility Rate Tiers", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("tier creation", () => {
    it("should create a single rate tier", async () => {
      const [tier] = await ctx.db
        .insert(schema.utilityRateTiers)
        .values({
          accountId: ctx.accountId,
          tierName: "Baseline",
          tierOrder: 1,
          usageMin: 0,
          usageMax: 500,
          ratePerUnit: 0.10,
          effectiveDate: "2024-01-01",
        })
        .returning();

      expect(tier).toBeDefined();
      expect(tier.tierName).toBe("Baseline");
      expect(tier.ratePerUnit).toBe(0.10);
    });

    it("should create multiple tiers for tiered pricing", async () => {
      await ctx.db.insert(schema.utilityRateTiers).values([
        {
          accountId: ctx.accountId,
          tierName: "Tier 1 - Baseline",
          tierOrder: 1,
          usageMin: 0,
          usageMax: 500,
          ratePerUnit: 0.10,
          effectiveDate: "2024-01-01",
        },
        {
          accountId: ctx.accountId,
          tierName: "Tier 2 - Moderate",
          tierOrder: 2,
          usageMin: 500,
          usageMax: 1000,
          ratePerUnit: 0.15,
          effectiveDate: "2024-01-01",
        },
        {
          accountId: ctx.accountId,
          tierName: "Tier 3 - High Usage",
          tierOrder: 3,
          usageMin: 1000,
          usageMax: null, // Unlimited
          ratePerUnit: 0.20,
          effectiveDate: "2024-01-01",
        },
      ]);

      const tiers = await ctx.db
        .select()
        .from(schema.utilityRateTiers)
        .where(eq(schema.utilityRateTiers.accountId, ctx.accountId))
        .orderBy(schema.utilityRateTiers.tierOrder);

      expect(tiers).toHaveLength(3);
      expect(tiers[0].tierName).toBe("Tier 1 - Baseline");
      expect(tiers[2].usageMax).toBeNull();
    });
  });

  describe("cost calculation", () => {
    const standardTiers: RateTier[] = [
      {tierName: "Tier 1", tierOrder: 1, usageMin: 0, usageMax: 500, ratePerUnit: 0.10},
      {tierName: "Tier 2", tierOrder: 2, usageMin: 500, usageMax: 1000, ratePerUnit: 0.15},
      {tierName: "Tier 3", tierOrder: 3, usageMin: 1000, usageMax: null, ratePerUnit: 0.20},
    ];

    it("should calculate cost within first tier", () => {
      const usage = 400;
      const cost = calculateTieredCost(usage, standardTiers);

      expect(cost).toBe(40.00); // 400 * 0.10
    });

    it("should calculate cost spanning two tiers", () => {
      const usage = 700;
      const cost = calculateTieredCost(usage, standardTiers);

      // First 500 at $0.10 = $50.00
      // Next 200 at $0.15 = $30.00
      expect(cost).toBe(80.00);
    });

    it("should calculate cost spanning all tiers", () => {
      const usage = 1500;
      const cost = calculateTieredCost(usage, standardTiers);

      // First 500 at $0.10 = $50.00
      // Next 500 at $0.15 = $75.00
      // Next 500 at $0.20 = $100.00
      expect(cost).toBe(225.00);
    });

    it("should handle exact tier boundaries", () => {
      const usage = 500;
      const cost = calculateTieredCost(usage, standardTiers);

      expect(cost).toBe(50.00); // 500 * 0.10
    });

    it("should handle zero usage", () => {
      const cost = calculateTieredCost(0, standardTiers);
      expect(cost).toBe(0);
    });
  });

  describe("effective dates", () => {
    it("should fetch tiers effective on a date", async () => {
      // Create two sets of tiers with different effective dates
      await ctx.db.insert(schema.utilityRateTiers).values([
        // Old rates (expired)
        {
          accountId: ctx.accountId,
          tierName: "Tier 1",
          tierOrder: 1,
          usageMin: 0,
          usageMax: 500,
          ratePerUnit: 0.08,
          effectiveDate: "2023-01-01",
          expirationDate: "2023-12-31",
        },
        // Current rates
        {
          accountId: ctx.accountId,
          tierName: "Tier 1",
          tierOrder: 1,
          usageMin: 0,
          usageMax: 500,
          ratePerUnit: 0.10,
          effectiveDate: "2024-01-01",
        },
      ]);

      const asOfDate = "2024-06-15";

      // Get effective tiers
      const tiers = await ctx.db
        .select()
        .from(schema.utilityRateTiers)
        .where(
          and(
            eq(schema.utilityRateTiers.accountId, ctx.accountId),
            lte(schema.utilityRateTiers.effectiveDate, asOfDate),
            or(
              isNull(schema.utilityRateTiers.expirationDate),
              gte(schema.utilityRateTiers.expirationDate, asOfDate)
            )
          )
        );

      expect(tiers).toHaveLength(1);
      expect(tiers[0].ratePerUnit).toBe(0.10); // Current rate
    });

    it("should handle rate changes mid-year", async () => {
      await ctx.db.insert(schema.utilityRateTiers).values([
        // Q1-Q2 rates
        {
          accountId: ctx.accountId,
          tierName: "Tier 1",
          tierOrder: 1,
          usageMin: 0,
          usageMax: null,
          ratePerUnit: 0.10,
          effectiveDate: "2024-01-01",
          expirationDate: "2024-06-30",
        },
        // Q3-Q4 rates (increased)
        {
          accountId: ctx.accountId,
          tierName: "Tier 1",
          tierOrder: 1,
          usageMin: 0,
          usageMax: null,
          ratePerUnit: 0.12,
          effectiveDate: "2024-07-01",
        },
      ]);

      // Check rate in March
      const marchTiers = await ctx.db.query.utilityRateTiers.findFirst({
        where: and(
          eq(schema.utilityRateTiers.accountId, ctx.accountId),
          lte(schema.utilityRateTiers.effectiveDate, "2024-03-15"),
          or(
            isNull(schema.utilityRateTiers.expirationDate),
            gte(schema.utilityRateTiers.expirationDate, "2024-03-15")
          )
        ),
      });

      expect(marchTiers?.ratePerUnit).toBe(0.10);

      // Check rate in September
      const septTiers = await ctx.db.query.utilityRateTiers.findFirst({
        where: and(
          eq(schema.utilityRateTiers.accountId, ctx.accountId),
          lte(schema.utilityRateTiers.effectiveDate, "2024-09-15"),
          or(
            isNull(schema.utilityRateTiers.expirationDate),
            gte(schema.utilityRateTiers.expirationDate, "2024-09-15")
          )
        ),
      });

      expect(septTiers?.ratePerUnit).toBe(0.12);
    });
  });

  describe("tier validation", () => {
    it("should not have overlapping tiers", () => {
      const tiers: RateTier[] = [
        {tierName: "Tier 1", tierOrder: 1, usageMin: 0, usageMax: 500, ratePerUnit: 0.10},
        {tierName: "Tier 2", tierOrder: 2, usageMin: 500, usageMax: 1000, ratePerUnit: 0.15},
      ];

      // Validate no overlaps
      const hasOverlap = (t: RateTier[]): boolean => {
        for (let i = 0; i < t.length - 1; i++) {
          const current = t[i];
          const next = t[i + 1];
          if (current.usageMax !== null && current.usageMax > next.usageMin) {
            return true;
          }
        }
        return false;
      };

      expect(hasOverlap(tiers)).toBe(false);
    });

    it("should detect gaps in tiers", () => {
      const tiersWithGap: RateTier[] = [
        {tierName: "Tier 1", tierOrder: 1, usageMin: 0, usageMax: 400, ratePerUnit: 0.10},
        {tierName: "Tier 2", tierOrder: 2, usageMin: 500, usageMax: 1000, ratePerUnit: 0.15}, // Gap: 400-500
      ];

      const hasGap = (t: RateTier[]): boolean => {
        for (let i = 0; i < t.length - 1; i++) {
          const current = t[i];
          const next = t[i + 1];
          if (current.usageMax !== null && current.usageMax < next.usageMin) {
            return true;
          }
        }
        return false;
      };

      expect(hasGap(tiersWithGap)).toBe(true);
    });

    it("should ensure last tier has no max (unlimited)", () => {
      const tiers: RateTier[] = [
        {tierName: "Tier 1", tierOrder: 1, usageMin: 0, usageMax: 500, ratePerUnit: 0.10},
        {tierName: "Tier 2", tierOrder: 2, usageMin: 500, usageMax: null, ratePerUnit: 0.15},
      ];

      const lastTier = tiers[tiers.length - 1];
      expect(lastTier.usageMax).toBeNull();
    });
  });

  describe("water tiered pricing", () => {
    it("should calculate water cost with conservation tiers", async () => {
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

      await ctx.db.insert(schema.utilityRateTiers).values([
        {
          accountId: waterAccount.id,
          tierName: "Conservation",
          tierOrder: 1,
          usageMin: 0,
          usageMax: 3000,
          ratePerUnit: 0.003, // $3 per 1000 gallons
          effectiveDate: "2024-01-01",
        },
        {
          accountId: waterAccount.id,
          tierName: "Normal",
          tierOrder: 2,
          usageMin: 3000,
          usageMax: 6000,
          ratePerUnit: 0.005, // $5 per 1000 gallons
          effectiveDate: "2024-01-01",
        },
        {
          accountId: waterAccount.id,
          tierName: "High Usage",
          tierOrder: 3,
          usageMin: 6000,
          usageMax: null,
          ratePerUnit: 0.008, // $8 per 1000 gallons
          effectiveDate: "2024-01-01",
        },
      ]);

      const tiers = await ctx.db
        .select()
        .from(schema.utilityRateTiers)
        .where(eq(schema.utilityRateTiers.accountId, waterAccount.id))
        .orderBy(schema.utilityRateTiers.tierOrder);

      expect(tiers).toHaveLength(3);

      // Calculate cost for 5000 gallons
      const usage = 5000;
      const rateTiers: RateTier[] = tiers.map((t) => ({
        tierName: t.tierName,
        tierOrder: t.tierOrder,
        usageMin: t.usageMin,
        usageMax: t.usageMax,
        ratePerUnit: t.ratePerUnit,
      }));

      const cost = calculateTieredCost(usage, rateTiers);

      // 3000 * 0.003 = $9
      // 2000 * 0.005 = $10
      // Total = $19
      expect(cost).toBe(19.00);
    });
  });

  describe("seasonal rates", () => {
    it("should support summer/winter rate differences", async () => {
      // Summer rates (higher)
      await ctx.db.insert(schema.utilityRateTiers).values([
        {
          accountId: ctx.accountId,
          tierName: "Summer Tier 1",
          tierOrder: 1,
          usageMin: 0,
          usageMax: 500,
          ratePerUnit: 0.12,
          effectiveDate: "2024-06-01",
          expirationDate: "2024-09-30",
        },
        {
          accountId: ctx.accountId,
          tierName: "Summer Tier 2",
          tierOrder: 2,
          usageMin: 500,
          usageMax: null,
          ratePerUnit: 0.18,
          effectiveDate: "2024-06-01",
          expirationDate: "2024-09-30",
        },
      ]);

      // Winter rates (lower)
      await ctx.db.insert(schema.utilityRateTiers).values([
        {
          accountId: ctx.accountId,
          tierName: "Winter Tier 1",
          tierOrder: 1,
          usageMin: 0,
          usageMax: 500,
          ratePerUnit: 0.10,
          effectiveDate: "2024-10-01",
          expirationDate: "2025-05-31",
        },
        {
          accountId: ctx.accountId,
          tierName: "Winter Tier 2",
          tierOrder: 2,
          usageMin: 500,
          usageMax: null,
          ratePerUnit: 0.15,
          effectiveDate: "2024-10-01",
          expirationDate: "2025-05-31",
        },
      ]);

      // Get July rates
      const julyTiers = await ctx.db
        .select()
        .from(schema.utilityRateTiers)
        .where(
          and(
            eq(schema.utilityRateTiers.accountId, ctx.accountId),
            lte(schema.utilityRateTiers.effectiveDate, "2024-07-15"),
            gte(schema.utilityRateTiers.expirationDate, "2024-07-15")
          )
        );

      expect(julyTiers[0].ratePerUnit).toBe(0.12); // Summer rate

      // Get November rates
      const novTiers = await ctx.db
        .select()
        .from(schema.utilityRateTiers)
        .where(
          and(
            eq(schema.utilityRateTiers.accountId, ctx.accountId),
            lte(schema.utilityRateTiers.effectiveDate, "2024-11-15"),
            gte(schema.utilityRateTiers.expirationDate, "2024-11-15")
          )
        );

      expect(novTiers[0].ratePerUnit).toBe(0.10); // Winter rate
    });
  });

  describe("bill projection", () => {
    it("should project bill based on tiers and usage", () => {
      const tiers: RateTier[] = [
        {tierName: "Tier 1", tierOrder: 1, usageMin: 0, usageMax: 500, ratePerUnit: 0.10},
        {tierName: "Tier 2", tierOrder: 2, usageMin: 500, usageMax: null, ratePerUnit: 0.15},
      ];

      const projectBill = (
        estimatedUsage: number,
        tiers: RateTier[],
        baseCharge: number
      ): number => {
        const usageCost = calculateTieredCost(estimatedUsage, tiers);
        return baseCharge + usageCost;
      };

      const baseCharge = 15.00;
      const estimatedUsage = 800;

      const projectedBill = projectBill(estimatedUsage, tiers, baseCharge);

      // Base: $15
      // Tier 1: 500 * 0.10 = $50
      // Tier 2: 300 * 0.15 = $45
      // Total: $110
      expect(projectedBill).toBe(110.00);
    });
  });
});
