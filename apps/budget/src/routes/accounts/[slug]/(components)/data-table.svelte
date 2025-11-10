<script lang="ts" generics="TValue">
import {
	type ColumnDef,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getGroupedRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type Table as TTable
} from '@tanstack/table-core';
import {createSvelteTable, FlexRender} from '$lib/components/ui/data-table';
import * as Table from '$lib/components/ui/table';
import type {TransactionsFormat} from '$lib/types';
import {DataTablePagination} from '.';
import DataTableToolbar from './data-table-toolbar.svelte';
import TransactionBulkActions from './transaction-bulk-actions.svelte';
import {filtering, filters, setFiltering, setGlobalFilter} from '../(data)/filters.svelte';
import {pagination, setPagination} from '../(data)/pagination.svelte';
import {selection, setSelection} from '../(data)/selection.svelte';
import {setSorting, sorting} from '../(data)/sorts.svelte';
import {visibility, setVisibility} from '../(data)/visibility.svelte';
import {grouping, setGrouping} from '../(data)/groups.svelte';
import {expanded, setExpanded} from '../(data)/expanded.svelte';
import {pinning, setPinning} from '../(data)/pinning.svelte';
import {columnOrder, setColumnOrder} from '../(data)/column-order.svelte';
import type {View} from '$lib/schema';
import {CurrentViewState, CurrentViewsState} from '$lib/states/views';
import {page} from '$app/state';
import {untrack} from 'svelte';
import {currentViews} from '$lib/states/views';
import {DateFiltersState} from '$lib/states/ui/date-filters.svelte';
import type {FacetedFilterOption} from '$lib/types';
import {dayFmt} from '$lib/utils/date-formatters';
import {parseDate} from '@internationalized/date';
import {timezone, currentDate} from '$lib/utils/dates';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import {cn} from '$lib/utils';
import SortableHeader from './sortable-header.svelte';
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	rectIntersection,
	type DragEndEvent
} from '@dnd-kit-svelte/core';
import {
	SortableContext,
	horizontalListSortingStrategy,
	arrayMove
} from '@dnd-kit-svelte/sortable';
import {restrictToHorizontalAxis} from '@dnd-kit-svelte/modifiers';

interface Props {
	columns: ColumnDef<TransactionsFormat, TValue>[];
	transactions?: TransactionsFormat[];
	views?: View[];
	table?: TTable<TransactionsFormat>;
	serverPagination?: {page: number; pageSize: number; totalCount?: number; totalPages?: number};
	updatePagination?: (pageIndex: number, pageSize: number) => void;
	budgetCount?: number;
	onBulkDelete?: (transactions: TransactionsFormat[]) => void;
}

let {
	columns,
	transactions,
	views,
	table = $bindable(),
	serverPagination,
	updatePagination,
	budgetCount = 0,
	onBulkDelete
}: Props = $props();

// Initialization state tracking
let isContextReady = $state(false);
let isViewsInitialized = $state(false);

// Initialize context SYNCHRONOUSLY before any child components render
// This must happen outside $effect to be available immediately
const currentViewsStateValue = new CurrentViewsState<TransactionsFormat>(null);

// Set context using runed Context API (not Svelte's setContext)
// This makes the context available to child components via currentViews.get()
currentViews.set(currentViewsStateValue);

// Mark as ready after synchronous initialization
isContextReady = true;
console.debug('[DataTable] Context initialized and ready');

// Generate date filters from actual transaction dates (excluding future scheduled transactions)
const generateDateFilters = (transactions: TransactionsFormat[]): FacetedFilterOption[] => {
	if (!transactions || transactions.length === 0) return [];

	// Include all transactions except future scheduled ones
	// This includes cleared/pending transactions and auto-created scheduled transactions that have already occurred
	const todayDate = currentDate;

	const relevantTransactions = transactions.filter((t) => {
		// Include all non-scheduled transactions
		if (t.status !== 'scheduled') return true;

		// For scheduled transactions, only include those that are in the past or today
		if (t.date) {
			// Compare DateValue objects directly using compare() method
			return t.date.compare(todayDate) <= 0;
		}

		return false;
	});

	const uniqueDates = new Set<string>();
	relevantTransactions.forEach((transaction) => {
		if (transaction.date) {
			const dateStr = transaction.date.toString();
			uniqueDates.add(dateStr);
		}
	});

	return Array.from(uniqueDates).map((dateStr) => {
		const count = relevantTransactions.filter((t) => t.date?.toString() === dateStr).length;
		return {
			value: dateStr,
			label: dayFmt.format(parseDate(dateStr).toDate(timezone)),
			count
		};
	});
};

