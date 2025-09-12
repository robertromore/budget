<script lang="ts">
import {onMount} from 'svelte';
import Plus from '@lucide/svelte/icons/plus';
import {Button} from '$lib/components/ui/button';
import * as Tabs from '$lib/components/ui/tabs';
import WidgetDashboard from '$lib/components/widgets/widget-dashboard.svelte';
import {parseDate, today, getLocalTimeZone} from '@internationalized/date';
import type {Table as TanStackTable} from '@tanstack/table-core';
import {CategoriesState, PayeesState} from '$lib/states/entities';
import {ServerAccountState} from '$lib/states/views';
import type {TransactionsFormat} from '$lib/types';

// Local component imports
import {AddTransactionDialog, TransactionTableContainer, AnalyticsDashboard} from './(components)';
import {columns} from './(data)/columns.svelte';
import DeleteTransactionDialog from './(dialogs)/delete-transaction-dialog.svelte';

let {data} = $props();

// Make accountId reactive to prop changes
const accountId = $derived(data.accountId);

// Tab state management
let activeTab = $state('dashboard');

// Configuration constants
const CLIENT_SIDE_THRESHOLD = 5000;
const CACHE_DURATION = 30 * 1000;
const responseCache = new Map();

// Cache helper functions
const getCacheKey = (url: string, params?: any) =>
  params ? `${url}?${JSON.stringify(params)}` : url;
const getCachedResponse = (key: string) => {
  const cached = responseCache.get(key);
  return cached && Date.now() - cached.timestamp < CACHE_DURATION ? cached.data : null;
};
const setCachedResponse = (key: string, data: any) => {
  responseCache.set(key, {data, timestamp: Date.now()});
  if (responseCache.size > 50) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
};

// State
let account = $state<{id: number; name: string} | undefined>();
let transactions = $state<TransactionsFormat[]>([]);
let isLoading = $state(false);
let error = $state<string | undefined>();
let summary = $state<{balance: number; transactionCount: number} | undefined>();
let useClientSideTable = $state<boolean>(true);
let table = $state<TanStackTable<TransactionsFormat> | undefined>();
let serverAccountState = $state<ServerAccountState | undefined>();
let pagination = $state({page: 0, pageSize: 50, totalCount: 0, totalPages: 0});
let filters = $state({
  searchQuery: '',
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  dateFrom: undefined,
  dateTo: undefined,
});

// Entity states
const categoriesState = CategoriesState.get();
const payeesState = PayeesState.get();
const categories = $derived(categoriesState?.all || []);
const payees = $derived(payeesState?.all || []);

// Dialog state
let addTransactionDialogOpen = $state(false);
let bulkDeleteDialogOpen = $state(false);
let selectedTransactionIds = $state<number[]>([]);

// Transform data for tables
const formattedTransactions = $derived(
  (() => {
    if (!transactions?.length) return [];
    return transactions.map((t) => {
      const dateStr = typeof t.date === 'string' ? t.date : t.date.toString();
      const datePart = dateStr.split('T')[0];
      return {
        id: t.id ?? '',
        date: parseDate(datePart),
        amount: t.amount,
        notes: t.notes,
        status: t.status as 'cleared' | 'pending' | 'scheduled' | null,
        accountId: accountId,
        payeeId: t.payee?.id || null,
        payee: t.payee || null,
        categoryId: t.category?.id || null,
        category: t.category || null,
        parentId: null,
        balance: (t as any).balance || null,
      } as TransactionsFormat;
    });
  })()
);

const simpleFormatted = $derived(() => {
  if (!transactions?.length) return [];
  return transactions.map((t) => ({
    id: t.id,
    date: typeof t.date === 'string' ? t.date : t.date.toString(),
    amount: t.amount,
    notes: t.notes || '',
    status: t.status,
    payee: t.payee,
    category: t.category,
  }));
});

