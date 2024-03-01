import { accountRoutes } from '$lib/trpc/routes/accounts';
import { categoriesRoutes } from '$lib/trpc/routes/categories';
import { payeeRoutes } from '$lib/trpc/routes/payees';
import { transactionRoutes } from '$lib/trpc/routes/transactions';
import { t } from '$lib/trpc/t';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export const router = t.router({
  accountRoutes,
  categoriesRoutes,
  payeeRoutes,
  transactionRoutes
});

export const createCaller = t.createCallerFactory(router);

export type Router = typeof router;

// 👇 type helpers 💡
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
