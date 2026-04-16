import { error } from "@sveltejs/kit";
import { createContext } from "$core/trpc/context";
import { createCaller } from "$core/trpc/router";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const ctx = await createContext(fromSvelteKit(event));
  const caller = createCaller(ctx);

  try {
    const home = await caller.homeHomesRoutes.getBySlug({ slug: event.params.homeSlug });

    const [locations, items, labels] = await Promise.all([
      caller.homeLocationsRoutes.getTree({ homeId: home.id }),
      caller.homeItemsRoutes.list({ homeId: home.id }),
      caller.homeLabelsRoutes.list({ homeId: home.id }),
    ]);

    return { home, locations, items, labels };
  } catch {
    error(404, "Home not found");
  }
};
