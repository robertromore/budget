<script lang="ts" generics="TValue">
  import {
    type ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    type Table as TTable,
    type SortingState,
  } from "@tanstack/table-core";
  import { createSvelteTable, FlexRender } from "$lib/components/ui/data-table";
  import * as Table from "$lib/components/ui/table";
  import type { TransactionsFormat } from "$lib/types";
  import { OptimizedDataTableToolbar, OptimizedDataTablePagination } from ".";
  import type { OptimizedAccountState } from "$lib/states/views/optimized-account.svelte";
  // Use div placeholders instead of skeleton component
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import * as Alert from "$lib/components/ui/alert";

  let {
    columns,
    accountState,
    accountId,
    table = $bindable(),
  }: {
    columns: ColumnDef<TransactionsFormat, TValue>[];
    accountState: OptimizedAccountState;
    accountId: number;
    table?: TTable<TransactionsFormat>;
  } = $props();

  // Create table instance with server-side sorting
  const tableInstance = createSvelteTable({
    get data() {
      return accountState.formatted || [];
    },
    get columns() {
      return columns;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Server-side sorting - disable client-side sorting
    manualSorting: true,
    // Server-side pagination - disable client-side pagination
    manualPagination: true,
    get pageCount() {
      return accountState.pagination.totalPages;
    },
    state: {
      get sorting() {
        return [{
          id: accountState.filters.sortBy,
          desc: accountState.filters.sortOrder === "desc"
        }] as SortingState;
      },
      get pagination() {
        return {
          pageIndex: accountState.pagination.page,
          pageSize: accountState.pagination.pageSize,
        };
      },
    },
    onSortingChange: (sortingUpdater) => {
      try {
        const newSorting = typeof sortingUpdater === 'function' 
          ? sortingUpdater([{
              id: accountState.filters.sortBy,
              desc: accountState.filters.sortOrder === "desc"
            }])
          : sortingUpdater;
        
        if (newSorting.length > 0) {
          const sort = newSorting[0];
          
          // Map column IDs to backend-expected values
          const columnIdMap: Record<string, "date" | "amount" | "notes"> = {
            'date': 'date',
            'amount': 'amount', 
            'notes': 'notes',
            // Add common variations
            'transaction-date': 'date',
            'transaction-amount': 'amount',
            'transaction-notes': 'notes'
          };
          
          const mappedSortBy = columnIdMap[sort.id] || 'date';
          
          accountState.setSorting(
            accountId, 
            mappedSortBy,
            sort.desc ? "desc" : "asc"
          );
        }
      } catch (error) {
        console.error('Sort error', error);
      }
    },
    onPaginationChange: (paginationUpdater) => {
      const newPagination = typeof paginationUpdater === 'function'
        ? paginationUpdater({
            pageIndex: accountState.pagination.page,
            pageSize: accountState.pagination.pageSize,
          })
        : paginationUpdater;
      
      if (newPagination.pageSize !== accountState.pagination.pageSize) {
        accountState.setPageSize(accountId, newPagination.pageSize);
      } else if (newPagination.pageIndex !== accountState.pagination.page) {
        accountState.goToPage(accountId, newPagination.pageIndex);
      }
    },
  });

  // Bind table instance to parent
  table = tableInstance;
</script>

<div class="space-y-4">
  <!-- Toolbar with search and filters -->
  <OptimizedDataTableToolbar {accountState} {accountId} />
  
  <!-- Error display -->
  {#if accountState.transactionsError}
    <Alert.Root variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <Alert.Title>Error loading transactions</Alert.Title>
      <Alert.Description>{accountState.transactionsError}</Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Data table -->
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each tableInstance.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head class="text-left">
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()}
                  />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#if accountState.isLoadingTransactions}
          <!-- Loading skeleton rows -->
          {#each Array(accountState.pagination.pageSize) as _, i (i)}
            <Table.Row>
              {#each columns as _, colIndex (colIndex)}
                <Table.Cell>
                  <div class="h-4 w-full animate-pulse rounded bg-muted"></div>
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        {:else if tableInstance.getRowModel().rows.length}
          <!-- Data rows -->
          {#each tableInstance.getRowModel().rows as row (row.id)}
            <Table.Row class="data-[state=selected]:bg-muted">
              {#each row.getVisibleCells() as cell (cell.id)}
                <Table.Cell>
                  <FlexRender
                    content={cell.column.columnDef.cell}
                    context={cell.getContext()}
                  />
                </Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        {:else}
          <!-- Empty state -->
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center">
              {#if accountState.filters.searchQuery}
                No transactions found matching "{accountState.filters.searchQuery}".
              {:else}
                No transactions found.
              {/if}
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination -->
  <OptimizedDataTablePagination {accountState} {accountId} />
</div>

<style>
  /* Add smooth loading transitions */
  :global(.data-table-loading) {
    opacity: 0.7;
    pointer-events: none;
    transition: opacity 0.2s ease-in-out;
  }
</style>