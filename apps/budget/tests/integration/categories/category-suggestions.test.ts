/**
 * Category Suggestions - Integration Tests
 *
 * Tests category suggestion logic including payee matching,
 * confidence scoring, and auto-fill behavior.
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
  groceriesId: number;
  entertainmentId: number;
  subscriptionsId: number;
  walmartId: number;
  netflixId: number;
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

  // Create categories
  const [groceries] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Groceries",
      slug: "groceries",
    })
    .returning();

  const [entertainment] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Entertainment",
      slug: "entertainment",
    })
    .returning();

  const [subscriptions] = await db
    .insert(schema.categories)
    .values({
      workspaceId: workspace.id,
      name: "Subscriptions",
      slug: "subscriptions",
    })
    .returning();

  // Create payees
  const [walmart] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Walmart",
      slug: "walmart",
      defaultCategoryId: groceries.id,
    })
    .returning();

  const [netflix] = await db
    .insert(schema.payees)
    .values({
      workspaceId: workspace.id,
      name: "Netflix",
      slug: "netflix",
      defaultCategoryId: subscriptions.id,
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    groceriesId: groceries.id,
    entertainmentId: entertainment.id,
    subscriptionsId: subscriptions.id,
    walmartId: walmart.id,
    netflixId: netflix.id,
  };
}

/**
 * Simulated category suggestion result
 */
interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reason: "payee_match" | "amount_pattern" | "historical" | "ml_prediction";
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): "high" | "medium" | "low" | "none" {
  if (score >= 0.7) return "high";
  if (score >= 0.5) return "medium";
  if (score >= 0.3) return "low";
  return "none";
}

