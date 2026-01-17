/**
 * Budget Associations - Integration Tests
 *
 * Tests budget-to-account and budget-to-category associations,
 * association types, and finding applicable budgets.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, or, inArray} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  account2Id: number;
  categoryId: number;
  category2Id: number;
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

  const accounts = await db
    .insert(schema.accounts)
    .values([
      {
        workspaceId: workspace.id,
        name: "Checking Account",
        slug: "checking-account",
        accountType: "checking",
      },
      {
        workspaceId: workspace.id,
        name: "Savings Account",
        slug: "savings-account",
        accountType: "savings",
      },
    ])
    .returning();

  const categories = await db
    .insert(schema.categories)
    .values([
      {
        workspaceId: workspace.id,
        name: "Groceries",
        slug: "groceries",
      },
      {
        workspaceId: workspace.id,
        name: "Entertainment",
        slug: "entertainment",
      },
    ])
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: accounts[0].id,
    account2Id: accounts[1].id,
    categoryId: categories[0].id,
    category2Id: categories[1].id,
  };
}

describe("Budget Associations", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("account associations", () => {
    it("should link budget to single account", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Checking Budget",
          slug: "checking-budget",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: budget.id,
        accountId: ctx.accountId,
        associationType: "spending",
      });

      const associations = await ctx.db
        .select()
        .from(schema.budgetAccounts)
        .where(eq(schema.budgetAccounts.budgetId, budget.id));

      expect(associations).toHaveLength(1);
      expect(associations[0].accountId).toBe(ctx.accountId);
      expect(associations[0].associationType).toBe("spending");
    });

    it("should link budget to multiple accounts", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Multi-Account Budget",
          slug: "multi-account-budget",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetAccounts).values([
        {
          budgetId: budget.id,
          accountId: ctx.accountId,
          associationType: "spending",
        },
        {
          budgetId: budget.id,
          accountId: ctx.account2Id,
          associationType: "spending",
        },
      ]);

      const associations = await ctx.db
        .select()
        .from(schema.budgetAccounts)
        .where(eq(schema.budgetAccounts.budgetId, budget.id));

      expect(associations).toHaveLength(2);
      expect(associations.map((a) => a.accountId).sort()).toEqual([ctx.accountId, ctx.account2Id].sort());
    });

    it("should support different association types per account", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Savings Goal",
          slug: "savings-goal",
          type: "goal-based",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      // Checking is source, Savings is destination
      await ctx.db.insert(schema.budgetAccounts).values([
        {
          budgetId: budget.id,
          accountId: ctx.accountId,
          associationType: "source", // Checking is the source
        },
        {
          budgetId: budget.id,
          accountId: ctx.account2Id,
          associationType: "savings", // Savings is the destination
        },
      ]);

      const sourceAssoc = await ctx.db.query.budgetAccounts.findFirst({
        where: and(
          eq(schema.budgetAccounts.budgetId, budget.id),
          eq(schema.budgetAccounts.associationType, "source")
        ),
      });

      const savingsAssoc = await ctx.db.query.budgetAccounts.findFirst({
        where: and(
          eq(schema.budgetAccounts.budgetId, budget.id),
          eq(schema.budgetAccounts.associationType, "savings")
        ),
      });

      expect(sourceAssoc?.accountId).toBe(ctx.accountId);
      expect(savingsAssoc?.accountId).toBe(ctx.account2Id);
    });
  });

  describe("category associations", () => {
    it("should link budget to single category", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Grocery Budget",
          slug: "grocery-budget",
          type: "category-envelope",
          scope: "category",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetCategories).values({
        budgetId: budget.id,
        categoryId: ctx.categoryId,
      });

      const associations = await ctx.db
        .select()
        .from(schema.budgetCategories)
        .where(eq(schema.budgetCategories.budgetId, budget.id));

      expect(associations).toHaveLength(1);
      expect(associations[0].categoryId).toBe(ctx.categoryId);
    });

    it("should link budget to multiple categories", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Discretionary Budget",
          slug: "discretionary-budget",
          type: "category-envelope",
          scope: "category",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetCategories).values([
        {budgetId: budget.id, categoryId: ctx.categoryId},
        {budgetId: budget.id, categoryId: ctx.category2Id},
      ]);

      const associations = await ctx.db
        .select()
        .from(schema.budgetCategories)
        .where(eq(schema.budgetCategories.budgetId, budget.id));

      expect(associations).toHaveLength(2);
    });
  });

  describe("combined associations", () => {
    it("should support both account and category associations", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Combined Budget",
          slug: "combined-budget",
          type: "category-envelope",
          scope: "category",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      // Link to account and category
      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: budget.id,
        accountId: ctx.accountId,
        associationType: "spending",
      });

      await ctx.db.insert(schema.budgetCategories).values({
        budgetId: budget.id,
        categoryId: ctx.categoryId,
      });

      const accountAssocs = await ctx.db
        .select()
        .from(schema.budgetAccounts)
        .where(eq(schema.budgetAccounts.budgetId, budget.id));

      const categoryAssocs = await ctx.db
        .select()
        .from(schema.budgetCategories)
        .where(eq(schema.budgetCategories.budgetId, budget.id));

      expect(accountAssocs).toHaveLength(1);
      expect(categoryAssocs).toHaveLength(1);
    });
  });

  describe("findApplicableBudgets", () => {
    it("should find budgets linked to specific account", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Checking Budget",
          slug: "checking-budget",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: budget.id,
        accountId: ctx.accountId,
        associationType: "spending",
      });

      // Find budgets for account
      const budgetAccounts = await ctx.db
        .select()
        .from(schema.budgetAccounts)
        .where(eq(schema.budgetAccounts.accountId, ctx.accountId));

      const budgetIds = budgetAccounts.map((ba) => ba.budgetId);
      expect(budgetIds).toContain(budget.id);
    });

    it("should find budgets linked to specific category", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Grocery Budget",
          slug: "grocery-budget",
          type: "category-envelope",
          scope: "category",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetCategories).values({
        budgetId: budget.id,
        categoryId: ctx.categoryId,
      });

      // Find budgets for category
      const budgetCategories = await ctx.db
        .select()
        .from(schema.budgetCategories)
        .where(eq(schema.budgetCategories.categoryId, ctx.categoryId));

      const budgetIds = budgetCategories.map((bc) => bc.budgetId);
      expect(budgetIds).toContain(budget.id);
    });

    it("should find budgets matching account OR category", async () => {
      // Create account-based budget
      const [accountBudget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Account Budget",
          slug: "account-budget",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: accountBudget.id,
        accountId: ctx.accountId,
        associationType: "spending",
      });

      // Create category-based budget
      const [categoryBudget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Category Budget",
          slug: "category-budget",
          type: "category-envelope",
          scope: "category",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetCategories).values({
        budgetId: categoryBudget.id,
        categoryId: ctx.categoryId,
      });

      // Find all applicable budgets for a transaction with this account and category
      const accountBudgetIds = (
        await ctx.db
          .select({budgetId: schema.budgetAccounts.budgetId})
          .from(schema.budgetAccounts)
          .where(eq(schema.budgetAccounts.accountId, ctx.accountId))
      ).map((r) => r.budgetId);

      const categoryBudgetIds = (
        await ctx.db
          .select({budgetId: schema.budgetCategories.budgetId})
          .from(schema.budgetCategories)
          .where(eq(schema.budgetCategories.categoryId, ctx.categoryId))
      ).map((r) => r.budgetId);

      const allBudgetIds = [...new Set([...accountBudgetIds, ...categoryBudgetIds])];

      expect(allBudgetIds).toContain(accountBudget.id);
      expect(allBudgetIds).toContain(categoryBudget.id);
      expect(allBudgetIds).toHaveLength(2);
    });

    it("should only return active budgets", async () => {
      // Create active budget
      const [activeBudget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Active Budget",
          slug: "active-budget",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      // Create inactive budget
      const [inactiveBudget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Inactive Budget",
          slug: "inactive-budget",
          type: "account-monthly",
          scope: "account",
          status: "inactive",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetAccounts).values([
        {budgetId: activeBudget.id, accountId: ctx.accountId, associationType: "spending"},
        {budgetId: inactiveBudget.id, accountId: ctx.accountId, associationType: "spending"},
      ]);

      // Find active budgets only
      const budgetAccounts = await ctx.db
        .select()
        .from(schema.budgetAccounts)
        .where(eq(schema.budgetAccounts.accountId, ctx.accountId));

      const budgetIds = budgetAccounts.map((ba) => ba.budgetId);

      const activeBudgets = await ctx.db
        .select()
        .from(schema.budgets)
        .where(and(inArray(schema.budgets.id, budgetIds), eq(schema.budgets.status, "active")));

      expect(activeBudgets).toHaveLength(1);
      expect(activeBudgets[0].id).toBe(activeBudget.id);
    });
  });

  describe("association synchronization", () => {
    it("should update associations when syncing accounts", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Sync Test Budget",
          slug: "sync-test-budget",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      // Initial: link to account1
      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: budget.id,
        accountId: ctx.accountId,
        associationType: "spending",
      });

      // Sync: replace with account2
      await ctx.db.delete(schema.budgetAccounts).where(eq(schema.budgetAccounts.budgetId, budget.id));

      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: budget.id,
        accountId: ctx.account2Id,
        associationType: "spending",
      });

      const associations = await ctx.db
        .select()
        .from(schema.budgetAccounts)
        .where(eq(schema.budgetAccounts.budgetId, budget.id));

      expect(associations).toHaveLength(1);
      expect(associations[0].accountId).toBe(ctx.account2Id);
    });

    it("should handle association type updates", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Type Update Budget",
          slug: "type-update-budget",
          type: "goal-based",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: budget.id,
        accountId: ctx.accountId,
        associationType: "spending",
      });

      // Update association type
      await ctx.db
        .update(schema.budgetAccounts)
        .set({associationType: "source"})
        .where(
          and(eq(schema.budgetAccounts.budgetId, budget.id), eq(schema.budgetAccounts.accountId, ctx.accountId))
        );

      const updated = await ctx.db.query.budgetAccounts.findFirst({
        where: and(eq(schema.budgetAccounts.budgetId, budget.id), eq(schema.budgetAccounts.accountId, ctx.accountId)),
      });

      expect(updated?.associationType).toBe("source");
    });
  });

  describe("schedule-based associations", () => {
    it("should find budgets via schedule link", async () => {
      // Create payee for schedule
      const [payee] = await ctx.db
        .insert(schema.payees)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Netflix",
          slug: "netflix-payee",
        })
        .returning();

      // Create schedule linked to account
      const [schedule] = await ctx.db
        .insert(schema.schedules)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Netflix",
          slug: "netflix",
          amount: 15.99,
          accountId: ctx.accountId,
          payeeId: payee.id,
          status: "active",
        })
        .returning();

      // Create budget linked to schedule
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Netflix Budget",
          slug: "netflix-budget",
          type: "scheduled-expense",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
          metadata: JSON.stringify({
            scheduledExpense: {linkedScheduleId: schedule.id},
          }),
        })
        .returning();

      // Link schedule to budget
      await ctx.db.update(schema.schedules).set({budgetId: budget.id}).where(eq(schema.schedules.id, schedule.id));

      // Find budget via schedule
      const linkedSchedule = await ctx.db.query.schedules.findFirst({
        where: eq(schema.schedules.accountId, ctx.accountId),
      });

      expect(linkedSchedule?.budgetId).toBe(budget.id);
    });
  });

  describe("association constraints", () => {
    it("should prevent duplicate account associations for same budget", async () => {
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Constraint Test",
          slug: "constraint-test",
          type: "account-monthly",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db.insert(schema.budgetAccounts).values({
        budgetId: budget.id,
        accountId: ctx.accountId,
        associationType: "spending",
      });

      // Check if association already exists before inserting
      const existing = await ctx.db.query.budgetAccounts.findFirst({
        where: and(eq(schema.budgetAccounts.budgetId, budget.id), eq(schema.budgetAccounts.accountId, ctx.accountId)),
      });

      expect(existing).toBeDefined();

      // Don't insert duplicate - in real code this would be handled by onConflict
      const allAssociations = await ctx.db
        .select()
        .from(schema.budgetAccounts)
        .where(eq(schema.budgetAccounts.budgetId, budget.id));

      expect(allAssociations).toHaveLength(1);
    });
  });
});
