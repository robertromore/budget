import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));

  const [mappings, stats, accounts] = await Promise.all([
    caller.transferMappingRoutes.all(),
    caller.transferMappingRoutes.stats(),
    caller.accountRoutes.all(),
  ]);

  return {
    mappings,
    stats,
    accounts,
  };
};
