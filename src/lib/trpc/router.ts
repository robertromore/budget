import { accountRoutes } from "$lib/trpc/routes/accounts";
import { optimizedAccountsRoutes } from "$lib/trpc/routes/accounts-optimized";
import { categoriesRoutes } from "$lib/trpc/routes/categories";
import { payeeRoutes } from "$lib/trpc/routes/payees";
import { transactionRoutes } from "$lib/trpc/routes/transactions";
import { t } from "$lib/trpc/t";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { viewsRoutes } from "./routes/views";
import { scheduleRoutes } from "./routes/schedules";

export const router = t.router({
  accountRoutes,
  optimizedAccountsRoutes,
  categoriesRoutes,
  payeeRoutes,
  scheduleRoutes,
  transactionRoutes,
  viewsRoutes,
});

export const createCaller = t.createCallerFactory(router);

export type Router = typeof router;

// 👇 type helpers 💡
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
