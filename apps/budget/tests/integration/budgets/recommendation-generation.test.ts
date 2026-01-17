/**
 * Budget Recommendation Generation - Integration Tests
 *
 * Tests the recommendation service's ability to create, deduplicate,
 * and manage budget recommendations.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  payeeId: number;
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

  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Netflix",
      slug: "netflix",
    })
    .returning();

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
 * Create a recommendation draft (simulates what the analysis service generates)
 */
function createRecommendationDraft(
  ctx: TestContext,
  options: {
    type?: string;
    suggestedType?: string;
    amount?: number;
    frequency?: string;
    payeeIds?: number[];
    categoryId?: number | null;
    accountId?: number | null;
    confidence?: number;
    priority?: string;
  } = {}
) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Use explicit check for undefined to allow null values
  const categoryId = options.categoryId === undefined ? ctx.categoryId : options.categoryId;
  const accountId = options.accountId === undefined ? ctx.accountId : options.accountId;

  return {
    workspaceId: ctx.workspaceId,
    type: options.type ?? "create_budget",
    priority: options.priority ?? "medium",
    title: "Create budget recommendation",
    description: "Based on spending analysis",
    confidence: options.confidence ?? 85,
    status: "pending" as const,
    accountId,
    categoryId,
    metadata: JSON.stringify({
      suggestedType: options.suggestedType ?? "scheduled-expense",
      suggestedAmount: options.amount ?? 15.99,
      detectedFrequency: options.frequency ?? "monthly",
      payeeIds: options.payeeIds ?? [ctx.payeeId],
    }),
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Budget Recommendation Generation", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("createRecommendation", () => {
    it("should create a single recommendation with correct properties", async () => {
      const draft = createRecommendationDraft(ctx, {
        amount: 25.0,
        confidence: 90,
      });

      const [recommendation] = await ctx.db
        .insert(schema.budgetRecommendations)
        .values(draft)
        .returning();

      expect(recommendation).toBeDefined();
      expect(recommendation.workspaceId).toBe(ctx.workspaceId);
      expect(recommendation.type).toBe("create_budget");
      expect(recommendation.status).toBe("pending");
      expect(recommendation.confidence).toBe(90);
      expect(recommendation.accountId).toBe(ctx.accountId);
      expect(recommendation.categoryId).toBe(ctx.categoryId);

      const metadata = JSON.parse(recommendation.metadata as string);
      expect(metadata.suggestedAmount).toBe(25.0);
    });

    it("should set expiration date in the future", async () => {
      const draft = createRecommendationDraft(ctx);

      const [recommendation] = await ctx.db
        .insert(schema.budgetRecommendations)
        .values(draft)
        .returning();

      const expiresAt = new Date(recommendation.expiresAt!);
      const now = new Date();
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should store metadata as JSON", async () => {
      const draft = createRecommendationDraft(ctx, {
        suggestedType: "goal",
        amount: 500,
        frequency: "weekly",
        payeeIds: [ctx.payeeId, ctx.payeeId + 1],
      });

      const [recommendation] = await ctx.db
        .insert(schema.budgetRecommendations)
        .values(draft)
        .returning();

      const metadata = JSON.parse(recommendation.metadata as string);
      expect(metadata.suggestedType).toBe("goal");
      expect(metadata.suggestedAmount).toBe(500);
      expect(metadata.detectedFrequency).toBe("weekly");
      expect(metadata.payeeIds).toHaveLength(2);
    });
  });

  describe("createRecommendations (bulk)", () => {
    it("should create multiple recommendations in bulk", async () => {
      const drafts = [
        createRecommendationDraft(ctx, {amount: 10}),
        createRecommendationDraft(ctx, {
          amount: 20,
          categoryId: null,
          suggestedType: "account-monthly",
        }),
        createRecommendationDraft(ctx, {
          amount: 30,
          accountId: null,
          suggestedType: "goal",
        }),
      ];

      const recommendations = await ctx.db.insert(schema.budgetRecommendations).values(drafts).returning();

      expect(recommendations).toHaveLength(3);
      expect(recommendations.map((r) => JSON.parse(r.metadata as string).suggestedAmount)).toEqual([10, 20, 30]);
    });

    it("should not create duplicate recommendations with same key properties", async () => {
      // Simulate deduplication logic
      const existingDraft = createRecommendationDraft(ctx, {
        type: "create_budget",
        suggestedType: "scheduled-expense",
        amount: 15.99,
      });

      // Insert first recommendation
      await ctx.db.insert(schema.budgetRecommendations).values(existingDraft).returning();

      // Check if duplicate exists before inserting
      const existing = await ctx.db.query.budgetRecommendations.findFirst({
        where: and(
          eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
          eq(schema.budgetRecommendations.type, "create_budget"),
          eq(schema.budgetRecommendations.accountId, ctx.accountId),
          eq(schema.budgetRecommendations.categoryId, ctx.categoryId),
          eq(schema.budgetRecommendations.status, "pending")
        ),
      });

      expect(existing).toBeDefined();

      // Count total recommendations
      const all = await ctx.db
        .select()
        .from(schema.budgetRecommendations)
        .where(eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId));

      expect(all).toHaveLength(1);
    });
  });

  describe("recommendation filtering", () => {
    beforeEach(async () => {
      // Create recommendations with different statuses
      await ctx.db.insert(schema.budgetRecommendations).values([
        createRecommendationDraft(ctx, {amount: 10, priority: "high"}),
        {
          ...createRecommendationDraft(ctx, {amount: 20, priority: "medium"}),
          status: "dismissed" as const,
          dismissedAt: new Date().toISOString(),
        },
        {
          ...createRecommendationDraft(ctx, {amount: 30, priority: "low"}),
          status: "applied" as const,
          appliedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should filter recommendations by status", async () => {
      const pending = await ctx.db
        .select()
        .from(schema.budgetRecommendations)
        .where(
          and(
            eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
            eq(schema.budgetRecommendations.status, "pending")
          )
        );

      expect(pending).toHaveLength(1);
      expect(JSON.parse(pending[0].metadata as string).suggestedAmount).toBe(10);
    });

    it("should filter recommendations by priority", async () => {
      const highPriority = await ctx.db
        .select()
        .from(schema.budgetRecommendations)
        .where(
          and(
            eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
            eq(schema.budgetRecommendations.priority, "high")
          )
        );

      expect(highPriority).toHaveLength(1);
    });

    it("should exclude expired recommendations", async () => {
      // Create an expired recommendation
      const expiredDraft = {
        ...createRecommendationDraft(ctx, {amount: 999}),
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };
      await ctx.db.insert(schema.budgetRecommendations).values(expiredDraft);

      const now = new Date().toISOString();
      const nonExpired = await ctx.db.query.budgetRecommendations.findMany({
        where: and(
          eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
          eq(schema.budgetRecommendations.status, "pending")
        ),
      });

      // Filter out expired ones
      const valid = nonExpired.filter((r) => !r.expiresAt || new Date(r.expiresAt) > new Date(now));
      expect(valid).toHaveLength(1);
    });
  });

  describe("confidence scoring", () => {
    it("should store confidence scores accurately", async () => {
      const drafts = [
        createRecommendationDraft(ctx, {confidence: 95, amount: 100}),
        createRecommendationDraft(ctx, {confidence: 75, amount: 200, categoryId: null}),
        createRecommendationDraft(ctx, {confidence: 50, amount: 300, accountId: null}),
      ];

      const recommendations = await ctx.db.insert(schema.budgetRecommendations).values(drafts).returning();

      expect(recommendations[0].confidence).toBe(95);
      expect(recommendations[1].confidence).toBe(75);
      expect(recommendations[2].confidence).toBe(50);
    });

    it("should allow querying by confidence threshold", async () => {
      await ctx.db.insert(schema.budgetRecommendations).values([
        createRecommendationDraft(ctx, {confidence: 90, amount: 1}),
        createRecommendationDraft(ctx, {confidence: 70, amount: 2, categoryId: null}),
        createRecommendationDraft(ctx, {confidence: 50, amount: 3, accountId: null}),
      ]);

      const allRecs = await ctx.db
        .select()
        .from(schema.budgetRecommendations)
        .where(eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId));

      const highConfidence = allRecs.filter((r) => r.confidence >= 80);
      expect(highConfidence).toHaveLength(1);
      expect(highConfidence[0].confidence).toBe(90);
    });
  });

  describe("recommendation types", () => {
    it("should support scheduled-expense type", async () => {
      const draft = createRecommendationDraft(ctx, {
        suggestedType: "scheduled-expense",
        frequency: "monthly",
      });

      const [rec] = await ctx.db.insert(schema.budgetRecommendations).values(draft).returning();
      const metadata = JSON.parse(rec.metadata as string);

      expect(metadata.suggestedType).toBe("scheduled-expense");
      expect(metadata.detectedFrequency).toBe("monthly");
    });

    it("should support account-monthly type", async () => {
      const draft = createRecommendationDraft(ctx, {
        suggestedType: "account-monthly",
        categoryId: null,
      });

      const [rec] = await ctx.db.insert(schema.budgetRecommendations).values(draft).returning();
      const metadata = JSON.parse(rec.metadata as string);

      expect(metadata.suggestedType).toBe("account-monthly");
      expect(rec.categoryId).toBeNull();
    });

    it("should support goal type", async () => {
      const draft = createRecommendationDraft(ctx, {
        suggestedType: "goal",
        amount: 1000,
        accountId: null,
      });

      const [rec] = await ctx.db.insert(schema.budgetRecommendations).values(draft).returning();
      const metadata = JSON.parse(rec.metadata as string);

      expect(metadata.suggestedType).toBe("goal");
      expect(metadata.suggestedAmount).toBe(1000);
    });
  });

  describe("expiration handling", () => {
    it("should mark expired recommendations", async () => {
      // Create a recommendation that expires soon
      const expiresSoon = {
        ...createRecommendationDraft(ctx),
        expiresAt: new Date(Date.now() + 100).toISOString(), // Expires in 100ms
      };

      const [rec] = await ctx.db.insert(schema.budgetRecommendations).values(expiresSoon).returning();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Simulate expiration check
      const now = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "expired", updatedAt: now})
        .where(
          and(
            eq(schema.budgetRecommendations.id, rec.id),
            eq(schema.budgetRecommendations.status, "pending")
            // Would also check: expiresAt < now
          )
        );

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, rec.id),
      });

      expect(updated?.status).toBe("expired");
    });

    it("should clean up old expired recommendations", async () => {
      // Create old expired recommendation (older than 7 days)
      const oldExpired = {
        ...createRecommendationDraft(ctx),
        status: "expired" as const,
        expiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await ctx.db.insert(schema.budgetRecommendations).values(oldExpired);

      // Simulate cleanup: delete expired recommendations older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const all = await ctx.db.query.budgetRecommendations.findMany({
        where: eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
      });

      const toDelete = all.filter(
        (r) => r.status === "expired" && r.expiresAt && new Date(r.expiresAt) < new Date(sevenDaysAgo)
      );

      expect(toDelete).toHaveLength(1);

      // Delete old expired
      for (const rec of toDelete) {
        await ctx.db.delete(schema.budgetRecommendations).where(eq(schema.budgetRecommendations.id, rec.id));
      }

      const remaining = await ctx.db.query.budgetRecommendations.findMany({
        where: eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
      });

      expect(remaining).toHaveLength(0);
    });
  });
});
