import { formInsertScheduleSchema } from "$lib/schema";
import { superformInsertAccountSchema } from "$lib/schema/superforms";
import { getLocalTimeZone, today } from "@internationalized/date";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import type { LayoutServerLoad } from "./$types";

const thisday = today(getLocalTimeZone());
export const load: LayoutServerLoad = async () => {

  return {
    manageAccountForm: await superValidate(zod4(superformInsertAccountSchema)),
    manageScheduleForm: await superValidate(zod4(formInsertScheduleSchema)),
    dates: [
      {
        value: thisday.subtract({days: 1}).toString(),
        label: "1 day ago",
      },
      {
        value: thisday.subtract({days: 3}).toString(),
        label: "3 days ago",
      },
      {
        value: thisday.subtract({weeks: 1}).toString(),
        label: "1 week ago",
      },
      {
        value: thisday.subtract({months: 1}).toString(),
        label: "1 month ago",
      },
      {
        value: thisday.subtract({months: 3}).toString(),
        label: "3 months ago",
      },
      {
        value: thisday.subtract({months: 6}).toString(),
        label: "6 months ago",
      },
      {
        value: thisday.subtract({years: 1}).toString(),
        label: "1 year ago",
      },
    ],
  };
};
