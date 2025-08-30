import { orpc } from "./orpc";
import { accountRoutes } from "./routes/accounts";
import { categoriesRoutes } from "./routes/categories";
import { payeesRoutes } from "./routes/payees";
import { transactionsRoutes } from "./routes/transactions";
import { schedulesRoutes } from "./routes/schedules";
import { viewsRoutes } from "./routes/views";

export const router = orpc.router({
  accounts: accountRoutes,
  categories: categoriesRoutes,
  payees: payeesRoutes,
  transactions: transactionsRoutes,
  schedules: schedulesRoutes,
  views: viewsRoutes,
});

export type Router = typeof router;