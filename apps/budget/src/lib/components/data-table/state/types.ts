import type {
	ColumnDef,
	SortingState,
	VisibilityState,
	ColumnFiltersState,
	PaginationState,
	RowSelectionState,
	ColumnPinningState,
	ExpandedState,
	GroupingState,
} from '@tanstack/table-core';

/**
 * Extended column meta with custom properties
 */
export interface ExtendedColumnMeta {
	headerClass?: string;
	cellClass?: string;
}

/**
 * Type helper to extend TanStack Table's ColumnDef with our custom meta
 */
declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface ColumnMeta<TData, TValue> {
		headerClass?: string;
		cellClass?: string;
	}
}

/**
 * Optional features that can be enabled on the data table
 */
export interface DataTableFeatures {
	/** Enable column sorting */
	sorting?: boolean;
	/** Enable column filtering */
	filtering?: boolean;
	/** Enable pagination */
	pagination?: boolean;
	/** Enable row selection with checkboxes */
	rowSelection?: boolean;
	/** Enable column visibility toggling */
	columnVisibility?: boolean;
	/** Enable column pinning (left/right) */
	columnPinning?: boolean;
	/** Enable column reordering via drag-and-drop */
	columnReordering?: boolean;
	/** Enable row grouping */
	grouping?: boolean;
	/** Enable row expanding */
	expanding?: boolean;
	/** Enable global search/filtering */
	globalFilter?: boolean;
}

/**
 * External state for the data table
 * Allows components to manage their own state or use default internal state
 */
export interface DataTableState {
	sorting?: SortingState;
	columnVisibility?: VisibilityState;
	columnFilters?: ColumnFiltersState;
	pagination?: PaginationState;
	rowSelection?: RowSelectionState;
	columnPinning?: ColumnPinningState;
	expanded?: ExpandedState;
	grouping?: GroupingState;
	globalFilter?: string;
	columnOrder?: string[];
}

/**
 * State change handlers for the data table
 */
export interface DataTableStateHandlers {
	onSortingChange?: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
	onColumnVisibilityChange?: (
		updater: VisibilityState | ((old: VisibilityState) => VisibilityState)
	) => void;
	onColumnFiltersChange?: (
		updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)
	) => void;
	onPaginationChange?: (
		updater: PaginationState | ((old: PaginationState) => PaginationState)
	) => void;
	onRowSelectionChange?: (
		updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)
	) => void;
	onColumnPinningChange?: (
		updater: ColumnPinningState | ((old: ColumnPinningState) => ColumnPinningState)
	) => void;
	onExpandedChange?: (updater: ExpandedState | ((old: ExpandedState) => ExpandedState)) => void;
	onGroupingChange?: (updater: GroupingState | ((old: GroupingState) => GroupingState)) => void;
	onGlobalFilterChange?: (updater: string | ((old: string) => string)) => void;
	onColumnOrderChange?: (updater: string[] | ((old: string[]) => string[])) => void;
}

/**
 * Server-side pagination metadata
 */
export interface ServerPaginationState {
	page: number;
	pageSize: number;
	totalCount?: number;
	totalPages?: number;
}

/**
 * Simplified column definition for easier usage
 */
export interface SimpleColumnDef<TData> {
	/** Unique column identifier */
	id: string;
	/** Column header text or component */
	header: string | ColumnDef<TData>['header'];
	/** Accessor key for data */
	accessorKey?: keyof TData;
	/** Cell rendering function or component */
	cell?: ColumnDef<TData>['cell'];
	/** Enable sorting for this column */
	sortable?: boolean;
	/** Enable filtering for this column */
	filterable?: boolean;
	/** Enable hiding for this column */
	hideable?: boolean;
	/** Custom sorting function */
	sortingFn?: ColumnDef<TData>['sortingFn'];
	/** Custom filter function */
	filterFn?: ColumnDef<TData>['filterFn'];
	/** Column metadata */
	meta?: ColumnDef<TData>['meta'];
	/** Header class */
	headerClass?: string;
	/** Cell class */
	cellClass?: string;
}

/**
 * Density setting for table rows
 */
export type TableDensity = 'normal' | 'comfortable' | 'compact';

/**
 * Table UI settings
 */
export interface TableUISettings {
	/** Row density */
	density?: TableDensity;
	/** Sticky header */
	stickyHeader?: boolean;
	/** Show border */
	bordered?: boolean;
	/** Striped rows */
	striped?: boolean;
	/** Hoverable rows */
	hoverable?: boolean;
}
