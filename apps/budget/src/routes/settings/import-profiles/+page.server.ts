import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));

  const [importProfiles, accounts] = await Promise.all([
    caller.importProfileRoutes.list(),
    caller.accountRoutes.all(),
  ]);

  return {
    importProfiles,
    accounts,
  };
};
