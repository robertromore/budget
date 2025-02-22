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
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { filtering, filters, setFiltering, setGlobalFilter } from "../(data)/filters.svelte";
  import { pagination, setPagination } from "../(data)/pagination.svelte";
  import { selection, setSelection } from "../(data)/selection.svelte";
  import { setSorting, sorting } from "../(data)/sorts.svelte";
  import { visibility, setVisibility } from "../(data)/visibility.svelte";
  import { grouping, setGrouping } from "../(data)/groups.svelte";
  import { expanded, setExpanded } from "../(data)/expanded.svelte";
  import { pinning, setPinning } from "../(data)/pinning.svelte";
  import type { View } from "$lib/schema";
  import { CurrentViewState } from "$lib/states/current-view.svelte";
  import { page } from "$app/state";
  import { currentViews, CurrentViewsState } from "$lib/states/current-views.svelte";

  let {
    columns,
    transactions,
    table = $bindable(),
  }: {
    columns: ColumnDef<TransactionsFormat, TValue>[];
    transactions?: TransactionsFormat[];
    table?: TTable<TransactionsFormat>;
  } = $props();

  let _dateMapCache: Map<string, Map<string, string>> = new Map();

  table = createSvelteTable<TransactionsFormat>({
    get data() {
      return transactions || [];
    },
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
    initialState: {
      columnVisibility: {
        id: false,
      },
      columnPinning: {
        right: ["select-col"],
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
        // const filterFnName = table.getColumn(columnId)?.getFilterFn()?.toString();
        // if (filterFnName && _dateMapCache.has(filterFnName)) {
        //   return _dateMapCache.get(filterFnName) as Map<string, string>;
        // }

        const newmap = new Map();
        const thisday = today(getLocalTimeZone());
        const dates = [
          thisday.subtract({ days: 1 }),
          thisday.subtract({ days: 3 }),
          thisday.subtract({ weeks: 1 }),
          thisday.subtract({ months: 1 }),
          thisday.subtract({ months: 3 }),
          thisday.subtract({ months: 6 }),
          thisday.subtract({ years: 1 }),
        ];
        for (const date of dates) {
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
        // _dateMapCache.set(filterFnName!, newmap);
        return newmap;
      }

      return getFacetedUniqueValues<TransactionsFormat>()(table, columnId)();
    },
    // globalFilterFn: fuzzyFilter,
    filterFns: { ...filters },
    groupedColumnMode: "reorder",
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
