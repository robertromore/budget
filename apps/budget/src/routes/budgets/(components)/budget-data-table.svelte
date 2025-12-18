<script lang="ts">
import {
  AdvancedDataTable,
  GenericDisplayInput,
  GenericFilterInput
} from '$lib/components/data-table';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import type { FilterInputOption } from '$lib/types';
import type { ColumnDef, ColumnFiltersState, Table as TTable } from '@tanstack/table-core';
import BudgetBulkActions from './budget-bulk-actions.svelte';

interface Props {
  columns: ColumnDef<BudgetWithRelations>[];
  budgets: BudgetWithRelations[];
  onBulkDelete: (budgets: BudgetWithRelations[]) => void;
  onBulkArchive: (budgets: BudgetWithRelations[]) => void;
  table?: TTable<BudgetWithRelations> | undefined;
}

let { columns, budgets, onBulkDelete, onBulkArchive, table = $bindable() }: Props = $props();

// Column filters state (managed locally)
let columnFilters = $state<ColumnFiltersState>([]);

// Extract available filters from columns that have facetedFilter meta
function getAvailableFilters(tableInstance: TTable<BudgetWithRelations>) {
  return tableInstance
    .getAllColumns()
    .filter((column) => column.columnDef.meta?.facetedFilter)
    .map((column) => column.columnDef.meta?.facetedFilter(column) as FilterInputOption);
}
</script>

<AdvancedDataTable
  data={budgets}
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
  emptyMessage="No budgets found."
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
    <BudgetBulkActions
      table={tableInstance}
      allBudgets={budgets}
      {onBulkDelete}
      {onBulkArchive} />
  {/snippet}
</AdvancedDataTable>
