/**
 * Generic Entity Search State Factory
 * Reusable search state management for entity overview pages
 */

import { countActiveFilters } from '$lib/utils/search';

export type ViewMode = 'list' | 'grid';
export type SortOrder = 'asc' | 'desc';

export interface EntitySearchStateConfig<TFilters extends Record<string, any>, TSortBy extends string> {
	defaultViewMode?: ViewMode;
	defaultSortBy?: TSortBy;
	defaultSortOrder?: SortOrder;
	initialFilters?: TFilters;
}

export class EntitySearchState<TEntity, TFilters extends Record<string, any>, TSortBy extends string> {
	query = $state('');
	filters = $state<TFilters>({} as TFilters);
	viewMode = $state<ViewMode>('grid');
	sortBy = $state<TSortBy>('' as TSortBy);
	sortOrder = $state<SortOrder>('asc');
	results = $state<TEntity[]>([]);

	constructor(config?: EntitySearchStateConfig<TFilters, TSortBy>) {
		this.viewMode = config?.defaultViewMode ?? 'grid';
		this.sortBy = config?.defaultSortBy ?? ('' as TSortBy);
		this.sortOrder = config?.defaultSortOrder ?? 'asc';
		this.filters = config?.initialFilters ?? ({} as TFilters);
	}

	// Query methods
	updateQuery(query: string): void {
		this.query = query;
	}

	clearQuery(): void {
		this.query = '';
	}

	// Filter methods
	updateFilters(newFilters: Partial<TFilters>): void {
		this.filters = { ...this.filters, ...newFilters };
	}

	updateFilter<K extends keyof TFilters>(key: K, value: TFilters[K]): void {
		const newFilters = { ...this.filters };

		if (value === undefined || value === null || value === '') {
			delete newFilters[key];
		} else {
			newFilters[key] = value;
		}

		this.filters = newFilters;
	}

	clearFilters(): void {
		this.filters = {} as TFilters;
	}

	clearAllFilters(): void {
		this.query = '';
		this.filters = {} as TFilters;
		this.results = [];
	}

	// Sort methods
	updateSort(sortBy: TSortBy, sortOrder?: SortOrder): void {
		this.sortBy = sortBy;
		if (sortOrder !== undefined) {
			this.sortOrder = sortOrder;
		}
	}

	toggleSortOrder(): void {
		this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
	}

	// Results methods
	setResults(results: TEntity[]): void {
		this.results = results;
	}

	clearResults(): void {
		this.results = [];
	}

	// Computed/derived values
	isSearchActive(): boolean {
		return this.query.trim() !== '' || this.hasActiveFilters();
	}

	hasActiveFilters(): boolean {
		return countActiveFilters(this.filters) > 0;
	}

	getActiveFilterCount(): number {
		return countActiveFilters(this.filters);
	}

	getSearchParams(): { query: string; filters: TFilters } {
		return {
			query: this.query,
			filters: this.filters
		};
	}

	// View mode methods
	setViewMode(mode: ViewMode): void {
		this.viewMode = mode;
	}

	toggleViewMode(): void {
		this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
	}
}

/**
 * Factory function to create a new search state instance
 */
export function createEntitySearchState<
	TEntity,
	TFilters extends Record<string, any>,
	TSortBy extends string
>(config?: EntitySearchStateConfig<TFilters, TSortBy>): EntitySearchState<TEntity, TFilters, TSortBy> {
	return new EntitySearchState<TEntity, TFilters, TSortBy>(config);
}
