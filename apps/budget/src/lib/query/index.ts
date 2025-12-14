/**
 * Unified namespace for all query operations
 * Provides a single entry point for all TanStack Query-based operations
 * Based on Epicenter's RPC pattern for better developer experience
 */

import * as accounts from "./accounts";
import * as budgets from "./budgets";
import * as categories from "./categories";
import * as categoryGroups from "./category-groups";
import * as importProfiles from "./import-profiles";
import * as medicalExpenses from "./medical-expenses";
import * as patterns from "./patterns";
import * as payeeCategories from "./payee-categories";
import * as payees from "./payees";
import * as schedules from "./schedules";
import * as settings from "./settings";
import * as transactions from "./transactions";
import * as views from "./views";
import * as workspaces from "./workspaces";

/**
 * Centralized RPC interface aggregating all query modules
 * Usage: import { rpc } from '$lib/query'
 * Then: rpc.transactions.getAllAccountTransactions(accountId).options()
 */
export const rpc = {
  accounts,
  budgets,
  categories,
  categoryGroups,
  importProfiles,
  medicalExpenses,
  patterns,
  payeeCategories,
  payees,
  schedules,
  settings,
  transactions,
  views,
  workspaces,
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
export type AccountQueries = typeof accounts;
export type BudgetQueries = typeof budgets;
export type CategoryQueries = typeof categories;
export type CategoryGroupQueries = typeof categoryGroups;
export type ImportProfileQueries = typeof importProfiles;
export type MedicalExpenseQueries = typeof medicalExpenses;
export type PatternQueries = typeof patterns;
export type PayeeCategoryQueries = typeof payeeCategories;
export type PayeeQueries = typeof payees;
export type ScheduleQueries = typeof schedules;
export type SettingsQueries = typeof settings;
export type TransactionQueries = typeof transactions;
export type ViewQueries = typeof views;
export type WorkspaceQueries = typeof workspaces;

/**
 * Convenience re-exports for specific domains
 */
export { accountKeys } from "./accounts";
export { budgetKeys } from "./budgets";
export { categoryKeys } from "./categories";
export { categoryGroupKeys } from "./category-groups";
export { importProfileKeys } from "./import-profiles";
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
