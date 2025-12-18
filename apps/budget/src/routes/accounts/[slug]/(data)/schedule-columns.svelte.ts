import { GenericFacetedFilter, type FacetedFilterOption } from '$lib/components/data-table';
import { Checkbox } from '$lib/components/ui/checkbox';
import { renderComponent } from '$lib/components/ui/data-table';
import type { Schedule } from '$lib/schema/schedules';
import type { SchedulesState } from '$lib/states/entities/schedules.svelte';
import Archive from '@lucide/svelte/icons/archive';
import Calendar from '@lucide/svelte/icons/calendar';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Pause from '@lucide/svelte/icons/pause';
import Repeat from '@lucide/svelte/icons/repeat';
import type { Column, ColumnDef } from '@tanstack/table-core';
import ScheduleActionsCell from '../../../schedules/(components)/(cells)/schedule-actions-cell.svelte';
import ScheduleAmountCell from '../../../schedules/(components)/(cells)/schedule-amount-cell.svelte';
import ScheduleNameCell from '../../../schedules/(components)/(cells)/schedule-name-cell.svelte';
import SchedulePatternCell from '../../../schedules/(components)/(cells)/schedule-pattern-cell.svelte';
import ScheduleStatusCell from '../../../schedules/(components)/(cells)/schedule-status-cell.svelte';
import ScheduleColumnHeader from '../../../schedules/(components)/schedule-column-header.svelte';

// Filter options for schedule status
const scheduleStatusOptions: FacetedFilterOption[] = [
  { label: 'Active', value: 'active', icon: CircleCheck },
  { label: 'Paused', value: 'paused', icon: Pause },
  { label: 'Archived', value: 'archived', icon: Archive },
];

// Filter options for frequency
const frequencyOptions: FacetedFilterOption[] = [
  { label: 'One-time', value: 'once', icon: Calendar },
  { label: 'Daily', value: 'daily', icon: Repeat },
  { label: 'Weekly', value: 'weekly', icon: Repeat },
  { label: 'Bi-weekly', value: 'biweekly', icon: Repeat },
  { label: 'Monthly', value: 'monthly', icon: Repeat },
  { label: 'Quarterly', value: 'quarterly', icon: Repeat },
  { label: 'Yearly', value: 'yearly', icon: Repeat },
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

export const columns = (
  _schedulesState: SchedulesState,
  onView: (schedule: Schedule) => void,
  onEdit: (schedule: Schedule) => void,
  onDelete: (schedule: Schedule) => void
): ColumnDef<Schedule>[] => {
  return [
    {
      id: 'select-col',
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
          'aria-label': 'Select all on page',
        });
      },
      cell: ({ row }) => {
        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
          controlledChecked: true,
          'aria-label': 'Select row',
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'id',
      header: ({ column }) =>
        renderComponent(ScheduleColumnHeader as any, {
          column,
          title: 'ID',
        }),
      cell: (info) => info.getValue(),
      sortingFn: 'alphanumeric',
      enableColumnFilter: false,
      meta: {
        label: 'ID',
      },
    },
    {
      accessorKey: 'name',
      id: 'name',
      header: ({ column }) =>
        renderComponent(ScheduleColumnHeader as any, {
          column,
          title: 'Name',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleNameCell, { schedule });
      },
      sortingFn: 'alphanumeric',
      enableColumnFilter: true,
      meta: {
        label: 'Name',
      },
    },
    {
      accessorKey: 'amount',
      id: 'amount',
      header: ({ column }) =>
        renderComponent(ScheduleColumnHeader as any, {
          column,
          title: 'Amount',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleAmountCell, { schedule });
      },
      sortingFn: 'alphanumeric',
      enableColumnFilter: false,
      meta: {
        label: 'Amount',
      },
    },
    {
      accessorFn: (row) => row.scheduleDate?.frequency || 'once',
      id: 'frequency',
      header: ({ column }) =>
        renderComponent(ScheduleColumnHeader as any, {
          column,
          title: 'Frequency',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(SchedulePatternCell, { schedule });
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.scheduleDate?.frequency || 'once';
        const b = rowB.original.scheduleDate?.frequency || 'once';
        return a.localeCompare(b);
      },
      enableColumnFilter: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: 'Frequency',
        facetedFilter: (column: Column<Schedule, unknown>) => ({
          name: 'Frequency',
          icon: Repeat,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: 'Frequency',
              options: frequencyOptions,
            }),
        }),
      },
    },
    {
      accessorKey: 'payee',
      id: 'payee',
      header: ({ column }) =>
        renderComponent(ScheduleColumnHeader as any, {
          column,
          title: 'Payee',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return schedule.payee?.name || '-';
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.payee?.name || '';
        const b = rowB.original.payee?.name || '';
        return a.localeCompare(b);
      },
      enableColumnFilter: false,
      meta: {
        label: 'Payee',
      },
    },
    // Note: Account column intentionally omitted since we're on the account detail page
    {
      accessorKey: 'status',
      id: 'status',
      header: ({ column }) =>
        renderComponent(ScheduleColumnHeader as any, {
          column,
          title: 'Status',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleStatusCell, { schedule });
      },
      sortingFn: 'alphanumeric',
      enableColumnFilter: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: 'Status',
        facetedFilter: (column: Column<Schedule, unknown>) => ({
          name: 'Status',
          icon: CircleCheck,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: 'Status',
              options: scheduleStatusOptions,
            }),
        }),
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleActionsCell, {
          schedule,
          onView,
          onEdit,
          onDelete,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
};
