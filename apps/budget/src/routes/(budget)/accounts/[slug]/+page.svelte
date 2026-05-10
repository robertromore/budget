<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button, buttonVariants } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import * as Tabs from '$lib/components/ui/tabs';
import * as Select from '$lib/components/ui/select';
import type { Transaction } from '$core/schema';
import type { Schedule } from '$core/schema/schedules';
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import { CategoriesState, PayeesState, SchedulesState } from '$lib/states/entities';
import { ServerAccountState } from '$lib/states/views';
import type { TransactionsFormat } from '$lib/types';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Brain from '@lucide/svelte/icons/brain';
import Calendar from '@lucide/svelte/icons/calendar';
import ChartLine from '@lucide/svelte/icons/chart-line';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import List from '@lucide/svelte/icons/list';
import Plus from '@lucide/svelte/icons/plus';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Upload from '@lucide/svelte/icons/upload';
import Wallet from '@lucide/svelte/icons/wallet';
import Zap from '@lucide/svelte/icons/zap';
import type { Table as TanStackTable } from '@tanstack/table-core';
import { demoMode, type DemoSchedule } from '$lib/states/ui/demo-mode.svelte';
// Local component imports
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { rpc } from '$lib/query';
import { headerActionsMode } from '$lib/stores/header-actions.svelte';
import { getPageTabsContext } from '$lib/stores/page-tabs.svelte';
import { arePayeesSimilar } from '$lib/utils/payee-matching';
import { useQueryClient } from '@tanstack/svelte-query';
import { onDestroy } from 'svelte';
import {
  AddTransactionDialog,
  AutomationTab,
  DocumentsTab,
  ExpenseTableContainer,
  HsaDashboard,
  ImportTab,
  IntelligenceTab,
  SettingsTab,
  SubscriptionsTab,
  TransactionTableContainer,
} from './(components)';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import UtilityDashboard from './(components)/utility-dashboard.svelte';
import AccountBudgetsTable from './(components)/account-budgets-table.svelte';
import BudgetsTab from './(components)/budgets-tab.svelte';
import SchedulesTab from './(components)/schedules-tab.svelte';
import AnalyticsDashboard from './(components)/analytics-dashboard.svelte';
import SchedulePreviewController from './(components)/schedule-preview-controller.svelte';
import ConvertToTransferController from './(components)/convert-to-transfer-controller.svelte';
import BulkUpdateDialogs from './(components)/bulk-update-dialogs.svelte';
import BulkDeleteTransactionsDialog from './(components)/bulk-delete-transactions-dialog.svelte';
import HsaExpenseSheet from './(components)/hsa-expense-sheet.svelte';
import {
  formatTransaction,
  formatTransactions,
} from '$lib/components/transactions-table/format-transactions';
import { columns } from './(data)/columns.svelte';

// Convert demo schedules to Schedule type for display

// Define valid tab values
const tabValues = [
  'transactions',
  'hsa-expenses',
  'hsa-dashboard',
  'utility-dashboard',
  'analytics',
  'subscriptions',
  'intelligence',
  'automation',
  'schedules',
  'budgets',
  'documents',
  'import',
  'settings',
] as const;
type TabValue = (typeof tabValues)[number];

let { data } = $props();

// Get account slug from URL parameter
const accountSlug = $derived(data.accountSlug);

// Check if we're in demo mode viewing the demo account
const isDemoView = $derived(demoMode.isActive && accountSlug === 'demo-checking');

// Check if the slug is for the demo account (skip query even if demo mode isn't activated yet to avoid race condition)
const isDemoSlug = $derived(accountSlug === 'demo-checking');

// Fetch account by slug to get ID for queries (skip in demo mode or for demo slug)
const accountQuery = $derived(
  accountSlug && !isDemoView && !isDemoSlug
    ? rpc.accounts.getAccountDetail(accountSlug).options()
    : undefined
);

// Use demo account data when in demo mode, otherwise use real query data
const accountData = $derived.by(() => {
  if (isDemoView && demoMode.demoAccount) {
    return demoMode.demoAccount;
  }
  return accountQuery?.data;
});
const accountId = $derived(accountData?.id);

