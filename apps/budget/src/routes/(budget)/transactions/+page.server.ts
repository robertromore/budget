import {
  superformDeleteTransactionSchema,
  superformInsertTransactionSchema,
  superformUpdateTransactionSchema,
  type SuperformInsertTransactionData,
  type SuperformUpdateTransactionData,
  type SuperformDeleteTransactionData,
} from "$core/schema/superforms/transactions";
import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import { currentDate } from "$lib/utils/dates";
import { validateAndSanitizeNotes } from "$lib/utils/input-sanitization";
import { fail } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  // Default views available for the cross-account transactions surface.
  // Mirrors the account-page set; user-saved views are loaded on top.
  const defaultTransactionViews = [
    {
      id: -4,
      name: "All Transactions",
      description: "All transactions across every account",
      filters: [],
      display: {
        grouping: [],
        sort: [{ id: "date", desc: true }],
      },
      icon: "",
      dirty: false,
      isDefault: true,
      workspaceId: 0,
      entityType: "transactions" as const,
    },
    {
      id: -3,
      name: "Cleared",
      description: "Cleared transactions across every account",
      filters: [
        {
          column: "status",
          filter: "equalsString",
          value: ["cleared"],
        },
      ],
      display: {
        grouping: [],
        sort: [{ id: "date", desc: true }],
      },
      icon: "",
      dirty: false,
      isDefault: true,
      workspaceId: 0,
      entityType: "transactions" as const,
    },
  ] as const;

  const caller = createCaller(await createContext(fromSvelteKit(event)));
  const userViews = await caller.viewsRoutes.all({ entityType: "transactions" });

  return {
    addTransactionForm: await superValidate(zod4(superformInsertTransactionSchema)),
    updateTransactionForm: await superValidate(zod4(superformUpdateTransactionSchema)),
    deleteTransactionForm: await superValidate(zod4(superformDeleteTransactionSchema)),
    views: defaultTransactionViews.concat(userViews as never),
  };
};

export const actions: Actions = {
  "add-transaction": async (event) => {
    const form = await superValidate(event, zod4(superformInsertTransactionSchema));

    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformInsertTransactionData;

    try {
      // Manual security validation for notes field
      if (data.notes !== undefined) {
        const validation = validateAndSanitizeNotes(data.notes);
        if (!validation.isValid) {
          console.error("Notes validation failed:", validation.error);
          return fail(400, {
            form,
            error: validation.error,
          });
        }
      }

      // Manual validation for amount field
      if (data.amount === 0) {
        console.error("Amount validation failed: Amount cannot be zero");
        return fail(400, {
          form,
          error: "Amount cannot be zero",
        });
      }

      const caller = createCaller(await createContext(fromSvelteKit(event)));
      const entity = await caller.transactionRoutes.create({
        accountId: data.accountId,
        amount: data.amount,
        date: data.date || currentDate.toString(),
        notes: data.notes,
        payeeId: data.payeeId,
        categoryId: data.categoryId,
        status: data.status,
      });

      return {
        form,
        entity,
        success: true,
      };
    } catch (error) {
      console.error("Error adding transaction:", error);
      return fail(500, {
        form,
        error: "Failed to add transaction",
      });
    }
  },

  "update-transaction": async (event) => {
    try {
      const form = await superValidate(event, zod4(superformUpdateTransactionSchema));

      if (!form.valid) {
        return fail(400, {
          form,
          error: `Validation failed: ${JSON.stringify(form.errors)}`,
        });
      }

      // Cast form data to proper type (zod4 adapter returns unknown)
      const data = form.data as SuperformUpdateTransactionData;

      const caller = createCaller(await createContext(fromSvelteKit(event)));

      // Manual security validation for notes field
      if (data.notes !== undefined) {
        const validation = validateAndSanitizeNotes(data.notes);
        if (!validation.isValid) {
          console.error("Notes validation failed:", validation.error);
          return fail(400, {
            form,
            error: validation.error,
          });
        }
      }

      // Manual validation for amount field
      if (data.amount !== undefined && data.amount === 0) {
        console.error("Amount validation failed: Amount cannot be zero");
        return fail(400, {
          form,
          error: "Amount cannot be zero",
        });
      }

      // Build update data object with only fields accepted by tRPC schema
      const updateData: any = {};
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.payeeId !== undefined) updateData.payeeId = data.payeeId;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.status !== undefined) updateData.status = data.status;
      // Note: accountId and parentId are not included as they're not accepted by tRPC updateTransactionSchema

      const entity = await caller.transactionRoutes.update({
        id: data.id,
        data: updateData,
      });

      return {
        form,
        entity,
        success: true,
      };
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      return fail(500, {
        error: `Failed to update transaction: ${error.message || error}`,
      });
    }
  },

  "delete-transaction": async (event) => {
    const form = await superValidate(event, zod4(superformDeleteTransactionSchema));

    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    // Cast form data to proper type (zod4 adapter returns unknown)
    const data = form.data as SuperformDeleteTransactionData;

    try {
      const caller = createCaller(await createContext(fromSvelteKit(event)));
      await caller.transactionRoutes.delete({
        id: data.id,
      });

      return {
        form,
        success: true,
      };
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return fail(500, {
        form,
        error: "Failed to delete transaction",
      });
    }
  },
};
