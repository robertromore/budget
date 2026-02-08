/**
 * Unified namespace for all query operations
 * Provides a single entry point for all TanStack Query-based operations
 * Based on Epicenter's RPC pattern for better developer experience
 */

import * as accountDocuments from "./account-documents";
import * as accounts from "./accounts";
import * as auth from "./auth";
import * as automation from "./automation";
import * as budgets from "./budgets";
import * as categories from "./categories";
import * as categoryAliases from "./category-aliases";
import * as categoryGroups from "./category-groups";
import * as connections from "./connections";
import * as documentExtraction from "./document-extraction";
import * as importProfiles from "./import-profiles";
import * as llmSettings from "./llm-settings";
import * as medicalExpenses from "./medical-expenses";
import * as metricAlerts from "./metric-alerts";
import * as notifications from "./notifications";
import * as onboarding from "./onboarding";
import * as patterns from "./patterns";
import * as payeeAliases from "./payee-aliases";
import * as recurring from "./recurring";
import * as payeeCategories from "./payee-categories";
import * as payees from "./payees";
import * as schedules from "./schedules";
import * as security from "./security";
import * as subscriptions from "./subscriptions";
import * as settings from "./settings";
import * as transactions from "./transactions";
import * as transferMappings from "./transfer-mappings";
import * as utility from "./utility";
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
  accountDocuments,
  accounts,
  auth,
  automation,
  budgets,
  categories,
  categoryAliases,
  categoryGroups,
  connections,
  documentExtraction,
  importProfiles,
  llmSettings,
  medicalExpenses,
  metricAlerts,
  notifications,
  onboarding,
  patterns,
  payeeAliases,
  payeeCategories,
  payees,
  recurring,
  schedules,
  security,
  settings,
  subscriptions,
  transactions,
  transferMappings,
  utility,
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
export type AccountDocumentQueries = typeof accountDocuments;
export type AccountQueries = typeof accounts;
export type AuthQueries = typeof auth;
export type AutomationQueries = typeof automation;
export type BudgetQueries = typeof budgets;
export type CategoryQueries = typeof categories;
export type CategoryAliasQueries = typeof categoryAliases;
export type CategoryGroupQueries = typeof categoryGroups;
export type ConnectionQueries = typeof connections;
export type DocumentExtractionQueries = typeof documentExtraction;
export type ImportProfileQueries = typeof importProfiles;
export type LLMSettingsQueries = typeof llmSettings;
export type MedicalExpenseQueries = typeof medicalExpenses;
export type MetricAlertQueries = typeof metricAlerts;
export type NotificationQueries = typeof notifications;
export type OnboardingQueries = typeof onboarding;
export type PatternQueries = typeof patterns;
export type PayeeAliasQueries = typeof payeeAliases;
export type PayeeCategoryQueries = typeof payeeCategories;
export type PayeeQueries = typeof payees;
export type RecurringQueries = typeof recurring;
export type ScheduleQueries = typeof schedules;
export type SecurityQueries = typeof security;
export type SettingsQueries = typeof settings;
export type SubscriptionQueries = typeof subscriptions;
export type TransactionQueries = typeof transactions;
export type TransferMappingQueries = typeof transferMappings;
export type UtilityQueries = typeof utility;
export type ViewQueries = typeof views;
export type WorkspaceInvitationQueries = typeof workspaceInvitations;
export type WorkspaceMemberQueries = typeof workspaceMembers;
export type WorkspaceQueries = typeof workspaces;

/**
 * Convenience re-exports for specific domains
 */
export { accountDocumentKeys } from "./account-documents";
export { accountKeys } from "./accounts";
export { authKeys } from "./auth";
export { automationKeys } from "./automation";
export { budgetKeys } from "./budgets";
export { categoryKeys } from "./categories";
export { categoryAliasKeys } from "./category-aliases";
export { categoryGroupKeys } from "./category-groups";
export { connectionKeys, providerSettingsKeys } from "./connections";
export { DocumentExtraction, documentExtractionKeys } from "./document-extraction";
export { importProfileKeys } from "./import-profiles";
export { LLMSettings, llmSettingsKeys } from "./llm-settings";
export { medicalExpenseKeys } from "./medical-expenses";
export { metricAlertKeys } from "./metric-alerts";
export { notificationKeys } from "./notifications";
export { onboardingKeys } from "./onboarding";
export { patternKeys } from "./patterns";
export { payeeAliasKeys } from "./payee-aliases";
export { payeeCategoryKeys } from "./payee-categories";
export { payeeKeys } from "./payees";
export { recurringKeys } from "./recurring";
export { scheduleKeys } from "./schedules";
export { securityKeys } from "./security";
export { subscriptionKeys } from "./subscriptions";
export { transactionKeys } from "./transactions";
export { transferMappingKeys } from "./transfer-mappings";
export { utilityKeys } from "./utility";
export { viewKeys } from "./views";
export { workspaceInvitationKeys } from "./workspace-invitations";
export { workspaceMemberKeys } from "./workspace-members";
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