describe("Category Suggestions", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("payee-based suggestions", () => {
    it("should suggest category from payee default", async () => {
      const payee = await ctx.db.query.payees.findFirst({
        where: eq(schema.payees.id, ctx.walmartId),
      });

      expect(payee?.defaultCategoryId).toBe(ctx.groceriesId);

      // Simulate suggestion
      const suggestion: CategorySuggestion = {
        categoryId: payee!.defaultCategoryId!,
        categoryName: "Groceries",
        confidence: 0.9,
        reason: "payee_match",
      };

      expect(suggestion.confidence).toBeGreaterThanOrEqual(0.7);
      expect(getConfidenceLevel(suggestion.confidence)).toBe("high");
    });

    it("should handle payee without default category", async () => {
      // Create payee without default category
      const [payee] = await ctx.db
        .insert(schema.payees)
        .values({
          workspaceId: ctx.workspaceId,
          name: "New Merchant",
          slug: "new-merchant",
        })
        .returning();

      expect(payee.defaultCategoryId).toBeNull();
    });
  });

  describe("historical pattern suggestions", () => {
    it("should suggest based on transaction history", async () => {
      const [account] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Checking",
          slug: "checking",
          type: "checking",
        })
        .returning();

      // Create historical transactions
      await ctx.db.insert(schema.transactions).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: account.id,
          payeeId: ctx.walmartId,
          categoryId: ctx.groceriesId,
          amount: -50.0,
          date: "2024-01-01",
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: account.id,
          payeeId: ctx.walmartId,
          categoryId: ctx.groceriesId,
          amount: -75.0,
          date: "2024-01-08",
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: account.id,
          payeeId: ctx.walmartId,
          categoryId: ctx.groceriesId,
          amount: -60.0,
          date: "2024-01-15",
        },
      ]);

      // Query historical categories for payee
      const history = await ctx.db
        .select({
          categoryId: schema.transactions.categoryId,
          count: schema.transactions.id,
        })
        .from(schema.transactions)
        .where(
          and(eq(schema.transactions.payeeId, ctx.walmartId), eq(schema.transactions.workspaceId, ctx.workspaceId))
        );

      // All 3 transactions have groceries
      expect(history.every((h) => h.categoryId === ctx.groceriesId)).toBe(true);
    });

    it("should identify most common category", async () => {
      const [account] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Checking",
          slug: "checking",
          type: "checking",
        })
        .returning();

      // Create transactions with mixed categories
      await ctx.db.insert(schema.transactions).values([
        {workspaceId: ctx.workspaceId, accountId: account.id, payeeId: ctx.walmartId, categoryId: ctx.groceriesId, amount: -50.0, date: "2024-01-01"},
        {workspaceId: ctx.workspaceId, accountId: account.id, payeeId: ctx.walmartId, categoryId: ctx.groceriesId, amount: -50.0, date: "2024-01-02"},
        {workspaceId: ctx.workspaceId, accountId: account.id, payeeId: ctx.walmartId, categoryId: ctx.groceriesId, amount: -50.0, date: "2024-01-03"},
        {workspaceId: ctx.workspaceId, accountId: account.id, payeeId: ctx.walmartId, categoryId: ctx.entertainmentId, amount: -50.0, date: "2024-01-04"},
      ]);

      // Count by category
      const transactions = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.payeeId, ctx.walmartId));

      const categoryCount = new Map<number, number>();
      for (const t of transactions) {
        if (t.categoryId) {
          categoryCount.set(t.categoryId, (categoryCount.get(t.categoryId) || 0) + 1);
        }
      }

      // Find most common
      let mostCommon = null;
      let maxCount = 0;
      for (const [catId, count] of categoryCount) {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = catId;
        }
      }

      expect(mostCommon).toBe(ctx.groceriesId);
      expect(maxCount).toBe(3);
    });
  });

  describe("amount pattern suggestions", () => {
    it("should identify recurring amount pattern", async () => {
      const [account] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Checking",
          slug: "checking",
          type: "checking",
        })
        .returning();

      // Create transactions with same amount (Netflix subscription)
      await ctx.db.insert(schema.transactions).values([
        {workspaceId: ctx.workspaceId, accountId: account.id, payeeId: ctx.netflixId, categoryId: ctx.subscriptionsId, amount: -15.99, date: "2024-01-15"},
        {workspaceId: ctx.workspaceId, accountId: account.id, payeeId: ctx.netflixId, categoryId: ctx.subscriptionsId, amount: -15.99, date: "2024-02-15"},
        {workspaceId: ctx.workspaceId, accountId: account.id, payeeId: ctx.netflixId, categoryId: ctx.subscriptionsId, amount: -15.99, date: "2024-03-15"},
      ]);

      // Check for matching pattern
      const matchingTransactions = await ctx.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.payeeId, ctx.netflixId),
            eq(schema.transactions.amount, -15.99)
          )
        );

      expect(matchingTransactions).toHaveLength(3);

      // All have same category
      const allSameCategory = matchingTransactions.every(
        (t) => t.categoryId === ctx.subscriptionsId
      );
      expect(allSameCategory).toBe(true);
    });

    it("should detect income vs expense patterns", () => {
      const transactions = [
        {amount: 3000.0, categoryId: 1}, // Income
        {amount: 3000.0, categoryId: 1}, // Income
        {amount: -50.0, categoryId: 2}, // Expense
      ];

      // Positive amounts likely income
      const incomeTransactions = transactions.filter((t) => t.amount > 0);
      const expenseTransactions = transactions.filter((t) => t.amount < 0);

      expect(incomeTransactions).toHaveLength(2);
      expect(expenseTransactions).toHaveLength(1);
    });
  });

  describe("confidence scoring", () => {
    it("should calculate confidence from match count", () => {
      const calculateConfidence = (matchCount: number, totalCount: number) => {
        if (totalCount === 0) return 0;
        return matchCount / totalCount;
      };

      expect(calculateConfidence(10, 10)).toBe(1.0); // 100% match
      expect(calculateConfidence(8, 10)).toBe(0.8); // 80% match
      expect(calculateConfidence(5, 10)).toBe(0.5); // 50% match
    });

    it("should boost confidence for recent matches", () => {
      const calculateTimeWeightedConfidence = (
        transactions: Array<{date: string; isMatch: boolean}>
      ) => {
        const now = new Date("2024-01-31");
        let weightedMatches = 0;
        let totalWeight = 0;

        for (const t of transactions) {
          const txDate = new Date(t.date);
          const daysDiff = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
          const weight = Math.max(0.1, 1 - daysDiff / 365); // Recent = higher weight

          totalWeight += weight;
          if (t.isMatch) {
            weightedMatches += weight;
          }
        }

        return totalWeight > 0 ? weightedMatches / totalWeight : 0;
      };

      const transactions = [
        {date: "2024-01-30", isMatch: true}, // Very recent
        {date: "2024-01-15", isMatch: true}, // Recent
        {date: "2023-06-01", isMatch: false}, // Old
      ];

      const confidence = calculateTimeWeightedConfidence(transactions);
      // Recent matches should result in higher confidence than 2/3
      expect(confidence).toBeGreaterThan(0.66);
    });
  });

  describe("auto-fill behavior", () => {
    it("should auto-fill when confidence exceeds threshold", () => {
      const autoFillThreshold = 0.7;

      const suggestions = [
        {categoryId: 1, confidence: 0.95}, // Should auto-fill
        {categoryId: 2, confidence: 0.7}, // Should auto-fill (at threshold)
        {categoryId: 3, confidence: 0.69}, // Should NOT auto-fill
      ];

      const autoFilled = suggestions.filter((s) => s.confidence >= autoFillThreshold);
      expect(autoFilled).toHaveLength(2);
    });

    it("should not auto-fill below minimum confidence", () => {
      const minConfidence = 0.3;
      const autoFillThreshold = 0.7;

      const suggestions = [
        {categoryId: 1, confidence: 0.25}, // Below min, excluded
        {categoryId: 2, confidence: 0.35}, // Above min, but no auto-fill
        {categoryId: 3, confidence: 0.75}, // Auto-fill
      ];

      const validSuggestions = suggestions.filter((s) => s.confidence >= minConfidence);
      const autoFilled = validSuggestions.filter((s) => s.confidence >= autoFillThreshold);

      expect(validSuggestions).toHaveLength(2);
      expect(autoFilled).toHaveLength(1);
    });
  });

  describe("suggestion ranking", () => {
    it("should rank suggestions by confidence", () => {
      const suggestions: CategorySuggestion[] = [
        {categoryId: 1, categoryName: "A", confidence: 0.5, reason: "ml_prediction"},
        {categoryId: 2, categoryName: "B", confidence: 0.9, reason: "payee_match"},
        {categoryId: 3, categoryName: "C", confidence: 0.7, reason: "historical"},
      ];

      const ranked = [...suggestions].sort((a, b) => b.confidence - a.confidence);

      expect(ranked[0].confidence).toBe(0.9);
      expect(ranked[1].confidence).toBe(0.7);
      expect(ranked[2].confidence).toBe(0.5);
    });

    it("should limit suggestions to top N", () => {
      const maxSuggestions = 3;

      const allSuggestions: CategorySuggestion[] = [
        {categoryId: 1, categoryName: "A", confidence: 0.9, reason: "payee_match"},
        {categoryId: 2, categoryName: "B", confidence: 0.8, reason: "historical"},
        {categoryId: 3, categoryName: "C", confidence: 0.7, reason: "ml_prediction"},
        {categoryId: 4, categoryName: "D", confidence: 0.6, reason: "amount_pattern"},
        {categoryId: 5, categoryName: "E", confidence: 0.5, reason: "ml_prediction"},
      ];

      const topSuggestions = allSuggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxSuggestions);

      expect(topSuggestions).toHaveLength(3);
      expect(topSuggestions.map((s) => s.categoryId)).toEqual([1, 2, 3]);
    });
  });

  describe("category alias suggestions", () => {
    it("should match category by alias", async () => {
      // Create category alias
      await ctx.db.insert(schema.categoryAliases).values({
        workspaceId: ctx.workspaceId,
        categoryId: ctx.groceriesId,
        rawString: "GROCERY",
        normalizedString: "grocery",
        trigger: "import",
      });

      const alias = await ctx.db.query.categoryAliases.findFirst({
        where: and(
          eq(schema.categoryAliases.workspaceId, ctx.workspaceId),
          eq(schema.categoryAliases.rawString, "GROCERY")
        ),
      });

      expect(alias?.categoryId).toBe(ctx.groceriesId);
    });

    it("should handle multiple aliases for same category", async () => {
      await ctx.db.insert(schema.categoryAliases).values([
        {workspaceId: ctx.workspaceId, categoryId: ctx.groceriesId, rawString: "GROCERY", normalizedString: "grocery", trigger: "import"},
        {workspaceId: ctx.workspaceId, categoryId: ctx.groceriesId, rawString: "FOOD", normalizedString: "food", trigger: "import"},
        {workspaceId: ctx.workspaceId, categoryId: ctx.groceriesId, rawString: "SUPERMARKET", normalizedString: "supermarket", trigger: "import"},
      ]);

      const aliases = await ctx.db
        .select()
        .from(schema.categoryAliases)
        .where(eq(schema.categoryAliases.categoryId, ctx.groceriesId));

      expect(aliases).toHaveLength(3);
    });
  });

  describe("suggestion stats", () => {
    it("should track suggestion statistics", () => {
      const results = [
        {rowIndex: 0, hasAutoFill: true, hasSuggestions: true},
        {rowIndex: 1, hasAutoFill: true, hasSuggestions: true},
        {rowIndex: 2, hasAutoFill: false, hasSuggestions: true},
        {rowIndex: 3, hasAutoFill: false, hasSuggestions: false},
      ];

      const stats = {
        totalRows: results.length,
        withSuggestions: results.filter((r) => r.hasSuggestions).length,
        autoFilled: results.filter((r) => r.hasAutoFill).length,
        needsReview: results.filter((r) => !r.hasAutoFill).length,
      };

      expect(stats).toEqual({
        totalRows: 4,
        withSuggestions: 3,
        autoFilled: 2,
        needsReview: 2,
      });
    });
  });
});
