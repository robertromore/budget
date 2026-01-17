/**
 * Category Corrections (Smart Categories) - Integration Tests
 *
 * Tests category correction tracking for machine learning including
 * correction recording, pattern analysis, and learning state management.
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
  category1Id: number;
  category2Id: number;
  transactionId: number;
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

  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Walmart",
      slug: "walmart",
    })
    .returning();

  const categories = await db
    .insert(schema.categories)
    .values([
      {workspaceId: workspace.id, name: "Groceries", slug: "groceries"},
      {workspaceId: workspace.id, name: "Shopping", slug: "shopping"},
    ])
    .returning();

  const [transaction] = await db
    .insert(schema.transactions)
    .values({
      workspaceId: workspace.id,
      accountId: account.id,
      date: "2024-01-15",
      amount: -75.50,
      payeeId: payee.id,
      categoryId: categories[1].id, // Initially Shopping
      status: "cleared",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    payeeId: payee.id,
    category1Id: categories[0].id, // Groceries
    category2Id: categories[1].id, // Shopping
    transactionId: transaction.id,
  };
}

describe("Category Corrections", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("correction recording", () => {
    it("should record a manual user correction", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: ctx.category2Id, // Shopping
          toCategoryId: ctx.category1Id, // Groceries
          correctionTrigger: "manual_user_correction",
          transactionAmount: -75.50,
          transactionDate: "2024-01-15",
        })
        .returning();

      expect(correction.fromCategoryId).toBe(ctx.category2Id);
      expect(correction.toCategoryId).toBe(ctx.category1Id);
      expect(correction.correctionTrigger).toBe("manual_user_correction");
    });

    it("should record an import correction", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: null, // AI suggested nothing
          toCategoryId: ctx.category1Id,
          correctionTrigger: "import_category_override",
          transactionAmount: -75.50,
        })
        .returning();

      expect(correction.correctionTrigger).toBe("import_category_override");
      expect(correction.fromCategoryId).toBeNull();
    });

    it("should record AI suggestion acceptance", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: null,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "ai_suggestion_accepted",
          systemConfidence: 0.85,
        })
        .returning();

      expect(correction.correctionTrigger).toBe("ai_suggestion_accepted");
      expect(correction.systemConfidence).toBe(0.85);
    });

    it("should record import dismissal (negative feedback)", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: null, // User cleared the category
          correctionTrigger: "import_dismissal",
        })
        .returning();

      expect(correction.correctionTrigger).toBe("import_dismissal");
      expect(correction.toCategoryId).toBeNull();
    });
  });

  describe("correction context", () => {
    it("should record correction with context", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          correctionContext: "transaction_amount_medium",
          transactionAmount: -75.50,
          transactionDate: "2024-01-15",
        })
        .returning();

      expect(correction.correctionContext).toBe("transaction_amount_medium");
    });

    it("should record correction with user confidence", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          userConfidence: 9, // Very confident
        })
        .returning();

      expect(correction.userConfidence).toBe(9);
    });

    it("should record temporal context", async () => {
      const temporalContext = {
        month: 1,
        dayOfWeek: 3,
        isWeekend: false,
        season: "winter",
      };

      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          temporalContext,
        })
        .returning();

      expect(correction.temporalContext).toEqual(temporalContext);
    });

    it("should record amount range pattern", async () => {
      const amountRange = {min: 50, max: 100};

      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          amountRange,
        })
        .returning();

      expect(correction.amountRange).toEqual(amountRange);
    });
  });

  describe("learning state", () => {
    it("should track unprocessed corrections", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        fromCategoryId: ctx.category2Id,
        toCategoryId: ctx.category1Id,
        correctionTrigger: "manual_user_correction",
        isProcessed: false,
      });

      const unprocessed = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          and(
            eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId),
            eq(schema.payeeCategoryCorrections.isProcessed, false)
          )
        );

      expect(unprocessed).toHaveLength(1);
    });

    it("should mark correction as processed", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          isProcessed: false,
        })
        .returning();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.payeeCategoryCorrections)
        .set({
          isProcessed: true,
          processedAt: now,
        })
        .where(eq(schema.payeeCategoryCorrections.id, correction.id));

      const processed = await ctx.db.query.payeeCategoryCorrections.findFirst({
        where: eq(schema.payeeCategoryCorrections.id, correction.id),
      });

      expect(processed?.isProcessed).toBe(true);
      expect(processed?.processedAt).toBe(now);
    });

    it("should track learning epoch", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          learningEpoch: 1,
        })
        .returning();

      expect(correction.learningEpoch).toBe(1);

      // Increment epoch for model update
      await ctx.db
        .update(schema.payeeCategoryCorrections)
        .set({learningEpoch: 2})
        .where(eq(schema.payeeCategoryCorrections.id, correction.id));

      const updated = await ctx.db.query.payeeCategoryCorrections.findFirst({
        where: eq(schema.payeeCategoryCorrections.id, correction.id),
      });

      expect(updated?.learningEpoch).toBe(2);
    });

    it("should set correction weight", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          correctionWeight: 2.0, // Higher weight for important correction
        })
        .returning();

      expect(correction.correctionWeight).toBe(2.0);
    });
  });

  describe("override tracking", () => {
    it("should mark correction as permanent override", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          isOverride: true,
          notes: "Always categorize Walmart purchases as Groceries",
        })
        .returning();

      expect(correction.isOverride).toBe(true);
    });

    it("should query corrections by override status", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          isOverride: true,
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
          isOverride: false,
        },
      ]);

      const overrides = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          and(
            eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId),
            eq(schema.payeeCategoryCorrections.isOverride, true)
          )
        );

      expect(overrides).toHaveLength(1);
    });
  });

  describe("pattern queries", () => {
    it("should find corrections by payee", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: null,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "import_category_override",
        },
      ]);

      const payeeCorrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.payeeId, ctx.payeeId));

      expect(payeeCorrections).toHaveLength(2);
    });

    it("should find corrections by category change", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category1Id,
          toCategoryId: ctx.category2Id,
          correctionTrigger: "manual_user_correction",
        },
      ]);

      // Find corrections that changed TO Groceries
      const toGroceries = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.toCategoryId, ctx.category1Id));

      expect(toGroceries).toHaveLength(1);
    });

    it("should find corrections by trigger type", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "import_category_override",
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "import_category_override",
        },
      ]);

      const importOverrides = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          eq(schema.payeeCategoryCorrections.correctionTrigger, "import_category_override")
        );

      expect(importOverrides).toHaveLength(2);
    });
  });

  describe("deletion and soft delete", () => {
    it("should soft delete correction", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.category2Id,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
        })
        .returning();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.payeeCategoryCorrections)
        .set({deletedAt: now})
        .where(eq(schema.payeeCategoryCorrections.id, correction.id));

      const deleted = await ctx.db.query.payeeCategoryCorrections.findFirst({
        where: eq(schema.payeeCategoryCorrections.id, correction.id),
      });

      expect(deleted?.deletedAt).toBe(now);
    });

    it("should hard delete correction", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
        })
        .returning();

      await ctx.db
        .delete(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.id, correction.id));

      const deleted = await ctx.db.query.payeeCategoryCorrections.findFirst({
        where: eq(schema.payeeCategoryCorrections.id, correction.id),
      });

      expect(deleted).toBeUndefined();
    });
  });

  describe("workspace isolation", () => {
    it("should isolate corrections by workspace", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Workspace 2",
          slug: "workspace-2",
        })
        .returning();

      const [payee2] = await ctx.db
        .insert(schema.payees)
        .values({
          workspaceId: workspace2.id,
          name: "Walmart 2",
          slug: "walmart-2",
        })
        .returning();

      const [category] = await ctx.db
        .insert(schema.categories)
        .values({workspaceId: workspace2.id, name: "Other", slug: "other"})
        .returning();

      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.category1Id,
          correctionTrigger: "manual_user_correction",
        },
        {
          workspaceId: workspace2.id,
          payeeId: payee2.id,
          toCategoryId: category.id,
          correctionTrigger: "manual_user_correction",
        },
      ]);

      const ws1Corrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId));

      const ws2Corrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.workspaceId, workspace2.id));

      expect(ws1Corrections).toHaveLength(1);
      expect(ws2Corrections).toHaveLength(1);
    });
  });
});
