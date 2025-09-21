// Simple in-memory cache for performance optimization
// In production, this could be replaced with Redis or similar

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 1000, cleanupIntervalMs: number = 60000) {
    this.maxSize = maxSize;

    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    // 5 min default TTL
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.cache.size / this.maxSize) * 100),
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Global cache instances
export const queryCache = new MemoryCache(500, 30000); // 500 entries, cleanup every 30s
export const dataCache = new MemoryCache(200, 60000); // 200 entries, cleanup every 60s

// Cache key generators for consistency
export const cacheKeys = {
  accountSummary: (id: number) => `account:${id}:summary`,
  accountTransactions: (id: number, page: number, pageSize: number, sortBy?: string, sortOrder?: string, dateFrom?: string, dateTo?: string) =>
    `account:${id}:transactions:${page}:${pageSize}:${sortBy || "date"}:${sortOrder || "desc"}:${dateFrom || "null"}:${dateTo || "null"}`,
  recentTransactions: (id: number, limit: number) => `account:${id}:recent:${limit}`,
  balanceHistory: (id: number, fromDate?: string, toDate?: string, groupBy?: string) =>
    `account:${id}:balance:${fromDate || ""}:${toDate || ""}:${groupBy || "day"}`,
  searchTransactions: (id: number, query: string) => `account:${id}:search:${query}`,
  allAccounts: () => "accounts:all",
  allCategories: () => "categories:all",
  allPayees: () => "payees:all",
  allViews: () => "views:all",
} as const;

// Utility functions for cache management
export function invalidateAccountCache(accountId: number): void {
  const patterns = [`account:${accountId}:`, "accounts:all"];

  for (const [key] of queryCache["cache"].entries()) {
    if (patterns.some((pattern) => key.includes(pattern))) {
      queryCache.delete(key);
    }
  }
}

export function invalidateEntityCache(entityType: "categories" | "payees" | "views"): void {
  const key = `${entityType}:all`;
  queryCache.delete(key);

  // Also invalidate account caches as they may include entity data
  for (const [key] of queryCache["cache"].entries()) {
    if (key.includes("account:") && key.includes("transactions")) {
      queryCache.delete(key);
    }
  }
}

// Performance monitoring utilities
export function getCacheMetrics() {
  return {
    queryCache: queryCache.getStats(),
    dataCache: dataCache.getStats(),
    totalMemoryUsage: process.memoryUsage?.() || {heapUsed: 0, heapTotal: 0},
  };
}
