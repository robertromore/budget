import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { payees, users, workspaceMembers, workspaces } from "$core/schema";
import { createCaller } from "$core/trpc/router";
import { clearTestDb, setupTestDb } from "./setup/test-db";

describe("Payee Routes Caller Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;
  let secondaryWorkspaceId: number;
  let payeeCounter = 0;

  function buildPayee(
    targetWorkspaceId: number,
    values: {
      name: string;
      payeeType?:
        | "merchant"
        | "utility"
        | "employer"
        | "financial_institution"
        | "government"
        | "individual"
        | "other";
      taxRelevant?: boolean;
      isActive?: boolean;
      deletedAt?: string | null;
      lastTransactionDate?: string | null;
    }
  ) {
    payeeCounter += 1;
    const baseSlug =
      values.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "payee";

    return {
      workspaceId: targetWorkspaceId,
      slug: `${baseSlug}-${payeeCounter}`,
      ...values,
    };
  }

  beforeEach(async () => {
    db = await setupTestDb();
    payeeCounter = 0;

    const testUserId = "payee-routes-user";

    await db.insert(users).values({
      id: testUserId,
      name: "Payee Routes User",
      displayName: "Payee Routes User",
      email: "payee-routes@example.com",
    });

    const [primaryWorkspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Payee Routes Workspace",
        slug: "payee-routes-workspace",
        ownerId: testUserId,
      })
      .returning();
    workspaceId = primaryWorkspace.id;

    const [otherWorkspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Payee Routes Secondary Workspace",
        slug: "payee-routes-secondary-workspace",
        ownerId: testUserId,
      })
      .returning();
    secondaryWorkspaceId = otherWorkspace.id;

    await db.insert(workspaceMembers).values([
      {
        workspaceId,
        userId: testUserId,
        role: "owner",
        isDefault: true,
      },
      {
        workspaceId: secondaryWorkspaceId,
        userId: testUserId,
        role: "owner",
        isDefault: false,
      },
    ]);

    caller = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "payee-routes-session",
      workspaceId,
      request: { headers: new Headers(), getCookie: () => undefined, setCookie: () => {} } as any,
      isTest: true,
    });

    await db.delete(payees);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  test("search returns only active matching payees in the caller workspace", async () => {
    await db
      .insert(payees)
      .values([
        buildPayee(workspaceId, { name: "Coffee Shop", isActive: true }),
        buildPayee(workspaceId, { name: "Coffee Roaster", isActive: false }),
        buildPayee(workspaceId, { name: "Coffee Archive", deletedAt: "2026-01-01" }),
        buildPayee(secondaryWorkspaceId, { name: "Coffee External", isActive: true }),
      ]);

    const results = await caller.payeeRoutes.search({ query: "Coffee" });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Coffee Shop");
  });

  test("searchAdvanced filters by type and tax flags", async () => {
    await db.insert(payees).values([
      buildPayee(workspaceId, {
        name: "General Merchant",
        payeeType: "merchant",
        taxRelevant: false,
      }),
      buildPayee(workspaceId, {
        name: "Utility Standard",
        payeeType: "utility",
        taxRelevant: false,
      }),
      buildPayee(workspaceId, {
        name: "Utility Tax Relevant",
        payeeType: "utility",
        taxRelevant: true,
      }),
    ]);

    const results = await caller.payeeRoutes.searchAdvanced({
      payeeType: "utility",
      taxRelevant: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Utility Tax Relevant");
    expect(results[0]?.payeeType).toBe("utility");
    expect(results[0]?.taxRelevant).toBe(true);
  });

  test("byType returns only payees of the requested type", async () => {
    await db
      .insert(payees)
      .values([
        buildPayee(workspaceId, { name: "Employer Payroll", payeeType: "employer" }),
        buildPayee(workspaceId, { name: "Primary Employer", payeeType: "employer" }),
        buildPayee(workspaceId, { name: "Utility Bill", payeeType: "utility" }),
      ]);

    const results = await caller.payeeRoutes.byType({ payeeType: "employer" });

    expect(results).toHaveLength(2);
    expect(results.every((payee) => payee.payeeType === "employer")).toBe(true);
    expect(results.map((payee) => payee.name)).toEqual(
      expect.arrayContaining(["Employer Payroll", "Primary Employer"])
    );
  });

  test("analytics returns workspace-level aggregate counts", async () => {
    await db.insert(payees).values([
      buildPayee(workspaceId, {
        name: "Active Merchant",
        isActive: true,
        lastTransactionDate: "2099-01-01",
      }),
      buildPayee(workspaceId, {
        name: "Inactive Utility",
        isActive: false,
      }),
    ]);

    const analytics = await caller.payeeRoutes.analytics();

    expect(analytics.totalPayees).toBe(2);
    expect(analytics.activePayees).toBe(1);
    expect(analytics.payeesWithDefaults).toBe(0);
    expect(analytics.payeesNeedingAttention).toBe(1);
    expect(analytics.averageTransactionsPerPayee).toBe(0);
    expect(analytics.recentlyActiveCount).toBe(1);
  });

  test("authenticated procedures reject unauthenticated callers", async () => {
    const unauthorizedCaller = createCaller({
      db: db as any,
      userId: null,
      sessionId: null,
      workspaceId,
      request: { headers: new Headers(), getCookie: () => undefined, setCookie: () => {} } as any,
    } as any);

    await expect(unauthorizedCaller.payeeRoutes.search({ query: "Coffee" })).rejects.toThrow(
      "You must be logged in to perform this action"
    );

    await expect(unauthorizedCaller.payeeRoutes.save({ name: "Blocked Write" })).rejects.toThrow(
      "You must be logged in to perform this action"
    );
  });
});
