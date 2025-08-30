import { superValidate } from "sveltekit-superforms";
import type { LayoutServerLoad } from "./$types";
import { zod4 } from "sveltekit-superforms/adapters";
import { accountFormSchema, scheduleFormSchema } from "$lib/schema/forms";
import { getLocalTimeZone, today } from "@internationalized/date";
import { createContext } from "$lib/server/rpc/context";
import { createCaller } from "$lib/server/rpc/caller";

const thisday = today(getLocalTimeZone());
export const load: LayoutServerLoad = async () => {
  const ctx = await createContext();
  const caller = createCaller(ctx);

  return {
    accounts: await caller.accounts.all(),
    payees: await caller.payees.all(),
    categories: await caller.categories.all(),
    schedules: await caller.schedules.all(),
    manageAccountForm: await superValidate(zod4(accountFormSchema)),
    manageScheduleForm: await superValidate(zod4(scheduleFormSchema)),
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
  };
};
