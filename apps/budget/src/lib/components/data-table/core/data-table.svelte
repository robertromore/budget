<script lang="ts" generics="TData">
import type { Snippet } from 'svelte';
import type { ColumnDef, Table } from '@tanstack/table-core';
import {
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFacetedMinMaxValues,
} from '@tanstack/table-core';
import { createSvelteTable } from '$lib/components/ui/data-table';
import type {
	DataTableFeatures,
	DataTableState,
	DataTableStateHandlers,
	TableUISettings,
} from '../state/types';

interface Props {
	/** The data to display in the table */
	data: TData[];
	/** Column definitions */
	columns: ColumnDef<TData>[];
	/** Feature flags for enabling/disabling features */
	features?: DataTableFeatures;
	/** External state (optional - will use internal state if not provided) */
	state?: DataTableState;
	/** State change handlers (required if using external state) */
	handlers?: DataTableStateHandlers;
	/** UI settings for table appearance */
	uiSettings?: TableUISettings;
	/** Custom table snippet for rendering (optional) */
	children?: Snippet<[Table<TData>]>;
	/** CSS class for the table wrapper */
	class?: string;
	/** Whether to enable server-side pagination */
	serverPagination?: boolean;
	/** Total row count for server-side pagination */
	rowCount?: number;
	/** Custom filter functions registry */
	filterFns?: Record<string, any>;
}

let {
	data = [],
	columns = [],
	features = {},
	state: externalState,
	handlers,
	uiSettings = {},
	children,
	class: className,
	serverPagination = false,
	rowCount,
	filterFns = {},
}: Props = $props();

// Internal state management (used when no external state is provided)
let internalSorting = $state(externalState?.sorting ?? []);
let internalColumnVisibility = $state(externalState?.columnVisibility ?? {});
let internalColumnFilters = $state(externalState?.columnFilters ?? []);
let internalPagination = $state(externalState?.pagination ?? { pageIndex: 0, pageSize: 10 });
let internalRowSelection = $state(externalState?.rowSelection ?? {});
let internalColumnPinning = $state(externalState?.columnPinning ?? {});
let internalExpanded = $state(externalState?.expanded ?? {});
let internalGrouping = $state(externalState?.grouping ?? []);
let internalGlobalFilter = $state(externalState?.globalFilter ?? '');
let internalColumnOrder = $state(externalState?.columnOrder ?? []);

// Determine whether to use external or internal state
const useExternalState = $derived(!!externalState);

// Create reactive getters for current state
const currentSorting = $derived(useExternalState ? externalState!.sorting ?? [] : internalSorting);
const currentColumnVisibility = $derived(
	useExternalState ? externalState!.columnVisibility ?? {} : internalColumnVisibility
);
const currentColumnFilters = $derived(
	useExternalState ? externalState!.columnFilters ?? [] : internalColumnFilters
);
const currentPagination = $derived(
	useExternalState
		? externalState!.pagination ?? { pageIndex: 0, pageSize: 10 }
		: internalPagination
);
const currentRowSelection = $derived(
	useExternalState ? externalState!.rowSelection ?? {} : internalRowSelection
);
const currentColumnPinning = $derived(
	useExternalState ? externalState!.columnPinning ?? {} : internalColumnPinning
);
const currentExpanded = $derived(
	useExternalState ? externalState!.expanded ?? {} : internalExpanded
);
const currentGrouping = $derived(
	useExternalState ? externalState!.grouping ?? [] : internalGrouping
);
const currentGlobalFilter = $derived(
	useExternalState ? externalState!.globalFilter ?? '' : internalGlobalFilter
);
const currentColumnOrder = $derived(
	useExternalState ? externalState!.columnOrder ?? [] : internalColumnOrder
);

// State change handlers
function handleSortingChange(updater: any) {
	if (useExternalState && handlers?.onSortingChange) {
		handlers.onSortingChange(updater);
	} else {
		internalSorting = typeof updater === 'function' ? updater(internalSorting) : updater;
	}
}

function handleColumnVisibilityChange(updater: any) {
	if (useExternalState && handlers?.onColumnVisibilityChange) {
		handlers.onColumnVisibilityChange(updater);
	} else {
		internalColumnVisibility =
			typeof updater === 'function' ? updater(internalColumnVisibility) : updater;
	}
}

function handleColumnFiltersChange(updater: any) {
	if (useExternalState && handlers?.onColumnFiltersChange) {
		handlers.onColumnFiltersChange(updater);
	} else {
		internalColumnFilters =
			typeof updater === 'function' ? updater(internalColumnFilters) : updater;
	}
}

function handlePaginationChange(updater: any) {
	if (useExternalState && handlers?.onPaginationChange) {
		handlers.onPaginationChange(updater);
	} else {
		internalPagination = typeof updater === 'function' ? updater(internalPagination) : updater;
	}
}

