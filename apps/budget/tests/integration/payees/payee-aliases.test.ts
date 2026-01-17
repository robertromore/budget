/**
 * Payee Aliases - Integration Tests
 *
 * Tests alias creation, lookup, and learning from user actions.
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
  payeeId: number;
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
  };
}

/**
 * Normalize string for alias matching
 */
function normalizeString(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Clean string for alias matching (removes dynamic parts)
 */
function cleanString(raw: string): string {
  let cleaned = raw;

  // Remove dollar amounts
  cleaned = cleaned.replace(/\$[\d,]+\.?\d*/g, "");

  // Remove store numbers (#1234, #5678)
  cleaned = cleaned.replace(/#\d+/g, "");

  // Remove numeric amounts at end
  cleaned = cleaned.replace(/\s+\d+\.?\d*$/g, "");

  // Remove dates
  cleaned = cleaned.replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, "");
  cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}/g, "");

  // Remove card numbers (must be before transaction IDs to avoid partial match)
  cleaned = cleaned.replace(/\*{2,}\d{4}/g, ""); // 2+ asterisks followed by 4 digits

  // Remove transaction IDs (8+ digits or alphanumeric with *)
  cleaned = cleaned.replace(/\d{8,}/g, "");
  cleaned = cleaned.replace(/\*[A-Z0-9]+/gi, "");

  // Clean whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

