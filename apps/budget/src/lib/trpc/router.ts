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
import { categoriesRoutes } from "$lib/trpc/routes/categories";
import { categoryGroupsRoutes } from "$lib/trpc/routes/category-groups";
import { payeeCategoriesRoutes } from "$lib/trpc/routes/payee-categories";
import { payeeRoutes } from "$lib/trpc/routes/payees";
import { transactionRoutes } from "$lib/trpc/routes/transactions";
import { t } from "$lib/trpc/t";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { budgetRoutes } from "./routes/budgets";
import { forecastingRoutes } from "./routes/forecasting";
import { importProfileRoutes } from "./routes/import-profiles";
import { llmSettingsRoutes } from "./routes/llm-settings";
import { medicalExpensesRouter } from "./routes/medical-expenses";
import { patternRoutes } from "./routes/patterns";
import { scheduleRoutes } from "./routes/schedules";
import { settingsRoutes } from "./routes/settings";
import { viewsRoutes } from "./routes/views";
import { workspaceRoutes } from "./routes/workspaces";

export const router = t.router({
  workspaceRoutes,
  accountRoutes,
  serverAccountsRoutes,
  aiRoutes,
  categoriesRoutes,
  categoryGroupsRoutes,
  payeeCategoriesRoutes,
  payeeRoutes,
  scheduleRoutes,
  transactionRoutes,
  viewsRoutes,
  budgetRoutes,
  patternRoutes,
  medicalExpensesRouter,
  importProfileRoutes,
  settingsRoutes,
  forecastingRoutes,
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
