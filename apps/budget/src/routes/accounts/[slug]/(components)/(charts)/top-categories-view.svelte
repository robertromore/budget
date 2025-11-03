<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { AnalyticsCard } from '$lib/components/ui/data-table';
import { SimpleDataTable } from '$lib/components/data-table';
import type { DataTableFeatures, DataTableState, DataTableStateHandlers } from '$lib/components/data-table';
import { GenericToolbar } from '$lib/components/data-table/toolbar';
import * as ToggleGroup from '$lib/components/ui/toggle-group';
import * as Select from '$lib/components/ui/select';
import * as Tabs from '$lib/components/ui/tabs';
import type { TransactionsFormat, TopCategoryData } from '$lib/types';
import { createTopCategoriesProcessor } from '../(analytics)/data-processors.svelte';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import Tag from '@lucide/svelte/icons/tag';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TableIcon from '@lucide/svelte/icons/table';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import { createCategoryColumns } from '../../(data)/category-columns';
import { categoryFilters } from '$lib/components/data-table/filters';
import { rpc } from '$lib/query';
import { onMount } from 'svelte';
import type { View } from '$lib/schema';
import type { FilterInputOption } from '$lib/types';
import type {
	SortingState,
	VisibilityState,
	ColumnFiltersState,
	PaginationState,
	ColumnPinningState,
	GroupingState,
	ExpandedState
} from '@tanstack/table-core';

interface Props {
	transactions: TransactionsFormat[];
	/** View selector type: 'tabs' for tabs, 'toggle' for toggle buttons, 'dropdown' for select dropdown */
	viewSelectorType?: 'tabs' | 'toggle' | 'dropdown';
}

let { transactions, viewSelectorType = 'tabs' }: Props = $props();

// Process the data
const processor = createTopCategoriesProcessor(transactions);
const topCategories = $derived(processor.data);

// Transform data for display
const analyticsData = $derived(
	topCategories.map((cat) => {
		const iconComponent = cat.icon ? getIconByName(cat.icon)?.icon : Tag;
		const data: TopCategoryData = {
			id: cat.id,
			name: cat.name,
			amount: cat.amount,
			count: cat.count,
			percentage: cat.percentage,
			icon: iconComponent || Tag,
		};
		if (cat.color) {
			data.color = cat.color;
		}
		return data;
	})
);

// Use the category column definitions we created
const columns = createCategoryColumns();

// Enable comprehensive features
const features: DataTableFeatures = {
	sorting: true,
	filtering: true,
	pagination: true,
	rowSelection: true,
	columnVisibility: true,
	columnPinning: true,
	columnReordering: true,
	globalFilter: true,
	grouping: true,
	expanding: true,
};

// Table state management
let sorting = $state<SortingState>([]);
let columnVisibility = $state<VisibilityState>({});
let columnFilters = $state<ColumnFiltersState>([]);
let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
let rowSelection = $state<Record<string, boolean>>({});
let columnPinning = $state<ColumnPinningState>({});
let columnOrder = $state<string[]>([]);
let globalFilter = $state<string>('');
let grouping = $state<GroupingState>([]);
let expanded = $state<ExpandedState>({});
let density = $state<'normal' | 'comfortable' | 'compact'>('normal');
let stickyHeader = $state<boolean>(false);

// Create reactive state object
const tableState = $derived<DataTableState>({
	sorting,
	columnVisibility,
	columnFilters,
	pagination,
	rowSelection,
	columnPinning,
	columnOrder,
	globalFilter,
	grouping,
	expanded,
});

// State change handlers
const handlers: DataTableStateHandlers = {
	onSortingChange: (updater) => {
		sorting = typeof updater === 'function' ? updater(sorting) : updater;
	},
	onColumnVisibilityChange: (updater) => {
		columnVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
	},
	onColumnFiltersChange: (updater) => {
		columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
	},
	onPaginationChange: (updater) => {
		pagination = typeof updater === 'function' ? updater(pagination) : updater;
	},
	onRowSelectionChange: (updater) => {
		rowSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
	},
	onColumnPinningChange: (updater) => {
		columnPinning = typeof updater === 'function' ? updater(columnPinning) : updater;
	},
	onColumnOrderChange: (updater) => {
		columnOrder = typeof updater === 'function' ? updater(columnOrder) : updater;
	},
	onGlobalFilterChange: (updater) => {
		globalFilter = typeof updater === 'function' ? updater(globalFilter) : updater;
	},
	onGroupingChange: (updater) => {
		grouping = typeof updater === 'function' ? updater(grouping) : updater;
	},
	onExpandedChange: (updater) => {
		expanded = typeof updater === 'function' ? updater(expanded) : updater;
	},
};

