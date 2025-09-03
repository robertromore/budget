import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createCaller } from "../../../src/lib/trpc/router";
import { setupTestDb, clearTestDb } from "../setup/test-db";
import { accounts, transactions, categories, payees } from "$lib/schema";
import { queryCache } from "$lib/utils/cache";

describe("Optimized Account Endpoints Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let caller: ReturnType<typeof createCaller>;
  let testAccount: any;
  let testCategory: any;
  let testPayee: any;

  beforeEach(async () => {
    db = await setupTestDb();
    const ctx = { db, isTest: true };
    caller = createCaller(ctx);

    // Clear cache from previous tests
    queryCache.clear();

    // Clean up from previous tests
    await db.delete(transactions);
    await db.delete(accounts);
    await db.delete(categories);
    await db.delete(payees);

    // Create test fixtures
    [testAccount] = await db.insert(accounts).values({
      name: "Optimized Test Account",
      slug: "optimized-test-account",
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

  describe("Account Summary Endpoint", () => {
    test("should load account summary without transactions", async () => {
      // Create some transactions to test balance calculation
      await db.insert(transactions).values([
        {
          accountId: testAccount.id,
          amount: -100.50,
          notes: "Test purchase",
          date: new Date().toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        },
        {
          accountId: testAccount.id,
          amount: 200.25,
          notes: "Test deposit",
          date: new Date().toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        }
      ]);

      const summary = await caller.optimizedAccountsRoutes.loadSummary({ 
        id: testAccount.id 
      });

      expect(summary.id).toBe(testAccount.id);
      expect(summary.name).toBe("Optimized Test Account");
      expect(summary.balance).toBe(99.75); // 200.25 - 100.50
      expect(summary.transactionCount).toBe(2);
      
      // Should NOT include transactions array
      expect(summary).not.toHaveProperty("transactions");
    });

    test("should handle account with no transactions", async () => {
      const summary = await caller.optimizedAccountsRoutes.loadSummary({ 
        id: testAccount.id 
      });

      expect(summary.balance).toBe(0);
      expect(summary.transactionCount).toBe(0);
    });

    test("should throw error for non-existent account", async () => {
      await expect(
        caller.optimizedAccountsRoutes.loadSummary({ id: 99999 })
      ).rejects.toThrow("Account not found");
    });

    test("should use caching for repeated requests", async () => {
      const startTime1 = performance.now();
      const summary1 = await caller.optimizedAccountsRoutes.loadSummary({ 
        id: testAccount.id 
      });
      const endTime1 = performance.now();
      
      const startTime2 = performance.now();
      const summary2 = await caller.optimizedAccountsRoutes.loadSummary({ 
        id: testAccount.id 
      });
      const endTime2 = performance.now();

      expect(summary1).toEqual(summary2);
      // Second request should be faster due to caching
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });
  });

  describe("All Account Summaries Endpoint", () => {
    test("should load all account summaries efficiently", async () => {
      // Create additional test account
      const [secondAccount] = await db.insert(accounts).values({
        name: "Second Account",
        slug: "second-account",
        type: "savings"
      }).returning();

      // Add transactions to both accounts
      await db.insert(transactions).values([
        {
          accountId: testAccount.id,
          amount: -50.00,
          notes: "First account transaction",
          date: new Date().toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        },
        {
          accountId: secondAccount.id,
          amount: 100.00,
          notes: "Second account transaction",
          date: new Date().toISOString(),
          categoryId: testCategory.id,
          payeeId: testPayee.id
        }
      ]);

      const summaries = await caller.optimizedAccountsRoutes.loadAllSummaries();

      expect(summaries).toHaveLength(2);
      
      const firstAccountSummary = summaries.find(a => a.id === testAccount.id);
      const secondAccountSummary = summaries.find(a => a.id === secondAccount.id);
      
      expect(firstAccountSummary?.balance).toBe(-50.00);
      expect(firstAccountSummary?.transactionCount).toBe(1);
      
      expect(secondAccountSummary?.balance).toBe(100.00);
      expect(secondAccountSummary?.transactionCount).toBe(1);

      // Should NOT include transactions arrays
      summaries.forEach(summary => {
        expect(summary).not.toHaveProperty("transactions");
      });
    });

    test("should handle accounts with no transactions", async () => {
      const summaries = await caller.optimizedAccountsRoutes.loadAllSummaries();

      expect(summaries).toHaveLength(1);
      expect(summaries[0].balance).toBe(0);
      expect(summaries[0].transactionCount).toBe(0);
    });
  });

  describe("Paginated Transaction Loading", () => {
    beforeEach(async () => {
      // Create 25 test transactions
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
    });

    test("should load first page of transactions", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        page: 0,
        pageSize: 10
      });

      expect(result.transactions).toHaveLength(10);
      expect(result.pagination.page).toBe(0);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalCount).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });

    test("should load second page of transactions", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        page: 1,
        pageSize: 10
      });

      expect(result.transactions).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    test("should load last page of transactions", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        page: 2,
        pageSize: 10
      });

      expect(result.transactions).toHaveLength(5); // Only 5 remaining
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    test("should sort transactions by different fields", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        page: 0,
        pageSize: 10, // Must be >= 10 per schema validation
        sortBy: "amount",
        sortOrder: "asc"
      });

      expect(result.transactions).toHaveLength(10);
      // Check that amounts are in ascending order
      const amounts = result.transactions.map(t => t.amount);
      expect(amounts[0]).toBeLessThan(amounts[1]);
      expect(amounts[1]).toBeLessThan(amounts[2]);
    });

    test("should calculate running balance for first page chronological", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        page: 0,
        pageSize: 10,
        sortBy: "date",
        sortOrder: "asc"
      });

      expect(result.transactions[0].balance).toBe(-10); // First transaction
      expect(result.transactions[1].balance).toBe(-30); // -10 + -20
      expect(result.transactions[2].balance).toBe(-60); // -30 + -30
    });

    test("should not calculate running balance for non-chronological pages", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        page: 1, // Not first page
        pageSize: 10,
        sortBy: "date",
        sortOrder: "asc"
      });

      result.transactions.forEach(transaction => {
        expect(transaction.balance).toBeNull();
      });
    });
  });

  describe("Transaction Search and Filtering", () => {
    beforeEach(async () => {
      // Create searchable transactions
      await db.insert(transactions).values([
        {
          accountId: testAccount.id,
          amount: -85.50,
          notes: "Grocery store purchase",
          date: "2024-01-01T10:00:00.000Z",
          categoryId: testCategory.id,
          payeeId: testPayee.id
        },
        {
          accountId: testAccount.id,
          amount: -45.00,
          notes: "Gas station fill-up",
          date: "2024-01-02T10:00:00.000Z",
          categoryId: testCategory.id,
          payeeId: testPayee.id
        },
        {
          accountId: testAccount.id,
          amount: -25.75,
          notes: "Grocery delivery",
          date: "2024-01-03T10:00:00.000Z",
          categoryId: testCategory.id,
          payeeId: testPayee.id
        }
      ]);
    });

    test("should search transactions by notes", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        searchQuery: "grocery"
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].notes).toContain("Grocery");
      expect(result.transactions[1].notes).toContain("Grocery");
    });

    test("should search transactions by amount", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        searchQuery: "85"  // Search for partial amount match
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(-85.50);
    });

    test("should filter transactions by date range", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        dateFrom: "2024-01-01T00:00:00.000Z",
        dateTo: "2024-01-02T23:59:59.999Z"
      });

      expect(result.transactions).toHaveLength(2); // Should exclude Jan 3rd
    });

    test("should combine search and date filtering", async () => {
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        searchQuery: "grocery",
        dateFrom: "2024-01-03T00:00:00.000Z",
        dateTo: "2024-01-03T23:59:59.999Z"
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].notes).toBe("Grocery delivery");
    });
  });

  describe("Recent Transactions Endpoint", () => {
    test("should load recent transactions with limit", async () => {
      // Create transactions with different timestamps
      const transactionPromises = [];
      for (let i = 0; i < 15; i++) {
        transactionPromises.push(
          db.insert(transactions).values({
            accountId: testAccount.id,
            amount: -(i + 1),
            notes: `Recent transaction ${i + 1}`,
            date: new Date(Date.now() + i * 1000).toISOString(),
            categoryId: testCategory.id,
            payeeId: testPayee.id
          }).returning()
        );
      }
      await Promise.all(transactionPromises);

      const recent = await caller.optimizedAccountsRoutes.loadRecentTransactions({
        accountId: testAccount.id,
        limit: 5
      });

      expect(recent).toHaveLength(5);
      // Should be ordered by most recent first
      expect(recent[0].notes).toContain("Recent transaction");
      
      // Should only include essential payee and category fields
      expect(recent[0].payee).toEqual({
        id: testPayee.id,
        name: testPayee.name
      });
      expect(recent[0].category).toEqual({
        id: testCategory.id,
        name: testCategory.name
      });
    });

    test("should respect default limit", async () => {
      // Create 15 transactions
      const transactionPromises = [];
      for (let i = 0; i < 15; i++) {
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

      const recent = await caller.optimizedAccountsRoutes.loadRecentTransactions({
        accountId: testAccount.id
      });

      expect(recent).toHaveLength(10); // Default limit
    });
  });

  describe("Balance History Endpoint", () => {
    beforeEach(async () => {
      // Create transactions across multiple days
      await db.insert(transactions).values([
        {
          accountId: testAccount.id,
          amount: -100,
          notes: "Day 1 transaction",
          date: "2024-01-01T10:00:00.000Z",
          categoryId: testCategory.id,
          payeeId: testPayee.id
        },
        {
          accountId: testAccount.id,
          amount: -50,
          notes: "Day 1 transaction 2",
          date: "2024-01-01T15:00:00.000Z",
          categoryId: testCategory.id,
          payeeId: testPayee.id
        },
        {
          accountId: testAccount.id,
          amount: 200,
          notes: "Day 2 transaction",
          date: "2024-01-02T10:00:00.000Z",
          categoryId: testCategory.id,
          payeeId: testPayee.id
        }
      ]);
    });

    test("should group balance history by day", async () => {
      const history = await caller.optimizedAccountsRoutes.getBalanceHistory({
        accountId: testAccount.id,
        groupBy: "day"
      });

      expect(history).toHaveLength(2);
      
      const day1 = history.find(h => h.period === "2024-01-01");
      const day2 = history.find(h => h.period === "2024-01-02");
      
      expect(day1?.totalAmount).toBe(-150); // -100 + -50
      expect(day1?.transactionCount).toBe(2);
      
      expect(day2?.totalAmount).toBe(200);
      expect(day2?.transactionCount).toBe(1);
    });

    test("should filter balance history by date range", async () => {
      const history = await caller.optimizedAccountsRoutes.getBalanceHistory({
        accountId: testAccount.id,
        fromDate: "2024-01-01T00:00:00.000Z",
        toDate: "2024-01-01T23:59:59.999Z",
        groupBy: "day"
      });

      expect(history).toHaveLength(1);
      expect(history[0].period).toBe("2024-01-01");
      expect(history[0].totalAmount).toBe(-150);
    });

    test("should group balance history by month", async () => {
      const history = await caller.optimizedAccountsRoutes.getBalanceHistory({
        accountId: testAccount.id,
        groupBy: "month"
      });

      expect(history).toHaveLength(1);
      expect(history[0].period).toBe("2024-01");
      expect(history[0].totalAmount).toBe(50); // -150 + 200
      expect(history[0].transactionCount).toBe(3);
    });
  });

  describe("Performance Considerations", () => {
    test("should handle large datasets efficiently", async () => {
      // Create a substantial number of transactions
      const largeDatasetSize = 100;
      const transactionPromises = [];
      
      for (let i = 0; i < largeDatasetSize; i++) {
        transactionPromises.push(
          db.insert(transactions).values({
            accountId: testAccount.id,
            amount: -(i + 1),
            notes: `Performance test transaction ${i + 1}`,
            date: new Date(Date.now() + i * 1000).toISOString(),
            categoryId: testCategory.id,
            payeeId: testPayee.id
          }).returning()
        );
      }
      
      await Promise.all(transactionPromises);

      // Test paginated loading performance
      const startTime = performance.now();
      const result = await caller.optimizedAccountsRoutes.loadTransactions({
        accountId: testAccount.id,
        page: 0,
        pageSize: 20
      });
      const endTime = performance.now();

      expect(result.transactions).toHaveLength(20);
      expect(result.pagination.totalCount).toBe(largeDatasetSize);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast

      console.log(`Paginated load time for ${largeDatasetSize} transactions: ${(endTime - startTime).toFixed(2)}ms`);
    });

    test("should efficiently load account summaries vs full data", async () => {
      // Create moderate number of transactions
      const transactionPromises = [];
      for (let i = 0; i < 50; i++) {
        transactionPromises.push(
          db.insert(transactions).values({
            accountId: testAccount.id,
            amount: -Math.random() * 100,
            notes: `Performance comparison ${i}`,
            date: new Date(Date.now() + i * 1000).toISOString(),
            categoryId: testCategory.id,
            payeeId: testPayee.id
          }).returning()
        );
      }
      await Promise.all(transactionPromises);

      // Time optimized summary endpoint
      const summaryStart = performance.now();
      const summary = await caller.optimizedAccountsRoutes.loadSummary({ 
        id: testAccount.id 
      });
      const summaryEnd = performance.now();

      // Time original full load endpoint  
      const fullStart = performance.now();
      const full = await caller.accountRoutes.load({ 
        id: testAccount.id 
      });
      const fullEnd = performance.now();

      const summaryTime = summaryEnd - summaryStart;
      const fullTime = fullEnd - fullStart;

      expect(summary.balance).toBeCloseTo(full.balance, 2);
      expect(summaryTime).toBeLessThan(fullTime);

      console.log(`Summary load: ${summaryTime.toFixed(2)}ms vs Full load: ${fullTime.toFixed(2)}ms`);
      console.log(`Performance improvement: ${((fullTime - summaryTime) / fullTime * 100).toFixed(1)}%`);
    });
  });
});