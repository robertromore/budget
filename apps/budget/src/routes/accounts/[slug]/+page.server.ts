import type { View } from "$lib/schema";
import { superformInsertPayeeSchema } from "$lib/schema/superforms";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { currentDate } from "$lib/utils/dates";
import { fail } from "@sveltejs/kit";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/client";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const {params} = event;
  // Load minimal data required for the data table
  // Views are needed for the DataTable component view management

  const defaultTransactionViews = [
    {
      id: -4,
      name: "All Transactions",
      description: "All transactions for this account",
      filters: [],
      display: {
        grouping: [],
        sort: [
          {
            id: "date",
            desc: true,
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
        sort: [
          {
            id: "date",
            desc: true,
          }
        ],
      },
      icon: "",
      dirty: false,
    },
    {
      id: -2,
      name: "Upcoming",
      description: "Uncleared future transactions for this account",
      filters: [
        {
          column: "date",
          filter: "dateIn",
          value: [{operator: "after", date: currentDate.toString()}],
        },
        {
          column: "status",
          filter: "equalsString",
          value: ["pending", "scheduled"],
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

  const defaultExpenseViews = [
    {
      id: -10,
      name: "All Expenses",
      description: "All medical expenses",
      filters: [],
      display: {
        grouping: [],
        sort: [
          {
            id: "date",
            desc: true,
          }
        ],
        visibility: {
          id: false,
          provider: false,
          patientName: false,
          diagnosis: false,
          treatmentDescription: false,
          notes: false,
        },
      },
      icon: "",
      dirty: false,
    },
    {
      id: -11,
      name: "Recent",
      description: "Expenses from the last 30 days",
      filters: [
        {
          column: "date",
          filter: "dateIn",
          value: [{operator: "after", date: currentDate.subtract({days: 30}).toString()}],
        },
      ],
      display: {
        grouping: [],
        sort: [
          {
            id: "date",
            desc: true,
          }
        ],
        visibility: {
          id: false,
          provider: false,
          patientName: false,
          diagnosis: false,
          treatmentDescription: false,
          notes: false,
        },
      },
      icon: "",
      dirty: false,
    },
    {
      id: -12,
      name: "High Amount",
      description: "Expenses over $500",
      filters: [
        {
          column: "amount",
          filter: "amountFilter",
          value: [{operator: "greaterThan", value: 500}],
        },
      ],
      display: {
        grouping: [],
        sort: [
          {
            id: "amount",
            desc: true,
          }
        ],
        visibility: {
          id: false,
          provider: false,
          patientName: false,
          diagnosis: false,
          treatmentDescription: false,
          notes: false,
        },
      },
      icon: "",
      dirty: false,
    },
    {
      id: -13,
      name: "Unclaimed",
      description: "Expenses not yet submitted for reimbursement",
      filters: [
        {
          column: "status",
          filter: "entityIsFilter",
          value: ["not_submitted"],
        },
      ],
      display: {
        grouping: [],
        sort: [
          {
            id: "date",
            desc: true,
          }
        ],
        visibility: {
          id: false,
          provider: false,
          patientName: false,
          diagnosis: false,
          treatmentDescription: false,
          notes: false,
        },
      },
      icon: "",
      dirty: false,
    },
  ] as View[];

  // Load user-created views from database
  const caller = createCaller(await createContext(event));
  const userViews = await caller.viewsRoutes.all();

  // Load active budgets for transaction form
  const budgets = await caller.budgetRoutes.list({status: "active"});

  return {
    accountSlug: params.slug,
    transactionViews: defaultTransactionViews.concat(userViews),
    expenseViews: defaultExpenseViews,
    // Keep old views property for backward compatibility temporarily
    views: defaultTransactionViews.concat(userViews),
    managePayeeForm: await superValidate(zod4(superformInsertPayeeSchema)),
    budgets,
    // Still keep the load minimal - no transactions, accounts, or forms
    // The heavy data will be loaded client-side to prevent hydration issues
  };
};

export const actions: Actions = {
  "save-payee": async (event) => {
    const form = await superValidate(event, zod4(superformInsertPayeeSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }

    const entity = await createCaller(await createContext(event)).payeeRoutes.save(form.data);
    return {
      form,
      entity,
    };
  },
};
