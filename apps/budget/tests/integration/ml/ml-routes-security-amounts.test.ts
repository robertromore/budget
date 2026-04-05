import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import {
  accounts,
  anomalyAlerts,
  budgetCategories,
  budgetPeriodInstances,
  budgetPeriodTemplates,
  budgets,
  categories,
  payees,
  transactions,
  users,
  workspaceMembers,
  workspaces,
} from "$lib/schema";
import { createCaller } from "../../../src/lib/trpc/router";
import { clearTestDb, setupTestDb } from "../setup/test-db";

describe("ML routes security and amount integrity", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let callerWorkspaceA: ReturnType<typeof createCaller>;
  let callerWorkspaceB: ReturnType<typeof createCaller>;
  let workspaceAId: number;
  let workspaceBId: number;
  let accountAId: number;
  let accountBId: number;

  beforeEach(async () => {
    db = await setupTestDb();

    const testUserId = `ml-security-user-${Date.now()}`;
    await db.insert(users).values({
      id: testUserId,
      name: "ML Security User",
      displayName: "ML Security User",
      email: `${testUserId}@example.com`,
    });

    const [workspaceA, workspaceB] = await db
      .insert(workspaces)
      .values([
        {
          displayName: "ML Workspace A",
          slug: `ml-workspace-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ownerId: testUserId,
        },
        {
          displayName: "ML Workspace B",
          slug: `ml-workspace-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ownerId: testUserId,
        },
      ])
      .returning();

    workspaceAId = workspaceA.id;
    workspaceBId = workspaceB.id;

    await db.insert(workspaceMembers).values([
      {
        workspaceId: workspaceAId,
        userId: testUserId,
        role: "owner",
        isDefault: true,
      },
      {
        workspaceId: workspaceBId,
        userId: testUserId,
        role: "owner",
        isDefault: false,
      },
    ]);

    const [accountA, accountB] = await db
      .insert(accounts)
      .values([
        {
          workspaceId: workspaceAId,
          name: "Primary Checking A",
          slug: `checking-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          accountType: "checking",
        },
        {
          workspaceId: workspaceBId,
          name: "Primary Checking B",
          slug: `checking-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          accountType: "checking",
        },
      ])
      .returning();

    accountAId = accountA.id;
    accountBId = accountB.id;

    callerWorkspaceA = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "ml-security-session-a",
      workspaceId: workspaceAId,
      request: { headers: new Headers(), getCookie: () => undefined, setCookie: () => {} } as any,
      isTest: true,
    });

    callerWorkspaceB = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "ml-security-session-b",
      workspaceId: workspaceBId,
      request: { headers: new Headers(), getCookie: () => undefined, setCookie: () => {} } as any,
      isTest: true,
    });
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  test("forecasting alert status updates are scoped to the caller workspace", async () => {
    const [workspaceBAlert] = await db
      .insert(anomalyAlerts)
      .values({
        workspaceId: workspaceBId,
        transactionId: 999999,
        overallScore: 0.91,
        riskLevel: "high",
        scoreDetails: {
          dimensions: {
            amount: 0.9,
            timing: 0.8,
          },
          detectors: [],
        },
        explanation: "Potential anomaly",
        recommendedActions: ["Review transaction"],
      })
      .returning();

    await expect(
      callerWorkspaceA.forecastingRoutes.updateAlertStatus({
        alertId: workspaceBAlert.id,
        status: "reviewed",
        notes: "should not update cross-workspace",
      })
    ).rejects.toThrow(`Alert with ID ${workspaceBAlert.id} not found`);

    const [unchangedAlert] = await db
      .select()
      .from(anomalyAlerts)
      .where(eq(anomalyAlerts.id, workspaceBAlert.id))
      .limit(1);

    expect(unchangedAlert?.status).toBe("new");
    expect(unchangedAlert?.notes).toBeNull();
    expect(unchangedAlert?.reviewedAt).toBeNull();

    const updateResult = await callerWorkspaceB.forecastingRoutes.updateAlertStatus({
      alertId: workspaceBAlert.id,
      status: "reviewed",
      notes: "reviewed by workspace owner",
    });

    expect(updateResult.success).toBe(true);

    const [updatedAlert] = await db
      .select()
      .from(anomalyAlerts)
      .where(eq(anomalyAlerts.id, workspaceBAlert.id))
      .limit(1);

    expect(updatedAlert?.status).toBe("reviewed");
    expect(updatedAlert?.notes).toBe("reviewed by workspace owner");
    expect(updatedAlert?.reviewedAt).toBeTruthy();
  });

  test("incomeExpense routes reject accountId values outside the active workspace", async () => {
    await expect(
      callerWorkspaceA.incomeExpenseRoutes.breakdown({
        months: 12,
        forecastHorizon: 3,
        accountId: accountBId,
      })
    ).rejects.toThrow(`Account with ID ${accountBId} not found`);
  });

  test("incomeExpense routes treat soft-deleted accounts as inaccessible", async () => {
    const [archivedAccount] = await db
      .insert(accounts)
      .values({
        workspaceId: workspaceAId,
        name: "Archived Checking",
        slug: `archived-checking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        accountType: "checking",
      })
      .returning();

    await db
      .update(accounts)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(accounts.id, archivedAccount.id));

    await expect(
      callerWorkspaceA.incomeExpenseRoutes.breakdown({
        months: 12,
        forecastHorizon: 3,
        accountId: archivedAccount.id,
      })
    ).rejects.toThrow(`Account with ID ${archivedAccount.id} not found`);
  });

  test("incomeExpense history keeps dollar amounts without cent scaling", async () => {
    const [incomePayee] = await db
      .insert(payees)
      .values({
        workspaceId: workspaceAId,
        name: "Employer Payroll",
        slug: `employer-payroll-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      })
      .returning();

    const today = new Date().toISOString().split("T")[0];
    await db.insert(transactions).values([
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        payeeId: incomePayee.id,
        amount: 1200.5,
        date: today,
        status: "cleared",
      },
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        payeeId: incomePayee.id,
        amount: -300.25,
        date: today,
        status: "cleared",
      },
    ]);

    const result = await callerWorkspaceA.incomeExpenseRoutes.history({
      months: 12,
      accountId: accountAId,
    });

    const period = today.slice(0, 7);
    const thisMonth = result.history.find((entry) => entry.period === period);

    expect(thisMonth).toBeDefined();
    expect(thisMonth?.income).toBeCloseTo(1200.5, 2);
    expect(thisMonth?.expenses).toBeCloseTo(300.25, 2);
    expect(thisMonth?.netSavings).toBeCloseTo(900.25, 2);
  });

  test("nlSearch returns stored decimal amounts without cent conversion", async () => {
    const [vendor] = await db
      .insert(payees)
      .values({
        workspaceId: workspaceAId,
        name: "Scale Test Vendor",
        slug: `scale-test-vendor-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      })
      .returning();

    const [txn] = await db
      .insert(transactions)
      .values({
        workspaceId: workspaceAId,
        accountId: accountAId,
        payeeId: vendor.id,
        amount: -123.45,
        notes: "scale test vendor",
        date: new Date().toISOString().split("T")[0],
        status: "cleared",
      })
      .returning();

    const result = await callerWorkspaceA.nlSearchRoutes.search({
      query: "at Scale Test Vendor",
      limit: 10,
    });

    const matched = result.transactions.find((t) => t.id === txn.id);
    expect(matched).toBeDefined();
    expect(matched?.amount).toBeCloseTo(-123.45, 2);
  });

  test("incomeExpense history excludes scheduled, soft-deleted, and deleted-account transactions", async () => {
    const [vendor] = await db
      .insert(payees)
      .values({
        workspaceId: workspaceAId,
        name: "Filter Coverage Vendor",
        slug: `filter-coverage-vendor-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      })
      .returning();

    const [deletedAccount] = await db
      .insert(accounts)
      .values({
        workspaceId: workspaceAId,
        name: "Deleted Account",
        slug: `deleted-account-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        accountType: "checking",
      })
      .returning();

    await db
      .update(accounts)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(accounts.id, deletedAccount.id));

    const today = new Date().toISOString().split("T")[0];
    await db.insert(transactions).values([
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        payeeId: vendor.id,
        amount: 1000,
        date: today,
        status: "cleared",
      },
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        payeeId: vendor.id,
        amount: -200,
        date: today,
        status: "cleared",
      },
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        payeeId: vendor.id,
        amount: -500,
        date: today,
        status: "scheduled",
      },
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        payeeId: vendor.id,
        amount: -50,
        date: today,
        status: "cleared",
        deletedAt: new Date().toISOString(),
      },
      {
        workspaceId: workspaceAId,
        accountId: deletedAccount.id,
        payeeId: vendor.id,
        amount: -300,
        date: today,
        status: "cleared",
      },
    ]);

    const result = await callerWorkspaceA.incomeExpenseRoutes.history({
      months: 12,
    });

    const period = today.slice(0, 7);
    const thisMonth = result.history.find((entry) => entry.period === period);
    expect(thisMonth).toBeDefined();
    expect(thisMonth?.income).toBeCloseTo(1000, 2);
    expect(thisMonth?.expenses).toBeCloseTo(200, 2);
    expect(thisMonth?.netSavings).toBeCloseTo(800, 2);
  });

  test("nlSearch excludes scheduled, soft-deleted, and deleted-account transactions", async () => {
    const [vendor] = await db
      .insert(payees)
      .values({
        workspaceId: workspaceAId,
        name: "NL Filter Vendor",
        slug: `nl-filter-vendor-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      })
      .returning();

    const [deletedAccount] = await db
      .insert(accounts)
      .values({
        workspaceId: workspaceAId,
        name: "Deleted NL Account",
        slug: `deleted-nl-account-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        accountType: "checking",
      })
      .returning();

    await db
      .update(accounts)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(accounts.id, deletedAccount.id));

    const today = new Date().toISOString().split("T")[0];
    const [visibleTxn] = await db
      .insert(transactions)
      .values([
        {
          workspaceId: workspaceAId,
          accountId: accountAId,
          payeeId: vendor.id,
          amount: -101,
          notes: "nl filter vendor",
          date: today,
          status: "cleared",
        },
        {
          workspaceId: workspaceAId,
          accountId: accountAId,
          payeeId: vendor.id,
          amount: -202,
          notes: "nl filter vendor",
          date: today,
          status: "scheduled",
        },
        {
          workspaceId: workspaceAId,
          accountId: accountAId,
          payeeId: vendor.id,
          amount: -303,
          notes: "nl filter vendor",
          date: today,
          status: "cleared",
          deletedAt: new Date().toISOString(),
        },
        {
          workspaceId: workspaceAId,
          accountId: deletedAccount.id,
          payeeId: vendor.id,
          amount: -404,
          notes: "nl filter vendor",
          date: today,
          status: "cleared",
        },
      ])
      .returning();

    const result = await callerWorkspaceA.nlSearchRoutes.search({
      query: "at NL Filter Vendor",
      limit: 20,
    });

    const matchedIds = result.transactions.map((txn) => txn.id);
    expect(matchedIds).toContain(visibleTxn.id);
    expect(matchedIds).toHaveLength(1);
  });

  test("nlSearch category suggestions exclude soft-deleted categories", async () => {
    const [visibleCategory, hiddenCategory] = await db
      .insert(categories)
      .values([
        {
          workspaceId: workspaceAId,
          name: "Visible Suggestion Category",
          slug: `visible-suggest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
        {
          workspaceId: workspaceAId,
          name: "Hidden Suggestion Category",
          slug: `hidden-suggest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      ])
      .returning();

    await db
      .update(categories)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(categories.id, hiddenCategory.id));

    const suggestions = await callerWorkspaceA.nlSearchRoutes.suggestions({
      partialQuery: "for ",
    });
    const categorySuggestions = suggestions.find((entry) => entry.type === "category");

    expect(categorySuggestions).toBeDefined();
    expect(categorySuggestions?.suggestions).toContain(visibleCategory.name);
    expect(categorySuggestions?.suggestions).not.toContain(hiddenCategory.name);
  });

  test("budget prediction excludes scheduled, soft-deleted, deleted-account, and deleted-category rows", async () => {
    const [activeCategory, deletedCategory] = await db
      .insert(categories)
      .values([
        {
          workspaceId: workspaceAId,
          name: "Prediction Active Category",
          slug: `prediction-active-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
        {
          workspaceId: workspaceAId,
          name: "Prediction Deleted Category",
          slug: `prediction-deleted-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      ])
      .returning();

    await db
      .update(categories)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(categories.id, deletedCategory.id));

    const [budget] = await db
      .insert(budgets)
      .values({
        workspaceId: workspaceAId,
        name: "Prediction Guardrail Budget",
        slug: `prediction-guardrail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: "category-envelope",
        scope: "category",
        status: "active",
      })
      .returning();

    const [template] = await db
      .insert(budgetPeriodTemplates)
      .values({
        budgetId: budget.id,
        type: "monthly",
        startDayOfMonth: 1,
      })
      .returning();

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const todayIso = today.toISOString().split("T")[0];

    await db.insert(budgetPeriodInstances).values({
      templateId: template.id,
      startDate: startOfMonth.toISOString().split("T")[0],
      endDate: endOfMonth.toISOString().split("T")[0],
      allocatedAmount: 1000,
      actualAmount: 0,
    });

    await db.insert(budgetCategories).values([
      { budgetId: budget.id, categoryId: activeCategory.id },
      { budgetId: budget.id, categoryId: deletedCategory.id },
    ]);

    const [deletedAccount] = await db
      .insert(accounts)
      .values({
        workspaceId: workspaceAId,
        name: "Deleted Budget Account",
        slug: `deleted-budget-account-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        accountType: "checking",
      })
      .returning();

    await db
      .update(accounts)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(accounts.id, deletedAccount.id));

    await db.insert(transactions).values([
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        categoryId: activeCategory.id,
        amount: -100,
        date: todayIso,
        status: "cleared",
      },
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        categoryId: activeCategory.id,
        amount: -200,
        date: todayIso,
        status: "scheduled",
      },
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        categoryId: activeCategory.id,
        amount: -300,
        date: todayIso,
        status: "cleared",
        deletedAt: new Date().toISOString(),
      },
      {
        workspaceId: workspaceAId,
        accountId: deletedAccount.id,
        categoryId: activeCategory.id,
        amount: -400,
        date: todayIso,
        status: "cleared",
      },
      {
        workspaceId: workspaceAId,
        accountId: accountAId,
        categoryId: deletedCategory.id,
        amount: -500,
        date: todayIso,
        status: "cleared",
      },
    ]);

    const predictionResult = await callerWorkspaceA.budgetPredictionRoutes.predict({
      budgetId: budget.id,
    });
    expect(predictionResult.prediction.currentSpending).toBeCloseTo(100, 2);

    const breakdownResult = await callerWorkspaceA.budgetPredictionRoutes.categoryBreakdown({
      budgetId: budget.id,
    });
    expect(breakdownResult.total).toBe(1);
    expect(breakdownResult.categories[0]?.categoryId).toBe(activeCategory.id);
    expect(breakdownResult.categories[0]?.spent).toBeCloseTo(100, 2);
  });
});
