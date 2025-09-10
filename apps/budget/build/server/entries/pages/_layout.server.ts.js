import { a as createContext, c as createCaller } from "../../chunks/router.js";
import "clsx";
import "../../chunks/vendor-misc.js";
import "ts-deepmerge";
import { a as superValidate } from "../../chunks/vendor-forms.js";
import "@sveltejs/kit";
import "memoize-weak";
import "zod-to-json-schema";
import { a as zod } from "../../chunks/vendor-trpc.js";
import { q as formInsertScheduleSchema, r as formInsertAccountSchema } from "../../chunks/app-state.js";
import { a as $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3, $ as $14e0f24ef4ac5c92$export$aa8b41735afcabd2 } from "../../chunks/vendor-date.js";
const thisday = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
const load = async () => {
  const ctx = await createContext();
  const caller = createCaller(ctx);
  return {
    accounts: await caller.accountRoutes.all(),
    payees: await caller.payeeRoutes.all(),
    categories: await caller.categoriesRoutes.all(),
    schedules: await caller.scheduleRoutes.all(),
    manageAccountForm: await superValidate(zod(formInsertAccountSchema)),
    manageScheduleForm: await superValidate(zod(formInsertScheduleSchema)),
    dates: [
      {
        value: thisday.subtract({ days: 1 }).toString(),
        label: "1 day ago"
      },
      {
        value: thisday.subtract({ days: 3 }).toString(),
        label: "3 days ago"
      },
      {
        value: thisday.subtract({ weeks: 1 }).toString(),
        label: "1 week ago"
      },
      {
        value: thisday.subtract({ months: 1 }).toString(),
        label: "1 month ago"
      },
      {
        value: thisday.subtract({ months: 3 }).toString(),
        label: "3 months ago"
      },
      {
        value: thisday.subtract({ months: 6 }).toString(),
        label: "6 months ago"
      },
      {
        value: thisday.subtract({ years: 1 }).toString(),
        label: "1 year ago"
      }
    ]
  };
};
export {
  load
};
