import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import {
  accounts,
  anomalyAlerts,
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
      event: {} as any,
      isTest: true,
    });

    callerWorkspaceB = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "ml-security-session-b",
      workspaceId: workspaceBId,
      event: {} as any,
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
});
