import {Checkbox} from '$lib/components/ui/checkbox';
import {renderComponent} from '$lib/components/ui/data-table';
import type {Schedule} from '$lib/schema/schedules';
import type {SchedulesState} from '$lib/states/entities/schedules.svelte';
import type {ColumnDef} from '@tanstack/table-core';
import ScheduleColumnHeader from '../(components)/schedule-column-header.svelte';
import ScheduleNameCell from '../(components)/(cells)/schedule-name-cell.svelte';
import ScheduleAmountCell from '../(components)/(cells)/schedule-amount-cell.svelte';
import SchedulePatternCell from '../(components)/(cells)/schedule-pattern-cell.svelte';
import ScheduleStatusCell from '../(components)/(cells)/schedule-status-cell.svelte';
import ScheduleActionsCell from '../(components)/(cells)/schedule-actions-cell.svelte';

export const columns = (
  _schedulesState: SchedulesState,
  onView: (schedule: Schedule) => void,
  onEdit: (schedule: Schedule) => void,
  onDelete: (schedule: Schedule) => void
): ColumnDef<Schedule>[] => {
  return [
    {
      id: 'select-col',
      header: ({table}) => {
        const allPageRowsSelected = table.getIsAllPageRowsSelected();
        const somePageRowsSelected = table.getIsSomePageRowsSelected();

        return renderComponent(Checkbox, {
          checked: allPageRowsSelected,
          indeterminate: somePageRowsSelected && !allPageRowsSelected,
          onCheckedChange: (value) => {
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
      cell: ({row}) => {
        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
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
      header: ({column}) =>
        renderComponent(ScheduleColumnHeader<Schedule, unknown>, {
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
      header: ({column}) =>
        renderComponent(ScheduleColumnHeader<Schedule, unknown>, {
          column,
          title: 'Name',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleNameCell, {schedule});
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
      header: ({column}) =>
        renderComponent(ScheduleColumnHeader<Schedule, unknown>, {
          column,
          title: 'Amount',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleAmountCell, {schedule});
      },
      sortingFn: 'alphanumeric',
      enableColumnFilter: false,
      meta: {
        label: 'Amount',
      },
    },
    {
      accessorKey: 'scheduleDate',
      id: 'pattern',
      header: ({column}) =>
        renderComponent(ScheduleColumnHeader<Schedule, unknown>, {
          column,
          title: 'Pattern',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(SchedulePatternCell, {schedule});
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.scheduleDate?.frequency || '';
        const b = rowB.original.scheduleDate?.frequency || '';
        return a.localeCompare(b);
      },
      enableColumnFilter: false,
      meta: {
        label: 'Pattern',
      },
    },
    {
      accessorKey: 'payee',
      id: 'payee',
      header: ({column}) =>
        renderComponent(ScheduleColumnHeader<Schedule, unknown>, {
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
    {
      accessorKey: 'account',
      id: 'account',
      header: ({column}) =>
        renderComponent(ScheduleColumnHeader<Schedule, unknown>, {
          column,
          title: 'Account',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return schedule.account?.name || '-';
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.account?.name || '';
        const b = rowB.original.account?.name || '';
        return a.localeCompare(b);
      },
      enableColumnFilter: false,
      meta: {
        label: 'Account',
      },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: ({column}) =>
        renderComponent(ScheduleColumnHeader<Schedule, unknown>, {
          column,
          title: 'Status',
        }),
      cell: (info) => {
        const schedule = info.row.original;
        return renderComponent(ScheduleStatusCell, {schedule});
      },
      sortingFn: 'alphanumeric',
      enableColumnFilter: true,
      meta: {
        label: 'Status',
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
