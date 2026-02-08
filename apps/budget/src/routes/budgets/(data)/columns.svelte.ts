import BudgetProgress from "$lib/components/budgets/budget-progress.svelte";
import { GenericFacetedFilter, type FacetedFilterOption } from "$lib/components/data-table";
import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { BudgetWithRelations } from "$lib/server/domains/budgets";
import { calculateActualSpent, calculateAllocated } from "$lib/utils/budget-calculations";
import { formatCurrency } from "$lib/utils/formatters";
import Archive from "@lucide/svelte/icons/archive";
import Calendar from "@lucide/svelte/icons/calendar";
import CircleCheck from "@lucide/svelte/icons/circle-check";
import DollarSign from "@lucide/svelte/icons/dollar-sign";
import Pause from "@lucide/svelte/icons/pause";
import Repeat from "@lucide/svelte/icons/repeat";
import Target from "@lucide/svelte/icons/target";
import Users from "@lucide/svelte/icons/users";
import Wallet from "@lucide/svelte/icons/wallet";
import type { Column, ColumnDef, FilterFnOption } from "@tanstack/table-core";
import BudgetActionsCell from "../(components)/(cells)/budget-actions-cell.svelte";
import BudgetNameCell from "../(components)/(cells)/budget-name-cell.svelte";
import BudgetRemainingCell from "../(components)/(cells)/budget-remaining-cell.svelte";
import BudgetStatusCell from "../(components)/(cells)/budget-status-cell.svelte";
import BudgetTypeCell from "../(components)/(cells)/budget-type-cell.svelte";

// Filter options for budget type
const budgetTypeOptions: FacetedFilterOption[] = [
  { label: "Account Monthly", value: "account-monthly", icon: Wallet },
  { label: "Category Envelope", value: "category-envelope", icon: DollarSign },
  { label: "Goal Based", value: "goal-based", icon: Target },
  { label: "Scheduled Expense", value: "scheduled-expense", icon: Repeat },
];

// Filter options for budget scope
const budgetScopeOptions: FacetedFilterOption[] = [
  { label: "Monthly", value: "monthly", icon: Calendar },
  { label: "Weekly", value: "weekly", icon: Calendar },
  { label: "Yearly", value: "yearly", icon: Calendar },
  { label: "Custom", value: "custom", icon: Calendar },
  { label: "Shared", value: "shared", icon: Users },
];

// Filter options for budget status
const budgetStatusOptions: FacetedFilterOption[] = [
  { label: "Active", value: "active", icon: CircleCheck },
  { label: "Paused", value: "paused", icon: Pause },
  { label: "Archived", value: "archived", icon: Archive },
];

// Filter value type with operator support
type FacetedFilterValue = {
  operator: string;
  values: string[];
} | string[];

// Custom filter function for array-based multi-select filters with operator support
const arrIncludesFilter = (row: any, columnId: string, filterValue: unknown) => {
  if (!filterValue) return true;

  // Handle new format with operator
  if (typeof filterValue === 'object' && 'operator' in filterValue && 'values' in filterValue) {
    const { operator, values } = filterValue as { operator: string; values: string[] };
    if (!values || values.length === 0) return true;

    const rowValue = row.getValue(columnId);
    const isIncluded = values.includes(rowValue);

    // "is not one of" operator
    if (operator === 'arrNotIncludesSome') {
      return !isIncluded;
    }
    // "is one of" operator (default)
    return isIncluded;
  }

  // Handle old format (array only) for backwards compatibility
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true;
    const value = row.getValue(columnId);
    return filterValue.includes(value);
  }

  return true;
};

interface BudgetColumnActions {
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
}

function getAllocated(budget: BudgetWithRelations): number {
  return calculateAllocated(budget);
}

function getConsumed(budget: BudgetWithRelations): number {
  return calculateActualSpent(budget);
}

function resolveStatus(budget: BudgetWithRelations) {
  if (budget.status !== "active") return "paused" as const;
  const allocated = getAllocated(budget);
  const consumed = getConsumed(budget);
  if (!allocated) return "paused" as const;

  const ratio = consumed / allocated;
  if (ratio > 1) return "over" as const;
  if (ratio >= 0.8) return "approaching" as const;
  return "on_track" as const;
}

