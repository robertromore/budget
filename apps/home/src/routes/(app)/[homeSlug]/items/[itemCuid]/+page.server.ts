import { error } from "@sveltejs/kit";
import { createContext } from "$core/trpc/context";
import { createCaller } from "$core/trpc/router";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const ctx = await createContext(fromSvelteKit(event));
  const caller = createCaller(ctx);

  try {
    const item = await caller.homeItemsRoutes.getByCuid({ cuid: event.params.itemCuid });
    const labels = await caller.homeItemsRoutes.getLabels({ itemId: item.id });

    return { item, itemLabels: labels };
  } catch {
    error(404, "Item not found");
  }
};
