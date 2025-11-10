<script lang="ts" generics="TData">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Select from '$lib/components/ui/select';
import * as Popover from '$lib/components/ui/popover';
import * as Collapsible from '$lib/components/ui/collapsible';
import {buttonVariants} from '$lib/components/ui/button';
import {Label} from '$lib/components/ui/label';
import {Badge} from '$lib/components/ui/badge';
import {Switch} from '$lib/components/ui/switch';
import {Separator} from '$lib/components/ui/separator';
import {cn} from '$lib/utils';
import type {TableDensity} from '../state/types';
import type {
	Table,
	SortingState,
	VisibilityState,
	ColumnPinningState,
	GroupingState,
	ExpandedState
} from '@tanstack/table-core';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import CircleChevronUp from '@lucide/svelte/icons/chevron-up';
import CircleChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ColumnPinningManager from '$lib/components/input/column-pinning-manager.svelte';
import ColumnOrderManager from '$lib/components/input/column-order-manager.svelte';

interface Props {
	/** The table instance */
	table: Table<TData>;
	/** Current sorting state */
	sorting?: SortingState;
	/** Handler for sorting changes */
	onSortingChange?: (sorting: SortingState) => void;
	/** Current column visibility state */
	columnVisibility?: VisibilityState;
	/** Handler for visibility changes */
	onVisibilityChange?: (visibility: VisibilityState) => void;
	/** Current column pinning state */
	columnPinning?: ColumnPinningState;
	/** Handler for pinning changes */
	onColumnPinningChange?: (pinning: ColumnPinningState) => void;
	/** Current column order */
	columnOrder?: string[];
	/** Handler for column order changes */
	onColumnOrderChange?: (order: string[]) => void;
	/** Current grouping state */
	grouping?: GroupingState;
	/** Handler for grouping changes */
	onGroupingChange?: (grouping: GroupingState) => void;
	/** Current expanded state */
	expanded?: ExpandedState;
	/** Handler for expanded changes */
	onExpandedChange?: (expanded: ExpandedState) => void;
	/** Current density setting */
	density?: TableDensity;
	/** Handler for density changes */
	onDensityChange?: (density: TableDensity) => void;
	/** Current sticky header setting */
	stickyHeader?: boolean;
	/** Handler for sticky header changes */
	onStickyHeaderChange?: (sticky: boolean) => void;
	/** Current view mode */
	viewMode?: 'table' | 'cards';
	/** Handler for view mode changes */
	onViewModeChange?: (mode: 'table' | 'cards') => void;
	/** Current page size */
	pageSize?: number;
	/** Handler for page size changes */
	onPageSizeChange?: (size: number) => void;
}

let {
	table,
	sorting = [],
	onSortingChange,
	columnVisibility = {},
	onVisibilityChange,
	columnPinning = {left: [], right: []},
	onColumnPinningChange,
	columnOrder = [],
	onColumnOrderChange,
	grouping = [],
	onGroupingChange,
	expanded = {},
	onExpandedChange,
	density = 'normal',
	onDensityChange,
	stickyHeader = false,
	onStickyHeaderChange,
	viewMode = 'table',
	onViewModeChange,
	pageSize = 25,
	onPageSizeChange
}: Props = $props();

// Special UI columns that should be excluded from user controls
const specialColumns = ['select', 'select-col', 'expand-contract-col', 'actions', 'transfer'];

const groupableColumns = $derived(
	table.getAllColumns().filter(column => {
		if (specialColumns.includes(column.id)) return false;
		return column.getCanGroup?.();
	})
);

const sortableColumns = $derived(
	table.getAllColumns().filter(column => {
		if (specialColumns.includes(column.id)) return false;
		return column.getCanSort();
	})
);

const visibleColumns = $derived(
	table.getAllColumns().filter(column => {
		if (!column.getCanHide()) return false;
		return !Object.keys(columnVisibility).includes(column.id) || columnVisibility[column.id] === true;
	})
);

const hidableColumns = $derived(
	table.getAllColumns().filter(column => column.getCanHide())
);

const pinnableColumns = $derived(
	table.getAllColumns().filter(column => {
		if (specialColumns.includes(column.id)) return false;
		return column.getCanPin?.();
	})
);

// All columns that are currently visible for column order manager
const allVisibleColumns = $derived(
	table.getAllColumns().filter(column => {
		if (specialColumns.includes(column.id)) return false;
		if (!column.getCanHide()) return true;
		return !Object.keys(columnVisibility).includes(column.id) || columnVisibility[column.id] === true;
	})
);

// Grouping value for multi-select
const groupingValue = {
	get value() {
		return grouping;
	},
	set value(newGrouping: string[]) {
		onGroupingChange?.(newGrouping);
	}
};