describe("Payee Aliases", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("recordAliasFromImport", () => {
    it("should create alias from import confirmation", async () => {
      const rawString = "WALMART #1234 DALLAS TX";

      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          rawString,
          normalizedString: normalizeString(rawString),
                    confidence: 1.0,
          matchCount: 1,
          trigger: "import_confirmation",
        })
        .returning();

      expect(alias).toBeDefined();
      expect(alias.payeeId).toBe(ctx.payeeId);
      expect(alias.rawString).toBe(rawString);
      expect(alias.confidence).toBe(1.0);
      expect(alias.trigger).toBe("import_confirmation");
    });

    it("should increment match count for existing alias", async () => {
      const rawString = "WALMART #1234";

      // Create initial alias
      await ctx.db.insert(schema.payeeAliases).values({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        rawString,
        normalizedString: normalizeString(rawString),
                confidence: 1.0,
        matchCount: 1,
        trigger: "import_confirmation",
      });

      // Find and update existing
      const existing = await ctx.db.query.payeeAliases.findFirst({
        where: and(
          eq(schema.payeeAliases.workspaceId, ctx.workspaceId),
          eq(schema.payeeAliases.normalizedString, normalizeString(rawString))
        ),
      });

      expect(existing).toBeDefined();

      await ctx.db
        .update(schema.payeeAliases)
        .set({matchCount: (existing!.matchCount ?? 0) + 1})
        .where(eq(schema.payeeAliases.id, existing!.id));

      const updated = await ctx.db.query.payeeAliases.findFirst({
        where: eq(schema.payeeAliases.id, existing!.id),
      });

      expect(updated?.matchCount).toBe(2);
    });
  });

  describe("findPayeeByAlias", () => {
    it("should find by exact raw string match", async () => {
      const rawString = "WALMART #1234";

      await ctx.db.insert(schema.payeeAliases).values({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        rawString,
        normalizedString: normalizeString(rawString),
                confidence: 1.0,
        matchCount: 1,
        trigger: "import_confirmation",
      });

      const match = await ctx.db.query.payeeAliases.findFirst({
        where: and(eq(schema.payeeAliases.workspaceId, ctx.workspaceId), eq(schema.payeeAliases.rawString, rawString)),
      });

      expect(match?.payeeId).toBe(ctx.payeeId);
    });

    it("should find by normalized string match", async () => {
      const rawString = "WALMART #1234";

      await ctx.db.insert(schema.payeeAliases).values({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        rawString,
        normalizedString: normalizeString(rawString),
                confidence: 1.0,
        matchCount: 1,
        trigger: "import_confirmation",
      });

      // Search with different casing and spacing
      const searchString = "  walmart #1234  ";
      const normalized = normalizeString(searchString);

      const match = await ctx.db.query.payeeAliases.findFirst({
        where: and(
          eq(schema.payeeAliases.workspaceId, ctx.workspaceId),
          eq(schema.payeeAliases.normalizedString, normalized)
        ),
      });

      expect(match?.payeeId).toBe(ctx.payeeId);
    });

    it("should find by normalized string match even with different details", async () => {
      // Test that normalized lookup works for matching despite different raw strings
      const rawString = "WALMART #1234";
      const normalized = normalizeString(rawString);

      await ctx.db.insert(schema.payeeAliases).values({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        rawString,
        normalizedString: normalized,
        confidence: 1.0,
        matchCount: 1,
        trigger: "import_confirmation",
      });

      // Search with same normalized form
      const searchString = "  WALMART #1234  "; // Different whitespace
      const searchNormalized = normalizeString(searchString);

      const match = await ctx.db.query.payeeAliases.findFirst({
        where: and(
          eq(schema.payeeAliases.workspaceId, ctx.workspaceId),
          eq(schema.payeeAliases.normalizedString, searchNormalized)
        ),
      });

      expect(match?.payeeId).toBe(ctx.payeeId);
    });
  });

  describe("alias triggers", () => {
    it("should record import_confirmation trigger", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          rawString: "TEST PAYEE",
          normalizedString: "test payee",
                    confidence: 1.0,
          matchCount: 1,
          trigger: "import_confirmation",
        })
        .returning();

      expect(alias.trigger).toBe("import_confirmation");
    });

    it("should record transaction_edit trigger", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          rawString: "TEST PAYEE",
          normalizedString: "test payee",
                    confidence: 1.0,
          matchCount: 1,
          trigger: "transaction_edit",
        })
        .returning();

      expect(alias.trigger).toBe("transaction_edit");
    });

    it("should record manual_creation trigger", async () => {
      const [alias] = await ctx.db
        .insert(schema.payeeAliases)
        .values({
          workspaceId: ctx.workspaceId,
          payeeId: ctx.payeeId,
          rawString: "TEST PAYEE",
          normalizedString: "test payee",
                    confidence: 1.0,
          matchCount: 1,
          trigger: "manual_creation",
        })
        .returning();

      expect(alias.trigger).toBe("manual_creation");
    });
  });

  describe("mergeAliases", () => {
    it("should move aliases when payees are merged", async () => {
      // Create second payee
      const [payee2] = await ctx.db
        .insert(schema.payees)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Walmart Supercenter",
          slug: "walmart-supercenter",
        })
        .returning();

      // Create alias for payee2
      await ctx.db.insert(schema.payeeAliases).values({
        workspaceId: ctx.workspaceId,
        payeeId: payee2.id,
        rawString: "WALMART SUPERCENTER #5678",
        normalizedString: "walmart supercenter #5678",
                confidence: 1.0,
        matchCount: 1,
        trigger: "import_confirmation",
      });

      // Merge: move payee2's aliases to payee1
      await ctx.db
        .update(schema.payeeAliases)
        .set({payeeId: ctx.payeeId})
        .where(eq(schema.payeeAliases.payeeId, payee2.id));

      // Verify aliases moved
      const aliases = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(eq(schema.payeeAliases.payeeId, ctx.payeeId));

      expect(aliases).toHaveLength(1);
      expect(aliases[0].rawString).toBe("WALMART SUPERCENTER #5678");
    });
  });

  describe("normalizeString", () => {
    it("should lowercase", () => {
      expect(normalizeString("WALMART")).toBe("walmart");
    });

    it("should trim whitespace", () => {
      expect(normalizeString("  walmart  ")).toBe("walmart");
    });

    it("should collapse multiple spaces", () => {
      expect(normalizeString("walmart   store")).toBe("walmart store");
    });
  });

  describe("cleanString", () => {
    it("should remove dollar amounts", () => {
      expect(cleanString("WALMART $50.00")).toBe("WALMART");
      expect(cleanString("STORE $1,234.56")).toBe("STORE");
    });

    it("should remove dates", () => {
      expect(cleanString("WALMART 01/15")).toBe("WALMART");
      expect(cleanString("WALMART 2024-01-15")).toBe("WALMART");
    });

    it("should remove transaction IDs", () => {
      expect(cleanString("AMAZON*ABC123")).toBe("AMAZON");
      expect(cleanString("STORE 12345678901")).toBe("STORE");
    });

    it("should remove card numbers", () => {
      expect(cleanString("WALMART ****1234")).toBe("WALMART");
    });
  });

  describe("bulk aliases", () => {
    it("should create multiple aliases in batch", async () => {
      const rawStrings = ["WALMART #1234", "WALMART #5678", "WALMART SUPERCENTER"];

      // Deduplicate by cleaned string
      const uniqueAliases = new Map<string, string>();
      for (const raw of rawStrings) {
        const cleaned = cleanString(raw);
        if (!uniqueAliases.has(cleaned)) {
          uniqueAliases.set(cleaned, raw);
        }
      }

      const aliasValues = Array.from(uniqueAliases.entries()).map(([cleaned, raw]) => ({
        workspaceId: ctx.workspaceId,
        payeeId: ctx.payeeId,
        rawString: raw,
        normalizedString: normalizeString(raw),
                confidence: 1.0,
        matchCount: 1,
        trigger: "bulk_import" as const,
      }));

      await ctx.db.insert(schema.payeeAliases).values(aliasValues);

      const created = await ctx.db
        .select()
        .from(schema.payeeAliases)
        .where(eq(schema.payeeAliases.payeeId, ctx.payeeId));

      // WALMART #1234 and #5678 have same cleaned string, so only 2 unique
      expect(created).toHaveLength(2);
    });
  });
});
