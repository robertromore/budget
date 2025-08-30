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
  import { createSvelteTable, FlexRender } from "$lib/components/ui/data-table";
  import * as Table from "$lib/components/ui/table";
  import type { TransactionsFormat } from "$lib/types";
  import { DataTablePagination, DataTableToolbar } from ".";
  import { filtering, filters, setFiltering, setGlobalFilter } from "./config/filters.svelte";
  import { pagination, setPagination } from "./config/pagination.svelte";
  import { selection, setSelection } from "./config/selection.svelte";
  import { setSorting, sorting } from "./config/sorts.svelte";
  import { visibility, setVisibility } from "./config/visibility.svelte";
  import { grouping, setGrouping } from "./config/groups.svelte";
  import { expanded, setExpanded } from "./config/expanded.svelte";
  import { pinning, setPinning } from "./config/pinning.svelte";
  import type { View } from "$lib/schema";
  import { CurrentViewState } from "$lib/stores/app/current-view.svelte";
  import { page } from "$app/state";
  import { currentViews, CurrentViewsState } from "$lib/stores/ui/current-views.svelte";
  import { DateFiltersState } from "$lib/stores/ui/date-filters.svelte";

  let {
    columns,
    transactions,
    table = $bindable(),
  }: {
    columns: ColumnDef<TransactionsFormat, TValue>[];
    transactions?: TransactionsFormat[];
    table?: TTable<TransactionsFormat>;
  } = $props();

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

  const views: View[] = page.data.views;

  const _currentViewStates: CurrentViewState<TransactionsFormat>[] = views.map(
    (view: View) => new CurrentViewState<TransactionsFormat>(view, table)
  );
  currentViews.set(new CurrentViewsState<TransactionsFormat>(_currentViewStates));
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
