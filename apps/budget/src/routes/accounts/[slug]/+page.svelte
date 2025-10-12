<script lang="ts">
import Plus from '@lucide/svelte/icons/plus';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Upload from '@lucide/svelte/icons/upload';
import {Button, buttonVariants} from '$lib/components/ui/button';
import * as Tabs from '$lib/components/ui/tabs';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {parseDate} from '@internationalized/date';
import type {Table as TanStackTable} from '@tanstack/table-core';
import {CategoriesState, PayeesState} from '$lib/states/entities';
import {ServerAccountState} from '$lib/states/views';
import type {TransactionsFormat} from '$lib/types';
import type {Transaction} from '$lib/schema';

// Local component imports
import {AddTransactionDialog, TransactionTableContainer} from './(components)';
import {columns} from './(data)/columns.svelte';
import {rpc} from '$lib/query';
import {useQueryClient} from '@tanstack/svelte-query';
import AnalyticsDashboard from './(components)/analytics-dashboard.svelte';
import SchedulePreviewSheet from './(components)/schedule-preview-sheet.svelte';
import DebtAccountMetrics from '$lib/components/accounts/debt-account-metrics.svelte';
import {isDebtAccount} from '$lib/schema/accounts';

let {data} = $props();

// Get account slug from URL parameter
const accountSlug = $derived(data.accountSlug);

// Fetch account by slug to get ID for queries
const accountQuery = $derived(accountSlug ? rpc.accounts.getAccountDetail(accountSlug).options() : undefined);
const accountData = $derived(accountQuery?.data);
const accountId = $derived(accountData?.id);

// Tab state management
let activeTab = $state('transactions');

// State variables
let table = $state<TanStackTable<TransactionsFormat> | undefined>();
let serverAccountState = $state<ServerAccountState | undefined>();

// TanStack Query state - load ALL transactions including upcoming scheduled for client-side pagination
const transactionsQuery = $derived.by(() => {
  return serverAccountState && accountId ? rpc.transactions.getAllAccountTransactionsWithUpcoming(Number(accountId), {
    sortBy: serverAccountState.filters.sortBy,
    sortOrder: serverAccountState.filters.sortOrder,
    ...(serverAccountState.filters.searchQuery && { searchQuery: serverAccountState.filters.searchQuery }),
    ...(serverAccountState.filters.dateFrom && { dateFrom: serverAccountState.filters.dateFrom }),
    ...(serverAccountState.filters.dateTo && { dateTo: serverAccountState.filters.dateTo }),
  }).options() : undefined;
});
const summaryQuery = $derived(accountId ? rpc.transactions.getAccountSummary(Number(accountId)).options() : undefined);
const budgetCountQuery = $derived(rpc.budgets.getBudgetCount().options());

// Create the mutations once
const updateTransactionMutation = rpc.transactions.updateTransactionWithBalance.options();
const saveTransactionMutation = rpc.transactions.saveTransaction.options();
const bulkDeleteTransactionsMutation = rpc.transactions.bulkDeleteTransactions.options();
const queryClient = useQueryClient();

// Derived state from TanStack Query with proper reactivity
const transactions = $derived.by(() => {
  if (!transactionsQuery) return [];
  return Array.isArray(transactionsQuery?.data) ? transactionsQuery.data : [];
});
const isLoading = $derived.by(() => {
  return (transactionsQuery ? transactionsQuery?.isLoading : false) || (summaryQuery ? summaryQuery.isLoading : false);
});
const error = $derived.by(() => {
  return (transactionsQuery ? transactionsQuery?.error?.message : undefined) || (summaryQuery ? summaryQuery.error?.message : undefined);
});
const isAccountNotFound = $derived.by(() => {
  const summaryError = summaryQuery ? summaryQuery.error : undefined;
  const transactionsError = transactionsQuery ? transactionsQuery?.error : undefined;
  return (summaryError?.message?.includes('NOT_FOUND')) ||
         (transactionsError?.message?.includes('NOT_FOUND'));
});
const summary = $derived(summaryQuery ? summaryQuery.data : undefined);
const account = $derived(summary ? {id: summary.accountId, name: summary.accountName} : undefined);
const budgetCount = $derived(budgetCountQuery.data?.count ?? 0);

// Entity states
const categoriesState = CategoriesState.get();
const payeesState = PayeesState.get();
const categories = $derived(categoriesState?.all || []);
const payees = $derived(payeesState?.all || []);

