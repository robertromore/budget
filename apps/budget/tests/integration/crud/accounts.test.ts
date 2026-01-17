import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {setupTestDb, seedTestData, clearTestDb} from "../setup/test-db";
import {createCaller} from "../../../src/lib/trpc/router";
import {TRPCError} from "@trpc/server";

describe("Accounts CRUD Integration Tests", () => {
  let testDb: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    testDb = await setupTestDb();
    await seedTestData(testDb);
    const ctx = {db: testDb, isTest: true};
    caller = createCaller(ctx);
  });

  afterEach(async () => {
    if (testDb) {
      await clearTestDb(testDb);
    }
  });

  describe("Create Account Operations", () => {
    it("should create new account with all fields", async () => {
      const result = await caller.accountRoutes.save({
        name: "New Integration Account",
        slug: "new-integration-account",
        notes: "Created via integration test",
      });

      expect(result.name).toBe("New Integration Account");
      expect(result.slug).toBe("new-integration-account");
      expect(result.notes).toBe("Created via integration test");
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it("should create account with only required fields", async () => {
      const result = await caller.accountRoutes.save({
        name: "Minimal Account",
        slug: "minimal-account",
      });

      expect(result.name).toBe("Minimal Account");
      expect(result.slug).toBe("minimal-account");
      expect(result.id).toBeDefined();
    });

    it("should show validation errors for invalid data", async () => {
      // Try to create without name
      await expect(
        caller.accountRoutes.save({
          name: "",
          slug: "empty-name",
        })
      ).rejects.toThrow(TRPCError);

      // Fill name that's too short
      await expect(
        caller.accountRoutes.save({
          name: "A",
          slug: "short-name",
        })
      ).rejects.toThrow(TRPCError);

      // Fill name with invalid characters
      await expect(
        caller.accountRoutes.save({
          name: "Test<script>alert('xss')</script>",
          slug: "invalid-chars",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle notes field validation", async () => {
      // Fill notes that are too long
      const longNotes = "A".repeat(501);

      await expect(
        caller.accountRoutes.save({
          name: "Test Account",
          slug: "test-account",
          notes: longNotes,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle slug validation", async () => {
      // Invalid slug with uppercase
      await expect(
        caller.accountRoutes.save({
          name: "Test Account",
          slug: "Invalid-Slug",
        })
      ).rejects.toThrow(TRPCError);

      // Invalid slug with spaces
      await expect(
        caller.accountRoutes.save({
          name: "Test Account",
          slug: "invalid slug",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("Read Account Operations", () => {
    it("should retrieve all accounts", async () => {
      const accounts = await caller.accountRoutes.all();
      expect(accounts.length).toBeGreaterThan(0);

      const firstAccount = accounts[0];
      expect(firstAccount.name).toBeDefined();
      expect(firstAccount.id).toBeDefined();
      expect(firstAccount.createdAt).toBeDefined();
      expect(firstAccount.balance).toBeDefined();
      expect(firstAccount.transactions).toBeDefined();
    });

    it("should retrieve account with balance calculation", async () => {
      const accounts = await caller.accountRoutes.all();
      const firstAccount = accounts[0];

      expect(firstAccount.balance).toBeDefined();
      expect(typeof firstAccount.balance).toBe("number");
      // Should have transactions from seed data
      expect(firstAccount.transactions.length).toBeGreaterThan(0);
    });

    it("should handle account with no transactions", async () => {
      const newAccount = await caller.accountRoutes.save({
        name: "Empty Account",
        slug: "empty-account",
      });

      const accounts = await caller.accountRoutes.all();
      const emptyAccount = accounts.find((a) => a.id === newAccount.id);

      expect(emptyAccount).toBeDefined();
      expect(emptyAccount!.balance).toBe(0);
      expect(emptyAccount!.transactions).toHaveLength(0);
    });

    it("should consistently retrieve account data", async () => {
      const accounts1 = await caller.accountRoutes.all();
      const accounts2 = await caller.accountRoutes.all();

      expect(accounts1.length).toBe(accounts2.length);
      expect(accounts1[0].id).toBe(accounts2[0].id);
      expect(accounts1[0].name).toBe(accounts2[0].name);
    });
  });

  describe("Update Account Operations", () => {
    it("should update account with new data", async () => {
      const accounts = await caller.accountRoutes.all();
      const firstAccount = accounts[0];

      const updated = await caller.accountRoutes.save({
        id: firstAccount.id,
        name: "Updated Account Name",
        notes: "Updated via integration test",
      });

      expect(updated.id).toBe(firstAccount.id);
      expect(updated.name).toBe("Updated Account Name");
      expect(updated.notes).toBe("Updated via integration test");
      expect(updated.updatedAt).toBeDefined();
    });

    it("should update only some fields", async () => {
      const accounts = await caller.accountRoutes.all();
      const firstAccount = accounts[0];
      const originalName = firstAccount.name;

      const updated = await caller.accountRoutes.save({
        id: firstAccount.id,
        name: originalName,
        notes: "Only notes updated",
      });

      expect(updated.id).toBe(firstAccount.id);
      expect(updated.name).toBe(originalName); // Should remain unchanged
      expect(updated.notes).toBe("Only notes updated");
    });

    it("should validate updated data", async () => {
      const accounts = await caller.accountRoutes.all();
      const firstAccount = accounts[0];

      // Try to clear required field
      await expect(
        caller.accountRoutes.save({
          id: firstAccount.id,
          name: "",
        })
      ).rejects.toThrow(TRPCError);

      // Try invalid characters
      await expect(
        caller.accountRoutes.save({
          id: firstAccount.id,
          name: "Invalid<script>Name",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle non-existent account update", async () => {
      await expect(
        caller.accountRoutes.save({
          id: 99999,
          name: "Non-existent Account",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("Delete Account Operations", () => {
    it("should delete account successfully", async () => {
      const accounts = await caller.accountRoutes.all();
      const initialCount = accounts.length;
      const accountToDelete = accounts[0];

      const result = await caller.accountRoutes.remove({
        id: accountToDelete.id,
      });

      expect(result.deletedAt).toBeDefined();
      expect(result.id).toBe(accountToDelete.id);

      // Verify account is soft-deleted
      const updatedAccounts = await caller.accountRoutes.all();
      expect(updatedAccounts.length).toBe(initialCount - 1);
      expect(updatedAccounts.find((a) => a.id === accountToDelete.id)).toBeUndefined();
    });

    it("should handle non-existent account deletion", async () => {
      await expect(
        caller.accountRoutes.remove({
          id: 99999,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle deletion with transactions", async () => {
      // Get account that has transactions from seed data
      const accounts = await caller.accountRoutes.all();
      const accountWithTransactions = accounts.find((a) => a.transactions.length > 0);

      expect(accountWithTransactions).toBeDefined();

      // Should still allow deletion (soft delete)
      const result = await caller.accountRoutes.remove({
        id: accountWithTransactions!.id,
      });

      expect(result.deletedAt).toBeDefined();
    });
  });

  describe("Balance Calculation Validation", () => {
    it("should ensure account balance is never NaN and always a valid number", async () => {
      const accounts = await caller.accountRoutes.all();

      accounts.forEach((account, index) => {
        // Account balance should be defined
        expect(account.balance).toBeDefined();

        // Account balance should be a number
        expect(typeof account.balance).toBe("number");

        // Account balance should not be NaN
        expect(Number.isNaN(account.balance)).toBe(false);

        // Account balance should be finite (not Infinity/-Infinity)
        expect(Number.isFinite(account.balance)).toBe(true);

        // Log account balance for verification
        console.log(`Account ${index + 1} (${account.name}): balance = $${account.balance}`);
      });
    });

    it("should ensure transaction balances are never NaN and always valid numbers", async () => {
      const accounts = await caller.accountRoutes.all();
      const accountsWithTransactions = accounts.filter((a) => a.transactions.length > 0);

      expect(accountsWithTransactions.length).toBeGreaterThan(0);

      accountsWithTransactions.forEach((account) => {
        account.transactions.forEach((transaction, index) => {
          // Transaction balance should be defined
          expect(transaction.balance).toBeDefined();

          // Transaction balance should be a number
          expect(typeof transaction.balance).toBe("number");

          // Transaction balance should not be NaN
          expect(Number.isNaN(transaction.balance)).toBe(false);

          // Transaction balance should be finite
          expect(Number.isFinite(transaction.balance)).toBe(true);

          // Transaction amount should also be valid
          expect(typeof transaction.amount).toBe("number");
          expect(Number.isNaN(transaction.amount)).toBe(false);
          expect(Number.isFinite(transaction.amount)).toBe(true);

          console.log(
            `  Transaction ${index + 1}: amount = $${transaction.amount}, running balance = $${transaction.balance}`
          );
        });
      });
    });

    it("should correctly calculate running balances for transactions", async () => {
      const accounts = await caller.accountRoutes.all();
      const accountWithTransactions = accounts.find((a) => a.transactions.length > 0);

      expect(accountWithTransactions).toBeDefined();

      if (accountWithTransactions) {
        let expectedRunningBalance = 0;

        accountWithTransactions.transactions.forEach((transaction, index) => {
          expectedRunningBalance += transaction.amount;

          // Each transaction's balance should equal the running sum up to that point
          expect(transaction.balance).toBe(expectedRunningBalance);

          console.log(
            `Transaction ${index + 1}: amount = $${transaction.amount}, expected = $${expectedRunningBalance}, actual = $${transaction.balance}`
          );
        });

        // Final running balance should match account balance
        expect(accountWithTransactions.balance).toBe(expectedRunningBalance);
      }
    });

    it("should handle edge cases for balance calculations", async () => {
      // Create account with zero balance (no transactions)
      const emptyAccount = await caller.accountRoutes.save({
        name: "Edge Case Empty Account",
        slug: "edge-case-empty",
        notes: "Testing balance calculation edge cases",
      });

      // Load the account to get calculated balance
      const loadedAccount = await caller.accountRoutes.load({id: emptyAccount.id});

      // Balance should be 0, not NaN
      expect(loadedAccount.balance).toBe(0);
      expect(Number.isNaN(loadedAccount.balance)).toBe(false);
      expect(Number.isFinite(loadedAccount.balance)).toBe(true);

      // Transactions array should be empty but defined
      expect(loadedAccount.transactions).toBeDefined();
      expect(Array.isArray(loadedAccount.transactions)).toBe(true);
      expect(loadedAccount.transactions).toHaveLength(0);

      console.log(`Empty account balance: $${loadedAccount.balance}`);
    });

    it("should validate balance consistency between account.all and account.load", async () => {
      const allAccounts = await caller.accountRoutes.all();

      for (const account of allAccounts) {
        const loadedAccount = await caller.accountRoutes.load({id: account.id});

        // Balance should be consistent
        expect(loadedAccount.balance).toBe(account.balance);

        // Transaction count should match
        expect(loadedAccount.transactions.length).toBe(account.transactions.length);

        // Both should have valid, non-NaN balances
        expect(Number.isNaN(account.balance)).toBe(false);
        expect(Number.isNaN(loadedAccount.balance)).toBe(false);

        console.log(
          `Account ${account.name}: all() balance = $${account.balance}, load() balance = $${loadedAccount.balance}`
        );
      }
    });

    it("should handle accounts with complex transaction scenarios", async () => {
      // Get account and verify it has mixed positive/negative transactions for better testing
      const accounts = await caller.accountRoutes.all();
      const accountWithTransactions = accounts.find((a) => a.transactions.length > 1);

      if (accountWithTransactions) {
        const hasPositive = accountWithTransactions.transactions.some((t) => t.amount > 0);
        const hasNegative = accountWithTransactions.transactions.some((t) => t.amount < 0);

        console.log(
          `Testing complex scenario: account has ${accountWithTransactions.transactions.length} transactions`
        );
        console.log(`Has positive amounts: ${hasPositive}, Has negative amounts: ${hasNegative}`);

        // Verify all balances are valid regardless of transaction mix
        accountWithTransactions.transactions.forEach((transaction, index) => {
          expect(Number.isNaN(transaction.balance)).toBe(false);
          expect(Number.isFinite(transaction.balance)).toBe(true);

          // Balance can be positive, negative, or zero, but never NaN
          expect(typeof transaction.balance).toBe("number");

          console.log(
            `  Complex transaction ${index + 1}: amount = $${transaction.amount}, balance = $${transaction.balance}`
          );
        });

        // Final balance should equal sum of all amounts
        const calculatedBalance = accountWithTransactions.transactions.reduce(
          (sum, t) => sum + t.amount,
          0
        );
        expect(accountWithTransactions.balance).toBe(calculatedBalance);
        expect(Number.isNaN(calculatedBalance)).toBe(false);

        console.log(`Final calculated balance: $${calculatedBalance}`);
      }
    });
  });

  describe("Complex CRUD Workflows", () => {
    it("should handle complete account lifecycle", async () => {
      // Create
      const created = await caller.accountRoutes.save({
        name: "Lifecycle Test Account",
        slug: "lifecycle-test",
        notes: "Initial notes",
      });

      expect(created.name).toBe("Lifecycle Test Account");

      // Read
      const accounts = await caller.accountRoutes.all();
      const found = accounts.find((a) => a.id === created.id);
      expect(found).toBeDefined();
      expect(found!.notes).toBe("Initial notes");

      // Update
      const updated = await caller.accountRoutes.save({
        id: created.id,
        name: "Updated Lifecycle Account",
        notes: "Updated notes",
      });

      expect(updated.name).toBe("Updated Lifecycle Account");
      expect(updated.notes).toBe("Updated notes");

      // Delete
      const deleted = await caller.accountRoutes.remove({id: created.id});
      expect(deleted.deletedAt).toBeDefined();

      // Verify deletion
      const finalAccounts = await caller.accountRoutes.all();
      expect(finalAccounts.find((a) => a.id === created.id)).toBeUndefined();
    });

    it("should maintain data integrity during operations", async () => {
      const testData = {
        name: "Data Integrity Test",
        slug: "data-integrity-test",
        notes: 'Special characters: àéîõü & quotes "\'" and symbols',
      };

      // Create with special characters
      const created = await caller.accountRoutes.save(testData);

      expect(created.name).toBe(testData.name);
      expect(created.slug).toBe(testData.slug);
      expect(created.notes).toBe(testData.notes);

      // Update with more special characters (but no HTML or forbidden symbols)
      const updatedNotes = testData.notes + " - Updated with safe symbols: ()+-=_";
      const updated = await caller.accountRoutes.save({
        id: created.id,
        name: testData.name,
        notes: updatedNotes,
      });

      expect(updated.notes).toBe(updatedNotes);
    });

    it("should handle concurrent operations", async () => {
      // Create multiple accounts simultaneously
      const createPromises = Array.from({length: 5}, (_, i) =>
        caller.accountRoutes.save({
          name: `Concurrent Account ${i}`,
          slug: `concurrent-account-${i}`,
        })
      );

      const results = await Promise.all(createPromises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.name).toBe(`Concurrent Account ${index}`);
        expect(result.id).toBeDefined();
      });

      // Update all accounts simultaneously
      const updatePromises = results.map((account) =>
        caller.accountRoutes.save({
          id: account.id,
          name: account.name,
          notes: `Updated concurrently: ${account.id}`,
        })
      );

      const updatedResults = await Promise.all(updatePromises);

      updatedResults.forEach((result) => {
        expect(result.notes).toBe(`Updated concurrently: ${result.id}`);
      });
    });
  });
});
