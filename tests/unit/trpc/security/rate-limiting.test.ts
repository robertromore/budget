import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCaller } from "../../../../src/lib/trpc/router";
import { createContext } from "../../../../src/lib/trpc/context";
import { TRPCError } from "@trpc/server";

describe("Rate Limiting - Unit Tests", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller(ctx);
    
    // Reset any rate limiting state between tests
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe("Mutation Rate Limits", () => {
    it("should allow mutations within rate limits", async () => {
      // First few mutations should succeed
      await expect(
        caller.accountRoutes.save({
          name: "Test Account 1",
          slug: "test-account-1",
        })
      ).resolves.toBeDefined();

      await expect(
        caller.accountRoutes.save({
          name: "Test Account 2", 
          slug: "test-account-2",
        })
      ).resolves.toBeDefined();
    });

    it("should enforce rate limits after threshold", async () => {
      // Create many mutations to hit the rate limit
      const mutations = Array.from({ length: 35 }, (_, i) =>
        caller.accountRoutes.save({
          name: `Test Account ${i}`,
          slug: `test-account-${i}`,
        })
      );

      // First 30 should succeed, then rate limiting should kick in
      let rateLimitError = false;
      try {
        await Promise.all(mutations);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") {
          rateLimitError = true;
        }
      }

      // Should eventually hit rate limit
      expect(rateLimitError).toBe(true);
    });

    it("should reset rate limits after time window", async () => {
      // Hit rate limit
      const mutations = Array.from({ length: 31 }, (_, i) =>
        caller.accountRoutes.save({
          name: `Test Account ${i}`,
          slug: `test-account-${i}`,
        }).catch(() => null) // Ignore rate limit errors
      );

      await Promise.allSettled(mutations);

      // Advance time by 61 seconds (past the 60 second window)
      vi.advanceTimersByTime(61000);

      // Should be able to make mutations again
      await expect(
        caller.accountRoutes.save({
          name: "Test Account After Reset",
          slug: "test-account-after-reset",
        })
      ).resolves.toBeDefined();
    });
  });

  describe("Bulk Operation Limits", () => {
    it("should reject bulk operations exceeding limits", async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => i + 1);
      
      await expect(
        caller.transactionRoutes.delete({
          entities: tooManyIds,
          accountId: 1,
        })
      ).rejects.toThrow();
    });

    it("should allow bulk operations within limits", async () => {
      const validIds = [1, 2, 3];
      
      // This might fail due to non-existent records, but should not fail rate limiting
      try {
        await caller.transactionRoutes.delete({
          entities: validIds,
          accountId: 1,
        });
      } catch (error) {
        // Should not be a rate limiting error
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("TOO_MANY_REQUESTS");
        }
      }
    });
  });

  describe("Query vs Mutation Rate Limiting", () => {
    it("should not rate limit queries", async () => {
      // Make many queries - should not be rate limited
      const queries = Array.from({ length: 50 }, () =>
        caller.accountRoutes.all()
      );

      // All queries should succeed
      await expect(Promise.all(queries)).resolves.toBeDefined();
    });

    it("should only rate limit mutations", async () => {
      // Make many queries first
      await Promise.all(
        Array.from({ length: 20 }, () => caller.accountRoutes.all())
      );

      // Then mutations should still work within their own limits
      await expect(
        caller.accountRoutes.save({
          name: "Test Account After Queries",
          slug: "test-account-after-queries",
        })
      ).resolves.toBeDefined();
    });
  });
});