import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { superValidate } from "sveltekit-superforms";
import type { LayoutServerLoad } from "./$types";
import { zod4 } from "sveltekit-superforms/adapters";
import { formInsertAccountSchema, formInsertScheduleSchema } from "$lib/schema";
import { getLocalTimeZone, today } from "@internationalized/date";

const thisday = today(getLocalTimeZone());
export const load: LayoutServerLoad = async () => ({
  accounts: await createCaller(await createContext()).accountRoutes.all(),
  payees: await createCaller(await createContext()).payeeRoutes.all(),
  categories: await createCaller(await createContext()).categoriesRoutes.all(),
  schedules: await createCaller(await createContext()).scheduleRoutes.all(),
  manageAccountForm: await superValidate(zod4(formInsertAccountSchema)),
  manageScheduleForm: await superValidate(zod4(formInsertScheduleSchema)),
  dates: [
    {
      value: thisday.subtract({ days: 1 }).toString(),
      label: "1 day ago",
    },
    {
      value: thisday.subtract({ days: 3 }).toString(),
      label: "3 days ago",
    },
    {
      value: thisday.subtract({ weeks: 1 }).toString(),
      label: "1 week ago",
    },
    {
      value: thisday.subtract({ months: 1 }).toString(),
      label: "1 month ago",
    },
    {
      value: thisday.subtract({ months: 3 }).toString(),
      label: "3 months ago",
    },
    {
      value: thisday.subtract({ months: 6 }).toString(),
      label: "6 months ago",
    },
    {
      value: thisday.subtract({ years: 1 }).toString(),
      label: "1 year ago",
    },
  ],
});
