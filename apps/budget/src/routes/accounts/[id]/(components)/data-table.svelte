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
import {createSvelteTable, FlexRender} from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import type {TransactionsFormat} from '$lib/types';
import {DataTablePagination, DataTableToolbar} from '.';
import {filtering, filters, setFiltering, setGlobalFilter} from '../(data)/filters.svelte';
import {pagination, setPagination} from '../(data)/pagination.svelte';
import {selection, setSelection} from '../(data)/selection.svelte';
import {setSorting, sorting} from '../(data)/sorts.svelte';
import {visibility, setVisibility} from '../(data)/visibility.svelte';
import {grouping, setGrouping} from '../(data)/groups.svelte';
import {expanded, setExpanded} from '../(data)/expanded.svelte';
import {pinning, setPinning} from '../(data)/pinning.svelte';
import type {View} from '$lib/schema';
import {CurrentViewState} from '$lib/states/views';
import {page} from '$app/state';
import {setContext} from 'svelte';
import {currentViews, CurrentViewsState} from '$lib/states/views';
import {DateFiltersState} from '$lib/states/ui/date-filters.svelte';
import type {FacetedFilterOption} from '$lib/types';
import {dayFmt} from '$lib/utils/date-formatters';
import {parseDate, getLocalTimeZone} from '@internationalized/date';

interface Props {
  columns: ColumnDef<TransactionsFormat, TValue>[];
  transactions?: TransactionsFormat[];
  views?: View[];
  table?: TTable<TransactionsFormat>;
  serverPagination?: { page: number; pageSize: number; totalCount?: number; totalPages?: number; };
  updatePagination?: (pageIndex: number, pageSize: number) => void;
  budgetCount?: number;
}

let {columns, transactions, views, table = $bindable(), serverPagination, updatePagination, budgetCount = 0}: Props = $props();

// Generate date filters from actual transaction dates (excluding future scheduled transactions)
const generateDateFilters = (transactions: TransactionsFormat[]): FacetedFilterOption[] => {
  if (!transactions || transactions.length === 0) return [];

  // Include all transactions except future scheduled ones
  // This includes cleared/pending transactions and auto-created scheduled transactions that have already occurred
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  const relevantTransactions = transactions.filter(t => {
    // Include all non-scheduled transactions
    if (t.status !== 'scheduled') return true;

    // For scheduled transactions, only include those that are in the past or today
    if (t.date) {
      const transactionDate = new Date(t.date.toString());
      return transactionDate <= today;
    }

    return false;
  });

  const uniqueDates = new Set<string>();
  relevantTransactions.forEach(transaction => {
    if (transaction.date) {
      const dateStr = transaction.date.toString();
      uniqueDates.add(dateStr);
    }
  });

  return Array.from(uniqueDates).map(dateStr => {
    const count = relevantTransactions.filter(t => t.date?.toString() === dateStr).length;
    return {
      value: dateStr,
      label: dayFmt.format(parseDate(dateStr).toDate(getLocalTimeZone())),
      count
    };
  });
};

// Initialize DateFiltersState synchronously to ensure context is available for child components
// Start with empty filters, then populate reactively to avoid initial value capture issues
const dateFiltersState = new DateFiltersState([]);

// Reactively update dateFilters when transactions change
$effect(() => {
  const dateFilters = generateDateFilters(transactions ?? []);
  dateFiltersState.dateFilters = dateFilters;
});

const allDates = $derived(dateFiltersState?.dateFilters);

// Sync client pagination with server pagination when it changes
$effect(() => {
  if (serverPagination && serverPagination.page !== undefined && serverPagination.pageSize !== undefined) {
    const currentPag = pagination();
    const serverPageIndex = serverPagination.page;
    const serverPageSize = serverPagination.pageSize;

    // Only update if there's a mismatch
    if (currentPag.pageIndex !== serverPageIndex || currentPag.pageSize !== serverPageSize) {
      setPagination({
        pageIndex: serverPageIndex,
        pageSize: serverPageSize
      });
    }
  }
});

