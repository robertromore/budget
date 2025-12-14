/**
 * Unified namespace for all query operations
 * Provides a single entry point for all TanStack Query-based operations
 * Based on Epicenter's RPC pattern for better developer experience
 */

import * as accounts from "./accounts";
import * as budgets from "./budgets";
import * as categories from "./categories";
import * as categoryGroups from "./category-groups";
import * as medicalExpenses from "./medical-expenses";
import * as patterns from "./patterns";
import * as payeeCategories from "./payee-categories";
import * as payees from "./payees";
import * as schedules from "./schedules";
import * as transactions from "./transactions";
import * as views from "./views";
import * as workspaces from "./workspaces";

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
  categoryGroups,
  payeeCategories,
  patterns,
  medicalExpenses,
  workspaces,
  schedules,
  views,
} as const;

/**
 * Re-export commonly used utilities for convenience
 */
export { cachePatterns, queryClient, queryPresets } from "./_client";
export { createQueryKeys, defineMutation, defineQuery } from "./_factory";

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
export type CategoryGroupQueries = typeof categoryGroups;
export type PayeeCategoryQueries = typeof payeeCategories;
export type PatternQueries = typeof patterns;
export type MedicalExpenseQueries = typeof medicalExpenses;
export type WorkspaceQueries = typeof workspaces;
export type ScheduleQueries = typeof schedules;
export type ViewQueries = typeof views;

/**
 * Convenience re-exports for specific domains
 */
export { accountKeys } from "./accounts";
export { budgetKeys } from "./budgets";
export { categoryKeys } from "./categories";
export { categoryGroupKeys } from "./category-groups";
export { medicalExpenseKeys } from "./medical-expenses";
export { patternKeys } from "./patterns";
export { payeeCategoryKeys } from "./payee-categories";
export { payeeKeys } from "./payees";
export { scheduleKeys } from "./schedules";
export { transactionKeys } from "./transactions";
export { viewKeys } from "./views";
export { workspaceKeys } from "./workspaces";

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
