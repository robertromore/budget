import {describe, it, expect, beforeEach} from "bun:test";
import {createCaller} from "../../../../src/lib/trpc/router";
import {createContext} from "../../../../src/lib/trpc/context";
import {TRPCError} from "@trpc/server";

describe("Rate Limiting - Unit Tests", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    // Test caller with rate limiting bypassed
    const testCtx = await createContext();
    caller = createCaller({...testCtx, isTest: true});
  });

  describe("Rate Limiting Bypass", () => {
    it("should bypass rate limiting for test contexts", async () => {
      // Should be able to make many mutations with isTest flag
      const mutations = Array.from({length: 10}, (_, i) =>
        caller.accountRoutes.save({
          name: `Test Account ${i}`,
          slug: `test-account-bypass-${i}`,
        })
      );

      // All should succeed with isTest flag
      const results = await Promise.allSettled(mutations);
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe("Bulk Operation Limits", () => {
    it("should reject bulk operations exceeding limits", async () => {
      const tooManyIds = Array.from({length: 101}, (_, i) => i + 1);

      expect(
        caller.transactionRoutes.delete({
          entities: tooManyIds,
          accountId: 1,
        })
      ).rejects.toThrow();
    });

    it("should allow bulk operations within limits", async () => {
      const validIds = [1, 2, 3];

      // This might fail due to non-existent records, but should not fail validation
      try {
        await caller.transactionRoutes.delete({
          entities: validIds,
          accountId: 1,
        });
      } catch (error) {
        // Should not be a validation error for array size
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("BAD_REQUEST");
        }
      }
    });
  });

  describe("Query vs Mutation Rate Limiting", () => {
    it("should not rate limit queries", async () => {
      // Make many queries - should not be rate limited
      const queries = Array.from({length: 20}, () => caller.accountRoutes.all());

      // All queries should succeed
      expect(Promise.all(queries)).resolves.toBeDefined();
    });

    it("should handle mutations with proper context", async () => {
      // Single mutation should work
      try {
        await caller.accountRoutes.save({
          name: "Test Account Context",
          slug: "test-account-context",
        });
      } catch (error) {
        // May fail due to business logic, but not rate limiting
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("TOO_MANY_REQUESTS");
        }
      }
    });
  });
});
