import type { Schedule } from "$lib/schema/schedules";
import { isNotEmptyObject } from "$lib/utils";
import { createLocalStorageState } from "$lib/utils/local-storage.svelte";

export interface ScheduleSearchFilters {
  status?: "active" | "inactive";
  recurring?: boolean;
  autoAdd?: boolean;
  amountType?: "exact" | "approximate" | "range";
  accountId?: number;
  payeeId?: number;
  categoryId?: number;
  budgetId?: number;
}

interface ScheduleSearchState {
  query: string;
  filters: ScheduleSearchFilters;
  results: Schedule[];
  isLoading: boolean;
  totalCount: number;
  hasMore: boolean;
  sortBy: "name" | "amount" | "created" | "status";
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
}

/**
 * State management for schedule search and filtering
 */
class ScheduleSearchStateManager {
  // Persistent state
  private viewModeState = createLocalStorageState(
    "schedule-search-view-mode",
    "grid" as "grid" | "list"
  );
  private sortByState = createLocalStorageState(
    "schedule-search-sort-by",
    "name" as "name" | "amount" | "created" | "status"
  );
  private sortOrderState = createLocalStorageState(
    "schedule-search-sort-order",
    "asc" as "asc" | "desc"
  );

  // Reactive state
  query = $state("");
  filters = $state<ScheduleSearchFilters>({});
  results = $state<Schedule[]>([]);
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
  set sortBy(value: "name" | "amount" | "created" | "status") {
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

  updateFilters(newFilters: ScheduleSearchFilters) {
    this.filters = newFilters;
  }

  updateFilter<K extends keyof ScheduleSearchFilters>(key: K, value: ScheduleSearchFilters[K]) {
    const newFilters = { ...this.filters };
    // Remove filter if value is undefined, null, or empty string
    if (value === undefined || value === null) {
      delete newFilters[key];
    } else if (typeof value === "string") {
      if (value.length === 0) {
        delete newFilters[key];
      } else {
        newFilters[key] = value as ScheduleSearchFilters[K];
      }
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

  clearFilter(key: keyof ScheduleSearchFilters) {
    const newFilters = { ...this.filters };
    delete newFilters[key];
    this.filters = newFilters;
  }

  setResults(results: Schedule[], totalCount: number = results.length, hasMore: boolean = false) {
    this.results = results;
    this.totalCount = totalCount;
    this.hasMore = hasMore;
  }

  appendResults(newResults: Schedule[], totalCount: number, hasMore: boolean = false) {
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

  setSorting(sortBy: ScheduleSearchState["sortBy"], sortOrder?: ScheduleSearchState["sortOrder"]) {
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

  importState(state: Partial<ScheduleSearchState>) {
    if (state.query !== undefined) this.query = state.query;
    if (state.filters) this.filters = state.filters;
    if (state.sortBy) this.sortBy = state.sortBy;
    if (state.sortOrder) this.sortOrder = state.sortOrder;
    if (state.viewMode) this.viewMode = state.viewMode;
  }
}

// Create singleton instance
export const scheduleSearchState = new ScheduleSearchStateManager();
