import {createLocalStorageState} from "$lib/utils/local-storage.svelte";
import type {PayeeSearchFilters} from "$lib/server/domains/payees/repository";
import type {Payee} from "$lib/schema";

interface PayeeSearchState {
  query: string;
  filters: PayeeSearchFilters;
  results: Payee[];
  isLoading: boolean;
  totalCount: number;
  hasMore: boolean;
  sortBy: "name" | "lastTransaction" | "avgAmount" | "created";
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
}

/**
 * State management for payee search and filtering
 */
class PayeeSearchStateManager {
  // Persistent state
  private viewModeState = createLocalStorageState<"grid" | "list">(
    "payee-search-view-mode",
    "list"
  );
  private sortByState = createLocalStorageState<
    "name" | "lastTransaction" | "avgAmount" | "created"
  >("payee-search-sort-by", "name");
  private sortOrderState = createLocalStorageState<"asc" | "desc">(
    "payee-search-sort-order",
    "asc"
  );

  // Reactive state
  query = $state("");
  filters = $state<PayeeSearchFilters>({});
  results = $state<Payee[]>([]);
  isLoading = $state(false);
  totalCount = $state(0);
  hasMore = $state(false);

  // Getters for persistent state
  get viewMode() {
    return this.viewModeState.value;
  }
  set viewMode(value: "grid" | "list") {
    this.viewModeState.value = value;
  }

  get sortBy() {
    return this.sortByState.value;
  }
  set sortBy(value: "name" | "lastTransaction" | "avgAmount" | "created") {
    this.sortByState.value = value;
  }

  get sortOrder() {
    return this.sortOrderState.value;
  }
  set sortOrder(value: "asc" | "desc") {
    this.sortOrderState.value = value;
  }

  // Computed properties
  hasActiveFilters = $derived.by(() => {
    return Object.keys(this.filters).length > 0;
  });

  hasSearchTerm = $derived.by(() => {
    return this.query.trim().length > 0;
  });

  isSearchActive = $derived.by(() => {
    return this.hasSearchTerm || this.hasActiveFilters;
  });

  displayedResultsCount = $derived(this.results.length);

  // Methods
  updateQuery(newQuery: string) {
    this.query = newQuery;
  }

  updateFilters(newFilters: PayeeSearchFilters) {
    this.filters = newFilters;
  }

  updateFilter<K extends keyof PayeeSearchFilters>(key: K, value: PayeeSearchFilters[K]) {
    const newFilters = {...this.filters};
    if (value === undefined || value === null || value === "") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    this.filters = newFilters;
  }

  clearAllFilters() {
    this.query = "";
    this.filters = {};
  }

  clearQuery() {
    this.query = "";
  }

  clearFilter(key: keyof PayeeSearchFilters) {
    const newFilters = {...this.filters};
    delete newFilters[key];
    this.filters = newFilters;
  }

  setResults(results: Payee[], totalCount: number = results.length, hasMore: boolean = false) {
    this.results = results;
    this.totalCount = totalCount;
    this.hasMore = hasMore;
  }

  appendResults(newResults: Payee[], totalCount: number, hasMore: boolean = false) {
    this.results = [...this.results, ...newResults];
    this.totalCount = totalCount;
    this.hasMore = hasMore;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
  }

  setSorting(sortBy: PayeeSearchState["sortBy"], sortOrder?: PayeeSearchState["sortOrder"]) {
    this.sortBy = sortBy;
    if (sortOrder) {
      this.sortOrder = sortOrder;
    }
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === "grid" ? "list" : "grid";
  }

  // Get current search parameters for API calls
  getSearchParams() {
    return {
      query: this.query || undefined,
      ...this.filters,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
  }

  // Reset to initial state
  reset() {
    this.query = "";
    this.filters = {};
    this.results = [];
    this.isLoading = false;
    this.totalCount = 0;
    this.hasMore = false;
  }

  // Export/import state for saving searches
  exportState() {
    return {
      query: this.query,
      filters: this.filters,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      viewMode: this.viewMode,
    };
  }

  importState(state: Partial<PayeeSearchState>) {
    if (state.query !== undefined) this.query = state.query;
    if (state.filters) this.filters = state.filters;
    if (state.sortBy) this.sortBy = state.sortBy;
    if (state.sortOrder) this.sortOrder = state.sortOrder;
    if (state.viewMode) this.viewMode = state.viewMode;
  }
}

// Create singleton instance
export const payeeSearchState = new PayeeSearchStateManager();
