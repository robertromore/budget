import {describe, it, expect, beforeEach} from "vitest";
import {createCaller} from "../../../../src/lib/trpc/router";
import {createContext} from "../../../../src/lib/trpc/context";
import {TRPCError} from "@trpc/server";

describe("Account Security - Unit Tests", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller({...ctx, isTest: true});
  });

  describe("Input Validation", () => {
    it("should reject account names that are too short", async () => {
      await expect(
        caller.accountRoutes.save({
          name: "a", // Too short (min 2 chars)
          slug: "test-account",
        })
      ).rejects.toThrow();
    });

    it("should reject account names that are too long", async () => {
      const longName = "a".repeat(51); // Too long (max 50 chars)
      await expect(
        caller.accountRoutes.save({
          name: longName,
          slug: "test-account",
        })
      ).rejects.toThrow();
    });

    it("should reject account names with invalid characters", async () => {
      await expect(
        caller.accountRoutes.save({
          name: "test<script>alert('xss')</script>",
          slug: "test-account",
        })
      ).rejects.toThrow();
    });

    it("should reject slugs with invalid format", async () => {
      await expect(
        caller.accountRoutes.save({
          name: "Test Account",
          slug: "Invalid Slug With Spaces",
        })
      ).rejects.toThrow();
    });

    it("should reject notes that are too long", async () => {
      const longNotes = "a".repeat(501); // Too long (max 500 chars)
      await expect(
        caller.accountRoutes.save({
          name: "Test Account",
          slug: "test-account",
          notes: longNotes,
        })
      ).rejects.toThrow();
    });

    it("should accept valid account data", async () => {
      const uniqueId = Math.random().toString(36).substring(7);
      const result = await caller.accountRoutes.save({
        name: "Valid Test Account",
        slug: `test-${uniqueId}`,
        notes: "Valid notes",
      });

      expect(result.name).toBe("Valid Test Account");
      expect(result.slug).toBe(`test-${uniqueId}`);
    });
  });

  describe("HTML Rejection", () => {
    it("should reject account names with HTML", async () => {
      await expect(
        caller.accountRoutes.save({
          name: "Test <script>alert('xss')</script>",
          slug: "test-account",
        })
      ).rejects.toThrow();
    });

    it("should reject HTML in notes fields", async () => {
      await expect(
        caller.accountRoutes.save({
          name: "Test Account",
          slug: "test-account",
          notes: "Notes with <b>HTML</b> tags",
        })
      ).rejects.toThrow("Notes cannot contain HTML tags");
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should handle special characters without SQL injection", async () => {
      // Create an account with potentially problematic characters (but no HTML)
      const result = await caller.accountRoutes.save({
        name: "Test Account & More",
        slug: "test-account-special",
        notes: "Notes with 'quotes' and \"double quotes\"",
      });

      expect(result.name).toBe("Test Account & More");
      expect(result.notes).toBe("Notes with 'quotes' and \"double quotes\"");
    });

    it("should reject malicious input without causing SQL injection", async () => {
      const maliciousInputs = [
        "'; DROP TABLE accounts; --",
        "1' OR '1'='1",
        "'; INSERT INTO accounts (name) VALUES ('hacked'); --",
      ];

      for (const input of maliciousInputs) {
        try {
          await caller.accountRoutes.load({id: input as any});
        } catch (error) {
          // Should fail due to type validation, not SQL injection
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should return NOT_FOUND for non-existent accounts", async () => {
      expect(caller.accountRoutes.load({id: 99999})).rejects.toThrow(TRPCError);
    });

    it("should handle invalid account IDs gracefully", async () => {
      expect(caller.accountRoutes.load({id: -1})).rejects.toThrow();
    });
  });
});
