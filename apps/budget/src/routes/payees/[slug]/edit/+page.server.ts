import {redirect, fail} from "@sveltejs/kit";
import {removePayeeSchema} from "$lib/schema";
import {superformInsertPayeeSchema} from "$lib/schema/superforms";
import {createContext} from "$lib/trpc/context";
import {createCaller} from "$lib/trpc/router";
import {superValidate} from "sveltekit-superforms/client";
import {zod4} from "sveltekit-superforms/adapters";
import type {Actions} from "@sveltejs/kit";

export const load = async (event: any) => {
  const {params} = event;
  const slug = params.slug;

  if (!slug) {
    throw redirect(303, "/payees");
  }

  const payee = await createCaller(await createContext(event)).payeeRoutes.getBySlug({slug});

  return {
    payee,
    form: await superValidate(zod4(superformInsertPayeeSchema)),
    deleteForm: await superValidate(zod4(removePayeeSchema)),
    categories: await createCaller(await createContext(event)).categoriesRoutes.all(),
  };
};

export const actions: Actions = {
  "save-payee": async (event) => {
    const {request} = event;
    const form = await superValidate(request, zod4(superformInsertPayeeSchema));
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
    const {request} = event;
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
