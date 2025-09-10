import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createCaller } from "../../../src/lib/trpc/router";
import { TRPCError } from "@trpc/server";
import { setupTestDb, clearTestDb, seedTestData } from "../setup/test-db";

describe("Accounts Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    db = await setupTestDb();
    const ctx = { db, isTest: true };
    caller = createCaller(ctx);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  describe("accounts.all - List All Accounts", () => {
    it("should return empty array when no accounts exist", async () => {
      const result = await caller.accountRoutes.all();
      expect(result).toEqual([]);
    });

    it("should return all non-deleted accounts with transactions", async () => {
      // Seed test data
      const { accounts } = await seedTestData(db);
      
      const result = await caller.accountRoutes.all();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: accounts[0].id,
          name: "Test Checking",
          slug: "test-checking",
          notes: "Test checking account",
          transactions: expect.any(Array),
        })
      );
      
      // Should include transactions with all fields
      expect(result[0].transactions[0]).toEqual(
        expect.objectContaining({
          amount: expect.any(Number),
          date: expect.any(String),
          notes: expect.any(String),
          accountId: expect.any(Number),
          id: expect.any(Number),
          payee: null, // From seed data
          category: null, // From seed data
        })
      );
    });

    it("should not return deleted accounts", async () => {
      const { accounts } = await seedTestData(db);
      
      // Delete one account
      await caller.accountRoutes.remove({ id: accounts[0].id });
      
      const result = await caller.accountRoutes.all();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(accounts[1].id);
    });

    it("should return accounts ordered by name", async () => {
      await seedTestData(db);
      
      // Add another account with a name that should come first alphabetically
      await caller.accountRoutes.save({
        name: "AAA First Account",
        slug: "aaa-first-account",
      });
      
      const result = await caller.accountRoutes.all();
      
      expect(result[0].name).toBe("AAA First Account");
      expect(result[1].name).toBe("Test Checking");
    });
  });

  describe("accounts.load - Load Single Account", () => {
    it("should return account with transactions when valid ID provided", async () => {
      const { accounts } = await seedTestData(db);
      
      const result = await caller.accountRoutes.load({ id: accounts[0].id });
      
      expect(result).toEqual(
        expect.objectContaining({
          id: accounts[0].id,
          name: "Test Checking",
          slug: "test-checking",
          notes: "Test checking account",
          balance: expect.any(Number),
          transactions: expect.arrayContaining([
            expect.objectContaining({
              amount: expect.any(Number),
              date: expect.any(String),
              notes: expect.any(String),
              payee: null, // From seed data
              category: null, // From seed data
            }),
          ]),
        })
      );
    });

    it("should throw NOT_FOUND error for non-existent account", async () => {
      await expect(
        caller.accountRoutes.load({ id: 99999 })
      ).rejects.toThrow(TRPCError);
      
      try {
        await caller.accountRoutes.load({ id: 99999 });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("NOT_FOUND");
        expect((error as TRPCError).message).toBe("Account not found");
      }
    });

    it("should throw NOT_FOUND error for deleted account", async () => {
      const { accounts } = await seedTestData(db);
      
      // Delete the account
      await caller.accountRoutes.remove({ id: accounts[0].id });
      
      await expect(
        caller.accountRoutes.load({ id: accounts[0].id })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle string ID conversion", async () => {
      const { accounts } = await seedTestData(db);
      
      // Test with string ID (should be coerced to number)
      const result = await caller.accountRoutes.load({ id: accounts[0].id.toString() as any });
      
      expect(result.id).toBe(accounts[0].id);
    });

    it("should reject invalid ID formats", async () => {
      await expect(
        caller.accountRoutes.load({ id: "invalid" as any })
      ).rejects.toThrow();
      
      await expect(
        caller.accountRoutes.load({ id: -1 })
      ).rejects.toThrow();
    });
  });

  describe("accounts.save - Create Account", () => {
    it("should create new account with valid data", async () => {
      const accountData = {
        name: "New Test Account",
        notes: "This is a new test account",
      };
      
      const result = await caller.accountRoutes.save(accountData);
      
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: accountData.name,
          slug: "new-test-account", // Auto-generated from name
          notes: accountData.notes,
          closed: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
    });

    it("should create account without notes", async () => {
      const accountData = {
        name: "Simple Account",
      };
      
      const result = await caller.accountRoutes.save(accountData);
      
      expect(result).toEqual(
        expect.objectContaining({
          name: accountData.name,
          slug: "simple-account",
          notes: null,
        })
      );
    });

    it("should auto-generate slug from name", async () => {
      const testCases = [
        { name: "Test Account", expectedSlug: "test-account" },
        { name: "Account with Multiple Words", expectedSlug: "account-with-multiple-words" },
        { name: "UPPERCASE ACCOUNT", expectedSlug: "uppercase-account" },
      ];
      
      for (const { name, expectedSlug } of testCases) {
        const result = await caller.accountRoutes.save({ name });
        expect(result.slug).toBe(expectedSlug);
      }
    });

    it("should reject account names that are too short", async () => {
      await expect(
        caller.accountRoutes.save({ name: "a" })
      ).rejects.toThrow();
    });

    it("should reject account names that are too long", async () => {
      const longName = "a".repeat(51);
      await expect(
        caller.accountRoutes.save({ name: longName })
      ).rejects.toThrow();
    });

    it("should reject account names with invalid characters", async () => {
      await expect(
        caller.accountRoutes.save({ name: "test<script>alert('xss')</script>" })
      ).rejects.toThrow();
    });

    it("should reject notes that are too long", async () => {
      const longNotes = "a".repeat(501);
      await expect(
        caller.accountRoutes.save({ 
          name: "Test Account",
          notes: longNotes 
        })
      ).rejects.toThrow();
    });

    it("should handle special characters in names properly", async () => {
      const result = await caller.accountRoutes.save({
        name: "Test's \"Account\" & More",
        notes: "Notes with 'quotes' and \"double quotes\"",
      });
      
      expect(result.name).toBe("Test's \"Account\" & More");
      expect(result.notes).toBe("Notes with 'quotes' and \"double quotes\"");
    });
  });

  describe("accounts.save - Update Account", () => {
    it("should update existing account with valid data", async () => {
      const { accounts } = await seedTestData(db);
      const accountToUpdate = accounts[0];
      
      const updatedData = {
        id: accountToUpdate.id,
        name: "Updated Account Name",
        notes: "Updated notes",
      };
      
      const result = await caller.accountRoutes.save(updatedData);
      
      expect(result).toEqual(
        expect.objectContaining({
          id: accountToUpdate.id,
          name: updatedData.name,
          notes: updatedData.notes,
          updatedAt: expect.any(String),
        })
      );
    });

    it("should throw error when updating non-existent account", async () => {
      await expect(
        caller.accountRoutes.save({
          id: 99999,
          name: "Non-existent Account",
        })
      ).rejects.toThrow(TRPCError);
      
      try {
        await caller.accountRoutes.save({
          id: 99999,
          name: "Non-existent Account",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("NOT_FOUND");
      }
    });

    it("should update only provided fields", async () => {
      const { accounts } = await seedTestData(db);
      const accountToUpdate = accounts[0];
      const originalName = accountToUpdate.name;
      
      // Update only notes
      const result = await caller.accountRoutes.save({
        id: accountToUpdate.id,
        notes: "Only notes updated",
      });
      
      expect(result.name).toBe(originalName); // Name should remain unchanged
      expect(result.notes).toBe("Only notes updated");
    });
  });

  describe("accounts.remove - Delete Account", () => {
    it("should soft delete existing account", async () => {
      const { accounts } = await seedTestData(db);
      const accountToDelete = accounts[0];
      
      const result = await caller.accountRoutes.remove({ id: accountToDelete.id });
      
      expect(result).toEqual(
        expect.objectContaining({
          id: accountToDelete.id,
          deletedAt: expect.any(String),
        })
      );
      
      // Verify account is not returned in all() query
      const allAccounts = await caller.accountRoutes.all();
      expect(allAccounts.find(acc => acc.id === accountToDelete.id)).toBeUndefined();
    });

    it("should throw NOT_FOUND error for non-existent account", async () => {
      await expect(
        caller.accountRoutes.remove({ id: 99999 })
      ).rejects.toThrow(TRPCError);
      
      try {
        await caller.accountRoutes.remove({ id: 99999 });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("NOT_FOUND");
        expect((error as TRPCError).message).toBe("Account not found or could not be deleted");
      }
    });

    it("should throw BAD_REQUEST error when no ID provided", async () => {
      await expect(
        caller.accountRoutes.remove({} as any)
      ).rejects.toThrow();
    });

    it("should reject negative account IDs", async () => {
      await expect(
        caller.accountRoutes.remove({ id: -1 })
      ).rejects.toThrow();
    });

    it("should not permanently delete account data", async () => {
      const { accounts } = await seedTestData(db);
      const accountToDelete = accounts[0];
      
      await caller.accountRoutes.remove({ id: accountToDelete.id });
      
      // Check that the account still exists in the database with deletedAt timestamp
      const deletedAccount = await db.query.accounts.findFirst({
        where: (accounts, { eq }) => eq(accounts.id, accountToDelete.id),
      });
      
      expect(deletedAccount).toBeDefined();
      expect(deletedAccount?.deletedAt).not.toBeNull();
    });
  });

  describe("Complex Integration Scenarios", () => {
    it("should handle full CRUD lifecycle", async () => {
      // Create account
      const created = await caller.accountRoutes.save({
        name: "Lifecycle Test Account",
        notes: "Initial notes",
      });
      
      expect(created.id).toBeDefined();
      
      // Read account
      const loaded = await caller.accountRoutes.load({ id: created.id });
      expect(loaded.name).toBe("Lifecycle Test Account");
      
      // Update account
      const updated = await caller.accountRoutes.save({
        id: created.id,
        name: "Updated Lifecycle Account",
        notes: "Updated notes",
      });
      expect(updated.name).toBe("Updated Lifecycle Account");
      
      // Delete account
      const deleted = await caller.accountRoutes.remove({ id: created.id });
      expect(deleted.deletedAt).toBeDefined();
      
      // Verify deletion
      await expect(
        caller.accountRoutes.load({ id: created.id })
      ).rejects.toThrow(TRPCError);
    });

    it("should maintain referential integrity with transactions", async () => {
      const { accounts } = await seedTestData(db);
      const accountWithTransactions = accounts[0];
      
      // Verify account has transactions
      const loadedAccount = await caller.accountRoutes.load({ id: accountWithTransactions.id });
      expect(loadedAccount.transactions.length).toBeGreaterThan(0);
      
      // Delete account
      await caller.accountRoutes.remove({ id: accountWithTransactions.id });
      
      // Transactions should still exist but account should not be accessible
      // This tests soft delete behavior
      await expect(
        caller.accountRoutes.load({ id: accountWithTransactions.id })
      ).rejects.toThrow(TRPCError);
    });

    it("should handle concurrent operations correctly", async () => {
      const accountData = {
        name: "Concurrent Test Account",
        notes: "Testing concurrent operations",
      };
      
      const created = await caller.accountRoutes.save(accountData);
      
      // Simulate concurrent updates
      const updatePromises = Array.from({ length: 5 }, (_, index) =>
        caller.accountRoutes.save({
          id: created.id,
          notes: `Concurrent update ${index}`,
        })
      );
      
      const results = await Promise.allSettled(updatePromises);
      
      // All updates should succeed (last one wins)
      results.forEach(result => {
        expect(result.status).toBe("fulfilled");
      });
      
      // Final state should be consistent
      const final = await caller.accountRoutes.load({ id: created.id });
      expect(final.notes).toMatch(/^Concurrent update \d$/);
    });
  });
});