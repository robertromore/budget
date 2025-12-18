import {
  superformDeleteTransactionSchema,
  superformInsertTransactionSchema,
  superformUpdateTransactionSchema,
} from "$lib/schema/superforms/transactions";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { currentDate } from "$lib/utils/dates";
import { validateAndSanitizeNotes } from "$lib/utils/input-sanitization";
import { fail } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => ({
  addTransactionForm: await superValidate(zod4(superformInsertTransactionSchema)),
  updateTransactionForm: await superValidate(zod4(superformUpdateTransactionSchema)),
  deleteTransactionForm: await superValidate(zod4(superformDeleteTransactionSchema)),
});

export const actions: Actions = {
  "add-transaction": async (event) => {
    const form = await superValidate(event, zod4(superformInsertTransactionSchema));

    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    try {
      // Manual security validation for notes field
      if (form.data.notes !== undefined) {
        const validation = validateAndSanitizeNotes(form.data.notes);
        if (!validation.isValid) {
          console.error("Notes validation failed:", validation.error);
          return fail(400, {
            form,
            error: validation.error,
          });
        }
      }

      // Manual validation for amount field
      if (form.data["amount"] === 0) {
        console.error("Amount validation failed: Amount cannot be zero");
        return fail(400, {
          form,
          error: "Amount cannot be zero",
        });
      }

      const caller = createCaller(await createContext(event));
      const entity = await caller.transactionRoutes.create({
        accountId: form.data["accountId"] as number,
        amount: form.data["amount"] as number,
        date: (form.data["date"] as string) || currentDate.toString(),
        notes: form.data["notes"] as string | null | undefined,
        payeeId: form.data["payeeId"] as number | null | undefined,
        categoryId: form.data["categoryId"] as number | null | undefined,
        status: form.data["status"] as "cleared" | "pending" | "scheduled",
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

      const caller = createCaller(await createContext(event));

      // Manual security validation for notes field
      if (form.data["notes"] !== undefined) {
        const validation = validateAndSanitizeNotes(form.data["notes"]);
        if (!validation.isValid) {
          console.error("Notes validation failed:", validation.error);
          return fail(400, {
            form,
            error: validation.error,
          });
        }
      }

      // Manual validation for amount field
      if (form.data["amount"] !== undefined && form.data["amount"] === 0) {
        console.error("Amount validation failed: Amount cannot be zero");
        return fail(400, {
          form,
          error: "Amount cannot be zero",
        });
      }

      // Build update data object with only fields accepted by tRPC schema
      const updateData: any = {};
      if (form.data["amount"] !== undefined) updateData.amount = form.data["amount"];
      if (form.data["date"] !== undefined) updateData.date = form.data["date"];
      if (form.data["notes"] !== undefined) updateData.notes = form.data["notes"];
      if (form.data["payeeId"] !== undefined) updateData.payeeId = form.data["payeeId"];
      if (form.data["categoryId"] !== undefined) updateData.categoryId = form.data["categoryId"];
      if (form.data["status"] !== undefined) updateData.status = form.data["status"];
      // Note: accountId and parentId are not included as they're not accepted by tRPC updateTransactionSchema

      const entity = await caller.transactionRoutes.update({
        id: form.data["id"] as number,
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

    try {
      const caller = createCaller(await createContext(event));
      await caller.transactionRoutes.delete({
        id: form.data["id"] as number,
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
