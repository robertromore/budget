import { removeCategorySchema, type RemoveCategoryData } from "$lib/schema";
import { superformInsertCategorySchema, type SuperformInsertCategoryData } from "$lib/schema/superforms";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async (event) => ({
  categories: await createCaller(await createContext(event)).categoriesRoutes.all(),
  form: await superValidate(zod4(superformInsertCategorySchema)),
});

export const actions: Actions = {
  "save-category": async (event) => {
    const form = await superValidate(event, zod4(superformInsertCategorySchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformInsertCategoryData;
    const entity = await createCaller(await createContext(event)).categoriesRoutes.save(data);
    return {
      form,
      entity,
    };
  },
  "delete-category": async (event) => {
    const form = await superValidate(event, zod4(removeCategorySchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as RemoveCategoryData;
    await createCaller(await createContext(event)).categoriesRoutes.remove(data);
    return {
      form,
    };
  },
};
