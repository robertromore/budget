import { removePayeeSchema, type RemovePayeeData } from "$core/schema";
import { superformInsertPayeeSchema, type SuperformInsertPayeeData } from "$core/schema/superforms";
import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import type { Actions } from "@sveltejs/kit";
import { error, fail, redirect } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";

export const load = async (event: any) => {
  const { params } = event;
  const slug = params.slug;

  if (!slug) {
    throw redirect(303, "/payees");
  }

  const caller = createCaller(await createContext(fromSvelteKit(event)));

  let payee;
  try {
    payee = await caller.payeeRoutes.getBySlug({ slug });
  } catch {
    throw error(404, "Payee not found");
  }

  return {
    payee,
    form: await superValidate(zod4(superformInsertPayeeSchema)),
    deleteForm: await superValidate(zod4(removePayeeSchema)),
    categories: await caller.categoriesRoutes.all(),
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

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformInsertPayeeData;
    const entity = await createCaller(await createContext(fromSvelteKit(event))).payeeRoutes.save(data);
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

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as RemovePayeeData;
    await createCaller(await createContext(fromSvelteKit(event))).payeeRoutes.remove(data);
    return {
      form,
    };
  },
};
