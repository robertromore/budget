import {redirect, fail} from '@sveltejs/kit';
import {superformInsertBudgetSchema} from '$lib/schema/superforms';
import {createContext} from '$lib/trpc/context';
import {createCaller} from '$lib/trpc/router';
import {superValidate} from 'sveltekit-superforms/client';
import {zod4} from 'sveltekit-superforms/adapters';
import type {Actions, PageServerLoad} from './$types';

export const load: PageServerLoad = async ({params}) => {
  const budgetId = parseInt(params.id);

  if (isNaN(budgetId)) {
    throw redirect(303, '/budgets');
  }

  const context = await createContext();
  const caller = createCaller(context);

  try {
    const budget = await caller.budgetRoutes.get({id: budgetId});

    if (!budget) {
      throw redirect(303, '/budgets');
    }

    // Extract metadata fields for the form
    const metadata = (budget.metadata || {}) as Record<string, unknown>;

    return {
      budgetId,
      form: await superValidate({
        name: budget.name,
        description: budget.description,
        type: budget.type,
        scope: budget.scope,
        status: budget.status,
        enforcementLevel: budget.enforcementLevel,
        allocatedAmount: metadata.allocatedAmount as number | undefined,
        periodType: metadata.defaultPeriod?.type as string | undefined,
        startDay: metadata.defaultPeriod?.startDay as number | undefined,
        accountIds: budget.accounts?.map(a => a.id) || [],
        categoryIds: budget.categories?.map(c => c.id) || [],
      }, zod4(superformInsertBudgetSchema)),
      accounts: await caller.accountRoutes.all(),
      categories: await caller.categoriesRoutes.all(),
    };
  } catch (err) {
    console.error('Error loading budget for edit:', err);
    throw redirect(303, '/budgets');
  }
};

export const actions: Actions = {
  default: async ({request, params}) => {
    const budgetId = parseInt(params.id);
    const form = await superValidate(request, zod4(superformInsertBudgetSchema));

    if (!form.valid) {
      return fail(400, {form});
    }

    const metadata: Record<string, unknown> = {
      defaultPeriod: {
        type: form.data.periodType || 'monthly',
        startDay: form.data.startDay || 1,
      },
    };

    if (form.data.allocatedAmount !== undefined) {
      metadata.allocatedAmount = form.data.allocatedAmount;
    }

    try {
      await createCaller(await createContext()).budgetRoutes.update({
        id: budgetId,
        name: form.data.name,
        description: form.data.description,
        status: form.data.status,
        enforcementLevel: form.data.enforcementLevel,
        metadata,
        accountIds: form.data.accountIds,
        categoryIds: form.data.categoryIds,
      });
    } catch (error) {
      console.error('Failed to update budget:', error);
      return fail(500, {
        form,
        error: 'Failed to update budget. Please try again.',
      });
    }

    // Redirect after successful update (outside try-catch)
    throw redirect(303, `/budgets/${budgetId}`);
  },
};
