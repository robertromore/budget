<script lang="ts">
import type { ColumnDef, ColumnFiltersState, Table as TTable } from '@tanstack/table-core';
import type { Payee } from '$lib/schema';
import {
  AdvancedDataTable,
  GenericDisplayInput,
  GenericFilterInput
} from '$lib/components/data-table';
import type { FilterInputOption } from '$lib/types';
import PayeeBulkActions from './payee-bulk-actions.svelte';

interface Props {
  columns: ColumnDef<Payee>[];
  payees: Payee[];
  onBulkDelete: (payees: Payee[]) => void;
  table?: TTable<Payee> | undefined;
}

let { columns, payees, onBulkDelete, table = $bindable() }: Props = $props();

// Column filters state (managed locally)
let columnFilters = $state<ColumnFiltersState>([]);

// Extract available filters from columns that have facetedFilter meta
function getAvailableFilters(tableInstance: TTable<Payee>) {
  return tableInstance
    .getAllColumns()
    .filter((column) => column.columnDef.meta?.facetedFilter)
    .map((column) => column.columnDef.meta!.facetedFilter!(column) as FilterInputOption);
}
</script>

<AdvancedDataTable
  data={payees}
  {columns}
  features={{
    sorting: true,
    filtering: true,
    pagination: true,
    rowSelection: true,
    columnVisibility: true
  }}
  showPagination={true}
  pageSizeOptions={[10, 25, 50, 100]}
  emptyMessage="No payees found."
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
    <PayeeBulkActions
      table={tableInstance}
      allPayees={payees}
      {onBulkDelete} />
  {/snippet}
</AdvancedDataTable>
