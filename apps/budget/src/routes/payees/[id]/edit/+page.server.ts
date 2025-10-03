import {redirect, fail} from '@sveltejs/kit';
import {removePayeeSchema} from "$lib/schema";
import {superformInsertPayeeSchema} from "$lib/schema/superforms";
import {createContext} from "$lib/trpc/context";
import {createCaller} from "$lib/trpc/router";
import {superValidate} from "sveltekit-superforms/client";
import {zod4} from "sveltekit-superforms/adapters";
import type {Actions} from "@sveltejs/kit";

export const load = async ({params}: {params: {id: string}}) => {
  const payeeId = params.id;

  if (!payeeId || isNaN(parseInt(payeeId))) {
    throw redirect(303, '/payees');
  }

  return {
    payeeId: parseInt(payeeId),
    form: await superValidate(zod4(superformInsertPayeeSchema)),
    deleteForm: await superValidate(zod4(removePayeeSchema)),
    categories: await createCaller(await createContext()).categoriesRoutes.all(),
  };
};

export const actions: Actions = {
  "save-payee": async ({request}) => {
    const form = await superValidate(request, zod4(superformInsertPayeeSchema));
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
  "delete-payee": async ({request}) => {
    const form = await superValidate(request, zod4(removePayeeSchema));
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