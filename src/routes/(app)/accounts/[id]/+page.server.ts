import { superValidate } from "sveltekit-superforms";
import type { PageServerLoad } from "./$types";
import { zod4 } from "sveltekit-superforms/adapters";
import {
  transactionFormSchema,
  categoryFormSchema,
  payeeFormSchema,
  viewFormSchema,
  removeCategoryFormSchema,
  removePayeeFormSchema,
  removeTransactionsFormSchema,
} from "$lib/schema/forms";
import { type View } from "$lib/schema";
import { createContext } from "$lib/server/rpc/context";
import { createCaller } from "$lib/server/rpc/caller";
import { getSpecialDateValueAsLabel } from "$lib/utils/date-formatters";

export const load: PageServerLoad = async ({ params, parent }) => {
  const { accounts, dates: defaultDates } = await parent();
  const defaultViews = [
    {
      id: -3,
      name: "All Transactions",
      description: "All transactions for this account",
      filters: [],
      display: {
        grouping: [],
        sort: [
          {
            id: "id",
            desc: false,
          },
        ],
      },
      icon: "",
      dirty: false,
    },
    {
      id: -2,
      name: "Cleared",
      description: "Cleared transactions for this account",
      filters: [
        {
          column: "status",
          filter: "equalsString",
          value: ["cleared"],
        },
      ],
      display: {
        grouping: [],
        sort: [],
      },
      icon: "",
      dirty: false,
    },
    {
      id: -1,
      name: "Upcoming",
      description: "Upcoming transactions for this account",
      filters: [
        {
          column: "status",
          filter: "equalsString",
          value: ["pending"],
        },
      ],
      display: {
        grouping: [],
        sort: [],
      },
      icon: "",
      dirty: false,
    },
  ] as View[];

  const ctx = await createContext();
  const caller = createCaller(ctx);
  const views = await caller.views.all();
  const dates = defaultDates.concat(
    views
      .map((view) => view.filters)
      .flat()
      .filter((filter) => filter?.column === "date")
      .map((filter) => filter?.value)
      .flat()
      .map((date) => ({
        value: date as string,
        label: getSpecialDateValueAsLabel(date as string),
      }))
  );

  return {
    accountId: parseInt(params.id),
    account: accounts.find((account) => account.id === parseInt(params.id)),
    manageTransactionForm: await superValidate(zod4(transactionFormSchema)),
    deleteTransactionForm: await superValidate(zod4(removeTransactionsFormSchema)),
    manageCategoryForm: await superValidate(zod4(categoryFormSchema)),
    deleteCategoryForm: await superValidate(zod4(removeCategoryFormSchema)),
    managePayeeForm: await superValidate(zod4(payeeFormSchema)),
    deletePayeeForm: await superValidate(zod4(removePayeeFormSchema)),
    manageViewForm: await superValidate(zod4(viewFormSchema)),
    views: defaultViews.concat(views),
    dates,
  };
};
