<script lang="ts">
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/table-core';
import {createSvelteTable, FlexRender} from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import * as Card from '$lib/components/ui/card';
import {Button} from '$lib/components/ui/button';
import * as Select from '$lib/components/ui/select';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
import type {ImportRow} from '$lib/types/import';
import {createColumns} from './import-data-table-columns';

interface Props {
  data: ImportRow[];
  fileName: string;
  onNext: () => void;
  onBack: () => void;
  selectedRows?: Set<number>;
  onSelectionChange?: (selected: Set<number>) => void;
  onPayeeUpdate?: (rowIndex: number, payeeId: number | null, payeeName: string | null) => void;
  onCategoryUpdate?: (rowIndex: number, categoryId: number | null, categoryName: string | null) => void;
  temporaryCategories?: string[];
  temporaryPayees?: string[];
}

let {
  data,
  fileName,
  onNext,
  onBack,
  selectedRows = $bindable(new Set()),
  onSelectionChange,
  onPayeeUpdate,
  onCategoryUpdate,
  temporaryCategories = [],
  temporaryPayees = [],
}: Props = $props();

// Create columns with entity update callbacks
const columns = createColumns({
  ...(onPayeeUpdate ? {onPayeeUpdate} : {}),
  ...(onCategoryUpdate ? {onCategoryUpdate} : {}),
  temporaryCategories,
  temporaryPayees,
});

// Table state
let sorting = $state<any[]>([]);
let columnFilters = $state<any[]>([]);
let columnVisibility = $state({});
let rowSelection = $state<Record<string, boolean>>({});
let pagination = $state({pageIndex: 0, pageSize: 50});

// Status filter state
let statusFilter = $state<'all' | 'valid' | 'warning' | 'invalid'>('all');

// Page size state - initialize with derived to capture reactive reference
let pageSizeValue = $state('50');

// Sync page size changes
$effect(() => {
  const currentSize = table.getState().pagination.pageSize;
  if (pageSizeValue !== String(currentSize)) {
    table.setPageSize(Number(pageSizeValue));
  }
});

// Sync rowSelection with selectedRows
$effect(() => {
  const newSelection = new Set<number>();
  Object.keys(rowSelection).forEach((key) => {
    if (rowSelection[key]) {
      newSelection.add(Number(key));
    }
  });
  selectedRows = newSelection;
  onSelectionChange?.(selectedRows);
});

// Filter data by status
const filteredData = $derived.by(() => {
  if (statusFilter === 'all') return data;
  return data.filter((row) => row.validationStatus === statusFilter);
});

// Create table instance
const table = $derived(
  createSvelteTable({
    data: filteredData,
    columns,
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
    enableRowSelection: (row) => row.original.validationStatus !== 'invalid',
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
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => String(row.rowIndex),
  })
);

// Initialize selection with all valid and warning rows
let hasInitialized = false;
$effect(() => {
  if (!hasInitialized && data.length > 0) {
    hasInitialized = true;
    const initialSelection: Record<string, boolean> = {};
    data.forEach((row) => {
      if (row.validationStatus === 'valid' || row.validationStatus === 'warning') {
        initialSelection[String(row.rowIndex)] = true;
      }
    });
    rowSelection = initialSelection;
  }
});

