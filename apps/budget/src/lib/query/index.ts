/**
 * Unified namespace for all query operations
 * Provides a single entry point for all TanStack Query-based operations
 * Based on Epicenter's RPC pattern for better developer experience
 */

import * as accounts from "./accounts";
import * as auth from "./auth";
import * as budgets from "./budgets";
import * as categories from "./categories";
import * as categoryAliases from "./category-aliases";
import * as categoryGroups from "./category-groups";
import * as importProfiles from "./import-profiles";
import * as llmSettings from "./llm-settings";
import * as medicalExpenses from "./medical-expenses";
import * as onboarding from "./onboarding";
import * as patterns from "./patterns";
import * as payeeAliases from "./payee-aliases";
import * as payeeCategories from "./payee-categories";
import * as payees from "./payees";
import * as schedules from "./schedules";
import * as security from "./security";
import * as settings from "./settings";
import * as transactions from "./transactions";
import * as views from "./views";
import * as workspaceInvitations from "./workspace-invitations";
import * as workspaceMembers from "./workspace-members";
import * as workspaces from "./workspaces";

/**
 * Centralized RPC interface aggregating all query modules
 * Usage: import { rpc } from '$lib/query'
 * Then: rpc.transactions.getAllAccountTransactions(accountId).options()
 */
export const rpc = {
  accounts,
  auth,
  budgets,
  categories,
  categoryAliases,
  categoryGroups,
  importProfiles,
  llmSettings,
  medicalExpenses,
  onboarding,
  patterns,
  payeeAliases,
  payeeCategories,
  payees,
  schedules,
  security,
  settings,
  transactions,
  views,
  workspaceInvitations,
  workspaceMembers,
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
export type AuthQueries = typeof auth;
export type BudgetQueries = typeof budgets;
export type CategoryQueries = typeof categories;
export type CategoryAliasQueries = typeof categoryAliases;
export type CategoryGroupQueries = typeof categoryGroups;
export type ImportProfileQueries = typeof importProfiles;
export type LLMSettingsQueries = typeof llmSettings;
export type MedicalExpenseQueries = typeof medicalExpenses;
export type OnboardingQueries = typeof onboarding;
export type PatternQueries = typeof patterns;
export type PayeeAliasQueries = typeof payeeAliases;
export type PayeeCategoryQueries = typeof payeeCategories;
export type PayeeQueries = typeof payees;
export type ScheduleQueries = typeof schedules;
export type SecurityQueries = typeof security;
export type SettingsQueries = typeof settings;
export type TransactionQueries = typeof transactions;
export type ViewQueries = typeof views;
export type WorkspaceInvitationQueries = typeof workspaceInvitations;
export type WorkspaceMemberQueries = typeof workspaceMembers;
export type WorkspaceQueries = typeof workspaces;

/**
 * Convenience re-exports for specific domains
 */
export { accountKeys } from "./accounts";
export { authKeys } from "./auth";
export { budgetKeys } from "./budgets";
export { categoryKeys } from "./categories";
export { categoryAliasKeys } from "./category-aliases";
export { categoryGroupKeys } from "./category-groups";
export { importProfileKeys } from "./import-profiles";
export { medicalExpenseKeys } from "./medical-expenses";
export { onboardingKeys } from "./onboarding";
export { patternKeys } from "./patterns";
export { payeeAliasKeys } from "./payee-aliases";
export { payeeCategoryKeys } from "./payee-categories";
export { payeeKeys } from "./payees";
export { scheduleKeys } from "./schedules";
export { securityKeys } from "./security";
export { transactionKeys } from "./transactions";
export { viewKeys } from "./views";
export { workspaceInvitationKeys } from "./workspace-invitations";
export { workspaceMemberKeys } from "./workspace-members";
export { workspaceKeys } from "./workspaces";
export { LLMSettings, llmSettingsKeys } from "./llm-settings";

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
