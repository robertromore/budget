import { GenericFacetedFilter, type FacetedFilterOption } from "$lib/components/data-table";
import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { Schedule } from "$lib/schema/schedules";
import Archive from "@lucide/svelte/icons/archive";
import Calendar from "@lucide/svelte/icons/calendar";
import CircleCheck from "@lucide/svelte/icons/circle-check";
import Pause from "@lucide/svelte/icons/pause";
import Repeat from "@lucide/svelte/icons/repeat";
import type { Column, ColumnDef } from "@tanstack/table-core";
import ScheduleActionsCell from "../(components)/(cells)/schedule-actions-cell.svelte";
import ScheduleAmountCell from "../(components)/(cells)/schedule-amount-cell.svelte";
import ScheduleNameCell from "../(components)/(cells)/schedule-name-cell.svelte";
import SchedulePatternCell from "../(components)/(cells)/schedule-pattern-cell.svelte";
import ScheduleStatusCell from "../(components)/(cells)/schedule-status-cell.svelte";

// Filter options for schedule status
const scheduleStatusOptions: FacetedFilterOption[] = [
  { label: "Active", value: "active", icon: CircleCheck },
  { label: "Paused", value: "paused", icon: Pause },
  { label: "Archived", value: "archived", icon: Archive },
];

// Filter options for frequency
const frequencyOptions: FacetedFilterOption[] = [
  { label: "One-time", value: "once", icon: Calendar },
  { label: "Daily", value: "daily", icon: Repeat },
  { label: "Weekly", value: "weekly", icon: Repeat },
  { label: "Bi-weekly", value: "biweekly", icon: Repeat },
  { label: "Monthly", value: "monthly", icon: Repeat },
  { label: "Quarterly", value: "quarterly", icon: Repeat },
  { label: "Yearly", value: "yearly", icon: Repeat },
];

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

interface ScheduleColumnActions {
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}

export function columns(actions: ScheduleColumnActions): ColumnDef<Schedule>[] {
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
          controlledChecked: true,
          "aria-label": "Select all on page",
        });
      },
      cell: ({ row }) => {
        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
          controlledChecked: true,
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
        const schedule = info.row.original;
        return renderComponent(ScheduleNameCell, { schedule });
      },
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: "includesString",
      meta: {
        label: "Name",
      },
    },
    {
      accessorKey: "amount",
      id: "amount",
      header: "Amount",
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleAmountCell, { schedule });
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: "basic",
      meta: {
        label: "Amount",
      },
    },
    {
      accessorFn: (row) => row.scheduleDate?.frequency || "once",
      id: "frequency",
      header: "Frequency",
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(SchedulePatternCell, { schedule });
      },
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: arrIncludesFilter,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.scheduleDate?.frequency || "once";
        const b = rowB.original.scheduleDate?.frequency || "once";
        return a.localeCompare(b);
      },
      meta: {
        label: "Frequency",
        facetedFilter: (column: Column<Schedule, unknown>) => ({
          name: "Frequency",
          icon: Repeat,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Frequency",
              options: frequencyOptions,
            }),
        }),
      },
    },
    {
      accessorKey: "payee",
      id: "payee",
      header: "Payee",
      cell: (info) => {
        const schedule = info.row.original;
        return schedule.payee?.name || "-";
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.payee?.name || "";
        const b = rowB.original.payee?.name || "";
        return a.localeCompare(b);
      },
      meta: {
        label: "Payee",
      },
    },
    {
      accessorKey: "account",
      id: "account",
      header: "Account",
      cell: (info) => {
        const schedule = info.row.original;
        return schedule.account?.name || "-";
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.account?.name || "";
        const b = rowB.original.account?.name || "";
        return a.localeCompare(b);
      },
      meta: {
        label: "Account",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: "Status",
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleStatusCell, { schedule });
      },
      enableColumnFilter: true,
      enableSorting: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Status",
        facetedFilter: (column: Column<Schedule, unknown>) => ({
          name: "Status",
          icon: CircleCheck,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Status",
              options: scheduleStatusOptions,
            }),
        }),
      },
    },
    {
      id: "actions",
      header: "",
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleActionsCell, {
          schedule,
          onView: actions.onView,
          onEdit: actions.onEdit,
          onDelete: actions.onDelete,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