// Initialize DateFiltersState synchronously to ensure context is available for child components
// Start with empty filters, then populate reactively to avoid initial value capture issues
const dateFiltersState = new DateFiltersState([]);

// Reactively update dateFilters when transactions change
$effect(() => {
	const dateFilters = generateDateFilters(transactions ?? []);
	dateFiltersState.dateFilters = dateFilters;
});

const allDates = $derived(dateFiltersState?.dateFilters);

// Sync client pagination with server pagination when it changes
$effect(() => {
	if (
		serverPagination &&
		serverPagination.page !== undefined &&
		serverPagination.pageSize !== undefined
	) {
		const currentPag = pagination();
		const serverPageIndex = serverPagination.page;
		const serverPageSize = serverPagination.pageSize;

		// Only update if there's a mismatch
		if (currentPag.pageIndex !== serverPageIndex || currentPag.pageSize !== serverPageSize) {
			setPagination({
				pageIndex: serverPageIndex,
				pageSize: serverPageSize
			});
		}
	}
});

// Intercept visibility state to hide balance column when sorting by columns
// other than id or date, and hide budget column when no budgets exist.
const columnVisibility = () => {
	let visibleColumns = visibility();
	const sortingState = sorting();
	const firstSort = sortingState[0];

	// Hide balance column when sorting by columns other than id or date
	if (sortingState.length > 0 && firstSort && firstSort.id !== 'id' && firstSort.id !== 'date') {
		visibleColumns = Object.assign({}, visibleColumns, {balance: false});
	}

	// Hide budget column by default if no budgets exist
	if (budgetCount === 0 && !('budget' in visibleColumns)) {
		visibleColumns = Object.assign({}, visibleColumns, {budget: false});
	}

	return visibleColumns;
};

// Custom pagination handler that updates both local state and server state
const handlePaginationChange = (updater: any) => {
	const currentPag = pagination();

	// Apply the update to get the new state
	const newPagination = typeof updater === 'function' ? updater(currentPag) : updater;

	// Update local state
	setPagination(newPagination);

	// Sync pageSize change back to view
	if (currentViewsStateValue?.activeView && currentPag.pageSize !== newPagination.pageSize) {
		currentViewsStateValue.activeView.view.setPageSize(newPagination.pageSize);
	}

	// Call the server update callback if provided
	if (updatePagination) {
		updatePagination(newPagination.pageIndex, newPagination.pageSize);
	}
};

table = createSvelteTable<TransactionsFormat>({
	get data() {
		return transactions || [];
	},
	getRowId: (row) => String(row.id),
	state: {
		get sorting() {
			return sorting();
		},
		get columnVisibility() {
			return columnVisibility();
		},
		get rowSelection() {
			return selection();
		},
		get columnFilters() {
			return filtering();
		},
		get pagination() {
			return pagination();
		},
		get grouping() {
			return grouping();
		},
		get expanded() {
			return expanded();
		},
		get columnPinning() {
			return pinning();
		},
		get columnOrder() {
			return columnOrder();
		}
	},
	columns,
	enableRowSelection: true,
	onRowSelectionChange: setSelection,
	onSortingChange: setSorting,
	onColumnFiltersChange: setFiltering,
	onColumnVisibilityChange: setVisibility,
	onPaginationChange: handlePaginationChange,
	onGlobalFilterChange: setGlobalFilter,
	onGroupingChange: setGrouping,
	onExpandedChange: setExpanded,
	onColumnPinningChange: setPinning,
	onColumnOrderChange: setColumnOrder,
	getCoreRowModel: getCoreRowModel(),
	getFilteredRowModel: getFilteredRowModel(),
	getPaginationRowModel: getPaginationRowModel(),
	getSortedRowModel: getSortedRowModel(),
	getFacetedRowModel: getFacetedRowModel(),
	getGroupedRowModel: getGroupedRowModel(),
	getExpandedRowModel: getExpandedRowModel(),
	getFacetedUniqueValues: (table: TTable<TransactionsFormat>, columnId: string) => () => {
		const rows = table.getGlobalFacetedRowModel().flatRows;
		if (columnId === 'date') {
			const newmap = new Map();
			const column = table.getColumn(columnId);
			const filterFn = column?.getFilterFn();

			for (const {value: date} of allDates || []) {
				let count = 0;
				for (const row of rows) {
					// Use the exact same filter function that TanStack Table uses
					if (filterFn) {
						const matches = filterFn(row, columnId, new Set([date.toString()]), () => {});
						if (matches) {
							count++;
						}
					}
				}
				if (count > 0) {
					newmap.set(date.toString(), count);
				}
			}

			return newmap;
		}

		return getFacetedUniqueValues<TransactionsFormat>()(table, columnId)();
	},
	// globalFilterFn: fuzzyFilter,
	filterFns: {...filters},
	groupedColumnMode: 'reorder',
	autoResetPageIndex: false,
	autoResetExpanded: false
});

