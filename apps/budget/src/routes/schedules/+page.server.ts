import {removeScheduleSchema} from "$lib/schema";
import {superformInsertScheduleSchema} from "$lib/schema/superforms";
import {createContext} from "$lib/trpc/context";
import {createCaller} from "$lib/trpc/router";
import {superValidate} from "sveltekit-superforms/client";
import type {Actions, PageServerLoad} from "./$types";
import {fail} from "@sveltejs/kit";
import {zod4} from "sveltekit-superforms/adapters";
import {insertFormSchema} from "./schema";

export const load: PageServerLoad = async () => ({
  schedules: await createCaller(await createContext()).scheduleRoutes.all(),
  form: await superValidate(zod4(insertFormSchema)),
  deleteForm: await superValidate(zod4(removeScheduleSchema)),
});

export const actions: Actions = {
  "save-schedule": async (event) => {
    const form = await superValidate(event, zod4(superformInsertScheduleSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext()).scheduleRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-schedule": async (event) => {
    const form = await superValidate(event, zod4(removeScheduleSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    await createCaller(await createContext()).scheduleRoutes.remove(form.data);
    return {
      form,
    };
  },
};
