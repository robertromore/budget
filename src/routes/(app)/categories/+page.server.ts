import { categoryFormSchema, removeCategoryFormSchema } from "$lib/schema/forms";
import { createContext } from "$lib/server/rpc/context";
import { createCaller } from "$lib/server/rpc/caller";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async () => {
  const ctx = await createContext();
  const caller = createCaller(ctx);
  
  return {
    categories: await caller.categories.all(),
    form: await superValidate(zod4(categoryFormSchema)),
    deleteForm: await superValidate(zod4(removeCategoryFormSchema)),
  };
};

export const actions: Actions = {
  "save-category": async (event) => {
    const form = await superValidate(event, zod4(categoryFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    const entity = await caller.categories.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-category": async (event) => {
    const form = await superValidate(event, zod4(removeCategoryFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    await caller.categories.remove(form.data);
    return {
      form,
    };
  },
};
