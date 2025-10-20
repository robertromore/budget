import {createLocalStorageState} from '$lib/utils/local-storage.svelte';
import type {
  BudgetRecommendationWithRelations,
  RecommendationStatus,
  RecommendationType,
  RecommendationPriority
} from '$lib/schema/recommendations';

export interface RecommendationSearchFilters {
  status?: RecommendationStatus;
  type?: RecommendationType;
  priority?: RecommendationPriority;
  budgetId?: number;
  accountId?: number;
  categoryId?: number;
  minConfidence?: number;
  includeExpired?: boolean;
}

interface RecommendationSearchState {
  query: string;
  filters: RecommendationSearchFilters;
  results: BudgetRecommendationWithRelations[];
  isLoading: boolean;
  totalCount: number;
  hasMore: boolean;
  sortBy: 'created' | 'confidence' | 'priority' | 'type';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list' | 'table';
}

/**
 * State management for recommendation search and filtering
 */
class RecommendationSearchStateManager {
  // Persistent state
  private viewModeState = createLocalStorageState('recommendation-search-view-mode', 'grid' as const);
  private sortByState = createLocalStorageState<'created' | 'confidence' | 'priority' | 'type'>('recommendation-search-sort-by', 'priority');
  private sortOrderState = createLocalStorageState<'asc' | 'desc'>('recommendation-search-sort-order', 'desc');

  // Reactive state
  query = $state('');
  filters = $state<RecommendationSearchFilters>({});
  results = $state<BudgetRecommendationWithRelations[]>([]);
  isLoading = $state(false);
  totalCount = $state(0);
  hasMore = $state(false);

  // Getters for persistent state
  get viewMode() { return this.viewModeState.value; }
  set viewMode(value: 'grid' | 'list' | 'table') { this.viewModeState.value = value; }

  get sortBy() { return this.sortByState.value; }
  set sortBy(value: 'created' | 'confidence' | 'priority' | 'type') { this.sortByState.value = value; }

  get sortOrder() { return this.sortOrderState.value; }
  set sortOrder(value: 'asc' | 'desc') { this.sortOrderState.value = value; }

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

  updateFilters(newFilters: RecommendationSearchFilters) {
    this.filters = newFilters;
  }

  updateFilter<K extends keyof RecommendationSearchFilters>(
    key: K,
    value: RecommendationSearchFilters[K]
  ) {
    const newFilters = { ...this.filters };
    if (value === undefined || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    this.filters = newFilters;
  }

  clearAllFilters() {
    this.query = '';
    this.filters = {};
  }

  clearQuery() {
    this.query = '';
  }

  clearFilter(key: keyof RecommendationSearchFilters) {
    const newFilters = { ...this.filters };
    delete newFilters[key];
    this.filters = newFilters;
  }

  setResults(results: BudgetRecommendationWithRelations[], totalCount: number = results.length, hasMore: boolean = false) {
    this.results = results;
    this.totalCount = totalCount;
    this.hasMore = hasMore;
  }

  appendResults(newResults: BudgetRecommendationWithRelations[], totalCount: number, hasMore: boolean = false) {
    this.results = [...this.results, ...newResults];
    this.totalCount = totalCount;
    this.hasMore = hasMore;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  setSorting(sortBy: RecommendationSearchState['sortBy'], sortOrder?: RecommendationSearchState['sortOrder']) {
    this.sortBy = sortBy;
    if (sortOrder) {
      this.sortOrder = sortOrder;
    }
  }

  toggleViewMode() {
    if (this.viewMode === 'grid') {
      this.viewMode = 'list';
    } else if (this.viewMode === 'list') {
      this.viewMode = 'table';
    } else {
      this.viewMode = 'grid';
    }
  }

  // Get current search parameters for API calls
  getSearchParams() {
    return {
      query: this.query || undefined,
      ...this.filters,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };
  }

  // Reset to initial state
  reset() {
    this.query = '';
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
      viewMode: this.viewMode
    };
  }

  importState(state: Partial<RecommendationSearchState>) {
    if (state.query !== undefined) this.query = state.query;
    if (state.filters) this.filters = state.filters;
    if (state.sortBy) this.sortBy = state.sortBy;
    if (state.sortOrder) this.sortOrder = state.sortOrder;
    if (state.viewMode) this.viewMode = state.viewMode;
  }
}

// Create singleton instance
export const recommendationSearchState = new RecommendationSearchStateManager();
