import type { View } from "$lib/schema";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { currentDate } from "$lib/utils/dates";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const {params} = event;
  // Load minimal data required for the data table
  // Views are needed for the DataTable component view management

  const defaultViews = [
    {
      id: -4,
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
          {
            id: "date",
            desc: false,
          }
        ],
      },
      icon: "",
      dirty: false,
    },
    {
      id: -3,
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
      id: -2,
      name: "Upcoming",
      description: "Upcoming transactions for this account",
      filters: [
        {
          column: "date",
          filter: "dateAfter",
          value: [currentDate.toString()],
        },
      ],
      display: {
        grouping: [],
        sort: [
          {
            id: "id",
            desc: false,
          },
          {
            id: "date",
            desc: false,
          }
        ],
      },
      icon: "",
      dirty: false,
    },
    {
      id: -1,
      name: "Scheduled",
      description: "Scheduled transactions for this account",
      filters: [
        {
          column: "status",
          filter: "equalsString",
          value: ["scheduled"],
        },
      ],
      display: {
        grouping: [],
        sort: [
          {
            id: "date",
            desc: false,
          }
        ],
      },
      icon: "",
      dirty: false,
    },
  ] as View[];

  // Load user-created views from database
  const caller = createCaller(await createContext(event));
  const userViews = await caller.viewsRoutes.all();

  return {
    accountSlug: params.slug,
    views: defaultViews.concat(userViews),
    // Still keep the load minimal - no transactions, accounts, or forms
    // The heavy data will be loaded client-side to prevent hydration issues
  };
};
