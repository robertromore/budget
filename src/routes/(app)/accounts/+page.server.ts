import { accountFormSchema, transactionFormSchema, removeAccountFormSchema } from "$lib/schema/forms";
import { createContext } from "$lib/server/rpc/context";
import { createCaller } from "$lib/server/rpc/caller";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async () => ({
  manageAccountForm: await superValidate(zod4(accountFormSchema)),
  deleteAccountForm: await superValidate(zod4(removeAccountFormSchema)),
});

export const actions: Actions = {
  "add-account": async (event) => {
    const form = await superValidate(event, zod4(accountFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    const entity = await caller.accounts.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-account": async (event) => {
    const form = await superValidate(event, zod4(removeAccountFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    await caller.accounts.remove(form.data);
    return {
      form,
    };
  },
  "add-transaction": async (event) => {
    const form = await superValidate(event, zod4(transactionFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    const entity = await caller.transactions.save(form.data);
    return {
      form,
      entity,
    };
  },
};
