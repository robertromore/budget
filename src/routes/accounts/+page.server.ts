import { formInsertAccountSchema, removeAccountSchema } from "$lib/schema";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "../$types";
import { fail } from "@sveltejs/kit";

export const load = (async (event) => ({
	accounts: await createCaller(await createContext(event)).accountRoutes.all(),
  form: await superValidate(formInsertAccountSchema),
  // deleteForm: await superValidate(removeAccountSchema)
})) satisfies PageServerLoad;

export const actions: Actions = {
	'add-account': async (event) => {
		const form = await superValidate(event, formInsertAccountSchema);
		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		const entity = await createCaller(await createContext(event)).accountRoutes.add(form.data);
    return {
      form,
      entity
    };
	},
  'delete-account': async (event) => {
    const form = await superValidate(event, removeAccountSchema);
		if (!form.valid) {
			return fail(400, {
				form
			});
		}

    await createCaller(await createContext(event)).accountRoutes.remove(form.data);
    return {
      form
    };
  }
};

// export const actions = {
// 	'add-account': validateForm(insertAccountSchema, async (event) => {
// 		return await createCaller(await createContext(event)).accountRoutes.add(event.parsedData.data);
// 	}, { debug: true }),
// } satisfies Actions;
