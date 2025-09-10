<!--
  @fileoverview Server-side data table component optimized for large transaction datasets

  This component provides server-side pagination, sorting, and filtering for transaction data.
  It integrates with ServerAccountState for consistent state management and supports both
  loading states and error handling.

  @component ServerDataTable
  @example
  ```svelte
  <ServerDataTable
    {columns}
    accountState={serverAccountState}
    {accountId}
    bind:table
  />
  ```
-->
<script lang="ts" generics="TValue">
  import * as Alert from "$lib/components/ui/alert";
  import { createSvelteTable, FlexRender } from "$lib/data-table";
  import * as Table from "$lib/components/ui/table";
  import type { ServerAccountState } from "$lib/states/views/server-account.svelte";
  import type { TransactionsFormat } from "$lib/types";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import {
    type ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    type Table as TTable,
  } from "@tanstack/table-core";
  import { ServerDataTablePagination, ServerDataTableToolbar } from ".";

  /**
   * Component props interface
   * @typedef {Object} ServerDataTableProps
   * @property {ColumnDef<TransactionsFormat, TValue>[]} columns - TanStack table column definitions
   * @property {ServerAccountState} accountState - Reactive state manager for account data
   * @property {number} accountId - Account identifier for data operations
   * @property {TTable<TransactionsFormat>} [table] - Bindable table instance for parent access
   */
  let {
    columns,
    accountState,
    accountId,
    table = $bindable(),
  }: {
    /** Column definitions for the data table */
    columns: ColumnDef<TransactionsFormat, TValue>[];
    /** State manager containing transaction data and pagination info */
    accountState: ServerAccountState;
    /** Unique identifier for the account being displayed */
    accountId: number;
    /** Optional bindable table instance for parent component access */
    table?: TTable<TransactionsFormat>;
  } = $props();

  /**
   * Creates a TanStack table instance configured for server-side operations.
   * This table delegates sorting and pagination to the server while maintaining
   * reactive state synchronization with the ServerAccountState.
   */
  const tableInstance = createSvelteTable({
    get data() {
      return accountState.formatted || [];
    },
    get columns() {
      return columns;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    /** Delegate sorting to server - prevents client-side sorting */
    manualSorting: true,
    /** Delegate pagination to server - prevents client-side pagination */
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
    /**
     * Handles sorting changes from the table UI and delegates to server-side state.
     * Maps frontend column IDs to backend field names before applying sort.
     *
     * @param sortingUpdater - TanStack table sorting updater function or state
     */
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

          /** Map frontend column IDs to backend-expected field names */
          const columnIdMap: Record<string, "date" | "amount" | "notes"> = {
            'date': 'date',
            'amount': 'amount',
            'notes': 'notes',
            // Common column ID variations
            'transaction-date': 'date',
            'transaction-amount': 'amount',
            'transaction-notes': 'notes'
          };

          const mappedSortBy = columnIdMap[sort?.id || 'date'] || 'date';

          // Update server-side sorting state
          accountState.setSorting(
            accountId,
            mappedSortBy,
            sort?.desc ? "desc" : "asc"
          );
        }
      } catch (error) {
        console.error('Sort error:', error);
      }
    },
    /**
     * Handles pagination changes from the table UI and delegates to server-side state.
     * Distinguishes between page size changes and page navigation to trigger appropriate actions.
     *
     * @param paginationUpdater - TanStack table pagination updater function or state
     */
    onPaginationChange: (paginationUpdater) => {
      const newPagination = typeof paginationUpdater === 'function'
        ? paginationUpdater({
            pageIndex: accountState.pagination.page,
            pageSize: accountState.pagination.pageSize,
          })
        : paginationUpdater;

      // Handle page size changes first (triggers data reload)
      if (newPagination.pageSize !== accountState.pagination.pageSize) {
        accountState.setPageSize(accountId, newPagination.pageSize);
      }
      // Then handle page navigation
      else if (newPagination.pageIndex !== accountState.pagination.page) {
        accountState.goToPage(accountId, newPagination.pageIndex);
      }
    },
  });

  /** Bind table instance to parent component for external access */
  table = tableInstance;
</script>

<div class="space-y-4">
  <!-- Toolbar with search and filters -->
  <ServerDataTableToolbar {accountState} {accountId} />

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
  <ServerDataTablePagination {accountState} {accountId} />
</div>

<style>
  /* Add smooth loading transitions */
  :global(.data-table-loading) {
    opacity: 0.7;
    pointer-events: none;
    transition: opacity 0.2s ease-in-out;
  }
</style>
