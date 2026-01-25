import { getBudgetTemplateById } from "$lib/constants/budget-templates";
import type { BudgetMetadata } from "$lib/schema/budgets";
import { superformInsertBudgetSchema, type SuperformInsertBudgetData } from "$lib/schema/superforms";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { Actions, ServerLoadEvent } from "@sveltejs/kit";
import { fail, redirect } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";

export const load = async (event: ServerLoadEvent) => {
  const { url } = event;
  const context = await createContext(event);
  const caller = createCaller(context);

  // Check for template parameter and prefill form data
  const templateId = url.searchParams.get("template");
  const accountIdParam = url.searchParams.get("accountId");

  let initialData: any = {
    name: "",
    description: null,
    type: "account-monthly",
    scope: "account",
    enforcementLevel: "warning",
    periodType: "monthly",
    startDay: 1,
    intervalCount: 30,
    accountIds: [],
    categoryIds: [],
    // Schedule linking mode - "link" = link to existing schedule, "create" = create new schedule
    scheduleMode: "link",
    linkedScheduleId: null,
  };

  // Pre-fill accountId from URL query parameter if provided
  if (accountIdParam) {
    const accountIdValue = parseInt(accountIdParam, 10);
    if (!isNaN(accountIdValue) && accountIdValue > 0) {
      initialData.accountIds = [accountIdValue];
    }
  }

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

  // Fetch all required data in parallel
  const [accounts, categories, schedules, payees] = await Promise.all([
    caller.accountRoutes.all(),
    caller.categoriesRoutes.all(),
    caller.scheduleRoutes.all(),
    caller.payeeRoutes.all(),
  ]);

  return {
    form: await superValidate(initialData, zod4(superformInsertBudgetSchema), {
      errors: false, // Don't show errors on initial load
    }),
    accounts,
    categories,
    schedules,
    payees,
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { request } = event;
    const form = await superValidate(request, zod4(superformInsertBudgetSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformInsertBudgetData;

    try {
      // Transform form data to CreateBudgetRequest
      const metadata: BudgetMetadata = {
        defaultPeriod: {
          type: data.periodType || "monthly",
          startDay: data.startDay || 1,
          ...(data.periodType === "custom" && data.intervalCount && {
            intervalCount: data.intervalCount,
          }),
        },
      };

      if (data.allocatedAmount !== undefined) {
        metadata.allocatedAmount = data.allocatedAmount;
      }

      // Build the create request - tRPC route handles schedule creation/linking
      const budgetData = {
        name: data.name,
        description: data.description || null,
        type: data.type,
        scope: data.scope,
        status: data.status || "active",
        enforcementLevel: data.enforcementLevel || "warning",
        metadata,
        ...(data.accountIds && { accountIds: data.accountIds }),
        ...(data.accountAssociations && { accountAssociations: data.accountAssociations }),
        ...(data.categoryIds && { categoryIds: data.categoryIds }),
        // Pass schedule mode and data - tRPC route handles atomic creation
        // Default to "link" since that's the most common use case (linking existing schedules)
        scheduleMode: data.scheduleMode || "link",
        linkedScheduleId: data.linkedScheduleId,
        newSchedule: data.newSchedule,
      };

      const caller = createCaller(await createContext(event));
      await caller.budgetRoutes.create(budgetData);

      // Redirect to the budgets list on success
      throw redirect(303, "/budgets");
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
