<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Table from '$lib/components/ui/table';
  import { DataTable } from './(components)';
  import { columns } from './(data)/columns.svelte';
  import type { TransactionsFormat } from '$lib/types';
  import { CategoriesState } from '$lib/states/entities/categories.svelte';
  import { PayeesState } from '$lib/states/entities/payees.svelte';
  import { parseDate, type DateValue, today, getLocalTimeZone } from '@internationalized/date';
  import type { Table as TanStackTable } from '@tanstack/table-core';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
  import Textarea from '$lib/components/ui/textarea/textarea.svelte';
  import ServerDataTableToolbar from './(components)/server-data-table-toolbar.svelte';
  import ServerDataTablePagination from './(components)/server-data-table-pagination.svelte';
  import { ServerAccountState } from '$lib/states/views/server-account.svelte';
  import TransactionSkeleton from './(components)/transaction-skeleton.svelte';
  import DeleteTransactionDialog from './(dialogs)/delete-transaction-dialog.svelte';

  let { data } = $props();

  // Make accountId reactive to prop changes
  const accountId = $derived(data.accountId);


  // Configuration
  const CLIENT_SIDE_THRESHOLD = 5000; // Switch to server-side rendering above this count
  const CACHE_DURATION = 30 * 1000; // 30 seconds cache for account data

  // Simple in-memory cache for API responses
  const responseCache = new Map<string, { data: any; timestamp: number }>();

  const getCacheKey = (url: string, params?: any) => {
    return params ? `${url}?${JSON.stringify(params)}` : url;
  };

  const getCachedResponse = (key: string) => {
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  };

  const setCachedResponse = (key: string, data: any) => {
    responseCache.set(key, { data, timestamp: Date.now() });
    // Clean old cache entries to prevent memory leaks
    if (responseCache.size > 50) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey) {
        responseCache.delete(oldestKey);
      }
    }
  };

  // Local state for data loading
  let account = $state<{id: number; name: string} | undefined>();
  let transactions = $state<TransactionsFormat[]>([]);
  let isLoading = $state(true);
  let error = $state<string | undefined>();
  let summary = $state<{balance: number; transactionCount: number} | undefined>();
  let useClientSideTable = $state<boolean>(true);
  let table = $state<TanStackTable<TransactionsFormat> | undefined>();

  // Entity states for the advanced data table (get from context)
  const categoriesState = CategoriesState.get();
  const payeesState = PayeesState.get();

  // Entity data will be available through context

  // Server-side account state for advanced filtering and pagination
  let serverAccountState = $state<ServerAccountState | undefined>();

  // Track the last account ID to prevent re-initialization
  let lastAccountId = $state<number | undefined>();

  // Initialize server-side account state when accountId changes (but don't auto-load data)
  $effect(() => {
    if (accountId && accountId !== lastAccountId) {
      lastAccountId = accountId;
      // Create the state and immediately initialize with empty data to prevent auto-loading
      const newState = new ServerAccountState(accountId);
      // Use initializeWithServerData to prevent automatic loading
      newState.initializeWithServerData(
        { id: accountId, name: `Account ${accountId}`, slug: '', type: '', balance: 0, transactionCount: 0 },
        { transactions: [], pagination: { page: 0, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }
      );
      serverAccountState = newState;
    }
  });
  const categories = $derived(categoriesState?.all || []);
  const payees = $derived(payeesState?.all || []);

  // Pagination and filtering state
  let pagination = $state({
    page: 0,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0
  });

  let filters = $state({
    searchQuery: '',
    sortBy: 'date' as const,
    sortOrder: 'desc' as const,
    dateFrom: undefined,
    dateTo: undefined
  });

  // Transform server data to TanStack Table format for client-side rendering
  const formattedTransactions = $derived(() => {
    if (!transactions?.length) return [];
    return transactions.map(t => {
      const dateStr = typeof t.date === 'string' ? t.date : t.date.toString();
      const datePart = dateStr.split('T')[0];

      return {
        id: t.id,
        date: parseDate(datePart) as DateValue,
        amount: t.amount,
        notes: t.notes,
        status: t.status as "cleared" | "pending" | "scheduled" | null,
        accountId: accountId,
        payeeId: t.payee?.id || null,
        payee: t.payee || null,
        categoryId: t.category?.id || null,
        category: t.category || null,
        parentId: null,
        balance: (t as any).balance || null
      } as TransactionsFormat;
    });
  });

  // Simple formatted data for server-side pagination table
  const simpleFormatted = $derived(() => {
    if (!transactions?.length) return [];
    const formatted = transactions.map(t => ({
      id: t.id,
      date: typeof t.date === 'string' ? t.date : t.date.toString(),
      amount: t.amount,
      notes: t.notes || '',
      status: t.status,
      payee: t.payee,
      category: t.category,
    }));


    return formatted;
  });

  // Simplified methods for data interaction (unused parameters removed)
  const searchTransactions = (query: string) => {
    filters.searchQuery = query;
    pagination.page = 0;
    loadData();
  };

  // Transaction form dialog state
  let addTransactionDialogOpen = $state(false);
  let bulkDeleteDialogOpen = $state(false);
  let selectedTransactionIds = $state<number[]>([]);
  let isSubmittingTransaction = $state(false);

  // Transaction form data
  let transactionForm = $state({
    amount: 0,
    date: today(getLocalTimeZone()).toString(),
    notes: '',
    payeeId: null as number | null,
    categoryId: null as number | null,
    status: 'pending' as 'pending' | 'cleared' | 'scheduled'
  });

  // Reset transaction form
  const resetTransactionForm = () => {
    transactionForm = {
      amount: 0,
      date: today(getLocalTimeZone()).toString(),
      notes: '',
      payeeId: null,
      categoryId: null,
      status: 'pending'
    };
  };

  // Submit new transaction
  const submitTransaction = async () => {
    if (!account?.id) return;

    try {
      isSubmittingTransaction = true;

      // Create transaction via direct fetch
      const transactionPayload = {
        accountId: Number(account.id),
        amount: transactionForm.amount,
        date: transactionForm.date,
        notes: transactionForm.notes || null,
        payeeId: transactionForm.payeeId,
        categoryId: transactionForm.categoryId,
        status: transactionForm.status
      };


      const transactionResponse = await fetch('/trpc/transactionRoutes.save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "0": {
            json: transactionPayload
          }
        })
      });

      if (!transactionResponse.ok) {
        throw new Error(`Failed to create transaction: HTTP ${transactionResponse.status}: ${transactionResponse.statusText}`);
      }

      const transactionText = await transactionResponse.text();
      if (!transactionText.trim()) {
        throw new Error('Empty response when creating transaction');
      }

      const transactionResult = JSON.parse(transactionText);
      const newTransaction = transactionResult[0]?.result?.data || transactionResult[0]?.result;


      // Optimistic UI update - add transaction immediately
      if (newTransaction) {
        // Convert date string to DateValue if needed
        const formattedTransaction = {
          ...newTransaction,
          date: typeof newTransaction.date === 'string' ? parseDate(newTransaction.date) : newTransaction.date,
          balance: null
        } as TransactionsFormat;

        transactions = [formattedTransaction, ...transactions];

        // Update summary
        if (summary) {
          summary.balance += newTransaction.amount;
          summary.transactionCount += 1;
        }

        // Clear cache to ensure fresh data on next load
        responseCache.clear();
      }

      // Close dialog and reset form
      addTransactionDialogOpen = false;
      resetTransactionForm();

    } catch (err: any) {
      console.error('❌ Failed to create transaction:', err);
      error = err?.message || 'Failed to create transaction';
    } finally {
      isSubmittingTransaction = false;
    }
  };

  // Update handler for editable cells
  const updateTransactionData = async (id: number, columnId: string, newValue?: unknown) => {
    try {

      // Find the transaction to update
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) {
        console.error('Transaction not found:', id);
        return;
      }

      // Map column IDs to the actual field names expected by the API
      const fieldMap: Record<string, string> = {
        'payee': 'payeeId',
        'category': 'categoryId',
        'date': 'date',
        'amount': 'amount',
        'notes': 'notes',
        'status': 'status'
      };

      const actualField = fieldMap[columnId] || columnId;

      // Prepare data for form action (including ID for update)
      const updateData: any = {
        id: id, // Include ID for update
        accountId: Number(transaction.accountId || accountId),
        amount: Number(transaction.amount),
        date: transaction.date,
        notes: transaction.notes || null,
        payeeId: transaction.payee?.id ? Number(transaction.payee.id) : null,
        categoryId: transaction.category?.id ? Number(transaction.category.id) : null,
        status: transaction.status || "pending"
      };

      // Override with the new value, ensuring proper typing
      if (actualField === 'payeeId' || actualField === 'categoryId' || actualField === 'accountId') {
        updateData[actualField] = newValue ? Number(newValue) : null;
      } else if (actualField === 'amount') {
        updateData[actualField] = Number(newValue);
      } else {
        updateData[actualField] = newValue;
      }


      // Update via SvelteKit API route instead of direct tRPC
      const updateResponse = await fetch(`/accounts/${accountId}/api/update-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update transaction: HTTP ${updateResponse.status}: ${updateResponse.statusText}`);
      }

      const updateResult = await updateResponse.json();
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update transaction');
      }

      // Clear cached data and refresh to show updated transaction
      responseCache.clear();

      // Refresh server account state if using server-side table
      if (serverAccountState) {
        await serverAccountState.refresh(accountId);
      } else {
        // For client-side table, just reload the data
        await loadData();
      }

    } catch (err: any) {
      console.error('❌ Failed to update transaction:', err);
      error = err?.message || 'Failed to update transaction';
    }
  };

  // TanStack Table and ServerAccountState Integration
  const syncTableStateWithOptimizedState = () => {
    if (!table || !serverAccountState || useClientSideTable) return;

    // Sync pagination state from TanStack Table to ServerAccountState
    const tablePagination = table.getState().pagination;
    if (tablePagination.pageIndex !== pagination.page || tablePagination.pageSize !== pagination.pageSize) {
      pagination.page = tablePagination.pageIndex;
      pagination.pageSize = tablePagination.pageSize;
      serverAccountState.setPageSize(accountId, pagination.pageSize);
      serverAccountState.goToPage(accountId, pagination.page);
      loadData(); // Reload data with new pagination
    }
  };

  // Sync server-side state changes back to TanStack Table
  const syncServerStateWithTable = () => {
    if (!table || !serverAccountState || useClientSideTable) return;

    const currentTablePage = table.getState().pagination.pageIndex;
    const currentTablePageSize = table.getState().pagination.pageSize;

    if (currentTablePage !== serverAccountState.pagination.page ||
        currentTablePageSize !== serverAccountState.pagination.pageSize) {
      table.setPageIndex(serverAccountState.pagination.page);
      table.setPageSize(serverAccountState.pagination.pageSize);
    }
  };

  // Enhanced search integration
  const performEnhancedSearch = async (searchQuery: string) => {
    if (useClientSideTable) {
      // For client-side, use TanStack Table's global filter
      if (table) {
        table.setGlobalFilter(searchQuery);
      }
    } else {
      // For server-side, update filters and reload data
      filters.searchQuery = searchQuery;
      await loadData();
    }
  };

  async function loadData() {
    if (typeof window === 'undefined') return; // Client-side only

    try {
      isLoading = true;

      // Ensure accountId is a number
      const numericAccountId = Number(accountId);
      if (isNaN(numericAccountId)) {
        throw new Error(`Invalid account ID: ${accountId}`);
      }


      // Check cache first for summary data
      const summaryCacheKey = getCacheKey('serverAccountsRoutes.loadSummary', { id: numericAccountId });
      let summaryData = getCachedResponse(summaryCacheKey);

      if (!summaryData) {
        // Use direct fetch approach since tRPC client has issues
        const summaryResponse = await fetch(`/trpc/serverAccountsRoutes.loadSummary?input=${encodeURIComponent(JSON.stringify({ id: numericAccountId }))}`);
        if (!summaryResponse.ok) {
          throw new Error(`Failed to load summary: HTTP ${summaryResponse.status}: ${summaryResponse.statusText}`);
        }

        // Read response as text first to check for truncation
        const summaryText = await summaryResponse.text();
        if (!summaryText.trim()) {
          throw new Error('Empty response from server');
        }

        const summaryResult = JSON.parse(summaryText);
        summaryData = summaryResult.result?.data || summaryResult;

        // Cache the response
        setCachedResponse(summaryCacheKey, summaryData);
      }

      summary = {
        balance: (summaryData as any)?.balance || 0,
        transactionCount: (summaryData as any)?.transactionCount || 0
      };

      // Determine rendering mode based on transaction count
      useClientSideTable = ((summaryData as any)?.transactionCount || 0) <= CLIENT_SIDE_THRESHOLD;

      // Load account and transaction data via direct fetch
      const accountResponse = await fetch(`/trpc/accountRoutes.load?input=${encodeURIComponent(JSON.stringify({ id: numericAccountId }))}`);
      if (!accountResponse.ok) {
        throw new Error(`Failed to load account: HTTP ${accountResponse.status}: ${accountResponse.statusText}`);
      }

      // Parse account data carefully
      const accountText = await accountResponse.text();

      if (!accountText.trim()) {
        throw new Error('Empty account response from server');
      }

      let accountData;
      try {
        const accountResult = JSON.parse(accountText);
        accountData = accountResult.result?.data || accountResult;
      } catch (parseError) {
        console.error('🔧 Failed to parse account JSON:', parseError);
        throw new Error('Invalid JSON response from account endpoint');
      }

      let transactionData;
      // Load transactions via optimized route to ensure payee/category data is included
      if (useClientSideTable) {
        // For client-side, load all transactions in batches (due to 100 record limit)
        const allTransactions: any[] = [];
        let currentPage = 0;
        let hasMorePages = true;

        while (hasMorePages) {
          const transactionParams: any = {
            accountId: numericAccountId,
            page: currentPage,
            pageSize: 100, // Max allowed page size
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
          };

          if (filters.searchQuery) {
            transactionParams.searchQuery = filters.searchQuery;
          }
          if (filters.dateFrom) {
            transactionParams.dateFrom = filters.dateFrom;
          }
          if (filters.dateTo) {
            transactionParams.dateTo = filters.dateTo;
          }

          const transactionResponse = await fetch(`/trpc/serverAccountsRoutes.loadTransactions?input=${encodeURIComponent(JSON.stringify(transactionParams))}`);
          if (!transactionResponse.ok) {
            throw new Error(`Failed to load transactions page ${currentPage}: HTTP ${transactionResponse.status}: ${transactionResponse.statusText}`);
          }

          const transactionText = await transactionResponse.text();
          if (!transactionText.trim()) {
            throw new Error('Empty transactions response from server');
          }

          const transactionResult = JSON.parse(transactionText);
          const pageData = transactionResult.result?.data || transactionResult;

          allTransactions.push(...(pageData.transactions || []));

          // Check if we have more pages
          const paginationInfo = pageData.pagination;
          hasMorePages = paginationInfo?.hasNextPage || false;
          currentPage++;

          // Safety break to prevent infinite loops
          if (currentPage > 100) {
            console.warn('🔧 Breaking pagination loop at page 100 for safety');
            break;
          }
        }

        transactionData = {
          transactions: allTransactions,
          pagination: {
            page: 0,
            pageSize: 50, // Use standard page size, not transaction count
            totalCount: allTransactions.length,
            totalPages: Math.ceil(allTransactions.length / 50),
            hasNextPage: false, // For client-side, we load all data so no more pages needed
            hasPreviousPage: false
          }
        };

      } else {
        // For server-side, load single page
        const transactionParams: any = {
          accountId: numericAccountId,
          page: pagination.page,
          pageSize: pagination.pageSize,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder
        };

        if (filters.searchQuery) {
          transactionParams.searchQuery = filters.searchQuery;
        }
        if (filters.dateFrom) {
          transactionParams.dateFrom = filters.dateFrom;
        }
        if (filters.dateTo) {
          transactionParams.dateTo = filters.dateTo;
        }

        const transactionResponse = await fetch(`/trpc/serverAccountsRoutes.loadTransactions?input=${encodeURIComponent(JSON.stringify(transactionParams))}`);
        if (!transactionResponse.ok) {
          throw new Error(`Failed to load transactions: HTTP ${transactionResponse.status}: ${transactionResponse.statusText}`);
        }

        const transactionText = await transactionResponse.text();
        if (!transactionText.trim()) {
          throw new Error('Empty transactions response from server');
        }

        const transactionResult = JSON.parse(transactionText);
        transactionData = transactionResult.result?.data || transactionResult;
      }


      // Set the loaded data
      account = {
        id: accountData.id,
        name: accountData.name
      };

      // Always use transactions from the optimized route (includes payee/category data)
      transactions = (transactionData as any)?.transactions || [];

      // Update pagination info from server response
      const paginationData = (transactionData as any)?.pagination;
      pagination.totalCount = paginationData?.totalCount || 0;
      pagination.totalPages = paginationData?.totalPages || Math.ceil(pagination.totalCount / pagination.pageSize);



      error = undefined;

      // Sync data with optimized account state if it exists
      if (serverAccountState && account && summary) {
        serverAccountState.initializeWithServerData(
          {
            id: account.id,
            name: account.name,
            slug: account.name.toLowerCase().replace(/\s+/g, '-'),
            type: 'checking', // Default type, could be enhanced
            balance: summary.balance,
            transactionCount: summary.transactionCount
          },
          useClientSideTable
            ? { transactions, pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                totalCount: pagination.totalCount,
                totalPages: pagination.totalPages,
                hasNextPage: pagination.page < pagination.totalPages - 1,
                hasPreviousPage: pagination.page > 0
              }}
            : { transactions: transactions, pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                totalCount: pagination.totalCount,
                totalPages: pagination.totalPages,
                hasNextPage: pagination.page < pagination.totalPages - 1,
                hasPreviousPage: pagination.page > 0
              }}
        );
      }

    } catch (err: any) {
      console.error('❌ Failed to load account data:', err);
      error = err?.message || 'Failed to load account data';
      transactions = [];
      summary = undefined;

      // Try simpler route as fallback if optimized routes fail
      try {
        const numericFallbackId = Number(accountId);
        const fallbackResponse = await fetch(`/trpc/accountRoutes.load?input=${encodeURIComponent(JSON.stringify({ id: numericFallbackId }))}`);
        if (!fallbackResponse.ok) {
          throw new Error(`Fallback failed: HTTP ${fallbackResponse.status}`);
        }
        const fallbackResult = await fallbackResponse.json();
        const fallbackData = fallbackResult.result?.data || fallbackResult;

        if (fallbackData) {
          account = {
            id: fallbackData.id,
            name: fallbackData.name
          };

          // Convert transactions to proper format with date conversion
          transactions = (fallbackData.transactions || []).map((t: any) => ({
            ...t,
            date: typeof t.date === 'string' ? parseDate(t.date) : t.date
          }));

          summary = {
            balance: fallbackData.balance || 0,
            transactionCount: transactions.length
          };
          pagination.totalCount = transactions.length;
          pagination.totalPages = Math.ceil(transactions.length / pagination.pageSize);
          error = undefined; // Clear error if fallback succeeds
        }
      } catch (fallbackErr: any) {
        console.error('❌ Fallback also failed:', fallbackErr);

        // Final fallback to mock data for development
        account = { id: accountId, name: `Account ${accountId}` };
        transactions = [
          {
            id: 1,
            date: parseDate('2024-01-15'),
            amount: -50.00,
            notes: 'Sample Transaction',
            status: 'cleared',
            accountId: accountId,
            payeeId: null,
            payee: null,
            categoryId: null,
            category: null,
            parentId: null
          } as any
        ];
        summary = { balance: -50.00, transactionCount: 1 };
        pagination.totalCount = 1;
        pagination.totalPages = 1;
      }
    } finally {
      isLoading = false;
    }
  }

  // Track previous account ID to detect changes
  let previousAccountId = $state<number | undefined>(undefined);

  onMount(() => {
    loadData();
  });

  // React to accountId changes (when navigating between accounts)
  $effect(() => {
    if (accountId !== previousAccountId) {
      // Reset state and reload data when account changes
      pagination.page = 0;
      filters.searchQuery = '';
      previousAccountId = accountId;
      loadData();
    }
  });

  // TanStack Table Integration Effects
  $effect(() => {
    // Monitor TanStack Table pagination changes and sync with ServerAccountState
    if (table && serverAccountState && !useClientSideTable) {
      const tablePagination = table.getState().pagination;
      if (tablePagination.pageIndex !== pagination.page) {
        syncTableStateWithOptimizedState();
      }
    }
  });

  $effect(() => {
    // Monitor ServerAccountState changes and sync with TanStack Table
    if (serverAccountState && table && !useClientSideTable) {
      syncServerStateWithTable();
    }
  });

  // Enhanced search functionality
  $effect(() => {
    // Use the enhanced search when filters change
    if (filters.searchQuery !== undefined) {
      performEnhancedSearch(filters.searchQuery);
    }
  });

  // Clean up unused code - we're using a simple table instead of TanStack Table
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        {account?.name || `Account ${accountId}`}
      </h1>
      <p class="text-muted-foreground">
        {useClientSideTable
          ? 'Advanced view with client-side filtering and views'
          : 'Optimized view with server-side pagination'}
      </p>
    </div>

    <!-- Add Transaction Button & Bulk Actions -->
    <div class="flex items-center space-x-2">
      <!-- Bulk Actions (shown when transactions are selected) -->
      {#if table && Object.keys(table.getSelectedRowModel().rowsById).length > 0}
        <div class="flex items-center space-x-2 mr-4 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
          <span class="text-sm text-blue-700">
            {Object.keys(table.getSelectedRowModel().rowsById).length} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onclick={() => {
              if (!table) return;
              const selectedRows = Object.keys(table.getSelectedRowModel().rowsById);
              selectedTransactionIds = selectedRows.map(id => parseInt(id));
              bulkDeleteDialogOpen = true;
            }}
          >
            Delete Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onclick={() => table?.resetRowSelection()}
          >
            Clear Selection
          </Button>
        </div>
      {/if}

      <Button onclick={() => addTransactionDialogOpen = true}>
        <Plus class="h-4 w-4 mr-2" />
        Add Transaction
      </Button>
    </div>
  </div>

  <!-- Error State -->
  {#if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <div class="flex items-center space-x-2">
        <div class="text-red-600">⚠️</div>
        <div class="text-red-800 font-medium">Error loading account data</div>
      </div>
      <p class="mt-2 text-red-700">{error}</p>
    </div>
  {/if}

  <!-- Account Summary -->
  {#if summary && !isLoading}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border p-4">
        <div class="text-sm font-medium text-muted-foreground">Account Name</div>
        <div class="text-2xl font-bold">{account?.name || 'Loading...'}</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-sm font-medium text-muted-foreground">Balance</div>
        <div class="text-2xl font-bold">${summary.balance?.toFixed(2) || '0.00'}</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-sm font-medium text-muted-foreground">Transactions</div>
        <div class="text-2xl font-bold">{summary.transactionCount || 0}</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-sm font-medium text-muted-foreground">Status</div>
        <div class="text-2xl font-bold text-green-600">Active</div>
      </div>
    </div>
  {/if}

  <!-- Loading State -->
  {#if isLoading}
    <div class="space-y-6">
      <!-- Account Summary Skeleton -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {#each Array(4) as _, i}
          <div class="rounded-lg border p-4">
            <div class="h-4 w-20 bg-muted animate-pulse rounded mb-2" style="animation-delay: {i * 100}ms"></div>
            <div class="h-6 w-16 bg-muted animate-pulse rounded" style="animation-delay: {i * 100 + 50}ms"></div>
          </div>
        {/each}
      </div>

      <!-- Transaction Table Skeleton -->
      <TransactionSkeleton rows={10} />
    </div>
  {:else}
    <!-- Data Tables -->
    {#if useClientSideTable}
      <!-- Advanced Client-Side Data Table with View Management -->
      {#if categoriesState && payeesState && !isLoading && transactions.length > 0}
        <DataTable
          columns={columns(categoriesState, payeesState, updateTransactionData)}
          transactions={formattedTransactions()}
          bind:table
        />
      {:else}
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
          <div class="flex items-center space-x-2 mb-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 class="font-medium text-blue-800">Loading Advanced Table...</h3>
          </div>
          <p class="text-blue-700 text-sm">
            Loading entity data and initializing the advanced data table with view management,
            filtering, and editing capabilities.
          </p>
        </div>

        <!-- Simple fallback table while loading -->
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
                onchange={() => searchTransactions(filters.searchQuery)}
              />
            </div>
            <Button onclick={() => loadData()} variant="outline">
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
                {#each simpleFormatted() as transaction}
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
              onchange={() => searchTransactions(filters.searchQuery)}
            />
          </div>
          <Button onclick={() => loadData()} variant="outline">
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
                {#each simpleFormatted() as transaction}
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

  <!-- Add Transaction Dialog -->
  <Dialog.Root bind:open={addTransactionDialogOpen}>
    <Dialog.Content class="max-w-md">
      <Dialog.Header>
        <Dialog.Title>Add New Transaction</Dialog.Title>
        <Dialog.Description>
          Create a new transaction for {account?.name || 'this account'}.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4">
        <!-- Amount -->
        <div class="space-y-2">
          <Label for="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            bind:value={transactionForm.amount}
          />
        </div>

        <!-- Date -->
        <div class="space-y-2">
          <Label for="date">Date</Label>
          <Input
            id="date"
            type="date"
            bind:value={transactionForm.date}
          />
        </div>

        <!-- Payee -->
        <div class="space-y-2">
          <Label for="payee">Payee</Label>
          <Select.Root
            type="single"
            value={transactionForm.payeeId?.toString()}
            onValueChange={(value) => {
              transactionForm.payeeId = value ? parseInt(value) : null;
            }}
          >
            <Select.Trigger>
              {payees.find(p => p.id === transactionForm.payeeId)?.name || 'Select payee (optional)'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">No payee</Select.Item>
              {#each payees as payee}
                <Select.Item value={payee.id.toString()}>{payee.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Category -->
        <div class="space-y-2">
          <Label for="category">Category</Label>
          <Select.Root
            type="single"
            value={transactionForm.categoryId?.toString()}
            onValueChange={(value) => {
              transactionForm.categoryId = value ? parseInt(value) : null;
            }}
          >
            <Select.Trigger>
              {categories.find(c => c.id === transactionForm.categoryId)?.name || 'Select category (optional)'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">No category</Select.Item>
              {#each categories as category}
                <Select.Item value={category.id.toString()}>{category.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Status -->
        <div class="space-y-2">
          <Label for="status">Status</Label>
          <Select.Root
            type="single"
            value={transactionForm.status}
            onValueChange={(value) => {
              if (value) {
                transactionForm.status = value as 'pending' | 'cleared' | 'scheduled';
              }
            }}
          >
            <Select.Trigger>
              {transactionForm.status || 'Select status'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="pending">Pending</Select.Item>
              <Select.Item value="cleared">Cleared</Select.Item>
              <Select.Item value="scheduled">Scheduled</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Notes -->
        <div class="space-y-2">
          <Label for="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Transaction notes (optional)"
            bind:value={transactionForm.notes}
            rows={3}
          />
        </div>
      </div>

      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            addTransactionDialogOpen = false;
            resetTransactionForm();
          }}
          disabled={isSubmittingTransaction}
        >
          Cancel
        </Button>
        <Button
          onclick={submitTransaction}
          disabled={isSubmittingTransaction || !transactionForm.amount}
        >
          {isSubmittingTransaction ? 'Adding...' : 'Add Transaction'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Additional Info -->
  {#if !isLoading && summary}
    <div class="rounded-lg border p-4 {useClientSideTable ? 'bg-green-50' : 'bg-blue-50'}">
      <div class="flex items-center space-x-2 mb-2">
        <div class="w-3 h-3 {useClientSideTable ? 'bg-green-500' : 'bg-blue-500'} rounded-full"></div>
        <h3 class="font-medium {useClientSideTable ? 'text-green-800' : 'text-blue-800'}">
          {useClientSideTable ? 'Advanced Client-Side Rendering' : 'Optimized Server-Side Rendering'}
        </h3>
      </div>
      <p class="{useClientSideTable ? 'text-green-700' : 'text-blue-700'} text-sm">
        {#if useClientSideTable}
          With {summary.transactionCount} transactions ≤ {CLIENT_SIDE_THRESHOLD}, using advanced client-side
          table with full view management, filtering, sorting, and grouping capabilities.
        {:else}
          With {summary.transactionCount} transactions > {CLIENT_SIDE_THRESHOLD}, using server-side
          pagination for better performance. Advanced features available on smaller datasets.
        {/if}
      </p>
    </div>
  {/if}

  <!-- Bulk Delete Dialog -->
  <DeleteTransactionDialog
    transactions={selectedTransactionIds}
    bind:dialogOpen={bulkDeleteDialogOpen}
    onDelete={() => {
      table?.resetRowSelection();
      loadData();
    }}
  />
</div>