// Tab state management - synced with URL query string
const activeTab = $derived.by(() => {
  const tabParam = page.url.searchParams.get('tab');
  if (tabParam && tabValues.includes(tabParam as TabValue)) {
    return tabParam as TabValue;
  }
  return 'transactions';
});

function setActiveTab(value: TabValue) {
  // Guard against calling before router is initialized
  if (!browser) return;

  const url = new URL(page.url);
  if (value === 'transactions') {
    url.searchParams.delete('tab');
  } else {
    url.searchParams.set('tab', value);
  }
  goto(url.pathname + url.search, { replaceState: false, noScroll: true, keepFocus: true });
}

// Register tabs for header display
const pageTabsContext = getPageTabsContext();
const showTabsOnPage = $derived(headerActionsMode.tabsMode === 'off');

const mobileTabOptions = $derived.by(() => [
  { value: 'transactions' as TabValue, label: 'Transactions' },
  ...(isHsaAccount
    ? [
        { value: 'hsa-expenses' as TabValue, label: 'Medical Expenses' },
        { value: 'hsa-dashboard' as TabValue, label: 'HSA Dashboard' },
      ]
    : []),
  ...(isUtilityAccount ? [{ value: 'utility-dashboard' as TabValue, label: 'Usage' }] : []),
  { value: 'analytics' as TabValue, label: 'Analytics' },
  { value: 'subscriptions' as TabValue, label: 'Subscriptions' },
  { value: 'intelligence' as TabValue, label: 'Intelligence' },
  { value: 'automation' as TabValue, label: 'Automation' },
  { value: 'schedules' as TabValue, label: 'Schedules' },
  { value: 'budgets' as TabValue, label: 'Budgets' },
  { value: 'documents' as TabValue, label: 'Documents' },
  { value: 'import' as TabValue, label: 'Import' },
  { value: 'settings' as TabValue, label: 'Settings' },
]);

// Keep tabs context updated reactively
$effect(() => {
  if (pageTabsContext) {
    pageTabsContext.register({
      tabs: [
        { id: 'transactions', label: 'Transactions', icon: List },
        { id: 'hsa-expenses', label: 'Medical Expenses', condition: isHsaAccount },
        { id: 'hsa-dashboard', label: 'HSA Dashboard', condition: isHsaAccount },
        { id: 'utility-dashboard', label: 'Usage', icon: Zap, condition: isUtilityAccount },
        { id: 'analytics', label: 'Analytics', icon: ChartLine },
        { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
        { id: 'intelligence', label: 'Intelligence', icon: Brain },
        { id: 'automation', label: 'Automation', icon: Zap },
        { id: 'schedules', label: 'Schedules', icon: Calendar },
        { id: 'budgets', label: 'Budgets', icon: Wallet },
        { id: 'import', label: 'Import', icon: Upload },
        { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
      ],
      activeTab,
      onTabChange: (value) => setActiveTab(value as TabValue),
    });
  }
});

onDestroy(() => {
  pageTabsContext?.clear();
});

// Track previous tab for refetch logic
let previousTab = $state<TabValue | undefined>(undefined);

// State variables
let table = $state<TanStackTable<TransactionsFormat> | undefined>();
let serverAccountState = $state<ServerAccountState | undefined>();

// TanStack Query state - load ALL transactions including upcoming scheduled for client-side pagination
// Skip real queries in demo mode
const transactionsQuery = $derived.by(() => {
  if (isDemoView) return undefined; // Demo mode uses mock data
  return serverAccountState && accountId
    ? rpc.transactions
        .getAllAccountTransactionsWithUpcoming(Number(accountId), {
          sortBy: serverAccountState.filters.sortBy,
          sortOrder: serverAccountState.filters.sortOrder,
          ...(serverAccountState.filters.searchQuery && {
            searchQuery: serverAccountState.filters.searchQuery,
          }),
          ...(serverAccountState.filters.dateFrom && {
            dateFrom: serverAccountState.filters.dateFrom,
          }),
          ...(serverAccountState.filters.dateTo && { dateTo: serverAccountState.filters.dateTo }),
        })
        .options()
    : undefined;
});
const summaryQuery = $derived(
  accountId && !isDemoView
    ? rpc.transactions.getAccountSummary(Number(accountId)).options()
    : undefined
);
const budgetCountQuery = $derived(rpc.budgets.getBudgetCount().options());

// Query for all accounts (for transfer selection) - only on client
const allAccountsQuery = $derived(
  browser && !isDemoView ? rpc.accounts.listAccounts().options() : undefined
);
const transferAccounts = $derived.by(() => {
  const accounts = allAccountsQuery?.data ?? [];
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    accountType: a.accountType,
  }));
});

