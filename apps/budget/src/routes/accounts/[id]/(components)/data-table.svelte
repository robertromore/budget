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
  } from "@tanstack/table-core";
  import { createSvelteTable, FlexRender } from "$lib/data-table";
  import * as Table from "$lib/components/ui/table";
  import type { TransactionsFormat } from "$lib/types";
  import { DataTablePagination, DataTableToolbar } from ".";
  import { filtering, filters, setFiltering, setGlobalFilter } from "../(data)/filters.svelte";
  import { pagination, setPagination } from "../(data)/pagination.svelte";
  import { selection, setSelection } from "../(data)/selection.svelte";
  import { setSorting, sorting } from "../(data)/sorts.svelte";
  import { visibility, setVisibility } from "../(data)/visibility.svelte";
  import { grouping, setGrouping } from "../(data)/groups.svelte";
  import { expanded, setExpanded } from "../(data)/expanded.svelte";
  import { pinning, setPinning } from "../(data)/pinning.svelte";
  import type { View } from "$lib/schema";
  import { CurrentViewState } from "$lib/states/views";
  import { page } from "$app/state";
  import { setContext } from "svelte";
  import { currentViews, CurrentViewsState } from "$lib/states/views";
  import { DateFiltersState } from "$lib/states/ui/date-filters.svelte";

  interface Props {
    columns: ColumnDef<TransactionsFormat, TValue>[];
    transactions?: TransactionsFormat[];
    views?: View[];
    table?: TTable<TransactionsFormat>;
  }

  let {
    columns,
    transactions,
    views,
    table = $bindable()
  }: Props = $props();

  
  const dateFiltersState: DateFiltersState = DateFiltersState.get();
  const allDates = $derived(dateFiltersState?.dateFilters);

  // Intercept visibility state to hide balance column when sorting by columns
  // other than id or date.
  const columnVisibility = () => {
    let visibleColumns = visibility();
    const sortingState = sorting();
    if (sortingState.length > 0 && (sortingState[0].id !== 'id' && sortingState[0].id !== 'date')) {
      visibleColumns = Object.assign({}, visibleColumns, { balance: false });
    }
    return visibleColumns;
  };

  table = createSvelteTable<TransactionsFormat>({
    get data() {
      return transactions || [];
    },
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
    getFacetedUniqueValues: (table: TTable<TransactionsFormat>, columnId: string) => () => {
      const rows = table.getGlobalFacetedRowModel().flatRows;
      if (columnId === "date") {
        const newmap = new Map();
        for (const { value: date } of allDates || []) {
          for (const row of rows) {
            if (
              table
                .getColumn(columnId)
                ?.getFilterFn()
                ?.call({} as any, row, columnId, [date.toString()], () => {})
            ) {
              newmap.set(date.toString(), (newmap.get(date.toString()) ?? 0) + 1);
            }
          }
        }

        return newmap;
      }

      return getFacetedUniqueValues<TransactionsFormat>()(table, columnId)();
    },
    // globalFilterFn: fuzzyFilter,
    filterFns: { ...filters },
    groupedColumnMode: "reorder",
    autoResetPageIndex: false,
    autoResetExpanded: false,
  });

  const viewList = $derived(views || page.data.views || []);

  // Initialize current views state immediately to avoid context timing issues
  let currentViewsStateValue = new CurrentViewsState<TransactionsFormat>(null);
  
  // Set the context immediately so child components can access it
  setContext("current_views", currentViewsStateValue);
  currentViews.set(currentViewsStateValue);

  // Update current views state when viewList changes
  $effect(() => {
    const _currentViewStates: CurrentViewState<TransactionsFormat>[] = viewList.map(
      (view: View) => new CurrentViewState<TransactionsFormat>(view, table)
    );
    
    // Clear existing views and add new ones
    currentViewsStateValue.viewsStates.clear();
    _currentViewStates.forEach(viewState => {
      currentViewsStateValue.viewsStates.set(viewState.view.id, viewState);
    });
    
    // Set the active view to the first view
    if (_currentViewStates.length > 0) {
      currentViewsStateValue.activeViewId = _currentViewStates[0].view.id;
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
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()}
                  />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#each table.getRowModel().rows as row (row.id)}
          <Table.Row data-state={row.getIsSelected() && "selected"}>
            {#each row.getVisibleCells() as cell (cell.id)}
              {#if cell.getIsAggregated()}
                <Table.Cell>
                  <FlexRender
                    content={cell.column.columnDef.aggregatedCell}
                    context={cell.getContext()}
                  />
                </Table.Cell>
              {:else if cell.getIsPlaceholder()}
                <Table.Cell></Table.Cell>
              {:else}
                <Table.Cell>
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                </Table.Cell>
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
