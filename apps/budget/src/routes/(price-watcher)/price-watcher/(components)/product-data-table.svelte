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
import ProductBulkActions from './product-bulk-actions.svelte';

interface Props {
  products: PriceProduct[];
}

let { products }: Props = $props();

const columns = getProductColumns();
let columnFilters = $state<ColumnFiltersState>([]);
let tableInstance = $state<TTable<PriceProduct> | undefined>(undefined);

function getAvailableFilters(table: TTable<PriceProduct>) {
  return table
    .getAllColumns()
    .filter((column) => column.columnDef.meta?.facetedFilter)
    .map((column) => column.columnDef.meta!.facetedFilter!(column) as FilterInputOption);
}

function handleRowClick(row: Row<PriceProduct>) {
  goto(`/price-watcher/products/${row.original.slug}`);
}
</script>

<div class="space-y-2">
  <AdvancedDataTable
    data={products}
    {columns}
    features={{
      sorting: true,
      filtering: true,
      pagination: true,
      columnVisibility: true,
      rowSelection: true,
    }}
    filterFns={productFilterFns}
    showPagination={products.length > 10}
    pageSizeOptions={[10, 25, 50]}
    emptyMessage="No products found."
    onRowClick={handleRowClick}
    getRowId={(row) => String(row.id)}
    bind:table={tableInstance}>
    {#snippet toolbar(table)}
      {@const availableFilters = getAvailableFilters(table)}
      <div class="flex items-center justify-between gap-2">
        <GenericFilterInput
          {table}
          {availableFilters}
          {columnFilters}
          onColumnFiltersChange={(filters) => {
            columnFilters = filters;
            table.setColumnFilters(filters);
          }} />
        <GenericDisplayInput
          {table}
          sorting={table.getState().sorting}
          onSortingChange={(sorting) => table.setSorting(sorting)}
          columnVisibility={table.getState().columnVisibility}
          onVisibilityChange={(visibility) => table.setColumnVisibility(visibility)}
          columnOrder={table.getState().columnOrder}
          onColumnOrderChange={(order) => table.setColumnOrder(order)}
          pageSize={table.getState().pagination.pageSize}
          onPageSizeChange={(size) => table.setPageSize(size)} />
      </div>
    {/snippet}
  </AdvancedDataTable>

  {#if tableInstance}
    <ProductBulkActions table={tableInstance} allProducts={products} />
  {/if}
</div>
