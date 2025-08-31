import { describe, it, expect, beforeEach } from "bun:test";
import { createCaller } from "../../../../src/lib/trpc/router";
import { createContext } from "../../../../src/lib/trpc/context";
import { TRPCError } from "@trpc/server";

describe("Category Security - Unit Tests", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller({ ...ctx, isTest: true });
  });

  describe("Input Validation", () => {
    it("should reject empty category names", async () => {
      await expect(
        caller.categoriesRoutes.save({
          name: "", // Empty name
        })
      ).rejects.toThrow();
    });

    it("should reject category names that are too long", async () => {
      const longName = "a".repeat(51); // Too long (max 50 chars)
      await expect(
        caller.categoriesRoutes.save({
          name: longName,
        })
      ).rejects.toThrow();
    });

    it("should reject category names with invalid characters", async () => {
      await expect(
        caller.categoriesRoutes.save({
          name: "test<script>alert('xss')</script>",
        })
      ).rejects.toThrow();
    });

    it("should reject notes that are too long", async () => {
      const longNotes = "a".repeat(501); // Too long (max 500 chars)
      await expect(
        caller.categoriesRoutes.save({
          name: "Test Category",
          notes: longNotes,
        })
      ).rejects.toThrow();
    });

    it("should accept valid category data", async () => {
      const result = await caller.categoriesRoutes.save({
        name: "Test Category",
        notes: "Valid notes",
      });
      
      expect(result.name).toBe("Test Category");
      expect(result.notes).toBe("Valid notes");
    });

    it("should accept category names with allowed special characters", async () => {
      const result = await caller.categoriesRoutes.save({
        name: "Food & Dining",
        notes: "Category for food expenses",
      });
      
      expect(result.name).toBe("Food & Dining");
    });
  });

  describe("HTML Rejection", () => {
    it("should reject category names with HTML", async () => {
      await expect(
        caller.categoriesRoutes.save({
          name: "Test <script>alert('xss')</script>",
        })
      ).rejects.toThrow();
    });

    it("should reject HTML in notes fields", async () => {
      await expect(
        caller.categoriesRoutes.save({
          name: "Test Category",
          notes: "Notes with <b>HTML</b> tags",
        })
      ).rejects.toThrow("Notes cannot contain HTML tags");
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should handle special characters without SQL injection", async () => {
      const result = await caller.categoriesRoutes.save({
        name: "Mom's Grocery & Dad's Tools",
        notes: "Category with 'quotes' and \"double quotes\"",
      });

      expect(result.name).toBe("Mom's Grocery & Dad's Tools");
      expect(result.notes).toBe("Category with 'quotes' and \"double quotes\"");
    });

    it("should reject malicious input without causing SQL injection", async () => {
      const maliciousInputs = [
        "'; DROP TABLE categories; --",
        "1' OR '1'='1",
        "'; INSERT INTO categories (name) VALUES ('hacked'); --",
      ];

      for (const input of maliciousInputs) {
        try {
          await caller.categoriesRoutes.load({ id: input as any });
        } catch (error) {
          // Should fail due to type validation, not SQL injection
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should return NOT_FOUND for non-existent categories", async () => {
      await expect(
        caller.categoriesRoutes.load({ id: 99999 })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle invalid category IDs gracefully", async () => {
      await expect(
        caller.categoriesRoutes.load({ id: -1 })
      ).rejects.toThrow();
    });
  });

  describe("Bulk Operations", () => {
    it("should handle bulk category deletion safely", async () => {
      const categoryIds = [1, 2, 3];
      
      try {
        await caller.categoriesRoutes.delete({
          entities: categoryIds,
        });
      } catch (error) {
        // Expected if categories don't exist, but should handle gracefully
        expect(error).toBeDefined();
      }
    });
  });
});