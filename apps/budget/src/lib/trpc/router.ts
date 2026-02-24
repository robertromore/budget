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
import { accountDocumentsRouter } from "$lib/trpc/routes/account-documents";
import { documentExtractionRouter } from "$lib/trpc/routes/document-extraction";
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
import type { Context } from "$lib/trpc/context";
import { runWithDbForTesting } from "$lib/server/db";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { budgetRoutes } from "./routes/budgets";
import { forecastingRoutes } from "./routes/forecasting";
import { metricAlertRoutes } from "./routes/metric-alerts";
import { importCleanupRoutes } from "./routes/import-cleanup";
import { importProfileRoutes } from "./routes/import-profiles";
import { llmSettingsRoutes } from "./routes/llm-settings";
import { medicalExpensesRouter } from "./routes/medical-expenses";
import { notificationRoutes } from "./routes/notifications";
import { onboardingRoutes } from "./routes/onboarding";
import { patternRoutes } from "./routes/patterns";
import { recurringRoutes } from "./routes/recurring";
import { reportRoutes } from "./routes/reports";
import { scheduleRoutes } from "./routes/schedules";
import { securityRoutes } from "./routes/security";
import { subscriptionRoutes } from "./routes/subscriptions";
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
  accountDocumentsRouter,
  documentExtractionRouter,
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
  subscriptionRoutes,
  recurringRoutes,
  transactionRoutes,
  transferMappingRoutes,
  viewsRoutes,
  budgetRoutes,
  patternRoutes,
  reportRoutes,
  medicalExpensesRouter,
  notificationRoutes,
  utilityRoutes,
  importProfileRoutes,
  importCleanupRoutes,
  settingsRoutes,
  forecastingRoutes,
  metricAlertRoutes,

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

const createCallerFactory = t.createCallerFactory(router);

function normalizeTestContext(context: Context): Context {
  if (!context.isTest) return context;

  return {
    ...context,
    userId: context.userId ?? "system-test-user",
    sessionId: context.sessionId ?? "test-session",
    workspaceId: context.workspaceId ?? 1,
  };
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value && typeof (value as PromiseLike<unknown>).then === "function";
}

function invokeWithTestDb<T>(
  testDb: Parameters<typeof runWithDbForTesting>[0],
  fn: () => T
): T {
  try {
    const result = runWithDbForTesting(testDb, fn);
    if (isPromiseLike(result)) return result as T;
    return result;
  } catch (error) {
    throw error;
  }
}

function wrapCallerWithTestDb<T>(value: T, context: Context): T {
  const isWrappable =
    value !== null && (typeof value === "object" || typeof value === "function");
  if (!context.isTest || !context.db || !isWrappable) {
    return value;
  }

  const testDb = context.db as Parameters<typeof runWithDbForTesting>[0];

  return new Proxy(value as object, {
    apply(target, thisArg, argArray) {
      return invokeWithTestDb(testDb, () =>
        Reflect.apply(target as (...args: unknown[]) => unknown, thisArg, argArray)
      );
    },
    get(target, prop, receiver) {
      const nextValue = Reflect.get(target, prop, receiver);
      return wrapCallerWithTestDb(nextValue, context);
    },
  }) as T;
}

export const createCaller = (context: Context) => {
  const normalizedContext = normalizeTestContext(context);
  const caller = createCallerFactory(normalizedContext);
  return wrapCallerWithTestDb(caller, normalizedContext);
};

export type Router = typeof router;

// 👇 type helpers 💡
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
