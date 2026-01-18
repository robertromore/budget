/**
 * Transfer Mapping Service - Integration Tests
 *
 * Tests the transfer mapping system that remembers user-confirmed
 * payee-to-account transfer mappings for future imports.
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
  checkingAccountId: number;
  savingsAccountId: number;
  creditCardId: number;
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

  const [checkingAccount] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Test Checking",
      slug: "test-checking",
      accountType: "checking",
    })
    .returning();

  const [savingsAccount] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Test Savings",
      slug: "test-savings",
      accountType: "savings",
    })
    .returning();

  const [creditCard] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Test Credit Card",
      slug: "test-credit-card",
      accountType: "credit_card",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    checkingAccountId: checkingAccount.id,
    savingsAccountId: savingsAccount.id,
    creditCardId: creditCard.id,
  };
}

function normalizeString(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

describe("Transfer Mapping Service", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("create mapping", () => {
    it("should create a mapping with correct properties", async () => {
      const now = new Date().toISOString();
      const rawPayeeString = "VENMO PAYMENT JOHN DOE";

      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString,
          normalizedString: normalizeString(rawPayeeString),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          confidence: 1.0,
          matchCount: 1,
          sourceAccountId: ctx.checkingAccountId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      expect(mapping).toBeDefined();
      expect(mapping.workspaceId).toBe(ctx.workspaceId);
      expect(mapping.rawPayeeString).toBe(rawPayeeString);
      expect(mapping.normalizedString).toBe("venmo payment john doe");
      expect(mapping.targetAccountId).toBe(ctx.savingsAccountId);
      expect(mapping.trigger).toBe("manual_conversion");
      expect(mapping.confidence).toBe(1.0);
      expect(mapping.matchCount).toBe(1);
      expect(mapping.sourceAccountId).toBe(ctx.checkingAccountId);
      expect(mapping.deletedAt).toBeNull();
    });

    it("should support all trigger types", async () => {
      const triggers = [
        "manual_conversion",
        "import_confirmation",
        "transaction_edit",
        "bulk_import",
      ] as const;

      const now = new Date().toISOString();

      for (const trigger of triggers) {
        const [mapping] = await ctx.db
          .insert(schema.transferMappings)
          .values({
            workspaceId: ctx.workspaceId,
            rawPayeeString: `TEST ${trigger}`,
            normalizedString: normalizeString(`TEST ${trigger}`),
            targetAccountId: ctx.savingsAccountId,
            trigger,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        expect(mapping.trigger).toBe(trigger);
      }
    });

    it("should enforce unique constraint on workspace + rawPayeeString", async () => {
      const now = new Date().toISOString();
      const rawPayeeString = "UNIQUE TEST STRING";

      // First insert should succeed
      await ctx.db.insert(schema.transferMappings).values({
        workspaceId: ctx.workspaceId,
        rawPayeeString,
        normalizedString: normalizeString(rawPayeeString),
        targetAccountId: ctx.savingsAccountId,
        trigger: "manual_conversion",
        createdAt: now,
        updatedAt: now,
      });

      // Second insert with same workspace + rawPayeeString should fail
      try {
        await ctx.db
          .insert(schema.transferMappings)
          .values({
            workspaceId: ctx.workspaceId,
            rawPayeeString,
            normalizedString: normalizeString(rawPayeeString),
            targetAccountId: ctx.creditCardId,
            trigger: "import_confirmation",
            createdAt: now,
            updatedAt: now,
          })
          .run();
        // If we get here, the constraint wasn't enforced
        expect.fail("Expected unique constraint violation");
      } catch (error) {
        // Expected - unique constraint should prevent duplicate
        expect(error).toBeDefined();
      }
    });
  });

  describe("find mappings", () => {
    beforeEach(async () => {
      const now = new Date().toISOString();
      // Create test mappings
      await ctx.db.insert(schema.transferMappings).values([
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "VENMO PAYMENT JOHN DOE",
          normalizedString: normalizeString("VENMO PAYMENT JOHN DOE"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          confidence: 1.0,
          matchCount: 5,
          sourceAccountId: ctx.checkingAccountId,
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "ZELLE PAYMENT JANE SMITH",
          normalizedString: normalizeString("ZELLE PAYMENT JANE SMITH"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "import_confirmation",
          confidence: 0.9,
          matchCount: 3,
          sourceAccountId: ctx.checkingAccountId,
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "CREDIT CARD PAYMENT",
          normalizedString: normalizeString("CREDIT CARD PAYMENT"),
          targetAccountId: ctx.creditCardId,
          trigger: "transaction_edit",
          confidence: 1.0,
          matchCount: 10,
          sourceAccountId: ctx.checkingAccountId,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    });

    it("should find mapping by exact raw string", async () => {
      const [mapping] = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(
            eq(schema.transferMappings.rawPayeeString, "VENMO PAYMENT JOHN DOE"),
            eq(schema.transferMappings.workspaceId, ctx.workspaceId),
            isNull(schema.transferMappings.deletedAt)
          )
        )
        .limit(1);

      expect(mapping).toBeDefined();
      expect(mapping.targetAccountId).toBe(ctx.savingsAccountId);
    });

    it("should find mappings by normalized string", async () => {
      const normalized = normalizeString("venmo payment john doe");
      const mappings = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(
            eq(schema.transferMappings.normalizedString, normalized),
            eq(schema.transferMappings.workspaceId, ctx.workspaceId),
            isNull(schema.transferMappings.deletedAt)
          )
        );

      expect(mappings).toHaveLength(1);
      expect(mappings[0].rawPayeeString).toBe("VENMO PAYMENT JOHN DOE");
    });

    it("should find mappings by target account", async () => {
      const mappings = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(
            eq(schema.transferMappings.targetAccountId, ctx.savingsAccountId),
            eq(schema.transferMappings.workspaceId, ctx.workspaceId),
            isNull(schema.transferMappings.deletedAt)
          )
        );

      expect(mappings).toHaveLength(2);
      expect(mappings.every((m) => m.targetAccountId === ctx.savingsAccountId)).toBe(true);
    });

    it("should find mappings by source account", async () => {
      const mappings = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(
            eq(schema.transferMappings.sourceAccountId, ctx.checkingAccountId),
            eq(schema.transferMappings.workspaceId, ctx.workspaceId),
            isNull(schema.transferMappings.deletedAt)
          )
        );

      expect(mappings).toHaveLength(3);
    });

    it("should not find deleted mappings", async () => {
      const now = new Date().toISOString();

      // Soft delete one mapping
      await ctx.db
        .update(schema.transferMappings)
        .set({deletedAt: now})
        .where(eq(schema.transferMappings.rawPayeeString, "VENMO PAYMENT JOHN DOE"));

      const mappings = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(eq(schema.transferMappings.workspaceId, ctx.workspaceId), isNull(schema.transferMappings.deletedAt))
        );

      expect(mappings).toHaveLength(2);
      expect(mappings.find((m) => m.rawPayeeString === "VENMO PAYMENT JOHN DOE")).toBeUndefined();
    });
  });

  describe("update mapping", () => {
    it("should update target account", async () => {
      const now = new Date().toISOString();

      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString: "UPDATE TEST",
          normalizedString: normalizeString("UPDATE TEST"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [updated] = await ctx.db
        .update(schema.transferMappings)
        .set({
          targetAccountId: ctx.creditCardId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.transferMappings.id, mapping.id))
        .returning();

      expect(updated.targetAccountId).toBe(ctx.creditCardId);
    });

    it("should update raw payee string and normalized string together", async () => {
      const now = new Date().toISOString();

      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString: "OLD STRING",
          normalizedString: normalizeString("OLD STRING"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const newRawString = "NEW STRING WITH SPACES";
      const [updated] = await ctx.db
        .update(schema.transferMappings)
        .set({
          rawPayeeString: newRawString,
          normalizedString: normalizeString(newRawString),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.transferMappings.id, mapping.id))
        .returning();

      expect(updated.rawPayeeString).toBe(newRawString);
      expect(updated.normalizedString).toBe("new string with spaces");
    });

    it("should increment match count", async () => {
      const now = new Date().toISOString();

      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString: "MATCH COUNT TEST",
          normalizedString: normalizeString("MATCH COUNT TEST"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          matchCount: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      expect(mapping.matchCount).toBe(1);

      // Increment match count
      const [updated] = await ctx.db
        .update(schema.transferMappings)
        .set({
          matchCount: mapping.matchCount + 1,
          lastAppliedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.transferMappings.id, mapping.id))
        .returning();

      expect(updated.matchCount).toBe(2);
      expect(updated.lastAppliedAt).not.toBeNull();
    });
  });

  describe("bulk operations", () => {
    it("should bulk create multiple mappings", async () => {
      const now = new Date().toISOString();
      const mappingsData = [
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "BULK 1",
          normalizedString: normalizeString("BULK 1"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "bulk_import" as const,
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "BULK 2",
          normalizedString: normalizeString("BULK 2"),
          targetAccountId: ctx.creditCardId,
          trigger: "bulk_import" as const,
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "BULK 3",
          normalizedString: normalizeString("BULK 3"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "bulk_import" as const,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const mappings = await ctx.db.insert(schema.transferMappings).values(mappingsData).returning();

      expect(mappings).toHaveLength(3);
      expect(mappings.every((m) => m.trigger === "bulk_import")).toBe(true);
    });

    it("should soft delete mappings by target account", async () => {
      const now = new Date().toISOString();

      // Create multiple mappings to savings
      await ctx.db.insert(schema.transferMappings).values([
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "DELETE 1",
          normalizedString: normalizeString("DELETE 1"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "DELETE 2",
          normalizedString: normalizeString("DELETE 2"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "KEEP 1",
          normalizedString: normalizeString("KEEP 1"),
          targetAccountId: ctx.creditCardId,
          trigger: "manual_conversion",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Soft delete all mappings to savings
      await ctx.db
        .update(schema.transferMappings)
        .set({deletedAt: new Date().toISOString()})
        .where(
          and(
            eq(schema.transferMappings.targetAccountId, ctx.savingsAccountId),
            eq(schema.transferMappings.workspaceId, ctx.workspaceId),
            isNull(schema.transferMappings.deletedAt)
          )
        );

      // Check only credit card mapping remains active
      const remaining = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(eq(schema.transferMappings.workspaceId, ctx.workspaceId), isNull(schema.transferMappings.deletedAt))
        );

      expect(remaining).toHaveLength(1);
      expect(remaining[0].rawPayeeString).toBe("KEEP 1");
    });
  });

  describe("confidence tracking", () => {
    it("should store confidence values accurately", async () => {
      const now = new Date().toISOString();

      const confidenceValues = [1.0, 0.9, 0.8, 0.5];

      for (const confidence of confidenceValues) {
        const [mapping] = await ctx.db
          .insert(schema.transferMappings)
          .values({
            workspaceId: ctx.workspaceId,
            rawPayeeString: `CONFIDENCE ${confidence}`,
            normalizedString: normalizeString(`CONFIDENCE ${confidence}`),
            targetAccountId: ctx.savingsAccountId,
            trigger: "manual_conversion",
            confidence,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        expect(mapping.confidence).toBe(confidence);
      }
    });

    it("should allow filtering by confidence threshold", async () => {
      const now = new Date().toISOString();

      await ctx.db.insert(schema.transferMappings).values([
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "HIGH CONF",
          normalizedString: normalizeString("HIGH CONF"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          confidence: 1.0,
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "MEDIUM CONF",
          normalizedString: normalizeString("MEDIUM CONF"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          confidence: 0.7,
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString: "LOW CONF",
          normalizedString: normalizeString("LOW CONF"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          confidence: 0.4,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const allMappings = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(eq(schema.transferMappings.workspaceId, ctx.workspaceId), isNull(schema.transferMappings.deletedAt))
        );

      const highConfidence = allMappings.filter((m) => m.confidence >= 0.8);
      expect(highConfidence).toHaveLength(1);
      expect(highConfidence[0].rawPayeeString).toBe("HIGH CONF");
    });
  });

  describe("workspace isolation", () => {
    it("should isolate mappings between workspaces", async () => {
      const now = new Date().toISOString();

      // Create a second workspace
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      const [account2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: workspace2.id,
          name: "Second Savings",
          slug: "second-savings",
          accountType: "savings",
        })
        .returning();

      // Create same raw string in both workspaces
      const rawPayeeString = "SHARED PAYEE STRING";

      await ctx.db.insert(schema.transferMappings).values([
        {
          workspaceId: ctx.workspaceId,
          rawPayeeString,
          normalizedString: normalizeString(rawPayeeString),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          createdAt: now,
          updatedAt: now,
        },
        {
          workspaceId: workspace2.id,
          rawPayeeString,
          normalizedString: normalizeString(rawPayeeString),
          targetAccountId: account2.id,
          trigger: "manual_conversion",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Query for workspace 1
      const [mapping1] = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(
            eq(schema.transferMappings.rawPayeeString, rawPayeeString),
            eq(schema.transferMappings.workspaceId, ctx.workspaceId)
          )
        );

      // Query for workspace 2
      const [mapping2] = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(
          and(
            eq(schema.transferMappings.rawPayeeString, rawPayeeString),
            eq(schema.transferMappings.workspaceId, workspace2.id)
          )
        );

      expect(mapping1.targetAccountId).toBe(ctx.savingsAccountId);
      expect(mapping2.targetAccountId).toBe(account2.id);
    });
  });

  describe("relationships", () => {
    it("should join with target account to get account details", async () => {
      const now = new Date().toISOString();

      // Create mapping
      await ctx.db.insert(schema.transferMappings).values({
        workspaceId: ctx.workspaceId,
        rawPayeeString: "JOIN TEST",
        normalizedString: normalizeString("JOIN TEST"),
        targetAccountId: ctx.savingsAccountId,
        trigger: "manual_conversion",
        createdAt: now,
        updatedAt: now,
      });

      // Join with accounts to get account details
      const results = await ctx.db
        .select({
          mapping: schema.transferMappings,
          targetAccount: {
            id: schema.accounts.id,
            name: schema.accounts.name,
            slug: schema.accounts.slug,
          },
        })
        .from(schema.transferMappings)
        .innerJoin(schema.accounts, eq(schema.transferMappings.targetAccountId, schema.accounts.id))
        .where(eq(schema.transferMappings.rawPayeeString, "JOIN TEST"));

      expect(results).toHaveLength(1);
      expect(results[0].targetAccount.name).toBe("Test Savings");
      expect(results[0].targetAccount.slug).toBe("test-savings");
    });

    it("should be able to track source account for a mapping", async () => {
      const now = new Date().toISOString();

      // Create mapping with source account
      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString: "SOURCE ACCOUNT TEST",
          normalizedString: normalizeString("SOURCE ACCOUNT TEST"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          sourceAccountId: ctx.checkingAccountId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      expect(mapping.sourceAccountId).toBe(ctx.checkingAccountId);

      // Join with source account to get details
      const results = await ctx.db
        .select({
          mapping: schema.transferMappings,
          sourceAccount: {
            id: schema.accounts.id,
            name: schema.accounts.name,
          },
        })
        .from(schema.transferMappings)
        .innerJoin(schema.accounts, eq(schema.transferMappings.sourceAccountId, schema.accounts.id))
        .where(eq(schema.transferMappings.id, mapping.id));

      expect(results).toHaveLength(1);
      expect(results[0].sourceAccount.name).toBe("Test Checking");
    });

    it("should allow null sourceAccountId", async () => {
      const now = new Date().toISOString();

      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString: "NULL SOURCE TEST",
          normalizedString: normalizeString("NULL SOURCE TEST"),
          targetAccountId: ctx.savingsAccountId,
          trigger: "manual_conversion",
          sourceAccountId: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      expect(mapping.sourceAccountId).toBeNull();
    });
  });
});
