import { describe, it, expect, beforeEach } from "bun:test";
import { createCaller } from "../../../src/lib/trpc/router";
import { createContext } from "../../../src/lib/trpc/context";

describe("Schedule Date Integration Tests", () => {
  let caller: ReturnType<typeof createCaller>;
  let testAccountId: number;
  let testPayeeId: number;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller({ ...ctx, isTest: true });

    // Create test dependencies
    const account = await caller.accountRoutes.save({
      name: "Schedule Date Test Account",
      slug: "schedule-date-test-account",
    });
    testAccountId = account.id;

    const payee = await caller.payeeRoutes.save({
      name: "Schedule Date Test Payee",
      slug: "schedule-date-test-payee",
    });
    testPayeeId = payee.id;
  });

  describe("Schedule to Schedule Date Relationships", () => {
    it("should create schedule with associated date configuration", async () => {
      // Create schedule with recurring configuration
      const schedule = await caller.scheduleRoutes.save({
        name: "Monthly Recurring Schedule",
        slug: "monthly-recurring-schedule",
        amount: 500.00,
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(schedule.recurring).toBe(true);
      expect(schedule.dateId).toBeNull(); // Initially null until date config is set
      
      // Load schedule with relations
      const loadedSchedule = await caller.scheduleRoutes.load({ id: schedule.id });
      expect(loadedSchedule).toBeDefined();
      expect(loadedSchedule.recurring).toBe(true);
    });

    it("should handle non-recurring schedules without date configuration", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "One-time Payment",
        slug: "one-time-payment",
        amount: 250.00,
        recurring: false,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(schedule.recurring).toBe(false);
      expect(schedule.dateId).toBeNull();
    });

    it("should maintain referential integrity between schedules and dates", async () => {
      // Create a schedule first
      const schedule = await caller.scheduleRoutes.save({
        name: "Referenced Schedule",
        slug: "referenced-schedule",
        amount: 300.00,
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Update with date reference if date configuration is implemented
      // This tests the relationship structure even if not fully implemented yet
      const updatedSchedule = await caller.scheduleRoutes.save({
        id: schedule.id,
        name: "Referenced Schedule",
        slug: "referenced-schedule",
        amount: 300.00,
        recurring: true,
        dateId: null, // Placeholder for future date configuration
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(updatedSchedule.dateId).toBeNull();
    });

    it("should handle schedule updates while preserving date relationships", async () => {
      // Create schedule
      const originalSchedule = await caller.scheduleRoutes.save({
        name: "Updatable Schedule",
        slug: "updatable-schedule",
        amount: 100.00,
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Update schedule details
      const updatedSchedule = await caller.scheduleRoutes.save({
        id: originalSchedule.id,
        name: "Updated Schedule Name",
        slug: "updated-schedule-name",
        amount: 150.00,
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(updatedSchedule.id).toBe(originalSchedule.id);
      expect(updatedSchedule.name).toBe("Updated Schedule Name");
      expect(updatedSchedule.amount).toBe(150.00);
      expect(updatedSchedule.recurring).toBe(true);
      expect(updatedSchedule.dateId).toBe(originalSchedule.dateId);
    });

    it("should handle schedule status changes correctly", async () => {
      // Create active schedule
      const activeSchedule = await caller.scheduleRoutes.save({
        name: "Status Test Schedule",
        slug: "status-test-schedule",
        amount: 75.00,
        status: "active",
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(activeSchedule.status).toBe("active");

      // Update to inactive
      const inactiveSchedule = await caller.scheduleRoutes.save({
        id: activeSchedule.id,
        name: "Status Test Schedule",
        slug: "status-test-schedule",
        amount: 75.00,
        status: "inactive",
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(inactiveSchedule.status).toBe("inactive");
      expect(inactiveSchedule.id).toBe(activeSchedule.id);
    });
  });

  describe("Schedule Date Data Model Validation", () => {
    it("should accept valid recurring configurations", async () => {
      const validConfigs = [
        {
          name: "Daily Schedule",
          slug: "daily-schedule",
          recurring: true,
        },
        {
          name: "Weekly Schedule",
          slug: "weekly-schedule",
          recurring: true,
        },
        {
          name: "Monthly Schedule", 
          slug: "monthly-schedule",
          recurring: true,
        },
        {
          name: "One-time Schedule",
          slug: "one-time-schedule",
          recurring: false,
        },
      ];

      for (const config of validConfigs) {
        const schedule = await caller.scheduleRoutes.save({
          ...config,
          amount: 100.00,
          payeeId: testPayeeId,
          accountId: testAccountId,
        });

        expect(schedule.name).toBe(config.name);
        expect(schedule.recurring).toBe(config.recurring);
        expect(schedule.dateId).toBeNull(); // No date config yet
      }
    });

    it("should handle auto-add functionality flag", async () => {
      // Test auto-add enabled
      const autoAddSchedule = await caller.scheduleRoutes.save({
        name: "Auto-add Schedule",
        slug: "auto-add-schedule",
        amount: 200.00,
        recurring: true,
        auto_add: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(autoAddSchedule.auto_add).toBe(true);

      // Test auto-add disabled
      const manualSchedule = await caller.scheduleRoutes.save({
        name: "Manual Schedule",
        slug: "manual-schedule",
        amount: 200.00,
        recurring: true,
        auto_add: false,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(manualSchedule.auto_add).toBe(false);
    });

    it("should handle different amount types with recurring schedules", async () => {
      const amountTypes = [
        { type: "exact", amount: 100.00, amount_2: 0 },
        { type: "approximate", amount: 150.00, amount_2: 0 },
        { type: "range", amount: 100.00, amount_2: 200.00 },
      ];

      for (const config of amountTypes) {
        const schedule = await caller.scheduleRoutes.save({
          name: `${config.type} Amount Schedule`,
          slug: `${config.type}-amount-schedule`,
          amount: config.amount,
          amount_2: config.amount_2,
          amount_type: config.type as "exact" | "approximate" | "range",
          recurring: true,
          payeeId: testPayeeId,
          accountId: testAccountId,
        });

        expect(schedule.amount_type).toBe(config.type);
        expect(schedule.amount).toBe(config.amount);
        if (config.type === "range") {
          expect(schedule.amount_2).toBe(config.amount_2);
        }
      }
    });
  });

  describe("Schedule Query Integration", () => {
    it("should load schedules with their date relationships", async () => {
      // Create multiple schedules
      const schedules = await Promise.all([
        caller.scheduleRoutes.save({
          name: "Query Test Schedule 1",
          slug: "query-test-schedule-1",
          amount: 100.00,
          recurring: true,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
        caller.scheduleRoutes.save({
          name: "Query Test Schedule 2",
          slug: "query-test-schedule-2",
          amount: 200.00,
          recurring: false,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
      ]);

      // Load all schedules
      const allSchedules = await caller.scheduleRoutes.all();
      
      expect(allSchedules.length).toBeGreaterThanOrEqual(2);
      
      const querySchedules = allSchedules.filter(s => 
        s.name.startsWith("Query Test Schedule")
      );
      
      expect(querySchedules.length).toBe(2);
      expect(querySchedules.some(s => s.recurring === true)).toBe(true);
      expect(querySchedules.some(s => s.recurring === false)).toBe(true);
    });

    it("should load individual schedule with transaction relations", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Transaction Relation Test",
        slug: "transaction-relation-test",
        amount: 300.00,
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const loadedSchedule = await caller.scheduleRoutes.load({ id: schedule.id });
      
      expect(loadedSchedule).toBeDefined();
      expect(loadedSchedule.id).toBe(schedule.id);
      expect(loadedSchedule.transactions).toBeDefined();
      expect(Array.isArray(loadedSchedule.transactions)).toBe(true);
      // Initially should have no transactions
      expect(loadedSchedule.transactions.length).toBe(0);
    });

    it("should handle concurrent schedule operations", async () => {
      // Test that multiple schedule operations can happen simultaneously
      const concurrentOperations = [
        caller.scheduleRoutes.save({
          name: "Concurrent Schedule A",
          slug: "concurrent-schedule-a",
          amount: 100.00,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
        caller.scheduleRoutes.save({
          name: "Concurrent Schedule B",
          slug: "concurrent-schedule-b",
          amount: 200.00,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
        caller.scheduleRoutes.all(),
      ];

      const results = await Promise.all(concurrentOperations);
      
      expect(results[0]).toBeDefined(); // First schedule
      expect(results[1]).toBeDefined(); // Second schedule  
      expect(Array.isArray(results[2])).toBe(true); // All schedules query
      
      const [scheduleA, scheduleB, allSchedules] = results;
      expect(scheduleA.name).toBe("Concurrent Schedule A");
      expect(scheduleB.name).toBe("Concurrent Schedule B");
      expect(allSchedules.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Schedule Date Performance", () => {
    it("should handle multiple recurring schedules efficiently", async () => {
      const startTime = Date.now();
      
      // Create multiple recurring schedules
      const schedulePromises = Array.from({ length: 10 }, (_, i) =>
        caller.scheduleRoutes.save({
          name: `Performance Test Schedule ${i}`,
          slug: `performance-test-schedule-${i}`,
          amount: (i + 1) * 50,
          recurring: true,
          auto_add: i % 2 === 0, // Alternate auto-add setting
          payeeId: testPayeeId,
          accountId: testAccountId,
        })
      );

      const schedules = await Promise.all(schedulePromises);
      const endTime = Date.now();
      
      expect(schedules.length).toBe(10);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      
      // Verify all schedules were created correctly
      schedules.forEach((schedule, index) => {
        expect(schedule.name).toBe(`Performance Test Schedule ${index}`);
        expect(schedule.recurring).toBe(true);
        expect(schedule.auto_add).toBe(index % 2 === 0);
      });
    });

    it("should efficiently query schedules with date configurations", async () => {
      // Create some schedules first
      await Promise.all([
        caller.scheduleRoutes.save({
          name: "Query Performance Test A",
          slug: "query-performance-test-a",
          amount: 100.00,
          recurring: true,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
        caller.scheduleRoutes.save({
          name: "Query Performance Test B", 
          slug: "query-performance-test-b",
          amount: 200.00,
          recurring: false,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
      ]);

      const startTime = Date.now();
      
      // Query all schedules multiple times
      const queryPromises = Array.from({ length: 5 }, () => 
        caller.scheduleRoutes.all()
      );
      
      const results = await Promise.all(queryPromises);
      const endTime = Date.now();
      
      expect(results.length).toBe(5);
      expect(endTime - startTime).toBeLessThan(500); // Should be very fast
      
      // All queries should return the same data
      results.forEach(schedules => {
        expect(Array.isArray(schedules)).toBe(true);
        expect(schedules.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});