<script lang="ts" generics="TValue">
  import {
    type ColumnDef,
    type ColumnFiltersState,
    type PaginationState,
    type RowSelectionState,
    type SortingState,
    type VisibilityState,
    type Updater,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type FilterFn,
    type Row,
    type Table as TTable
  } from "@tanstack/table-core";
  import { createSvelteTable, FlexRender } from "$lib/components/ui/data-table";
  import * as Table from "$lib/components/ui/table";
  import type { TransactionsFormat } from '$lib/types';
  import { DataTablePagination, DataTableToolbar } from ".";
  import { rankItem, type RankItemOptions } from "@tanstack/match-sorter-utils";
  import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";

  let {
    columns,
    transactions,
    table = $bindable()
  }: {
    columns: ColumnDef<TransactionsFormat, TValue>[];
    transactions?: TransactionsFormat[];
    table?: TTable<TransactionsFormat>;
  } = $props();

  let filtering = $state<ColumnFiltersState>([]);
  function setFiltering(updater: Updater<ColumnFiltersState>) {
    if (updater instanceof Function) {
      filtering = updater(filtering);
    } else filtering = updater;
  }

  let globalFilter = $state('');
  function setGlobalFilter(updater: Updater<string>) {
    if (updater instanceof Function) {
      globalFilter = updater(globalFilter);
    } else globalFilter = updater;
  }
  // const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  //   const opts: RankItemOptions = {
  //     accessors: undefined
  //   };
  //   if (columnId === 'payee') {
  //     opts.accessors = [
  //       (item) => {
  //         return `${$state.snapshot(payees.get().payees?.find((payee) => payee.id === item))?.name}`;
  //       }
  //     ];
  //   }
  //   if (columnId === 'category') {
  //     opts.accessors = [
  //       (item) => {
  //         return `${
  //           $state.snapshot(categories.get().categories?.find((category) => category.id === item))?.name
  //         }`;
  //       }
  //     ];
  //   }

  //   // Rank the item
  //   const itemRank = rankItem(row.getValue(columnId), value, opts);

  //   // Store the itemRank info
  //   addMeta({ itemRank });

  //   // Return if the item should be filtered in/out
  //   return itemRank.passed;
  // };

  const filters = {
    entityIsFilter: (
      row: Row<TransactionsFormat>,
      columnId: string,
      filterValue: string[] | number[],
      addMeta: (meta: any) => void
    ) => {
      type validType = { [key: string]: any };
      return filterValue.some(
        (el: number | string) =>
          parseInt(el as string) === (row.original as validType)[columnId + 'Id']
      );
    },
    entityIsNotFilter: (
      row: Row<TransactionsFormat>,
      columnId: string,
      filterValue: string[] | number[],
      addMeta: (meta: any) => void
    ) => {
      type validType = { [key: string]: any };
      return !filterValue.some(
        (el: number | string) =>
          parseInt(el as string) === (row.original as validType)[columnId + 'Id']
      );
    },
    dateBefore: (
      row: Row<TransactionsFormat>,
      columnId: string,
      filterValue: string[],
      addMeta: (meta: any) => void
    ) => {
      return (row.original.date?.compare(parseDate(filterValue[0])) || 0) < 0;
    },
    dateAfter: (
      row: Row<TransactionsFormat>,
      columnId: string,
      filterValue: string[],
      addMeta: (meta: any) => void
    ) => {
      return (row.original.date?.compare(parseDate(filterValue[0])) || 0) > 0;
    },
    dateOn: (
      row: Row<TransactionsFormat>,
      columnId: string,
      filterValue: string[],
      addMeta: (meta: any) => void
    ) => {
      return (row.original.date?.compare(parseDate(filterValue[0])) || 0) === 0;
    },
    equalsString: (
      row: Row<TransactionsFormat>,
      columnId: string,
      filterValue: string[],
      addMeta: (meta: any) => void
    ) => {
      return row.original[columnId as keyof TransactionsFormat] == filterValue[0];
    },
    doesntEqualString: (
      row: Row<TransactionsFormat>,
      columnId: string,
      filterValue: string[],
      addMeta: (meta: any) => void
    ) => {
      return row.original[columnId as keyof TransactionsFormat] != filterValue[0];
    },
  };

  let pagination = $state<PaginationState>({
    pageIndex: 0,
    pageSize: 25
  });
  function setPagination(updater: Updater<PaginationState>) {
    if (updater instanceof Function) {
      pagination = updater(pagination);
    } else pagination = updater;
  }

  let selection = $state<RowSelectionState>({});
  function setSelection(updater: Updater<RowSelectionState>) {
    if (updater instanceof Function) {
      selection = updater(selection);
    } else selection = updater;
  }

  let sorting = $state<SortingState>([
    {
      id: 'id',
      desc: true
    }
  ]);
  function setSorting(updater: Updater<SortingState>) {
    if (updater instanceof Function) {
      sorting = updater(sorting);
    } else sorting = updater;
  }

  let visibility = $state<VisibilityState>({});
  function setVisibility(updater: Updater<VisibilityState>) {
    if (updater instanceof Function) {
      visibility = updater(visibility);
    } else visibility = updater;
  }

  table = createSvelteTable<TransactionsFormat>({
    get data() {
      return transactions || [];
    },
    state: {
      get sorting() {
        return sorting;
      },
      get columnVisibility() {
        return visibility;
      },
      get rowSelection() {
        return selection;
      },
      get columnFilters() {
        return filtering;
      },
      get pagination() {
        return pagination;
      },
    },
    initialState: {
      columnVisibility: {
        id: false
      }
    },
    columns,
    enableRowSelection: true,
    onRowSelectionChange: setSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setFiltering,
    onColumnVisibilityChange: setVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: (table: TTable<TransactionsFormat>, columnId: string) => () => {
      const rows = table.getGlobalFacetedRowModel().flatRows;
      if (columnId === 'date') {
        const newmap = new Map();
        const thisday = today(getLocalTimeZone());
        const dates = [
          thisday.subtract({ days: 1 }),
          thisday.subtract({ days: 3 }),
          thisday.subtract({ weeks: 1 }),
          thisday.subtract({ months: 1 }),
          thisday.subtract({ months: 3 }),
          thisday.subtract({ months: 6 }),
          thisday.subtract({ years: 1 })
        ];
        for (const date of dates) {
          for (const row of rows) {
            if (table.getColumn(columnId)?.getFilterFn()?.call({} as any, row, columnId, [date.toString()], () => {})) {
              newmap.set(date.toString(), (newmap.get(date.toString()) ?? 0) + 1);
            }
          }
        }
        return newmap;
      }
      // else if (columnId === 'status') {
      //   // console.log(map, rows)
      //   const newmap = new Map();
      //   map.forEach((value, key) => {
      //     newmap.set(key as string, value);
      //   });
      //   return newmap;
      // }
      const map = getFacetedUniqueValues<TransactionsFormat>()(table, columnId)();
      return map;
    },
    // globalFilterFn: fuzzyFilter,
    filterFns: {...filters}
  });
</script>

<div class="space-y-4">
  <DataTableToolbar {table} />
  <div class="rounded-md border">
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
              <Table.Cell>
                <FlexRender
                  content={cell.column.columnDef.cell}
                  context={cell.getContext()}
                />
              </Table.Cell>
            {/each}
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center">
              No results.
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
  <DataTablePagination {table} />
</div>
