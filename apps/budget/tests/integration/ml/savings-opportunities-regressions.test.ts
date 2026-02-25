import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  accounts,
  categories,
  payees,
  transactions,
  users,
  workspaceMembers,
  workspaces,
} from "$lib/schema";
import { createCaller } from "../../../src/lib/trpc/router";
import { clearTestDb, setupTestDb } from "../setup/test-db";

function isoDateMonthsAgo(monthsAgo: number, dayOfMonth = 1): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(dayOfMonth);
  date.setMonth(date.getMonth() - monthsAgo);
  return date.toISOString().split("T")[0];
}

describe("Savings opportunities regressions", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;
  let accountId: number;
  let payeeId: number;
  let categoryAId: number;
  let categoryBId: number;

  beforeEach(async () => {
    db = await setupTestDb();

    const testUserId = `savings-regression-user-${Date.now()}`;
    await db.insert(users).values({
      id: testUserId,
      name: "Savings Regression User",
      displayName: "Savings Regression User",
      email: `${testUserId}@example.com`,
    });

    const [workspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Savings Regression Workspace",
        slug: `savings-regression-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ownerId: testUserId,
      })
      .returning();
    workspaceId = workspace.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: testUserId,
      role: "owner",
      isDefault: true,
    });

    const [account] = await db
      .insert(accounts)
      .values({
        workspaceId,
        name: "Checking",
        slug: `checking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        accountType: "checking",
      })
      .returning();
    accountId = account.id;

    const [payee] = await db
      .insert(payees)
      .values({
        workspaceId,
        name: "Spendy Merchant",
        slug: `spendy-merchant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      })
      .returning();
    payeeId = payee.id;

    const [categoryA, categoryB] = await db
      .insert(categories)
      .values([
        {
          workspaceId,
          name: "Category A",
          slug: `category-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
        {
          workspaceId,
          name: "Category B",
          slug: `category-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      ])
      .returning();
    categoryAId = categoryA.id;
    categoryBId = categoryB.id;

    const txRows: Array<{
      workspaceId: number;
      accountId: number;
      payeeId: number;
      categoryId: number;
      amount: number;
      date: string;
      status: "cleared";
    }> = [];

    // Earlier period: 6-8 months ago (outside lookback=6, inside lookback=12)
    for (const monthsAgo of [8, 7, 6]) {
      txRows.push({
        workspaceId,
        accountId,
        payeeId,
        categoryId: categoryAId,
        amount: -100,
        date: isoDateMonthsAgo(monthsAgo),
        status: "cleared",
      });
      txRows.push({
        workspaceId,
        accountId,
        payeeId,
        categoryId: categoryBId,
        amount: -100,
        date: isoDateMonthsAgo(monthsAgo),
        status: "cleared",
      });
    }

    // Recent period: current and previous 2 months
    for (const monthsAgo of [2, 1, 0]) {
      txRows.push({
        workspaceId,
        accountId,
        payeeId,
        categoryId: categoryAId,
        amount: -200,
        date: isoDateMonthsAgo(monthsAgo),
        status: "cleared",
      });
      txRows.push({
        workspaceId,
        accountId,
        payeeId,
        categoryId: categoryBId,
        amount: -200,
        date: isoDateMonthsAgo(monthsAgo),
        status: "cleared",
      });
    }

    await db.insert(transactions).values(txRows);

    caller = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "savings-regression-session",
      workspaceId,
      event: {} as any,
      isTest: true,
    });
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  test("spending increase aggregation sums all category rows per payee", async () => {
    const result = await caller.savingsOpportunityRoutes.spendingIncreases();
    const target = result.opportunities.find((opportunity) => opportunity.payeeId === payeeId);

    expect(target).toBeDefined();
    expect(target?.evidence.previousMonthlyAvg).toBeCloseTo(66.67, 1);
    expect(target?.evidence.currentMonthlyAvg).toBeCloseTo(400, 1);
    expect(target?.estimatedMonthlySavings).toBeCloseTo(166.67, 1);
  });

  test("getAll lookbackMonths option changes spending increase detection window", async () => {
    const fullLookback = await caller.savingsOpportunityRoutes.getAll({
      lookbackMonths: 12,
      minAmount: 5,
    });
    expect(fullLookback.byType.spending_increase).toBeGreaterThan(0);

    const shortLookback = await caller.savingsOpportunityRoutes.getAll({
      lookbackMonths: 6,
      minAmount: 5,
    });
    expect(shortLookback.byType.spending_increase).toBe(0);
  });

  test("getAll rejects lookback periods that do not leave an earlier comparison window", async () => {
    await expect(
      caller.savingsOpportunityRoutes.getAll({
        lookbackMonths: 3,
        minAmount: 5,
      })
    ).rejects.toThrow();
  });
});
