import { superformInsertViewSchema } from "$lib/schema/superforms";
import { removeViewSchema } from "$lib/schema/views";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => ({
  views: await createCaller(await createContext(event)).viewsRoutes.all(),
  form: await superValidate(zod4(superformInsertViewSchema)),
  deleteForm: await superValidate(zod4(removeViewSchema)),
});

export const actions: Actions = {
  "save-view": async (event) => {
    const form = await superValidate(event, zod4(superformInsertViewSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext(event)).viewsRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-view": async (event) => {
    const form = await superValidate(event, zod4(removeViewSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    await createCaller(await createContext(event)).viewsRoutes.remove(form.data);
    return {
      form,
    };
  },
};
