import { superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from '../$types';
import { zod } from 'sveltekit-superforms/adapters';
import {
  formInsertPayeeSchema,
  insertCategorySchema,
  insertTransactionSchema,
  removeCategorySchema,
  removePayeeSchema,
  removeTransactionsSchema
} from '$lib/schema';

export const load: PageServerLoad = async ({ depends }) => {
  depends('account');

  return {
    // forms
    manageTransactionForm: await superValidate(zod(insertTransactionSchema)),
    deleteTransactionForm: await superValidate(zod(removeTransactionsSchema)),
    manageCategoryForm: await superValidate(zod(insertCategorySchema)),
    deleteCategoryForm: await superValidate(zod(removeCategorySchema)),
    managePayeeForm: await superValidate(zod(formInsertPayeeSchema)),
    deletePayeeForm: await superValidate(zod(removePayeeSchema))
  };
};
