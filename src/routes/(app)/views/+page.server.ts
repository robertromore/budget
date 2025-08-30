import { createContext } from "$lib/server/rpc/context";
import { createCaller } from "$lib/server/rpc/caller";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { viewFormSchema, removeViewFormSchema } from "$lib/schema/forms";

export const load: PageServerLoad = async () => {
  const ctx = await createContext();
  const caller = createCaller(ctx);
  
  return {
    views: await caller.views.all(),
    form: await superValidate(zod4(viewFormSchema)),
    deleteForm: await superValidate(zod4(removeViewFormSchema)),
  };
};

export const actions: Actions = {
  "save-view": async (event) => {
    const form = await superValidate(event, zod4(viewFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    const entity = await caller.views.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-view": async (event) => {
    const form = await superValidate(event, zod4(removeViewFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    await caller.views.remove(form.data);
    return {
      form,
    };
  },
};
