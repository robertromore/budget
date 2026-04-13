import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(fromSvelteKit(event)));

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
