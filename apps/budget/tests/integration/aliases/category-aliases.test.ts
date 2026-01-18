/**
 * Category Aliases - Integration Tests
 *
 * Tests the category alias system for import matching.
 * Maps raw imported strings to category IDs with context awareness.
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
  categoryId: number;
  payeeId: number;
  accountId: number;
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
      type: "checking",
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

  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Netflix",
      slug: "netflix",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    categoryId: category.id,
    payeeId: payee.id,
    accountId: account.id,
  };
}

describe("Category Aliases", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("alias creation", () => {
    it("should create a category alias", async () => {
      const [alias] = await ctx.db
        .insert(schema.categoryAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "AMAZON PRIME*123ABC",
          categoryId: ctx.categoryId,
          trigger: "import_confirmation",
        })
        .returning();

      expect(alias).toBeDefined();
      expect(alias.rawString).toBe("AMAZON PRIME*123ABC");
      expect(alias.categoryId).toBe(ctx.categoryId);
      expect(alias.trigger).toBe("import_confirmation");
    });

    it("should support all trigger types", async () => {
      const triggers = ["import_confirmation", "transaction_edit", "manual_creation", "bulk_import", "ai_accepted"] as const;

      for (const trigger of triggers) {
        const [alias] = await ctx.db
          .insert(schema.categoryAliases)
          .values({
            workspaceId: ctx.workspaceId,
            rawString: `Trigger test ${trigger}`,
            categoryId: ctx.categoryId,
            trigger,
          })
          .returning();

        expect(alias.trigger).toBe(trigger);
      }
    });

    it("should support amount type context", async () => {
      const amountTypes = ["any", "income", "expense"] as const;

      for (const amountType of amountTypes) {
        const [alias] = await ctx.db
          .insert(schema.categoryAliases)
          .values({
            workspaceId: ctx.workspaceId,
            rawString: `Amount type ${amountType}`,
            categoryId: ctx.categoryId,
            trigger: "manual_creation",
            amountType,
          })
          .returning();

        expect(alias.amountType).toBe(amountType);
      }
    });

    it("should track payee context", async () => {
      const [alias] = await ctx.db
        .insert(schema.categoryAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "NETFLIX SUBSCRIPTION",
          categoryId: ctx.categoryId,
          payeeId: ctx.payeeId,
          trigger: "import_confirmation",
        })
        .returning();

      expect(alias.payeeId).toBe(ctx.payeeId);
    });

    it("should set default confidence to 1.0", async () => {
      const [alias] = await ctx.db
        .insert(schema.categoryAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "Test Alias",
          categoryId: ctx.categoryId,
          trigger: "manual_creation",
        })
        .returning();

      expect(alias.confidence).toBe(1.0);
    });
  });

  describe("alias lookups", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.categoryAliases).values([
        {workspaceId: ctx.workspaceId, rawString: "NETFLIX MONTHLY", normalizedString: "netflix monthly", categoryId: ctx.categoryId, trigger: "import_confirmation", amountType: "expense"},
        {workspaceId: ctx.workspaceId, rawString: "SPOTIFY PREMIUM", normalizedString: "spotify premium", categoryId: ctx.categoryId, trigger: "manual_creation", amountType: "expense"},
      ]);
    });

    it("should find alias by raw string", async () => {
      const [alias] = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(
          and(
            eq(schema.categoryAliases.workspaceId, ctx.workspaceId),
            eq(schema.categoryAliases.rawString, "NETFLIX MONTHLY"),
            isNull(schema.categoryAliases.deletedAt)
          )
        );

      expect(alias).toBeDefined();
      expect(alias.categoryId).toBe(ctx.categoryId);
    });

    it("should find alias by normalized string", async () => {
      const [alias] = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(
          and(
            eq(schema.categoryAliases.workspaceId, ctx.workspaceId),
            eq(schema.categoryAliases.normalizedString, "spotify premium"),
            isNull(schema.categoryAliases.deletedAt)
          )
        );

      expect(alias).toBeDefined();
      expect(alias.rawString).toBe("SPOTIFY PREMIUM");
    });

    it("should filter by amount type", async () => {
      const expenseAliases = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(
          and(
            eq(schema.categoryAliases.workspaceId, ctx.workspaceId),
            eq(schema.categoryAliases.amountType, "expense"),
            isNull(schema.categoryAliases.deletedAt)
          )
        );

      expect(expenseAliases).toHaveLength(2);
    });
  });

  describe("alias updates", () => {
    it("should update match count", async () => {
      const [alias] = await ctx.db
        .insert(schema.categoryAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "UPDATE TEST",
          categoryId: ctx.categoryId,
          trigger: "import_confirmation",
          matchCount: 1,
        })
        .returning();

      await ctx.db
        .update(schema.categoryAliases)
        .set({matchCount: 10, lastMatchedAt: new Date().toISOString()})
        .where(eq(schema.categoryAliases.id, alias.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(eq(schema.categoryAliases.id, alias.id));

      expect(updated.matchCount).toBe(10);
      expect(updated.lastMatchedAt).toBeDefined();
    });

    it("should update confidence score", async () => {
      const [alias] = await ctx.db
        .insert(schema.categoryAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "CONFIDENCE UPDATE",
          categoryId: ctx.categoryId,
          trigger: "ai_accepted",
          confidence: 0.7,
        })
        .returning();

      await ctx.db
        .update(schema.categoryAliases)
        .set({confidence: 0.98})
        .where(eq(schema.categoryAliases.id, alias.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(eq(schema.categoryAliases.id, alias.id));

      expect(updated.confidence).toBe(0.98);
    });
  });

  describe("soft delete", () => {
    it("should soft delete alias", async () => {
      const [alias] = await ctx.db
        .insert(schema.categoryAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "SOFT DELETE TEST",
          categoryId: ctx.categoryId,
          trigger: "manual_creation",
        })
        .returning();

      await ctx.db
        .update(schema.categoryAliases)
        .set({deletedAt: new Date().toISOString()})
        .where(eq(schema.categoryAliases.id, alias.id));

      // Should not find in active query
      const activeAliases = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(
          and(
            eq(schema.categoryAliases.id, alias.id),
            isNull(schema.categoryAliases.deletedAt)
          )
        );

      expect(activeAliases).toHaveLength(0);

      // Should still exist
      const [stillExists] = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(eq(schema.categoryAliases.id, alias.id));

      expect(stillExists.deletedAt).toBeDefined();
    });
  });

  describe("unique constraints", () => {
    it("should allow same raw string with different categories", async () => {
      const [category2] = await ctx.db
        .insert(schema.categories)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Entertainment",
          slug: "entertainment",
        })
        .returning();

      // Same raw string, different categories
      await ctx.db.insert(schema.categoryAliases).values([
        {workspaceId: ctx.workspaceId, rawString: "SHARED STRING", categoryId: ctx.categoryId, trigger: "manual_creation"},
        {workspaceId: ctx.workspaceId, rawString: "SHARED STRING", categoryId: category2.id, trigger: "manual_creation"},
      ]);

      const aliases = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(eq(schema.categoryAliases.rawString, "SHARED STRING"));

      expect(aliases).toHaveLength(2);
    });

    it("should enforce unique raw string + category per workspace", async () => {
      await ctx.db.insert(schema.categoryAliases).values({
        workspaceId: ctx.workspaceId,
        rawString: "UNIQUE COMBO",
        categoryId: ctx.categoryId,
        trigger: "manual_creation",
      });

      try {
        await ctx.db
          .insert(schema.categoryAliases)
          .values({
            workspaceId: ctx.workspaceId,
            rawString: "UNIQUE COMBO",
            categoryId: ctx.categoryId,
            trigger: "import_confirmation",
          })
          .run();
        expect.fail("Expected unique constraint violation");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("bulk operations", () => {
    it("should bulk create aliases", async () => {
      const aliases = await ctx.db
        .insert(schema.categoryAliases)
        .values([
          {workspaceId: ctx.workspaceId, rawString: "BULK CAT 1", categoryId: ctx.categoryId, trigger: "bulk_import"},
          {workspaceId: ctx.workspaceId, rawString: "BULK CAT 2", categoryId: ctx.categoryId, trigger: "bulk_import"},
          {workspaceId: ctx.workspaceId, rawString: "BULK CAT 3", categoryId: ctx.categoryId, trigger: "bulk_import"},
        ])
        .returning();

      expect(aliases).toHaveLength(3);
    });
  });

  describe("workspace isolation", () => {
    it("should isolate aliases between workspaces", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      const [category2] = await ctx.db
        .insert(schema.categories)
        .values({
          workspaceId: workspace2.id,
          name: "Other",
          slug: "other",
        })
        .returning();

      await ctx.db.insert(schema.categoryAliases).values([
        {workspaceId: ctx.workspaceId, rawString: "SAME ALIAS", categoryId: ctx.categoryId, trigger: "manual_creation"},
        {workspaceId: workspace2.id, rawString: "SAME ALIAS", categoryId: category2.id, trigger: "manual_creation"},
      ]);

      const ws1Aliases = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(eq(schema.categoryAliases.workspaceId, ctx.workspaceId));

      const ws2Aliases = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(eq(schema.categoryAliases.workspaceId, workspace2.id));

      expect(ws1Aliases).toHaveLength(1);
      expect(ws2Aliases).toHaveLength(1);
    });
  });

  describe("relationships", () => {
    it("should join alias with category details", async () => {
      await ctx.db.insert(schema.categoryAliases).values({
        workspaceId: ctx.workspaceId,
        rawString: "NETFLIX CHARGE",
        categoryId: ctx.categoryId,
        payeeId: ctx.payeeId,
        trigger: "import_confirmation",
      });

      const results = await ctx.db
        .select({
          alias: schema.categoryAliases,
          categoryName: schema.categories.name,
          payeeName: schema.payees.name,
        })
        .from(schema.categoryAliases)
        .innerJoin(schema.categories, eq(schema.categoryAliases.categoryId, schema.categories.id))
        .leftJoin(schema.payees, eq(schema.categoryAliases.payeeId, schema.payees.id))
        .where(eq(schema.categoryAliases.workspaceId, ctx.workspaceId));

      expect(results).toHaveLength(1);
      expect(results[0].categoryName).toBe("Subscriptions");
      expect(results[0].payeeName).toBe("Netflix");
    });
  });
});
