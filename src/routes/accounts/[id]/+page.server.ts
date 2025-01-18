import { superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { zod } from 'sveltekit-superforms/adapters';
import {
  formInsertPayeeSchema,
  insertCategorySchema,
  insertTransactionSchema,
  removeCategorySchema,
  removePayeeSchema,
  removeTransactionsSchema
} from '$lib/schema';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { accounts } = await parent();

  return {
    accountId: parseInt(params.id),
    account: accounts.find((account) => account.id === parseInt(params.id)),
    manageTransactionForm: await superValidate(zod(insertTransactionSchema)),
    deleteTransactionForm: await superValidate(zod(removeTransactionsSchema)),
    manageCategoryForm: await superValidate(zod(insertCategorySchema)),
    deleteCategoryForm: await superValidate(zod(removeCategorySchema)),
    managePayeeForm: await superValidate(zod(formInsertPayeeSchema)),
    deletePayeeForm: await superValidate(zod(removePayeeSchema))
  };
};
