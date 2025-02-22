import { insertPayeeSchema, removePayeeSchema } from "$lib/schema";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async () => ({
  payees: await createCaller(await createContext()).payeeRoutes.all(),
  form: await superValidate(zod(insertPayeeSchema)),
  deleteForm: await superValidate(zod(removePayeeSchema)),
});

export const actions: Actions = {
  "save-payee": async (event) => {
    const form = await superValidate(event, zod(insertPayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext()).payeeRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-payee": async (event) => {
    const form = await superValidate(event, zod(removePayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    await createCaller(await createContext()).payeeRoutes.remove(form.data);
    return {
      form,
    };
  },
};
