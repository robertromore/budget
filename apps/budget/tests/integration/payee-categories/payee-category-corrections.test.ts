/**
 * Payee Category Corrections - Integration Tests
 *
 * Tests the ML learning system for tracking user corrections to payee categorization.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, isNull} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  payeeId: number;
  categoryId1: number;
  categoryId2: number;
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
      name: "Test Checking",
      slug: "test-checking",
      accountType: "checking",
    })
    .returning();

  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Test Store",
      slug: "test-store",
    })
    .returning();

  const [category1] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Groceries",
      slug: "groceries",
    })
    .returning();

  const [category2] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Entertainment",
      slug: "entertainment",
    })
    .returning();

  const [transaction] = await db
    .insert(schema.transactions)
    .values({
      accountId: account.id,
      amount: -50.0,
      date: "2024-01-15",
      payeeId: payee.id,
      categoryId: category1.id,
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    payeeId: payee.id,
    categoryId1: category1.id,
    categoryId2: category2.id,
    transactionId: transaction.id,
  };
}

describe("Payee Category Corrections", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("create correction", () => {
    it("should create a correction with correct properties", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          transactionId: ctx.transactionId,
          fromCategoryId: ctx.categoryId1,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          transactionAmount: -50.0,
          transactionDate: "2024-01-15",
          userConfidence: 8,
          systemConfidence: 0.6,
          correctionWeight: 1.0,
        })
        .returning();

      expect(correction).toBeDefined();
      expect(correction.workspaceId).toBe(ctx.workspaceId);
      expect(correction.payeeId).toBe(ctx.payeeId);
      expect(correction.transactionId).toBe(ctx.transactionId);
      expect(correction.fromCategoryId).toBe(ctx.categoryId1);
      expect(correction.toCategoryId).toBe(ctx.categoryId2);
      expect(correction.correctionTrigger).toBe("manual_user_correction");
      expect(correction.userConfidence).toBe(8);
      expect(correction.systemConfidence).toBe(0.6);
      expect(correction.isProcessed).toBe(false);
      expect(correction.learningEpoch).toBe(1);
    });

    it("should support all correction triggers", async () => {
      const triggers = [
        "manual_user_correction",
        "transaction_creation",
        "bulk_categorization",
        "import_correction",
        "scheduled_transaction",
        "import_category_override",
        "ai_suggestion_accepted",
        "import_dismissal",
      ] as const;

      for (const trigger of triggers) {
        const [correction] = await ctx.db
          .insert(schema.payeeCategoryCorrections)
          .values({
            workspaceId: ctx.workspaceId,
            payeeId: ctx.payeeId,
            toCategoryId: ctx.categoryId2,
            correctionTrigger: trigger,
          })
          .returning();

        expect(correction.correctionTrigger).toBe(trigger);
      }
    });

    it("should support all correction contexts", async () => {
      const contexts = [
        "transaction_amount_low",
        "transaction_amount_medium",
        "transaction_amount_high",
        "seasonal_period",
        "weekend_transaction",
        "weekday_transaction",
        "first_time_payee",
        "recurring_payee",
      ] as const;

      for (const context of contexts) {
        const [correction] = await ctx.db
          .insert(schema.payeeCategoryCorrections)
          .values({
            workspaceId: ctx.workspaceId,
            payeeId: ctx.payeeId,
            toCategoryId: ctx.categoryId2,
            correctionTrigger: "manual_user_correction",
            correctionContext: context,
          })
          .returning();

        expect(correction.correctionContext).toBe(context);
      }
    });

    it("should allow null toCategoryId for dismissals", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.categoryId1,
          toCategoryId: null,
          correctionTrigger: "import_dismissal",
        })
        .returning();

      expect(correction.toCategoryId).toBeNull();
      expect(correction.fromCategoryId).toBe(ctx.categoryId1);
    });
  });

  describe("find corrections", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.categoryId1,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          isProcessed: false,
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: null,
          toCategoryId: ctx.categoryId1,
          correctionTrigger: "import_category_override",
          isProcessed: true,
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          fromCategoryId: ctx.categoryId2,
          toCategoryId: ctx.categoryId1,
          correctionTrigger: "ai_suggestion_accepted",
          isProcessed: false,
        },
      ]);
    });

    it("should find corrections by payee", async () => {
      const corrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          and(
            eq(schema.payeeCategoryCorrections.payeeId, ctx.payeeId),
            isNull(schema.payeeCategoryCorrections.deletedAt)
          )
        );

      expect(corrections).toHaveLength(3);
    });

    it("should find unprocessed corrections", async () => {
      const unprocessed = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          and(
            eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId),
            eq(schema.payeeCategoryCorrections.isProcessed, false)
          )
        );

      expect(unprocessed).toHaveLength(2);
    });

    it("should find corrections by trigger type", async () => {
      const manualCorrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          and(
            eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId),
            eq(schema.payeeCategoryCorrections.correctionTrigger, "manual_user_correction")
          )
        );

      expect(manualCorrections).toHaveLength(1);
    });

    it("should find corrections by category change", async () => {
      const corrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          and(
            eq(schema.payeeCategoryCorrections.fromCategoryId, ctx.categoryId1),
            eq(schema.payeeCategoryCorrections.toCategoryId, ctx.categoryId2)
          )
        );

      expect(corrections).toHaveLength(1);
    });
  });

  describe("update correction", () => {
    it("should mark correction as processed", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          isProcessed: false,
        })
        .returning();

      const processedAt = new Date().toISOString();

      const [updated] = await ctx.db
        .update(schema.payeeCategoryCorrections)
        .set({
          isProcessed: true,
          processedAt,
          learningEpoch: 2,
        })
        .where(eq(schema.payeeCategoryCorrections.id, correction.id))
        .returning();

      expect(updated.isProcessed).toBe(true);
      expect(updated.processedAt).toBe(processedAt);
      expect(updated.learningEpoch).toBe(2);
    });

    it("should update correction weight", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          correctionWeight: 1.0,
        })
        .returning();

      const [updated] = await ctx.db
        .update(schema.payeeCategoryCorrections)
        .set({correctionWeight: 2.5})
        .where(eq(schema.payeeCategoryCorrections.id, correction.id))
        .returning();

      expect(updated.correctionWeight).toBe(2.5);
    });

    it("should set override flag", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          isOverride: false,
        })
        .returning();

      const [updated] = await ctx.db
        .update(schema.payeeCategoryCorrections)
        .set({isOverride: true})
        .where(eq(schema.payeeCategoryCorrections.id, correction.id))
        .returning();

      expect(updated.isOverride).toBe(true);
    });
  });

  describe("soft delete", () => {
    it("should soft delete correction", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
        })
        .returning();

      const deletedAt = new Date().toISOString();

      await ctx.db
        .update(schema.payeeCategoryCorrections)
        .set({deletedAt})
        .where(eq(schema.payeeCategoryCorrections.id, correction.id));

      // Should not appear in normal queries
      const [notFound] = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(
          and(
            eq(schema.payeeCategoryCorrections.id, correction.id),
            isNull(schema.payeeCategoryCorrections.deletedAt)
          )
        );

      expect(notFound).toBeUndefined();

      // Should appear when including deleted
      const [found] = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.id, correction.id));

      expect(found).toBeDefined();
      expect(found.deletedAt).toBe(deletedAt);
    });
  });

  describe("learning metadata", () => {
    it("should store amount range as JSON", async () => {
      const amountRange = JSON.stringify({min: 10, max: 100});

      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          amountRange,
        })
        .returning();

      const parsed = JSON.parse(correction.amountRange as string);
      expect(parsed.min).toBe(10);
      expect(parsed.max).toBe(100);
    });

    it("should store temporal context as JSON", async () => {
      const temporalContext = JSON.stringify({
        month: 1,
        dayOfWeek: 3,
        isWeekend: false,
        season: "winter",
      });

      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          temporalContext,
        })
        .returning();

      const parsed = JSON.parse(correction.temporalContext as string);
      expect(parsed.month).toBe(1);
      expect(parsed.isWeekend).toBe(false);
      expect(parsed.season).toBe("winter");
    });

    it("should store payee pattern context as JSON", async () => {
      const payeePatternContext = JSON.stringify({
        frequency: "weekly",
        regularity: 0.9,
        averageAmount: 45.5,
      });

      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          payeePatternContext,
        })
        .returning();

      const parsed = JSON.parse(correction.payeePatternContext as string);
      expect(parsed.frequency).toBe("weekly");
      expect(parsed.regularity).toBe(0.9);
      expect(parsed.averageAmount).toBe(45.5);
    });
  });

  describe("confidence tracking", () => {
    it("should track user and system confidence", async () => {
      const [correction] = await ctx.db
        .insert(schema.payeeCategoryCorrections)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          userConfidence: 9,
          systemConfidence: 0.45,
        })
        .returning();

      expect(correction.userConfidence).toBe(9);
      expect(correction.systemConfidence).toBe(0.45);
    });

    it("should filter corrections by confidence threshold", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          systemConfidence: 0.9,
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId1,
          correctionTrigger: "manual_user_correction",
          systemConfidence: 0.3,
        },
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
          systemConfidence: 0.6,
        },
      ]);

      const allCorrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId));

      const highConfidence = allCorrections.filter((c) => (c.systemConfidence ?? 0) >= 0.5);
      expect(highConfidence).toHaveLength(2);
    });
  });

  describe("workspace isolation", () => {
    it("should isolate corrections between workspaces", async () => {
      // Create second workspace
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      const [payee2] = await ctx.db
        .insert(schema.payees)
        .values({
          workspaceId: workspace2.id,
          name: "Other Store",
          slug: "other-store",
        })
        .returning();

      const [category3] = await ctx.db
        .insert(schema.categories)
        .values({
          workspaceId: workspace2.id,
          name: "Other Category",
          slug: "other-category",
        })
        .returning();

      // Create corrections in both workspaces
      await ctx.db.insert(schema.payeeCategoryCorrections).values([
        {
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          toCategoryId: ctx.categoryId2,
          correctionTrigger: "manual_user_correction",
        },
        {
          workspaceId: workspace2.id,
          payeeId: payee2.id,
          toCategoryId: category3.id,
          correctionTrigger: "manual_user_correction",
        },
      ]);

      // Query workspace 1
      const workspace1Corrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId));

      expect(workspace1Corrections).toHaveLength(1);
      expect(workspace1Corrections[0].payeeId).toBe(ctx.payeeId);

      // Query workspace 2
      const workspace2Corrections = await ctx.db
        .select()
        .from(schema.payeeCategoryCorrections)
        .where(eq(schema.payeeCategoryCorrections.workspaceId, workspace2.id));

      expect(workspace2Corrections).toHaveLength(1);
      expect(workspace2Corrections[0].payeeId).toBe(payee2.id);
    });
  });

  describe("relationships", () => {
    it("should join with payee to get payee details", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        toCategoryId: ctx.categoryId2,
        correctionTrigger: "manual_user_correction",
      });

      const results = await ctx.db
        .select({
          correction: schema.payeeCategoryCorrections,
          payee: {
            id: schema.payees.id,
            name: schema.payees.name,
          },
        })
        .from(schema.payeeCategoryCorrections)
        .innerJoin(schema.payees, eq(schema.payeeCategoryCorrections.payeeId, schema.payees.id))
        .where(eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId));

      expect(results).toHaveLength(1);
      expect(results[0].payee.name).toBe("Test Store");
    });

    it("should join with categories to get category details", async () => {
      await ctx.db.insert(schema.payeeCategoryCorrections).values({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        fromCategoryId: ctx.categoryId1,
        toCategoryId: ctx.categoryId2,
        correctionTrigger: "manual_user_correction",
      });

      const results = await ctx.db
        .select({
          correction: schema.payeeCategoryCorrections,
          toCategory: {
            id: schema.categories.id,
            name: schema.categories.name,
          },
        })
        .from(schema.payeeCategoryCorrections)
        .innerJoin(schema.categories, eq(schema.payeeCategoryCorrections.toCategoryId, schema.categories.id))
        .where(eq(schema.payeeCategoryCorrections.workspaceId, ctx.workspaceId));

      expect(results).toHaveLength(1);
      expect(results[0].toCategory.name).toBe("Entertainment");
    });
  });
});