// Visibility value for multi-select
const visibilityValue = {
	get value() {
		return visibleColumns.map(col => col.id);
	},
	set value(newVisibility: string[]) {
		const visibility = Object.assign(
			{},
			...hidableColumns.map(column => ({ [column.id]: false })),
			...newVisibility.map(id => ({ [id]: true }))
		) as VisibilityState;
		onVisibilityChange?.(visibility);
	}
};

// Sorting handlers
function toggleSort(columnId: string) {
	let newSorting = [...sorting];
	const existingIndex = newSorting.findIndex(s => s.id === columnId);

	if (existingIndex === -1) {
		// Add new sort
		newSorting.push({ id: columnId, desc: false });
	} else {
		const existing = newSorting[existingIndex];
		if (!existing.desc) {
			// Toggle to descending
			newSorting[existingIndex] = { ...existing, desc: true };
		} else {
			// Remove sort
			newSorting = newSorting.filter((_, i) => i !== existingIndex);
		}
	}

	onSortingChange?.(newSorting);
}

// Pinning handlers
function updateLeftPinning(newPinning: string[]) {
	onColumnPinningChange?.({
		left: newPinning,
		right: columnPinning.right ?? []
	});
}

function updateRightPinning(newPinning: string[]) {
	onColumnPinningChange?.({
		left: columnPinning.left ?? [],
		right: newPinning
	});
}

// Column order handler
function updateColumnOrder(newOrder: string[]) {
	const visibleColumnIds = new Set(allVisibleColumns.map(col => col.id));
	const hiddenColumns = columnOrder.filter(id => !visibleColumnIds.has(id));
	const mergedOrder = [...newOrder, ...hiddenColumns];
	onColumnOrderChange?.(mergedOrder);
}
</script>

