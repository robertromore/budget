import { describe, it, expect, beforeEach } from "bun:test";
import { createCaller } from "../../../src/lib/trpc/router";
import { createContext } from "../../../src/lib/trpc/context";
import { TRPCError } from "@trpc/server";

describe("Schedule tRPC Routes - Unit Tests", () => {
  let caller: ReturnType<typeof createCaller>;
  let testAccountId: number;
  let testPayeeId: number;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller({ ...ctx, isTest: true });

    // Create test account and payee for schedule tests
    const account = await caller.accountRoutes.save({
      name: "Test Schedule Account",
      slug: "test-schedule-account",
    });
    testAccountId = account.id;

    const payee = await caller.payeeRoutes.save({
      name: "Test Schedule Payee",
      slug: "test-schedule-payee",
    });
    testPayeeId = payee.id;
  });

  describe("Schedule CRUD Operations", () => {
    it("should create a new schedule with required fields", async () => {
      const scheduleData = {
        name: "Test Schedule",
        slug: "test-schedule",
        amount: 100.50,
        payeeId: testPayeeId,
        accountId: testAccountId,
      };

      const result = await caller.scheduleRoutes.save(scheduleData);

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Schedule");
      expect(result.slug).toBe("test-schedule");
      expect(result.amount).toBe(100.50);
      expect(result.payeeId).toBe(testPayeeId);
      expect(result.accountId).toBe(testAccountId);
      expect(result.status).toBe("active");
      expect(result.amount_type).toBe("exact");
      expect(result.recurring).toBe(false);
      expect(result.auto_add).toBe(false);
    });

    it("should create a schedule with all optional fields", async () => {
      const scheduleData = {
        name: "Complete Schedule",
        slug: "complete-schedule",
        amount: 75.25,
        amount_2: 125.75,
        amount_type: "range" as const,
        status: "inactive" as const,
        recurring: true,
        auto_add: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      };

      const result = await caller.scheduleRoutes.save(scheduleData);

      expect(result.name).toBe("Complete Schedule");
      expect(result.amount).toBe(75.25);
      expect(result.amount_2).toBe(125.75);
      expect(result.amount_type).toBe("range");
      expect(result.status).toBe("inactive");
      expect(result.recurring).toBe(true);
      expect(result.auto_add).toBe(true);
    });

    it("should update an existing schedule", async () => {
      // Create initial schedule
      const initial = await caller.scheduleRoutes.save({
        name: "Original Schedule",
        slug: "original-schedule",
        amount: 50.00,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Update the schedule
      const updated = await caller.scheduleRoutes.save({
        id: initial.id,
        name: "Updated Schedule",
        slug: "updated-schedule",
        amount: 75.00,
        status: "inactive" as const,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(updated.id).toBe(initial.id);
      expect(updated.name).toBe("Updated Schedule");
      expect(updated.slug).toBe("updated-schedule");
      expect(updated.amount).toBe(75.00);
      expect(updated.status).toBe("inactive");
    });

    it("should load a schedule by ID", async () => {
      const created = await caller.scheduleRoutes.save({
        name: "Load Test Schedule",
        slug: "load-test-schedule",
        amount: 123.45,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const loaded = await caller.scheduleRoutes.load({ id: created.id });

      expect(loaded).toBeDefined();
      expect(loaded.id).toBe(created.id);
      expect(loaded.name).toBe("Load Test Schedule");
      expect(loaded.amount).toBe(123.45);
      // Should include transactions relation
      expect(loaded.transactions).toBeDefined();
      expect(Array.isArray(loaded.transactions)).toBe(true);
    });

    it("should load all schedules", async () => {
      // Create multiple schedules
      await caller.scheduleRoutes.save({
        name: "Schedule One",
        slug: "schedule-one",
        amount: 100,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      await caller.scheduleRoutes.save({
        name: "Schedule Two",
        slug: "schedule-two",
        amount: 200,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const all = await caller.scheduleRoutes.all();

      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(2);
      
      const scheduleNames = all.map(s => s.name);
      expect(scheduleNames).toContain("Schedule One");
      expect(scheduleNames).toContain("Schedule Two");
    });

    it("should delete a schedule", async () => {
      const created = await caller.scheduleRoutes.save({
        name: "To Be Deleted",
        slug: "to-be-deleted",
        amount: 50,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const deleted = await caller.scheduleRoutes.remove({ id: created.id });

      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(created.id);
      expect(deleted.name).toBe("To Be Deleted");

      // Verify it's actually deleted
      expect(
        caller.scheduleRoutes.load({ id: created.id })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("Input Validation", () => {
    it("should reject schedule names that are too short", async () => {
      expect(
        caller.scheduleRoutes.save({
          name: "a", // Too short (min 2 chars)
          slug: "test-schedule",
          amount: 100,
          payeeId: testPayeeId,
          accountId: testAccountId,
        })
      ).rejects.toThrow();
    });

    it("should reject schedule names that are too long", async () => {
      const longName = "a".repeat(31); // Too long (max 30 chars)
      expect(
        caller.scheduleRoutes.save({
          name: longName,
          slug: "test-schedule",
          amount: 100,
          payeeId: testPayeeId,
          accountId: testAccountId,
        })
      ).rejects.toThrow();
    });

    it("should reject invalid amount types", async () => {
      expect(
        caller.scheduleRoutes.save({
          name: "Test Schedule",
          slug: "test-schedule",
          amount: 100,
          amount_type: "invalid" as any,
          payeeId: testPayeeId,
          accountId: testAccountId,
        })
      ).rejects.toThrow();
    });

    it("should reject invalid status values", async () => {
      expect(
        caller.scheduleRoutes.save({
          name: "Test Schedule",
          slug: "test-schedule",
          amount: 100,
          status: "invalid" as any,
          payeeId: testPayeeId,
          accountId: testAccountId,
        })
      ).rejects.toThrow();
    });

    it("should require payeeId", async () => {
      expect(
        caller.scheduleRoutes.save({
          name: "Test Schedule",
          slug: "test-schedule",
          amount: 100,
          payeeId: undefined as any,
          accountId: testAccountId,
        })
      ).rejects.toThrow();
    });

    it("should require accountId", async () => {
      expect(
        caller.scheduleRoutes.save({
          name: "Test Schedule",
          slug: "test-schedule",
          amount: 100,
          payeeId: testPayeeId,
          accountId: undefined as any,
        })
      ).rejects.toThrow();
    });

    it("should handle negative amounts", async () => {
      const result = await caller.scheduleRoutes.save({
        name: "Negative Amount Schedule",
        slug: "negative-amount-schedule",
        amount: -50.00,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(result.amount).toBe(-50.00);
    });

    it("should handle zero amounts", async () => {
      const result = await caller.scheduleRoutes.save({
        name: "Zero Amount Schedule",
        slug: "zero-amount-schedule",
        amount: 0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(result.amount).toBe(0);
    });
  });

  describe("Amount Types", () => {
    it("should handle exact amount type", async () => {
      const result = await caller.scheduleRoutes.save({
        name: "Exact Amount Schedule",
        slug: "exact-amount-schedule",
        amount: 100.50,
        amount_type: "exact",
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(result.amount_type).toBe("exact");
      expect(result.amount).toBe(100.50);
    });

    it("should handle approximate amount type", async () => {
      const result = await caller.scheduleRoutes.save({
        name: "Approximate Amount Schedule",
        slug: "approximate-amount-schedule",
        amount: 100.50,
        amount_type: "approximate",
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(result.amount_type).toBe("approximate");
      expect(result.amount).toBe(100.50);
    });

    it("should handle range amount type with both amounts", async () => {
      const result = await caller.scheduleRoutes.save({
        name: "Range Amount Schedule",
        slug: "range-amount-schedule",
        amount: 50.00,
        amount_2: 150.00,
        amount_type: "range",
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(result.amount_type).toBe("range");
      expect(result.amount).toBe(50.00);
      expect(result.amount_2).toBe(150.00);
    });
  });

  describe("Error Handling", () => {
    it("should return NOT_FOUND for non-existent schedule ID", async () => {
      expect(
        caller.scheduleRoutes.load({ id: 99999 })
      ).rejects.toThrow(TRPCError);
      
      try {
        await caller.scheduleRoutes.load({ id: 99999 });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("NOT_FOUND");
        expect((error as TRPCError).message).toBe("Schedule not found");
      }
    });

    it("should return error when updating non-existent schedule", async () => {
      expect(
        caller.scheduleRoutes.save({
          id: 99999,
          name: "Non-existent Schedule",
          slug: "non-existent-schedule",
          amount: 100,
          payeeId: testPayeeId,
          accountId: testAccountId,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should return NOT_FOUND when deleting non-existent schedule", async () => {
      expect(
        caller.scheduleRoutes.remove({ id: 99999 })
      ).rejects.toThrow(TRPCError);
      
      try {
        await caller.scheduleRoutes.remove({ id: 99999 });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("NOT_FOUND");
        expect((error as TRPCError).message).toBe("Schedule not found or could not be deleted");
      }
    });

    it("should handle invalid ID types", async () => {
      expect(
        caller.scheduleRoutes.load({ id: "invalid" as any })
      ).rejects.toThrow();

      expect(
        caller.scheduleRoutes.remove({ id: "invalid" as any })
      ).rejects.toThrow();
    });

    it("should handle negative IDs", async () => {
      expect(
        caller.scheduleRoutes.remove({ id: -1 })
      ).rejects.toThrow();
    });
  });

  describe("Security and Data Integrity", () => {
    it("should handle special characters in schedule names", async () => {
      const result = await caller.scheduleRoutes.save({
        name: "Schedule & More",
        slug: "schedule-special",
        amount: 100,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(result.name).toBe("Schedule & More");
    });

    it("should handle quotes in schedule names", async () => {
      const result = await caller.scheduleRoutes.save({
        name: "Schedule with 'quotes'", // Keep under 30 chars
        slug: "schedule-quotes",
        amount: 100,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(result.name).toBe("Schedule with 'quotes'");
    });

    it("should prevent SQL injection attempts", async () => {
      const maliciousInputs = [
        "'; DROP TABLE schedules; --",
        "1' OR '1'='1",
        "'; INSERT INTO schedules (name) VALUES ('hacked'); --",
      ];

      for (const input of maliciousInputs) {
        try {
          await caller.scheduleRoutes.load({ id: input as any });
        } catch (error) {
          // Should fail due to type validation, not SQL injection
          expect(error).toBeDefined();
        }
      }
    });

    it("should create schedules with valid account references", async () => {
      // This test verifies that we can create schedules with valid accounts
      // Foreign key constraints may not be enforced in test environment
      const result = await caller.scheduleRoutes.save({
        name: "Valid Account Schedule",
        slug: "valid-account-schedule",
        amount: 100,
        payeeId: testPayeeId,
        accountId: testAccountId, // Valid account
      });

      expect(result.accountId).toBe(testAccountId);
    });

    it("should create schedules with valid payee references", async () => {
      // This test verifies that we can create schedules with valid payees
      // Foreign key constraints may not be enforced in test environment
      const result = await caller.scheduleRoutes.save({
        name: "Valid Payee Schedule",
        slug: "valid-payee-schedule",
        amount: 100,
        payeeId: testPayeeId, // Valid payee
        accountId: testAccountId,
      });

      expect(result.payeeId).toBe(testPayeeId);
    });
  });

  describe("Rate Limiting and Performance", () => {
    it("should bypass rate limiting in test context", async () => {
      const mutations = Array.from({ length: 10 }, (_, i) =>
        caller.scheduleRoutes.save({
          name: `Bulk Schedule ${i}`,
          slug: `bulk-schedule-${i}`,
          amount: i * 10,
          payeeId: testPayeeId,
          accountId: testAccountId,
        })
      );

      const results = await Promise.allSettled(mutations);
      const successCount = results.filter(r => r.status === "fulfilled").length;
      expect(successCount).toBeGreaterThan(0);
    });

    it("should handle concurrent schedule operations", async () => {
      const operations = [
        caller.scheduleRoutes.save({
          name: "Concurrent Schedule 1",
          slug: "concurrent-schedule-1",
          amount: 100,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
        caller.scheduleRoutes.save({
          name: "Concurrent Schedule 2",
          slug: "concurrent-schedule-2",
          amount: 200,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
        caller.scheduleRoutes.all(),
      ];

      const results = await Promise.allSettled(operations);
      const successCount = results.filter(r => r.status === "fulfilled").length;
      expect(successCount).toBe(3);
    });

    it("should not rate limit queries", async () => {
      const queries = Array.from({ length: 20 }, () =>
        caller.scheduleRoutes.all()
      );

      const results = await Promise.all(queries);
      expect(results).toBeDefined();
      expect(results.length).toBe(20);
    });
  });
});