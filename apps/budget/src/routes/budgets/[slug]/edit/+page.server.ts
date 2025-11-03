import {redirect, fail} from '@sveltejs/kit';
import {superformInsertBudgetSchema} from '$lib/schema/superforms';
import {createContext} from '$lib/trpc/context';
import {createCaller} from '$lib/trpc/router';
import {superValidate} from 'sveltekit-superforms/client';
import {zod4} from 'sveltekit-superforms/adapters';
import type {Actions, PageServerLoad, RequestEvent} from './$types';

export const load: PageServerLoad = async (event) => {
  const {params} = event;
  const budgetSlug = params.slug;

  if (!budgetSlug) {
    throw redirect(303, '/budgets');
  }

  const context = await createContext(event);
  const caller = createCaller(context);

  try {
    const budget = await caller.budgetRoutes.getBySlug({slug: budgetSlug});

    if (!budget) {
      throw redirect(303, '/budgets');
    }

    // Extract metadata fields for the form
    const metadata = (budget.metadata || {}) as Record<string, unknown>;
    const defaultPeriod = metadata['defaultPeriod'] as { type?: string; startDay?: number } | undefined;

    // Build form data with defaults for optional fields
    const formData: Record<string, any> = {
      name: budget.name,
      description: budget.description,
      type: budget.type,
      scope: budget.scope,
      status: budget.status,
      enforcementLevel: budget.enforcementLevel,
      accountIds: budget.accounts?.map(a => a.id) || [],
      categoryIds: budget.categories?.map(c => c.id) || [],
      periodType: defaultPeriod?.type || 'monthly',
      startDay: defaultPeriod?.startDay ?? 1,
    };

    // Only include allocatedAmount if it has an actual value
    if (metadata['allocatedAmount'] !== undefined) {
      formData['allocatedAmount'] = metadata['allocatedAmount'] as number;
    }

    return {
      budgetId: budget.id,
      budgetSlug: budget.slug,
      form: await superValidate(formData, zod4(superformInsertBudgetSchema)),
      accounts: await caller.accountRoutes.all(),
      categories: await caller.categoriesRoutes.all(),
    };
  } catch (err) {
    console.error('Error loading budget for edit:', err);
    throw redirect(303, '/budgets');
  }
};

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    const {request, params} = event;
    const budgetSlug = params.slug;
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
      metadata['allocatedAmount'] = form.data.allocatedAmount;
    }

    try {
      const context = await createContext(event);
      const caller = createCaller(context);

      // Get the budget to retrieve its ID
      const budget = await caller.budgetRoutes.getBySlug({slug: budgetSlug});
      if (!budget) {
        throw new Error('Budget not found');
      }

      await caller.budgetRoutes.update({
        id: budget.id,
        name: form.data.name,
        description: form.data.description,
        status: form.data.status,
        enforcementLevel: form.data.enforcementLevel,
        metadata,
        accountIds: form.data.accountIds,
        categoryIds: form.data.categoryIds,
      });

      // Redirect after successful update (outside try-catch)
      throw redirect(303, `/budgets/${budgetSlug}`);
    } catch (error) {
      console.error('Failed to update budget:', error);
      return fail(500, {
        form,
        error: 'Failed to update budget. Please try again.',
      });
    }
  },
};