// Dialog state
let addTransactionDialogOpen = $state(false);
let bulkDeleteDialogOpen = $state(false);
let transactionsToDelete = $state<TransactionsFormat[]>([]);
let isDeletingBulk = $state(false);

// Schedule preview state
let schedulePreviewOpen = $state(false);
let selectedScheduleTransaction = $state<TransactionsFormat | null>(null);

// Transform data for tables
const formattedTransactions = $derived.by(() => {
  const currentTransactions = transactions;
  if (!currentTransactions || !Array.isArray(currentTransactions) || currentTransactions.length === 0) {
    return [];
  }

  return currentTransactions.map((t: Transaction) => {
    const formatted: TransactionsFormat = {
      id: t.id ?? '',
      date: parseDate(t.date),
      amount: t.amount,
      notes: t.notes,
      status: t.status as 'cleared' | 'pending' | 'scheduled' | null,
      accountId: Number(accountId),
      payeeId: t.payee?.id || null,
      payee: t.payee || null,
      categoryId: t.category?.id || null,
      category: t.category || null,
      parentId: null,
      balance: t.balance,
      // Budget allocations
      budgetAllocations: t.budgetAllocations || [],
    };

    // Only add schedule metadata if present
    if (t.scheduleId !== undefined) formatted.scheduleId = t.scheduleId;
    if (t.scheduleName) formatted.scheduleName = t.scheduleName;
    if (t.scheduleSlug) formatted.scheduleSlug = t.scheduleSlug;
    if (t.scheduleFrequency) formatted.scheduleFrequency = t.scheduleFrequency;
    if (t.scheduleInterval !== undefined) formatted.scheduleInterval = t.scheduleInterval;
    if (t.scheduleNextOccurrence) formatted.scheduleNextOccurrence = t.scheduleNextOccurrence;

    return formatted;
  });
});


// Initialize server account state
$effect(() => {
  if (accountId) {
    // Only create the state for UI management (filters, pagination)
    // TanStack Query handles the actual data loading
    const newState = new ServerAccountState(accountId);
    serverAccountState = newState;
  }
});

// TanStack Query handles all data loading automatically

// Transaction operations
const submitTransaction = async (formData: any) => {
  if (!account?.id) return;

  try {
    // Use TanStack Query mutation for proper cache invalidation
    await saveTransactionMutation.mutateAsync({
      accountId: Number(account.id),
      amount: formData.amount,
      date: formData.date,
      notes: formData.notes || null,
      payeeId: formData.payeeId || null,
      categoryId: formData.categoryId || null,
      status: formData.status || 'pending',
      budgetId: formData.budgetId || null,
      budgetAllocation: formData.budgetAllocation || null,
    });
    // TanStack Query mutation handles all cache invalidation automatically
  } catch (err: any) {
    console.error('❌ Failed to create transaction:', err);
    throw err;
  }
};

const searchTransactions = (query: string) => {
  if (serverAccountState) {
    serverAccountState.filters.searchQuery = query;
    serverAccountState.pagination.page = 0;
  }
  // TanStack Query will automatically refetch with new parameters
};

const handleScheduleClick = (transaction: TransactionsFormat) => {
  selectedScheduleTransaction = transaction;
  schedulePreviewOpen = true;
};



