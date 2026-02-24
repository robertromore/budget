import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {createCaller} from "../../../src/lib/trpc/router";
import {TRPCError} from "@trpc/server";
import {setupTestDb, clearTestDb, seedTestData} from "../setup/test-db";

describe("Rate Limiting Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let callerWithoutRateLimit: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    db = await setupTestDb();

    // Create caller with rate limiting (for testing rate limits)
    const ctx = {
      db,
      userId: "system-test-user",
      sessionId: `rate-limit-session-${Date.now()}-${Math.random()}`,
      workspaceId: 1,
    };
    caller = createCaller(ctx as any);

    // Create caller without rate limiting (for setup operations)
    const testCtx = {db, isTest: true};
    callerWithoutRateLimit = createCaller(testCtx as any);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  describe("Rate Limiting Bypass for Tests", () => {
    it("should allow operations without rate limits when isTest flag is set", async () => {
      // Run many mutation operations that would normally trigger rate limiting.
      // Keep writes sequential to avoid SQLite lock contention in full-suite runs.
      const results = [];
      for (let i = 0; i < 35; i++) {
        const result = await callerWithoutRateLimit.viewsRoutes.save({
          name: `Bypass View ${i}`,
        });
        results.push(result);
      }

      results.forEach((result, index) => {
        expect(result.name).toBe(`Bypass View ${index}`);
      });
      expect(results.length).toBe(35);
    });

    it("should enforce rate limits when not in test mode", async () => {
      // This test verifies rate limiting is working for non-test contexts
      // We'll create a reasonable number of operations and expect some to fail
      const operations = [];

      // Create operations that will likely exceed the rate limit (30 per minute)
      for (let i = 0; i < 35; i++) {
        operations.push(
          caller.viewsRoutes
            .save({
              name: `Rate Limited View ${i}`,
            })
            .catch((error) => ({error, index: i}))
        );
      }

      const results = await Promise.allSettled(operations);

      // Some operations should succeed, some should fail with rate limiting
      let successCount = 0;
      let rateLimitCount = 0;

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if ("error" in result.value) {
            const error = result.value.error;
            if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") {
              rateLimitCount++;
            }
          } else {
            successCount++;
          }
        }
      });

      // Expect some successful operations (within rate limit)
      expect(successCount).toBeGreaterThan(0);
      // Expect some rate limited operations
      expect(rateLimitCount).toBeGreaterThan(0);
      // Total should match our operation count
      expect(successCount + rateLimitCount).toBe(35);
    });

    it("should not rate limit query operations", async () => {
      // Make many query operations - should not be rate limited
      const queryOperations = [];
      for (let i = 0; i < 50; i++) {
        queryOperations.push(caller.viewsRoutes.all());
      }

      const results = await Promise.allSettled(queryOperations);

      // All queries should succeed (queries aren't rate limited)
      results.forEach((result) => {
        expect(result.status).toBe("fulfilled");
      });
    });
  });

  describe("Rate Limiting Error Messages", () => {
    it("should provide helpful error messages when rate limited", async () => {
      // Hit rate limit quickly
      const operations = [];
      for (let i = 0; i < 35; i++) {
        operations.push(
          caller.viewsRoutes
            .save({
              name: `Rate Limit Test ${i}`,
            })
            .catch((error) => error)
        );
      }

      const results = await Promise.allSettled(operations);

      // Find a rate limit error
      const rateLimitError = results
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .find((result) => result instanceof TRPCError && result.code === "TOO_MANY_REQUESTS");

      if (rateLimitError) {
        expect(rateLimitError.message).toMatch(/rate limit|too many requests|try again/i);
      }
    });
  });

  describe("Mixed Operations", () => {
    it("should handle basic mixed CRUD operations", async () => {
      const {accounts} = await seedTestData(db);

      // Simple mixed operations test - just verify basic functionality works
      const createResult = await callerWithoutRateLimit.accountRoutes.save({
        name: "Mixed Create Test",
        slug: "mixed-create-test",
      });

      expect(createResult.name).toBe("Mixed Create Test");

      // Update operation
      const updateResult = await callerWithoutRateLimit.accountRoutes.save({
        id: accounts[0].id,
        name: accounts[0].name,
        notes: "Updated notes",
      });

      expect(updateResult.notes).toBe("Updated notes");

      // Delete operation
      const deleteResult = await callerWithoutRateLimit.accountRoutes.remove({
        id: createResult.id,
      });

      expect(deleteResult.deletedAt).toBeDefined();
    });
  });
});
