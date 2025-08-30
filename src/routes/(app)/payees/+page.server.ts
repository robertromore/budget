import { payeeFormSchema, removePayeeFormSchema } from "$lib/schema/forms";
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
    payees: await caller.payees.all(),
    form: await superValidate(zod4(payeeFormSchema)),
    deleteForm: await superValidate(zod4(removePayeeFormSchema)),
  };
};

export const actions: Actions = {
  "save-payee": async (event) => {
    const form = await superValidate(event, zod4(payeeFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    const entity = await caller.payees.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-payee": async (event) => {
    const form = await superValidate(event, zod4(removePayeeFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    await caller.payees.remove(form.data);
    return {
      form,
    };
  },
};
