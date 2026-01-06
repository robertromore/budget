<script lang="ts" generics="TData">
import { FlexRender } from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import { cn } from '$lib/utils';
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ExpandedState,
  GroupingState,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  Table as TableInstance,
  VisibilityState,
} from '@tanstack/table-core';
import type { Snippet } from 'svelte';
import { createTableState, type TableState } from '../state/create-table-state.svelte';
import type { DataTableFeatures, TableUISettings } from '../state/types';
import DataTableColumnHeader from './data-table-column-header.svelte';
import DataTablePagination from './data-table-pagination.svelte';
import DataTable from './data-table.svelte';

interface Props {
  /** The data to display in the table */
  data: TData[];
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Feature flags for enabling/disabling features */
  features?: DataTableFeatures;
  /** UI settings for table appearance */
  uiSettings?: TableUISettings;
  /** CSS class for the table wrapper */
  class?: string;
  /** Whether to enable server-side pagination */
  serverPagination?: boolean;
  /** Total row count for server-side pagination */
  rowCount?: number;
  /** Show pagination controls */
  showPagination?: boolean;
  /** Show row selection count */
  showSelection?: boolean;
  /** Enable column headers with sorting/filtering */
  enableHeaders?: boolean;
  /** Available page sizes */
  pageSizeOptions?: number[];
  /** Custom filter functions registry */
  filterFns?: Record<string, any>;
  /** Optional row ID getter */
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;
  /** Optional toolbar snippet that receives the table instance */
  toolbar?: Snippet<[TableInstance<TData>]>;
  /** Optional footer snippet for bulk actions, receives the table instance */
  footer?: Snippet<[TableInstance<TData>]>;
  /** Show border around table */
  showBorder?: boolean;
  /** Whether the table is in a loading state */
  loading?: boolean;
  /** Custom empty state message or snippet */
  emptyMessage?: string;
  /** Custom empty state snippet */
  empty?: Snippet;
  /** Row click handler */
  onRowClick?: (row: Row<TData>) => void;
  /** Bindable table instance */
  table?: TableInstance<TData> | undefined;
  /** Bindable state object for external access */
  state?: TableState;
  // Initial state values
  /** Initial sorting state */
  initialSorting?: SortingState;
  /** Initial pagination state */
  initialPagination?: PaginationState;
  /** Initial column visibility state */
  initialColumnVisibility?: VisibilityState;
  /** Initial column filters state */
  initialColumnFilters?: ColumnFiltersState;
  /** Initial row selection state */
  initialRowSelection?: RowSelectionState;
  /** Initial column pinning state */
  initialColumnPinning?: ColumnPinningState;
  /** Initial expanded state */
  initialExpanded?: ExpandedState;
  /** Initial grouping state */
  initialGrouping?: GroupingState;
  /** Initial global filter state */
  initialGlobalFilter?: string;
  /** Initial column order state */
  initialColumnOrder?: ColumnOrderState;
}

let {
  data = [],
  columns = [],
  features = {},
  uiSettings = {},
  class: className,
  serverPagination = false,
  rowCount,
  showPagination = true,
  showSelection = true,
  enableHeaders = true,
  pageSizeOptions = [10, 20, 25, 30, 40, 50, 100],
  filterFns = {},
  getRowId,
  toolbar,
  footer,
  showBorder = true,
  loading = false,
  emptyMessage = 'No results.',
  empty,
  onRowClick,
  table = $bindable(),
  state = $bindable(),
  // Initial state values
  initialSorting,
  initialPagination,
  initialColumnVisibility,
  initialColumnFilters,
  initialRowSelection,
  initialColumnPinning,
  initialExpanded,
  initialGrouping,
  initialGlobalFilter,
  initialColumnOrder,
}: Props = $props();

