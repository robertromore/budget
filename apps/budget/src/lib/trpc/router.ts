import { anomalyDetectionRoutes } from "$lib/server/domains/ml/anomaly-detection";
import { budgetPredictionRoutes } from "$lib/server/domains/ml/budget-prediction";
import { mlHealthRoutes } from "$lib/server/domains/ml/health-routes";
import { incomeExpenseRoutes } from "$lib/server/domains/ml/income-expense";
import { nlSearchRoutes } from "$lib/server/domains/ml/nl-search";
import { recurringDetectionRoutes } from "$lib/server/domains/ml/recurring-detection";
import { savingsOpportunityRoutes } from "$lib/server/domains/ml/savings-opportunities";
import { similarityRoutes } from "$lib/server/domains/ml/similarity";
import { smartCategoryRoutes } from "$lib/server/domains/ml/smart-categories";
import { userBehaviorRoutes } from "$lib/server/domains/ml/user-behavior";
import { accountRoutes } from "$lib/trpc/routes/accounts";
import { serverAccountsRoutes } from "$lib/trpc/routes/accounts-server";
import { aiRoutes } from "$lib/trpc/routes/ai";
import { annotationRoutes } from "$lib/trpc/routes/annotations";
import { authRoutes } from "$lib/trpc/routes/auth";
import { automationRoutes } from "$lib/trpc/routes/automation";
import { categoriesRoutes } from "$lib/trpc/routes/categories";
import { connectionRoutes } from "$lib/trpc/routes/connections";
import { categoryAliasRoutes } from "$lib/trpc/routes/category-aliases";
import { categoryGroupsRoutes } from "$lib/trpc/routes/category-groups";
import { payeeAliasRoutes } from "$lib/trpc/routes/payee-aliases";
import { payeeCategoriesRoutes } from "$lib/trpc/routes/payee-categories";
import { payeeRoutes } from "$lib/trpc/routes/payees";
import { transactionRoutes } from "$lib/trpc/routes/transactions";
import { transferMappingRoutes } from "$lib/trpc/routes/transfer-mappings";
import { workspaceInvitationsRoutes } from "$lib/trpc/routes/workspace-invitations";
import { workspaceMembersRoutes } from "$lib/trpc/routes/workspace-members";
import { t } from "$lib/trpc/t";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { budgetRoutes } from "./routes/budgets";
import { forecastingRoutes } from "./routes/forecasting";
import { importCleanupRoutes } from "./routes/import-cleanup";
import { importProfileRoutes } from "./routes/import-profiles";
import { llmSettingsRoutes } from "./routes/llm-settings";
import { medicalExpensesRouter } from "./routes/medical-expenses";
import { onboardingRoutes } from "./routes/onboarding";
import { patternRoutes } from "./routes/patterns";
import { reportRoutes } from "./routes/reports";
import { scheduleRoutes } from "./routes/schedules";
import { securityRoutes } from "./routes/security";
import { settingsRoutes } from "./routes/settings";
import { utilityRoutes } from "./routes/utility";
import { viewsRoutes } from "./routes/views";
import { workspaceRoutes } from "./routes/workspaces";

export const router = t.router({
  // Authentication and workspace management
  authRoutes,
  workspaceRoutes,
  workspaceMembersRoutes,
  workspaceInvitationsRoutes,
  onboardingRoutes,
  securityRoutes,

  // Core domain routes
  accountRoutes,
  serverAccountsRoutes,
  aiRoutes,
  annotationRoutes,
  automationRoutes,
  categoriesRoutes,
  categoryAliasRoutes,
  connectionRoutes,
  categoryGroupsRoutes,
  payeeAliasRoutes,
  payeeCategoriesRoutes,
  payeeRoutes,
  scheduleRoutes,
  transactionRoutes,
  transferMappingRoutes,
  viewsRoutes,
  budgetRoutes,
  patternRoutes,
  reportRoutes,
  medicalExpensesRouter,
  utilityRoutes,
  importProfileRoutes,
  importCleanupRoutes,
  settingsRoutes,
  forecastingRoutes,

  // ML routes
  anomalyDetectionRoutes,
  recurringDetectionRoutes,
  similarityRoutes,
  smartCategoryRoutes,
  userBehaviorRoutes,
  budgetPredictionRoutes,
  incomeExpenseRoutes,
  savingsOpportunityRoutes,
  nlSearchRoutes,
  mlHealthRoutes,
  llmSettingsRoutes,
});

export const createCaller = t.createCallerFactory(router);

export type Router = typeof router;

// 👇 type helpers 💡
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
