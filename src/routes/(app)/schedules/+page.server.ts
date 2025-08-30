import { scheduleFormSchema, removeScheduleFormSchema } from "$lib/schema/forms";
import { createContext } from "$lib/server/rpc/context";
import { createCaller } from "$lib/server/rpc/caller";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";

export const load: PageServerLoad = async () => {
  const ctx = await createContext();
  const caller = createCaller(ctx);
  
  return {
    schedules: await caller.schedules.all(),
    form: await superValidate(zod4(scheduleFormSchema)),
    deleteForm: await superValidate(zod4(removeScheduleFormSchema)),
  };
};

export const actions: Actions = {
  "save-schedule": async (event) => {
    const form = await superValidate(event, zod4(scheduleFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    const entity = await caller.schedules.save(form.data);
    return {
      form,
      entity,
    };
  },
  "delete-schedule": async (event) => {
    const form = await superValidate(event, zod4(removeScheduleFormSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const ctx = await createContext();
    const caller = createCaller(ctx);
    await caller.schedules.remove(form.data);
    return {
      form,
    };
  },
};
