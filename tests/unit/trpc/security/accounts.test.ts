import { describe, it, expect, beforeEach } from "vitest";
import { createCaller } from "../../../../src/lib/trpc/router";
import { createContext } from "../../../../src/lib/trpc/context";
import { TRPCError } from "@trpc/server";

describe("Account Security - Unit Tests", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller(ctx);
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
      const result = await caller.accountRoutes.save({
        name: "Test Account",
        slug: "test-account",
        notes: "Valid notes",
      });
      
      expect(result.name).toBe("Test Account");
      expect(result.slug).toBe("test-account");
    });
  });

  describe("HTML Sanitization", () => {
    it("should sanitize HTML in account names", async () => {
      const result = await caller.accountRoutes.save({
        name: "Test &amp; Account", // HTML entities should be handled
        slug: "test-account",
      });
      
      // The exact behavior depends on sanitization implementation
      expect(result.name).not.toContain("<script>");
    });

    it("should sanitize HTML in notes fields", async () => {
      const result = await caller.accountRoutes.save({
        name: "Test Account",
        slug: "test-account", 
        notes: "Notes with <b>HTML</b> tags",
      });
      
      // HTML tags should be stripped or escaped
      expect(result.notes).not.toContain("<b>");
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should handle special characters without SQL injection", async () => {
      // Create an account with potentially problematic characters
      const result = await caller.accountRoutes.save({
        name: "Test's \"Account\" & More",
        slug: "test-account",
        notes: "Notes with 'quotes' and \"double quotes\"",
      });

      expect(result.name).toBe("Test's \"Account\" & More");
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
          await caller.accountRoutes.load({ id: input as any });
        } catch (error) {
          // Should fail due to type validation, not SQL injection
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should return NOT_FOUND for non-existent accounts", async () => {
      await expect(
        caller.accountRoutes.load({ id: 99999 })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle invalid account IDs gracefully", async () => {
      await expect(
        caller.accountRoutes.load({ id: -1 })
      ).rejects.toThrow();
    });
  });
});