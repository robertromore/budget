import { formInsertAccountSchema, insertTransactionSchema, removeAccountSchema } from "$lib/schema";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = (async (event) => ({
	accounts: await createCaller(await createContext(event)).accountRoutes.all(),
  manageAccountForm: await superValidate(zod(formInsertAccountSchema)),
  deleteAccountForm: await superValidate(zod(removeAccountSchema))
}));

export const actions: Actions = {
  'add-account': async (event) => {
    const form = await superValidate(event, zod(formInsertAccountSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }

    const entity = await createCaller(await createContext(event)).accountRoutes.save(form.data);
    return {
      form,
      entity
    };
  },
  'delete-account': async (event) => {
    const form = await superValidate(event, zod(removeAccountSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }

    await createCaller(await createContext(event)).accountRoutes.remove(form.data);
    return {
      form
    };
  },
  'add-transaction': async (event) => {
    const form = await superValidate(event, zod(insertTransactionSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }

    const entity = await createCaller(await createContext(event)).transactionRoutes.save(form.data);
    return {
      form,
      entity
    };
  }
};

