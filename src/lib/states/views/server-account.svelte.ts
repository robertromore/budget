import {currencyFormatter, transactionFormatter} from "$lib/utils/formatters";
import type {Category, Payee, Transaction} from "$lib/schema";
import {getContext, setContext} from "svelte";

const KEY = Symbol("server_account");

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface TransactionFilters {
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: "date" | "amount" | "notes";
  sortOrder: "asc" | "desc";
}

export class ServerAccountState {
  // Account summary (fast loading)
  accountSummary:
    | {
        id: number;
        name: string;
        slug: string;
        type: string;
        notes?: string;
        balance: number;
        transactionCount: number;
      }
    | undefined = $state();

  // Transaction pagination
  currentTransactions: Transaction[] = $state([]);
  pagination: PaginationState = $state({
    page: 0,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Filters and search
  filters: TransactionFilters = $state({
    sortBy: "date" as "date" | "amount" | "notes",
    sortOrder: "desc" as "asc" | "desc",
  });

  // Loading states
  isLoadingSummary = $state(false);
  isLoadingTransactions = $state(false);
  isSearching = $state(false);

  // Error states
  summaryError: string | null = $state(null);
  transactionsError: string | null = $state(null);

  private hasServerData = $state(false);

  constructor(accountId: number) {
    // Only fire async loading if we don't have server data
    // The initializeWithServerData method will set hasServerData = true
    setTimeout(() => {
      if (!this.hasServerData) {
        this.loadAccountSummary(accountId).catch(console.error);
        this.loadTransactions(accountId).catch(console.error);
      }
    }, 0);
  }

  /**
   * Initialize with server-loaded data (for SSR optimization)
   */
  initializeWithServerData(accountSummary: any, transactionsData: any) {
    // Set account summary
    this.accountSummary = {
      id: accountSummary.id,
      name: accountSummary.name,
      slug: accountSummary.slug,
      type: accountSummary.type,
      notes: accountSummary.notes || undefined,
      balance: accountSummary.balance,
      transactionCount: accountSummary.transactionCount,
    };

    // Set transactions and pagination
    if (transactionsData?.transactions) {
      this.currentTransactions = transactionsData.transactions;
      this.pagination = {...this.pagination, ...transactionsData.pagination};
    }

    // Mark as loaded
    this.isLoadingSummary = false;
    this.isLoadingTransactions = false;
    this.hasServerData = true;
  }

  // Formatted balance for display
  balance = $derived(() => {
    const balance = this.accountSummary?.balance ?? 0;
    return currencyFormatter.format(isNaN(balance) ? 0 : balance);
  });

  // Formatted transactions for data table
  get formatted() {
    if (!this.currentTransactions?.length) {
      return [];
    }

    return transactionFormatter.format(this.currentTransactions) ?? [];
  }

  // Categories from current transactions
  categories: Category[] = $derived.by(() => {
    return (
      this.formatted
        .map((transaction) => transaction.category)
        .filter((category): category is Category => category !== null) || []
    );
  });

  // Payees from current transactions
  payees: Payee[] = $derived.by(() => {
    return (
      this.formatted
        .map((transaction) => transaction.payee)
        .filter((payee): payee is Payee => payee !== null) || []
    );
  });

  /**
   * Load account summary (fast - no transactions)
   */
  async loadAccountSummary(accountId: number) {
    this.isLoadingSummary = true;
    this.summaryError = null;

    try {
      // Use direct fetch instead of tRPC client
      const summaryResponse = await fetch(`/trpc/serverAccountsRoutes.loadSummary?input=${encodeURIComponent(JSON.stringify({ id: accountId }))}`);
      if (!summaryResponse.ok) {
        throw new Error(`Failed to load summary: HTTP ${summaryResponse.status}: ${summaryResponse.statusText}`);
      }
      
      const summaryText = await summaryResponse.text();
      if (!summaryText.trim()) {
        throw new Error('Empty response from server');
      }
      
      const summaryResult = JSON.parse(summaryText);
      const summary = summaryResult.result?.data || summaryResult;
      this.accountSummary = {
        id: summary.id,
        name: summary.name,
        slug: summary.slug,
        type: summary.type,
        notes: summary.notes || undefined,
        balance: summary.balance,
        transactionCount: summary.transactionCount,
      };
    } catch (error) {
      this.summaryError = error instanceof Error ? error.message : "Failed to load account summary";
      console.error("Failed to load account summary:", error);
    } finally {
      this.isLoadingSummary = false;
    }
  }

  /**
   * Load paginated transactions with current filters
   */
  async loadTransactions(accountId: number, resetPagination = false) {
    this.isLoadingTransactions = true;
    this.transactionsError = null;

    if (resetPagination) {
      this.pagination.page = 0;
    }

    try {
      // Use direct fetch instead of tRPC client
      const transactionParams = {
        accountId,
        page: this.pagination.page,
        pageSize: this.pagination.pageSize,
        sortBy: this.filters.sortBy,
        sortOrder: this.filters.sortOrder,
        ...(this.filters.searchQuery && { searchQuery: this.filters.searchQuery }),
        ...(this.filters.dateFrom && { dateFrom: this.filters.dateFrom }),
        ...(this.filters.dateTo && { dateTo: this.filters.dateTo })
      };
      
      const transactionResponse = await fetch(`/trpc/serverAccountsRoutes.loadTransactions?input=${encodeURIComponent(JSON.stringify(transactionParams))}`);
      if (!transactionResponse.ok) {
        throw new Error(`Failed to load transactions: HTTP ${transactionResponse.status}: ${transactionResponse.statusText}`);
      }
      
      const transactionText = await transactionResponse.text();
      if (!transactionText.trim()) {
        throw new Error('Empty response from server');
      }
      
      const transactionResult = JSON.parse(transactionText);
      const result = transactionResult.result?.data || transactionResult;

      this.currentTransactions = result.transactions;
      this.pagination = {...this.pagination, ...result.pagination};
    } catch (error) {
      this.transactionsError =
        error instanceof Error ? error.message : "Failed to load transactions";
      console.error("Failed to load transactions:", error);
    } finally {
      this.isLoadingTransactions = false;
    }
  }

  /**
   * Search transactions with debouncing
   */
  private searchTimeout: NodeJS.Timeout | undefined;
  async searchTransactions(accountId: number, query: string) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.isSearching = true;

    // Debounce search by 300ms
    this.searchTimeout = setTimeout(async () => {
      this.filters.searchQuery = query || undefined;
      await this.loadTransactions(accountId, true); // Reset to first page
      this.isSearching = false;
    }, 300);
  }

  /**
   * Apply date filters
   */
  async setDateFilter(accountId: number, dateFrom?: string, dateTo?: string) {
    this.filters.dateFrom = dateFrom;
    this.filters.dateTo = dateTo;
    await this.loadTransactions(accountId, true); // Reset to first page
  }

  /**
   * Change sorting
   */
  async setSorting(
    accountId: number,
    sortBy: TransactionFilters["sortBy"],
    sortOrder: TransactionFilters["sortOrder"]
  ) {
    // Validate inputs
    const validSortBy = ["date", "amount", "notes"];
    const validSortOrder = ["asc", "desc"];

    if (!validSortBy.includes(sortBy) || !validSortOrder.includes(sortOrder)) {
      return;
    }

    try {
      this.filters.sortBy = sortBy;
      this.filters.sortOrder = sortOrder;
      await this.loadTransactions(accountId, true); // Reset to first page
    } catch (error) {
      console.error("Sort error", error);
    }
  }

  /**
   * Go to next page
   */
  async nextPage(accountId: number) {
    if (this.pagination.hasNextPage) {
      this.pagination.page += 1;
      await this.loadTransactions(accountId);
      
      // Prefetch next page if available
      if (this.pagination.hasNextPage) {
        this.prefetchNextPage(accountId);
      }
    }
  }

  /**
   * Go to previous page
   */
  async previousPage(accountId: number) {
    if (this.pagination.hasPreviousPage) {
      this.pagination.page -= 1;
      await this.loadTransactions(accountId);
      
      // Prefetch previous page if available
      if (this.pagination.hasPreviousPage) {
        this.prefetchPreviousPage(accountId);
      }
    }
  }

  /**
   * Go to specific page
   */
  async goToPage(accountId: number, page: number) {
    if (page >= 0 && page < this.pagination.totalPages) {
      this.pagination.page = page;
      await this.loadTransactions(accountId);
    }
  }

  /**
   * Change page size
   */
  async setPageSize(accountId: number, pageSize: number) {
    this.pagination.pageSize = pageSize;
    await this.loadTransactions(accountId, true); // Reset to first page
  }

  /**
   * Refresh all data
   */
  async refresh(accountId: number) {
    await Promise.all([this.loadAccountSummary(accountId), this.loadTransactions(accountId, true)]);
  }

  /**
   * Prefetch next page for improved performance
   */
  private async prefetchNextPage(accountId: number) {
    try {
      const nextPage = this.pagination.page + 1;
      if (nextPage >= this.pagination.totalPages) return;

      const transactionParams = {
        accountId,
        page: nextPage,
        pageSize: this.pagination.pageSize,
        sortBy: this.filters.sortBy,
        sortOrder: this.filters.sortOrder,
        ...(this.filters.searchQuery && { searchQuery: this.filters.searchQuery }),
        ...(this.filters.dateFrom && { dateFrom: this.filters.dateFrom }),
        ...(this.filters.dateTo && { dateTo: this.filters.dateTo })
      };
      
      // Prefetch silently in background
      fetch(`/trpc/serverAccountsRoutes.loadTransactions?input=${encodeURIComponent(JSON.stringify(transactionParams))}`);
      console.log('🚀 Prefetching next page:', nextPage + 1);
    } catch (error) {
      // Silently fail prefetching
      console.debug('Prefetch next page failed:', error);
    }
  }

  /**
   * Prefetch previous page for improved performance
   */
  private async prefetchPreviousPage(accountId: number) {
    try {
      const previousPage = this.pagination.page - 1;
      if (previousPage < 0) return;

      const transactionParams = {
        accountId,
        page: previousPage,
        pageSize: this.pagination.pageSize,
        sortBy: this.filters.sortBy,
        sortOrder: this.filters.sortOrder,
        ...(this.filters.searchQuery && { searchQuery: this.filters.searchQuery }),
        ...(this.filters.dateFrom && { dateFrom: this.filters.dateFrom }),
        ...(this.filters.dateTo && { dateTo: this.filters.dateTo })
      };
      
      // Prefetch silently in background
      fetch(`/trpc/serverAccountsRoutes.loadTransactions?input=${encodeURIComponent(JSON.stringify(transactionParams))}`);
      console.log('🚀 Prefetching previous page:', previousPage + 1);
    } catch (error) {
      // Silently fail prefetching
      console.debug('Prefetch previous page failed:', error);
    }
  }

  /**
   * Context management
   */
  static get(): ServerAccountState | undefined {
    return getContext(KEY);
  }

  static set(state: ServerAccountState): ServerAccountState {
    return setContext(KEY, state);
  }
}

/**
 * Hook for creating optimized account state
 */
export function createServerAccountState(accountId: number): ServerAccountState {
  const state = new ServerAccountState(accountId);
  ServerAccountState.set(state);
  return state;
}
