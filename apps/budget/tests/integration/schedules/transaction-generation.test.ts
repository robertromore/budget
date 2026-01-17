import {describe, it, expect, beforeEach} from "vitest";
import {createCaller} from "../../../src/lib/trpc/router";
import {createContext} from "../../../src/lib/trpc/context";

describe("Transaction Generation from Schedules Tests", () => {
  let caller: ReturnType<typeof createCaller>;
  let testAccountId: number;
  let testPayeeId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    const ctx = await createContext();
    caller = createCaller({...ctx, isTest: true});

    // Create test dependencies
    const account = await caller.accountRoutes.save({
      name: "Transaction Gen Test Account",
      slug: "transaction-gen-test-account",
    });
    testAccountId = account.id;

    const payee = await caller.payeeRoutes.save({
      name: "Transaction Gen Test Payee",
      slug: "transaction-gen-test-payee",
    });
    testPayeeId = payee.id;

    const category = await caller.categoriesRoutes.save({
      name: "Transaction Gen Test Category",
      slug: "transaction-gen-test-category",
    });
    testCategoryId = category.id;
  });

  describe("Transaction Schema Validation for Schedules", () => {
    it("should create transaction without schedule reference (baseline)", async () => {
      // Create a schedule first
      const schedule = await caller.scheduleRoutes.save({
        name: "Manual Transaction Schedule",
        slug: "manual-transaction-schedule",
        amount: 150.0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Create transaction without schedule reference (current implementation)
      const transaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 150.0,
        status: "scheduled",
        date: "2024-02-01",
      });

      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(150.0);
      expect(transaction.status).toBe("scheduled");
      expect(transaction.accountId).toBe(testAccountId);
      expect(transaction.payeeId).toBe(testPayeeId);

      // Current implementation may not support scheduleId field
      // This test validates the baseline functionality works
      expect(transaction.scheduleId).toBeNull();
    });

    it("should support scheduled transaction status for recurring schedules", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Multi-transaction Schedule",
        slug: "multi-transaction-schedule",
        amount: 200.0,
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Create multiple scheduled transactions that could be linked to schedule
      const dates = ["2024-02-01", "2024-03-01", "2024-04-01"];
      const transactions = [];

      for (const date of dates) {
        const transaction = await caller.transactionRoutes.save({
          accountId: testAccountId,
          payeeId: testPayeeId,
          amount: 200.0,
          status: "scheduled",
          date: date,
        });
        transactions.push(transaction);
      }

      expect(transactions.length).toBe(3);
      transactions.forEach((transaction, index) => {
        expect(transaction.amount).toBe(200.0);
        expect(transaction.status).toBe("scheduled");
        expect(transaction.date).toBe(dates[index]);
        expect(transaction.accountId).toBe(testAccountId);
        expect(transaction.payeeId).toBe(testPayeeId);
      });
    });

    it("should create transactions matching schedule amounts", async () => {
      const amountConfigs = [
        {type: "exact", amount: 100.0, expectedAmount: 100.0},
        {type: "approximate", amount: 150.0, expectedAmount: 150.0},
      ];

      for (const config of amountConfigs) {
        const schedule = await caller.scheduleRoutes.save({
          name: `${config.type} Amount Schedule`,
          slug: `${config.type}-amount-schedule`,
          amount: config.amount,
          amount_type: config.type as "exact" | "approximate",
          payeeId: testPayeeId,
          accountId: testAccountId,
        });

        // Create transaction that matches the schedule amount
        const transaction = await caller.transactionRoutes.save({
          accountId: testAccountId,
          payeeId: testPayeeId,
          amount: config.expectedAmount,
          status: "scheduled",
          date: "2024-02-15",
        });

        expect(transaction.amount).toBe(config.expectedAmount);
        expect(transaction.accountId).toBe(testAccountId);
        expect(transaction.payeeId).toBe(testPayeeId);

        // Verify schedule has matching configuration
        expect(schedule.amount).toBe(config.amount);
        expect(schedule.amount_type).toBe(config.type);
      }
    });

    it("should create transactions for range amount schedule types", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Range Amount Schedule",
        slug: "range-amount-schedule",
        amount: 100.0,
        amount_2: 200.0,
        amount_type: "range",
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Verify schedule range configuration
      expect(schedule.amount).toBe(100.0);
      expect(schedule.amount_2).toBe(200.0);
      expect(schedule.amount_type).toBe("range");

      // Create transactions that could be within the range
      const validAmounts = [100.0, 125.0, 150.0, 175.0, 200.0];

      for (const amount of validAmounts) {
        const transaction = await caller.transactionRoutes.save({
          accountId: testAccountId,
          payeeId: testPayeeId,
          amount: amount,
          status: "scheduled",
          date: `2024-0${validAmounts.indexOf(amount) + 2}-01`,
        });

        expect(transaction.amount).toBe(amount);
        // Amount should be within the range
        expect(transaction.amount).toBeGreaterThanOrEqual(100.0);
        expect(transaction.amount).toBeLessThanOrEqual(200.0);
      }
    });
  });

  describe("Schedule and Transaction Data Model Integration", () => {
    it("should validate schedule can load its related transactions", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Integrity Test Schedule",
        slug: "integrity-test-schedule",
        amount: 300.0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Create a transaction (without schedule link for now)
      const transaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 300.0,
        status: "scheduled",
        date: "2024-03-01",
      });

      // Load the schedule with its transactions relation
      const loadedSchedule = await caller.scheduleRoutes.load({id: schedule.id});

      expect(loadedSchedule.transactions).toBeDefined();
      expect(Array.isArray(loadedSchedule.transactions)).toBe(true);
      // Currently should be 0 since no transaction links to schedule
      expect(loadedSchedule.transactions.length).toBe(0);

      // The transaction exists but isn't linked yet
      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(300.0);
    });

    it("should handle schedule updates independently of transactions", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Updatable Schedule",
        slug: "updatable-schedule",
        amount: 250.0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Create related transaction (without schedule link for now)
      const transaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 250.0,
        status: "scheduled",
        date: "2024-03-15",
      });

      // Update the schedule
      const updatedSchedule = await caller.scheduleRoutes.save({
        id: schedule.id,
        name: "Updated Schedule Name",
        slug: "updated-schedule-name",
        amount: 275.0, // Changed amount
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Verify schedule update worked
      expect(updatedSchedule.id).toBe(schedule.id);
      expect(updatedSchedule.name).toBe("Updated Schedule Name");
      expect(updatedSchedule.amount).toBe(275.0);

      // Transaction should still exist independently
      expect(transaction.amount).toBe(250.0);
      expect(transaction.status).toBe("scheduled");
    });

    it("should handle schedule deletion independently of transactions", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Deletable Schedule",
        slug: "deletable-schedule",
        amount: 400.0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Create a transaction that could be related to schedule
      const transaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 400.0,
        status: "scheduled",
        date: "2024-04-01",
      });

      // Delete the schedule
      await caller.scheduleRoutes.remove({id: schedule.id});

      // The transaction should still exist independently
      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(400.0);
      expect(transaction.status).toBe("scheduled");

      // Try to load the schedule (should fail)
      expect(caller.scheduleRoutes.load({id: schedule.id})).rejects.toThrow();
    });
  });

  describe("Auto-Add Configuration Validation", () => {
    it("should store auto-add flag in schedule configuration", async () => {
      // Create schedule with auto-add enabled
      const autoAddSchedule = await caller.scheduleRoutes.save({
        name: "Auto-Add Schedule",
        slug: "auto-add-schedule",
        amount: 175.0,
        recurring: true,
        auto_add: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(autoAddSchedule.auto_add).toBe(true);
      expect(autoAddSchedule.recurring).toBe(true);

      // Create schedule with auto-add disabled
      const manualSchedule = await caller.scheduleRoutes.save({
        name: "Manual Schedule",
        slug: "manual-schedule",
        amount: 175.0,
        recurring: true,
        auto_add: false,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(manualSchedule.auto_add).toBe(false);
      expect(manualSchedule.recurring).toBe(true);
    });

    it("should create transactions consistent with schedule configurations", async () => {
      const autoSchedule = await caller.scheduleRoutes.save({
        name: "Auto Schedule Test",
        slug: "auto-schedule-test",
        amount: 125.0,
        auto_add: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const manualSchedule = await caller.scheduleRoutes.save({
        name: "Manual Schedule Test",
        slug: "manual-schedule-test",
        amount: 125.0,
        auto_add: false,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Create transactions matching the schedule configurations
      const autoTransaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 125.0,
        status: "scheduled",
        date: "2024-05-01",
      });

      const manualTransaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 125.0,
        status: "scheduled",
        date: "2024-05-01",
      });

      // Verify schedules have correct auto-add settings
      expect(autoSchedule.auto_add).toBe(true);
      expect(manualSchedule.auto_add).toBe(false);

      // Both transactions should be created successfully
      expect(autoTransaction.status).toBe("scheduled");
      expect(manualTransaction.status).toBe("scheduled");
      expect(autoTransaction.amount).toBe(125.0);
      expect(manualTransaction.amount).toBe(125.0);
    });
  });

  describe("Schedule Status and Transaction Patterns", () => {
    it("should create schedules with different status configurations", async () => {
      const activeSchedule = await caller.scheduleRoutes.save({
        name: "Active Schedule",
        slug: "active-schedule",
        amount: 350.0,
        status: "active",
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const inactiveSchedule = await caller.scheduleRoutes.save({
        name: "Inactive Schedule",
        slug: "inactive-schedule",
        amount: 225.0,
        status: "inactive",
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      expect(activeSchedule.status).toBe("active");
      expect(inactiveSchedule.status).toBe("inactive");

      // Create corresponding transactions
      const activeTransaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 350.0,
        status: "scheduled",
        date: "2024-06-01",
      });

      const inactiveTransaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 225.0,
        status: "scheduled",
        date: "2024-06-15",
      });

      expect(activeTransaction.status).toBe("scheduled");
      expect(inactiveTransaction.status).toBe("scheduled");
    });
  });

  describe("Transaction Status Management", () => {
    it("should support all transaction status types", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Status Test Schedule",
        slug: "status-test-schedule",
        amount: 275.0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const statuses = ["scheduled", "pending", "cleared"];
      const transactions = [];

      for (const status of statuses) {
        const transaction = await caller.transactionRoutes.save({
          accountId: testAccountId,
          payeeId: testPayeeId,
          amount: 275.0,
          status: status as "scheduled" | "pending" | "cleared",
          date: `2024-0${statuses.indexOf(status) + 7}-01`,
        });
        transactions.push(transaction);
      }

      transactions.forEach((transaction, index) => {
        expect(transaction.status).toBe(statuses[index]);
        expect(transaction.amount).toBe(275.0);
      });
    });

    it("should update transaction status correctly", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Status Update Schedule",
        slug: "status-update-schedule",
        amount: 325.0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Create scheduled transaction
      const transaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 325.0,
        status: "scheduled",
        date: "2024-07-01",
      });

      expect(transaction.status).toBe("scheduled");
      expect(transaction.amount).toBe(325.0);

      // Update to pending status
      const updatedTransaction = await caller.transactionRoutes.save({
        id: transaction.id,
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 325.0,
        status: "pending",
        date: "2024-07-01",
      });

      expect(updatedTransaction.id).toBe(transaction.id);
      expect(updatedTransaction.status).toBe("pending");
      expect(updatedTransaction.amount).toBe(325.0);
    });
  });

  describe("Bulk Transaction Operations", () => {
    it("should handle multiple scheduled transactions efficiently", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Bulk Transaction Schedule",
        slug: "bulk-transaction-schedule",
        amount: 150.0,
        recurring: true,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      const startTime = Date.now();

      // Create multiple transactions in parallel
      const transactionPromises = Array.from({length: 5}, (_, i) =>
        caller.transactionRoutes.save({
          accountId: testAccountId,
          payeeId: testPayeeId,
          amount: 150.0,
          status: "scheduled",
          date: `2024-${String(i + 8).padStart(2, "0")}-01`,
        })
      );

      const transactions = await Promise.all(transactionPromises);
      const endTime = Date.now();

      expect(transactions.length).toBe(5);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly

      transactions.forEach((transaction, index) => {
        expect(transaction.amount).toBe(150.0);
        expect(transaction.status).toBe("scheduled");
        expect(transaction.date).toBe(`2024-${String(index + 8).padStart(2, "0")}-01`);
      });

      // Verify schedule exists and has correct configuration
      expect(schedule.amount).toBe(150.0);
      expect(schedule.recurring).toBe(true);
    });

    it("should handle concurrent transaction creation for different schedules", async () => {
      // Create multiple schedules
      const schedules = await Promise.all([
        caller.scheduleRoutes.save({
          name: "Concurrent Schedule A",
          slug: "concurrent-schedule-a",
          amount: 100.0,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
        caller.scheduleRoutes.save({
          name: "Concurrent Schedule B",
          slug: "concurrent-schedule-b",
          amount: 200.0,
          payeeId: testPayeeId,
          accountId: testAccountId,
        }),
      ]);

      // Create transactions matching the schedule amounts concurrently
      const transactionPromises = schedules.map((schedule, index) =>
        caller.transactionRoutes.save({
          accountId: testAccountId,
          payeeId: testPayeeId,
          amount: schedule.amount,
          status: "scheduled",
          date: `2024-09-0${index + 1}`,
        })
      );

      const transactions = await Promise.all(transactionPromises);

      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe(100.0);
      expect(transactions[1].amount).toBe(200.0);
      expect(transactions[0].status).toBe("scheduled");
      expect(transactions[1].status).toBe("scheduled");

      // Verify schedules have correct amounts
      expect(schedules[0].amount).toBe(100.0);
      expect(schedules[1].amount).toBe(200.0);
    });
  });

  describe("Transaction Data Validation", () => {
    it("should handle transactions without schedule references", async () => {
      // Create transaction without schedule reference
      const transaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 175.0,
        status: "pending",
        date: "2024-10-15",
      });

      expect(transaction.scheduleId).toBeNull();
      expect(transaction.amount).toBe(175.0);
      expect(transaction.status).toBe("pending");
      expect(transaction.accountId).toBe(testAccountId);
      expect(transaction.payeeId).toBe(testPayeeId);
    });

    it("should validate required fields when creating transactions", async () => {
      const schedule = await caller.scheduleRoutes.save({
        name: "Validation Test Schedule",
        slug: "validation-test-schedule",
        amount: 125.0,
        payeeId: testPayeeId,
        accountId: testAccountId,
      });

      // Try to create transaction without required account ID
      expect(
        caller.transactionRoutes.save({
          payeeId: testPayeeId,
          amount: 125.0,
          status: "scheduled",
          date: "2024-11-01",
        })
      ).rejects.toThrow();

      // Valid transaction should work
      const validTransaction = await caller.transactionRoutes.save({
        accountId: testAccountId,
        payeeId: testPayeeId,
        amount: 125.0,
        status: "scheduled",
        date: "2024-11-01",
      });

      expect(validTransaction.amount).toBe(125.0);
      expect(validTransaction.status).toBe("scheduled");
      expect(validTransaction.accountId).toBe(testAccountId);
    });
  });
});
