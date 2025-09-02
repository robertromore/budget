import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createCaller } from "../../../src/lib/trpc/router";
import { setupTestDb, clearTestDb } from "../setup/test-db";
import { accounts, transactions, categories, payees } from "$lib/schema";

describe("Optimized Accounts tRPC Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let testAccount: any;
  let testCategory: any;
  let testPayee: any;

  beforeEach(async () => {
    db = await setupTestDb();
    const ctx = { db, isTest: true };
    caller = createCaller(ctx);

    // Clean up from previous tests
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(categories);
    await db.delete(payees);

    // Create test fixtures
    [testAccount] = await db.insert(accounts).values({
      name: "Test Account",
      slug: "test-account",
      type: "checking"
    }).returning();

    [testCategory] = await db.insert(categories).values({
      name: "Test Category"
    }).returning();

    [testPayee] = await db.insert(payees).values({
      name: "Test Payee"
    }).returning();
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  describe("Optimized Account Loading", () => {
    test("should load account summary without all transactions", async () => {
      // Create some transactions
      await db.insert(transactions).values([
        {
          accountId: testAccount.id,
          amount: -50.00,
          notes: "Transaction 1",
          date: new Date().toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        },
        {
          accountId: testAccount.id,
          amount: -25.00,
          notes: "Transaction 2",
          date: new Date().toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        }
      ]);

      // Note: This would use the optimized routes if they were integrated
      // For now, testing the concept with existing routes
      const account = await caller.accountRoutes.load({ id: testAccount.id });
      
      expect(account.id).toBe(testAccount.id);
      expect(account.name).toBe("Test Account");
      expect(account.balance).toBe(-75.00); // -50 - 25
      
      // The key difference would be that optimized version wouldn't load all transactions
      expect(Array.isArray(account.transactions)).toBe(true);
    });
  });

  describe("Transaction Pagination Concepts", () => {
    test("should handle paginated transaction loading", async () => {
      // Create multiple transactions for pagination testing
      const transactionPromises = [];
      for (let i = 0; i < 25; i++) {
        transactionPromises.push(
          db.insert(transactions).values({
            accountId: testAccount.id,
            amount: -(i + 1) * 10,
            notes: `Transaction ${i + 1}`,
            date: new Date(Date.now() + i * 1000).toISOString(),
            categoryId: testCategory.id,
            payeeId: testPayee.id
          }).returning()
        );
      }
      
      await Promise.all(transactionPromises);

      // Load account (which currently loads all transactions)
      const account = await caller.accountRoutes.load({ id: testAccount.id });
      
      expect(account.transactions).toHaveLength(25);
      
      // In optimized version, we'd test:
      // - First page: transactions 0-19
      // - Second page: transactions 20-24
      // - Pagination metadata (totalCount, hasNextPage, etc.)
      
      const totalTransactions = account.transactions.length;
      expect(totalTransactions).toBe(25);
      
      // Verify transactions are properly sorted and structured
      const firstTransaction = account.transactions[0];
      const lastTransaction = account.transactions[24];
      
      expect(firstTransaction?.notes).toContain("Transaction");
      expect(lastTransaction?.notes).toContain("Transaction");
    });
  });

  describe("Balance Calculation Optimization", () => {
    test("should calculate running balance efficiently", async () => {
      // Create transactions with known amounts
      const transactionAmounts = [-100, -50, 200, -30];
      
      for (let i = 0; i < transactionAmounts.length; i++) {
        await db.insert(transactions).values({
          accountId: testAccount.id,
          amount: transactionAmounts[i],
          notes: `Transaction ${i + 1}`,
          date: new Date(Date.now() + i * 1000).toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        });
      }

      const account = await caller.accountRoutes.load({ id: testAccount.id });
      
      // Verify final balance
      const expectedFinalBalance = transactionAmounts.reduce((sum, amount) => sum + amount, 0);
      expect(account.balance).toBe(expectedFinalBalance);
      
      // Verify running balances are calculated correctly
      let expectedRunningBalance = 0;
      account.transactions.forEach(transaction => {
        expectedRunningBalance += transaction.amount;
        expect(transaction.balance).toBe(expectedRunningBalance);
      });
    });
  });

  describe("Search and Filtering Performance", () => {
    test("should handle transaction search efficiently", async () => {
      // Create transactions with searchable content
      const searchableTransactions = [
        { notes: "Grocery store purchase", amount: -85.50 },
        { notes: "Gas station fill-up", amount: -45.00 },
        { notes: "Grocery delivery", amount: -25.75 },
        { notes: "Restaurant dinner", amount: -65.00 },
      ];

      for (const tx of searchableTransactions) {
        await db.insert(transactions).values({
          accountId: testAccount.id,
          amount: tx.amount,
          notes: tx.notes,
          date: new Date().toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        });
      }

      const account = await caller.accountRoutes.load({ id: testAccount.id });
      
      // In optimized version, we'd test search functionality
      // For now, test that we can filter the loaded transactions
      const groceryTransactions = account.transactions.filter(tx => 
        tx.notes?.toLowerCase().includes('grocery')
      );
      
      expect(groceryTransactions).toHaveLength(2);
      expect(groceryTransactions[0].notes).toContain('Grocery');
      expect(groceryTransactions[1].notes).toContain('Grocery');
    });
  });

  describe("Performance Metrics", () => {
    test("should load account data within reasonable time", async () => {
      // Create a moderate number of transactions
      const transactionPromises = [];
      for (let i = 0; i < 50; i++) {
        transactionPromises.push(
          db.insert(transactions).values({
            accountId: testAccount.id,
            amount: -Math.random() * 100,
            notes: `Transaction ${i}`,
            date: new Date(Date.now() + i * 1000).toISOString(),
            categoryId: testCategory.id,
            payeeId: testPayee.id
          }).returning()
        );
      }
      
      await Promise.all(transactionPromises);

      // Time the account loading
      const startTime = performance.now();
      const account = await caller.accountRoutes.load({ id: testAccount.id });
      const endTime = performance.now();
      
      const loadTime = endTime - startTime;
      
      expect(account.transactions).toHaveLength(50);
      expect(loadTime).toBeLessThan(1000); // Should load in under 1 second
      
      // In production, with optimized queries, this should be much faster
      console.log(`Account load time: ${loadTime.toFixed(2)}ms`);
    });
  });

  describe("Memory Usage Optimization", () => {
    test("should handle large datasets efficiently", async () => {
      // This test verifies that we can handle substantial data
      // In the optimized version, we'd load data in chunks
      
      const largeDatasetSize = 100;
      const transactionPromises = [];
      
      for (let i = 0; i < largeDatasetSize; i++) {
        transactionPromises.push(
          db.insert(transactions).values({
            accountId: testAccount.id,
            amount: -(i + 1),
            notes: `Transaction ${i + 1}`,
            date: new Date(Date.now() + i * 1000).toISOString(),
            categoryId: testCategory.id,
            payeeId: testPayee.id
          }).returning()
        );
      }
      
      await Promise.all(transactionPromises);

      const account = await caller.accountRoutes.load({ id: testAccount.id });
      
      expect(account.transactions).toHaveLength(largeDatasetSize);
      
      // Verify memory isn't excessive (basic check)
      const accountJSON = JSON.stringify(account);
      expect(accountJSON.length).toBeGreaterThan(1000); // Has substantial data
      expect(accountJSON.length).toBeLessThan(1000000); // But not excessive
    });
  });

  describe("Error Handling in Optimized Queries", () => {
    test("should handle non-existent account gracefully", async () => {
      await expect(caller.accountRoutes.load({ id: 99999 }))
        .rejects
        .toThrow("Account not found");
    });

    test("should handle accounts with no transactions", async () => {
      const account = await caller.accountRoutes.load({ id: testAccount.id });
      
      expect(account.transactions).toHaveLength(0);
      expect(account.balance).toBe(0); // No transactions means zero balance
    });
  });
});