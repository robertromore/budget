<script lang="ts" generics="TData">
import { Button } from '$lib/components/ui/button';
import * as Select from '$lib/components/ui/select';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
import type { Table } from '@tanstack/table-core';

interface Props {
  /** The TanStack Table instance */
  table: Table<TData>;
  /** Show row selection count */
  showSelection?: boolean;
  /** Available page sizes */
  pageSizeOptions?: number[];
  /** Custom label for rows per page */
  rowsPerPageLabel?: string;
  /** Custom label for page indicator */
  pageLabel?: (currentPage: number, totalPages: number) => string;
  /** Custom label for row selection */
  selectionLabel?: (selectedCount: number, totalCount: number) => string;
}

let {
  table,
  showSelection = true,
  pageSizeOptions = [10, 20, 25, 30, 40, 50, 100],
  rowsPerPageLabel = 'Rows per page',
  pageLabel = (current, total) => `Page ${current} of ${total}`,
  selectionLabel = (selected, total) => `${selected} of ${total} row(s) selected.`,
}: Props = $props();

// Derive page size from table state (auto-syncs when table changes)
const pageSizeValue = $derived(String(table.getState().pagination.pageSize));

const selectedCount = $derived(table.getFilteredSelectedRowModel().rows.length);
const totalCount = $derived(table.getFilteredRowModel().rows.length);
const currentPage = $derived(table.getState().pagination.pageIndex + 1);
const totalPages = $derived(Math.max(1, table.getPageCount()));
</script>

<div class="flex items-center justify-between px-2">
  {#if showSelection}
    <div class="text-muted-foreground flex-1 text-sm">
      {selectionLabel(selectedCount, totalCount)}
    </div>
  {:else}
    <div class="flex-1"></div>
  {/if}
  <div class="flex items-center space-x-6 lg:space-x-8">
    <div class="flex items-center space-x-2">
      <p class="text-sm font-medium">{rowsPerPageLabel}</p>
      <Select.Root
        allowDeselect={false}
        type="single"
        value={pageSizeValue}
        onValueChange={(value) => {
          if (value) {
            table.setPageSize(Number(value));
          }
        }}>
        <Select.Trigger class="h-8 w-17.5">
          {String(table.getState().pagination.pageSize)}
        </Select.Trigger>
        <Select.Content side="top">
          {#each pageSizeOptions as pageSize (pageSize)}
            <Select.Item value={`${pageSize}`}>
              {pageSize}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex w-25 items-center justify-center text-sm font-medium">
      {pageLabel(currentPage, totalPages)}
    </div>
    <div class="flex items-center space-x-2">
      <Button
        variant="outline"
        class="hidden size-8 p-0 lg:flex"
        onclick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}>
        <span class="sr-only">Go to first page</span>
        <ChevronsLeft class="size-4" />
      </Button>
      <Button
        variant="outline"
        class="size-8 p-0"
        onclick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}>
        <span class="sr-only">Go to previous page</span>
        <ChevronLeft class="size-4" />
      </Button>
      <Button
        variant="outline"
        class="size-8 p-0"
        onclick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}>
        <span class="sr-only">Go to next page</span>
        <ChevronRight class="size-4" />
      </Button>
      <Button
        variant="outline"
        class="hidden size-8 p-0 lg:flex"
        onclick={() => table.setPageIndex(table.getPageCount() - 1)}
        disabled={!table.getCanNextPage()}>
        <span class="sr-only">Go to last page</span>
        <ChevronsRight class="size-4" />
      </Button>
    </div>
  </div>
</div>
