import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const caller = createCaller(await createContext());
  const budgets = await caller.budgetRoutes.list({});

  return {
    budgets,
  };
};
