import { superValidate } from "sveltekit-superforms";
import type { PageServerLoad } from "./$types";
import { zod } from "sveltekit-superforms/adapters";
import {
  formInsertPayeeSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertViewSchema,
  removeCategorySchema,
  removePayeeSchema,
  removeTransactionsSchema,
  type View,
} from "$lib/schema";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { getSpecialDateValueAsLabel } from "$lib/utils";

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

  const views = await createCaller(await createContext()).viewsRoutes.all();
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
    manageTransactionForm: await superValidate(zod(insertTransactionSchema)),
    deleteTransactionForm: await superValidate(zod(removeTransactionsSchema)),
    manageCategoryForm: await superValidate(zod(insertCategorySchema)),
    deleteCategoryForm: await superValidate(zod(removeCategorySchema)),
    managePayeeForm: await superValidate(zod(formInsertPayeeSchema)),
    deletePayeeForm: await superValidate(zod(removePayeeSchema)),
    manageViewForm: await superValidate(zod(insertViewSchema)),
    views: defaultViews.concat(views),
    dates,
  };
};
