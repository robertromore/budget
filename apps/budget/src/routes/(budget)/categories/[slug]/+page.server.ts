import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const slug = params.slug;

  if (!slug) {
    throw error(404, "Invalid category slug");
  }

  const caller = createCaller(await createContext(fromSvelteKit(event)));
  const category = await caller.categoriesRoutes.getBySlugWithBudgets({ slug });

  if (!category) {
    throw error(404, "Category not found");
  }

  return {
    category,
  };
};
