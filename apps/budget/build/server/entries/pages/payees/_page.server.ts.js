import { s as removePayeeSchema } from "../../../chunks/app-state.js";
import { s as superformInsertPayeeSchema } from "../../../chunks/data-table.js";
import { c as createCaller, a as createContext } from "../../../chunks/router.js";
import { a as superValidate } from "../../../chunks/vendor-forms.js";
import "../../../chunks/vendor-misc.js";
import "ts-deepmerge";
import { fail } from "@sveltejs/kit";
import "memoize-weak";
import "zod-to-json-schema";
import { a as zod } from "../../../chunks/vendor-trpc.js";
const load = async () => ({
  payees: await createCaller(await createContext()).payeeRoutes.all(),
  form: await superValidate(zod(superformInsertPayeeSchema)),
  deleteForm: await superValidate(zod(removePayeeSchema))
});
const actions = {
  "save-payee": async (event) => {
    const form = await superValidate(event, zod(superformInsertPayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    const entity = await createCaller(await createContext()).payeeRoutes.save(form.data);
    return {
      form,
      entity
    };
  },
  "delete-payee": async (event) => {
    const form = await superValidate(event, zod(removePayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    await createCaller(await createContext()).payeeRoutes.remove(form.data);
    return {
      form
    };
  }
};
export {
  actions,
  load
};
