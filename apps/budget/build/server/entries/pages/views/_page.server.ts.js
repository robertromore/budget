import { c as createCaller, a as createContext } from "../../../chunks/router.js";
import { a as superValidate } from "../../../chunks/vendor-forms.js";
import "../../../chunks/vendor-misc.js";
import "ts-deepmerge";
import { fail } from "@sveltejs/kit";
import "memoize-weak";
import "zod-to-json-schema";
import { a as zod } from "../../../chunks/vendor-trpc.js";
import { v as removeViewSchema } from "../../../chunks/app-state.js";
import { i as superformInsertViewSchema } from "../../../chunks/data-table.js";
const load = async () => ({
  views: await createCaller(await createContext()).viewsRoutes.all(),
  form: await superValidate(zod(superformInsertViewSchema)),
  deleteForm: await superValidate(zod(removeViewSchema))
});
const actions = {
  "save-view": async (event) => {
    const form = await superValidate(event, zod(superformInsertViewSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    const entity = await createCaller(await createContext()).viewsRoutes.save(form.data);
    return {
      form,
      entity
    };
  },
  "delete-view": async (event) => {
    const form = await superValidate(event, zod(removeViewSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    await createCaller(await createContext()).viewsRoutes.remove(form.data);
    return {
      form
    };
  }
};
export {
  actions,
  load
};
