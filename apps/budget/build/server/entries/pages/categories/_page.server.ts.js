import { x as removeCategorySchema } from "../../../chunks/app-state.js";
import { j as superformInsertCategorySchema } from "../../../chunks/data-table.js";
import { c as createCaller, a as createContext } from "../../../chunks/router.js";
import { a as superValidate } from "../../../chunks/vendor-forms.js";
import "../../../chunks/vendor-misc.js";
import "ts-deepmerge";
import { fail } from "@sveltejs/kit";
import "memoize-weak";
import { b as zod, a as zod$1 } from "../../../chunks/vendor-trpc.js";
const load = async () => ({
  categories: await createCaller(await createContext()).categoriesRoutes.all(),
  form: await superValidate(zod$1(superformInsertCategorySchema)),
  deleteForm: await superValidate(zod(removeCategorySchema))
});
const actions = {
  "save-category": async (event) => {
    const form = await superValidate(event, zod$1(superformInsertCategorySchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    const entity = await createCaller(await createContext()).categoriesRoutes.save(form.data);
    return {
      form,
      entity
    };
  },
  "delete-category": async (event) => {
    const form = await superValidate(event, zod(removeCategorySchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    await createCaller(await createContext()).categoriesRoutes.remove(form.data);
    return {
      form
    };
  }
};
export {
  actions,
  load
};
