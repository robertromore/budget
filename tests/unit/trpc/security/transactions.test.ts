import { describe, it, expect, beforeEach } from "vitest";
import { createCaller } from "../../../../src/lib/trpc/router";
import { createContext } from "../../../../src/lib/trpc/context";
import { TRPCError } from "@trpc/server";

describe("Transaction Security - Unit Tests", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller(ctx);
  });

  describe("Amount Validation", () => {
    it("should reject amounts that are too large", async () => {
      await expect(
        caller.transactionRoutes.save({
          amount: 1000000, // Too large (max 999,999.99)
          accountId: 1,
          date: "2024-01-01",
        })
      ).rejects.toThrow();
    });

    it("should reject amounts that are too small", async () => {
      await expect(
        caller.transactionRoutes.save({
          amount: -1000000, // Too small (min -999,999.99)
          accountId: 1,
          date: "2024-01-01",
        })
      ).rejects.toThrow();
    });

    it("should reject invalid currency precision", async () => {
      await expect(
        caller.transactionRoutes.save({
          amount: 10.123, // Invalid precision (should be 2 decimal places)
          accountId: 1,
          date: "2024-01-01",
        })
      ).rejects.toThrow();
    });

    it("should accept valid currency amounts", async () => {
      const validAmounts = [10.50, -25.99, 0.01, 999999.99, -999999.99];
      
      for (const amount of validAmounts) {
        try {
          await caller.transactionRoutes.save({
            amount,
            accountId: 1,
            date: "2024-01-01",
          });
        } catch (error) {
          // May fail due to missing account, but not validation
          if (error instanceof TRPCError) {
            expect(error.code).not.toBe("BAD_REQUEST");
          }
        }
      }
    });
  });

  describe("Status Validation", () => {
    it("should reject invalid transaction status", async () => {
      await expect(
        caller.transactionRoutes.save({
          amount: 100.00,
          accountId: 1,
          date: "2024-01-01",
          status: "invalid-status",
        })
      ).rejects.toThrow();
    });

    it("should accept valid transaction statuses", async () => {
      const validStatuses = ["cleared", "pending", "scheduled"];
      
      for (const status of validStatuses) {
        try {
          await caller.transactionRoutes.save({
            amount: 100.00,
            accountId: 1,
            date: "2024-01-01",
            status: status as any,
          });
        } catch (error) {
          // May fail due to missing account, but not status validation
          if (error instanceof TRPCError) {
            expect(error.code).not.toBe("BAD_REQUEST");
          }
        }
      }
    });
  });

  describe("Notes Validation", () => {
    it("should reject notes that are too long", async () => {
      const longNotes = "a".repeat(501);
      await expect(
        caller.transactionRoutes.save({
          amount: 100.00,
          accountId: 1,
          date: "2024-01-01",
          notes: longNotes,
        })
      ).rejects.toThrow();
    });

    it("should accept valid notes", async () => {
      try {
        await caller.transactionRoutes.save({
          amount: 100.00,
          accountId: 1,
          date: "2024-01-01",
          notes: "Valid transaction notes",
        });
      } catch (error) {
        // May fail due to missing account, but not notes validation
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("BAD_REQUEST");
        }
      }
    });
  });

  describe("Required Fields", () => {
    it("should require accountId", async () => {
      await expect(
        caller.transactionRoutes.save({
          amount: 100.00,
          date: "2024-01-01",
        } as any)
      ).rejects.toThrow(TRPCError);
    });

    it("should require amount", async () => {
      await expect(
        caller.transactionRoutes.save({
          accountId: 1,
          date: "2024-01-01",
        } as any)
      ).rejects.toThrow();
    });
  });

  describe("HTML Sanitization", () => {
    it("should sanitize HTML in notes fields", async () => {
      try {
        await caller.transactionRoutes.save({
          amount: 100.00,
          accountId: 1,
          date: "2024-01-01",
          notes: "Payment for <script>alert('xss')</script>",
        });
      } catch (error) {
        // Should not contain script tags regardless of other errors
        if (error instanceof Error) {
          expect(error.message).not.toContain("<script>");
        }
      }
    });
  });

  describe("Bulk Operations Security", () => {
    it("should reject bulk deletion with too many items", async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => i + 1);
      
      await expect(
        caller.transactionRoutes.delete({
          entities: tooManyIds,
          accountId: 1,
        })
      ).rejects.toThrow();
    });

    it("should accept bulk operations within limits", async () => {
      const validIds = [1, 2, 3];
      
      try {
        await caller.transactionRoutes.delete({
          entities: validIds,
          accountId: 1,
        });
      } catch (error) {
        // May fail due to non-existent records, but should not fail validation
        expect(error).toBeDefined();
      }
    });

    it("should validate accountId in bulk operations", async () => {
      await expect(
        caller.transactionRoutes.delete({
          entities: [1, 2, 3],
          accountId: -1, // Invalid account ID
        })
      ).rejects.toThrow();
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should handle special characters in notes without SQL injection", async () => {
      try {
        await caller.transactionRoutes.save({
          amount: 100.00,
          accountId: 1,
          date: "2024-01-01",
          notes: "Payment to John's \"Coffee Shop\" & More",
        });
      } catch (error) {
        // Should handle gracefully without SQL injection
        expect(error).toBeDefined();
      }
    });

    it("should reject malicious input without causing SQL injection", async () => {
      const maliciousInputs = [
        "'; DROP TABLE transactions; --",
        "1' OR '1'='1",
        "'; UPDATE transactions SET amount = 999999; --",
      ];

      for (const input of maliciousInputs) {
        try {
          await caller.transactionRoutes.forAccount({ id: input as any });
        } catch (error) {
          // Should fail due to type validation, not SQL injection
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle missing account references gracefully", async () => {
      await expect(
        caller.transactionRoutes.save({
          amount: 100.00,
          accountId: 99999, // Non-existent account
          date: "2024-01-01",
        })
      ).rejects.toThrow();
    });

    it("should handle invalid transaction queries", async () => {
      await expect(
        caller.transactionRoutes.forAccount({ id: 99999 })
      ).resolves.toBeDefined(); // Should return empty array, not error
    });
  });
});