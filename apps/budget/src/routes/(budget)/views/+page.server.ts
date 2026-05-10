// /views is an actions-only route — it hosts the form actions used by the
// shared `manage-view-form` component (which posts to /views?/save-view and
// /views?/delete-view). Direct GETs of /views redirect to the page that
// actually consumes saved views.
import { superformInsertViewSchema, type SuperformInsertViewData } from "$core/schema/superforms";
import { removeViewSchema, type RemoveViewData } from "$core/schema/views";
import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import { fail, redirect } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  throw redirect(302, "/transactions");
};

export const actions: Actions = {
  "save-view": async (event) => {
    const form = await superValidate(event, zod4(superformInsertViewSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformInsertViewData;
    const entity = await createCaller(await createContext(fromSvelteKit(event))).viewsRoutes.save(data);
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

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as RemoveViewData;
    await createCaller(await createContext(fromSvelteKit(event))).viewsRoutes.remove(data);
    return {
      form,
    };
  },
};
