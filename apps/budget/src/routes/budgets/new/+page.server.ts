import { getBudgetTemplateById } from "$lib/constants/budget-templates";
import type { BudgetMetadata } from "$lib/schema/budgets";
import { superformInsertBudgetSchema } from "$lib/schema/superforms";
import type { CreateBudgetRequest } from "$lib/server/domains/budgets/services";
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
    accountIds: [],
    categoryIds: [],
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

  return {
    form: await superValidate(initialData, zod4(superformInsertBudgetSchema), {
      errors: false, // Don't show errors on initial load
    }),
    accounts: await caller.accountRoutes.all(),
    categories: await caller.categoriesRoutes.all(),
    schedules: await caller.scheduleRoutes.all(),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { request } = event;
    const form = await superValidate(request, zod4(superformInsertBudgetSchema));

    if (!form.valid) {
      return fail(400, { form });
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

      // Handle scheduled-expense metadata
      if (form.data.type === "scheduled-expense" && form.data.linkedScheduleId) {
        metadata.scheduledExpense = {
          linkedScheduleId: form.data.linkedScheduleId,
          autoTrack: true,
        };
      }

      const budgetData: CreateBudgetRequest = {
        name: form.data.name,
        description: form.data.description || null,
        type: form.data.type,
        scope: form.data.scope,
        status: form.data.status || "active",
        enforcementLevel: form.data.enforcementLevel || "warning",
        metadata,
        ...(form.data.accountIds && { accountIds: form.data.accountIds }),
        ...(form.data.categoryIds && { categoryIds: form.data.categoryIds }),
      };

      const caller = createCaller(await createContext(event));
      const newBudget = await caller.budgetRoutes.create(budgetData);

      // If a schedule was linked, update the schedule's budgetId and link it via the service
      if (form.data.type === "scheduled-expense" && form.data.linkedScheduleId && newBudget) {
        try {
          // Link the schedule to the budget
          await caller.budgetRoutes.linkScheduleToScheduledExpense({
            budgetId: newBudget.id,
            scheduleId: form.data.linkedScheduleId,
          });

          // Update the schedule to reference the budget
          const schedule = await caller.scheduleRoutes.load({ id: form.data.linkedScheduleId });
          await caller.scheduleRoutes.save({
            id: schedule.id,
            name: schedule.name,
            slug: schedule.slug,
            status: schedule.status ?? "active",
            amount: schedule.amount,
            amount_2: schedule.amount_2,
            amount_type: schedule.amount_type,
            recurring: schedule.recurring ?? false,
            auto_add: schedule.auto_add ?? false,
            dateId: schedule.dateId,
            payeeId: schedule.payeeId,
            categoryId: schedule.categoryId,
            accountId: schedule.accountId,
            budgetId: newBudget.id,
          });
        } catch (linkError) {
          console.error("Failed to link schedule to budget:", linkError);
          // Don't fail the entire operation if linking fails
        }
      }

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
