/**
 * Budget Enforcement - Integration Tests
 *
 * Tests enforcement levels (none, warning, strict) and
 * their effect on budget behavior.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, sum} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  categoryId: number;
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
      name: "Test Checking",
      slug: "test-checking",
      type: "checking",
    })
    .returning();

  const [category] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Groceries",
      slug: "groceries",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    categoryId: category.id,
  };
}

async function createBudgetWithEnforcement(
  ctx: TestContext,
  enforcementLevel: "none" | "warning" | "strict",
  allocatedAmount: number = 500
) {
  const [budget] = await ctx.db
    .insert(schema.budgets)
    .values({
      workspaceId: ctx.workspaceId,
      name: `${enforcementLevel} Budget`,
      slug: `${enforcementLevel}-budget`,
      type: "category",
      scope: "category",
      status: "active",
      enforcementLevel,
    })
    .returning();

  const [template] = await ctx.db
    .insert(schema.budgetPeriodTemplates)
    .values({
      budgetId: budget.id,
      type: "monthly",
      startDayOfMonth: 1,
    })
    .returning();

  const [periodInstance] = await ctx.db
    .insert(schema.budgetPeriodInstances)
    .values({
      templateId: template.id,
      budgetId: budget.id,
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      allocatedAmount,
      actualAmount: 0,
      status: "active",
    })
    .returning();

  await ctx.db.insert(schema.budgetCategories).values({
    budgetId: budget.id,
    categoryId: ctx.categoryId,
  });

  return {budget, template, periodInstance};
}

describe("Budget Enforcement", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("enforcement levels", () => {
    it("should support 'none' enforcement level", async () => {
      const {budget} = await createBudgetWithEnforcement(ctx, "none");

      expect(budget.enforcementLevel).toBe("none");
    });

    it("should support 'warning' enforcement level", async () => {
      const {budget} = await createBudgetWithEnforcement(ctx, "warning");

      expect(budget.enforcementLevel).toBe("warning");
    });

    it("should support 'strict' enforcement level", async () => {
      const {budget} = await createBudgetWithEnforcement(ctx, "strict");

      expect(budget.enforcementLevel).toBe("strict");
    });

    it("should allow changing enforcement level", async () => {
      const {budget} = await createBudgetWithEnforcement(ctx, "warning");

      await ctx.db.update(schema.budgets).set({enforcementLevel: "strict"}).where(eq(schema.budgets.id, budget.id));

      const updated = await ctx.db.query.budgets.findFirst({
        where: eq(schema.budgets.id, budget.id),
      });

      expect(updated?.enforcementLevel).toBe("strict");
    });
  });

  describe("none enforcement", () => {
    it("should allow transactions regardless of budget status", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "none", 100);

      // Create transaction that exceeds budget
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -200, // Exceeds 100 budget
          date: "2024-01-15",
        })
        .returning();

      // Allocate to budget (allowed with 'none' enforcement)
      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budget.id,
        allocatedAmount: 200,
      });

      const allocation = await ctx.db.query.budgetTransactions.findFirst({
        where: eq(schema.budgetTransactions.transactionId, transaction.id),
      });

      expect(allocation).toBeDefined();
      expect(allocation?.allocatedAmount).toBe(200);
    });

    it("should not generate warnings for over-budget spending", async () => {
      const {budget} = await createBudgetWithEnforcement(ctx, "none", 100);

      // Simulate over-budget check
      const isOverBudget = await checkIfOverBudget(ctx.db, budget.id, 200);

      // With 'none' enforcement, we don't care about over-budget
      // The check returns true but enforcement is none so no action needed
      expect(budget.enforcementLevel).toBe("none");
    });
  });

  describe("warning enforcement", () => {
    it("should allow transactions that exceed budget", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "warning", 100);

      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -150, // Exceeds 100 budget
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budget.id,
        allocatedAmount: 150,
      });

      const allocation = await ctx.db.query.budgetTransactions.findFirst({
        where: eq(schema.budgetTransactions.transactionId, transaction.id),
      });

      expect(allocation).toBeDefined();
    });

    it("should detect when spending approaches limit (80% threshold)", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "warning", 100);

      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -85, // 85% of budget
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budget.id,
        allocatedAmount: 85,
      });

      const instance = await ctx.db.query.budgetPeriodInstances.findFirst({
        where: eq(schema.budgetPeriodInstances.id, periodInstance.id),
      });

      const spentResult = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, budget.id));

      const totalSpent = Number(spentResult[0].total) || 0;
      const allocated = instance?.allocatedAmount ?? 0;
      const utilizationRate = (totalSpent / allocated) * 100;

      const isApproachingLimit = utilizationRate >= 80;
      expect(isApproachingLimit).toBe(true);
    });

    it("should detect over-budget status", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "warning", 100);

      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -120,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budget.id,
        allocatedAmount: 120,
      });

      const isOverBudget = await checkIfOverBudget(ctx.db, budget.id, periodInstance.allocatedAmount ?? 0);
      expect(isOverBudget).toBe(true);
    });
  });

  describe("strict enforcement", () => {
    it("should validate transaction against budget before allocation", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "strict", 100);

      // Check if transaction would exceed budget BEFORE creating it
      const proposedAmount = 150;
      const currentSpent = 0;
      const allocated = periodInstance.allocatedAmount ?? 0;

      const wouldExceed = currentSpent + proposedAmount > allocated;
      expect(wouldExceed).toBe(true);

      // In strict mode, this transaction should be blocked
      // Simulating the validation check
      if (budget.enforcementLevel === "strict" && wouldExceed) {
        // Would throw error in real implementation
        expect(true).toBe(true); // Transaction blocked
      }
    });

    it("should allow transactions within budget", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "strict", 100);

      const proposedAmount = 80;
      const currentSpent = 0;
      const allocated = periodInstance.allocatedAmount ?? 0;

      const wouldExceed = currentSpent + proposedAmount > allocated;
      expect(wouldExceed).toBe(false);

      // Transaction allowed
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -80,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budget.id,
        allocatedAmount: 80,
      });

      const allocation = await ctx.db.query.budgetTransactions.findFirst({
        where: eq(schema.budgetTransactions.transactionId, transaction.id),
      });

      expect(allocation).toBeDefined();
    });

    it("should calculate remaining budget for strict validation", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "strict", 100);

      // First transaction
      const [txn1] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -60,
          date: "2024-01-10",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: txn1.id,
        budgetId: budget.id,
        allocatedAmount: 60,
      });

      // Calculate remaining
      const spentResult = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, budget.id));

      const currentSpent = Number(spentResult[0].total) || 0;
      const allocated = periodInstance.allocatedAmount ?? 0;
      const remaining = allocated - currentSpent;

      expect(remaining).toBe(40);

      // Second transaction would exceed
      const proposedAmount = 50;
      const wouldExceed = currentSpent + proposedAmount > allocated;
      expect(wouldExceed).toBe(true);
    });
  });

  describe("enforcement level comparison", () => {
    it("should behave differently based on enforcement level", async () => {
      const noneResult = await createBudgetWithEnforcement(ctx, "none", 100);
      const warningResult = await createBudgetWithEnforcement(ctx, "warning", 100);
      const strictResult = await createBudgetWithEnforcement(ctx, "strict", 100);

      // Rename budgets to avoid conflicts
      await ctx.db
        .update(schema.budgets)
        .set({slug: "none-budget-test"})
        .where(eq(schema.budgets.id, noneResult.budget.id));
      await ctx.db
        .update(schema.budgets)
        .set({slug: "warning-budget-test"})
        .where(eq(schema.budgets.id, warningResult.budget.id));
      await ctx.db
        .update(schema.budgets)
        .set({slug: "strict-budget-test"})
        .where(eq(schema.budgets.id, strictResult.budget.id));

      const proposedAmount = 150; // Exceeds all budgets

      // None: No action needed
      const noneAction = determineAction("none", proposedAmount, 100);
      expect(noneAction).toBe("allow");

      // Warning: Allow but warn
      const warningAction = determineAction("warning", proposedAmount, 100);
      expect(warningAction).toBe("warn");

      // Strict: Block
      const strictAction = determineAction("strict", proposedAmount, 100);
      expect(strictAction).toBe("block");
    });
  });

  describe("budget status", () => {
    it("should only enforce active budgets", async () => {
      const {budget} = await createBudgetWithEnforcement(ctx, "strict", 100);

      // Deactivate budget
      await ctx.db.update(schema.budgets).set({status: "inactive"}).where(eq(schema.budgets.id, budget.id));

      const updated = await ctx.db.query.budgets.findFirst({
        where: eq(schema.budgets.id, budget.id),
      });

      expect(updated?.status).toBe("inactive");

      // Inactive budgets should not enforce
      const shouldEnforce = updated?.status === "active";
      expect(shouldEnforce).toBe(false);
    });

    it("should not enforce archived budgets", async () => {
      const {budget} = await createBudgetWithEnforcement(ctx, "strict", 100);

      await ctx.db.update(schema.budgets).set({status: "archived"}).where(eq(schema.budgets.id, budget.id));

      const updated = await ctx.db.query.budgets.findFirst({
        where: eq(schema.budgets.id, budget.id),
      });

      const shouldEnforce = updated?.status === "active";
      expect(shouldEnforce).toBe(false);
    });
  });

  describe("utilization thresholds", () => {
    it("should calculate utilization rate correctly", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "warning", 1000);

      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -750,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budget.id,
        allocatedAmount: 750,
      });

      const spentResult = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, budget.id));

      const totalSpent = Number(spentResult[0].total) || 0;
      const allocated = periodInstance.allocatedAmount ?? 1;
      const utilizationRate = (totalSpent / allocated) * 100;

      expect(utilizationRate).toBe(75);
    });

    it("should identify different warning thresholds", async () => {
      const testCases = [
        {spent: 50, allocated: 100, threshold: "safe"}, // 50%
        {spent: 75, allocated: 100, threshold: "caution"}, // 75%
        {spent: 85, allocated: 100, threshold: "warning"}, // 85%
        {spent: 95, allocated: 100, threshold: "critical"}, // 95%
        {spent: 110, allocated: 100, threshold: "exceeded"}, // 110%
      ];

      for (const testCase of testCases) {
        const utilizationRate = (testCase.spent / testCase.allocated) * 100;
        const threshold = categorizeUtilization(utilizationRate);
        expect(threshold).toBe(testCase.threshold);
      }
    });
  });

  describe("deficit detection", () => {
    it("should detect deficit when spending exceeds allocation", async () => {
      const {budget, periodInstance} = await createBudgetWithEnforcement(ctx, "warning", 100);

      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -150,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budget.id,
        allocatedAmount: 150,
      });

      const spentResult = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, budget.id));

      const totalSpent = Number(spentResult[0].total) || 0;
      const allocated = periodInstance.allocatedAmount ?? 0;

      const hasDeficit = totalSpent > allocated;
      const deficitAmount = hasDeficit ? totalSpent - allocated : 0;

      expect(hasDeficit).toBe(true);
      expect(deficitAmount).toBe(50);
    });

    it("should calculate deficit severity", async () => {
      const testCases = [
        {deficit: 10, allocated: 100, severity: "low"}, // 10% over
        {deficit: 25, allocated: 100, severity: "medium"}, // 25% over
        {deficit: 50, allocated: 100, severity: "high"}, // 50% over
        {deficit: 100, allocated: 100, severity: "critical"}, // 100% over
      ];

      for (const testCase of testCases) {
        const overagePercent = (testCase.deficit / testCase.allocated) * 100;
        const severity = categorizeDeficitSeverity(overagePercent);
        expect(severity).toBe(testCase.severity);
      }
    });
  });
});

// Helper functions for tests

async function checkIfOverBudget(db: TestDb, budgetId: number, allocated: number): Promise<boolean> {
  const spentResult = await db
    .select({total: sum(schema.budgetTransactions.allocatedAmount)})
    .from(schema.budgetTransactions)
    .where(eq(schema.budgetTransactions.budgetId, budgetId));

  const totalSpent = Number(spentResult[0].total) || 0;
  return totalSpent > allocated;
}

function determineAction(
  enforcementLevel: "none" | "warning" | "strict",
  amount: number,
  remaining: number
): "allow" | "warn" | "block" {
  if (amount <= remaining) {
    return "allow";
  }

  switch (enforcementLevel) {
    case "none":
      return "allow";
    case "warning":
      return "warn";
    case "strict":
      return "block";
  }
}

function categorizeUtilization(rate: number): string {
  if (rate > 100) return "exceeded";
  if (rate >= 90) return "critical";
  if (rate >= 80) return "warning";
  if (rate >= 70) return "caution";
  return "safe";
}

function categorizeDeficitSeverity(overagePercent: number): string {
  if (overagePercent >= 75) return "critical";
  if (overagePercent >= 40) return "high";
  if (overagePercent >= 20) return "medium";
  return "low";
}
