<script lang="ts" generics="TValue">
import {
  type ColumnDef,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Table as TTable,
} from '@tanstack/table-core';
import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import type { ExpenseFormat } from '../(data)/columns.svelte';
import ExpenseTableToolbar from './expense-table-toolbar.svelte';
import ExpenseTablePagination from './expense-table-pagination.svelte';
import ExpenseBulkActions from './expense-bulk-actions.svelte';
import { filtering, filters, setFiltering, setGlobalFilter } from '../(data)/filters.svelte';
import { pagination, setPagination } from '../(data)/pagination.svelte';
import { selection, setSelection } from '../(data)/selection.svelte';
import { setSorting, sorting } from '../(data)/sorts.svelte';
import { visibility, setVisibility } from '../(data)/visibility.svelte';
import { grouping, setGrouping } from '../(data)/groups.svelte';
import { expanded, setExpanded } from '../(data)/expanded.svelte';
import { pinning, setPinning } from '../(data)/pinning.svelte';

interface Props {
  columns: ColumnDef<ExpenseFormat, TValue>[];
  expenses?: ExpenseFormat[];
  table?: TTable<ExpenseFormat>;
  onBulkDelete?: (expenses: ExpenseFormat[]) => void;
}

let { columns, expenses, table = $bindable(), onBulkDelete }: Props = $props();

table = createSvelteTable<ExpenseFormat>({
  get data() {
    return expenses || [];
  },
  getRowId: (row) => String(row.id),
  state: {
    get sorting() {
      return sorting();
    },
    get columnVisibility() {
      return visibility();
    },
    get rowSelection() {
      return selection();
    },
    get columnFilters() {
      return filtering();
    },
    get pagination() {
      return pagination();
    },
    get grouping() {
      return grouping();
    },
    get expanded() {
      return expanded();
    },
    get columnPinning() {
      return pinning();
    },
  },
  columns,
  enableRowSelection: true,
  onRowSelectionChange: setSelection,
  onSortingChange: setSorting,
  onColumnFiltersChange: setFiltering,
  onColumnVisibilityChange: setVisibility,
  onPaginationChange: setPagination,
  onGlobalFilterChange: setGlobalFilter,
  onGroupingChange: setGrouping,
  onExpandedChange: setExpanded,
  onColumnPinningChange: setPinning,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getGroupedRowModel: getGroupedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues<ExpenseFormat>(),
  filterFns: { ...filters },
  groupedColumnMode: 'reorder',
  autoResetPageIndex: false,
  autoResetExpanded: false,
});

const selectedExpenses = $derived(table.getSelectedRowModel().flatRows.map((row) => row.original));
</script>

<div class="space-y-4">
  <ExpenseTableToolbar {table} />
  <ExpenseBulkActions
    expenses={selectedExpenses}
    onBulkDelete={() => {
      if (onBulkDelete) {
        onBulkDelete(selectedExpenses);
      }
    }} />
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup}
          <Table.Row>
            {#each headerGroup.headers as header}
              <Table.Head>
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()} />
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
                  {#if cell.getIsAggregated()}
                    <FlexRender
                      content={cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell}
                      context={cell.getContext()} />
                  {:else if cell.getIsPlaceholder()}
                    <!-- Nothing to render for placeholder -->
                  {:else}
                    <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                  {/if}
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colSpan={columns.length} class="h-24 text-center">
              No expenses found.
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>
  <ExpenseTablePagination {table} />
</div>
