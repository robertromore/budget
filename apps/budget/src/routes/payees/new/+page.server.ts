import { removePayeeSchema } from "$lib/schema";
import { superformInsertPayeeSchema } from "$lib/schema/superforms";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { Actions } from "@sveltejs/kit";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";

export const load = async (event: any) => {
  const { url } = event;
  // Check if we're duplicating from an existing payee
  const duplicateFromId = url.searchParams.get("from");
  const isDuplicating = url.searchParams.get("duplicate") === "true";

  return {
    duplicateFromId: duplicateFromId ? parseInt(duplicateFromId) : null,
    isDuplicating,
    form: await superValidate(zod4(superformInsertPayeeSchema)),
    deleteForm: await superValidate(zod4(removePayeeSchema)),
    categories: await createCaller(await createContext(event)).categoriesRoutes.all(),
  };
};

export const actions: Actions = {
  "save-payee": async (event) => {
    const { request } = event;
    const form = await superValidate(request, zod4(superformInsertPayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext(event)).payeeRoutes.save(form.data);

    // Return the entity data for client-side handling
    return {
      form,
      entity,
    };
  },
  "delete-payee": async (event) => {
    const { request } = event;
    const form = await superValidate(request, zod4(removePayeeSchema));
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