// Create the mutations once
const updateTransactionMutation = rpc.transactions.updateTransactionWithBalance.options();
const saveTransactionMutation = rpc.transactions.saveTransaction.options();
const convertToTransferMutation = rpc.transactions.convertToTransfer.options();

// Account balance management mutations

const queryClient = useQueryClient();

// Derived state from TanStack Query with proper reactivity
// Use demo transactions when in demo mode
const transactions = $derived.by(() => {
  if (isDemoView) return demoMode.demoTransactions;
  if (!transactionsQuery) return [];
  return Array.isArray(transactionsQuery?.data) ? transactionsQuery.data : [];
});

// Refetch transactions when switching from import tab to transactions tab
$effect(() => {
  const currentTab = activeTab;
  if (previousTab === 'import' && currentTab === 'transactions') {
    // Refetch transactions after import to ensure we have the latest data
    transactionsQuery?.refetch();
  }
  previousTab = currentTab;
});

const isLoading = $derived.by(() => {
  // Demo mode data is already loaded
  if (isDemoView) return false;
  return (
    (transactionsQuery ? transactionsQuery?.isLoading : false) ||
    (summaryQuery ? summaryQuery.isLoading : false)
  );
});
const error = $derived.by(() => {
  return (
    (transactionsQuery ? transactionsQuery?.error?.message : undefined) ||
    (summaryQuery ? summaryQuery.error?.message : undefined)
  );
});
const isAccountNotFound = $derived.by(() => {
  // In demo mode, never show "not found" for demo account
  if (isDemoView) return false;
  const summaryError = summaryQuery ? summaryQuery.error : undefined;
  const transactionsError = transactionsQuery ? transactionsQuery?.error : undefined;
  return (
    summaryError?.message?.includes('NOT_FOUND') ||
    transactionsError?.message?.includes('NOT_FOUND')
  );
});
const summary = $derived.by(() => {
  if (isDemoView && demoMode.demoAccount) {
    return {
      accountId: demoMode.demoAccount.id,
      accountName: demoMode.demoAccount.name,
      balance: demoMode.demoAccount.balance,
    };
  }
  return summaryQuery ? summaryQuery.data : undefined;
});
const account = $derived(
  summary ? { id: summary.accountId, name: summary.accountName } : undefined
);
const budgetCount = $derived(budgetCountQuery.data?.count ?? 0);

// Entity states
const categoriesState = CategoriesState.get();
const payeesState = PayeesState.get();
const schedulesState = SchedulesState.get();
const categories = $derived(categoriesState?.all || []);
const payees = $derived(payeesState?.all || []);

// Dialog state
let addTransactionDialogOpen = $state(false);
// Bulk-delete: setting non-empty opens the dialog, the controller
// clears it on confirm/cancel.
let transactionsToDelete = $state<TransactionsFormat[]>([]);

// Bulk update dialog state
let bulkPayeeUpdateDialog = $state({
  open: false,
  transactionId: 0,
  payeeId: null as number | null,
  payeeName: null as string | null,
  originalPayeeName: '',
  matchCount: 0,
  // Category update option
  newPayeeDefaultCategoryId: null as number | null,
  newPayeeDefaultCategoryName: null as string | null,
  updateCategories: false,
});

let bulkCategoryUpdateDialog = $state({
  open: false,
  transactionId: 0,
  categoryId: null as number | null,
  categoryName: null as string | null,
  originalPayeeName: '',
  matchCountByPayee: 0,
  matchCountByCategory: 0,
  previousCategoryId: null as number | null,
});

