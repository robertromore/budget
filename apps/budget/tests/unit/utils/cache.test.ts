import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { queryCache, dataCache, cacheKeys, invalidateAccountCache, invalidateEntityCache, getCacheMetrics } from "../../../src/lib/utils/cache";

describe("Cache System Tests", () => {
  beforeEach(() => {
    queryCache.clear();
    dataCache.clear();
  });

  afterEach(() => {
    queryCache.clear();
    dataCache.clear();
  });

  describe("Basic Cache Operations", () => {
    test("should store and retrieve values", () => {
      const key = "test-key";
      const value = { id: 1, name: "Test Data" };
      
      queryCache.set(key, value, 60000); // 1 minute TTL
      const retrieved = queryCache.get(key);
      
      expect(retrieved).toEqual(value);
    });

    test("should return undefined for non-existent keys", () => {
      const result = queryCache.get("non-existent-key");
      expect(result).toBeUndefined();
    });

    test("should respect TTL and expire entries", async () => {
      const key = "expiring-key";
      const value = "test-value";
      
      queryCache.set(key, value, 50); // 50ms TTL
      
      // Should exist immediately
      expect(queryCache.get(key)).toBe(value);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Should be expired
      expect(queryCache.get(key)).toBeUndefined();
    });

    test("should check key existence correctly", () => {
      const key = "existence-test";
      const value = "test";
      
      expect(queryCache.has(key)).toBe(false);
      
      queryCache.set(key, value, 60000);
      expect(queryCache.has(key)).toBe(true);
      
      queryCache.delete(key);
      expect(queryCache.has(key)).toBe(false);
    });

    test("should delete keys successfully", () => {
      const key = "delete-test";
      const value = "test";
      
      queryCache.set(key, value, 60000);
      expect(queryCache.has(key)).toBe(true);
      
      const deleted = queryCache.delete(key);
      expect(deleted).toBe(true);
      expect(queryCache.has(key)).toBe(false);
    });

    test("should clear all entries", () => {
      queryCache.set("key1", "value1", 60000);
      queryCache.set("key2", "value2", 60000);
      
      expect(queryCache.size()).toBe(2);
      
      queryCache.clear();
      
      expect(queryCache.size()).toBe(0);
      expect(queryCache.get("key1")).toBeUndefined();
      expect(queryCache.get("key2")).toBeUndefined();
    });
  });

  describe("Cache Key Generators", () => {
    test("should generate consistent account summary keys", () => {
      const accountId = 123;
      const key1 = cacheKeys.accountSummary(accountId);
      const key2 = cacheKeys.accountSummary(accountId);
      
      expect(key1).toBe(key2);
      expect(key1).toBe("account:123:summary");
    });

    test("should generate consistent transaction keys", () => {
      const accountId = 123;
      const page = 0;
      const pageSize = 50;
      
      const key = cacheKeys.accountTransactions(accountId, page, pageSize);
      expect(key).toBe("account:123:transactions:0:50");
    });

    test("should generate consistent search keys", () => {
      const accountId = 123;
      const query = "groceries";
      
      const key = cacheKeys.searchTransactions(accountId, query);
      expect(key).toBe("account:123:search:groceries");
    });

    test("should generate entity cache keys", () => {
      expect(cacheKeys.allAccounts()).toBe("accounts:all");
      expect(cacheKeys.allCategories()).toBe("categories:all");
      expect(cacheKeys.allPayees()).toBe("payees:all");
      expect(cacheKeys.allViews()).toBe("views:all");
    });
  });

  describe("Cache Invalidation", () => {
    test("should invalidate account-specific cache entries", () => {
      const accountId = 123;
      
      // Set up various account-related cache entries
      queryCache.set(cacheKeys.accountSummary(accountId), { balance: 1000 }, 60000);
      queryCache.set(cacheKeys.accountTransactions(accountId, 0, 50), [], 60000);
      queryCache.set(cacheKeys.recentTransactions(accountId, 10), [], 60000);
      queryCache.set(cacheKeys.allAccounts(), [], 60000);
      queryCache.set(cacheKeys.allCategories(), [], 60000); // Should not be affected
      
      // Verify entries exist
      expect(queryCache.has(cacheKeys.accountSummary(accountId))).toBe(true);
      expect(queryCache.has(cacheKeys.allAccounts())).toBe(true);
      expect(queryCache.has(cacheKeys.allCategories())).toBe(true);
      
      // Invalidate account cache
      invalidateAccountCache(accountId);
      
      // Account-specific and accounts:all should be invalidated
      expect(queryCache.has(cacheKeys.accountSummary(accountId))).toBe(false);
      expect(queryCache.has(cacheKeys.allAccounts())).toBe(false);
      
      // Other entity caches should remain
      expect(queryCache.has(cacheKeys.allCategories())).toBe(true);
    });

    test("should invalidate entity-specific cache entries", () => {
      const accountId = 123;
      
      // Set up various cache entries
      queryCache.set(cacheKeys.allCategories(), [], 60000);
      queryCache.set(cacheKeys.accountTransactions(accountId, 0, 50), [], 60000);
      queryCache.set(cacheKeys.allPayees(), [], 60000); // Should not be affected
      
      // Verify entries exist
      expect(queryCache.has(cacheKeys.allCategories())).toBe(true);
      expect(queryCache.has(cacheKeys.accountTransactions(accountId, 0, 50))).toBe(true);
      expect(queryCache.has(cacheKeys.allPayees())).toBe(true);
      
      // Invalidate categories cache
      invalidateEntityCache('categories');
      
      // Categories and account transactions should be invalidated
      expect(queryCache.has(cacheKeys.allCategories())).toBe(false);
      expect(queryCache.has(cacheKeys.accountTransactions(accountId, 0, 50))).toBe(false);
      
      // Payees should remain
      expect(queryCache.has(cacheKeys.allPayees())).toBe(true);
    });
  });

  describe("Cache Statistics and Metrics", () => {
    test("should provide accurate cache statistics", () => {
      // Add some entries
      queryCache.set("key1", "value1", 60000);
      queryCache.set("key2", "value2", 60000);
      dataCache.set("key3", "value3", 60000);
      
      const stats = queryCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.utilizationPercent).toBeGreaterThanOrEqual(0);
    });

    test("should provide cache metrics", () => {
      // Add some entries to both caches
      queryCache.set("query1", "result1", 60000);
      dataCache.set("data1", "value1", 60000);
      
      const metrics = getCacheMetrics();
      
      expect(metrics.queryCache).toBeDefined();
      expect(metrics.dataCache).toBeDefined();
      expect(metrics.queryCache.size).toBe(1);
      expect(metrics.dataCache.size).toBe(1);
    });
  });

  describe("Cache Capacity Management", () => {
    test("should handle cache capacity limits", () => {
      // This test would need a small cache instance to test capacity
      // For now, just verify the size tracking works
      const initialSize = queryCache.size();
      
      queryCache.set("test1", "value1", 60000);
      expect(queryCache.size()).toBe(initialSize + 1);
      
      queryCache.set("test2", "value2", 60000);
      expect(queryCache.size()).toBe(initialSize + 2);
    });
  });

  describe("Performance Considerations", () => {
    test("should handle large values efficiently", () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`
        }))
      };
      
      const start = performance.now();
      queryCache.set("large-object", largeObject, 60000);
      const stored = queryCache.get("large-object");
      const end = performance.now();
      
      expect(stored).toEqual(largeObject);
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    test("should handle many small entries efficiently", () => {
      const start = performance.now();
      
      // Add many small entries
      for (let i = 0; i < 100; i++) {
        queryCache.set(`key-${i}`, `value-${i}`, 60000);
      }
      
      // Retrieve them all
      for (let i = 0; i < 100; i++) {
        expect(queryCache.get(`key-${i}`)).toBe(`value-${i}`);
      }
      
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should be fast
    });
  });
});