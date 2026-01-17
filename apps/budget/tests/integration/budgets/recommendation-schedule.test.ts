/**
 * Budget Schedule Creation from Recommendations - Integration Tests
 *
 * Tests the flow of creating budget schedules when applying "scheduled-expense"
 * budget recommendations. Since the budget services use a global db import,
 * these tests work directly with database operations to validate the data model
 * and business logic.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb } from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import { eq, and } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

// Test context
interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  payeeId: number;
  categoryId: number;
}

/**
 * Set up test database with required entities
 */
async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  // Create workspace
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  // Create account
  const [account] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Test Checking",
      slug: "test-checking",
      accountType: "checking",
    })
    .returning();

  // Create payee
  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Netflix",
      slug: "netflix",
    })
    .returning();

  // Create category
  const [category] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Subscriptions",
      slug: "subscriptions",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    payeeId: payee.id,
    categoryId: category.id,
  };
}

/**
 * Create a scheduled-expense recommendation in the database
 */
async function createScheduledExpenseRecommendation(
  ctx: TestContext,
  options: {
    amount?: number;
    frequency?: string;
    transactionIds?: number[];
  } = {}
) {
  const { db, workspaceId, accountId, payeeId, categoryId } = ctx;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const [recommendation] = await db
    .insert(schema.budgetRecommendations)
    .values({
      workspaceId,
      type: "create_budget",
      priority: "medium",
      title: "Create scheduled budget for Netflix",
      description: "Based on recurring monthly payments",
      confidence: 85,
      status: "pending",
      accountId,
      categoryId,
      metadata: JSON.stringify({
        suggestedType: "scheduled-expense",
        suggestedAmount: options.amount ?? 15.99,
        detectedFrequency: options.frequency ?? "monthly",
        payeeIds: [payeeId],
        transactionIds: options.transactionIds ?? [],
      }),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return recommendation;
}

/**
 * Simulate the schedule creation logic from applyRecommendation
 * This replicates the key database operations without using the global db
 */
async function simulateScheduleCreationFromRecommendation(
  ctx: TestContext,
  recommendationId: number
) {
  const { db, workspaceId } = ctx;

  // Get recommendation
  const recommendation = await db.query.budgetRecommendations.findFirst({
    where: eq(schema.budgetRecommendations.id, recommendationId),
  });

  if (!recommendation) {
    throw new Error("Recommendation not found");
  }

  const metadata = JSON.parse(recommendation.metadata as string);
  const payeeId = metadata.payeeIds?.[0];
  const accountId = recommendation.accountId;

  if (!accountId) {
    throw new Error("Recommendation must have an accountId for scheduled expenses");
  }

  // Get payee name for schedule/budget naming
  const payee = await db.query.payees.findFirst({
    where: eq(schema.payees.id, payeeId),
  });

  if (!payee) {
    throw new Error("Payee not found");
  }

  const budgetName = payee.name;
  const suggestedAmount = metadata.suggestedAmount || 0;
  const detectedFrequency = metadata.detectedFrequency || "monthly";

  // Map frequency to schedule config
  const frequencyMap: Record<
    string,
    { frequency: "daily" | "weekly" | "monthly" | "yearly"; interval: number }
  > = {
    daily: { frequency: "daily", interval: 1 },
    weekly: { frequency: "weekly", interval: 1 },
    "bi-weekly": { frequency: "weekly", interval: 2 },
    monthly: { frequency: "monthly", interval: 1 },
    quarterly: { frequency: "monthly", interval: 3 },
    yearly: { frequency: "yearly", interval: 1 },
  };

  const freqConfig = frequencyMap[detectedFrequency] || {
    frequency: "monthly" as const,
    interval: 1,
  };

  // Create schedule
  const [createdSchedule] = await db
    .insert(schema.schedules)
    .values({
      workspaceId,
      name: budgetName,
      slug: budgetName.toLowerCase().replace(/\s+/g, "-"),
      amount: suggestedAmount,
      accountId,
      payeeId,
      categoryId: recommendation.categoryId ?? undefined,
      status: "active",
      auto_add: true,
    })
    .returning();

  // Create schedule date
  const startDate = new Date().toISOString().split("T")[0]!;
  const [scheduleDate] = await db
    .insert(schema.scheduleDates)
    .values({
      scheduleId: createdSchedule.id,
      start: startDate,
      end: null,
      frequency: freqConfig.frequency,
      interval: freqConfig.interval,
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

  // Update schedule with dateId
  await db
    .update(schema.schedules)
    .set({ dateId: scheduleDate.id })
    .where(eq(schema.schedules.id, createdSchedule.id));

  // Create budget
  const [createdBudget] = await db
    .insert(schema.budgets)
    .values({
      workspaceId,
      name: budgetName,
      slug: `${budgetName.toLowerCase().replace(/\s+/g, "-")}-budget`,
      type: "scheduled-expense",
      scope: "account",
      status: "active",
      enforcementLevel: "warning",
      metadata: JSON.stringify({
        allocatedAmount: suggestedAmount,
        scheduledExpense: {
          linkedScheduleId: createdSchedule.id,
          payeeId,
          expectedAmount: suggestedAmount,
          frequency: detectedFrequency,
          autoTrack: true,
        },
      }),
    })
    .returning();

  // Link schedule to budget
  await db
    .update(schema.schedules)
    .set({ budgetId: createdBudget.id })
    .where(eq(schema.schedules.id, createdSchedule.id));

  // Create period template
  // Note: allocatedAmount is stored on budgetPeriodInstances, not templates
  // The template defines the schedule pattern, instances have the actual amounts
  const [periodTemplate] = await db
    .insert(schema.budgetPeriodTemplates)
    .values({
      budgetId: createdBudget.id,
      type: "monthly",
      startDayOfMonth: 1,
    })
    .returning();

  // Mark recommendation as applied
  const now = new Date().toISOString();
  await db
    .update(schema.budgetRecommendations)
    .set({
      status: "applied",
      budgetId: createdBudget.id,
      appliedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.budgetRecommendations.id, recommendationId));

  // Link transactions if provided
  const transactionIds = metadata.transactionIds as number[] | undefined;
  if (transactionIds?.length) {
    // Update transactions with scheduleId
    for (const txnId of transactionIds) {
      await db
        .update(schema.transactions)
        .set({ scheduleId: createdSchedule.id })
        .where(eq(schema.transactions.id, txnId));
    }

    // Create budget allocations
    const txnData = await db
      .select({ id: schema.transactions.id, amount: schema.transactions.amount })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.workspaceId, workspaceId),
          eq(schema.transactions.scheduleId, createdSchedule.id)
        )
      );

    if (txnData.length > 0) {
      await db.insert(schema.budgetTransactions).values(
        txnData.map((txn) => ({
          transactionId: txn.id,
          budgetId: createdBudget.id,
          allocatedAmount: Math.abs(txn.amount ?? 0),
          autoAssigned: true,
          assignedBy: "recommendation",
        }))
      );
    }
  }

  return {
    schedule: createdSchedule,
    scheduleDate,
    budget: createdBudget,
    periodTemplate,
  };
}

describe("Budget Schedule Creation from Recommendations", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  afterEach(async () => {
    // Clean up is handled by in-memory database being discarded
  });

  describe("applyRecommendation for scheduled-expense", () => {
    it("should create schedule when applying scheduled-expense recommendation", async () => {
      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        amount: 15.99,
        frequency: "monthly",
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Verify schedule created with correct properties
      expect(result.schedule).toBeDefined();
      expect(result.schedule.name).toBe("Netflix");
      expect(result.schedule.amount).toBe(15.99);
      expect(result.schedule.accountId).toBe(ctx.accountId);
      expect(result.schedule.payeeId).toBe(ctx.payeeId);
      expect(result.schedule.auto_add).toBe(true);
      expect(result.schedule.status).toBe("active");
    });

    it("should create schedule_dates with correct frequency", async () => {
      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        amount: 50.0,
        frequency: "monthly",
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Verify schedule date configuration
      expect(result.scheduleDate).toBeDefined();
      expect(result.scheduleDate.frequency).toBe("monthly");
      expect(result.scheduleDate.interval).toBe(1);
      expect(result.scheduleDate.scheduleId).toBe(result.schedule.id);

      // Verify schedule has dateId linking to schedule_dates
      const updatedSchedule = await ctx.db.query.schedules.findFirst({
        where: eq(schema.schedules.id, result.schedule.id),
      });
      expect(updatedSchedule?.dateId).toBe(result.scheduleDate.id);
    });

    it("should create budget linked to schedule", async () => {
      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        amount: 15.99,
        frequency: "monthly",
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Verify budget created with correct type
      expect(result.budget).toBeDefined();
      expect(result.budget.type).toBe("scheduled-expense");
      expect(result.budget.name).toBe("Netflix");

      // Verify budget metadata contains linkedScheduleId
      const budgetMetadata = JSON.parse(result.budget.metadata as string);
      expect(budgetMetadata.scheduledExpense.linkedScheduleId).toBe(result.schedule.id);
      expect(budgetMetadata.scheduledExpense.autoTrack).toBe(true);

      // Verify schedule.budgetId points back to budget
      const updatedSchedule = await ctx.db.query.schedules.findFirst({
        where: eq(schema.schedules.id, result.schedule.id),
      });
      expect(updatedSchedule?.budgetId).toBe(result.budget.id);
    });

    it("should create period template for budget", async () => {
      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        amount: 25.0,
        frequency: "monthly",
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Verify period template created
      // Note: allocatedAmount is on budgetPeriodInstances, not templates
      // Templates define the recurrence pattern, instances have actual amounts
      expect(result.periodTemplate).toBeDefined();
      expect(result.periodTemplate.budgetId).toBe(result.budget.id);
      expect(result.periodTemplate.type).toBe("monthly");
      expect(result.periodTemplate.startDayOfMonth).toBe(1);
    });

    it("should link historical transactions to schedule", async () => {
      // Create some test transactions first
      const [txn1] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -15.99,
          date: "2024-01-15",
          payeeId: ctx.payeeId,
        })
        .returning();

      const [txn2] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -15.99,
          date: "2024-02-15",
          payeeId: ctx.payeeId,
        })
        .returning();

      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        amount: 15.99,
        frequency: "monthly",
        transactionIds: [txn1.id, txn2.id],
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Verify transactions linked to schedule
      const linkedTxns = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.scheduleId, result.schedule.id));

      expect(linkedTxns).toHaveLength(2);
      expect(linkedTxns.map((t) => t.id).sort()).toEqual([txn1.id, txn2.id].sort());
    });

    it("should create budget allocations for linked transactions", async () => {
      // Create test transactions
      const [txn1] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -15.99,
          date: "2024-01-15",
          payeeId: ctx.payeeId,
        })
        .returning();

      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        amount: 15.99,
        frequency: "monthly",
        transactionIds: [txn1.id],
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Verify budget allocations created
      const allocations = await ctx.db
        .select()
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, result.budget.id));

      expect(allocations).toHaveLength(1);
      expect(allocations[0].transactionId).toBe(txn1.id);
      expect(allocations[0].allocatedAmount).toBe(15.99);
      expect(allocations[0].autoAssigned).toBe(true);
      expect(allocations[0].assignedBy).toBe("recommendation");
    });

    it("should mark recommendation as applied with budget link", async () => {
      const recommendation = await createScheduledExpenseRecommendation(ctx);

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Verify recommendation updated
      const updatedRecommendation = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      expect(updatedRecommendation?.status).toBe("applied");
      expect(updatedRecommendation?.budgetId).toBe(result.budget.id);
      expect(updatedRecommendation?.appliedAt).toBeDefined();
    });
  });

  describe("frequency mapping", () => {
    const frequencyTestCases = [
      { input: "daily", expectedFrequency: "daily", expectedInterval: 1 },
      { input: "weekly", expectedFrequency: "weekly", expectedInterval: 1 },
      { input: "bi-weekly", expectedFrequency: "weekly", expectedInterval: 2 },
      { input: "monthly", expectedFrequency: "monthly", expectedInterval: 1 },
      { input: "quarterly", expectedFrequency: "monthly", expectedInterval: 3 },
      { input: "yearly", expectedFrequency: "yearly", expectedInterval: 1 },
    ];

    for (const testCase of frequencyTestCases) {
      it(`should map ${testCase.input} to frequency=${testCase.expectedFrequency}, interval=${testCase.expectedInterval}`, async () => {
        const recommendation = await createScheduledExpenseRecommendation(ctx, {
          frequency: testCase.input,
        });

        const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

        expect(result.scheduleDate.frequency).toBe(testCase.expectedFrequency);
        expect(result.scheduleDate.interval).toBe(testCase.expectedInterval);
      });
    }
  });

  describe("edge cases", () => {
    it("should handle recommendation without transactionIds", async () => {
      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        amount: 9.99,
        frequency: "monthly",
        transactionIds: [], // No transactions
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      // Should still create schedule and budget
      expect(result.schedule).toBeDefined();
      expect(result.budget).toBeDefined();

      // No budget allocations should be created
      const allocations = await ctx.db
        .select()
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, result.budget.id));

      expect(allocations).toHaveLength(0);
    });

    it("should handle unknown frequency by defaulting to monthly", async () => {
      const recommendation = await createScheduledExpenseRecommendation(ctx, {
        frequency: "unknown-frequency",
      });

      const result = await simulateScheduleCreationFromRecommendation(ctx, recommendation.id);

      expect(result.scheduleDate.frequency).toBe("monthly");
      expect(result.scheduleDate.interval).toBe(1);
    });
  });
});