// HSA state (for HSA accounts only)
const isHsaAccount = $derived(accountData?.accountType === 'hsa');

// Utility account state
const isUtilityAccount = $derived(accountData?.accountType === 'utility');

// HSA expense sheet state — sheet is open when expenseSheetMode is non-null.
let expenseSheetMode = $state<'add' | 'edit' | null>(null);
let editingExpense = $state<any | null>(null);

function handleEditExpense(expense: any) {
  editingExpense = expense;
  expenseSheetMode = 'edit';
}

function handleAddExpense() {
  editingExpense = null;
  expenseSheetMode = 'add';
}

// Schedule preview state
// Schedule preview + convert-to-transfer dialog state. Setting the
// transaction non-null opens the corresponding controller component
// at the bottom of the page.
let scheduleSheetTransaction = $state<TransactionsFormat | null>(null);
let convertToTransferTransaction = $state<TransactionsFormat | null>(null);
let preselectedTransferAccountId = $state<number | undefined>(undefined);

// Formatted view for the analytics tab (the data-table container does its
// own formatting internally — we still need it here for AnalyticsDashboard).
const formattedTransactions = $derived(
  formatTransactions(transactions, {
    accountId: Number(accountId ?? 0),
    account: accountData,
  })
);

// Initialize server account state (skip in demo mode - no real API calls needed)
$effect(() => {
  if (accountId && !isDemoView) {
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
  scheduleSheetTransaction = transaction;
};

const updateTransactionData = async (id: number, columnId: string, newValue?: unknown) => {
  try {
    const transaction = Array.isArray(transactions)
      ? transactions.find((t: Transaction) => t.id === id)
      : undefined;
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

    const updateData: any = {};

    if (actualField === 'payeeId' || actualField === 'categoryId') {
      updateData[actualField] = newValue ? Number(newValue) : null;
    } else if (actualField === 'amount') {
      updateData[actualField] = Number(newValue);
    } else {
      updateData[actualField] = newValue;
    }

    // Check for payee updates and find similar transactions
    if (actualField === 'payeeId') {
      const originalPayee = transaction.payee;
      const newPayeeId = updateData.payeeId;
      const newPayee = payees.find((p) => p.id === newPayeeId);

      if (originalPayee?.name) {
        // Find other transactions with similar payee names (handles amounts in names)
        const similarTransactions = transactions.filter((t: Transaction) => {
          if (t.id === id || !t.payee?.name) return false;
          return arePayeesSimilar(t.payee.name, originalPayee.name);
        });

        if (similarTransactions.length > 0) {
          // Update the transaction first
          await updateTransactionMutation.mutateAsync({
            id: id,
            data: updateData,
          });

          // Get the new payee's default category if it has one
          const newPayeeDefaultCategoryId = newPayee?.defaultCategoryId ?? null;
          const newPayeeDefaultCategory = newPayeeDefaultCategoryId
            ? categories.find((c) => c.id === newPayeeDefaultCategoryId)
            : null;

          // Show bulk update dialog
          bulkPayeeUpdateDialog = {
            open: true,
            transactionId: id,
            payeeId: newPayeeId,
            payeeName: newPayee?.name || null,
            originalPayeeName: originalPayee.name,
            matchCount: similarTransactions.length,
            newPayeeDefaultCategoryId,
            newPayeeDefaultCategoryName: newPayeeDefaultCategory?.name ?? null,
            updateCategories: false, // Reset checkbox state
          };
          return;
        }
      }
    }

    // Check for category updates and find similar transactions
    if (actualField === 'categoryId') {
      const originalCategory = transaction.category;
      const newCategoryId = updateData.categoryId;
      const newCategory = categories.find((c) => c.id === newCategoryId);
      const payeeName = transaction.payee?.name;

      // Find matches by payee (always check if there's a payee, handles amounts in names)
      const matchesByPayee = payeeName
        ? transactions.filter((t: Transaction) => {
            if (t.id === id || !t.payee?.name) return false;
            return arePayeesSimilar(t.payee.name, payeeName);
          })
        : [];

      // Find matches by previous category (only if there was an original category)
      const matchesByCategory = originalCategory
        ? transactions.filter((t: Transaction) => {
            return t.id !== id && t.category?.id === originalCategory.id;
          })
        : [];

      // Show bulk update dialog if there are any matches
      if (matchesByPayee.length > 0 || matchesByCategory.length > 0) {
        // Update the transaction first
        await updateTransactionMutation.mutateAsync({
          id: id,
          data: updateData,
        });

        // Show bulk update dialog
        bulkCategoryUpdateDialog = {
          open: true,
          transactionId: id,
          categoryId: newCategoryId,
          categoryName: newCategory?.name || null,
          originalPayeeName: payeeName || '',
          matchCountByPayee: matchesByPayee.length,
          matchCountByCategory: matchesByCategory.length,
          previousCategoryId: originalCategory?.id ?? null,
        };
        return;
      }
    }

    // Regular update (no bulk update needed)
    const updatedTransactionsWithBalance = await updateTransactionMutation.mutateAsync({
      id: id,
      data: updateData,
    });

    if (
      Array.isArray(updatedTransactionsWithBalance) &&
      updatedTransactionsWithBalance.length > 0
    ) {
      const currentQueryParams = serverAccountState
        ? {
            sortBy: serverAccountState.filters.sortBy,
            sortOrder: serverAccountState.filters.sortOrder,
            ...(serverAccountState.filters.searchQuery && {
              searchQuery: serverAccountState.filters.searchQuery,
            }),
            ...(serverAccountState.filters.dateFrom && {
              dateFrom: serverAccountState.filters.dateFrom,
            }),
            ...(serverAccountState.filters.dateTo && { dateTo: serverAccountState.filters.dateTo }),
          }
        : undefined;

      const currentQuery = rpc.transactions.getAllAccountTransactionsWithUpcoming(
        Number(accountId),
        currentQueryParams
      );
      const currentData = queryClient.getQueryData(currentQuery.queryKey);

      if (Array.isArray(currentData)) {
        const updatedTransactionsMap = new Map(
          updatedTransactionsWithBalance.map((tx) => [tx.id, tx])
        );

        const newData = currentData.map((item) => {
          if (typeof item.id === 'number' && updatedTransactionsMap.has(item.id)) {
            return updatedTransactionsMap.get(item.id);
          }
          return item;
        });

        queryClient.setQueryData(currentQuery.queryKey, newData);
      }
    }
  } catch {
    // Error handled by mutation's error toast
  }
};

// Handle transfer conversion from payee selector - opens dialog for bulk conversion options
const handleTransferSelect = (transactionId: number, targetAccountId: number) => {
  const raw = transactions?.find((t: Transaction) => t.id === transactionId);
  if (!raw || !accountId) return;
  convertToTransferTransaction = formatTransaction(raw, { accountId: Number(accountId) });
  preselectedTransferAccountId = targetAccountId;
};

// Bulk delete transactions
// Bulk delete trigger — sets state which opens the dialog component.
const handleBulkDelete = (transactions: TransactionsFormat[]) => {
  if (transactions.length === 0) return;
  transactionsToDelete = transactions;
};

let previousAccountId = $state<string | undefined>();

$effect(() => {
  if (accountId && accountId + '' !== previousAccountId) {
    if (serverAccountState) {
      serverAccountState.pagination.page = 0;
      serverAccountState.filters.searchQuery = '';
    }
    previousAccountId = accountId + '';
  }
});
</script>

<svelte:head>
  <title>{accountData?.name ?? 'Account'} - Budget App</title>
  <meta name="description" content="Manage transactions and details for {accountData?.name ?? 'this account'}" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div
    class="flex items-center justify-between"
    data-help-id="account-page-header"
    data-help-title="Account Page"
    data-tour-id="account-header">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-bold tracking-tight">
          {account?.name || `Account ${accountId}`}
        </h1>
        {#if !isAccountNotFound}
          <div class="h-3 w-3 rounded-full bg-success" title="Active account"></div>
        {/if}
        {#if isDemoView}
          <Badge variant="outline" class="border-amber-300 text-warning">Demo</Badge>
        {/if}
      </div>
    </div>

  </div>

  <!-- Error State -->
  {#if isAccountNotFound}
    <div class="bg-danger-bg rounded-lg border border-destructive/20 p-4">
      <div class="flex items-center space-x-2">
        <div class="text-destructive">🔍</div>
        <div class="text-danger-fg font-medium">Account Not Found</div>
      </div>
      <p class="text-danger-fg mt-2">The account with ID {accountId} doesn't exist.</p>
      <div class="mt-4 flex items-center gap-3">
        <Button href="/accounts/new" class="bg-primary hover:bg-primary/90">
          <Plus class="mr-2 h-4 w-4" />
          Create Account
        </Button>
        <a href="/accounts" class="text-info underline hover:text-info/80">
          ← Go back to accounts list
        </a>
      </div>
    </div>
  {:else if error}
    <div class="bg-danger-bg rounded-lg border border-destructive/20 p-4">
      <div class="flex items-center space-x-2">
        <div class="text-destructive">⚠️</div>
        <div class="text-danger-fg font-medium">Error loading account data</div>
      </div>
      <p class="text-danger-fg mt-2">{error}</p>
    </div>
  {/if}

  <!-- Main Content (only show if account exists) -->
  {#if !isAccountNotFound}
    <!-- Tabs Structure - only show on page if header tabs disabled -->
    {#if showTabsOnPage}
      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        class="w-full">

        <div class="mb-3 flex items-center justify-between gap-2">
          <Select.Root
            type="single"
            value={activeTab}
            onValueChange={(value) => { if (value) setActiveTab(value as TabValue); }}>
            <Select.Trigger
              class="w-full sm:w-64"
              data-help-id="account-tabs"
              data-help-title="Account Sections">
              {mobileTabOptions.find((opt) => opt.value === activeTab)?.label ?? 'Select section'}
            </Select.Trigger>
            <Select.Content>
              {#each mobileTabOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          {#if activeTab === 'transactions'}
            {#if isHsaAccount}
              <Button
                onclick={handleAddExpense}
                data-help-id="add-expense-button"
                data-help-title="Add Medical Expense">
                <HeartPulse class="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            {:else}
              <Button
                onclick={() => (addTransactionDialogOpen = true)}
                data-help-id="add-transaction-button"
                data-help-title="Add Transaction"
                data-help-modal="add-transaction"
                data-tour-id="add-transaction-button">
                <Plus class="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            {/if}
          {/if}
        </div>

        <!-- Transactions Tab Content -->
        <Tabs.Content
          value="transactions"
          class="space-y-4"
          data-help-id="account-tab-transactions"
          data-help-title="Transactions Tab"
          data-tour-id="transactions-tab">
          <TransactionTableContainer
            {isLoading}
            transactions={Array.isArray(transactions) ? transactions : []}
            account={accountData}
            {categoriesState}
            {payeesState}
            views={data.views}
            {columns}
            {updateTransactionData}
            {searchTransactions}
            {budgetCount}
            accountId={accountId ?? 0}
            onScheduleClick={handleScheduleClick}
            onBulkDelete={handleBulkDelete}
            {transferAccounts}
            onTransferSelect={handleTransferSelect}
            bind:table />

          <!-- Add Transaction Dialog -->
          <AddTransactionDialog
            bind:open={addTransactionDialogOpen}
            account={account || null}
            payees={payees.map((p) => ({ id: p.id, name: p.name || 'Unknown Payee' }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name || 'Unknown Category' }))}
            onSubmit={submitTransaction} />
        </Tabs.Content>

        <!-- HSA Medical Expenses Tab Content -->
        {#if isHsaAccount}
          <Tabs.Content value="hsa-expenses" class="space-y-4">
            {#if accountData}
              <ExpenseTableContainer
                hsaAccountId={accountData.id}
                views={data.expenseViews || []}
                onEdit={handleEditExpense} />
            {/if}
          </Tabs.Content>

          <!-- HSA Dashboard Tab Content -->
          <Tabs.Content value="hsa-dashboard" class="space-y-4">
            {#if accountData}
              <HsaDashboard account={accountData} />
            {/if}
          </Tabs.Content>
        {/if}

        <!-- Utility Dashboard Tab Content -->
        {#if isUtilityAccount}
          <Tabs.Content value="utility-dashboard" class="space-y-4">
            {#if accountData}
              <UtilityDashboard account={accountData} />
            {/if}
          </Tabs.Content>
        {/if}

        <!-- Analytics Tab Content -->
        <Tabs.Content
          value="analytics"
          class="space-y-4"
          data-help-id="analytics-tab"
          data-help-title="Analytics Tab"
          data-tour-id="analytics-tab">
          {#if transactions && !isLoading && activeTab === 'analytics'}
            <AnalyticsDashboard
              transactions={formattedTransactions}
              accountId={accountId + ''}
              accountType={accountData?.accountType ?? undefined}
              account={accountData} />
          {:else if isLoading}
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
                <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
              </div>
              <div class="bg-muted h-100 animate-pulse rounded-lg"></div>
            </div>
          {/if}
        </Tabs.Content>

        <!-- Subscriptions Tab Content -->
        <Tabs.Content
          value="subscriptions"
          class="space-y-4"
          data-help-id="subscriptions-tab"
          data-help-title="Subscriptions Tab">
          {#if accountId && accountSlug && activeTab === 'subscriptions'}
            <SubscriptionsTab accountId={Number(accountId)} {accountSlug} />
          {/if}
        </Tabs.Content>

        <!-- Schedules Tab Content -->
        <Tabs.Content
          value="schedules"
          class="space-y-4"
          data-help-id="schedules-tab"
          data-help-title="Schedules Tab"
          data-tour-id="schedules-tab">
          {#if accountId && activeTab === 'schedules'}
            <SchedulesTab
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              {isDemoView} />
          {/if}
        </Tabs.Content>

        <!-- Budgets Tab Content -->
        <Tabs.Content
          value="budgets"
          class="space-y-4"
          data-help-id="budgets-tab"
          data-help-title="Budgets Tab"
          data-tour-id="budgets-tab">
          {#if accountId && activeTab === 'budgets'}
            <BudgetsTab
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              {isDemoView} />
          {/if}
        </Tabs.Content>

        <!-- Import Tab Content -->
        <Tabs.Content
          value="import"
          class=""
          data-help-id="import-tab"
          data-help-title="Import Tab"
          data-tour-id="import-tab">
          {#if accountData && accountId && activeTab === 'import'}
            <ImportTab
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              accountName={accountData.name || 'Account'} />
          {/if}
        </Tabs.Content>

        <!-- Intelligence Tab Content -->
        <Tabs.Content
          value="intelligence"
          class=""
          data-help-id="intelligence-tab"
          data-help-title="Intelligence Tab"
          data-tour-id="intelligence-tab">
          {#if accountId && accountSlug && activeTab === 'intelligence'}
            <IntelligenceTab {accountId} {accountSlug} />
          {/if}
        </Tabs.Content>

        <!-- Automation Tab Content -->
        <Tabs.Content
          value="automation"
          class=""
          data-help-id="automation-tab"
          data-help-title="Automation Tab">
          {#if accountId && accountSlug && activeTab === 'automation'}
            <AutomationTab accountId={Number(accountId)} {accountSlug} />
          {/if}
        </Tabs.Content>

        <!-- Documents Tab Content -->
        <Tabs.Content
          value="documents"
          class=""
          data-help-id="account-documents-tab"
          data-help-title="Documents Tab">
          {#if accountId && accountData && activeTab === 'documents'}
            <DocumentsTab
              accountId={Number(accountId)}
              accountName={accountData.name || 'Account'} />
          {/if}
        </Tabs.Content>

        <!-- Settings Tab Content -->
        <Tabs.Content
          value="settings"
          class=""
          data-help-id="account-settings-tab"
          data-help-title="Account Settings"
          data-tour-id="settings-tab">
          {#if accountData && activeTab === 'settings'}
            <SettingsTab account={accountData} />
          {/if}
        </Tabs.Content>
      </Tabs.Root>
    {:else}
      <!-- Content rendered directly when tabs are in header -->
      <div class="space-y-4">
        {#if activeTab === 'transactions'}
          <TransactionTableContainer
            {isLoading}
            transactions={Array.isArray(transactions) ? transactions : []}
            account={accountData}
            {categoriesState}
            {payeesState}
            views={data.views}
            {columns}
            {updateTransactionData}
            {searchTransactions}
            {budgetCount}
            accountId={accountId ?? 0}
            onScheduleClick={handleScheduleClick}
            onBulkDelete={handleBulkDelete}
            {transferAccounts}
            onTransferSelect={handleTransferSelect}
            bind:table />

          <AddTransactionDialog
            bind:open={addTransactionDialogOpen}
            account={account || null}
            payees={payees.map((p) => ({ id: p.id, name: p.name || 'Unknown Payee' }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name || 'Unknown Category' }))}
            onSubmit={submitTransaction} />
        {:else if activeTab === 'hsa-expenses' && isHsaAccount && accountData}
          <ExpenseTableContainer
            hsaAccountId={accountData.id}
            views={data.expenseViews || []}
            onEdit={handleEditExpense} />
        {:else if activeTab === 'hsa-dashboard' && isHsaAccount && accountData}
          <HsaDashboard account={accountData} />
        {:else if activeTab === 'utility-dashboard' && isUtilityAccount && accountData}
          <UtilityDashboard account={accountData} />
        {:else if activeTab === 'analytics'}
          {#if transactions && !isLoading}
            <AnalyticsDashboard
              transactions={formattedTransactions}
              accountId={accountId + ''}
              accountType={accountData?.accountType ?? undefined}
              account={accountData} />
          {:else if isLoading}
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
                <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
              </div>
              <div class="bg-muted h-100 animate-pulse rounded-lg"></div>
            </div>
          {/if}
        {:else if activeTab === 'subscriptions'}
          {#if accountId && accountSlug}
            <SubscriptionsTab accountId={Number(accountId)} {accountSlug} />
          {/if}
        {:else if activeTab === 'schedules'}
          {#if accountId}
            <SchedulesTab
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              {isDemoView} />
          {/if}
        {:else if activeTab === 'budgets'}
          {#if accountId}
            <BudgetsTab
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              {isDemoView} />
          {/if}
        {:else if activeTab === 'documents'}
          {#if accountId && accountData}
            <DocumentsTab
              accountId={Number(accountId)}
              accountName={accountData.name || 'Account'} />
          {/if}
        {:else if activeTab === 'import'}
          {#if accountData && accountId}
            <ImportTab
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              accountName={accountData.name || 'Account'} />
          {/if}
        {:else if activeTab === 'intelligence'}
          {#if accountId && accountSlug}
            <IntelligenceTab {accountId} {accountSlug} />
          {/if}
        {:else if activeTab === 'automation'}
          {#if accountId && accountSlug}
            <AutomationTab accountId={Number(accountId)} {accountSlug} />
          {/if}
        {:else if activeTab === 'settings'}
          {#if accountData}
            <SettingsTab account={accountData} />
          {/if}
        {/if}
      </div>
    {/if}

    <BulkDeleteTransactionsDialog bind:transactions={transactionsToDelete} {accountId} />

    <SchedulePreviewController bind:transaction={scheduleSheetTransaction} />

    <ConvertToTransferController
      transaction={convertToTransferTransaction}
      preselectedAccountId={preselectedTransferAccountId}
      onClose={() => {
        convertToTransferTransaction = null;
        preselectedTransferAccountId = undefined;
      }} />

    {#if isHsaAccount && accountData}
      <HsaExpenseSheet
        hsaAccountId={accountData.id}
        bind:expense={editingExpense}
        bind:mode={expenseSheetMode} />
    {/if}

    <BulkUpdateDialogs
      bind:payeeDialog={bulkPayeeUpdateDialog}
      bind:categoryDialog={bulkCategoryUpdateDialog}
      {accountId} />
  {/if}

</div>
