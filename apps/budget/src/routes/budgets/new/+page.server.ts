import { superformInsertBudgetSchema } from "$lib/schema/superforms";
import type { BudgetMetadata, CreateBudgetRequest } from "$lib/server/domains/budgets/services";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { Actions, PageServerLoad } from "@sveltejs/kit";
import { fail, redirect } from '@sveltejs/kit';
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";
import { getBudgetTemplateById } from "$lib/constants/budget-templates";

export const load: PageServerLoad = async ({ url }) => {
  const context = await createContext();
  const caller = createCaller(context);

  // Check for template parameter and prefill form data
  const templateId = url.searchParams.get('template');
  let initialData: any = {
    name: '',
    description: null,
    type: 'account-monthly',
    scope: 'account',
    enforcementLevel: 'warning',
    periodType: 'monthly',
    startDay: 1,
    accountIds: [],
    categoryIds: [],
  };

  if (templateId) {
    const template = getBudgetTemplateById(templateId);
    if (template) {
      initialData = {
        ...initialData,
        name: template.name,
        description: template.description,
        type: template.type,
        scope: template.scope,
        enforcementLevel: template.enforcementLevel,
        allocatedAmount: template.suggestedAmount,
      };
    }
  }

  return {
    form: await superValidate(initialData, zod4(superformInsertBudgetSchema), {
      errors: false, // Don't show errors on initial load
    }),
    accounts: await caller.accountRoutes.all(),
    categories: await caller.categoriesRoutes.all(),
  };
};

export const actions: Actions = {
  default: async ({request}) => {
    const form = await superValidate(request, zod4(superformInsertBudgetSchema));

    if (!form.valid) {
      return fail(400, {form});
    }

    try {
      // Transform form data to CreateBudgetRequest
      const metadata: BudgetMetadata = {
        defaultPeriod: {
          type: form.data.periodType || "monthly",
          startDay: form.data.startDay || 1,
        },
      };

      if (form.data.allocatedAmount !== undefined) {
        metadata.allocatedAmount = form.data.allocatedAmount;
      }

      const budgetData: CreateBudgetRequest = {
        name: form.data.name,
        description: form.data.description || null,
        type: form.data.type,
        scope: form.data.scope,
        status: form.data.status || "active",
        enforcementLevel: form.data.enforcementLevel || "warning",
        metadata,
        accountIds: form.data.accountIds,
        categoryIds: form.data.categoryIds,
      };

      const budget = await createCaller(await createContext()).budgetRoutes.create(budgetData);

      // Redirect to the budgets list on success
      throw redirect(303, '/budgets');
    } catch (error) {
      // If it's a redirect, rethrow it
      if (error instanceof Response && error.status === 303) {
        throw error;
      }

      console.error("Failed to create budget:", error);
      return fail(500, {
        form,
        error: "Failed to create budget. Please try again.",
      });
    }
  },
};
