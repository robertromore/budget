import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod } from "sveltekit-superforms/adapters";
import { insertViewSchema, removeViewSchema } from "$lib/schema/views";

export const load: PageServerLoad = async () => ({
  views: await createCaller(await createContext()).viewsRoutes.all(),
  form: await superValidate(zod(insertViewSchema)),
  deleteForm: await superValidate(zod(removeViewSchema)),
});

export const actions: Actions = {
  "save-view": async (event) => {
    const form = await superValidate(event, zod(insertViewSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext()).viewsRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-view": async (event) => {
    const form = await superValidate(event, zod(removeViewSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    await createCaller(await createContext()).viewsRoutes.remove(form.data);
    return {
      form,
    };
  },
};
