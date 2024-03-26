import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms";
import type { PageServerLoad } from "../$types";
import { zod } from 'sveltekit-superforms/adapters';
import { formInsertPayeeSchema, insertCategorySchema, insertTransactionSchema, removeCategorySchema, removePayeeSchema, removeTransactionsSchema } from "$lib/schema";

export const load: PageServerLoad = (async (event) => {
  event.depends('account');
  console.log(event.params);

  return {
    // data
    account: await createCaller(await createContext(event)).accountRoutes.load({ id: event.params.id }),
    payees: await createCaller(await createContext(event)).payeeRoutes.all(),
    categories: await createCaller(await createContext(event)).categoriesRoutes.all(),
    // forms
    manageTransactionForm: await superValidate(zod(insertTransactionSchema)),
    deleteTransactionForm: await superValidate(zod(removeTransactionsSchema)),
    manageCategoryForm: await superValidate(zod(insertCategorySchema)),
    deleteCategoryForm: await superValidate(zod(removeCategorySchema)),
    managePayeeForm: await superValidate(zod(formInsertPayeeSchema)),
    deletePayeeForm: await superValidate(zod(removePayeeSchema))
  };
});
