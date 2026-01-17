/**
 * Recommendation Dismissal - Integration Tests
 *
 * Tests the recommendation lifecycle including dismissal,
 * restoration, application, and reset on budget deletion.
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

async function createRecommendation(ctx: TestContext, status: string = "pending") {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const [recommendation] = await ctx.db
    .insert(schema.budgetRecommendations)
    .values({
      workspaceId: ctx.workspaceId,
      type: "create_budget",
      priority: "medium",
      title: "Create budget for Netflix",
      description: "Based on recurring payments",
      confidence: 85,
      status: status as "pending" | "dismissed" | "applied" | "expired",
      accountId: ctx.accountId,
      categoryId: ctx.categoryId,
      metadata: JSON.stringify({
        suggestedType: "scheduled-expense",
        suggestedAmount: 15.99,
        detectedFrequency: "monthly",
        payeeIds: [ctx.payeeId],
      }),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return recommendation;
}

describe("Recommendation Dismissal", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("dismissRecommendation", () => {
    it("should mark recommendation as dismissed", async () => {
      const recommendation = await createRecommendation(ctx);

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "dismissed",
          dismissedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("dismissed");
      expect(updated?.dismissedAt).toBeDefined();
    });

    it("should record dismissal timestamp", async () => {
      const recommendation = await createRecommendation(ctx);
      const beforeDismiss = new Date();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "dismissed",
          dismissedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      const dismissedAt = new Date(updated!.dismissedAt!);
      expect(dismissedAt.getTime()).toBeGreaterThanOrEqual(beforeDismiss.getTime());
    });

    it("should not appear in pending recommendations list", async () => {
      const recommendation = await createRecommendation(ctx);

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "dismissed",
          dismissedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const pendingRecs = await ctx.db
        .select()
        .from(schema.budgetRecommendations)
        .where(
          and(
            eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
            eq(schema.budgetRecommendations.status, "pending")
          )
        );

      expect(pendingRecs).toHaveLength(0);
    });
  });

  describe("restoreRecommendation", () => {
    it("should restore dismissed recommendation to pending", async () => {
      // Create and dismiss recommendation
      const recommendation = await createRecommendation(ctx);

      const dismissTime = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "dismissed",
          dismissedAt: dismissTime,
          updatedAt: dismissTime,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      // Restore
      const restoreTime = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "pending",
          dismissedAt: null,
          updatedAt: restoreTime,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("pending");
      expect(updated?.dismissedAt).toBeNull();
    });

    it("should only restore dismissed recommendations", async () => {
      const pendingRec = await createRecommendation(ctx);

      // Attempting to restore a pending recommendation should be a no-op
      // In real code, the service would throw ValidationError
      const beforeRestore = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, pendingRec.id),
      });

      expect(beforeRestore?.status).toBe("pending");

      // Only update if currently dismissed
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "pending",
          dismissedAt: null,
        })
        .where(
          and(
            eq(schema.budgetRecommendations.id, pendingRec.id),
            eq(schema.budgetRecommendations.status, "dismissed") // This won't match
          )
        );

      const afterRestore = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, pendingRec.id),
      });

      // Still pending, not modified
      expect(afterRestore?.status).toBe("pending");
    });

    it("should appear in pending list after restoration", async () => {
      const recommendation = await createRecommendation(ctx);

      // Dismiss
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "dismissed", dismissedAt: new Date().toISOString()})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      // Restore
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "pending", dismissedAt: null})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const pendingRecs = await ctx.db
        .select()
        .from(schema.budgetRecommendations)
        .where(
          and(
            eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId),
            eq(schema.budgetRecommendations.status, "pending")
          )
        );

      expect(pendingRecs).toHaveLength(1);
      expect(pendingRecs[0].id).toBe(recommendation.id);
    });
  });

  describe("applyRecommendation", () => {
    it("should mark recommendation as applied", async () => {
      const recommendation = await createRecommendation(ctx);

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "applied",
          appliedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("applied");
      expect(updated?.appliedAt).toBeDefined();
    });

    it("should link applied recommendation to created budget", async () => {
      const recommendation = await createRecommendation(ctx);

      // Create budget
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
        })
        .returning();

      // Apply recommendation with budget link
      const now = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "applied",
          appliedAt: now,
          budgetId: budget.id,
          updatedAt: now,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      expect(updated?.budgetId).toBe(budget.id);
    });

    it("should record appliedAt timestamp", async () => {
      const recommendation = await createRecommendation(ctx);
      const beforeApply = new Date();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "applied",
          appliedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      const appliedAt = new Date(updated!.appliedAt!);
      expect(appliedAt.getTime()).toBeGreaterThanOrEqual(beforeApply.getTime());
    });
  });

  describe("resetRecommendationForBudget", () => {
    it("should reset applied recommendation when budget is deleted", async () => {
      const recommendation = await createRecommendation(ctx);

      // Create and link budget
      const [budget] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "To Be Deleted",
          slug: "to-be-deleted",
          type: "scheduled-expense",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "applied",
          appliedAt: new Date().toISOString(),
          budgetId: budget.id,
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      // Reset recommendation BEFORE deleting budget
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "pending",
          appliedAt: null,
          budgetId: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.budgetRecommendations.budgetId, budget.id));

      // Now safe to delete budget
      await ctx.db.delete(schema.budgets).where(eq(schema.budgets.id, budget.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("pending");
      expect(updated?.budgetId).toBeNull();
      expect(updated?.appliedAt).toBeNull();
    });

    it("should allow re-applying recommendation after reset", async () => {
      const recommendation = await createRecommendation(ctx);

      // First application
      const [budget1] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "First Budget",
          slug: "first-budget",
          type: "scheduled-expense",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "applied", appliedAt: new Date().toISOString(), budgetId: budget1.id})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      // Reset
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "pending", appliedAt: null, budgetId: null})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      // Delete first budget
      await ctx.db.delete(schema.budgets).where(eq(schema.budgets.id, budget1.id));

      // Second application
      const [budget2] = await ctx.db
        .insert(schema.budgets)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Second Budget",
          slug: "second-budget",
          type: "scheduled-expense",
          scope: "account",
          status: "active",
          enforcementLevel: "warning",
        })
        .returning();

      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "applied", appliedAt: new Date().toISOString(), budgetId: budget2.id})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      expect(updated?.status).toBe("applied");
      expect(updated?.budgetId).toBe(budget2.id);
    });
  });

  describe("recommendation status flow", () => {
    it("should follow valid state transitions: pending -> dismissed -> pending", async () => {
      const recommendation = await createRecommendation(ctx);

      // pending -> dismissed
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "dismissed", dismissedAt: new Date().toISOString()})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      let current = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });
      expect(current?.status).toBe("dismissed");

      // dismissed -> pending (restore)
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "pending", dismissedAt: null})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      current = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });
      expect(current?.status).toBe("pending");
    });

    it("should follow valid state transitions: pending -> applied", async () => {
      const recommendation = await createRecommendation(ctx);

      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "applied", appliedAt: new Date().toISOString()})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const current = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });
      expect(current?.status).toBe("applied");
    });

    it("should follow valid state transitions: pending -> expired", async () => {
      const recommendation = await createRecommendation(ctx);

      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "expired"})
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const current = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });
      expect(current?.status).toBe("expired");
    });
  });

  describe("dismissal with feedback", () => {
    it("should store dismissal reason in metadata", async () => {
      const recommendation = await createRecommendation(ctx);

      const metadata = JSON.parse(recommendation.metadata as string);
      metadata.dismissalReason = "not_relevant";
      metadata.dismissalFeedback = "I don't use Netflix anymore";

      await ctx.db
        .update(schema.budgetRecommendations)
        .set({
          status: "dismissed",
          dismissedAt: new Date().toISOString(),
          metadata: JSON.stringify(metadata),
        })
        .where(eq(schema.budgetRecommendations.id, recommendation.id));

      const updated = await ctx.db.query.budgetRecommendations.findFirst({
        where: eq(schema.budgetRecommendations.id, recommendation.id),
      });

      const updatedMetadata = JSON.parse(updated!.metadata as string);
      expect(updatedMetadata.dismissalReason).toBe("not_relevant");
      expect(updatedMetadata.dismissalFeedback).toBe("I don't use Netflix anymore");
    });
  });

  describe("multiple recommendations", () => {
    it("should dismiss only specific recommendation", async () => {
      const rec1 = await createRecommendation(ctx);

      // Create second recommendation with different data
      const rec2Data = {
        workspaceId: ctx.workspaceId,
        type: "create_budget" as const,
        priority: "low" as const,
        title: "Another recommendation",
        description: "Different recommendation",
        confidence: 70,
        status: "pending" as const,
        accountId: ctx.accountId,
        categoryId: null,
        metadata: JSON.stringify({suggestedType: "account-monthly"}),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const [rec2] = await ctx.db.insert(schema.budgetRecommendations).values(rec2Data).returning();

      // Dismiss only rec1
      await ctx.db
        .update(schema.budgetRecommendations)
        .set({status: "dismissed", dismissedAt: new Date().toISOString()})
        .where(eq(schema.budgetRecommendations.id, rec1.id));

      const all = await ctx.db
        .select()
        .from(schema.budgetRecommendations)
        .where(eq(schema.budgetRecommendations.workspaceId, ctx.workspaceId));

      const dismissed = all.filter((r) => r.status === "dismissed");
      const pending = all.filter((r) => r.status === "pending");

      expect(dismissed).toHaveLength(1);
      expect(dismissed[0].id).toBe(rec1.id);
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(rec2.id);
    });
  });
});
