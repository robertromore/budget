<script lang="ts">
  import { browser } from '$app/environment';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Table from '$lib/components/ui/table';
  import TransactionSkeleton from './transaction-skeleton.svelte';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte/icons';
  import { DataTable, ServerDataTableToolbar, ServerDataTablePagination } from '.';
  import type { ServerAccountState } from '$lib/states/entities/server-account.svelte';

  let {
    isLoading = false,
    useClientSideTable = false,
    transactions = [],
    filters = $bindable({
      searchQuery: '',
      dateFrom: null,
      dateTo: null,
      sortBy: 'date',
      sortOrder: 'desc' as 'asc' | 'desc'
    }),
    pagination = $bindable({
      page: 0,
      pageSize: 50,
      totalCount: 0,
      totalPages: 0
    }),
    table = $bindable(),
    serverAccountState = null,
    accountId,
    categoriesState = null,
    payeesState = null,
    views = [],
    columns,
    formattedTransactions,
    simpleFormatted,
    updateTransactionData,
    searchTransactions,
    loadData
  }: {
    isLoading: boolean;
    useClientSideTable: boolean;
    transactions: any[];
    filters: {
      searchQuery: string;
      dateFrom: string | null;
      dateTo: string | null;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
    table: any;
    serverAccountState: ServerAccountState | null;
    accountId: string;
    categoriesState: any;
    payeesState: any;
    views: any[];
    columns: any;
    formattedTransactions: any[];
    simpleFormatted: any[];
    updateTransactionData?: (transactionId: number, updates: any) => void;
    searchTransactions?: (query: string) => void;
    loadData?: () => Promise<void>;
  } = $props();
</script>

<!-- Transaction Table Container -->
{#if isLoading}
  <TransactionSkeleton rows={10} />
{:else}
  {#if useClientSideTable}
    <!-- Advanced Client-Side Data Table with View Management -->
    {#if browser && categoriesState && payeesState && !isLoading && transactions.length > 0}
      <!-- Debug: All conditions met for DataTable -->
      <DataTable
        columns={columns(categoriesState, payeesState, updateTransactionData)}
        transactions={formattedTransactions}
        views={views}
        bind:table
      />
    {:else}
      <!-- Simple fallback table while loading -->
      <div class="bg-red-100 p-4 mb-4 text-red-800">
        DEBUG: browser={browser}, categoriesState={!!categoriesState}, payeesState={!!payeesState}, isLoading={isLoading}, transactions.length={transactions.length}
      </div>
      <div class="space-y-4">
        <!-- Advanced Filter Toolbar -->
        {#if serverAccountState}
          <ServerDataTableToolbar
            accountState={serverAccountState}
            {accountId}
          />
        {:else}
          <!-- Fallback basic search -->
          <div class="flex items-center space-x-4">
            <div class="flex-1">
              <Input
                bind:value={filters.searchQuery}
                placeholder="Search transactions (fallback filtering)..."
                onchange={() => searchTransactions?.(filters.searchQuery)}
              />
            </div>
            <Button onclick={() => loadData?.()} variant="outline">
              Refresh
            </Button>
          </div>
        {/if}

        <!-- Transaction Table -->
        {#if serverAccountState?.isLoadingTransactions}
          <TransactionSkeleton rows={8} />
        {:else}
          <div class="rounded-md border">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Date</Table.Head>
                  <Table.Head>Amount</Table.Head>
                  <Table.Head>Description</Table.Head>
                  <Table.Head>Payee</Table.Head>
                  <Table.Head>Category</Table.Head>
                  <Table.Head>Status</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each simpleFormatted as transaction}
                  <Table.Row>
                    <Table.Cell>{new Date(transaction.date.toString()).toLocaleDateString()}</Table.Cell>
                    <Table.Cell class="font-mono">
                      ${transaction.amount?.toFixed(2) || '0.00'}
                    </Table.Cell>
                    <Table.Cell>{transaction.notes || '-'}</Table.Cell>
                    <Table.Cell>{transaction.payee?.name || '-'}</Table.Cell>
                    <Table.Cell>{transaction.category?.name || '-'}</Table.Cell>
                    <Table.Cell>
                      <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                        {transaction.status === 'cleared' ? 'bg-green-100 text-green-800' :
                         transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-gray-100 text-gray-800'}">
                        {transaction.status || 'pending'}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  <Table.Row>
                    <Table.Cell colspan={6} class="text-center text-muted-foreground py-8">
                      No transactions found
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <!-- Server-Side Paginated Table -->
    <div class="space-y-4">
      <!-- Search and Controls -->
      <div class="flex items-center space-x-4">
        <div class="flex-1">
          <Input
            bind:value={filters.searchQuery}
            placeholder="Search transactions..."
            onchange={() => searchTransactions?.(filters.searchQuery)}
          />
        </div>
        <Button onclick={() => loadData?.()} variant="outline">
          Refresh
        </Button>
      </div>

      <!-- Transaction Table -->
      {#if serverAccountState?.isLoadingTransactions}
        <TransactionSkeleton rows={pagination.pageSize} />
      {:else}
        <div class="rounded-md border">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Date</Table.Head>
                <Table.Head>Amount</Table.Head>
                <Table.Head>Description</Table.Head>
                <Table.Head>Payee</Table.Head>
                <Table.Head>Category</Table.Head>
                <Table.Head>Status</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each simpleFormatted as transaction}
                <Table.Row>
                  <Table.Cell>{new Date(transaction.date.toString()).toLocaleDateString()}</Table.Cell>
                  <Table.Cell class="font-mono">
                    ${transaction.amount?.toFixed(2) || '0.00'}
                  </Table.Cell>
                  <Table.Cell>{transaction.notes || '-'}</Table.Cell>
                  <Table.Cell>{transaction.payee?.name || '-'}</Table.Cell>
                  <Table.Cell>{transaction.category?.name || '-'}</Table.Cell>
                  <Table.Cell>
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      {transaction.status === 'cleared' ? 'bg-green-100 text-green-800' :
                       transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                       'bg-gray-100 text-gray-800'}">
                      {transaction.status || 'pending'}
                    </span>
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={6} class="text-center text-muted-foreground py-8">
                    {filters.searchQuery ? `No transactions found matching "${filters.searchQuery}"` : 'No transactions found'}
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      {/if}

      <!-- Advanced Pagination -->
      {#if serverAccountState && serverAccountState.pagination.totalPages > 1}
        <ServerDataTablePagination
          accountState={serverAccountState}
          {accountId}
        />
      {:else if pagination.totalPages > 1}
        <!-- Fallback basic pagination -->
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            Showing {pagination.page * pagination.pageSize + 1} to {Math.min((pagination.page + 1) * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} transactions
          </div>
          <div class="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => {
                pagination.page = Math.max(0, pagination.page - 1);
                loadData();
              }}
              disabled={pagination.page === 0}
            >
              <ChevronLeft class="h-4 w-4" />
              Previous
            </Button>
            <div class="flex items-center space-x-1">
              <span class="text-sm">Page {pagination.page + 1} of {pagination.totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onclick={() => {
                pagination.page = Math.min(pagination.totalPages - 1, pagination.page + 1);
                loadData();
              }}
              disabled={pagination.page >= pagination.totalPages - 1}
            >
              Next
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
{/if}