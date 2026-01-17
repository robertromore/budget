/**
 * Payee Matching - Integration Tests
 *
 * Tests fuzzy matching, confidence scoring, and payee name cleaning.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
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

  return {
    db,
    workspaceId: workspace.id,
  };
}

/**
 * Calculate Levenshtein distance similarity
 */
function levenshteinSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1;
  if (aLower.length === 0 || bLower.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= aLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLower.length; i++) {
    for (let j = 1; j <= bLower.length; j++) {
      const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  const distance = matrix[aLower.length][bLower.length];
  const maxLen = Math.max(aLower.length, bLower.length);
  return 1 - distance / maxLen;
}

/**
 * Clean payee name from bank description
 */
function cleanPayeeName(raw: string): string {
  let cleaned = raw;

  // Remove common prefixes
  const prefixes = ["DEBIT", "CREDIT", "POS", "ATM", "CHECK", "SQ \\*", "TST\\*", "ACH", "PAYPAL \\*"];
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(new RegExp(`^${prefix}\\s*`, "i"), "");
  }

  // Remove store numbers (e.g., "#1234")
  cleaned = cleaned.replace(/#\d+/g, "");

  // Remove transaction IDs and card numbers
  cleaned = cleaned.replace(/\*+\d+/g, "");

  // Remove dates (MM/DD, MM/DD/YY, MM/DD/YYYY)
  cleaned = cleaned.replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, "");

  // Remove trailing location (CITY STATE)
  cleaned = cleaned.replace(/\s+[A-Z]{2}\s*\d{5}(-\d{4})?$/i, "");
  cleaned = cleaned.replace(/\s+[A-Z][a-z]+\s+[A-Z]{2}$/i, "");

  // Remove corporate suffixes
  cleaned = cleaned.replace(/\s+(INC|LLC|LTD|CORP|CO)\.?$/i, "");

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Get confidence level from similarity score
 */
function getConfidenceLevel(score: number): "exact" | "high" | "medium" | "low" | "none" {
  if (score >= 1.0) return "exact";
  if (score >= 0.9) return "high";
  if (score >= 0.7) return "medium";
  if (score > 0.5) return "low";
  return "none";
}

describe("Payee Matching", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("levenshteinSimilarity", () => {
    it("should return 1.0 for exact match", () => {
      expect(levenshteinSimilarity("Walmart", "Walmart")).toBe(1);
    });

    it("should return 1.0 for case-insensitive match", () => {
      expect(levenshteinSimilarity("WALMART", "walmart")).toBe(1);
    });

    it("should return high score for similar strings", () => {
      const score = levenshteinSimilarity("Walmart", "Wal-Mart");
      expect(score).toBeGreaterThan(0.7);
    });

    it("should return low score for different strings", () => {
      const score = levenshteinSimilarity("Walmart", "Target");
      expect(score).toBeLessThan(0.5);
    });

    it("should return 0 for empty strings", () => {
      expect(levenshteinSimilarity("", "test")).toBe(0);
      expect(levenshteinSimilarity("test", "")).toBe(0);
    });
  });

  describe("cleanPayeeName", () => {
    it("should remove DEBIT prefix", () => {
      expect(cleanPayeeName("DEBIT CARD PURCHASE WALMART")).toBe("CARD PURCHASE WALMART");
    });

    it("should remove POS prefix", () => {
      expect(cleanPayeeName("POS PURCHASE STARBUCKS")).toBe("PURCHASE STARBUCKS");
    });

    it("should remove store numbers", () => {
      expect(cleanPayeeName("WALMART #1234")).toBe("WALMART");
    });

    it("should remove card transaction markers", () => {
      expect(cleanPayeeName("AMAZON*1234567")).toBe("AMAZON");
    });

    it("should remove dates", () => {
      expect(cleanPayeeName("NETFLIX 01/15")).toBe("NETFLIX");
      expect(cleanPayeeName("NETFLIX 01/15/24")).toBe("NETFLIX");
    });

    it("should remove corporate suffixes", () => {
      expect(cleanPayeeName("ACME INC")).toBe("ACME");
      expect(cleanPayeeName("WIDGETS LLC")).toBe("WIDGETS");
      expect(cleanPayeeName("TECH CORP")).toBe("TECH");
    });

    it("should clean up extra whitespace", () => {
      expect(cleanPayeeName("  WALMART   STORE   ")).toBe("WALMART STORE");
    });
  });

  describe("getConfidenceLevel", () => {
    it("should return exact for 1.0", () => {
      expect(getConfidenceLevel(1.0)).toBe("exact");
    });

    it("should return high for >= 0.9", () => {
      expect(getConfidenceLevel(0.95)).toBe("high");
      expect(getConfidenceLevel(0.9)).toBe("high");
    });

    it("should return medium for >= 0.7", () => {
      expect(getConfidenceLevel(0.85)).toBe("medium");
      expect(getConfidenceLevel(0.7)).toBe("medium");
    });

    it("should return low for > 0.5", () => {
      expect(getConfidenceLevel(0.6)).toBe("low");
      expect(getConfidenceLevel(0.51)).toBe("low");
    });

    it("should return none for <= 0.5", () => {
      expect(getConfidenceLevel(0.5)).toBe("none");
      expect(getConfidenceLevel(0.3)).toBe("none");
    });
  });

  describe("findBestMatch", () => {
    it("should find exact match", async () => {
      await ctx.db.insert(schema.payees).values([
        {workspaceId: ctx.workspaceId, name: "Walmart", slug: "walmart"},
        {workspaceId: ctx.workspaceId, name: "Target", slug: "target"},
        {workspaceId: ctx.workspaceId, name: "Amazon", slug: "amazon"},
      ]);

      const payees = await ctx.db.select().from(schema.payees).where(eq(schema.payees.workspaceId, ctx.workspaceId));

      const incoming = "Walmart";
      let bestMatch = null;
      let bestScore = 0;

      for (const payee of payees) {
        const score = levenshteinSimilarity(incoming, payee.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = payee;
        }
      }

      expect(bestMatch?.name).toBe("Walmart");
      expect(bestScore).toBe(1);
    });

    it("should find fuzzy match", async () => {
      await ctx.db.insert(schema.payees).values([
        {workspaceId: ctx.workspaceId, name: "Walmart", slug: "walmart"},
        {workspaceId: ctx.workspaceId, name: "Target", slug: "target"},
      ]);

      const payees = await ctx.db.select().from(schema.payees).where(eq(schema.payees.workspaceId, ctx.workspaceId));

      const incoming = "WALMART #1234 DALLAS TX";
      const cleaned = cleanPayeeName(incoming);
      let bestMatch = null;
      let bestScore = 0;

      for (const payee of payees) {
        const score = levenshteinSimilarity(cleaned, payee.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = payee;
        }
      }

      expect(bestMatch?.name).toBe("Walmart");
      expect(bestScore).toBeGreaterThan(0.7);
    });

    it("should return no match for low score", async () => {
      await ctx.db.insert(schema.payees).values([
        {workspaceId: ctx.workspaceId, name: "Walmart", slug: "walmart"},
      ]);

      const payees = await ctx.db.select().from(schema.payees).where(eq(schema.payees.workspaceId, ctx.workspaceId));

      const incoming = "COMPLETELY DIFFERENT PAYEE";
      let bestScore = 0;

      for (const payee of payees) {
        const score = levenshteinSimilarity(incoming, payee.name);
        if (score > bestScore) {
          bestScore = score;
        }
      }

      const confidence = getConfidenceLevel(bestScore);
      expect(confidence).toBe("none");
    });
  });

  describe("substring matching", () => {
    it("should match when existing payee is substring", () => {
      const existing = "Walmart";
      const incoming = "WALMART SUPERCENTER #1234";

      const isSubstring = incoming.toLowerCase().includes(existing.toLowerCase());
      expect(isSubstring).toBe(true);
    });

    it("should match common merchant abbreviations", () => {
      const abbreviations: Record<string, string> = {
        AMZN: "Amazon",
        SBUX: "Starbucks",
        "TACO BELL": "Taco Bell",
      };

      const incoming = "AMZN MKTPL*ABC123";

      // Check if any abbreviation matches
      let matchedPayee = null;
      for (const [abbrev, fullName] of Object.entries(abbreviations)) {
        if (incoming.includes(abbrev)) {
          matchedPayee = fullName;
          break;
        }
      }

      expect(matchedPayee).toBe("Amazon");
    });
  });

  describe("potential matches", () => {
    it("should return top matches above threshold", async () => {
      await ctx.db.insert(schema.payees).values([
        {workspaceId: ctx.workspaceId, name: "Walmart", slug: "walmart"},
        {workspaceId: ctx.workspaceId, name: "Walgreens", slug: "walgreens"},
        {workspaceId: ctx.workspaceId, name: "Target", slug: "target"},
        {workspaceId: ctx.workspaceId, name: "Whole Foods", slug: "whole-foods"},
      ]);

      const payees = await ctx.db.select().from(schema.payees).where(eq(schema.payees.workspaceId, ctx.workspaceId));

      const incoming = "Wal";
      const minScore = 0.3;
      const maxResults = 5;

      const matches = payees
        .map((payee) => ({
          payee,
          score: levenshteinSimilarity(incoming, payee.name),
        }))
        .filter((m) => m.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      // Should match Walmart and Walgreens
      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(matches[0].payee.name).toMatch(/Wal/);
    });
  });
});
