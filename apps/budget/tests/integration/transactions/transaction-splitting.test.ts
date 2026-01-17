/**
 * Transaction Splitting - Integration Tests
 *
 * Tests for split transactions where a parent transaction
 * is divided into multiple child transactions.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, isNull, sql} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  groceriesId: number;
  householdId: number;
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

  const [groceries] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Groceries",
      slug: "groceries",
    })
    .returning();

  const [household] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Household",
      slug: "household",
    })
    .returning();

  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Walmart",
      slug: "walmart",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    groceriesId: groceries.id,
    householdId: household.id,
    payeeId: payee.id,
  };
}

describe("Transaction Splitting", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("basic split", () => {
    it("should create parent and child transactions", async () => {
      // Create parent transaction (full amount)
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          payeeId: ctx.payeeId,
          amount: -100.0,
          date: "2024-01-15",
          status: "cleared",
        })
        .returning();

      // Create child transactions
      const [child1] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          payeeId: ctx.payeeId,
          categoryId: ctx.groceriesId,
          amount: -75.0,
          date: "2024-01-15",
          status: "cleared",
        })
        .returning();

      const [child2] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          payeeId: ctx.payeeId,
          categoryId: ctx.householdId,
          amount: -25.0,
          date: "2024-01-15",
          status: "cleared",
        })
        .returning();

      // Verify parent
      expect(parent.amount).toBe(-100.0);
      expect(parent.parentId).toBeNull();

      // Verify children
      expect(child1.parentId).toBe(parent.id);
      expect(child1.amount).toBe(-75.0);
      expect(child1.categoryId).toBe(ctx.groceriesId);

      expect(child2.parentId).toBe(parent.id);
      expect(child2.amount).toBe(-25.0);
      expect(child2.categoryId).toBe(ctx.householdId);
    });

    it("should sum child amounts to parent amount", async () => {
      const parentAmount = -150.0;

      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: parentAmount,
          date: "2024-01-15",
        })
        .returning();

      // Create three child transactions
      await ctx.db.insert(schema.transactions).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          amount: -50.0,
          date: "2024-01-15",
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          amount: -60.0,
          date: "2024-01-15",
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          amount: -40.0,
          date: "2024-01-15",
        },
      ]);

      // Sum child amounts
      const children = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.parentId, parent.id));

      const childSum = children.reduce((sum, c) => sum + c.amount, 0);
      expect(childSum).toBe(parentAmount);
    });
  });

  describe("fetching splits", () => {
    it("should fetch all children for a parent", async () => {
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      // Create 3 children
      await ctx.db.insert(schema.transactions).values([
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, parentId: parent.id, amount: -40.0, date: "2024-01-15"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, parentId: parent.id, amount: -35.0, date: "2024-01-15"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, parentId: parent.id, amount: -25.0, date: "2024-01-15"},
      ]);

      const children = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.parentId, parent.id));

      expect(children).toHaveLength(3);
    });

    it("should identify transactions without parents (top-level)", async () => {
      // Create parent with children
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        parentId: parent.id,
        amount: -100.0,
        date: "2024-01-15",
      });

      // Create standalone transaction
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -50.0,
        date: "2024-01-16",
      });

      // Fetch only top-level transactions
      const topLevel = await ctx.db
        .select()
        .from(schema.transactions)
        .where(isNull(schema.transactions.parentId));

      expect(topLevel).toHaveLength(2); // parent and standalone
    });
  });

  describe("split validation", () => {
    it("should detect when children don't sum to parent", () => {
      const parentAmount = -100.0;
      const childAmounts = [-60.0, -30.0]; // Sum to -90, not -100

      const childSum = childAmounts.reduce((sum, a) => sum + a, 0);
      const difference = Math.abs(parentAmount - childSum);

      expect(difference).toBeGreaterThan(0);
      expect(difference).toBe(10.0);
    });

    it("should validate split amounts within tolerance", () => {
      const parentAmount = -100.0;
      const childAmounts = [-33.33, -33.33, -33.34]; // Sum to -100.00

      const childSum = childAmounts.reduce((sum, a) => sum + a, 0);
      const tolerance = 0.01;

      const isValid = Math.abs(parentAmount - childSum) <= tolerance;
      expect(isValid).toBe(true);
    });

    it("should not allow negative split remainder", () => {
      const parentAmount = -100.0;
      const childAmounts = [-60.0, -50.0]; // Sum to -110, exceeds parent

      const childSum = childAmounts.reduce((sum, a) => sum + a, 0);
      const remainder = parentAmount - childSum;

      // Remainder would be positive (overspent)
      expect(remainder).toBe(10.0);
      expect(remainder).toBeGreaterThan(0); // Invalid: children exceed parent
    });
  });

  describe("split editing", () => {
    it("should update child amount", async () => {
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      const [child] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          amount: -50.0,
          date: "2024-01-15",
        })
        .returning();

      // Update child amount
      await ctx.db
        .update(schema.transactions)
        .set({amount: -60.0})
        .where(eq(schema.transactions.id, child.id));

      const updated = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, child.id),
      });

      expect(updated?.amount).toBe(-60.0);
    });

    it("should update child category", async () => {
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      const [child] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          categoryId: ctx.groceriesId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      // Change category
      await ctx.db
        .update(schema.transactions)
        .set({categoryId: ctx.householdId})
        .where(eq(schema.transactions.id, child.id));

      const updated = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, child.id),
      });

      expect(updated?.categoryId).toBe(ctx.householdId);
    });
  });

  describe("split deletion", () => {
    it("should delete children then parent in correct order", async () => {
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.transactions).values([
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, parentId: parent.id, amount: -60.0, date: "2024-01-15"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, parentId: parent.id, amount: -40.0, date: "2024-01-15"},
      ]);

      // Delete children first, then parent (proper cascade order)
      await ctx.db.delete(schema.transactions).where(eq(schema.transactions.parentId, parent.id));
      await ctx.db.delete(schema.transactions).where(eq(schema.transactions.id, parent.id));

      // All should be deleted
      const remaining = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      expect(remaining).toHaveLength(0);
    });

    it("should allow deleting individual child", async () => {
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      const children = await ctx.db
        .insert(schema.transactions)
        .values([
          {workspaceId: ctx.workspaceId, accountId: ctx.accountId, parentId: parent.id, amount: -60.0, date: "2024-01-15"},
          {workspaceId: ctx.workspaceId, accountId: ctx.accountId, parentId: parent.id, amount: -40.0, date: "2024-01-15"},
        ])
        .returning();

      // Delete one child
      await ctx.db.delete(schema.transactions).where(eq(schema.transactions.id, children[0].id));

      // Parent and one child remain
      const remaining = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      expect(remaining).toHaveLength(2);
    });
  });

  describe("unsplit transaction", () => {
    it("should remove all children and restore parent", async () => {
      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          payeeId: ctx.payeeId,
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      await ctx.db.insert(schema.transactions).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          categoryId: ctx.groceriesId,
          amount: -60.0,
          date: "2024-01-15",
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          parentId: parent.id,
          categoryId: ctx.householdId,
          amount: -40.0,
          date: "2024-01-15",
        },
      ]);

      // "Unsplit": Delete all children
      await ctx.db.delete(schema.transactions).where(eq(schema.transactions.parentId, parent.id));

      // Verify only parent remains
      const remaining = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(parent.id);
      expect(remaining[0].amount).toBe(-100.0);
    });
  });

  describe("split with different payees", () => {
    it("should allow different payees per split child", async () => {
      const [payee2] = await ctx.db
        .insert(schema.payees)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Amazon",
          slug: "amazon",
        })
        .returning();

      const [parent] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          payeeId: ctx.payeeId, // Walmart
          amount: -100.0,
          date: "2024-01-15",
        })
        .returning();

      // Children with different payees
      const children = await ctx.db
        .insert(schema.transactions)
        .values([
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            parentId: parent.id,
            payeeId: ctx.payeeId, // Walmart
            amount: -60.0,
            date: "2024-01-15",
          },
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.accountId,
            parentId: parent.id,
            payeeId: payee2.id, // Amazon
            amount: -40.0,
            date: "2024-01-15",
          },
        ])
        .returning();

      expect(children[0].payeeId).toBe(ctx.payeeId);
      expect(children[1].payeeId).toBe(payee2.id);
    });
  });

  describe("balance calculation with splits", () => {
    it("should calculate balance using parent amount only", () => {
      // When calculating running balance, only count parent transactions
      // Children are for category allocation, not balance
      const transactions = [
        {id: 1, parentId: null, amount: -100.0}, // Parent - counts
        {id: 2, parentId: 1, amount: -60.0}, // Child - ignored for balance
        {id: 3, parentId: 1, amount: -40.0}, // Child - ignored for balance
        {id: 4, parentId: null, amount: 50.0}, // Regular transaction - counts
      ];

      const balanceTransactions = transactions.filter((t) => t.parentId === null);
      const balance = balanceTransactions.reduce((sum, t) => sum + t.amount, 0);

      expect(balance).toBe(-50.0); // -100 + 50, not -100 - 60 - 40 + 50
    });
  });
});
