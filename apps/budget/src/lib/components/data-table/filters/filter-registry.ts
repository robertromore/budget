import type { Row, FilterFn } from '@tanstack/table-core';

/**
 * Generic filter function type that works with any data type
 */
export type GenericFilterFn<TData> = (
	row: Row<TData>,
	columnId: string,
	filterValue: any,
	addMeta: (meta: any) => void
) => boolean;

/**
 * Filter registry maps filter names to filter functions
 * Each table type can have its own registry
 */
export type FilterRegistry<TData> = {
	[filterName: string]: GenericFilterFn<TData>;
};

/**
 * Common filter value types
 */
export type AmountFilterValue = {
	type: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between';
	value?: number;
	min?: number;
	max?: number;
};

export type RangeFilterValue<T = number> = {
	min?: T;
	max?: T;
};

export type TextFilterValue = {
	type: 'contains' | 'equals' | 'startsWith' | 'endsWith';
	value: string;
	caseSensitive?: boolean;
};

/**
 * Get a filter function from a registry by name
 */
export function getFilterFn<TData>(
	registry: FilterRegistry<TData>,
	filterName: string
): GenericFilterFn<TData> | undefined {
	return registry[filterName];
}

/**
 * Register a new filter function
 */
export function registerFilter<TData>(
	registry: FilterRegistry<TData>,
	filterName: string,
	filterFn: GenericFilterFn<TData>
): void {
	registry[filterName] = filterFn;
}
