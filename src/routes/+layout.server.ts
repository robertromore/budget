import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms";
import type { LayoutServerLoad } from "./$types";
import { zod } from "sveltekit-superforms/adapters";
import { formInsertAccountSchema } from "$lib/schema";

export const load: LayoutServerLoad = async () => ({
  accounts: await createCaller(await createContext()).accountRoutes.all(),
  payees: await createCaller(await createContext()).payeeRoutes.all(),
  categories: await createCaller(await createContext()).categoriesRoutes.all(),
  manageAccountForm: await superValidate(zod(formInsertAccountSchema)),
});