function handleRowSelectionChange(updater: any) {
	if (useExternalState && handlers?.onRowSelectionChange) {
		handlers.onRowSelectionChange(updater);
	} else {
		internalRowSelection =
			typeof updater === 'function' ? updater(internalRowSelection) : updater;
	}
}

function handleColumnPinningChange(updater: any) {
	if (useExternalState && handlers?.onColumnPinningChange) {
		handlers.onColumnPinningChange(updater);
	} else {
		internalColumnPinning =
			typeof updater === 'function' ? updater(internalColumnPinning) : updater;
	}
}

function handleExpandedChange(updater: any) {
	if (useExternalState && handlers?.onExpandedChange) {
		handlers.onExpandedChange(updater);
	} else {
		internalExpanded = typeof updater === 'function' ? updater(internalExpanded) : updater;
	}
}

function handleGroupingChange(updater: any) {
	if (useExternalState && handlers?.onGroupingChange) {
		handlers.onGroupingChange(updater);
	} else {
		internalGrouping = typeof updater === 'function' ? updater(internalGrouping) : updater;
	}
}

function handleGlobalFilterChange(updater: any) {
	if (useExternalState && handlers?.onGlobalFilterChange) {
		handlers.onGlobalFilterChange(updater);
	} else {
		internalGlobalFilter =
			typeof updater === 'function' ? updater(internalGlobalFilter) : updater;
	}
}

function handleColumnOrderChange(updater: any) {
	if (useExternalState && handlers?.onColumnOrderChange) {
		handlers.onColumnOrderChange(updater);
	} else {
		internalColumnOrder = typeof updater === 'function' ? updater(internalColumnOrder) : updater;
	}
}

// Create the table instance
const table = $derived(
	createSvelteTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		// Conditionally include row models based on features
		...(features.sorting && {
			getSortedRowModel: getSortedRowModel(),
			enableSorting: true,
			onSortingChange: handleSortingChange,
		}),
		...(features.filtering && {
			getFilteredRowModel: getFilteredRowModel(),
			getFacetedRowModel: getFacetedRowModel(),
			getFacetedUniqueValues: getFacetedUniqueValues(),
			getFacetedMinMaxValues: getFacetedMinMaxValues(),
			enableColumnFilters: true,
			onColumnFiltersChange: handleColumnFiltersChange,
			filterFns,
		}),
		...(features.pagination && {
			getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
			manualPagination: serverPagination,
			onPaginationChange: handlePaginationChange,
		}),
		...(features.rowSelection && {
			enableRowSelection: true,
			onRowSelectionChange: handleRowSelectionChange,
		}),
		...(features.columnVisibility && {
			onColumnVisibilityChange: handleColumnVisibilityChange,
		}),
		...(features.columnPinning && {
			enableColumnPinning: true,
			onColumnPinningChange: handleColumnPinningChange,
		}),
		...(features.expanding && {
			onExpandedChange: handleExpandedChange,
		}),
		...(features.grouping && {
			onGroupingChange: handleGroupingChange,
		}),
		...(features.globalFilter && {
			onGlobalFilterChange: handleGlobalFilterChange,
		}),
		...(features.columnReordering && {
			onColumnOrderChange: handleColumnOrderChange,
		}),
		// Current state
		state: {
			...(features.sorting && { sorting: currentSorting }),
			...(features.filtering && { columnFilters: currentColumnFilters }),
			...(features.pagination && { pagination: currentPagination }),
			...(features.rowSelection && { rowSelection: currentRowSelection }),
			...(features.columnVisibility && { columnVisibility: currentColumnVisibility }),
			...(features.columnPinning && { columnPinning: currentColumnPinning }),
			...(features.expanding && { expanded: currentExpanded }),
			...(features.grouping && { grouping: currentGrouping }),
			...(features.globalFilter && { globalFilter: currentGlobalFilter }),
			...(features.columnReordering && { columnOrder: currentColumnOrder }),
		},
		// Server-side pagination
		...(serverPagination &&
			rowCount !== undefined && {
				rowCount,
			}),
	})
);

// Apply UI settings
const densityClass = $derived(
	uiSettings.density === 'compact'
		? 'text-xs'
		: uiSettings.density === 'comfortable'
			? 'text-sm'
			: ''
);
const borderClass = $derived(uiSettings.bordered ? 'border' : '');
const stripedClass = $derived(uiSettings.striped ? '[&_tbody_tr:nth-child(even)]:bg-muted/50' : '');
const hoverableClass = $derived(
	uiSettings.hoverable ? '[&_tbody_tr]:hover:bg-muted/50 [&_tbody_tr]:cursor-pointer' : ''
);
const stickyHeaderClass = $derived(uiSettings.stickyHeader ? '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background' : '');

const tableClasses = $derived(
	[densityClass, borderClass, stripedClass, hoverableClass, stickyHeaderClass, className]
		.filter(Boolean)
		.join(' ')
);
</script>

<div class={tableClasses}>
	{#if children}
		{@render children(table)}
	{/if}
</div>
