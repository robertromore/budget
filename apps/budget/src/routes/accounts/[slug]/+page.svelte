<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button, buttonVariants } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import * as Tabs from '$lib/components/ui/tabs';
import type { Transaction } from '$lib/schema';
import type { Schedule } from '$lib/schema/schedules';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import { CategoriesState, PayeesState, SchedulesState } from '$lib/states/entities';
import { deleteScheduleDialog, deleteScheduleId } from '$lib/states/ui/global.svelte';
import { ServerAccountState } from '$lib/states/views';
import type { TransactionsFormat } from '$lib/types';
import { parseDate } from '@internationalized/date';
import Brain from '@lucide/svelte/icons/brain';
import Calendar from '@lucide/svelte/icons/calendar';
import ChartLine from '@lucide/svelte/icons/chart-line';
import FileText from '@lucide/svelte/icons/file-text';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import List from '@lucide/svelte/icons/list';
import Plus from '@lucide/svelte/icons/plus';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Upload from '@lucide/svelte/icons/upload';
import Wallet from '@lucide/svelte/icons/wallet';
import Wand from '@lucide/svelte/icons/wand';
import type { Table as TanStackTable } from '@tanstack/table-core';
// Local component imports
import { goto } from '$app/navigation';
import { page } from '$app/state';
import DebtAccountMetrics from '$lib/components/accounts/debt-account-metrics.svelte';
import BudgetRecommendationsPanel from '$lib/components/budgets/budget-recommendations-panel.svelte';
import ScheduleRecommendationsPanel from '$lib/components/schedules/schedule-recommendations-panel.svelte';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { rpc } from '$lib/query';
import { getByAccount as getBudgetsByAccount } from '$lib/query/budgets';
import { getByAccount as getSchedulesByAccount } from '$lib/query/schedules';
import { isDebtAccount } from '$lib/schema/accounts';
import { headerActionsMode } from '$lib/stores/header-actions.svelte';
import { getPageTabsContext } from '$lib/stores/page-tabs.svelte';
import { arePayeesSimilar } from '$lib/utils/payee-matching';
import { useQueryClient } from '@tanstack/svelte-query';
import { onDestroy } from 'svelte';
import {
  AddTransactionDialog,
  ExpenseTableContainer,
  ExpenseWizard,
  HsaDashboard,
  ImportTab,
  IntelligenceTab,
  MedicalExpenseForm,
  SettingsTab,
  TransactionTableContainer,
} from './(components)';
import AccountBudgetsTable from './(components)/account-budgets-table.svelte';
import AccountSchedulesTable from './(components)/account-schedules-table.svelte';
import AnalyticsDashboard from './(components)/analytics-dashboard.svelte';
import SchedulePreviewSheet from './(components)/schedule-preview-sheet.svelte';
import { columns } from './(data)/columns.svelte';

// Define valid tab values
const tabValues = [
  'transactions',
  'hsa-expenses',
  'hsa-dashboard',
  'analytics',
  'intelligence',
  'schedules',
  'budgets',
  'import',
  'settings',
] as const;
type TabValue = (typeof tabValues)[number];

let { data } = $props();

// Get account slug from URL parameter
const accountSlug = $derived(data.accountSlug);

// Fetch account by slug to get ID for queries
const accountQuery = $derived(
  accountSlug ? rpc.accounts.getAccountDetail(accountSlug).options() : undefined
);
const accountData = $derived(accountQuery?.data);
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
  const url = new URL(page.url);
  if (value === 'transactions') {
    url.searchParams.delete('tab');
  } else {
    url.searchParams.set('tab', value);
  }
  goto(url.toString(), { replaceState: false, noScroll: true, keepFocus: true });
}

// Register tabs for header display
const pageTabsContext = getPageTabsContext();
const showTabsOnPage = $derived(headerActionsMode.tabsMode === 'off');

