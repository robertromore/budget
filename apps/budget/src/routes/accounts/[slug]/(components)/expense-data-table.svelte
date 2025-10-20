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
import type {ExpenseFormat} from '../(data)/expense-columns.svelte';
import ExpenseTableToolbar from './expense-table-toolbar.svelte';
import ExpenseTablePagination from './expense-table-pagination.svelte';
import ExpenseBulkActions from './expense-bulk-actions.svelte';
import {filtering, filters, setFiltering, setGlobalFilter} from '../(data)/expense-filters.svelte';
import {pagination, setPagination} from '../(data)/pagination.svelte';
import {selection, setSelection} from '../(data)/selection.svelte';
import {setSorting, sorting} from '../(data)/sorts.svelte';
import {visibility, setVisibility} from '../(data)/expense-visibility.svelte';
import {grouping, setGrouping} from '../(data)/groups.svelte';
import {expanded, setExpanded} from '../(data)/expanded.svelte';
import {pinning, setPinning} from '../(data)/pinning.svelte';
import {setContext} from 'svelte';
import {currentViews, CurrentViewsState, CurrentViewState} from '$lib/states/views';
import type {View} from '$lib/schema';
import {DateFiltersState} from '$lib/states/ui/date-filters.svelte';
import type {FacetedFilterOption} from '$lib/types';
import {dayFmt} from '$lib/utils/date-formatters';
import {parseDate} from '@internationalized/date';
import {timezone} from '$lib/utils/dates';

interface Props {
  columns: ColumnDef<ExpenseFormat, TValue>[];
  expenses?: ExpenseFormat[];
  views?: View[];
  table?: TTable<ExpenseFormat>;
  onBulkDelete?: (expenses: ExpenseFormat[]) => void;
}

let {columns, expenses, views = [], table = $bindable(), onBulkDelete}: Props = $props();

// Generate date filters from actual expense dates
const generateDateFilters = (expenses: ExpenseFormat[]): FacetedFilterOption[] => {
  if (!expenses || expenses.length === 0) return [];

  const uniqueDates = new Set<string>();
  expenses.forEach(expense => {
    if (expense.date) {
      const dateStr = expense.date.toString();
      uniqueDates.add(dateStr);
    }
  });

  return Array.from(uniqueDates)
    .sort((a, b) => b.localeCompare(a)) // Sort descending (most recent first)
    .map(dateStr => {
      const count = expenses.filter(e => e.date?.toString() === dateStr).length;
      return {
        value: dateStr,
        label: dayFmt.format(parseDate(dateStr).toDate(timezone)),
        count
      };
    });
};

// Initialize DateFiltersState synchronously to ensure context is available for child components
// Start with empty filters, then populate reactively to avoid initial value capture issues
const dateFiltersState = new DateFiltersState([]);

// Reactively update dateFilters when expenses change
$effect(() => {
  const dateFilters = generateDateFilters(expenses ?? []);
  dateFiltersState.dateFilters = dateFilters;
});

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
  filterFns: {...filters},
  groupedColumnMode: 'reorder',
  autoResetPageIndex: false,
  autoResetExpanded: false,
});

const selectedExpenses = $derived(
  table
    .getSelectedRowModel()
    .flatRows.map((row) => row.original)
);

// Initialize current views state for expense table
let currentViewsStateValue = new CurrentViewsState<ExpenseFormat>(null);

// Set the context immediately so child components can access it
// Note: We use a separate context key to avoid conflicts with transaction table
setContext('current_views', currentViewsStateValue);
// Don't set the global currentViews store - let child components use context instead
// currentViews.set(currentViewsStateValue);

let viewList = $derived(views || []);
let lastViewSignature: string | null = null;
let hasAppliedInitialView = false;
let lastActiveViewId: number | undefined;

// Update current views state when viewList changes
$effect(() => {
  const signature = viewList
    .map((view: View) => {
      const sortSignature = view.display?.sort
        ?.map((sort) => `${sort.id}:${sort.desc ?? false}`)
        .join('|') ?? '';
      return `${view.id}:${sortSignature}`;
    })
    .join(';');

  if (signature !== lastViewSignature) {
    lastViewSignature = signature;
    hasAppliedInitialView = false;
  }

  const _currentViewStates: CurrentViewState<ExpenseFormat>[] = viewList.map(
    (view: View) => new CurrentViewState<ExpenseFormat>(view, table)
  );

  // Clear existing views and add new ones
  currentViewsStateValue.viewsStates.clear();
  _currentViewStates.forEach((viewState) => {
    currentViewsStateValue.viewsStates.set(viewState.view.id, viewState);
  });

  if (_currentViewStates.length === 0) {
    return;
  }

  const targetViewState = lastActiveViewId
    ? currentViewsStateValue.viewsStates.get(lastActiveViewId) ?? _currentViewStates[0]!
    : _currentViewStates[0]!;

  if (!targetViewState) {
    return;
  }

  if (!hasAppliedInitialView || lastActiveViewId !== targetViewState.view.id) {
    hasAppliedInitialView = true;
    lastActiveViewId = targetViewState.view.id;
    const targetViewId = targetViewState.view.id;
    currentViewsStateValue.activeViewId = targetViewId;
    queueMicrotask(() => {
      const latestViewState = currentViewsStateValue.viewsStates.get(targetViewId);
      if (latestViewState) {
        currentViewsStateValue.setActive(targetViewId);
      }
    });
  }
});
</script>

<div class="space-y-4">
  <ExpenseTableToolbar {table} />
  <ExpenseBulkActions expenses={selectedExpenses} onBulkDelete={() => {
    if (onBulkDelete) {
      onBulkDelete(selectedExpenses);
    }
  }} />
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
  <ExpenseTablePagination {table} />
</div>
