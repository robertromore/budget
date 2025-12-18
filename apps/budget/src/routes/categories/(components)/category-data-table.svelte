<script lang="ts">
import {
  AdvancedDataTable,
  GenericDisplayInput,
  GenericFilterInput
} from '$lib/components/data-table';
import EntityBulkActions from '$lib/components/shared/data-table/entity-bulk-actions.svelte';
import type { Category } from '$lib/schema';
import type { CategoryWithGroup } from '$lib/server/domains/categories/repository';
import type { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { FilterInputOption } from '$lib/types';
import type { ColumnDef, ColumnFiltersState, Table as TTable } from '@tanstack/table-core';

interface Props {
  columns: (
    categoriesState: CategoriesState,
    onView: (category: Category) => void,
    onEdit: (category: Category) => void,
    onDelete: (category: Category) => void,
    onViewAnalytics: (category: Category) => void
  ) => ColumnDef<CategoryWithGroup>[];
  categories: CategoryWithGroup[];
  categoriesState: CategoriesState;
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onViewAnalytics: (category: Category) => void;
  onBulkDelete: (categories: Category[]) => void;
  loading?: boolean;
  table?: TTable<CategoryWithGroup>;
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
  loading = false,
  table = $bindable()
}: Props = $props();

// Create columns with handlers
const tableColumns = $derived(columns(categoriesState, onView, onEdit, onDelete, onViewAnalytics));

// Column filters state (managed locally)
let columnFilters = $state<ColumnFiltersState>([]);

// Extract available filters from columns that have facetedFilter meta
function getAvailableFilters(tableInstance: TTable<CategoryWithGroup>) {
  return tableInstance
    .getAllColumns()
    .filter((column) => column.columnDef.meta?.facetedFilter)
    .map((column) => column.columnDef.meta?.facetedFilter(column) as FilterInputOption);
}
</script>

<AdvancedDataTable
  data={categories}
  columns={tableColumns}
  features={{
    sorting: true,
    filtering: true,
    pagination: true,
    rowSelection: true,
    columnVisibility: true
  }}
  showPagination={true}
  pageSizeOptions={[10, 25, 50, 100]}
  emptyMessage="No categories found."
  {loading}
  bind:table>
  {#snippet toolbar(tableInstance)}
    {@const availableFilters = getAvailableFilters(tableInstance)}
    <div class="flex items-center justify-between gap-2">
      <GenericFilterInput
        table={tableInstance}
        {availableFilters}
        {columnFilters}
        onColumnFiltersChange={(filters) => {
          columnFilters = filters;
          tableInstance.setColumnFilters(filters);
        }} />
      <GenericDisplayInput
        table={tableInstance}
        sorting={tableInstance.getState().sorting}
        onSortingChange={(sorting) => tableInstance.setSorting(sorting)}
        columnVisibility={tableInstance.getState().columnVisibility}
        onVisibilityChange={(visibility) => tableInstance.setColumnVisibility(visibility)}
        columnOrder={tableInstance.getState().columnOrder}
        onColumnOrderChange={(order) => tableInstance.setColumnOrder(order)}
        pageSize={tableInstance.getState().pagination.pageSize}
        onPageSizeChange={(size) => tableInstance.setPageSize(size)} />
    </div>
  {/snippet}
  {#snippet footer(tableInstance)}
    <EntityBulkActions
      table={tableInstance}
      allEntities={categories}
      {onBulkDelete}
      entityName="category"
      entityNamePlural="categories" />
  {/snippet}
</AdvancedDataTable>
