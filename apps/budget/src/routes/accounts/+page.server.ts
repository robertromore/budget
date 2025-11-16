import { removeAccountSchema } from "$lib/schema";
import {
  superformInsertAccountSchema,
  superformInsertTransactionSchema,
} from "$lib/schema/superforms";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async (event) => ({
  manageAccountForm: await superValidate(zod4(superformInsertAccountSchema)),
  deleteAccountForm: await superValidate(zod4(removeAccountSchema)),
});

export const actions: Actions = {
  "add-account": async (event) => {
    const form = await superValidate(event, zod4(superformInsertAccountSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext(event)).accountRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-account": async (event) => {
    const form = await superValidate(event, zod4(removeAccountSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    await createCaller(await createContext(event)).accountRoutes.remove(form.data);
    return {
      form,
    };
  },
  "add-transaction": async (event) => {
    const form = await superValidate(event, zod4(superformInsertTransactionSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext(event)).transactionRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
};
