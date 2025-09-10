import { c as createCaller, a as createContext } from "../../../../chunks/router.js";
const load = async ({ params }) => {
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
            desc: false
          }
        ]
      },
      icon: "",
      dirty: false
    },
    {
      id: -2,
      name: "Cleared",
      description: "Cleared transactions for this account",
      filters: [
        {
          column: "status",
          filter: "equalsString",
          value: ["cleared"]
        }
      ],
      display: {
        grouping: [],
        sort: []
      },
      icon: "",
      dirty: false
    },
    {
      id: -1,
      name: "Upcoming",
      description: "Upcoming transactions for this account",
      filters: [
        {
          column: "status",
          filter: "equalsString",
          value: ["pending"]
        }
      ],
      display: {
        grouping: [],
        sort: []
      },
      icon: "",
      dirty: false
    }
  ];
  const caller = createCaller(await createContext());
  const userViews = await caller.viewsRoutes.all();
  return {
    accountId: parseInt(params.id),
    views: defaultViews.concat(userViews)
    // Still keep the load minimal - no transactions, accounts, or forms
    // The heavy data will be loaded client-side to prevent hydration issues
  };
};
export {
  load
};