// Initialize server account state
$effect(() => {
  if (accountId) {
    const newState = new ServerAccountState(accountId);
    newState.initializeWithServerData(
      {
        id: accountId,
        name: `Account ${accountId}`,
        slug: '',
        type: '',
        balance: 0,
        transactionCount: 0,
      },
      {
        transactions: [],
        pagination: {
          page: 0,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }
    );
    serverAccountState = newState;
  }
});

// Main data loading function
async function loadData() {
  if (typeof window === 'undefined') return;

  try {
    isLoading = true;
    const numericAccountId = Number(accountId);
    if (isNaN(numericAccountId)) throw new Error(`Invalid account ID: ${accountId}`);

    // Load summary
    const summaryCacheKey = getCacheKey('serverAccountsRoutes.loadSummary', {id: numericAccountId});
    let summaryData = getCachedResponse(summaryCacheKey);

    if (!summaryData) {
      const summaryResponse = await fetch(
        `/trpc/serverAccountsRoutes.loadSummary?input=${encodeURIComponent(JSON.stringify({id: numericAccountId}))}`
      );
      if (!summaryResponse.ok)
        throw new Error(`Failed to load summary: HTTP ${summaryResponse.status}`);

      const summaryText = await summaryResponse.text();
      if (!summaryText.trim()) throw new Error('Empty response from server');

      const summaryResult = JSON.parse(summaryText);
      summaryData = summaryResult.result?.data || summaryResult;
      setCachedResponse(summaryCacheKey, summaryData);
    }

    summary = {
      balance: summaryData?.balance || 0,
      transactionCount: summaryData?.transactionCount || 0,
    };
    useClientSideTable = (summaryData?.transactionCount || 0) <= CLIENT_SIDE_THRESHOLD;

    // Load account
    const accountResponse = await fetch(
      `/trpc/accountRoutes.load?input=${encodeURIComponent(JSON.stringify({id: numericAccountId}))}`
    );
    if (!accountResponse.ok)
      throw new Error(`Failed to load account: HTTP ${accountResponse.status}`);

    const accountText = await accountResponse.text();
    if (!accountText.trim()) throw new Error('Empty account response');

    const accountResult = JSON.parse(accountText);
    const accountData = accountResult.result?.data || accountResult;
    account = {id: accountData.id, name: accountData.name};

    // Load transactions
    const transactionParams: any = {
      accountId: numericAccountId,
      page: useClientSideTable ? 0 : pagination.page,
      pageSize: useClientSideTable ? 100 : pagination.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };

    if (filters.searchQuery) transactionParams.searchQuery = filters.searchQuery;
    if (filters.dateFrom) transactionParams.dateFrom = filters.dateFrom;
    if (filters.dateTo) transactionParams.dateTo = filters.dateTo;

    const transactionResponse = await fetch(
      `/trpc/serverAccountsRoutes.loadTransactions?input=${encodeURIComponent(JSON.stringify(transactionParams))}`
    );
    if (!transactionResponse.ok)
      throw new Error(`Failed to load transactions: HTTP ${transactionResponse.status}`);

    const transactionText = await transactionResponse.text();
    if (!transactionText.trim()) throw new Error('Empty transactions response');

    const transactionResult = JSON.parse(transactionText);
    const transactionData = transactionResult.result?.data || transactionResult;

    transactions = transactionData?.transactions || [];

    const paginationData = transactionData?.pagination;
    pagination.totalCount = paginationData?.totalCount || 0;
    pagination.totalPages =
      paginationData?.totalPages || Math.ceil(pagination.totalCount / pagination.pageSize);

    error = undefined;
  } catch (err: any) {
    console.error('❌ Failed to load account data:', err);
    console.error('Error details:', err?.message, err?.stack);
    error = err?.message || 'Failed to load account data';
    transactions = [];
    account = undefined;
  } finally {
    isLoading = false;
  }
}

// Transaction operations
const submitTransaction = async (formData: any) => {
  if (!account?.id) return;

  try {
    const transactionResponse = await fetch('/trpc/transactionRoutes.save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        '0': {
          json: {
            accountId: Number(account.id),
            amount: formData.amount,
            date: formData.date,
            notes: formData.notes || null,
            payeeId: formData.payeeId,
            categoryId: formData.categoryId,
            status: formData.status,
          },
        },
      }),
    });

    if (!transactionResponse.ok)
      throw new Error(`Failed to create transaction: HTTP ${transactionResponse.status}`);

    const transactionText = await transactionResponse.text();
    if (!transactionText.trim()) throw new Error('Empty response when creating transaction');

    const transactionResult = JSON.parse(transactionText);
    const newTransaction = transactionResult[0]?.result?.data || transactionResult[0]?.result;

    if (newTransaction) {
      const formattedTransaction = {
        ...newTransaction,
        date:
          typeof newTransaction.date === 'string'
            ? parseDate(newTransaction.date)
            : newTransaction.date,
        balance: null,
      } as TransactionsFormat;

      transactions = [formattedTransaction, ...transactions];
      if (summary) {
        summary.balance += newTransaction.amount;
        summary.transactionCount += 1;
      }
      responseCache.clear();
    }
  } catch (err: any) {
    console.error('❌ Failed to create transaction:', err);
    throw err;
  }
};

const searchTransactions = (query: string) => {
  filters.searchQuery = query;
  pagination.page = 0;
  loadData();
};

