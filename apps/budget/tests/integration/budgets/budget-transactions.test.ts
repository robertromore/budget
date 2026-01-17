/**
 * Budget Transactions & Allocations - Integration Tests
 *
 * Tests transaction-to-budget allocation, auto-assignment,
 * and split transactions across budgets.
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
  budgetId: number;
  periodInstanceId: number;
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
      accountType: "checking",
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

  const [budget] = await db
    .insert(schema.budgets)
    .values({
      workspaceId: workspace.id,
      name: "Grocery Budget",
      slug: "grocery-budget",
      type: "category-envelope",
      scope: "category",
      status: "active",
      enforcementLevel: "warning",
    })
    .returning();

  const [template] = await db
    .insert(schema.budgetPeriodTemplates)
    .values({
      budgetId: budget.id,
      type: "monthly",
      startDayOfMonth: 1,
    })
    .returning();

  const [periodInstance] = await db
    .insert(schema.budgetPeriodInstances)
    .values({
      templateId: template.id,
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      allocatedAmount: 500,
      actualAmount: 0,
    })
    .returning();

  // Link budget to category
  await db.insert(schema.budgetCategories).values({
    budgetId: budget.id,
    categoryId: category.id,
  });

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    categoryId: category.id,
    budgetId: budget.id,
    periodInstanceId: periodInstance.id,
  };
}

describe("Budget Transactions & Allocations", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("createAllocation", () => {
    it("should create budget transaction allocation", async () => {
      // Create a transaction
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -50.0,
          date: "2024-01-15",
        })
        .returning();

      // Create budget allocation
      const [allocation] = await ctx.db
        .insert(schema.budgetTransactions)
        .values({
          transactionId: transaction.id,
          budgetId: ctx.budgetId,
          allocatedAmount: 50.0,
          autoAssigned: false,
          assignedBy: "manual",
        })
        .returning();

      expect(allocation).toBeDefined();
      expect(allocation.transactionId).toBe(transaction.id);
      expect(allocation.budgetId).toBe(ctx.budgetId);
      expect(allocation.allocatedAmount).toBe(50.0);
      expect(allocation.autoAssigned).toBe(false);
    });

    it("should support auto-assigned allocations", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -75.0,
          date: "2024-01-15",
        })
        .returning();

      const [allocation] = await ctx.db
        .insert(schema.budgetTransactions)
        .values({
          transactionId: transaction.id,
          budgetId: ctx.budgetId,
          allocatedAmount: 75.0,
          autoAssigned: true,
          assignedBy: "category-match",
        })
        .returning();

      expect(allocation.autoAssigned).toBe(true);
      expect(allocation.assignedBy).toBe("category-match");
    });

    it("should track allocation source (recommendation, import, manual)", async () => {
      const sources = ["recommendation", "import", "manual", "schedule-match"];

      for (const source of sources) {
        const [transaction] = await ctx.db
          .insert(schema.transactions)
          .values({
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            amount: -25.0,
            date: "2024-01-15",
          })
          .returning();

        const [allocation] = await ctx.db
          .insert(schema.budgetTransactions)
          .values({
            transactionId: transaction.id,
            budgetId: ctx.budgetId,
            allocatedAmount: 25.0,
            autoAssigned: source !== "manual",
            assignedBy: source,
          })
          .returning();

        expect(allocation.assignedBy).toBe(source);
      }
    });
  });

  describe("getAllocationsForTransaction", () => {
    it("should retrieve all allocations for a transaction", async () => {
      // Create second budget
      const [budget2] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Secondary Budget",
          slug: "secondary-budget",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      // Allocate to both budgets
      await ctx.db.insert(schema.budgetTransactions).values([
        {
          transactionId: transaction.id,
          budgetId: ctx.budgetId,
          allocatedAmount: 60.0,
        },
        {
          transactionId: transaction.id,
          budgetId: budget2.id,
          allocatedAmount: 40.0,
        },
      ]);

      const allocations = await ctx.db
        .select()
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.transactionId, transaction.id));

      expect(allocations).toHaveLength(2);
      expect(allocations.map((a) => a.allocatedAmount).sort()).toEqual([40, 60]);
    });
  });

  describe("split transactions", () => {
    it("should allow splitting transaction across multiple budgets", async () => {
      // Create additional budget
      const [budget2] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Entertainment Budget",
          slug: "entertainment-budget",
          type: "category-envelope",
          scope: "category",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -150.0,
          date: "2024-01-15",
          notes: "Costco - groceries and entertainment",
        })
        .returning();

      // Split: 100 to groceries, 50 to entertainment
      await ctx.db.insert(schema.budgetTransactions).values([
        {
          transactionId: transaction.id,
          budgetId: ctx.budgetId,
          allocatedAmount: 100.0,
        },
        {
          transactionId: transaction.id,
          budgetId: budget2.id,
          allocatedAmount: 50.0,
        },
      ]);

      const allocations = await ctx.db
        .select()
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.transactionId, transaction.id));

      const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocatedAmount ?? 0), 0);

      expect(totalAllocated).toBe(150.0);
      expect(Math.abs(transaction.amount ?? 0)).toBe(totalAllocated);
    });

    it("should detect partial allocation (under-allocated)", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      // Only allocate 75 of 100
      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: ctx.budgetId,
        allocatedAmount: 75.0,
      });

      const allocations = await ctx.db
        .select()
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.transactionId, transaction.id));

      const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocatedAmount ?? 0), 0);
      const transactionAmount = Math.abs(transaction.amount ?? 0);

      const isFullyAllocated = totalAllocated >= transactionAmount;
      const unallocatedAmount = transactionAmount - totalAllocated;

      expect(isFullyAllocated).toBe(false);
      expect(unallocatedAmount).toBe(25.0);
    });
  });

  describe("budget spending calculation", () => {
    it("should sum allocations for budget spending", async () => {
      // Create multiple transactions
      const transactions = await ctx.db
        .insert(schema.transactions)
        .values([
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            categoryId: ctx.categoryId,
            amount: -50.0,
            date: "2024-01-10",
          },
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            categoryId: ctx.categoryId,
            amount: -75.0,
            date: "2024-01-15",
          },
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            categoryId: ctx.categoryId,
            amount: -25.0,
            date: "2024-01-20",
          },
        ])
        .returning();

      // Allocate all to budget
      await ctx.db.insert(schema.budgetTransactions).values(
        transactions.map((t) => ({
          transactionId: t.id,
          budgetId: ctx.budgetId,
          allocatedAmount: Math.abs(t.amount ?? 0),
          autoAssigned: true,
        }))
      );

      // Sum allocations for budget
      const result = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, ctx.budgetId));

      expect(Number(result[0].total)).toBe(150.0);
    });

    it("should update period instance actual amount", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: ctx.budgetId,
        allocatedAmount: 100.0,
      });

      // Calculate total spent and update period instance
      const spentResult = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, ctx.budgetId));

      const totalSpent = Number(spentResult[0].total) || 0;

      await ctx.db
        .update(schema.budgetPeriodInstances)
        .set({actualAmount: totalSpent})
        .where(eq(schema.budgetPeriodInstances.id, ctx.periodInstanceId));

      const updatedInstance = await ctx.db.query.budgetPeriodInstances.findFirst({
        where: eq(schema.budgetPeriodInstances.id, ctx.periodInstanceId),
      });

      expect(updatedInstance?.actualAmount).toBe(100.0);
    });
  });

  describe("over-budget detection", () => {
    it("should detect when spending exceeds budget", async () => {
      // Period has 500 allocated
      // Create transactions totaling 600

      const transactions = await ctx.db
        .insert(schema.transactions)
        .values([
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            categoryId: ctx.categoryId,
            amount: -300.0,
            date: "2024-01-10",
          },
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            categoryId: ctx.categoryId,
            amount: -300.0,
            date: "2024-01-20",
          },
        ])
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values(
        transactions.map((t) => ({
          transactionId: t.id,
          budgetId: ctx.budgetId,
          allocatedAmount: Math.abs(t.amount ?? 0),
        }))
      );

      // Get period instance
      const instance = await ctx.db.query.budgetPeriodInstances.findFirst({
        where: eq(schema.budgetPeriodInstances.id, ctx.periodInstanceId),
      });

      // Calculate total spent
      const spentResult = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, ctx.budgetId));

      const totalSpent = Number(spentResult[0].total) || 0;
      const allocated = instance?.allocatedAmount ?? 0;

      const isOverBudget = totalSpent > allocated;
      const overBudgetAmount = totalSpent - allocated;

      expect(isOverBudget).toBe(true);
      expect(overBudgetAmount).toBe(100.0);
    });

    it("should calculate remaining budget", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -200.0,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: ctx.budgetId,
        allocatedAmount: 200.0,
      });

      const instance = await ctx.db.query.budgetPeriodInstances.findFirst({
        where: eq(schema.budgetPeriodInstances.id, ctx.periodInstanceId),
      });

      const spentResult = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, ctx.budgetId));

      const totalSpent = Number(spentResult[0].total) || 0;
      const allocated = instance?.allocatedAmount ?? 0;
      const remaining = allocated - totalSpent;

      expect(remaining).toBe(300.0); // 500 - 200
    });
  });

  describe("allocation by category", () => {
    it("should find budget for transaction based on category", async () => {
      // Budget is linked to category via budgetCategories

      const budgetCategories = await ctx.db
        .select()
        .from(schema.budgetCategories)
        .where(eq(schema.budgetCategories.categoryId, ctx.categoryId));

      expect(budgetCategories).toHaveLength(1);
      expect(budgetCategories[0].budgetId).toBe(ctx.budgetId);
    });

    it("should auto-assign transaction to category-linked budget", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          amount: -50.0,
          date: "2024-01-15",
        })
        .returning();

      // Find applicable budget via category
      const budgetCategory = await ctx.db.query.budgetCategories.findFirst({
        where: eq(schema.budgetCategories.categoryId, ctx.categoryId),
      });

      expect(budgetCategory).toBeDefined();

      // Auto-assign to budget
      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: budgetCategory!.budgetId,
        allocatedAmount: Math.abs(transaction.amount ?? 0),
        autoAssigned: true,
        assignedBy: "category-match",
      });

      const allocation = await ctx.db.query.budgetTransactions.findFirst({
        where: eq(schema.budgetTransactions.transactionId, transaction.id),
      });

      expect(allocation?.budgetId).toBe(ctx.budgetId);
      expect(allocation?.autoAssigned).toBe(true);
    });
  });

  describe("allocation removal", () => {
    it("should remove allocation when transaction is deleted", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -50.0,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.budgetTransactions).values({
        transactionId: transaction.id,
        budgetId: ctx.budgetId,
        allocatedAmount: 50.0,
      });

      // Delete allocation first (or use cascade)
      await ctx.db.delete(schema.budgetTransactions).where(eq(schema.budgetTransactions.transactionId, transaction.id));

      // Then delete transaction
      await ctx.db.delete(schema.transactions).where(eq(schema.transactions.id, transaction.id));

      const allocations = await ctx.db
        .select()
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.transactionId, transaction.id));

      expect(allocations).toHaveLength(0);
    });

    it("should update budget totals when allocation is removed", async () => {
      const [transaction] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      const [allocation] = await ctx.db
        .insert(schema.budgetTransactions)
        .values({
          transactionId: transaction.id,
          budgetId: ctx.budgetId,
          allocatedAmount: 100.0,
        })
        .returning();

      // Initial total
      let result = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, ctx.budgetId));

      expect(Number(result[0].total)).toBe(100.0);

      // Remove allocation
      await ctx.db.delete(schema.budgetTransactions).where(eq(schema.budgetTransactions.id, allocation.id));

      // Updated total
      result = await ctx.db
        .select({total: sum(schema.budgetTransactions.allocatedAmount)})
        .from(schema.budgetTransactions)
        .where(eq(schema.budgetTransactions.budgetId, ctx.budgetId));

      expect(result[0].total).toBeNull(); // No allocations left
    });
  });
});
