import type { PageServerLoad } from "./$types";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { View } from "$lib/schema";

export const load: PageServerLoad = async ({ params }) => {
  // Load minimal data required for the data table
  // Views are needed for the DataTable component view management
  
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

  // Load user-created views from database
  const caller = createCaller(await createContext());
  const userViews = await caller.viewsRoutes.all();
  
  return {
    accountId: parseInt(params.id),
    views: defaultViews.concat(userViews),
    // Still keep the load minimal - no transactions, accounts, or forms
    // The heavy data will be loaded client-side to prevent hydration issues
  };
};