const viewList = $derived(views || page.data['views'] || []);

// Note: Context initialization moved to top of script for synchronous access

let lastViewSignature: string | null = null;
let hasAppliedInitialView = false;
let lastActiveViewId: number | undefined;

// Update current views state when viewList changes
$effect(() => {
	if (!isContextReady) {
		console.debug('[DataTable] Waiting for context to initialize before processing views');
		return;
	}

	const signature = viewList
		.map((view: View) => {
			const sortSignature =
				view.display?.sort?.map((sort) => `${sort.id}:${sort.desc ?? false}`).join('|') ?? '';
			return `${view.id}:${sortSignature}`;
		})
		.join(';');

	if (signature !== lastViewSignature) {
		lastViewSignature = signature;
		hasAppliedInitialView = false;
	}

	// Use untrack to prevent state modifications from re-triggering this effect
	untrack(() => {

		console.debug('[DataTable] Processing', viewList.length, 'views');

		const _currentViewStates: CurrentViewState<TransactionsFormat>[] = viewList.map(
			(view: View) => new CurrentViewState<TransactionsFormat>(view, table)
		);

		// Clear existing views and add new ones
		currentViewsStateValue.viewsStates.clear();
		_currentViewStates.forEach((viewState) => {
			currentViewsStateValue!.viewsStates.set(viewState.view.id, viewState);
		});

		if (_currentViewStates.length === 0) {
			isViewsInitialized = false;
			console.warn('[DataTable] No views available');
			return;
		}

		const targetViewState = lastActiveViewId
			? currentViewsStateValue.viewsStates.get(lastActiveViewId) ?? _currentViewStates[0]!
			: _currentViewStates[0]!;

		if (!targetViewState) {
			isViewsInitialized = false;
			return;
		}

		if (!hasAppliedInitialView || lastActiveViewId !== targetViewState.view.id) {
			hasAppliedInitialView = true;
			lastActiveViewId = targetViewState.view.id;
			const targetViewId = targetViewState.view.id;
			currentViewsStateValue.activeViewId = targetViewId;

			queueMicrotask(() => {
				const latestViewState = currentViewsStateValue.viewsStates.get(targetViewId);
				if (latestViewState) {
					currentViewsStateValue.setActive(targetViewId);
					isViewsInitialized = true;
					console.debug('[DataTable] Views initialized, active view:', targetViewId);
				}
			});
		} else {
			isViewsInitialized = true;
		}
	});
});

// Sync local state when active view changes
$effect(() => {
	const activeView = currentViewsStateValue.activeView;
	if (!activeView) return;

	// Sync local state from the active view's display settings
	const viewColumnOrder = activeView.view.getColumnOrder();
	const viewPinning = activeView.view.getPinning();
	const viewSorting = activeView.view.getSorting();
	const viewGrouping = activeView.view.getGrouping();
	const viewExpanded = activeView.view.getExpanded();
	const viewVisibility = activeView.view.getVisibility();
	const viewPageSize = activeView.view.getPageSize();

	// Only update if different to avoid unnecessary state changes
	if (JSON.stringify(viewColumnOrder) !== JSON.stringify(columnOrder())) {
		setColumnOrder(viewColumnOrder);
	}
	if (JSON.stringify(viewPinning) !== JSON.stringify(pinning())) {
		setPinning(viewPinning);
	}
	if (JSON.stringify(viewSorting) !== JSON.stringify(sorting())) {
		setSorting(viewSorting);
	}
	if (JSON.stringify(viewGrouping) !== JSON.stringify(grouping())) {
		setGrouping(viewGrouping);
	}
	if (JSON.stringify(viewExpanded) !== JSON.stringify(expanded())) {
		setExpanded(viewExpanded);
	}
	if (JSON.stringify(viewVisibility) !== JSON.stringify(visibility())) {
		setVisibility(viewVisibility);
	}
	// Sync page size from view
	const currentPag = pagination();
	if (currentPag.pageSize !== viewPageSize) {
		setPagination({
			pageIndex: currentPag.pageIndex,
			pageSize: viewPageSize
		});
	}
});

