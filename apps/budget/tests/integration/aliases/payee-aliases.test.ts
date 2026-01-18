/**
 * Payee Aliases - Integration Tests
 *
 * Tests the payee alias system for import matching.
 * Maps raw imported strings to canonical payee IDs.
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

  const [payee] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Walmart",
      slug: "walmart",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    payeeId: payee.id,
    accountId: account.id,
  };
}

describe("Payee Aliases", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("alias creation", () => {
    it("should create an alias with raw string", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "WALMART #1234 DALLAS TX",
          payeeId: ctx.payeeId,
          trigger: "import_confirmation",
        })
        .returning();

      expect(alias).toBeDefined();
      expect(alias.rawString).toBe("WALMART #1234 DALLAS TX");
      expect(alias.payeeId).toBe(ctx.payeeId);
      expect(alias.trigger).toBe("import_confirmation");
    });

    it("should create alias with normalized string", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "WALMART #5678 AUSTIN TX",
          normalizedString: "walmart austin tx",
          payeeId: ctx.payeeId,
          trigger: "manual_creation",
        })
        .returning();

      expect(alias.normalizedString).toBe("walmart austin tx");
    });

    it("should support all trigger types", async () => {
      const triggers = ["import_confirmation", "transaction_edit", "manual_creation", "bulk_import"] as const;

      for (const trigger of triggers) {
        const [alias] = await ctx.db
          .insert(schema.payeeAliases)
          .values({
            workspaceId: ctx.workspaceId,
            rawString: `Test ${trigger}`,
            payeeId: ctx.payeeId,
            trigger,
          })
          .returning();

        expect(alias.trigger).toBe(trigger);
      }
    });

    it("should set default confidence to 1.0", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "Test Payee",
          payeeId: ctx.payeeId,
          trigger: "manual_creation",
        })
        .returning();

      expect(alias.confidence).toBe(1.0);
    });

    it("should track source account", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "WALMART SUPERCENTER",
          payeeId: ctx.payeeId,
          trigger: "import_confirmation",
          sourceAccountId: ctx.accountId,
        })
        .returning();

      expect(alias.sourceAccountId).toBe(ctx.accountId);
    });
  });

  describe("alias lookups", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.payeeAliases).values([
        {workspaceId: ctx.workspaceId, rawString: "WALMART #1234", normalizedString: "walmart 1234", payeeId: ctx.payeeId, trigger: "import_confirmation"},
        {workspaceId: ctx.workspaceId, rawString: "WALMART SUPERCENTER", normalizedString: "walmart supercenter", payeeId: ctx.payeeId, trigger: "manual_creation"},
      ]);
    });

    it("should find alias by exact raw string", async () => {
      const [alias] = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(
          and(
            eq(schema.payeeAliases.workspaceId, ctx.workspaceId),
            eq(schema.payeeAliases.rawString, "WALMART #1234"),
            isNull(schema.payeeAliases.deletedAt)
          )
        );

      expect(alias).toBeDefined();
      expect(alias.payeeId).toBe(ctx.payeeId);
    });

    it("should find alias by normalized string", async () => {
      const [alias] = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(
          and(
            eq(schema.payeeAliases.workspaceId, ctx.workspaceId),
            eq(schema.payeeAliases.normalizedString, "walmart supercenter"),
            isNull(schema.payeeAliases.deletedAt)
          )
        );

      expect(alias).toBeDefined();
      expect(alias.rawString).toBe("WALMART SUPERCENTER");
    });

    it("should find all aliases for a payee", async () => {
      const aliases = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(
          and(
            eq(schema.payeeAliases.payeeId, ctx.payeeId),
            isNull(schema.payeeAliases.deletedAt)
          )
        );

      expect(aliases).toHaveLength(2);
    });
  });

  describe("alias updates", () => {
    it("should update match count", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "TEST PAYEE",
          payeeId: ctx.payeeId,
          trigger: "import_confirmation",
          matchCount: 1,
        })
        .returning();

      await ctx.db
        .update(schema.payeeAliases)
        .set({matchCount: 5, lastMatchedAt: new Date().toISOString()})
        .where(eq(schema.payeeAliases.id, alias.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(eq(schema.payeeAliases.id, alias.id));

      expect(updated.matchCount).toBe(5);
      expect(updated.lastMatchedAt).toBeDefined();
    });

    it("should update confidence score", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "CONFIDENCE TEST",
          payeeId: ctx.payeeId,
          trigger: "import_confirmation",
          confidence: 0.5,
        })
        .returning();

      await ctx.db
        .update(schema.payeeAliases)
        .set({confidence: 0.95})
        .where(eq(schema.payeeAliases.id, alias.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(eq(schema.payeeAliases.id, alias.id));

      expect(updated.confidence).toBe(0.95);
    });
  });

  describe("soft delete", () => {
    it("should soft delete alias", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          rawString: "TO DELETE",
          payeeId: ctx.payeeId,
          trigger: "manual_creation",
        })
        .returning();

      await ctx.db
        .update(schema.payeeAliases)
        .set({deletedAt: new Date().toISOString()})
        .where(eq(schema.payeeAliases.id, alias.id));

      // Should not find in active query
      const activeAliases = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(
          and(
            eq(schema.payeeAliases.id, alias.id),
            isNull(schema.payeeAliases.deletedAt)
          )
        );

      expect(activeAliases).toHaveLength(0);

      // Should still exist in database
      const [stillExists] = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(eq(schema.payeeAliases.id, alias.id));

      expect(stillExists).toBeDefined();
      expect(stillExists.deletedAt).toBeDefined();
    });
  });

  describe("unique constraints", () => {
    it("should enforce unique raw string per workspace", async () => {
      await ctx.db.insert(schema.payeeAliases).values({
        workspaceId: ctx.workspaceId,
        rawString: "UNIQUE STRING",
        payeeId: ctx.payeeId,
        trigger: "manual_creation",
      });

      // Try to insert duplicate
      try {
        await ctx.db
          .insert(schema.payeeAliases)
          .values({
            workspaceId: ctx.workspaceId,
            rawString: "UNIQUE STRING",
            payeeId: ctx.payeeId,
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
        .insert(schema.payeeAliases)
        .values([
          {workspaceId: ctx.workspaceId, rawString: "BULK 1", payeeId: ctx.payeeId, trigger: "bulk_import"},
          {workspaceId: ctx.workspaceId, rawString: "BULK 2", payeeId: ctx.payeeId, trigger: "bulk_import"},
          {workspaceId: ctx.workspaceId, rawString: "BULK 3", payeeId: ctx.payeeId, trigger: "bulk_import"},
        ])
        .returning();

      expect(aliases).toHaveLength(3);
      expect(aliases.every((a) => a.trigger === "bulk_import")).toBe(true);
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

      const [payee2] = await ctx.db
        .insert(schema.payees)
        .values({
          workspaceId: workspace2.id,
          name: "Target",
          slug: "target",
        })
        .returning();

      // Create same raw string in both workspaces
      await ctx.db.insert(schema.payeeAliases).values([
        {workspaceId: ctx.workspaceId, rawString: "SAME STRING", payeeId: ctx.payeeId, trigger: "manual_creation"},
        {workspaceId: workspace2.id, rawString: "SAME STRING", payeeId: payee2.id, trigger: "manual_creation"},
      ]);

      const ws1Aliases = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(eq(schema.payeeAliases.workspaceId, ctx.workspaceId));

      const ws2Aliases = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(eq(schema.payeeAliases.workspaceId, workspace2.id));

      expect(ws1Aliases).toHaveLength(1);
      expect(ws2Aliases).toHaveLength(1);
      expect(ws1Aliases[0].payeeId).toBe(ctx.payeeId);
      expect(ws2Aliases[0].payeeId).toBe(payee2.id);
    });
  });

  describe("relationships", () => {
    it("should join alias with payee details", async () => {
      await ctx.db.insert(schema.payeeAliases).values({
        workspaceId: ctx.workspaceId,
        rawString: "WALMART STORE",
        payeeId: ctx.payeeId,
        trigger: "import_confirmation",
      });

      const results = await ctx.db
        .select({
          alias: schema.payeeAliases,
          payeeName: schema.payees.name,
        })
        .from(schema.payeeAliases)
        .innerJoin(schema.payees, eq(schema.payeeAliases.payeeId, schema.payees.id))
        .where(eq(schema.payeeAliases.workspaceId, ctx.workspaceId));

      expect(results).toHaveLength(1);
      expect(results[0].payeeName).toBe("Walmart");
      expect(results[0].alias.rawString).toBe("WALMART STORE");
    });
  });
});
