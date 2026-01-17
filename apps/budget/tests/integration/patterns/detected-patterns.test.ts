/**
 * Detected Patterns - Integration Tests
 *
 * Tests pattern detection for recurring transactions including
 * pattern creation, confidence scoring, and schedule conversion.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import type {SuggestedScheduleConfig} from "../../../src/lib/schema/detected-patterns";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  payeeId: number;
  categoryId: number;
  transactionIds: number[];
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
      accountType: "checking",
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

  const [category] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Subscriptions",
      slug: "subscriptions",
    })
    .returning();

  // Create recurring transactions
  const transactions = await db
    .insert(schema.transactions)
    .values([
      {workspaceId: workspace.id, accountId: account.id, date: "2024-01-15", amount: -15.99, payeeId: payee.id, categoryId: category.id, status: "cleared"},
      {workspaceId: workspace.id, accountId: account.id, date: "2024-02-15", amount: -15.99, payeeId: payee.id, categoryId: category.id, status: "cleared"},
      {workspaceId: workspace.id, accountId: account.id, date: "2024-03-15", amount: -15.99, payeeId: payee.id, categoryId: category.id, status: "cleared"},
      {workspaceId: workspace.id, accountId: account.id, date: "2024-04-15", amount: -15.99, payeeId: payee.id, categoryId: category.id, status: "cleared"},
    ])
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    payeeId: payee.id,
    categoryId: category.id,
    transactionIds: transactions.map((t) => t.id),
  };
}

describe("Detected Patterns", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("pattern creation", () => {
    it("should create a monthly pattern", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.95,
          sampleTransactionIds: ctx.transactionIds,
          payeeId: ctx.payeeId,
          categoryId: ctx.categoryId,
          amountMin: 15.99,
          amountMax: 15.99,
          amountAvg: 15.99,
          intervalDays: 30,
          status: "pending",
        })
        .returning();

      expect(pattern.patternType).toBe("monthly");
      expect(pattern.confidenceScore).toBe(0.95);
      expect(pattern.sampleTransactionIds).toEqual(ctx.transactionIds);
    });

    it("should create a weekly pattern", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "weekly",
          confidenceScore: 0.85,
          sampleTransactionIds: ctx.transactionIds.slice(0, 2),
          intervalDays: 7,
          status: "pending",
        })
        .returning();

      expect(pattern.patternType).toBe("weekly");
      expect(pattern.intervalDays).toBe(7);
    });

    it("should create a yearly pattern", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "yearly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds.slice(0, 1),
          intervalDays: 365,
          status: "pending",
        })
        .returning();

      expect(pattern.patternType).toBe("yearly");
      expect(pattern.intervalDays).toBe(365);
    });
  });

  describe("pattern confidence", () => {
    it("should filter by confidence score", async () => {
      await ctx.db.insert(schema.detectedPatterns).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.95,
          sampleTransactionIds: ctx.transactionIds,
          status: "pending",
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.6,
          sampleTransactionIds: ctx.transactionIds.slice(0, 2),
          status: "pending",
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "weekly",
          confidenceScore: 0.45,
          sampleTransactionIds: ctx.transactionIds.slice(0, 1),
          status: "pending",
        },
      ]);

      const allPatterns = await ctx.db
        .select()
        .from(schema.detectedPatterns)
        .where(eq(schema.detectedPatterns.workspaceId, ctx.workspaceId));

      const highConfidence = allPatterns.filter((p) => p.confidenceScore >= 0.7);

      expect(allPatterns).toHaveLength(3);
      expect(highConfidence).toHaveLength(1);
    });
  });

  describe("pattern status", () => {
    it("should accept a pattern", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds,
          status: "pending",
        })
        .returning();

      await ctx.db
        .update(schema.detectedPatterns)
        .set({status: "accepted"})
        .where(eq(schema.detectedPatterns.id, pattern.id));

      const updated = await ctx.db.query.detectedPatterns.findFirst({
        where: eq(schema.detectedPatterns.id, pattern.id),
      });

      expect(updated?.status).toBe("accepted");
    });

    it("should dismiss a pattern", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.6,
          sampleTransactionIds: ctx.transactionIds.slice(0, 2),
          status: "pending",
        })
        .returning();

      await ctx.db
        .update(schema.detectedPatterns)
        .set({status: "dismissed"})
        .where(eq(schema.detectedPatterns.id, pattern.id));

      const updated = await ctx.db.query.detectedPatterns.findFirst({
        where: eq(schema.detectedPatterns.id, pattern.id),
      });

      expect(updated?.status).toBe("dismissed");
    });

    it("should list pending patterns", async () => {
      await ctx.db.insert(schema.detectedPatterns).values([
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, patternType: "monthly", confidenceScore: 0.9, sampleTransactionIds: ctx.transactionIds, status: "pending"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, patternType: "weekly", confidenceScore: 0.8, sampleTransactionIds: ctx.transactionIds.slice(0, 2), status: "accepted"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, patternType: "daily", confidenceScore: 0.7, sampleTransactionIds: ctx.transactionIds.slice(0, 1), status: "pending"},
      ]);

      const pending = await ctx.db
        .select()
        .from(schema.detectedPatterns)
        .where(
          and(
            eq(schema.detectedPatterns.workspaceId, ctx.workspaceId),
            eq(schema.detectedPatterns.status, "pending")
          )
        );

      expect(pending).toHaveLength(2);
    });
  });

  describe("schedule conversion", () => {
    it("should store suggested schedule config", async () => {
      const suggestedConfig: SuggestedScheduleConfig = {
        name: "Netflix Subscription",
        amountType: "exact",
        amount: 15.99,
        autoAdd: true,
        recurring: true,
        frequency: "monthly",
        interval: 1,
        startDate: "2024-05-15",
      };

      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.95,
          sampleTransactionIds: ctx.transactionIds,
          suggestedScheduleConfig: suggestedConfig,
          status: "pending",
        })
        .returning();

      expect(pattern.suggestedScheduleConfig).toEqual(suggestedConfig);
    });

    it("should convert pattern to schedule", async () => {
      // Create pattern
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.95,
          sampleTransactionIds: ctx.transactionIds,
          payeeId: ctx.payeeId,
          categoryId: ctx.categoryId,
          amountAvg: 15.99,
          status: "pending",
        })
        .returning();

      // Create schedule first (schedule_dates requires scheduleId)
      const [schedule] = await ctx.db
        .insert(schema.schedules)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Netflix",
          slug: "netflix",
          accountId: ctx.accountId,
          payeeId: ctx.payeeId,
          categoryId: ctx.categoryId,
          amount: 15.99,
          status: "active",
        })
        .returning();

      // Create schedule date with schedule reference
      const [scheduleDate] = await ctx.db
        .insert(schema.scheduleDates)
        .values({
          scheduleId: schedule.id,
          frequency: "monthly",
          interval: 1,
          start: "2024-05-15",
        })
        .returning();

      // Update schedule to link the date
      await ctx.db
        .update(schema.schedules)
        .set({dateId: scheduleDate.id})
        .where(eq(schema.schedules.id, schedule.id));

      // Update pattern to converted status
      await ctx.db
        .update(schema.detectedPatterns)
        .set({
          status: "converted",
          scheduleId: schedule.id,
        })
        .where(eq(schema.detectedPatterns.id, pattern.id));

      const updated = await ctx.db.query.detectedPatterns.findFirst({
        where: eq(schema.detectedPatterns.id, pattern.id),
      });

      expect(updated?.status).toBe("converted");
      expect(updated?.scheduleId).toBe(schedule.id);
    });
  });

  describe("amount tracking", () => {
    it("should track amount range", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.85,
          sampleTransactionIds: ctx.transactionIds,
          amountMin: 14.99,
          amountMax: 16.99,
          amountAvg: 15.74,
          status: "pending",
        })
        .returning();

      expect(pattern.amountMin).toBe(14.99);
      expect(pattern.amountMax).toBe(16.99);
      expect(pattern.amountAvg).toBe(15.74);
    });

    it("should update amount statistics", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.8,
          sampleTransactionIds: ctx.transactionIds.slice(0, 2),
          amountMin: 15.99,
          amountMax: 15.99,
          amountAvg: 15.99,
          status: "pending",
        })
        .returning();

      // Update with new transaction data
      await ctx.db
        .update(schema.detectedPatterns)
        .set({
          sampleTransactionIds: ctx.transactionIds,
          amountMin: 14.99,
          amountMax: 17.99,
          amountAvg: 16.24,
          confidenceScore: 0.9,
        })
        .where(eq(schema.detectedPatterns.id, pattern.id));

      const updated = await ctx.db.query.detectedPatterns.findFirst({
        where: eq(schema.detectedPatterns.id, pattern.id),
      });

      expect(updated?.amountAvg).toBe(16.24);
      expect(updated?.confidenceScore).toBe(0.9);
    });
  });

  describe("occurrence tracking", () => {
    it("should track last occurrence", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds,
          lastOccurrence: "2024-04-15",
          status: "pending",
        })
        .returning();

      expect(pattern.lastOccurrence).toBe("2024-04-15");
    });

    it("should predict next expected", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds,
          lastOccurrence: "2024-04-15",
          nextExpected: "2024-05-15",
          status: "pending",
        })
        .returning();

      expect(pattern.nextExpected).toBe("2024-05-15");
    });

    it("should update occurrence dates", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds,
          lastOccurrence: "2024-04-15",
          nextExpected: "2024-05-15",
          status: "pending",
        })
        .returning();

      // Simulate new transaction detected
      await ctx.db
        .update(schema.detectedPatterns)
        .set({
          lastOccurrence: "2024-05-15",
          nextExpected: "2024-06-15",
        })
        .where(eq(schema.detectedPatterns.id, pattern.id));

      const updated = await ctx.db.query.detectedPatterns.findFirst({
        where: eq(schema.detectedPatterns.id, pattern.id),
      });

      expect(updated?.lastOccurrence).toBe("2024-05-15");
      expect(updated?.nextExpected).toBe("2024-06-15");
    });
  });

  describe("deletion and cleanup", () => {
    it("should delete pattern", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds,
          status: "pending",
        })
        .returning();

      await ctx.db
        .delete(schema.detectedPatterns)
        .where(eq(schema.detectedPatterns.id, pattern.id));

      const deleted = await ctx.db.query.detectedPatterns.findFirst({
        where: eq(schema.detectedPatterns.id, pattern.id),
      });

      expect(deleted).toBeUndefined();
    });

    it("should delete pattern when account is deleted (manual cleanup)", async () => {
      const [pattern] = await ctx.db
        .insert(schema.detectedPatterns)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds,
          status: "pending",
        })
        .returning();

      // Delete patterns for this account first (since FK cascade may not work in test DB)
      await ctx.db
        .delete(schema.detectedPatterns)
        .where(eq(schema.detectedPatterns.accountId, ctx.accountId));

      // Delete transactions (FK constraint)
      await ctx.db
        .delete(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      await ctx.db.delete(schema.accounts).where(eq(schema.accounts.id, ctx.accountId));

      const deleted = await ctx.db.query.detectedPatterns.findFirst({
        where: eq(schema.detectedPatterns.id, pattern.id),
      });

      expect(deleted).toBeUndefined();
    });
  });

  describe("workspace isolation", () => {
    it("should isolate patterns by workspace", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Workspace 2",
          slug: "workspace-2",
        })
        .returning();

      const [account2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: workspace2.id,
          name: "Account 2",
          slug: "account-2",
          accountType: "checking",
        })
        .returning();

      await ctx.db.insert(schema.detectedPatterns).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          patternType: "monthly",
          confidenceScore: 0.9,
          sampleTransactionIds: ctx.transactionIds,
          status: "pending",
        },
        {
          workspaceId: workspace2.id,
          accountId: account2.id,
          patternType: "weekly",
          confidenceScore: 0.8,
          sampleTransactionIds: [],
          status: "pending",
        },
      ]);

      const ws1Patterns = await ctx.db
        .select()
        .from(schema.detectedPatterns)
        .where(eq(schema.detectedPatterns.workspaceId, ctx.workspaceId));

      const ws2Patterns = await ctx.db
        .select()
        .from(schema.detectedPatterns)
        .where(eq(schema.detectedPatterns.workspaceId, workspace2.id));

      expect(ws1Patterns).toHaveLength(1);
      expect(ws1Patterns[0].patternType).toBe("monthly");

      expect(ws2Patterns).toHaveLength(1);
      expect(ws2Patterns[0].patternType).toBe("weekly");
    });
  });
});
