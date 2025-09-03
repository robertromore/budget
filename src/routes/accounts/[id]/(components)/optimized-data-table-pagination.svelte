<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronsLeft from "@lucide/svelte/icons/chevrons-left";
  import ChevronsRight from "@lucide/svelte/icons/chevrons-right";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import type { OptimizedAccountState } from "$lib/states/views/optimized-account.svelte";

  let {
    accountState,
    accountId,
  }: {
    accountState: OptimizedAccountState;
    accountId: number;
  } = $props();

  // Page size options
  const pageSizeOptions = [
    { value: "10", label: "10 per page" },
    { value: "25", label: "25 per page" },
    { value: "50", label: "50 per page" },
    { value: "100", label: "100 per page" },
  ];

  function setPageSize(value: string) {
    const pageSize = parseInt(value);
    if (!isNaN(pageSize)) {
      accountState.setPageSize(accountId, pageSize);
    }
  }

  function goToFirstPage() {
    accountState.goToPage(accountId, 0);
  }

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
    const { page, pageSize, totalCount } = accountState.pagination;
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    return { start, end };
  });
</script>

<div class="flex items-center justify-between px-2">
  <!-- Results info -->
  <div class="flex-1 text-sm text-muted-foreground">
    {#if accountState.pagination.totalCount === 0}
      No transactions
    {:else}
      Showing {currentRange().start} to {currentRange().end} of {accountState.pagination.totalCount} transactions
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
        onValueChange={setPageSize}
      >
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
          disabled={!accountState.pagination.hasPreviousPage || accountState.isLoadingTransactions}
        >
          <span class="sr-only">Go to first page</span>
          <ChevronsLeft class="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0"
          onclick={goToPreviousPage}
          disabled={!accountState.pagination.hasPreviousPage || accountState.isLoadingTransactions}
        >
          <span class="sr-only">Go to previous page</span>
          <ChevronLeft class="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0"
          onclick={goToNextPage}
          disabled={!accountState.pagination.hasNextPage || accountState.isLoadingTransactions}
        >
          <span class="sr-only">Go to next page</span>
          <ChevronRight class="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          class="hidden h-8 w-8 p-0 lg:flex"
          onclick={goToLastPage}
          disabled={!accountState.pagination.hasNextPage || accountState.isLoadingTransactions}
        >
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
    <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    <span class="text-sm text-muted-foreground">Loading transactions...</span>
  </div>
{/if}