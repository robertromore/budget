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
    const [labels, maintenanceRecords, itemAttachments] = await Promise.all([
      caller.homeItemsRoutes.getLabels({ itemId: item.id }),
      caller.homeMaintenanceRoutes.listByItem({ itemId: item.id }),
      caller.homeAttachmentsRoutes.listByItem({ itemId: item.id }),
    ]);

    return { item, itemLabels: labels, maintenanceRecords, itemAttachments };
  } catch {
    error(404, "Item not found");
  }
};
