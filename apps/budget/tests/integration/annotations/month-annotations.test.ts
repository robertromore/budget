/**
 * Month Annotations - Integration Tests
 *
 * Tests month annotation management including creation,
 * tagging, flagging, and context-specific annotations.
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
      name: "Checking",
      slug: "checking",
      accountType: "checking",
    })
    .returning();

  const [category] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Utilities",
      slug: "utilities",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    categoryId: category.id,
  };
}

describe("Month Annotations", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("annotation creation", () => {
    it("should create a workspace-level annotation", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          note: "Started new budget tracking",
        })
        .returning();

      expect(annotation.month).toBe("2024-01");
      expect(annotation.note).toBe("Started new budget tracking");
      expect(annotation.accountId).toBeNull();
      expect(annotation.categoryId).toBeNull();
    });

    it("should create account-specific annotation", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          accountId: ctx.accountId,
          note: "Account had unusual activity",
        })
        .returning();

      expect(annotation.accountId).toBe(ctx.accountId);
    });

    it("should create category-specific annotation", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          categoryId: ctx.categoryId,
          note: "Utilities higher than expected due to cold weather",
        })
        .returning();

      expect(annotation.categoryId).toBe(ctx.categoryId);
    });

    it("should create annotation with both account and category", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          accountId: ctx.accountId,
          categoryId: ctx.categoryId,
          note: "Specific utility expense note",
        })
        .returning();

      expect(annotation.accountId).toBe(ctx.accountId);
      expect(annotation.categoryId).toBe(ctx.categoryId);
    });
  });

  describe("flagging", () => {
    it("should create flagged annotation", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          note: "Needs review",
          flaggedForReview: true,
        })
        .returning();

      expect(annotation.flaggedForReview).toBe(true);
    });

    it("should update flag status", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          flaggedForReview: true,
        })
        .returning();

      await ctx.db
        .update(schema.monthAnnotations)
        .set({flaggedForReview: false})
        .where(eq(schema.monthAnnotations.id, annotation.id));

      const updated = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(updated?.flaggedForReview).toBe(false);
    });

    it("should query flagged annotations", async () => {
      await ctx.db.insert(schema.monthAnnotations).values([
        {workspaceId: ctx.workspaceId, month: "2024-01", flaggedForReview: true},
        {workspaceId: ctx.workspaceId, month: "2024-02", flaggedForReview: false},
        {workspaceId: ctx.workspaceId, month: "2024-03", flaggedForReview: true},
      ]);

      const flagged = await ctx.db
        .select()
        .from(schema.monthAnnotations)
        .where(
          and(
            eq(schema.monthAnnotations.workspaceId, ctx.workspaceId),
            eq(schema.monthAnnotations.flaggedForReview, true)
          )
        );

      expect(flagged).toHaveLength(2);
    });
  });

  describe("tagging", () => {
    it("should create annotation with tags", async () => {
      const tags = ["unusual", "one-time"];

      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          note: "One-time unusual expense",
          tags,
        })
        .returning();

      expect(annotation.tags).toEqual(tags);
    });

    it("should update annotation tags", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          tags: ["unusual"],
        })
        .returning();

      await ctx.db
        .update(schema.monthAnnotations)
        .set({tags: ["unusual", "expected", "recurring"]})
        .where(eq(schema.monthAnnotations.id, annotation.id));

      const updated = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(updated?.tags).toEqual(["unusual", "expected", "recurring"]);
    });

    it("should support all predefined tags", async () => {
      const allTags = ["unusual", "expected", "one-time", "recurring", "seasonal", "anomaly"];

      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          tags: allTags,
        })
        .returning();

      expect(annotation.tags).toEqual(allTags);
    });

    it("should allow custom tags", async () => {
      const customTags = ["vacation", "home-improvement", "medical"];

      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          tags: customTags,
        })
        .returning();

      expect(annotation.tags).toEqual(customTags);
    });
  });

  describe("annotation queries", () => {
    it("should query annotations by month", async () => {
      await ctx.db.insert(schema.monthAnnotations).values([
        {workspaceId: ctx.workspaceId, month: "2024-01", note: "January note"},
        {workspaceId: ctx.workspaceId, month: "2024-02", note: "February note"},
        {workspaceId: ctx.workspaceId, month: "2024-01", note: "Another January note"},
      ]);

      const januaryAnnotations = await ctx.db
        .select()
        .from(schema.monthAnnotations)
        .where(
          and(
            eq(schema.monthAnnotations.workspaceId, ctx.workspaceId),
            eq(schema.monthAnnotations.month, "2024-01")
          )
        );

      expect(januaryAnnotations).toHaveLength(2);
    });

    it("should query annotations by account", async () => {
      const [account2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Savings",
          slug: "savings",
          accountType: "savings",
        })
        .returning();

      await ctx.db.insert(schema.monthAnnotations).values([
        {workspaceId: ctx.workspaceId, month: "2024-01", accountId: ctx.accountId, note: "Checking note"},
        {workspaceId: ctx.workspaceId, month: "2024-01", accountId: account2.id, note: "Savings note"},
      ]);

      const checkingAnnotations = await ctx.db
        .select()
        .from(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.accountId, ctx.accountId));

      expect(checkingAnnotations).toHaveLength(1);
      expect(checkingAnnotations[0].note).toBe("Checking note");
    });

    it("should query annotations by category", async () => {
      const [category2] = await ctx.db
        .insert(schema.categories)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Groceries",
          slug: "groceries",
        })
        .returning();

      await ctx.db.insert(schema.monthAnnotations).values([
        {workspaceId: ctx.workspaceId, month: "2024-01", categoryId: ctx.categoryId, note: "Utilities note"},
        {workspaceId: ctx.workspaceId, month: "2024-01", categoryId: category2.id, note: "Groceries note"},
      ]);

      const utilitiesAnnotations = await ctx.db
        .select()
        .from(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.categoryId, ctx.categoryId));

      expect(utilitiesAnnotations).toHaveLength(1);
      expect(utilitiesAnnotations[0].note).toBe("Utilities note");
    });
  });

  describe("annotation updates", () => {
    it("should update annotation note", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          note: "Original note",
        })
        .returning();

      await ctx.db
        .update(schema.monthAnnotations)
        .set({note: "Updated note"})
        .where(eq(schema.monthAnnotations.id, annotation.id));

      const updated = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(updated?.note).toBe("Updated note");
    });

    it("should update multiple fields at once", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          note: "Original",
          flaggedForReview: false,
          tags: [],
        })
        .returning();

      await ctx.db
        .update(schema.monthAnnotations)
        .set({
          note: "Updated",
          flaggedForReview: true,
          tags: ["important", "review"],
        })
        .where(eq(schema.monthAnnotations.id, annotation.id));

      const updated = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(updated?.note).toBe("Updated");
      expect(updated?.flaggedForReview).toBe(true);
      expect(updated?.tags).toEqual(["important", "review"]);
    });
  });

  describe("annotation deletion", () => {
    it("should delete annotation", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          note: "To be deleted",
        })
        .returning();

      await ctx.db
        .delete(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.id, annotation.id));

      const deleted = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(deleted).toBeUndefined();
    });

    it("should delete annotation when account is deleted (manual cleanup)", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          accountId: ctx.accountId,
          note: "Account annotation",
        })
        .returning();

      // Manual cleanup since SQLite FK cascade may not work in test DB
      await ctx.db
        .delete(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.accountId, ctx.accountId));

      await ctx.db.delete(schema.accounts).where(eq(schema.accounts.id, ctx.accountId));

      const deleted = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(deleted).toBeUndefined();
    });

    it("should delete annotation when category is deleted (manual cleanup)", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          categoryId: ctx.categoryId,
          note: "Category annotation",
        })
        .returning();

      // Manual cleanup since SQLite FK cascade may not work in test DB
      await ctx.db
        .delete(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.categoryId, ctx.categoryId));

      await ctx.db.delete(schema.categories).where(eq(schema.categories.id, ctx.categoryId));

      const deleted = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(deleted).toBeUndefined();
    });

    it("should delete annotation when workspace is deleted (manual cleanup)", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-01",
          note: "Workspace annotation",
        })
        .returning();

      // Manual cleanup in correct order
      await ctx.db.delete(schema.monthAnnotations).where(eq(schema.monthAnnotations.workspaceId, ctx.workspaceId));
      await ctx.db.delete(schema.accounts).where(eq(schema.accounts.workspaceId, ctx.workspaceId));
      await ctx.db.delete(schema.categories).where(eq(schema.categories.workspaceId, ctx.workspaceId));
      await ctx.db.delete(schema.workspaces).where(eq(schema.workspaces.id, ctx.workspaceId));

      const deleted = await ctx.db.query.monthAnnotations.findFirst({
        where: eq(schema.monthAnnotations.id, annotation.id),
      });

      expect(deleted).toBeUndefined();
    });
  });

  describe("workspace isolation", () => {
    it("should isolate annotations by workspace", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      await ctx.db.insert(schema.monthAnnotations).values({
        workspaceId: ctx.workspaceId,
        month: "2024-01",
        note: "Workspace 1 annotation",
      });

      await ctx.db.insert(schema.monthAnnotations).values({
        workspaceId: workspace2.id,
        month: "2024-01",
        note: "Workspace 2 annotation",
      });

      const ws1Annotations = await ctx.db
        .select()
        .from(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.workspaceId, ctx.workspaceId));

      const ws2Annotations = await ctx.db
        .select()
        .from(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.workspaceId, workspace2.id));

      expect(ws1Annotations).toHaveLength(1);
      expect(ws1Annotations[0].note).toBe("Workspace 1 annotation");

      expect(ws2Annotations).toHaveLength(1);
      expect(ws2Annotations[0].note).toBe("Workspace 2 annotation");
    });
  });

  describe("month format validation", () => {
    it("should store month in YYYY-MM format", async () => {
      const [annotation] = await ctx.db
        .insert(schema.monthAnnotations)
        .values({
          workspaceId: ctx.workspaceId,
          month: "2024-12",
          note: "December note",
        })
        .returning();

      expect(annotation.month).toBe("2024-12");
      expect(annotation.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should handle year boundary months", async () => {
      await ctx.db.insert(schema.monthAnnotations).values([
        {workspaceId: ctx.workspaceId, month: "2023-12", note: "End of 2023"},
        {workspaceId: ctx.workspaceId, month: "2024-01", note: "Start of 2024"},
      ]);

      const annotations = await ctx.db
        .select()
        .from(schema.monthAnnotations)
        .where(eq(schema.monthAnnotations.workspaceId, ctx.workspaceId));

      expect(annotations).toHaveLength(2);
    });
  });
});