<Popover.Root>
	<Popover.Trigger class={cn(buttonVariants({variant: 'outline'}), 'h-8')}>
		<SlidersHorizontal />
		Display
	</Popover.Trigger>
	<Popover.Content class="w-80">
		<div class="grid gap-2">
			{#if groupableColumns.length > 0}
				<div class="grid grid-cols-3 items-center gap-4">
					<Label for="grouping">Grouping</Label>
					<Select.Root type="multiple" name="grouping" bind:value={groupingValue.value}>
						<Select.Trigger class="w-[180px]">
							{#if grouping.length === 0}
								<Badge variant="secondary">none selected</Badge>
							{:else}
								<div class="hidden space-x-1 lg:flex">
									{#if grouping.length > 2}
										<Badge variant="secondary" class="rounded-sm px-1 font-normal">
											{grouping.length} selected
										</Badge>
									{:else}
										{#each groupableColumns.filter(column => grouping.includes(column.id)) as groupableColumn}
											<Badge variant="secondary" class="rounded-sm px-1 font-normal">
												{groupableColumn.columnDef.meta?.label}
											</Badge>
										{/each}
									{/if}
								</div>
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each groupableColumns as column}
									<Select.Item
										value={column.id}
										label={column.columnDef.meta?.label ?? column.id}>
										{column.columnDef.meta?.label ?? column.id}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			{#if sortableColumns.length > 0}
				<div class="grid grid-cols-3 items-center gap-4">
					<Label>Sorting</Label>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class={cn(
								'border-input text-muted-foreground ring-offset-background focus:ring-ring flex h-9 w-[180px] items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'
							)}>
							{#if sorting.length === 0}
								<Badge variant="secondary">none selected</Badge>
							{:else}
								<div class="hidden space-x-1 lg:flex">
									{#if sorting.length > 2}
										<Badge variant="secondary" class="rounded-sm px-1 text-xs font-semibold">
											{sorting.length} selected
										</Badge>
									{:else}
										{#each sorting as sort}
											{@const col = sortableColumns.find(column => sort.id === column.id)}
											{#if col}
												<Badge variant="secondary" class="rounded-sm px-1 text-xs font-semibold">
													{col.columnDef.meta?.label}
													{#if sort.desc}
														<CircleChevronDown class="ml-1 size-4" />
													{:else}
														<CircleChevronUp class="ml-1 size-4" />
													{/if}
												</Badge>
											{/if}
										{/each}
									{/if}
								</div>
							{/if}
							<ChevronDown class="size-4 opacity-50" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Group>
								{#each sortableColumns as column}
									<DropdownMenu.Item onSelect={() => toggleSort(column.id)} closeOnSelect={false}>
										{column.columnDef.meta?.label}
										{@const sorter = sorting.find(sort => sort.id === column.id)}
										{#if sorter && sorter.desc}
											<CircleChevronDown class="absolute right-0 mr-1" />
										{:else if sorter && !sorter.desc}
											<CircleChevronUp class="absolute right-0 mr-1" />
										{/if}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}

			<div class="grid grid-cols-3 items-center gap-4">
				<Label>Visibility</Label>
				<Select.Root type="multiple" name="visibility" bind:value={visibilityValue.value}>
					<Select.Trigger class="text-muted-foreground w-[180px]">
						{#if visibleColumns.length === 0}
							<Badge variant="secondary">none selected</Badge>
						{:else}
							<div class="hidden space-x-1 lg:flex">
								{#if visibleColumns.length > 2}
									<Badge variant="secondary" class="rounded-sm px-1 font-normal">
										{visibleColumns.length} selected
									</Badge>
								{:else}
									{#each visibleColumns as visibleColumn}
										<Badge variant="secondary" class="rounded-sm px-1 font-normal">
											{visibleColumn.columnDef.meta?.label}
										</Badge>
									{/each}
								{/if}
							</div>
						{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each hidableColumns as column}
								<Select.Item
									value={column.id}
									label={column.columnDef.meta?.label ?? column.id}>
									{column.columnDef.meta?.label ?? column.id}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<Separator class="my-4" />

		{#if pinnableColumns.length > 0}
			<Collapsible.Root class="space-y-2">
				<Collapsible.Trigger
					class="flex w-full items-center justify-between text-sm font-medium hover:underline">
					Pin Left
					<ChevronRight
						class="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
				</Collapsible.Trigger>
				<Collapsible.Content class="pt-2">
					<ColumnPinningManager
						pinnedColumns={columnPinning.left ?? []}
						availableColumns={pinnableColumns}
						onUpdate={updateLeftPinning} />
				</Collapsible.Content>
			</Collapsible.Root>

			<Collapsible.Root class="space-y-2">
				<Collapsible.Trigger
					class="flex w-full items-center justify-between text-sm font-medium hover:underline">
					Pin Right
					<ChevronRight
						class="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
				</Collapsible.Trigger>
				<Collapsible.Content class="pt-2">
					<ColumnPinningManager
						pinnedColumns={columnPinning.right ?? []}
						availableColumns={pinnableColumns}
						onUpdate={updateRightPinning} />
				</Collapsible.Content>
			</Collapsible.Root>

			<Separator class="my-2" />
		{/if}

		<Collapsible.Root class="space-y-2">
			<Collapsible.Trigger
				class="flex w-full items-center justify-between text-sm font-medium hover:underline">
				Column Order
				<ChevronRight
					class="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
			</Collapsible.Trigger>
			<Collapsible.Content class="pt-2">
				<ColumnOrderManager
					columns={allVisibleColumns}
					columnOrder={columnOrder}
					onUpdate={updateColumnOrder} />
			</Collapsible.Content>
		</Collapsible.Root>

		{#if groupableColumns.length > 0}
			<div class="mt-4 flex justify-start">
				<Switch
					id="expand-all"
					checked={typeof expanded === 'boolean' && expanded}
					onCheckedChange={checked => {
						onExpandedChange?.(checked ? true : {});
					}}
					aria-labelledby="Expand all rows"
					disabled={grouping.length === 0} />
				<Label
					for="expand-all"
					class="ml-1 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
					Expand All
				</Label>
			</div>
		{/if}

		<div class="mt-4">
			<Label for="density" class="text-sm font-medium">Density</Label>
			<Select.Root
				allowDeselect={false}
				type="single"
				value={density}
				onValueChange={value => {
					if (value) onDensityChange?.(value as TableDensity);
				}}>
				<Select.Trigger id="density" class="mt-1 h-9 w-full capitalize">
					{density}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="normal">Normal</Select.Item>
					<Select.Item value="comfortable">Comfortable</Select.Item>
					<Select.Item value="compact">Compact</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="mt-2 flex justify-start">
			<Switch
				id="sticky-header"
				checked={stickyHeader === true}
				onCheckedChange={checked => {
					onStickyHeaderChange?.(checked);
				}}
				aria-labelledby="Sticky header" />
			<Label
				for="sticky-header"
				class="ml-1 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
				Sticky header
			</Label>
		</div>

		<div class="mt-4">
			<Label for="view-mode" class="text-sm font-medium">View mode</Label>
			<Select.Root
				allowDeselect={false}
				type="single"
				value={viewMode}
				onValueChange={value => {
					if (value) onViewModeChange?.(value as 'table' | 'cards');
				}}>
				<Select.Trigger id="view-mode" class="mt-1 h-9 w-full capitalize">
					{viewMode}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="table">Table</Select.Item>
					<Select.Item value="cards">Cards</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="mt-4">
			<Label for="page-size" class="text-sm font-medium">Rows per page</Label>
			<Select.Root
				allowDeselect={false}
				type="single"
				value={String(pageSize)}
				onValueChange={value => {
					if (value) onPageSizeChange?.(Number(value));
				}}>
				<Select.Trigger id="page-size" class="mt-1 h-9 w-full">
					{pageSize}
				</Select.Trigger>
				<Select.Content>
					{#each [10, 20, 25, 30, 40, 50, 100] as size (size)}
						<Select.Item value={String(size)}>
							{size}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</Popover.Content>
</Popover.Root>