// View management state
let availableViews = $state<View[]>([]);
let selectedViewId = $state<string>('');
let currentViewName = $derived(
	availableViews.find(v => v.id.toString() === selectedViewId)?.name || 'Default'
);
let currentView = $derived(
	availableViews.find(v => v.id.toString() === selectedViewId)
);

// Load category views on mount
onMount(async () => {
	try {
		const viewsQuery = rpc.views.listCategoryViews();
		const views = await viewsQuery.execute();

		if (views && views.length > 0) {
			availableViews = views;
			const firstView = views[0];
			if (firstView) {
				selectedViewId = firstView.id.toString();
				// Apply the initial view
				applyView(firstView);
			}
		}
	} catch (error) {
		console.error('Failed to load category views:', error);
	}
});

// Apply view state to table
function applyView(view: View) {
	// Apply filters
	if (view.filters && Array.isArray(view.filters)) {
		columnFilters = view.filters.map(f => ({
			id: f.column,
			value: f.value
		}));
	} else {
		columnFilters = [];
	}

	// Apply display settings
	if (view.display) {
		// Apply sorting
		if (view.display.sort) {
			sorting = view.display.sort;
		} else {
			sorting = [];
		}

		// Apply column visibility
		if (view.display.visibility && typeof view.display.visibility === 'object') {
			columnVisibility = view.display.visibility;
		} else {
			columnVisibility = {};
		}

		// Apply column pinning
		if (view.display.pinning) {
			columnPinning = view.display.pinning;
		} else {
			columnPinning = {};
		}

		// Apply column order
		if (view.display.columnOrder) {
			columnOrder = view.display.columnOrder;
		} else {
			columnOrder = [];
		}

		// Apply pagination
		if (view.display.pageSize) {
			pagination = { ...pagination, pageSize: view.display.pageSize };
		}

		// Apply view mode
		if (view.display.viewMode) {
			viewMode = view.display.viewMode;
		}
	}
}

// Handle view switching
function switchView(viewId: string) {
	selectedViewId = viewId;
	const view = availableViews.find(v => v.id.toString() === viewId);
	if (view) {
		applyView(view);
		console.log('Applied view:', view.name);
	}
}

// Handle view saved (create or update)
async function handleViewSaved(view: View) {
	try {
		// Refresh the views list
		const viewsQuery = rpc.views.listCategoryViews();
		const views = await viewsQuery.execute();

		if (views && views.length > 0) {
			availableViews = views;
			// Switch to the saved/created view
			selectedViewId = view.id.toString();
			applyView(view);
			console.log('View saved and applied:', view.name);
		}
	} catch (error) {
		console.error('Failed to refresh views after save:', error);
	}
}

// View mode state - default to cards
let viewMode = $state<'table' | 'cards'>('cards');
</script>

