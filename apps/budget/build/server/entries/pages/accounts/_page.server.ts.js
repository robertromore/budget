import { u as removeAccountSchema } from "../../../chunks/app-state.js";
import { c as superformInsertAccountSchema, d as superformInsertTransactionSchema } from "../../../chunks/data-table.js";
import { c as createCaller, a as createContext } from "../../../chunks/router.js";
import { a as superValidate } from "../../../chunks/vendor-forms.js";
import "../../../chunks/vendor-misc.js";
import "ts-deepmerge";
import { fail } from "@sveltejs/kit";
import "memoize-weak";
import "zod-to-json-schema";
import { a as zod } from "../../../chunks/vendor-trpc.js";
const load = async () => ({
  manageAccountForm: await superValidate(zod(superformInsertAccountSchema)),
  deleteAccountForm: await superValidate(zod(removeAccountSchema))
});
const actions = {
  "add-account": async (event) => {
    const form = await superValidate(event, zod(superformInsertAccountSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    const entity = await createCaller(await createContext()).accountRoutes.save(form.data);
    return {
      form,
      entity
    };
  },
  "delete-account": async (event) => {
    const form = await superValidate(event, zod(removeAccountSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    await createCaller(await createContext()).accountRoutes.remove(form.data);
    return {
      form
    };
  },
  "add-transaction": async (event) => {
    const form = await superValidate(event, zod(superformInsertTransactionSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    const entity = await createCaller(await createContext()).transactionRoutes.save(form.data);
    return {
      form,
      entity
    };
  }
};
export {
  actions,
  load
};
