import { t as removeScheduleSchema } from "../../../chunks/app-state.js";
import { b as superformInsertScheduleSchema } from "../../../chunks/data-table.js";
import { c as createCaller, a as createContext } from "../../../chunks/router.js";
import { a as superValidate } from "../../../chunks/vendor-forms.js";
import "../../../chunks/vendor-misc.js";
import "ts-deepmerge";
import { fail } from "@sveltejs/kit";
import "memoize-weak";
import "zod-to-json-schema";
import { a as zod } from "../../../chunks/vendor-trpc.js";
import { z } from "zod/v4";
const insertFormSchema = z.object({});
const load = async () => ({
  schedules: await createCaller(await createContext()).scheduleRoutes.all(),
  form: await superValidate(zod(insertFormSchema)),
  deleteForm: await superValidate(zod(removeScheduleSchema))
});
const actions = {
  "save-schedule": async (event) => {
    const form = await superValidate(event, zod(superformInsertScheduleSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    const entity = await createCaller(await createContext()).scheduleRoutes.save(form.data);
    return {
      form,
      entity
    };
  },
  "delete-schedule": async (event) => {
    const form = await superValidate(event, zod(removeScheduleSchema));
    if (!form.valid) {
      return fail(400, {
        form
      });
    }
    await createCaller(await createContext()).scheduleRoutes.remove(form.data);
    return {
      form
    };
  }
};
export {
  actions,
  load
};
