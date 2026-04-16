import { createContext } from "$core/trpc/context";
import { createCaller } from "$core/trpc/router";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const ctx = await createContext(fromSvelteKit(event));
  const caller = createCaller(ctx);

  const homes = await caller.homeHomesRoutes.list();

  return { homes };
};
