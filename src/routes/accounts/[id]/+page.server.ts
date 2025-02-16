import { superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { zod } from 'sveltekit-superforms/adapters';
import {
  formInsertPayeeSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertViewSchema,
  removeCategorySchema,
  removePayeeSchema,
  removeTransactionsSchema,
  type View
} from '$lib/schema';
import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { accounts } = await parent();
  const defaultViews = [
    {
      id: -4,
      name: 'All Transactions',
      description: 'All transactions for this account',
      filters: [],
      display: {
        grouping: [],
        sort: [
          {
            id: 'id',
            desc: false
          }
        ]
      },
      icon: '',
      dirty: false
    },
    {
      id: -3,
      name: 'Cleared',
      description: 'Cleared transactions for this account',
      filters: [
        {
          column: 'status',
          filter: 'entityIsFilter',
          value: ['cleared']
        }
      ],
      display: {
        grouping: [],
        sort: []
      },
      icon: '',
      dirty: false
    },
    {
      id: -2,
      name: 'Upcoming',
      description: 'Upcoming transactions for this account',
      filters: [
        {
          column: 'status',
          filter: 'entityIsFilter',
          value: ['pending']
        }
      ],
      display: {
        grouping: [],
        sort: []
      },
      icon: '',
      dirty: false
    }
  ] as View[];

  return {
    accountId: parseInt(params.id),
    account: accounts.find((account) => account.id === parseInt(params.id)),
    manageTransactionForm: await superValidate(zod(insertTransactionSchema)),
    deleteTransactionForm: await superValidate(zod(removeTransactionsSchema)),
    manageCategoryForm: await superValidate(zod(insertCategorySchema)),
    deleteCategoryForm: await superValidate(zod(removeCategorySchema)),
    managePayeeForm: await superValidate(zod(formInsertPayeeSchema)),
    deletePayeeForm: await superValidate(zod(removePayeeSchema)),
    manageViewForm: await superValidate(zod(insertViewSchema)),
    views: defaultViews.concat(await createCaller(await createContext()).viewsRoutes.all())
  };
};
