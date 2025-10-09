<script lang="ts">
import type { Payee } from '$lib/schema';
import type { PayeesState } from '$lib/states/entities/payees.svelte';
import {
  type ColumnDef,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Table as TTable,
} from '@tanstack/table-core';
import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import DataTablePagination from '../../accounts/[slug]/(components)/data-table-pagination.svelte';
import PayeeBulkActions from './payee-bulk-actions.svelte';

interface Props {
  columns: (
    payeesState: PayeesState,
    onView: (payee: Payee) => void,
    onEdit: (payee: Payee) => void,
    onDelete: (payee: Payee) => void,
    onViewAnalytics: (payee: Payee) => void
  ) => ColumnDef<Payee>[];
  payees: Payee[];
  payeesState: PayeesState;
  onView: (payee: Payee) => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payee: Payee) => void;
  onViewAnalytics: (payee: Payee) => void;
  onBulkDelete: (payees: Payee[]) => void;
  table?: TTable<Payee> | undefined;
}

let {
  columns,
  payees,
  payeesState,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics,
  onBulkDelete,
  table = $bindable(),
}: Props = $props();

// Table state
let sorting = $state<any[]>([]);
let columnFilters = $state<any[]>([]);
let columnVisibility = $state<Record<string, boolean>>({});
let rowSelection = $state<Record<string, boolean>>({});
let pagination = $state({ pageIndex: 0, pageSize: 50 });

// Create the table instance
table = createSvelteTable({
  get data() {
    return payees;
  },
  get columns() {
    return columns(payeesState, onView, onEdit, onDelete, onViewAnalytics);
  },
  state: {
    get sorting() {
      return sorting;
    },
    get columnFilters() {
      return columnFilters;
    },
    get columnVisibility() {
      return columnVisibility;
    },
    get rowSelection() {
      return rowSelection;
    },
    get pagination() {
      return pagination;
    },
  },
  enableRowSelection: true,
  onSortingChange: (updater) => {
    sorting = typeof updater === 'function' ? updater(sorting) : updater;
  },
  onColumnFiltersChange: (updater) => {
    columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
  },
  onColumnVisibilityChange: (updater) => {
    columnVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
  },
  onRowSelectionChange: (updater) => {
    rowSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
  },
  onPaginationChange: (updater) => {
    pagination = typeof updater === 'function' ? updater(pagination) : updater;
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
});
</script>

<div class="space-y-4">
  <!-- Bulk Actions -->
  <PayeeBulkActions {table} allPayees={payees} {onBulkDelete} />

  <!-- Table -->
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup}
          <Table.Row>
            {#each headerGroup.headers as header}
              <Table.Head>
                {#if !header.isPlaceholder}
                  <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#if table.getRowModel().rows?.length}
          {#each table.getRowModel().rows as row}
            <Table.Row data-state={row.getIsSelected() && 'selected'}>
              {#each row.getVisibleCells() as cell}
                <Table.Cell>
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns(payeesState, onView, onEdit, onDelete, onViewAnalytics).length} class="h-24 text-center">
              No payees found.
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination -->
  <DataTablePagination {table} />
</div>
