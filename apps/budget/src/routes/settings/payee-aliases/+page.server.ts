import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));

  const [aliases, stats, payees] = await Promise.all([
    caller.payeeAliasRoutes.all(),
    caller.payeeAliasRoutes.stats(),
    caller.payeeRoutes.all(),
  ]);

  return {
    aliases,
    stats,
    payees,
  };
};
