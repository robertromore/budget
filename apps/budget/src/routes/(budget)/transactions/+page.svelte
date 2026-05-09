<script lang="ts">
import { Button, buttonVariants } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import * as Empty from '$lib/components/ui/empty';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { AdvancedDataTable } from '$lib/components/data-table';
import type { TableState } from '$lib/components/data-table/state/create-table-state.svelte';
import { rpc } from '$lib/query';
import { bulkDeleteTransactions } from '$core/query/transactions';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import type { Transaction } from '$core/schema';
import { createColumns } from './(data)/columns.svelte';
import Receipt from '@lucide/svelte/icons/receipt';
import Search from '@lucide/svelte/icons/search';
import Trash2 from '@lucide/svelte/icons/trash-2';

const accountsState = $derived(AccountsState.get());
const accountOptions = $derived(accountsState?.all ?? []);

// Default date range: today - 90 days → today
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
const today = new Date();
const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

// Filter state
let searchQuery = $state('');
let dateFrom = $state(isoDate(ninetyDaysAgo));
let dateTo = $state(isoDate(today));
let accountId = $state<number | undefined>(undefined);
let status = $state<'cleared' | 'pending' | 'scheduled' | undefined>(undefined);

// Pagination state (driven by AdvancedDataTable via bind:state)
let tableState = $state<TableState | undefined>(undefined);
const pagination = $derived(tableState?.pagination() ?? { pageIndex: 0, pageSize: 50 });

// Build filters object — undefined values are dropped by tRPC
const filters = $derived({
  searchQuery: searchQuery.trim() || undefined,
  dateFrom: dateFrom || undefined,
  dateTo: dateTo || undefined,
  accountId,
  status,
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
});

const listQuery = $derived(
  rpc.transactions
    .getTransactionsList(filters, {
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
    })
    .options()
);

const transactions = $derived((listQuery.data?.data ?? []) as Transaction[]);
const totalCount = $derived(listQuery.data?.pagination?.totalCount ?? 0);
const isLoading = $derived(listQuery.isLoading);

// Columns — created once
const columns = createColumns();

// Reset to first page whenever filters change
$effect(() => {
  // Track filter values
  void filters.searchQuery;
  void filters.dateFrom;
  void filters.dateTo;
  void filters.accountId;
  void filters.status;
  if (tableState && tableState.pagination().pageIndex !== 0) {
    tableState.setPagination({
      pageIndex: 0,
      pageSize: tableState.pagination().pageSize,
    });
  }
});

// Bulk delete
let bulkDeleteOpen = $state(false);
let isDeletingBulk = $state(false);
const bulkDeleteMutation = bulkDeleteTransactions.options();

const selectedRowIds = $derived.by(() => {
  if (!tableState) return [];
  const selection = tableState.rowSelection() ?? {};
  return Object.keys(selection).filter((k) => selection[k]);
});

const selectedTransactions = $derived(
  selectedRowIds
    .map((idx) => transactions[Number(idx)])
    .filter((t): t is Transaction => Boolean(t))
);

async function confirmBulkDelete() {
  if (isDeletingBulk || selectedTransactions.length === 0) return;
  isDeletingBulk = true;
  try {
    const ids = selectedTransactions.map((t) => t.id);
    await bulkDeleteMutation.mutateAsync(ids);
    tableState?.setRowSelection?.({});
    bulkDeleteOpen = false;
  } catch (e) {
    console.error('Bulk delete failed:', e);
  } finally {
    isDeletingBulk = false;
  }
}

function clearFilters() {
  searchQuery = '';
  dateFrom = isoDate(ninetyDaysAgo);
  dateTo = isoDate(today);
  accountId = undefined;
  status = undefined;
}

const accountTriggerLabel = $derived(
  accountId === undefined ? 'All accounts' : (accountsState?.getById(accountId)?.name ?? 'All accounts')
);
const statusTriggerLabel = $derived(
  status === undefined ? 'All statuses' : status[0].toUpperCase() + status.slice(1)
);
</script>

<svelte:head>
  <title>Transactions - Budget App</title>
  <meta name="description" content="View and manage transactions across all accounts" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Transactions</h1>
      <p class="text-muted-foreground text-sm">
        {totalCount.toLocaleString()} transaction{totalCount === 1 ? '' : 's'} across all accounts
      </p>
    </div>
  </div>

  <!-- Filter bar -->
  <div
    class="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
    <div class="lg:col-span-2">
      <Label for="tx-search" class="text-xs">Search</Label>
      <div class="relative">
        <Search class="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
        <Input
          id="tx-search"
          type="search"
          placeholder="Search payee or notes..."
          bind:value={searchQuery}
          class="pl-8" />
      </div>
    </div>

    <div>
      <Label for="tx-date-from" class="text-xs">From</Label>
      <Input id="tx-date-from" type="date" bind:value={dateFrom} />
    </div>
    <div>
      <Label for="tx-date-to" class="text-xs">To</Label>
      <Input id="tx-date-to" type="date" bind:value={dateTo} />
    </div>

    <div>
      <Label class="text-xs">Account</Label>
      <Select.Root
        type="single"
        value={accountId === undefined ? '' : String(accountId)}
        onValueChange={(v) => (accountId = v === '' ? undefined : Number(v))}>
        <Select.Trigger class="w-full">
          <span class="truncate">{accountTriggerLabel}</span>
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All accounts</Select.Item>
          {#each accountOptions as acc (acc.id)}
            <Select.Item value={String(acc.id)}>{acc.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <div>
      <Label class="text-xs">Status</Label>
      <Select.Root
        type="single"
        value={status ?? ''}
        onValueChange={(v) =>
          (status = v === '' ? undefined : (v as 'cleared' | 'pending' | 'scheduled'))}>
        <Select.Trigger class="w-full">
          <span class="truncate">{statusTriggerLabel}</span>
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All statuses</Select.Item>
          <Select.Item value="cleared">Cleared</Select.Item>
          <Select.Item value="pending">Pending</Select.Item>
          <Select.Item value="scheduled">Scheduled</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <div class="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
      <Button variant="outline" size="sm" onclick={clearFilters}>Reset filters</Button>
      {#if selectedTransactions.length > 0}
        <Button
          variant="destructive"
          size="sm"
          onclick={() => (bulkDeleteOpen = true)}
          class="ml-auto">
          <Trash2 class="mr-1.5 h-4 w-4" />
          Delete {selectedTransactions.length}
        </Button>
      {/if}
    </div>
  </div>

  <!-- Table -->
  {#if !isLoading && transactions.length === 0}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Receipt class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No transactions found</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Try adjusting your filters, or add transactions from an account page.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
    </Empty.Empty>
  {:else}
    <AdvancedDataTable
      data={transactions}
      {columns}
      bind:state={tableState}
      serverPagination
      rowCount={totalCount}
      loading={isLoading}
      initialPagination={{ pageIndex: 0, pageSize: 50 }}
      pageSizeOptions={[25, 50, 100]}
      getRowId={(_row, index) => String(index)} />
  {/if}
</div>

<!-- Bulk Delete Confirmation -->
<AlertDialog.Root bind:open={bulkDeleteOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >Delete {selectedTransactions.length} transaction{selectedTransactions.length === 1
          ? ''
          : 's'}?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. The selected transactions will be permanently removed and
        account balances recomputed.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkDelete}
        disabled={isDeletingBulk}
        class={buttonVariants({ variant: 'destructive' })}>
        {isDeletingBulk ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