// Stats
const validRowCount = $derived(
  data.filter((row) => row.validationStatus === 'valid' || row.validationStatus === 'pending')
    .length
);
const invalidRowCount = $derived(data.filter((row) => row.validationStatus === 'invalid').length);
const warningRowCount = $derived(data.filter((row) => row.validationStatus === 'warning').length);
const selectedCount = $derived(selectedRows.size);
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h2 class="text-2xl font-bold">Preview Import Data</h2>
    <p class="text-muted-foreground mt-1">
      Review the data from <span class="font-medium">{fileName}</span> before importing
    </p>
  </div>

  <!-- Summary Stats -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold">{data.length}</div>
          <div class="text-sm text-muted-foreground mt-1">Total Rows</div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">{validRowCount}</div>
          <div class="text-sm text-muted-foreground mt-1">Valid Rows</div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-yellow-600">{warningRowCount}</div>
          <div class="text-sm text-muted-foreground mt-1">Warnings</div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">{selectedCount}</div>
          <div class="text-sm text-muted-foreground mt-1">Selected</div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Toolbar -->
  <Card.Root>
    <Card.Content class="p-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">Filter by status:</span>
          <Select.Root
            type="single"
            bind:value={statusFilter}
          >
            <Select.Trigger class="w-[140px]">
              {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} ({statusFilter === 'all' ? data.length : statusFilter === 'valid' ? validRowCount : statusFilter === 'warning' ? warningRowCount : invalidRowCount})
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All ({data.length})</Select.Item>
              <Select.Item value="valid">Valid ({validRowCount})</Select.Item>
              <Select.Item value="warning">Warning ({warningRowCount})</Select.Item>
              <Select.Item value="invalid">Invalid ({invalidRowCount})</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredData.length} rows
          </span>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Data Table -->
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup}
          <Table.Row>
            {#each headerGroup.headers as header}
              <Table.Head>
                {#if !header.isPlaceholder}
                  {@const headerContent = header.column.columnDef.header}
                  <FlexRender {...(headerContent ? {content: headerContent} : {})} context={header.getContext()} />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#if table.getRowModel().rows?.length}
          {#each table.getRowModel().rows as row}
            {@const isSelected = row.getIsSelected()}
            {@const isInvalid = row.original.validationStatus === 'invalid'}
            <Table.Row class={isSelected && !isInvalid ? 'bg-blue-50' : ''}>
              {#each row.getVisibleCells() as cell}
                <Table.Cell>
                  {#if cell.column.columnDef.cell}
                    {@const cellContent = cell.column.columnDef.cell}
                    <FlexRender {...(cellContent ? {content: cellContent} : {})} context={cell.getContext()} />
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

  <!-- Pagination -->
  <div class="flex items-center justify-between px-2">
    <div class="flex-1 text-sm text-muted-foreground">
      {table.getFilteredSelectedRowModel().rows.length} of{' '}
      {table.getFilteredRowModel().rows.length} row(s) selected.
    </div>
    <div class="flex items-center space-x-6 lg:space-x-8">
      <div class="flex items-center space-x-2">
        <p class="text-sm font-medium">Rows per page</p>
        <Select.Root
          type="single"
          bind:value={pageSizeValue}
        >
          <Select.Trigger class="h-8 w-[70px]">
            {table.getState().pagination.pageSize}
          </Select.Trigger>
          <Select.Content side="top">
            {#each [10, 20, 30, 40, 50, 100, 500] as pageSize}
              <Select.Item value={`${pageSize}`}>
                {pageSize}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div class="flex w-[100px] items-center justify-center text-sm font-medium">
        Page {table.getState().pagination.pageIndex + 1} of{' '}
        {table.getPageCount()}
      </div>
      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          class="hidden h-8 w-8 p-0 lg:flex"
          onclick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <span class="sr-only">Go to first page</span>
          <ChevronsLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="h-8 w-8 p-0"
          onclick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <span class="sr-only">Go to previous page</span>
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="h-8 w-8 p-0"
          onclick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span class="sr-only">Go to next page</span>
          <ChevronRight class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          class="hidden h-8 w-8 p-0 lg:flex"
          onclick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <span class="sr-only">Go to last page</span>
          <ChevronsRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <!-- Navigation -->
  <div class="flex items-center justify-between">
    <Button variant="outline" onclick={onBack}>
      Back
    </Button>
    <div class="flex items-center gap-3">
      {#if selectedCount === 0}
        <p class="text-sm text-muted-foreground">No rows selected</p>
      {:else}
        <p class="text-sm text-muted-foreground">
          {selectedCount} row{selectedCount !== 1 ? 's' : ''} will be imported
          {#if invalidRowCount > 0}
            · {invalidRowCount} invalid row{invalidRowCount !== 1 ? 's' : ''} skipped
          {/if}
        </p>
      {/if}
      <Button onclick={onNext} disabled={selectedCount === 0}>
        Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
      </Button>
    </div>
  </div>
</div>