// Compute initial visibility from columns with hiddenByDefault meta
function computeInitialVisibility(): VisibilityState {
  const hiddenByDefaultCols: VisibilityState = {};
  for (const col of columns) {
    const colId = col.id ?? (col as any).accessorKey;
    if (colId && (col.meta as any)?.hiddenByDefault) {
      hiddenByDefaultCols[colId] = false;
    }
  }
  // Merge with explicitly provided initialColumnVisibility (explicit takes precedence)
  return { ...hiddenByDefaultCols, ...initialColumnVisibility };
}

// Create table state once on mount using the factory
const tableState = createTableState({
  initialSorting,
  initialPagination,
  initialColumnVisibility: computeInitialVisibility(),
  initialColumnFilters,
  initialRowSelection,
  initialColumnPinning,
  initialExpanded,
  initialGrouping,
  initialGlobalFilter,
  initialColumnOrder,
});

// Expose state for external access
state = tableState;

// Auto-enable pagination feature when showPagination is true
const effectiveFeatures = $derived<DataTableFeatures>({
  ...features,
  ...(showPagination && { pagination: true }),
});
</script>

<div class="space-y-4">
  <DataTable
    {data}
    {columns}
    state={tableState}
    features={effectiveFeatures}
    {uiSettings}
    {serverPagination}
    {rowCount}
    {filterFns}
    {getRowId}
    class={className}
    bind:table>
    {#snippet children(tableInstance)}
      <div class="space-y-3">
        <!-- Render toolbar if provided -->
        {#if toolbar}
          {@render toolbar(tableInstance)}
        {/if}

        <!-- Render footer/bulk actions if provided (above table) -->
        {#if footer}
          {@render footer(tableInstance)}
        {/if}

        <div class={showBorder ? 'rounded-md border' : ''}>
          <Table.Root>
            <Table.Header>
              {#each tableInstance.getHeaderGroups() as headerGroup (headerGroup.id)}
                <Table.Row>
                  {#each headerGroup.headers as header (header.id)}
                    <Table.Head class={header.column.columnDef.meta?.headerClass}>
                      {#if !header.isPlaceholder}
                        {#if enableHeaders && typeof header.column.columnDef.header === 'string' && (header.column.getCanSort() || header.column.getCanHide() || header.column.getCanPin())}
                          <DataTableColumnHeader
                            column={header.column}
                            table={tableInstance}
                            title={header.column.columnDef.header} />
                        {:else if header.column.columnDef.header}
                          <FlexRender
                            content={header.column.columnDef.header}
                            context={header.getContext()} />
                        {/if}
                      {/if}
                    </Table.Head>
                  {/each}
                </Table.Row>
              {/each}
            </Table.Header>
            <Table.Body>
              {#if loading}
                <Table.Row>
                  <Table.Cell colspan={columns.length} class="h-24 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <div
                        class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                      ></div>
                      <span class="text-muted-foreground">Loading...</span>
                    </div>
                  </Table.Cell>
                </Table.Row>
              {:else if tableInstance.getRowModel().rows?.length}
                {#each tableInstance.getRowModel().rows as row (row.id)}
                  <Table.Row
                    data-state={row.getIsSelected() && 'selected'}
                    class={cn(onRowClick && 'cursor-pointer')}
                    onclick={() => onRowClick?.(row)}>
                    {#each row.getVisibleCells() as cell (cell.id)}
                      <Table.Cell class={cell.column.columnDef.meta?.cellClass}>
                        {#if cell.column.columnDef.cell}
                          <FlexRender
                            content={cell.column.columnDef.cell}
                            context={cell.getContext()} />
                        {/if}
                      </Table.Cell>
                    {/each}
                  </Table.Row>
                {/each}
              {:else}
                <Table.Row>
                  <Table.Cell colspan={columns.length} class="h-24 text-center">
                    {#if empty}
                      {@render empty()}
                    {:else}
                      <span class="text-muted-foreground">{emptyMessage}</span>
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {/if}
            </Table.Body>
          </Table.Root>
        </div>
        {#if showPagination}
          <DataTablePagination table={tableInstance} {showSelection} {pageSizeOptions} />
        {/if}
      </div>
    {/snippet}
  </DataTable>
</div>
