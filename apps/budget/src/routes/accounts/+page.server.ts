import { removeAccountSchema, type RemoveAccountData } from "$core/schema";
import {
  superformInsertAccountSchema,
  superformInsertTransactionSchema,
  type SuperformInsertAccountData,
  type SuperformInsertTransactionData,
} from "$core/schema/superforms";
import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";

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

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformInsertAccountData;
    const entity = await createCaller(await createContext(fromSvelteKit(event))).accountRoutes.save(data);
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

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as RemoveAccountData;
    await createCaller(await createContext(fromSvelteKit(event))).accountRoutes.remove(data);
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

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformInsertTransactionData;
    const entity = await createCaller(await createContext(fromSvelteKit(event))).transactionRoutes.save({
      ...data,
      date: data.date || new Date().toISOString().split("T")[0]!,
    });
    return {
      form,
      entity,
    };
  },
};