// Get density from current view
const density = $derived(currentViewsStateValue?.activeView?.view.getDensity() ?? 'normal');

// Get sticky header setting from current view
const stickyHeader = $derived(currentViewsStateValue?.activeView?.view.getStickyHeader() ?? false);

// DnD Kit setup for column reordering
const sensors = useSensors(
	useSensor(PointerSensor, {
		activationConstraint: {
			distance: 8, // 8px movement required to start drag
		},
	})
);

const specialColumns = ['select-col', 'expand-contract-col', 'actions', 'transfer'];

function isColumnDraggable(columnId: string): boolean {
	return !specialColumns.includes(columnId);
}

let activeId = $state<string | null>(null);
let activeColumnId = $state<string | null>(null);
let columnTransforms = $state<Map<string, string>>(new Map());

function handleDragStart(event: any) {
	activeId = event.active.id;
	// Find the column ID for the active header
	const headerGroup = table.getHeaderGroups()[0];
	const activeHeader = headerGroup?.headers.find(h => h.id === event.active.id);
	activeColumnId = activeHeader?.column.id ?? null;
}

function handleDragEnd(event: DragEndEvent) {
	const {active, over} = event;

	if (over && active.id !== over.id && table) {
		const headerGroup = table.getHeaderGroups()[0];
		if (!headerGroup) return;

		const headers = headerGroup.headers;
		const oldIndex = headers.findIndex(h => h.id === active.id);
		const newIndex = headers.findIndex(h => h.id === over.id);

		if (oldIndex !== -1 && newIndex !== -1) {
			const columnIds = headers.map(h => h.column.id);
			const newOrder = arrayMove(columnIds, oldIndex, newIndex);

			table.setColumnOrder(newOrder);

			// Sync with view system
			if (currentViewsStateValue?.activeView) {
				currentViewsStateValue.activeView.syncColumnOrderFromTable();
			}
		}
	}

	activeId = null;
	activeColumnId = null;
	if (columnTransforms.size > 0) {
		columnTransforms = new Map();
	}
}

function handleDragCancel() {
	activeId = null;
	activeColumnId = null;
	if (columnTransforms.size > 0) {
		columnTransforms = new Map();
	}
}

function updateColumnTransform(columnId: string, transform: string) {
	const existing = columnTransforms.get(columnId);

	if (transform) {
		if (existing === transform) {
			return;
		}
		const nextTransforms = new Map(columnTransforms);
		nextTransforms.set(columnId, transform);
		columnTransforms = nextTransforms;
		return;
	}

	if (existing !== undefined) {
		const nextTransforms = new Map(columnTransforms);
		nextTransforms.delete(columnId);
		columnTransforms = nextTransforms;
	}
}

// Guard condition - only render when fully initialized
const canRender = $derived(isContextReady && isViewsInitialized);
</script>