// Intercept visibility state to hide balance column when sorting by columns
// other than id or date, and hide budget column when no budgets exist.
const columnVisibility = () => {
  let visibleColumns = visibility();
  const sortingState = sorting();
  const firstSort = sortingState[0];

  // Hide balance column when sorting by columns other than id or date
  if (sortingState.length > 0 && firstSort && firstSort.id !== 'id' && firstSort.id !== 'date') {
    visibleColumns = Object.assign({}, visibleColumns, {balance: false});
  }

  // Hide budget column by default if no budgets exist
  if (budgetCount === 0 && !('budget' in visibleColumns)) {
    visibleColumns = Object.assign({}, visibleColumns, {budget: false});
  }

  return visibleColumns;
};

// Custom pagination handler that updates both local state and server state
const handlePaginationChange = (updater: any) => {
  const currentPag = pagination();

  // Apply the update to get the new state
  const newPagination = typeof updater === 'function' ? updater(currentPag) : updater;

  // Update local state
  setPagination(newPagination);

  // Call the server update callback if provided
  if (updatePagination) {
    updatePagination(newPagination.pageIndex, newPagination.pageSize);
  }
};

table = createSvelteTable<TransactionsFormat>({
  get data() {
    return transactions || [];
  },
  getRowId: (row) => String(row.id),
  state: {
    get sorting() {
      return sorting();
    },
    get columnVisibility() {
      return columnVisibility();
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
  onPaginationChange: handlePaginationChange,
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
  getFacetedUniqueValues: (table: TTable<TransactionsFormat>, columnId: string) => () => {
    const rows = table.getGlobalFacetedRowModel().flatRows;
    if (columnId === 'date') {
      const newmap = new Map();
      const column = table.getColumn(columnId);
      const filterFn = column?.getFilterFn();

      for (const {value: date} of allDates || []) {
        let count = 0;
        for (const row of rows) {
          // Use the exact same filter function that TanStack Table uses
          if (filterFn) {
            const matches = filterFn(row, columnId, new Set([date.toString()]), () => {});
            if (matches) {
              count++;
            }
          }
        }
        if (count > 0) {
          newmap.set(date.toString(), count);
        }
      }

      return newmap;
    }

    return getFacetedUniqueValues<TransactionsFormat>()(table, columnId)();
  },
  // globalFilterFn: fuzzyFilter,
  filterFns: {...filters},
  groupedColumnMode: 'reorder',
  autoResetPageIndex: false,
  autoResetExpanded: false,
});

const viewList = $derived(views || page.data['views'] || []);

// Initialize current views state immediately to avoid context timing issues
let currentViewsStateValue = new CurrentViewsState<TransactionsFormat>(null);

// Set the context immediately so child components can access it
setContext('current_views', currentViewsStateValue);
currentViews.set(currentViewsStateValue);

// Update current views state when viewList changes
$effect(() => {
  const _currentViewStates: CurrentViewState<TransactionsFormat>[] = viewList.map(
    (view: View) => new CurrentViewState<TransactionsFormat>(view, table)
  );

  // Clear existing views and add new ones
  currentViewsStateValue.viewsStates.clear();
  _currentViewStates.forEach((viewState) => {
    currentViewsStateValue.viewsStates.set(viewState.view.id, viewState);
  });

  // Set the active view to the first view
  if (_currentViewStates.length > 0) {
    currentViewsStateValue.activeViewId = _currentViewStates[0]!.view.id;
  }
});
</script>

<div class="space-y-4">
  <DataTableToolbar {table} />
  <div class="w-full rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head colspan={header.colSpan}>
                {#if !header.isPlaceholder && header.column.columnDef.header}
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
        {#each table.getRowModel().rows as row (row.id)}
          <Table.Row data-state={row.getIsSelected() && 'selected'}>
            {#each row.getVisibleCells() as cell (cell.id)}
              {#if cell.getIsAggregated() && cell.column.columnDef.aggregatedCell}
                <Table.Cell>
                  <FlexRender
                    content={cell.column.columnDef.aggregatedCell}
                    context={cell.getContext()} />
                </Table.Cell>
              {:else if cell.getIsPlaceholder()}
                <Table.Cell></Table.Cell>
              {:else if cell.column.columnDef.cell}
                <Table.Cell>
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                </Table.Cell>
              {:else}
                <Table.Cell></Table.Cell>
              {/if}
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center">No results.</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
  <DataTablePagination {table} />
</div>
