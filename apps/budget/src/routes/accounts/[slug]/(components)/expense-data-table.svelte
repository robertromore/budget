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
import {columnOrder, setColumnOrder} from '../(data)/column-order.svelte';
import {currentViews, CurrentViewsState, CurrentViewState} from '$lib/states/views';
import type {View} from '$lib/schema';
import {DateFiltersState} from '$lib/states/ui/date-filters.svelte';
import type {FacetedFilterOption} from '$lib/types';
import {dayFmt} from '$lib/utils/date-formatters';
import {parseDate} from '@internationalized/date';
import {timezone} from '$lib/utils/dates';
import {untrack} from 'svelte';

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
    get columnOrder() {
      return columnOrder();
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
  onColumnOrderChange: setColumnOrder,
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

// Set context using runed Context API (not Svelte's setContext)
// This makes the context available to child components via currentViews.get()
// Type assertion needed because currentViews is typed for TransactionsFormat
currentViews.set(currentViewsStateValue as any);

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

// Sync local state when active view changes
$effect(() => {
  const activeView = currentViewsStateValue.activeView;
  if (!activeView) return;

  // Use untrack to prevent this effect from depending on table state
  // We only want this to run when the active VIEW changes, not when table state changes
  untrack(() => {
    // Sync local state from the active view's display settings
    const viewColumnOrder = activeView.view.getColumnOrder();
    const viewPinning = activeView.view.getPinning();
    const viewSorting = activeView.view.getSorting();
    const viewGrouping = activeView.view.getGrouping();
    const viewExpanded = activeView.view.getExpanded();
    const viewVisibility = activeView.view.getVisibility();

    // Only update if different to avoid unnecessary state changes
    if (JSON.stringify(viewColumnOrder) !== JSON.stringify(columnOrder())) {
      setColumnOrder(viewColumnOrder);
    }
    if (JSON.stringify(viewPinning) !== JSON.stringify(pinning())) {
      setPinning(viewPinning);
    }
    if (JSON.stringify(viewSorting) !== JSON.stringify(sorting())) {
      setSorting(viewSorting);
    }
    if (JSON.stringify(viewGrouping) !== JSON.stringify(grouping())) {
      setGrouping(viewGrouping);
    }
    if (JSON.stringify(viewExpanded) !== JSON.stringify(expanded())) {
      setExpanded(viewExpanded);
    }
    if (JSON.stringify(viewVisibility) !== JSON.stringify(visibility())) {
      setVisibility(viewVisibility);
    }
  });
});

// Get density from current view
const density = $derived(currentViewsStateValue?.activeView?.view.getDensity() ?? 'normal');
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
              <Table.Head colspan={header.colSpan} {density}>
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
          <Table.Row data-state={row.getIsSelected() && 'selected'} class="data-[state=selected]:border-l-4 data-[state=selected]:border-l-primary">
            {#each row.getVisibleCells() as cell (cell.id)}
              {#if cell.getIsAggregated() && cell.column.columnDef.aggregatedCell}
                <Table.Cell {density}>
                  <FlexRender
                    content={cell.column.columnDef.aggregatedCell}
                    context={cell.getContext()} />
                </Table.Cell>
              {:else if cell.getIsPlaceholder()}
                <Table.Cell {density}></Table.Cell>
              {:else if cell.column.columnDef.cell}
                <Table.Cell {density}>
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                </Table.Cell>
              {:else}
                <Table.Cell {density}></Table.Cell>
              {/if}
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center" {density}>No results.</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
  <ExpenseTablePagination {table} />
</div>
