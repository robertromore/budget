<!--
  @fileoverview Server-side data table pagination controls
  
  This component provides comprehensive pagination controls for server-side data tables,
  including page navigation, page size selection, and pagination status display.
  All pagination operations are delegated to ServerAccountState for consistent state management.
  
  @component ServerDataTablePagination
  @example
  ```svelte
  <ServerDataTablePagination 
    accountState={serverAccountState} 
    {accountId} 
  />
  ```
-->
<script lang="ts">
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
import {Button} from '$lib/components/ui/button';
import * as Select from '$lib/components/ui/select';
import type {ServerAccountState} from '$lib/states/views/server-account.svelte';

/**
 * Component props interface
 */
let {
  accountState,
  accountId,
}: {
  /** State manager containing pagination state and methods */
  accountState: ServerAccountState;
  /** Account identifier for pagination operations */
  accountId: number;
} = $props();

/**
 * Available page size options for the pagination dropdown.
 * Provides common pagination sizes optimized for different use cases.
 */
const pageSizeOptions = [
  {value: '10', label: '10 per page'}, // Small datasets, detailed viewing
  {value: '25', label: '25 per page'}, // Balanced view
  {value: '50', label: '50 per page'}, // Default recommended size
  {value: '100', label: '100 per page'}, // Large datasets, overview
];

/**
 * Updates the page size and triggers data reload.
 * Validates the input value before applying the change.
 *
 * @param value - String representation of the new page size
 */
function setPageSize(value: string) {
  const pageSize = parseInt(value);
  if (!isNaN(pageSize) && pageSize > 0) {
    accountState.setPageSize(accountId, pageSize);
  }
}

/**
 * Navigates to the first page of results
 */
function goToFirstPage() {
  accountState.goToPage(accountId, 0);
}

/**
 * Navigates to the last page of results
 */
function goToLastPage() {
  accountState.goToPage(accountId, accountState.pagination.totalPages - 1);
}

function goToPreviousPage() {
  accountState.previousPage(accountId);
}

function goToNextPage() {
  accountState.nextPage(accountId);
}

// Calculate current range
const currentRange = $derived(() => {
  const {page, pageSize, totalCount} = accountState.pagination;
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalCount);
  return {start, end};
});
</script>

<div class="flex items-center justify-between px-2">
  <!-- Results info -->
  <div class="text-muted-foreground flex-1 text-sm">
    {#if accountState.pagination.totalCount === 0}
      No transactions
    {:else}
      Showing {currentRange().start} to {currentRange().end} of {accountState.pagination.totalCount}
      transactions
    {/if}
  </div>

  <!-- Pagination controls -->
  <div class="flex items-center space-x-6 lg:space-x-8">
    <!-- Page size selector -->
    <div class="flex items-center space-x-2">
      <p class="text-sm font-medium">Rows per page</p>
      <Select.Root
        type="single"
        value={accountState.pagination.pageSize.toString()}
        onValueChange={setPageSize}>
        <Select.Trigger class="h-8 w-[130px]">
          {accountState.pagination.pageSize} per page
        </Select.Trigger>
        <Select.Content side="top">
          {#each pageSizeOptions as option}
            <Select.Item value={option.value}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Page info and navigation -->
    <div class="flex items-center space-x-2">
      <div class="flex w-[100px] items-center justify-center text-sm font-medium">
        Page {accountState.pagination.page + 1} of {Math.max(1, accountState.pagination.totalPages)}
      </div>

      <!-- Navigation buttons -->
      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          class="hidden h-8 w-8 p-0 lg:flex"
          onclick={goToFirstPage}
          disabled={!accountState.pagination.hasPreviousPage || accountState.isLoadingTransactions}>
          <span class="sr-only">Go to first page</span>
          <ChevronsLeft class="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0"
          onclick={goToPreviousPage}
          disabled={!accountState.pagination.hasPreviousPage || accountState.isLoadingTransactions}>
          <span class="sr-only">Go to previous page</span>
          <ChevronLeft class="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0"
          onclick={goToNextPage}
          disabled={!accountState.pagination.hasNextPage || accountState.isLoadingTransactions}>
          <span class="sr-only">Go to next page</span>
          <ChevronRight class="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="hidden h-8 w-8 p-0 lg:flex"
          onclick={goToLastPage}
          disabled={!accountState.pagination.hasNextPage || accountState.isLoadingTransactions}>
          <span class="sr-only">Go to last page</span>
          <ChevronsRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</div>

<!-- Loading indicator -->
{#if accountState.isLoadingTransactions}
  <div class="flex items-center justify-center space-x-2 py-2">
    <div class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent">
    </div>
    <span class="text-muted-foreground text-sm">Loading transactions...</span>
  </div>
{/if}