function resolveEnforcement(budget: BudgetWithRelations) {
  return (budget.enforcementLevel ?? "warning") as "none" | "warning" | "strict";
}

export function columns(actions: BudgetColumnActions): ColumnDef<BudgetWithRelations>[] {
  return [
    {
      id: "select-col",
      header: ({ table }) => {
        const allPageRowsSelected = table.getIsAllPageRowsSelected();
        const somePageRowsSelected = table.getIsSomePageRowsSelected();

        return renderComponent(Checkbox, {
          checked: allPageRowsSelected,
          indeterminate: somePageRowsSelected && !allPageRowsSelected,
          onCheckedChange: (value: boolean) => {
            if (value) {
              table.toggleAllPageRowsSelected(true);
            } else {
              table.toggleAllRowsSelected(false);
            }
          },
          "aria-label": "Select all on page",
        });
      },
      cell: ({ row }) => {
        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
          "aria-label": "Select row",
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      id: "name",
      header: "Name",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetNameCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: "includesString" as FilterFnOption<BudgetWithRelations>,
      meta: {
        label: "Name",
      },
    },
    {
      accessorKey: "type",
      id: "type",
      header: "Type",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetTypeCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Type",
        facetedFilter: (column: Column<BudgetWithRelations, unknown>) => ({
          name: "Type",
          icon: DollarSign,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Type",
              options: budgetTypeOptions,
            }),
        }),
      },
    },
    {
      accessorKey: "scope",
      id: "scope",
      header: "Scope",
      cell: (info) => {
        const scope = info.getValue() as string;
        return scope.charAt(0).toUpperCase() + scope.slice(1);
      },
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Scope",
        facetedFilter: (column: Column<BudgetWithRelations, unknown>) => ({
          name: "Scope",
          icon: Calendar,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Scope",
              options: budgetScopeOptions,
            }),
        }),
      },
    },
    {
      id: "allocated",
      header: "Allocated",
      cell: (info) => {
        const budget = info.row.original;
        const allocated = getAllocated(budget);
        return formatCurrency(allocated);
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = getAllocated(rowA.original);
        const b = getAllocated(rowB.original);
        return a - b;
      },
      meta: {
        label: "Allocated",
      },
    },
    {
      id: "consumed",
      header: "Consumed",
      cell: (info) => {
        const budget = info.row.original;
        const consumed = getConsumed(budget);
        return formatCurrency(consumed);
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = getConsumed(rowA.original);
        const b = getConsumed(rowB.original);
        return a - b;
      },
      meta: {
        label: "Consumed",
      },
    },
    {
      id: "remaining",
      header: "Remaining",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetRemainingCell, {
          budget,
        });
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aRemaining = getAllocated(rowA.original) - getConsumed(rowA.original);
        const bRemaining = getAllocated(rowB.original) - getConsumed(rowB.original);
        return aRemaining - bRemaining;
      },
      meta: {
        label: "Remaining",
      },
    },
    {
      id: "progress",
      header: "Progress",
      cell: (info) => {
        const budget = info.row.original;
        const allocated = getAllocated(budget);
        const consumed = getConsumed(budget);
        const status = resolveStatus(budget);
        const enforcement = resolveEnforcement(budget);

        return renderComponent(BudgetProgress, {
          consumed,
          allocated,
          status,
          enforcementLevel: enforcement,
          consumedLabel: budget.type === "goal-based" ? "Saved" : "Spent",
          label: "",
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      meta: {
        label: "Progress",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: "Status",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetStatusCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Status",
        facetedFilter: (column: Column<BudgetWithRelations, unknown>) => ({
          name: "Status",
          icon: CircleCheck,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Status",
              options: budgetStatusOptions,
            }),
        }),
      },
    },
    {
      id: "actions",
      header: "",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetActionsCell, {
          budget,
          onView: actions.onView,
          onEdit: actions.onEdit,
          onDuplicate: actions.onDuplicate,
          onArchive: actions.onArchive,
          onDelete: actions.onDelete,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
