import { accountRoutes } from "$lib/trpc/routes/accounts";
import { serverAccountsRoutes } from "$lib/trpc/routes/accounts-server";
import { categoriesRoutes } from "$lib/trpc/routes/categories";
import { categoryGroupsRoutes } from "$lib/trpc/routes/category-groups";
import { payeeRoutes } from "$lib/trpc/routes/payees";
import { transactionRoutes } from "$lib/trpc/routes/transactions";
import { t } from "$lib/trpc/t";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { budgetRoutes } from "./routes/budgets";
import { medicalExpensesRouter } from "./routes/medical-expenses";
import { patternRoutes } from "./routes/patterns";
import { scheduleRoutes } from "./routes/schedules";
import { viewsRoutes } from "./routes/views";
import { workspaceRoutes } from "./routes/workspaces";

export const router = t.router({
  workspaceRoutes,
  accountRoutes,
  serverAccountsRoutes,
  categoriesRoutes,
  categoryGroupsRoutes,
  payeeRoutes,
  scheduleRoutes,
  transactionRoutes,
  viewsRoutes,
  budgetRoutes,
  patternRoutes,
  medicalExpensesRouter,
});

export const createCaller = t.createCallerFactory(router);

export type Router = typeof router;

// 👇 type helpers 💡
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
