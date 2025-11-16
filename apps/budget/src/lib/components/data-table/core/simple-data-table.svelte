<script lang="ts" generics="TData">
import type {ColumnDef, Table as TableInstance} from '@tanstack/table-core';
import type {Snippet} from 'svelte';
import DataTable from './data-table.svelte';
import DataTableColumnHeader from './data-table-column-header.svelte';
import DataTablePagination from './data-table-pagination.svelte';
import {FlexRender} from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import type {
  DataTableFeatures,
  DataTableState,
  DataTableStateHandlers,
  TableUISettings,
} from '../state/types';

interface Props {
  /** The data to display in the table */
  data: TData[];
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Feature flags for enabling/disabling features */
  features?: DataTableFeatures;
  /** External state (optional - will use internal state if not provided) */
  state?: DataTableState;
  /** State change handlers (required if using external state) */
  handlers?: DataTableStateHandlers;
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
  /** Optional toolbar snippet that receives the table instance */
  toolbar?: Snippet<[TableInstance<TData>]>;
  /** Show border around table */
  showBorder?: boolean;
}

let {
  data = [],
  columns = [],
  features = {},
  state,
  handlers,
  uiSettings = {},
  class: className,
  serverPagination = false,
  rowCount,
  showPagination = true,
  showSelection = true,
  enableHeaders = true,
  pageSizeOptions = [10, 20, 25, 30, 40, 50, 100],
  filterFns = {},
  toolbar,
  showBorder = true,
}: Props = $props();
</script>

<div class="space-y-4">
  <DataTable
    {data}
    {columns}
    {features}
    {...state ? {state} : {}}
    {...handlers ? {handlers} : {}}
    {uiSettings}
    {serverPagination}
    {rowCount}
    {filterFns}
    class={className}>
    {#snippet children(table)}
      <div class="space-y-3">
        <!-- Render toolbar if provided -->
        {#if toolbar}
          {@render toolbar(table)}
        {/if}

        <div class={showBorder ? 'rounded-md border' : ''}>
          <Table.Root>
            <Table.Header>
              {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
                <Table.Row>
                  {#each headerGroup.headers as header (header.id)}
                    <Table.Head class={header.column.columnDef.meta?.headerClass}>
                      {#if !header.isPlaceholder}
                        {#if enableHeaders && (header.column.getCanSort() || header.column.getCanHide() || header.column.getCanPin())}
                          <DataTableColumnHeader
                            column={header.column}
                            {table}
                            title={typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header
                              : header.id} />
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
              {#if table.getRowModel().rows?.length}
                {#each table.getRowModel().rows as row (row.id)}
                  <Table.Row data-state={row.getIsSelected() && 'selected'}>
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
                    No results.
                  </Table.Cell>
                </Table.Row>
              {/if}
            </Table.Body>
          </Table.Root>
        </div>
        {#if showPagination && features.pagination}
          <DataTablePagination {table} {showSelection} {pageSizeOptions} />
        {/if}
      </div>
    {/snippet}
  </DataTable>
</div>
