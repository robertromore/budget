import type { Budget, BudgetEnforcementLevel, BudgetStatus, BudgetType } from "$lib/schema/budgets";
import { isNotEmptyObject } from "$lib/utils";
import { createLocalStorageState } from "$lib/utils/local-storage.svelte";

export interface BudgetSearchFilters {
  type?: BudgetType;
  status?: BudgetStatus;
  scope?: "account" | "category" | "global" | "mixed";
  enforcementLevel?: BudgetEnforcementLevel;
}

interface BudgetSearchState {
  query: string;
  filters: BudgetSearchFilters;
  results: Budget[];
  isLoading: boolean;
  totalCount: number;
  hasMore: boolean;
  sortBy: "name" | "created" | "type" | "allocated" | "consumed" | "remaining";
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
}

/**
 * State management for budget search and filtering
 */
class BudgetSearchStateManager {
  // Persistent state
  private viewModeState = createLocalStorageState<"grid" | "list">("budget-search-view-mode", "list");
  private sortByState = createLocalStorageState<
    "name" | "created" | "type" | "allocated" | "consumed" | "remaining"
  >("budget-search-sort-by", "name");
  private sortOrderState = createLocalStorageState<"asc" | "desc">(
    "budget-search-sort-order",
    "asc"
  );

  // Reactive state
  query = $state("");
  filters = $state<BudgetSearchFilters>({});
  results = $state<Budget[]>([]);
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
  set sortBy(value: "name" | "created" | "type" | "allocated" | "consumed" | "remaining") {
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
    return isNotEmptyObject(this.filters);
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

  updateFilters(newFilters: BudgetSearchFilters) {
    this.filters = newFilters;
  }

  updateFilter<K extends keyof BudgetSearchFilters>(key: K, value: BudgetSearchFilters[K]) {
    const newFilters = { ...this.filters };
    if (value === undefined || value === null) {
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

  clearFilter(key: keyof BudgetSearchFilters) {
    const newFilters = { ...this.filters };
    delete newFilters[key];
    this.filters = newFilters;
  }

  setResults(results: Budget[], totalCount: number = results.length, hasMore: boolean = false) {
    this.results = results;
    this.totalCount = totalCount;
    this.hasMore = hasMore;
  }

  appendResults(newResults: Budget[], totalCount: number, hasMore: boolean = false) {
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

  setSorting(sortBy: BudgetSearchState["sortBy"], sortOrder?: BudgetSearchState["sortOrder"]) {
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

  importState(state: Partial<BudgetSearchState>) {
    if (state.query !== undefined) this.query = state.query;
    if (state.filters) this.filters = state.filters;
    if (state.sortBy) this.sortBy = state.sortBy;
    if (state.sortOrder) this.sortOrder = state.sortOrder;
    if (state.viewMode) this.viewMode = state.viewMode;
  }
}

// Create singleton instance
export const budgetSearchState = new BudgetSearchStateManager();
