/**
 * Unified namespace for all query operations
 * Provides a single entry point for all TanStack Query-based operations
 */

import * as accountDocuments from "$core/query/account-documents";
import * as accounts from "$core/query/accounts";
import * as auth from "$core/query/auth";
import * as automation from "$core/query/automation";
import * as budgets from "$core/query/budgets";
import * as categories from "$core/query/categories";
import * as categoryAliases from "$core/query/category-aliases";
import * as categoryGroups from "$core/query/category-groups";
import * as connections from "$core/query/connections";
import * as dashboards from "$core/query/dashboards";
import * as documentExtraction from "$core/query/document-extraction";
import * as importProfiles from "$core/query/import-profiles";
import * as llmSettings from "$core/query/llm-settings";
import * as medicalExpenses from "$core/query/medical-expenses";
import * as metricAlerts from "$core/query/metric-alerts";
import * as notifications from "$core/query/notifications";
import * as onboarding from "$core/query/onboarding";
import * as patterns from "$core/query/patterns";
import * as payeeAliases from "$core/query/payee-aliases";
import * as recurring from "$core/query/recurring";
import * as payeeCategories from "$core/query/payee-categories";
import * as payees from "$core/query/payees";
import * as schedules from "$core/query/schedules";
import * as security from "$core/query/security";
import * as subscriptions from "$core/query/subscriptions";
import * as settings from "$core/query/settings";
import * as transactions from "$core/query/transactions";
import * as transferMappings from "$core/query/transfer-mappings";
import * as financialGoals from "$core/query/financial-goals";
import * as investmentSnapshots from "$core/query/investment-snapshots";
import * as netWorth from "$core/query/net-worth";
import * as utility from "$core/query/utility";
import * as views from "$core/query/views";
import * as workspaceInvitations from "$core/query/workspace-invitations";
import * as workspaceMembers from "$core/query/workspace-members";
import * as workspaces from "$core/query/workspaces";

// Home management
import * as homes from "$core/query/home-homes";
import * as homeLocations from "$core/query/home-locations";
import * as homeItems from "$core/query/home-items";
import * as homeLabels from "$core/query/home-labels";
import * as homeFloorPlans from "$core/query/home-floor-plans";
import * as homeMaintenance from "$core/query/home-maintenance";
import * as homeAttachments from "$core/query/home-attachments";

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
  dashboards,
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
  financialGoals,
  investmentSnapshots,
  netWorth,
  utility,
  views,
  workspaceInvitations,
  workspaceMembers,
  workspaces,

  // Home management
  homes,
  homeLocations,
  homeItems,
  homeLabels,
  homeFloorPlans,
  homeMaintenance,
  homeAttachments,
} as const;

export { cachePatterns, queryClient, queryPresets } from "$core/query/_client";
export { createQueryKeys, defineMutation, defineQuery } from "$core/query/_factory";

import { queryClient } from "$core/query/_client";

export type RPC = typeof rpc;

export { accountDocumentKeys } from "$core/query/account-documents";
export { accountKeys } from "$core/query/accounts";
export { authKeys } from "$core/query/auth";
export { automationKeys } from "$core/query/automation";
export { budgetKeys } from "$core/query/budgets";
export { categoryKeys } from "$core/query/categories";
export { categoryAliasKeys } from "$core/query/category-aliases";
export { categoryGroupKeys } from "$core/query/category-groups";
export { connectionKeys, providerSettingsKeys } from "$core/query/connections";
export { DocumentExtraction, documentExtractionKeys } from "$core/query/document-extraction";
export { importProfileKeys } from "$core/query/import-profiles";
export { LLMSettings, llmSettingsKeys } from "$core/query/llm-settings";
export { medicalExpenseKeys } from "$core/query/medical-expenses";
export { metricAlertKeys } from "$core/query/metric-alerts";
export { notificationKeys } from "$core/query/notifications";
export { onboardingKeys } from "$core/query/onboarding";
export { patternKeys } from "$core/query/patterns";
export { payeeAliasKeys } from "$core/query/payee-aliases";
export { payeeCategoryKeys } from "$core/query/payee-categories";
export { payeeKeys } from "$core/query/payees";
export { recurringKeys } from "$core/query/recurring";
export { scheduleKeys } from "$core/query/schedules";
export { securityKeys } from "$core/query/security";
export { subscriptionKeys } from "$core/query/subscriptions";
export { transactionKeys } from "$core/query/transactions";
export { transferMappingKeys } from "$core/query/transfer-mappings";
export { financialGoalKeys } from "$core/query/financial-goals";
export { investmentSnapshotKeys } from "$core/query/investment-snapshots";
export { netWorthKeys } from "$core/query/net-worth";
export { utilityKeys } from "$core/query/utility";
export { viewKeys } from "$core/query/views";
export { workspaceInvitationKeys } from "$core/query/workspace-invitations";
export { workspaceMemberKeys } from "$core/query/workspace-members";
export { workspaceKeys } from "$core/query/workspaces";

export const devTools = {
  clearAllCaches: () => queryClient.clear(),
  getCacheState: () => queryClient.getQueryCache().getAll(),
  invalidateAll: () => queryClient.invalidateQueries(),
} as const;
