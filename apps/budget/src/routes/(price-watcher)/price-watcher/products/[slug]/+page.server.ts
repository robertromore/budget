import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const slug = params.slug;

  if (!slug) {
    throw error(404, "Invalid product slug");
  }

  const caller = createCaller(await createContext(fromSvelteKit(event)));

  const product = await caller.priceWatcherRoutes.getProduct({ slug });
  if (!product) {
    throw error(404, "Product not found");
  }

  return {
    productSlug: slug,
  };
};
