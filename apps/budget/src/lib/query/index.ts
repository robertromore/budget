/**
 * Unified namespace for all query operations
 * Provides a single entry point for all TanStack Query-based operations
 * Based on Epicenter's RPC pattern for better developer experience
 */

import * as transactions from "./transactions";
import * as budgets from "./budgets";
import * as accounts from "./accounts";
import * as payees from "./payees";
import * as categories from "./categories";
import * as patterns from "./patterns";

/**
 * Centralized RPC interface aggregating all query modules
 * Usage: import { rpc } from '$lib/query'
 * Then: rpc.transactions.getAllAccountTransactions(accountId).options()
 */
export const rpc = {
  transactions,
  budgets,
  accounts,
  payees,
  categories,
  patterns,
} as const;

/**
 * Re-export commonly used utilities for convenience
 */
export { queryClient, cachePatterns, queryPresets } from "./_client";
export { defineQuery, defineMutation, createQueryKeys } from "./_factory";

// Import for internal use in dev tools
import { queryClient } from "./_client";

/**
 * Type helpers for better TypeScript experience
 */
export type RPC = typeof rpc;
export type TransactionQueries = typeof transactions;
export type BudgetQueries = typeof budgets;
export type AccountQueries = typeof accounts;
export type PayeeQueries = typeof payees;
export type CategoryQueries = typeof categories;
export type PatternQueries = typeof patterns;

/**
 * Convenience re-exports for specific domains
 */
export { transactionKeys } from "./transactions";
export { budgetKeys } from "./budgets";
export { accountKeys } from "./accounts";
export { payeeKeys } from "./payees";
export { categoryKeys } from "./categories";
export { patternKeys } from "./patterns";

/**
 * Helper to get specific domain operations
 */
export const getTransactionOps = () => rpc.transactions;
export const getBudgetOps = () => rpc.budgets;
export const getAccountOps = () => rpc.accounts;
export const getPayeeOps = () => rpc.payees;
export const getCategoryOps = () => rpc.categories;
export const getPatternOps = () => rpc.patterns;

/**
 * Development helpers
 */
export const devTools = {
  /**
   * Clear all caches (useful for debugging)
   */
  clearAllCaches: () => {
    queryClient.clear();
  },

  /**
   * Get cache state for debugging
   */
  getCacheState: () => {
    return queryClient.getQueryCache().getAll();
  },

  /**
   * Invalidate all queries (useful for debugging)
   */
  invalidateAll: () => {
    queryClient.invalidateQueries();
  },
} as const;