{#if canRender}
	<div class="space-y-4">
		<DataTableToolbar {table} />

		<!-- Bulk Actions -->
		{#if onBulkDelete}
			<TransactionBulkActions {table} allTransactions={transactions || []} {onBulkDelete} />
		{/if}

		<div class="w-full rounded-md border">
			<DndContext
					{sensors}
					modifiers={[restrictToHorizontalAxis]}
					collisionDetection={rectIntersection}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}>
				<Table.Root stickyHeader={stickyHeader}>
					<Table.Header stickyHeader={stickyHeader}>
						{#each table.getHeaderGroups() as headerGroup, headerGroupIndex (headerGroup.id)}
							{@const headerIds = headerGroup.headers.map(h => h.id)}
							<SortableContext items={headerIds} strategy={horizontalListSortingStrategy}>
								<tr class={cn(
									'hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
									stickyHeader && 'bg-background'
								)}>
									{#each headerGroup.headers as header (header.id)}
										<SortableHeader
											{header}
											{density}
											{stickyHeader}
											isDraggable={isColumnDraggable(header.column.id)}
											onTransformChange={updateColumnTransform} />
									{/each}
								</tr>
							</SortableContext>
						{/each}
					</Table.Header>
				<Table.Body>
					{#each table.getRowModel().rows as row (row.id)}
						<Table.Row data-state={row.getIsSelected() && 'selected'} class="data-[state=selected]:border-l-4 data-[state=selected]:border-l-primary">
							{#each row.getVisibleCells() as cell (cell.id)}
								{@const isActive = activeColumnId === cell.column.id}
								{@const headerForCell = table.getHeaderGroups()[0]?.headers.find(h => h.column.id === cell.column.id)}
								{@const transform = headerForCell ? columnTransforms.get(headerForCell.id) : undefined}
								{@const cellStyle = transform ? `transform: ${transform};` : ''}
								{@const cellClass = cn(
									isActive ? 'opacity-0' : '',
									transform ? 'transition-transform duration-200' : ''
								)}
								{#if cell.getIsAggregated() && cell.column.columnDef.aggregatedCell}
									<Table.Cell {density} class={cellClass} style={cellStyle}>
										<FlexRender
											content={cell.column.columnDef.aggregatedCell}
											context={cell.getContext()} />
									</Table.Cell>
								{:else if cell.getIsPlaceholder()}
									<Table.Cell {density} class={cellClass} style={cellStyle}></Table.Cell>
								{:else if cell.column.columnDef.cell}
									<Table.Cell {density} class={cellClass} style={cellStyle}>
										<FlexRender
											content={cell.column.columnDef.cell}
											context={cell.getContext()} />
									</Table.Cell>
								{:else}
									<Table.Cell {density} class={cellClass} style={cellStyle}></Table.Cell>
								{/if}
							{/each}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={columns.length} class="h-24 text-center" {density}>No results.</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			<!-- Drag overlay to show the column being dragged -->
			<DragOverlay modifiers={[restrictToHorizontalAxis]}>
				{#if activeColumnId}
					<Table.Root class="bg-background border shadow-xl">
						<Table.Header>
							{#each table.getHeaderGroups() as headerGroup}
								{#each headerGroup.headers as header}
									{#if header.column.id === activeColumnId}
										<Table.Row>
											<Table.Head {density}>
												{#if header.column.columnDef.header}
													<FlexRender
														content={header.column.columnDef.header}
														context={header.getContext()} />
												{/if}
											</Table.Head>
										</Table.Row>
									{/if}
								{/each}
							{/each}
						</Table.Header>
						<Table.Body>
							{@const allRows = table.getRowModel().rows}
							{#each allRows as row}
								{#each row.getVisibleCells() as cell}
									{#if cell.column.id === activeColumnId}
										<Table.Row>
											<Table.Cell {density}>
												{#if cell.column.columnDef.cell}
													<FlexRender
														content={cell.column.columnDef.cell}
														context={cell.getContext()} />
												{/if}
											</Table.Cell>
										</Table.Row>
									{/if}
								{/each}
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</DragOverlay>
		</DndContext>
	</div>
		<DataTablePagination {table} />
	</div>
{:else}
	<!-- Loading state while context initializes -->
	<div class="flex items-center justify-center p-8">
		<LoaderCircle class="h-6 w-6 animate-spin text-muted-foreground" />
		<span class="ml-2 text-sm text-muted-foreground">Initializing views...</span>
	</div>
{/if}

<style>
	/* Drag and drop visual feedback */
	:global([data-slot="table-head"].cursor-grab) {
		user-select: none;
		transition: opacity 150ms ease, background-color 150ms ease;
	}

	:global([data-slot="table-head"].cursor-grab:hover) {
		background-color: hsl(var(--accent) / 0.5);
	}

	/* Style for the element being dragged */
	:global(.dndzone [data-slot="table-head"][aria-grabbed="true"]) {
		opacity: 0.5;
		background-color: hsl(var(--accent) / 0.7);
	}

	/* Drop indicator - show a border on the left side when hovering over a valid drop target */
	:global(.dndzone [data-slot="table-head"][data-dnd-is-over="true"]) {
		border-left: 3px solid hsl(var(--primary));
	}
</style>