// Keep tabs context updated reactively
$effect(() => {
  if (pageTabsContext) {
    pageTabsContext.register({
      tabs: [
        { id: 'transactions', label: 'Transactions', icon: List },
        { id: 'hsa-expenses', label: 'Medical Expenses', condition: isHsaAccount },
        { id: 'hsa-dashboard', label: 'HSA Dashboard', condition: isHsaAccount },
        { id: 'analytics', label: 'Analytics', icon: ChartLine },
        { id: 'intelligence', label: 'Intelligence', icon: Brain },
        { id: 'schedules', label: 'Schedules', icon: Calendar },
        { id: 'budgets', label: 'Budgets', icon: Wallet },
        { id: 'import', label: 'Import', icon: Upload, condition: !isHsaAccount },
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
const transactionsQuery = $derived.by(() => {
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
  accountId ? rpc.transactions.getAccountSummary(Number(accountId)).options() : undefined
);
const budgetCountQuery = $derived(rpc.budgets.getBudgetCount().options());
const schedulesQuery = $derived(
  accountId ? getSchedulesByAccount(Number(accountId)).options() : undefined
);
const schedules = $derived(schedulesQuery?.data ?? []);
const budgetsQuery = $derived(
  accountId ? getBudgetsByAccount(Number(accountId)).options() : undefined
);
const budgets = $derived(budgetsQuery?.data ?? []);

// Create the mutations once
const updateTransactionMutation = rpc.transactions.updateTransactionWithBalance.options();
const saveTransactionMutation = rpc.transactions.saveTransaction.options();
const bulkDeleteTransactionsMutation = rpc.transactions.bulkDeleteTransactions.options();
const bulkUpdatePayeeMutation = rpc.transactions.bulkUpdatePayee.options();
const bulkUpdateCategoryMutation = rpc.transactions.bulkUpdateCategory.options();

// Budget mutations
const duplicateBudgetMutation = rpc.budgets.duplicateBudget.options();
const updateBudgetMutation = rpc.budgets.updateBudget.options();
const deleteBudgetMutation = rpc.budgets.deleteBudget.options();
const bulkDeleteBudgetsMutation = rpc.budgets.bulkDeleteBudgets.options();
const bulkArchiveBudgetsMutation = rpc.budgets.bulkArchiveBudgets.options();

const queryClient = useQueryClient();

// Derived state from TanStack Query with proper reactivity
const transactions = $derived.by(() => {
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
  const summaryError = summaryQuery ? summaryQuery.error : undefined;
  const transactionsError = transactionsQuery ? transactionsQuery?.error : undefined;
  return (
    summaryError?.message?.includes('NOT_FOUND') ||
    transactionsError?.message?.includes('NOT_FOUND')
  );
});
const summary = $derived(summaryQuery ? summaryQuery.data : undefined);
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
let bulkDeleteDialogOpen = $state(false);
let transactionsToDelete = $state<TransactionsFormat[]>([]);
let isDeletingBulk = $state(false);

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
let addExpenseOpen = $state(false);
let useWizard = $state(true); // Default to wizard for new expenses
let editingExpense = $state<any | null>(null);

function handleEditExpense(expense: any) {
  editingExpense = expense;
  useWizard = false; // Use regular form for editing
  addExpenseOpen = true;
}

function handleAddExpense() {
  editingExpense = null;
  useWizard = true; // Use wizard for new expenses
  addExpenseOpen = true;
}

// Schedule preview state
let schedulePreviewOpen = $state(false);
let selectedScheduleTransaction = $state<TransactionsFormat | null>(null);

// Recommendations state
let budgetRecommendationsSheetOpen = $state(false);
let scheduleRecommendationsSheetOpen = $state(false);

// Transform data for tables
const formattedTransactions = $derived.by(() => {
  const currentTransactions = transactions;
  if (
    !currentTransactions ||
    !Array.isArray(currentTransactions) ||
    currentTransactions.length === 0
  ) {
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
  } catch (err: any) {
    console.error('Failed to update transaction:', err);
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
      .filter((t) => typeof t.id === 'number')
      .map((t) => t.id as number);

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

// Bulk payee update handlers
const confirmBulkPayeeUpdate = async () => {
  if (!bulkPayeeUpdateDialog.transactionId || !accountId) return;

  try {
    // Update payees for similar transactions
    await bulkUpdatePayeeMutation.mutateAsync({
      accountId: Number(accountId),
      transactionId: bulkPayeeUpdateDialog.transactionId,
      newPayeeId: bulkPayeeUpdateDialog.payeeId,
      originalPayeeName: bulkPayeeUpdateDialog.originalPayeeName,
    });

    // Also update categories if the user opted in and there's a default category
    if (
      bulkPayeeUpdateDialog.updateCategories &&
      bulkPayeeUpdateDialog.newPayeeDefaultCategoryId
    ) {
      // Update the original transaction's category first
      await updateTransactionMutation.mutateAsync({
        id: bulkPayeeUpdateDialog.transactionId,
        data: { categoryId: bulkPayeeUpdateDialog.newPayeeDefaultCategoryId },
      });

      // Then update similar transactions' categories via bulk mutation
      await bulkUpdateCategoryMutation.mutateAsync({
        accountId: Number(accountId),
        transactionId: bulkPayeeUpdateDialog.transactionId,
        newCategoryId: bulkPayeeUpdateDialog.newPayeeDefaultCategoryId,
        matchBy: 'payee',
        // matchValue will use the payee from the transaction
      });
    }

    bulkPayeeUpdateDialog.open = false;
  } catch (error) {
    console.error('Failed to bulk update payee:', error);
  }
};

const cancelBulkPayeeUpdate = () => {
  bulkPayeeUpdateDialog.open = false;
};

// Bulk category update handlers
const confirmBulkCategoryUpdateByPayee = async () => {
  if (!bulkCategoryUpdateDialog.transactionId || !accountId) return;

  try {
    await bulkUpdateCategoryMutation.mutateAsync({
      accountId: Number(accountId),
      transactionId: bulkCategoryUpdateDialog.transactionId,
      newCategoryId: bulkCategoryUpdateDialog.categoryId,
      matchBy: 'payee',
    });

    bulkCategoryUpdateDialog.open = false;
  } catch (error) {
    console.error('Failed to bulk update category by payee:', error);
  }
};

const confirmBulkCategoryUpdateByCategory = async () => {
  if (!bulkCategoryUpdateDialog.transactionId || !accountId) return;

  try {
    await bulkUpdateCategoryMutation.mutateAsync({
      accountId: Number(accountId),
      transactionId: bulkCategoryUpdateDialog.transactionId,
      newCategoryId: bulkCategoryUpdateDialog.categoryId,
      matchBy: 'category',
      ...(bulkCategoryUpdateDialog.previousCategoryId && {
        matchValue: bulkCategoryUpdateDialog.previousCategoryId,
      }),
    });

    bulkCategoryUpdateDialog.open = false;
  } catch (error) {
    console.error('Failed to bulk update category by category:', error);
  }
};

const confirmBulkCategoryUpdateJustOne = () => {
  bulkCategoryUpdateDialog.open = false;
};

const cancelBulkCategoryUpdate = () => {
  bulkCategoryUpdateDialog.open = false;
};

// Schedule action handlers
const viewSchedule = (schedule: Schedule) => {
  goto(`/schedules/${schedule.slug}`);
};

const editSchedule = (schedule: Schedule) => {
  goto(`/schedules/${schedule.slug}/edit`);
};

const deleteSchedule = (schedule: Schedule) => {
  deleteScheduleId.current = schedule.id;
  deleteScheduleDialog.setTrue();
};

const bulkDeleteSchedules = async (schedulesList: Schedule[]) => {
  // For now, handle first schedule using the global delete dialog
  // Could be enhanced with bulk delete mutation later
  const firstSchedule = schedulesList[0];
  if (firstSchedule) {
    deleteScheduleId.current = firstSchedule.id;
    deleteScheduleDialog.setTrue();
  }
};

// Budget action handlers
const viewBudget = (budget: BudgetWithRelations) => {
  goto(`/budgets/${budget.slug}`);
};

const editBudget = (budget: BudgetWithRelations) => {
  goto(`/budgets/${budget.slug}/edit`);
};

const handleDuplicateBudget = async (budget: BudgetWithRelations) => {
  try {
    await duplicateBudgetMutation.mutateAsync({ id: budget.id });
  } catch (error) {
    console.error('Failed to duplicate budget:', error);
  }
};

const archiveBudget = async (budget: BudgetWithRelations) => {
  try {
    await updateBudgetMutation.mutateAsync({ id: budget.id, data: { status: 'archived' } });
  } catch (error) {
    console.error('Failed to archive budget:', error);
  }
};

const handleDeleteBudget = async (budget: BudgetWithRelations) => {
  try {
    await deleteBudgetMutation.mutateAsync(budget.id);
  } catch (error) {
    console.error('Failed to delete budget:', error);
  }
};

const bulkDeleteBudgets = async (budgetsList: BudgetWithRelations[]) => {
  try {
    await bulkDeleteBudgetsMutation.mutateAsync(budgetsList.map((b) => b.id));
  } catch (error) {
    console.error('Failed to bulk delete budgets:', error);
  }
};

const bulkArchiveBudgets = async (budgetsList: BudgetWithRelations[]) => {
  try {
    await bulkArchiveBudgetsMutation.mutateAsync(budgetsList.map((b) => b.id));
  } catch (error) {
    console.error('Failed to bulk archive budgets:', error);
  }
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

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between" data-help-id="account-page-header" data-help-title="Account Page">
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

    <!-- Action Buttons (only show on transactions tab) -->
    {#if !isAccountNotFound && activeTab === 'transactions'}
      <div class="flex items-center space-x-2">

        {#if isHsaAccount}
          <Button onclick={handleAddExpense} data-help-id="add-expense-button" data-help-title="Add Medical Expense">
            <HeartPulse class="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        {:else}
          <Button onclick={() => (addTransactionDialogOpen = true)} data-help-id="add-transaction-button" data-help-title="Add Transaction" data-help-modal="add-transaction">
            <Plus class="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        {/if}
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
        <a href="/accounts" class="text-blue-600 underline hover:text-blue-800">
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
    <!-- Tabs Structure - only show on page if header tabs disabled -->
    {#if showTabsOnPage}
      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        class="tabs-connected w-full"
      >
        <Tabs.List class="tabs-connected-list">
          <Tabs.Trigger value="transactions" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-transactions" data-help-title="Transactions Tab">
            <List class="mr-2 h-4 w-4" />
            Transactions
          </Tabs.Trigger>
          {#if isHsaAccount}
            <Tabs.Trigger value="hsa-expenses" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-hsa-expenses" data-help-title="Medical Expenses Tab"
              >Medical Expenses</Tabs.Trigger>
            <Tabs.Trigger value="hsa-dashboard" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-hsa-dashboard" data-help-title="HSA Dashboard Tab"
              >HSA Dashboard</Tabs.Trigger>
          {/if}
          <Tabs.Trigger value="analytics" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-analytics" data-help-title="Analytics Tab">
            <ChartLine class="mr-2 h-4 w-4" />
            Analytics
          </Tabs.Trigger>
          <Tabs.Trigger value="intelligence" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-intelligence" data-help-title="Intelligence Tab">
            <Brain class="mr-2 h-4 w-4" />
            Intelligence
          </Tabs.Trigger>
          <Tabs.Trigger value="schedules" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-schedules" data-help-title="Schedules Tab">
            <Calendar class="mr-2 h-4 w-4" />
            Schedules
          </Tabs.Trigger>
          <Tabs.Trigger value="budgets" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-budgets" data-help-title="Budgets Tab">
            <Wallet class="mr-2 h-4 w-4" />
            Budgets
          </Tabs.Trigger>
          {#if !isHsaAccount}
            <Tabs.Trigger value="import" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-import" data-help-title="Import Tab">
              <Upload class="mr-2 h-4 w-4" />
              Import
            </Tabs.Trigger>
          {/if}
          <Tabs.Trigger value="settings" class="tabs-connected-trigger px-6 font-medium" data-help-id="account-tab-settings" data-help-title="Settings Tab">
            <SlidersHorizontal class="mr-2 h-4 w-4" />
            Settings
          </Tabs.Trigger>
        </Tabs.List>

        <!-- Transactions Tab Content -->
        <Tabs.Content value="transactions" class="tabs-connected-content space-y-4">
        <TransactionTableContainer
          {isLoading}
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
          payees={payees.map((p) => ({ id: p.id, name: p.name || 'Unknown Payee' }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name || 'Unknown Category' }))}
          onSubmit={submitTransaction} />
      </Tabs.Content>

      <!-- HSA Medical Expenses Tab Content -->
      {#if isHsaAccount}
        <Tabs.Content value="hsa-expenses" class="tabs-connected-content space-y-4">
          {#if accountData}
            <ExpenseTableContainer
              hsaAccountId={accountData.id}
              views={data.expenseViews || []}
              onEdit={handleEditExpense} />
          {/if}
        </Tabs.Content>

        <!-- HSA Dashboard Tab Content -->
        <Tabs.Content value="hsa-dashboard" class="tabs-connected-content space-y-4">
          {#if accountData}
            <HsaDashboard account={accountData} />
          {/if}
        </Tabs.Content>
      {/if}

      <!-- Analytics Tab Content -->
      <Tabs.Content value="analytics" class="tabs-connected-content space-y-4" data-help-id="analytics-tab" data-help-title="Analytics Tab">
        {#if transactions && !isLoading && activeTab === 'analytics'}
          {#if accountData && accountData.accountType && isDebtAccount(accountData.accountType)}
            <!-- Credit Card Metrics Dashboard -->
            <DebtAccountMetrics account={accountData} transactions={formattedTransactions} />
          {:else}
            <!-- Standard Analytics Dashboard -->
            <AnalyticsDashboard transactions={formattedTransactions} accountId={accountId + ''} />
          {/if}
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

      <!-- Schedules Tab Content -->
      <Tabs.Content value="schedules" class="tabs-connected-content space-y-4" data-help-id="schedules-tab" data-help-title="Schedules Tab">
        {#if schedules && !isLoading && activeTab === 'schedules'}
          <div class="flex items-center justify-between">
            <div></div>
            <Button variant="outline" onclick={() => (scheduleRecommendationsSheetOpen = true)}>
              <Sparkles class="mr-2 h-4 w-4" />
              Recommendations
            </Button>
          </div>
          <AccountSchedulesTable
            {schedules}
            accountId={Number(accountId)}
            accountSlug={accountSlug || ''}
            onView={viewSchedule}
            onEdit={editSchedule}
            onDelete={deleteSchedule}
            onBulkDelete={bulkDeleteSchedules} />
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

      <!-- Budgets Tab Content -->
      <Tabs.Content value="budgets" class="tabs-connected-content space-y-4" data-help-id="budgets-tab" data-help-title="Budgets Tab">
        {#if budgets && !isLoading && activeTab === 'budgets'}
          <div class="flex items-center justify-between">
            <div></div>
            <Button variant="outline" onclick={() => (budgetRecommendationsSheetOpen = true)}>
              <Sparkles class="mr-2 h-4 w-4" />
              Recommendations
            </Button>
          </div>
          <AccountBudgetsTable
            {budgets}
            accountId={Number(accountId)}
            accountSlug={accountSlug || ''}
            onView={viewBudget}
            onEdit={editBudget}
            onDuplicate={handleDuplicateBudget}
            onArchive={archiveBudget}
            onDelete={handleDeleteBudget}
            onBulkDelete={bulkDeleteBudgets}
            onBulkArchive={bulkArchiveBudgets} />
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

      <!-- Import Tab Content -->
      {#if !isHsaAccount}
        <Tabs.Content value="import" class="tabs-connected-content" data-help-id="import-tab" data-help-title="Import Tab">
          {#if accountData && accountId && activeTab === 'import'}
            <ImportTab
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              accountName={accountData.name || 'Account'} />
          {/if}
        </Tabs.Content>
      {/if}

      <!-- Intelligence Tab Content -->
      <Tabs.Content value="intelligence" class="tabs-connected-content" data-help-id="intelligence-tab" data-help-title="Intelligence Tab">
        {#if accountId && accountSlug && activeTab === 'intelligence'}
          <IntelligenceTab accountId={accountId} {accountSlug} />
        {/if}
      </Tabs.Content>

      <!-- Settings Tab Content -->
      <Tabs.Content value="settings" class="tabs-connected-content" data-help-id="account-settings-tab" data-help-title="Account Settings">
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
        {:else if activeTab === 'analytics'}
          {#if transactions && !isLoading}
            {#if accountData && accountData.accountType && isDebtAccount(accountData.accountType)}
              <DebtAccountMetrics account={accountData} transactions={formattedTransactions} />
            {:else}
              <AnalyticsDashboard transactions={formattedTransactions} accountId={accountId + ''} />
            {/if}
          {:else if isLoading}
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
                <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
              </div>
              <div class="bg-muted h-100 animate-pulse rounded-lg"></div>
            </div>
          {/if}
        {:else if activeTab === 'schedules'}
          {#if schedules && !isLoading}
            <div class="flex items-center justify-between">
              <div></div>
              <Button variant="outline" onclick={() => (scheduleRecommendationsSheetOpen = true)}>
                <Sparkles class="mr-2 h-4 w-4" />
                Recommendations
              </Button>
            </div>
            <AccountSchedulesTable
              {schedules}
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              onView={viewSchedule}
              onEdit={editSchedule}
              onDelete={deleteSchedule}
              onBulkDelete={bulkDeleteSchedules} />
          {:else if isLoading}
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
                <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
              </div>
              <div class="bg-muted h-100 animate-pulse rounded-lg"></div>
            </div>
          {/if}
        {:else if activeTab === 'budgets'}
          {#if budgets && !isLoading}
            <div class="flex items-center justify-between">
              <div></div>
              <Button variant="outline" onclick={() => (budgetRecommendationsSheetOpen = true)}>
                <Sparkles class="mr-2 h-4 w-4" />
                Recommendations
              </Button>
            </div>
            <AccountBudgetsTable
              {budgets}
              accountId={Number(accountId)}
              accountSlug={accountSlug || ''}
              onView={viewBudget}
              onEdit={editBudget}
              onDuplicate={handleDuplicateBudget}
              onArchive={archiveBudget}
              onDelete={handleDeleteBudget}
              onBulkDelete={bulkDeleteBudgets}
              onBulkArchive={bulkArchiveBudgets} />
          {:else if isLoading}
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="bg-muted h-8 w-48 animate-pulse rounded"></div>
                <div class="bg-muted h-10 w-64 animate-pulse rounded"></div>
              </div>
              <div class="bg-muted h-100 animate-pulse rounded-lg"></div>
            </div>
          {/if}
        {:else if activeTab === 'import' && !isHsaAccount}
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
        {:else if activeTab === 'settings'}
          {#if accountData}
            <SettingsTab account={accountData} />
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Bulk Delete Confirmation Dialog -->
    <AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title
            >Delete {transactionsToDelete.length} Transaction{transactionsToDelete.length > 1
              ? 's'
              : ''}</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to delete {transactionsToDelete.length} transaction{transactionsToDelete.length >
            1
              ? 's'
              : ''}? This action cannot be undone.
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

    <!-- Schedule Preview Sheet -->
    <SchedulePreviewSheet
      bind:open={schedulePreviewOpen}
      scheduleId={selectedScheduleTransaction?.scheduleId}
      scheduleSlug={selectedScheduleTransaction?.scheduleSlug}
      scheduleName={selectedScheduleTransaction?.scheduleName}
      amount={selectedScheduleTransaction?.amount}
      frequency={selectedScheduleTransaction?.scheduleFrequency}
      interval={selectedScheduleTransaction?.scheduleInterval}
      nextOccurrence={selectedScheduleTransaction?.scheduleNextOccurrence}
      occurrenceDate={selectedScheduleTransaction?.date instanceof Date
        ? selectedScheduleTransaction.date.toISOString().split('T')[0]
        : typeof selectedScheduleTransaction?.date === 'string'
          ? selectedScheduleTransaction.date
          : undefined} />

    <!-- HSA Add/Edit Expense Sheet -->
    {#if isHsaAccount && accountData}
      <ResponsiveSheet bind:open={addExpenseOpen}>
        {#snippet header()}
          <div class="space-y-2">
            <h2 class="text-lg font-semibold">
              {editingExpense ? 'Edit Medical Expense' : 'Add Medical Expense'}
            </h2>
            <p class="text-muted-foreground text-sm">
              {editingExpense
                ? 'Update the medical expense details'
                : useWizard
                  ? 'Follow the guided wizard to add your expense'
                  : 'Add a new medical expense to your HSA account'}
            </p>
          </div>
        {/snippet}
        {#snippet content()}
          {#if editingExpense}
            <!-- Editing uses regular form only -->
            <MedicalExpenseForm
              hsaAccountId={accountData.id}
              accountId={accountData.id}
              existingExpense={editingExpense}
              onSuccess={() => {
                addExpenseOpen = false;
                editingExpense = null;
              }}
              onCancel={() => {
                addExpenseOpen = false;
                editingExpense = null;
              }} />
          {:else}
            <!-- Adding new expense: tabs for wizard vs manual -->
            <div class="space-y-6">
              <Tabs.Root
                value={useWizard ? 'wizard' : 'manual'}
                onValueChange={(value) => {
                  useWizard = value === 'wizard';
                }}>
                <Tabs.List class="grid w-full grid-cols-2">
                  <Tabs.Trigger value="wizard" class="flex items-center gap-2">
                    <Wand class="h-4 w-4" />
                    Guided Setup
                    <Badge variant="secondary" class="text-xs">Helpful</Badge>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="manual" class="flex items-center gap-2">
                    <FileText class="h-4 w-4" />
                    Manual Form
                    <Badge variant="secondary" class="text-xs">Quick</Badge>
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="wizard" class="mt-6">
                  <div class="bg-muted/20 border-muted mb-4 rounded-lg border p-4">
                    <p class="text-muted-foreground text-sm">
                      Step-by-step guided setup. We'll walk you through each option with clear
                      instructions.
                    </p>
                  </div>
                  <ExpenseWizard
                    hsaAccountId={accountData.id}
                    accountId={accountData.id}
                    onSuccess={() => {
                      addExpenseOpen = false;
                    }}
                    onCancel={() => {
                      addExpenseOpen = false;
                    }} />
                </Tabs.Content>

                <Tabs.Content value="manual" class="mt-6">
                  <div class="bg-muted/20 border-muted mb-4 rounded-lg border p-4">
                    <p class="text-muted-foreground text-sm">
                      Fill out the form directly if you're familiar with the options. Switch to <strong
                        >Guided Setup</strong> for step-by-step help.
                    </p>
                  </div>
                  <MedicalExpenseForm
                    hsaAccountId={accountData.id}
                    accountId={accountData.id}
                    onSuccess={() => {
                      addExpenseOpen = false;
                    }}
                    onCancel={() => {
                      addExpenseOpen = false;
                    }} />
                </Tabs.Content>
              </Tabs.Root>
            </div>
          {/if}
        {/snippet}
      </ResponsiveSheet>
    {/if}

    <!-- Bulk Payee Update Dialog -->
    <AlertDialog.Root bind:open={bulkPayeeUpdateDialog.open}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Update Similar Transactions?</AlertDialog.Title>
          <AlertDialog.Description>
            Found {bulkPayeeUpdateDialog.matchCount} other transaction{bulkPayeeUpdateDialog.matchCount !==
            1
              ? 's'
              : ''} with payee "{bulkPayeeUpdateDialog.originalPayeeName}".
            <br /><br />
            Would you like to update {bulkPayeeUpdateDialog.matchCount !== 1 ? 'them' : 'it'} to payee
            "{bulkPayeeUpdateDialog.payeeName || 'None'}" as well?
          </AlertDialog.Description>
        </AlertDialog.Header>

        <!-- Category update option -->
        {#if bulkPayeeUpdateDialog.newPayeeDefaultCategoryId}
          <div class="flex items-start gap-3 rounded-lg border bg-muted/50 p-3">
            <Checkbox
              id="update-categories"
              checked={bulkPayeeUpdateDialog.updateCategories}
              onCheckedChange={(checked) => {
                bulkPayeeUpdateDialog.updateCategories = checked === true;
              }}
            />
            <div class="grid gap-1.5 leading-none">
              <Label
                for="update-categories"
                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Also update category to "{bulkPayeeUpdateDialog.newPayeeDefaultCategoryName}"
              </Label>
              <p class="text-xs text-muted-foreground">
                Apply the new payee's default category to these transactions
              </p>
            </div>
          </div>
        {/if}

        <AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
          <AlertDialog.Action onclick={confirmBulkPayeeUpdate} class="w-full">
            Yes, Update All Similar ({bulkPayeeUpdateDialog.matchCount + 1} transactions)
          </AlertDialog.Action>
          <AlertDialog.Cancel onclick={cancelBulkPayeeUpdate} class="w-full">
            No, Just This One
          </AlertDialog.Cancel>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>

    <!-- Bulk Category Update Dialog -->
    <AlertDialog.Root bind:open={bulkCategoryUpdateDialog.open}>
      <AlertDialog.Content class="max-w-2xl">
        <AlertDialog.Header>
          <AlertDialog.Title>Update Similar Transactions?</AlertDialog.Title>
          <AlertDialog.Description class="space-y-3">
            {#if bulkCategoryUpdateDialog.categoryName}
              <p>
                You're changing the category to "<strong
                  >{bulkCategoryUpdateDialog.categoryName}</strong
                >". How would you like to apply this change?
              </p>
            {:else}
              <p>
                You're <strong>removing the category</strong> from this transaction. How would you like
                to apply this change?
              </p>
            {/if}

            {#if bulkCategoryUpdateDialog.matchCountByPayee > 0 && bulkCategoryUpdateDialog.matchCountByCategory > 0}
              <div class="space-y-2 text-sm">
                <p>
                  • <strong>{bulkCategoryUpdateDialog.matchCountByPayee}</strong> other transaction{bulkCategoryUpdateDialog.matchCountByPayee !==
                  1
                    ? 's'
                    : ''} with the same payee "<strong
                    >{bulkCategoryUpdateDialog.originalPayeeName}</strong
                  >"
                </p>
                <p>
                  • <strong>{bulkCategoryUpdateDialog.matchCountByCategory}</strong> other
                  transaction{bulkCategoryUpdateDialog.matchCountByCategory !== 1 ? 's' : ''} with the
                  same previous category
                </p>
              </div>
            {:else if bulkCategoryUpdateDialog.matchCountByPayee > 0}
              <p class="text-sm">
                Found <strong>{bulkCategoryUpdateDialog.matchCountByPayee}</strong> other
                transaction{bulkCategoryUpdateDialog.matchCountByPayee !== 1 ? 's' : ''} with the same
                payee "<strong>{bulkCategoryUpdateDialog.originalPayeeName}</strong>".
              </p>
            {:else if bulkCategoryUpdateDialog.matchCountByCategory > 0}
              <p class="text-sm">
                Found <strong>{bulkCategoryUpdateDialog.matchCountByCategory}</strong> other
                transaction{bulkCategoryUpdateDialog.matchCountByCategory !== 1 ? 's' : ''} with the
                same previous category.
              </p>
            {/if}
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
          {#if bulkCategoryUpdateDialog.matchCountByPayee > 0 && bulkCategoryUpdateDialog.matchCountByCategory > 0}
            <AlertDialog.Action onclick={confirmBulkCategoryUpdateByPayee} class="w-full">
              Update All Same Payee ({bulkCategoryUpdateDialog.matchCountByPayee + 1} transactions)
            </AlertDialog.Action>
            <AlertDialog.Action
              onclick={confirmBulkCategoryUpdateByCategory}
              class="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
              Update All Same Category ({bulkCategoryUpdateDialog.matchCountByCategory + 1} transactions)
            </AlertDialog.Action>
          {:else if bulkCategoryUpdateDialog.matchCountByPayee > 0}
            <AlertDialog.Action onclick={confirmBulkCategoryUpdateByPayee} class="w-full">
              Update All Same Payee ({bulkCategoryUpdateDialog.matchCountByPayee + 1} transactions)
            </AlertDialog.Action>
          {:else if bulkCategoryUpdateDialog.matchCountByCategory > 0}
            <AlertDialog.Action onclick={confirmBulkCategoryUpdateByCategory} class="w-full">
              Update All Same Category ({bulkCategoryUpdateDialog.matchCountByCategory + 1} transactions)
            </AlertDialog.Action>
          {/if}
          <AlertDialog.Action
            onclick={confirmBulkCategoryUpdateJustOne}
            class="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
            Just This One
          </AlertDialog.Action>
          <AlertDialog.Cancel onclick={cancelBulkCategoryUpdate} class="w-full"
            >Cancel</AlertDialog.Cancel>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {/if}

  <!-- Budget Recommendations Sheet -->
  <ResponsiveSheet bind:open={budgetRecommendationsSheetOpen} defaultWidth={800} minWidth={600} maxWidth={1200}>
    {#snippet header()}
      <div>
        <h2 class="text-lg font-semibold">Budget Recommendations</h2>
        <p class="text-muted-foreground text-sm">
          Budget recommendations based on spending patterns in this account
        </p>
      </div>
    {/snippet}

    {#snippet content()}
      {#if accountId}
        <BudgetRecommendationsPanel accountId={Number(accountId)} />
      {/if}
    {/snippet}
  </ResponsiveSheet>

  <!-- Schedule Recommendations Sheet -->
  <ResponsiveSheet bind:open={scheduleRecommendationsSheetOpen} defaultWidth={800} minWidth={600} maxWidth={1200}>
    {#snippet header()}
      <div>
        <h2 class="text-lg font-semibold">Schedule Recommendations</h2>
        <p class="text-muted-foreground text-sm">
          Detected recurring transaction patterns that can become scheduled transactions
        </p>
      </div>
    {/snippet}

    {#snippet content()}
      {#if accountId}
        <ScheduleRecommendationsPanel accountId={Number(accountId)} />
      {/if}
    {/snippet}
  </ResponsiveSheet>
</div>
