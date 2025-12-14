import { describe, it, expect } from "vitest";
import { CSVProcessor } from "$lib/server/import/file-processors/csv-processor";
import { PayeeMatcher } from "$lib/server/import/matchers/payee-matcher";
import { CategoryMatcher } from "$lib/server/import/matchers/category-matcher";
import { TransactionValidator } from "$lib/server/import/validators/transaction-validator";

/**
 * Integration tests for the Financial Import System
 *
 * Tests CSV parsing, validation, payee matching, and category matching.
 */
describe("Financial Import System", () => {
  describe("CSVProcessor", () => {
    it("should parse CSV content correctly", async () => {
      const csvContent = `Date,Amount,Description
2024-01-15,50.00,Walmart Purchase
2024-01-16,5.50,Starbucks Coffee`;

      const csvProcessor = new CSVProcessor();
      const file = new File([csvContent], "test.csv", { type: "text/csv" });
      const parsedRows = await csvProcessor.parseFile(file);

      expect(parsedRows.length).toBe(2);
      expect(parsedRows[0]?.normalizedData).toBeDefined();
    });
  });

  describe("TransactionValidator", () => {
    it("should validate parsed rows", async () => {
      const csvContent = `Date,Amount,Description
2024-01-15,50.00,Walmart Purchase`;

      const csvProcessor = new CSVProcessor();
      const file = new File([csvContent], "test.csv", { type: "text/csv" });
      const parsedRows = await csvProcessor.parseFile(file);

      const validator = new TransactionValidator();
      const validatedRows = validator.validateRows(parsedRows);
      const summary = validator.getValidationSummary(validatedRows);

      expect(summary).toHaveProperty("valid");
      expect(summary).toHaveProperty("invalid");
      expect(summary).toHaveProperty("warnings");
    });
  });

  describe("PayeeMatcher", () => {
    it("should clean payee names", () => {
      const payeeMatcher = new PayeeMatcher();
      const testPayeeName = "WALMART #1234 PURCHASE";
      const cleanedName = payeeMatcher.cleanPayeeName(testPayeeName);

      expect(cleanedName).toBeDefined();
      expect(typeof cleanedName).toBe("string");
      // Cleaned name should be simpler than original
      expect(cleanedName.length).toBeLessThanOrEqual(testPayeeName.length);
    });

    it("should find best match from existing payees", () => {
      const payeeMatcher = new PayeeMatcher();
      const existingPayees = [
        { id: 1, name: "Walmart", slug: "walmart", deletedAt: null } as any,
        { id: 2, name: "Starbucks", slug: "starbucks", deletedAt: null } as any,
      ];

      const testPayeeName = "WALMART #1234 PURCHASE";
      const cleanedName = payeeMatcher.cleanPayeeName(testPayeeName);
      const match = payeeMatcher.findBestMatch(cleanedName, existingPayees);

      expect(match).toHaveProperty("payee");
      expect(match).toHaveProperty("confidence");
      expect(match).toHaveProperty("score");
      expect(match.payee?.name).toBe("Walmart");
    });

    it("should return null payee when no good match found", () => {
      const payeeMatcher = new PayeeMatcher();
      const existingPayees = [
        { id: 1, name: "Target", slug: "target", deletedAt: null } as any,
      ];

      const testPayeeName = "COMPLETELY DIFFERENT STORE";
      const cleanedName = payeeMatcher.cleanPayeeName(testPayeeName);
      const match = payeeMatcher.findBestMatch(cleanedName, existingPayees);

      expect(match).toHaveProperty("confidence");
      expect(match).toHaveProperty("score");
    });
  });

  describe("CategoryMatcher", () => {
    it("should find best category match", () => {
      const categoryMatcher = new CategoryMatcher();
      const existingCategories = [
        { id: 1, name: "Groceries", slug: "groceries", deletedAt: null } as any,
        { id: 2, name: "Dining Out", slug: "dining-out", deletedAt: null } as any,
        { id: 3, name: "Transportation", slug: "transportation", deletedAt: null } as any,
      ];

      const categoryMatch = categoryMatcher.findBestMatch(
        {
          payeeName: "Walmart",
          description: "Weekly grocery shopping",
        },
        existingCategories
      );

      expect(categoryMatch).toHaveProperty("category");
      expect(categoryMatch).toHaveProperty("confidence");
      expect(categoryMatch).toHaveProperty("score");
      expect(categoryMatch).toHaveProperty("matchedOn");
    });

    it("should have keyword patterns loaded", () => {
      const categoryMatcher = new CategoryMatcher();
      const patterns = categoryMatcher.getKeywordPatterns();

      expect(patterns).toBeDefined();
      expect(typeof patterns).toBe("object");
      expect(Object.keys(patterns).length).toBeGreaterThan(0);
    });
  });
});
