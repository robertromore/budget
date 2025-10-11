import {accountRoutes} from "$lib/trpc/routes/accounts";
import {serverAccountsRoutes} from "$lib/trpc/routes/accounts-server";
import {categoriesRoutes} from "$lib/trpc/routes/categories";
import {payeeRoutes} from "$lib/trpc/routes/payees";
import {transactionRoutes} from "$lib/trpc/routes/transactions";
import {t} from "$lib/trpc/t";
import type {inferRouterInputs, inferRouterOutputs} from "@trpc/server";
import {viewsRoutes} from "./routes/views";
import {scheduleRoutes} from "./routes/schedules";
import {budgetRoutes} from "./routes/budgets";
import {patternRoutes} from "./routes/patterns";

export const router = t.router({
  accountRoutes,
  serverAccountsRoutes,
  categoriesRoutes,
  payeeRoutes,
  scheduleRoutes,
  transactionRoutes,
  viewsRoutes,
  budgetRoutes,
  patternRoutes,
});

export const createCaller = t.createCallerFactory(router);

export type Router = typeof router;

// 👇 type helpers 💡
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