<Card.Root class="max-w-4xl overflow-hidden">
  <Card.Header class="pb-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <TrendingDown class="h-5 w-5" />
        <div>
          <Card.Title>Top Spending Categories</Card.Title>
          <Card.Description>
            Your highest expense categories by total spending
            {#if availableViews.length > 0}
              <span class="ml-2 text-xs text-muted-foreground">
                ({availableViews.length} {availableViews.length === 1 ? 'view' : 'views'} available)
              </span>
            {/if}
          </Card.Description>
        </div>
      </div>
      <div class="flex items-center gap-2">
        {#if availableViews.length > 0}
          {#if viewSelectorType === 'dropdown'}
            <Select.Root
              allowDeselect={false}
              type="single"
              value={selectedViewId}
              onValueChange={(value) => {
                if (value) switchView(value);
              }}>
              <Select.Trigger class="w-[180px]">
                {currentViewName}
              </Select.Trigger>
              <Select.Content>
                {#each availableViews as view}
                  <Select.Item value={view.id.toString()}>
                    <div>
                      <div class="font-medium">{view.name}</div>
                      {#if view.description}
                        <div class="text-xs text-muted-foreground">{view.description}</div>
                      {/if}
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          {:else if viewSelectorType === 'toggle'}
            <ToggleGroup.Root
              type="single"
              value={selectedViewId}
              onValueChange={(value) => {
                if (value) switchView(value);
              }}
              class="gap-1">
              {#each availableViews as view}
                <ToggleGroup.Item
                  value={view.id.toString()}
                  aria-label={view.name}
                  title={view.description || view.name}
                  size="sm">
                  {view.name}
                </ToggleGroup.Item>
              {/each}
            </ToggleGroup.Root>
          {:else}
            <Tabs.Root
              value={selectedViewId}
              onValueChange={(value) => {
                if (value) switchView(value);
              }}
              class="w-auto">
              <Tabs.List>
                {#each availableViews as view}
                  <Tabs.Trigger
                    value={view.id.toString()}
                    title={view.description || view.name}>
                    {view.name}
                  </Tabs.Trigger>
                {/each}
              </Tabs.List>
            </Tabs.Root>
          {/if}
        {/if}
        <Tabs.Root
          value={viewMode}
          onValueChange={(value) => {
            if (value) viewMode = value as 'table' | 'cards';
          }}
          class="w-auto">
          <Tabs.List>
            <Tabs.Trigger value="cards" aria-label="Card view">
              <LayoutGrid class="h-4 w-4" />
            </Tabs.Trigger>
            <Tabs.Trigger value="table" aria-label="Table view">
              <TableIcon class="h-4 w-4" />
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>
    </div>
  </Card.Header>
	<Card.Content class="pt-0 pb-4">
		{#if analyticsData.length > 0}
			{#if viewMode === 'table'}
				<SimpleDataTable
					data={analyticsData}
					{columns}
					{features}
					state={tableState}
					{handlers}
					filterFns={categoryFilters}
					showPagination={true}
					showSelection={true}
					enableHeaders={true}
					pageSizeOptions={[5, 10, 20, 50]}
					uiSettings={{
						density: density,
						bordered: false,
						hoverable: true,
						stickyHeader: stickyHeader,
					}}>
					{#snippet toolbar(table)}
						{@const filterComponents = table.getAllColumns()
							.filter((column) => column && column.getIsVisible() && column.columnDef.meta?.facetedFilter)
							.map((column) => column.columnDef.meta?.facetedFilter(column)) as FilterInputOption<TopCategoryData>[]}
						<GenericToolbar
							{table}
							availableFilters={filterComponents}
							columnFilters={columnFilters}
							onColumnFiltersChange={(filters) => { columnFilters = filters; }}
							sorting={sorting}
							onSortingChange={(newSorting) => { sorting = newSorting; }}
							columnVisibility={columnVisibility}
							onVisibilityChange={(newVisibility) => { columnVisibility = newVisibility; }}
							columnPinning={columnPinning}
							onColumnPinningChange={(newPinning) => { columnPinning = newPinning; }}
							columnOrder={columnOrder}
							onColumnOrderChange={(newOrder) => { columnOrder = newOrder; }}
							grouping={grouping}
							onGroupingChange={(newGrouping) => { grouping = newGrouping; }}
							expanded={expanded}
							onExpandedChange={(newExpanded) => { expanded = newExpanded; }}
							density={density}
							onDensityChange={(newDensity) => { density = newDensity; }}
							stickyHeader={stickyHeader}
							onStickyHeaderChange={(newSticky) => { stickyHeader = newSticky; }}
							viewMode={viewMode}
							onViewModeChange={(newMode) => { viewMode = newMode; }}
							pageSize={pagination.pageSize}
							onPageSizeChange={(newSize) => { pagination = { ...pagination, pageSize: newSize }; }}
							globalFilter={globalFilter}
							onGlobalFilterChange={(newFilter) => { globalFilter = newFilter; }}
							showResetFilters={true}
							onResetFilters={() => {
								columnFilters = [];
								globalFilter = '';
							}}
							enableViewManagement={true}
							currentView={currentView}
							entityType="top_categories"
							onViewSaved={handleViewSaved}
						/>
					{/snippet}
				</SimpleDataTable>
			{:else}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each analyticsData as category (category.id)}
						<AnalyticsCard data={category} />
					{/each}
				</div>
			{/if}
		{:else}
			<div class="flex h-[200px] items-center justify-center">
				<div class="text-center">
					<Tag class="mx-auto h-12 w-12 text-muted-foreground/30" />
					<p class="text-muted-foreground mt-4 text-sm">
						No category spending data available
					</p>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