const updateTransactionData = async (id: number, columnId: string, newValue?: unknown) => {
  try {
    const transaction = transactions.find((t) => t.id === id);
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

    const updateData: any = {
      id: id,
      accountId: Number(transaction.accountId || accountId),
      amount: Number(transaction.amount),
      date: transaction.date,
      notes: transaction.notes || null,
      payeeId: transaction.payee?.id ? Number(transaction.payee.id) : null,
      categoryId: transaction.category?.id ? Number(transaction.category.id) : null,
      status: transaction.status || 'pending',
    };

    if (actualField === 'payeeId' || actualField === 'categoryId' || actualField === 'accountId') {
      updateData[actualField] = newValue ? Number(newValue) : null;
    } else if (actualField === 'amount') {
      updateData[actualField] = Number(newValue);
    } else {
      updateData[actualField] = newValue;
    }

    const updateResponse = await fetch(`/accounts/${accountId}/api/update-transaction`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok)
      throw new Error(`Failed to update transaction: HTTP ${updateResponse.status}`);

    const updateResult = await updateResponse.json();
    if (!updateResult.success)
      throw new Error(updateResult.error || 'Failed to update transaction');

    responseCache.clear();
    await loadData();
  } catch (err: any) {
    console.error('❌ Failed to update transaction:', err);
    error = err?.message || 'Failed to update transaction';
  }
};

// Track account changes
let previousAccountId = $state<string | undefined>();

// Load data on mount and account changes
onMount(() => loadData());

$effect(() => {
  if (accountId && accountId !== previousAccountId) {
    pagination.page = 0;
    filters.searchQuery = '';
    previousAccountId = accountId;
    loadData();
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
        <div class="h-3 w-3 rounded-full bg-green-500" title="Active account"></div>
      </div>
    </div>

    <!-- Add Transaction Button & Bulk Actions -->
    <div class="flex items-center space-x-2">
      <!-- Bulk Actions (shown when transactions are selected) -->
      {#if table && Object.keys(table.getSelectedRowModel().rowsById).length > 0}
        <div
          class="mr-4 flex items-center space-x-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1">
          <span class="text-sm text-blue-700">
            {Object.keys(table.getSelectedRowModel().rowsById).length} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onclick={() => {
              if (!table) return;
              const selectedRows = Object.keys(table.getSelectedRowModel().rowsById);
              selectedTransactionIds = selectedRows.map((id) => parseInt(id));
              bulkDeleteDialogOpen = true;
            }}>
            Delete Selected
          </Button>
          <Button size="sm" variant="outline" onclick={() => table?.resetRowSelection()}>
            Clear Selection
          </Button>
        </div>
      {/if}

      <Button onclick={() => (addTransactionDialogOpen = true)}>
        <Plus class="mr-2 h-4 w-4" />
        Add Transaction
      </Button>
    </div>
  </div>

  <!-- Error State -->
  {#if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <div class="flex items-center space-x-2">
        <div class="text-red-600">⚠️</div>
        <div class="font-medium text-red-800">Error loading account data</div>
      </div>
      <p class="mt-2 text-red-700">{error}</p>
    </div>
  {/if}

  <!-- Tabs Structure -->
  <Tabs.Root bind:value={activeTab} class="mb-1 w-full">
    <Tabs.List class="inline-flex h-11">
      <Tabs.Trigger value="dashboard" class="px-6 font-medium">Dashboard</Tabs.Trigger>
      <Tabs.Trigger value="transactions" class="px-6 font-medium">Transactions</Tabs.Trigger>
      <Tabs.Trigger value="analytics" class="px-6 font-medium">Analytics</Tabs.Trigger>
    </Tabs.List>

    <!-- Dashboard Tab Content (temporarily disabled for monthly spending chart testing) -->
    <Tabs.Content value="dashboard" class="space-y-4">
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
    </Tabs.Content>

    <!-- Transactions Tab Content -->
    <Tabs.Content value="transactions" class="space-y-4">
      <TransactionTableContainer
        {isLoading}
        {useClientSideTable}
        {transactions}
        {filters}
        {pagination}
        bind:table
        {serverAccountState}
        {accountId}
        {categoriesState}
        {payeesState}
        views={data.views}
        {columns}
        {formattedTransactions}
        {simpleFormatted}
        {updateTransactionData}
        {searchTransactions}
        {loadData} />

      <!-- Add Transaction Dialog -->
      <AddTransactionDialog
        bind:open={addTransactionDialogOpen}
        {account}
        {payees}
        {categories}
        onSubmit={submitTransaction} />
    </Tabs.Content>

    <!-- Analytics Tab Content -->
    <Tabs.Content value="analytics" class="space-y-4">
      {#if transactions && !isLoading && activeTab === 'analytics'}
        <AnalyticsDashboard transactions={formattedTransactions} {accountId} />
      {:else if isLoading}
        <!-- Analytics Loading Skeleton -->
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

  <!-- Bulk Delete Dialog -->
  <DeleteTransactionDialog
    transactions={selectedTransactionIds}
    bind:dialogOpen={bulkDeleteDialogOpen}
    onDelete={() => {
      table?.resetRowSelection();
      loadData();
    }} />
</div>
