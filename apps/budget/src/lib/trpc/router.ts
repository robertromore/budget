import { accountRoutes } from "$lib/trpc/routes/accounts";
import { serverAccountsRoutes } from "$lib/trpc/routes/accounts-server";
import { categoriesRoutes } from "$lib/trpc/routes/categories";
import { categoryGroupsRoutes } from "$lib/trpc/routes/category-groups";
import { payeeCategoriesRoutes } from "$lib/trpc/routes/payee-categories";
import { payeeRoutes } from "$lib/trpc/routes/payees";
import { transactionRoutes } from "$lib/trpc/routes/transactions";
import { t } from "$lib/trpc/t";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { budgetRoutes } from "./routes/budgets";
import { importProfileRoutes } from "./routes/import-profiles";
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
});

export const createCaller = t.createCallerFactory(router);

export type Router = typeof router;

// 👇 type helpers 💡
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