const updateTransactionData = async (id: number, columnId: string, newValue?: unknown) => {
  try {
    const transaction = Array.isArray(transactions) ? transactions.find((t: Transaction) => t.id === id) : undefined;
    if (!transaction) return;

    const fieldMap: Record<string, string> = {
      payee: 'payeeId',
      category: 'categoryId',
      date: 'date',
      amount: 'amount',
      notes: 'notes',
      status: 'status',
    };
    const actualField = fieldMap[columnId] || columnId;

    // Build update data with only the changed field (tRPC style)
    const updateData: any = {};

    if (actualField === 'payeeId' || actualField === 'categoryId') {
      updateData[actualField] = newValue ? Number(newValue) : null;
    } else if (actualField === 'amount') {
      updateData[actualField] = Number(newValue);
    } else {
      updateData[actualField] = newValue;
    }

    // Use TanStack Query mutation and capture the returned array
    const updatedTransactionsWithBalance = await updateTransactionMutation.mutateAsync({
      id: id,
      data: updateData,
    });

    // Immediately update the cache with the returned transactions
    if (Array.isArray(updatedTransactionsWithBalance) && updatedTransactionsWithBalance.length > 0) {
      // Get current query data to preserve scheduled transactions
      const currentQueryParams = serverAccountState ? {
        sortBy: serverAccountState.filters.sortBy,
        sortOrder: serverAccountState.filters.sortOrder,
        ...(serverAccountState.filters.searchQuery && { searchQuery: serverAccountState.filters.searchQuery }),
        ...(serverAccountState.filters.dateFrom && { dateFrom: serverAccountState.filters.dateFrom }),
        ...(serverAccountState.filters.dateTo && { dateTo: serverAccountState.filters.dateTo }),
      } : undefined;

      const currentQuery = rpc.transactions.getAllAccountTransactionsWithUpcoming(Number(accountId), currentQueryParams);
      const currentData = queryClient.getQueryData(currentQuery.queryKey);

      if (Array.isArray(currentData)) {
        // Create a map of updated transactions for quick lookup
        const updatedTransactionsMap = new Map(
          updatedTransactionsWithBalance.map(tx => [tx.id, tx])
        );

        // Update existing actual transactions, keep scheduled transactions unchanged
        const newData = currentData.map(item => {
          // Only update actual transactions (numeric IDs), leave scheduled ones (string IDs) as is
          if (typeof item.id === 'number' && updatedTransactionsMap.has(item.id)) {
            return updatedTransactionsMap.get(item.id);
          }
          return item;
        });

        // Set the updated data in the cache
        queryClient.setQueryData(currentQuery.queryKey, newData);
      }
    }
  } catch (err: any) {
    console.error('❌ Failed to update transaction:', err);
    console.error('Update transaction error details:', err?.message || err?.toString() || 'Failed to update transaction');
  }
};

// Bulk delete transactions
const handleBulkDelete = async (transactions: TransactionsFormat[]) => {
  if (transactions.length === 0) return;

  transactionsToDelete = transactions;
  bulkDeleteDialogOpen = true;
};

const confirmBulkDelete = async () => {
  if (isDeletingBulk || transactionsToDelete.length === 0) return;

  isDeletingBulk = true;
  try {
    // Filter to only numeric IDs (exclude scheduled transactions with string IDs)
    const idsToDelete = transactionsToDelete
      .filter(t => typeof t.id === 'number')
      .map(t => t.id as number);

    if (idsToDelete.length > 0) {
      // Delete all transactions in a single batch request
      await bulkDeleteTransactionsMutation.mutateAsync(idsToDelete);
    }

    bulkDeleteDialogOpen = false;
    transactionsToDelete = [];
  } catch (error) {
    console.error('Failed to delete transactions:', error);
  } finally {
    isDeletingBulk = false;
  }
};

// Track account changes
let previousAccountId = $state<string | undefined>();

