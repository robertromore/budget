import { QueryClient } from "@tanstack/svelte-query";
import { browser } from "$app/environment";

/**
 * Centralized TanStack Query client with SSR-safe configuration
 * Based on Epicenter's pattern for browser-only execution
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Only enable queries in browser environment for SSR safety
      enabled: browser,
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
      // Disable refetch on reconnect for better UX in offline scenarios
      refetchOnReconnect: true,
      // Network mode for better offline support
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

/**
 * Helper to get the query client instance
 * Useful for imperative access to the client
 */
export function getQueryClient(): QueryClient {
  return queryClient;
}

/**
 * Helper to check if we're in a browser environment
 * Useful for conditional query execution
 */
export function isBrowser(): boolean {
  return browser;
}

/**
 * Helper to safely execute browser-only operations
 */
export function withBrowser<T>(fn: () => T): T | undefined {
  return browser ? fn() : undefined;
}

/**
 * Query client configuration presets for different use cases
 */
export const queryPresets = {
  /**
   * Fast refresh preset for real-time data
   */
  realtime: {
    staleTime: 0,
    gcTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 1000, // 5 seconds
    refetchIntervalInBackground: false,
  },

  /**
   * Long cache preset for rarely changing data
   */
  static: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  },

  /**
   * Background preset for non-critical data
   */
  background: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
} as const;

/**
 * Common cache invalidation patterns
 */
export const cachePatterns = {
  /**
   * Invalidate all queries for a specific domain
   */
  invalidateDomain: (domain: string) => {
    queryClient.invalidateQueries({
      queryKey: [domain],
    });
  },

  /**
   * Invalidate queries with prefix matching
   */
  invalidatePrefix: (prefix: readonly unknown[]) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        if (!Array.isArray(queryKey) || queryKey.length < prefix.length) {
          return false;
        }
        // Check if query key starts with the prefix
        return prefix.every((prefixPart, index) => {
          return queryKey[index] === prefixPart;
        });
      },
    });
  },

  /**
   * Remove specific query from cache
   */
  removeQuery: (queryKey: readonly unknown[]) => {
    queryClient.removeQueries({
      queryKey,
    });
  },

  /**
   * Set query data imperatively
   */
  setQueryData: <T>(queryKey: readonly unknown[], data: T) => {
    queryClient.setQueryData(queryKey, data);
  },

  /**
   * Get query data imperatively
   */
  getQueryData: <T>(queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  },

  /**
   * Prefetch query data
   */
  prefetchQuery: (queryKey: readonly unknown[], queryFn: () => Promise<unknown>) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
    });
  },

  /**
   * Update queries matching a condition with a data transformation function
   */
  updateQueriesWithCondition: <T>(
    condition: (queryKey: readonly unknown[]) => boolean,
    updater: (oldData: T) => T
  ) => {
    queryClient.getQueryCache().getAll().forEach(query => {
      if (condition(query.queryKey)) {
        const oldData = query.state.data;
        if (oldData !== undefined) {
          queryClient.setQueryData(query.queryKey, updater(oldData as T));
        }
      }
    });
  },
} as const;