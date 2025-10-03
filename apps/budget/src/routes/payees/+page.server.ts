import {removePayeeSchema} from "$lib/schema";
import {superformInsertPayeeSchema} from "$lib/schema/superforms";
import {createContext} from "$lib/trpc/context";
import {createCaller} from "$lib/trpc/router";
import {superValidate} from "sveltekit-superforms/client";
import type {Actions, PageServerLoad} from "./$types";
import {fail} from "@sveltejs/kit";
import {zod4} from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async (event) => ({
  payees: await createCaller(await createContext(event)).payeeRoutes.all(),
  form: await superValidate(zod4(superformInsertPayeeSchema)),
  deleteForm: await superValidate(zod4(removePayeeSchema)),
});

export const actions: Actions = {
  "save-payee": async (event) => {
    const form = await superValidate(event, zod4(superformInsertPayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext(event)).payeeRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-payee": async (event) => {
    const form = await superValidate(event, zod4(removePayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    await createCaller(await createContext(event)).payeeRoutes.remove(form.data);
    return {
      form,
    };
  },
};
