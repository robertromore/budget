import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { payees, users, workspaceMembers, workspaces } from "$lib/schema";
import { createCaller } from "../../src/lib/trpc/router";
import { clearTestDb, setupTestDb } from "./setup/test-db";

describe("Payee Intelligence Routes Caller Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let workspaceId: number;
  let payeeCounter = 0;

  function buildPayee(name: string) {
    payeeCounter += 1;
    const baseSlug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "payee";

    return {
      workspaceId,
      slug: `${baseSlug}-${payeeCounter}`,
      name,
    };
  }

  async function createPayee(name: string) {
    const [payee] = await db.insert(payees).values(buildPayee(name)).returning();
    return payee;
  }

  beforeEach(async () => {
    db = await setupTestDb();
    payeeCounter = 0;

    const testUserId = "intelligence-routes-user";

    await db.insert(users).values({
      id: testUserId,
      name: "Intelligence Routes User",
      displayName: "Intelligence Routes User",
      email: "intelligence-routes@example.com",
    });

    const [workspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Intelligence Routes Workspace",
        slug: "intelligence-routes-workspace",
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

    caller = createCaller({
      db: db as any,
      userId: testUserId,
      sessionId: "intelligence-routes-session",
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

  test("getIntelligenceProfile returns null when no profile exists", async () => {
    const payee = await createPayee("Profile Empty Payee");

    const profile = await caller.payeeRoutes.getIntelligenceProfile({ id: payee.id });

    expect(profile).toBeNull();
  });

  test("updateIntelligenceProfile persists filters and resetIntelligenceProfile clears them", async () => {
    const payee = await createPayee("Profile Update Payee");

    await caller.payeeRoutes.updateIntelligenceProfile({
      id: payee.id,
      profile: {
        enabled: true,
        filters: {
          amountSign: "negative",
          dateRange: {
            type: "last_n_months",
            months: 6,
          },
          predictionMethod: "statistical",
          minAmount: 5,
          maxAmount: 500,
          excludeTransfers: true,
        },
      },
    });

    const updatedProfile = await caller.payeeRoutes.getIntelligenceProfile({ id: payee.id });

    expect(updatedProfile).not.toBeNull();
    expect(updatedProfile?.enabled).toBe(true);
    expect(updatedProfile?.filters.amountSign).toBe("negative");
    expect(updatedProfile?.filters.dateRange?.type).toBe("last_n_months");
    expect(updatedProfile?.filters.dateRange?.months).toBe(6);
    expect(updatedProfile?.filters.predictionMethod).toBe("statistical");
    expect(updatedProfile?.lastUpdated).toBeTruthy();

    await caller.payeeRoutes.resetIntelligenceProfile({ id: payee.id });

    const resetProfile = await caller.payeeRoutes.getIntelligenceProfile({ id: payee.id });

    expect(resetProfile).not.toBeNull();
    expect(resetProfile?.enabled).toBe(false);
    expect(resetProfile?.filters).toEqual({});
    expect(resetProfile?.lastUpdated).toBeTruthy();
  });

  test("recordPredictionFeedback writes data and history query filters by prediction type", async () => {
    const payee = await createPayee("Feedback History Payee");

    await caller.payeeRoutes.recordPredictionFeedback({
      payeeId: payee.id,
      predictionType: "next_transaction",
      originalDate: "2026-01-01",
      correctedDate: "2026-01-02",
      originalAmount: 100,
      correctedAmount: 110,
      predictionTier: "statistical",
      rating: "positive",
    });

    await caller.payeeRoutes.recordPredictionFeedback({
      payeeId: payee.id,
      predictionType: "budget_suggestion",
      originalAmount: 250,
      predictionTier: "ml",
      rating: "negative",
    });

    const nextTransactionHistory = await caller.payeeRoutes.getPredictionFeedbackHistory({
      payeeId: payee.id,
      predictionType: "next_transaction",
      limit: 10,
    });

    expect(nextTransactionHistory).toHaveLength(1);
    expect(nextTransactionHistory[0]?.predictionType).toBe("next_transaction");
    expect(nextTransactionHistory[0]?.rating).toBe("positive");
  });

  test("getPredictionAccuracyMetrics aggregates counts, corrections, and tier breakdown", async () => {
    const payee = await createPayee("Feedback Metrics Payee");

    await caller.payeeRoutes.recordPredictionFeedback({
      payeeId: payee.id,
      predictionType: "next_transaction",
      originalDate: "2026-01-01",
      correctedDate: "2026-01-02",
      originalAmount: 100,
      correctedAmount: 110,
      predictionTier: "statistical",
      rating: "positive",
    });

    await caller.payeeRoutes.recordPredictionFeedback({
      payeeId: payee.id,
      predictionType: "next_transaction",
      predictionTier: "statistical",
      rating: "negative",
    });

    await caller.payeeRoutes.recordPredictionFeedback({
      payeeId: payee.id,
      predictionType: "budget_suggestion",
      predictionTier: "ai",
      rating: "neutral",
    });

    const metrics = await caller.payeeRoutes.getPredictionAccuracyMetrics({
      payeeId: payee.id,
    });

    expect(metrics.totalFeedback).toBe(3);
    expect(metrics.positiveRatings).toBe(1);
    expect(metrics.negativeRatings).toBe(1);
    expect(metrics.corrections).toBe(1);
    expect(metrics.accuracyRate).toBeCloseTo(0.5, 6);
    expect(metrics.avgDateDeviation).toBeCloseTo(1, 6);
    expect(metrics.avgAmountDeviation).toBeCloseTo(10, 6);
    expect(metrics.feedbackByTier.statistical).toEqual({ count: 2, positiveRate: 0.5 });
    expect(metrics.feedbackByTier.ai).toEqual({ count: 1, positiveRate: 0 });
  });

  test("getPredictionAccuracyMetrics returns empty baseline when no feedback exists", async () => {
    const metrics = await caller.payeeRoutes.getPredictionAccuracyMetrics({});

    expect(metrics.totalFeedback).toBe(0);
    expect(metrics.positiveRatings).toBe(0);
    expect(metrics.negativeRatings).toBe(0);
    expect(metrics.corrections).toBe(0);
    expect(metrics.accuracyRate).toBe(0);
    expect(metrics.avgDateDeviation).toBeNull();
    expect(metrics.avgAmountDeviation).toBeNull();
    expect(metrics.feedbackByTier).toEqual({});
  });
});
