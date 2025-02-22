import { insertCategorySchema, removeCategorySchema } from "$lib/schema";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async () => ({
  categories: await createCaller(await createContext()).categoriesRoutes.all(),
  form: await superValidate(zod(insertCategorySchema)),
  deleteForm: await superValidate(zod(removeCategorySchema)),
});

export const actions: Actions = {
  "save-category": async (event) => {
    const form = await superValidate(event, zod(insertCategorySchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext()).categoriesRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-category": async (event) => {
    const form = await superValidate(event, zod(removeCategorySchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    await createCaller(await createContext()).categoriesRoutes.remove(form.data);
    return {
      form,
    };
  },
};
