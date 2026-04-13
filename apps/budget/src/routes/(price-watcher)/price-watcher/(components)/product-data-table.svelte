<script lang="ts">
import { goto } from '$app/navigation';
import {
  AdvancedDataTable,
  GenericDisplayInput,
  GenericFilterInput,
} from '$lib/components/data-table';
import type { PriceProduct } from '$core/schema/price-products';
import type { FilterInputOption } from '$lib/types';
import type { ColumnFiltersState, Row, Table as TTable } from '@tanstack/table-core';
import { getProductColumns, productFilterFns } from '../(data)/product-columns';

interface Props {
  products: PriceProduct[];
}

let { products }: Props = $props();

const columns = getProductColumns();
let columnFilters = $state<ColumnFiltersState>([]);

function getAvailableFilters(tableInstance: TTable<PriceProduct>) {
  return tableInstance
    .getAllColumns()
    .filter((column) => column.columnDef.meta?.facetedFilter)
    .map((column) => column.columnDef.meta!.facetedFilter!(column) as FilterInputOption);
}

function handleRowClick(row: Row<PriceProduct>) {
  goto(`/price-watcher/products/${row.original.slug}`);
}
</script>

<AdvancedDataTable
  data={products}
  {columns}
  features={{
    sorting: true,
    filtering: true,
    pagination: true,
    columnVisibility: true,
  }}
  filterFns={productFilterFns}
  showPagination={products.length > 10}
  pageSizeOptions={[10, 25, 50]}
  emptyMessage="No products found."
  onRowClick={handleRowClick}
  getRowId={(row) => String(row.id)}>
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
</AdvancedDataTable>
