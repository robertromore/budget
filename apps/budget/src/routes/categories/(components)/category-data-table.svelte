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
import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import type { Category } from '$lib/schema';
import type { CategoriesState } from '$lib/states/entities/categories.svelte';
import DataTablePagination from '../../accounts/[slug]/(components)/data-table-pagination.svelte';
import CategoryBulkActions from './category-bulk-actions.svelte';

interface Props {
  columns: (
    categoriesState: CategoriesState,
    onView: (category: Category) => void,
    onEdit: (category: Category) => void,
    onDelete: (category: Category) => void,
    onViewAnalytics: (category: Category) => void
  ) => ColumnDef<Category>[];
  categories: Category[];
  categoriesState: CategoriesState;
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onViewAnalytics: (category: Category) => void;
  onBulkDelete: (categories: Category[]) => void;
  table?: TTable<Category>;
}

let {
  columns,
  categories,
  categoriesState,
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
    return categories;
  },
  get columns() {
    return columns(categoriesState, onView, onEdit, onDelete, onViewAnalytics);
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
  <CategoryBulkActions {table} allCategories={categories} {onBulkDelete} />

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
            <Table.Cell colspan={columns(categoriesState, onView, onEdit, onDelete, onViewAnalytics).length} class="h-24 text-center">
              No categories found.
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination -->
  <DataTablePagination {table} />
</div>
