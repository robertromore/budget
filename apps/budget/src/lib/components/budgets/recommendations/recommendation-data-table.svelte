<script lang="ts">
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
  import {createSvelteTable, FlexRender} from '$lib/components/ui/data-table';
  import * as Table from '$lib/components/ui/table';
  import type {BudgetRecommendationWithRelations} from '$lib/schema/recommendations';
  import DataTablePagination from '$lib/components/ui/data-table/data-table-pagination.svelte';
  import RecommendationBulkActions from './recommendation-bulk-actions.svelte';

  interface Props {
    columns: ColumnDef<BudgetRecommendationWithRelations>[];
    recommendations: BudgetRecommendationWithRelations[];
    table?: TTable<BudgetRecommendationWithRelations>;
    onBulkApply: (recommendations: BudgetRecommendationWithRelations[]) => void;
    onBulkDismiss: (recommendations: BudgetRecommendationWithRelations[]) => void;
  }

  let {
    columns,
    recommendations,
    table = $bindable(),
    onBulkApply,
    onBulkDismiss,
  }: Props = $props();

  // Table state
  let sorting = $state<any[]>([{id: 'confidence', desc: true}]); // Sort by confidence by default (highest first)
  let columnFilters = $state<any[]>([]);
  let columnVisibility = $state<Record<string, boolean>>({});
  let rowSelection = $state<Record<string, boolean>>({});
  let pagination = $state({pageIndex: 0, pageSize: 25});

  // Create the table instance
  table = createSvelteTable({
    get data() {
      return recommendations;
    },
    get columns() {
      return columns;
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
  <RecommendationBulkActions {table} {onBulkApply} {onBulkDismiss} />

  <!-- Table -->
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup}
          <Table.Row>
            {#each headerGroup.headers as header}
              <Table.Head>
                {#if !header.isPlaceholder && header.column.columnDef.header}
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
                  {#if cell.column.columnDef.cell}
                    <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                  {/if}
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center">
              No recommendations found.
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination -->
  <DataTablePagination {table} />
</div>