// TanStack Query handles data loading and refetching automatically
$effect(() => {
  if (accountId && (accountId + '') !== previousAccountId) {
    if (serverAccountState) {
      serverAccountState.pagination.page = 0;
      serverAccountState.filters.searchQuery = '';
    }
    previousAccountId = accountId + '';
    // TanStack Query will automatically refetch when accountId changes
  }
});
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-bold tracking-tight">
          {account?.name || `Account ${accountId}`}
        </h1>
        {#if !isAccountNotFound}
          <div class="h-3 w-3 rounded-full bg-green-500" title="Active account"></div>
        {/if}
      </div>
    </div>

    <!-- Add Transaction Button (only show if account exists) -->
    {#if !isAccountNotFound}
    <div class="flex items-center space-x-2">

      <Button variant="outline" href="/accounts/{accountSlug}/edit">
        <SquarePen class="mr-2 h-4 w-4" />
        Edit
      </Button>

      <Button variant="outline" href="/import?accountId={accountId}">
        <Upload class="mr-2 h-4 w-4" />
        Import
      </Button>

      <Button onclick={() => (addTransactionDialogOpen = true)}>
        <Plus class="mr-2 h-4 w-4" />
        Add Transaction
      </Button>
    </div>
    {/if}
  </div>

  <!-- Error State -->
  {#if isAccountNotFound}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <div class="flex items-center space-x-2">
        <div class="text-red-600">🔍</div>
        <div class="font-medium text-red-800">Account Not Found</div>
      </div>
      <p class="mt-2 text-red-700">The account with ID {accountId} doesn't exist.</p>
      <div class="mt-4 flex items-center gap-3">
        <Button href="/accounts/new" class="bg-blue-600 hover:bg-blue-700">
          <Plus class="mr-2 h-4 w-4" />
          Create Account
        </Button>
        <a href="/accounts" class="text-blue-600 hover:text-blue-800 underline">
          ← Go back to accounts list
        </a>
      </div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <div class="flex items-center space-x-2">
        <div class="text-red-600">⚠️</div>
        <div class="font-medium text-red-800">Error loading account data</div>
      </div>
      <p class="mt-2 text-red-700">{error}</p>
    </div>
  {/if}

  <!-- Main Content (only show if account exists) -->
  {#if !isAccountNotFound}
  <!-- Debt Account Metrics -->
  {#if accountData && accountData.accountType && isDebtAccount(accountData.accountType)}
    <DebtAccountMetrics account={accountData} />
  {/if}

  <!-- Tabs Structure -->
  <Tabs.Root bind:value={activeTab} class="mb-1 w-full">
    <Tabs.List class="inline-flex h-11">
      <!-- <Tabs.Trigger value="dashboard" class="px-6 font-medium">Dashboard</Tabs.Trigger> -->
      <Tabs.Trigger value="transactions" class="px-6 font-medium">Transactions</Tabs.Trigger>
      <Tabs.Trigger value="analytics" class="px-6 font-medium">Analytics</Tabs.Trigger>
    </Tabs.List>

    <!-- Dashboard Tab Content (commented out) -->
    <!-- <Tabs.Content value="dashboard" class="space-y-4">
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div class="mb-4 flex items-center gap-3">
          <div class="h-4 w-4 rounded-full bg-blue-500"></div>
          <h2 class="text-lg font-semibold text-blue-900">Dashboard Temporarily Disabled</h2>
        </div>
        <p class="mb-3 text-blue-800">
          Widget dashboard is currently disabled for focused testing of the monthly spending trends
          chart.
        </p>
        <p class="text-sm text-blue-700">
          Switch to the <strong>Analytics</strong> tab to test the isolated monthly spending chart functionality.
        </p>
      </div>
    </Tabs.Content> -->

    <!-- Transactions Tab Content -->
    <Tabs.Content value="transactions" class="space-y-4">
      <TransactionTableContainer
        isLoading={isLoading}
        transactions={Array.isArray(transactions) ? transactions : []}
        {categoriesState}
        {payeesState}
        views={data.views}
        {columns}
        {formattedTransactions}
        {updateTransactionData}
        {searchTransactions}
        {budgetCount}
        onScheduleClick={handleScheduleClick}
        onBulkDelete={handleBulkDelete}
        bind:table />

      <!-- Add Transaction Dialog -->
      <AddTransactionDialog
        bind:open={addTransactionDialogOpen}
        account={account || null}
        payees={payees.map(p => ({id: p.id, name: p.name || 'Unknown Payee'}))}
        categories={categories.map(c => ({id: c.id, name: c.name || 'Unknown Category'}))}
        onSubmit={submitTransaction} />
    </Tabs.Content>

    <!-- Analytics Tab Content -->
    <Tabs.Content value="analytics" class="space-y-4">
      {#if transactions && !isLoading && activeTab === 'analytics'}
        <AnalyticsDashboard transactions={formattedTransactions} accountId={accountId + ''} />
      {:else if isLoading}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
            <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
          </div>
          <div class="bg-muted h-[400px] animate-pulse rounded-lg"></div>
        </div>
      {/if}
    </Tabs.Content>
  </Tabs.Root>

  <!-- Bulk Delete Confirmation Dialog -->
  <AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete {transactionsToDelete.length} Transaction{transactionsToDelete.length > 1 ? 's' : ''}</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete {transactionsToDelete.length} transaction{transactionsToDelete.length > 1 ? 's' : ''}? This action cannot be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={confirmBulkDelete}
          disabled={isDeletingBulk}
          class={buttonVariants({variant: 'destructive'})}>
          {isDeletingBulk ? 'Deleting...' : 'Delete'}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <!-- Schedule Preview Sheet -->
  <SchedulePreviewSheet
    bind:open={schedulePreviewOpen}
    scheduleId={selectedScheduleTransaction?.scheduleId}
    scheduleSlug={selectedScheduleTransaction?.scheduleSlug}
    scheduleName={selectedScheduleTransaction?.scheduleName}
    amount={selectedScheduleTransaction?.amount}
    frequency={selectedScheduleTransaction?.scheduleFrequency}
    interval={selectedScheduleTransaction?.scheduleInterval}
    nextOccurrence={selectedScheduleTransaction?.scheduleNextOccurrence} />
  {/if}
</div>
