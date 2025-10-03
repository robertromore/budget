<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {Input} from '$lib/components/ui/input';
import * as Select from '$lib/components/ui/select';
import * as Popover from '$lib/components/ui/popover';
import {Badge} from '$lib/components/ui/badge';
import Search from '@lucide/svelte/icons/search';
import Filter from '@lucide/svelte/icons/filter';
import X from '@lucide/svelte/icons/x';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import List from '@lucide/svelte/icons/list';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import type {CategorySearchFilters} from '$lib/states/ui/category-search.svelte';

export type ViewMode = 'list' | 'grid';
export type SortBy = 'name' | 'created' | 'lastTransaction' | 'totalAmount';
export type SortOrder = 'asc' | 'desc';

interface Props {
  searchQuery: string;
  filters: CategorySearchFilters;
  viewMode?: ViewMode;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  onSearchChange: (query: string) => void;
  onFiltersChange: (filters: CategorySearchFilters) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onSortChange?: (sortBy: SortBy, sortOrder: SortOrder) => void;
  onClearAll: () => void;
}

let {
  searchQuery = $bindable(),
  filters = $bindable(),
  viewMode = $bindable('list'),
  sortBy = $bindable('name'),
  sortOrder = $bindable('asc'),
  onSearchChange,
  onFiltersChange,
  onViewModeChange,
  onSortChange,
  onClearAll
}: Props = $props();

let filtersOpen = $state(false);

// Sort options
const sortOptions = [
  {value: 'name', label: 'Name', order: 'asc' as SortOrder},
  {value: 'name', label: 'Name', order: 'desc' as SortOrder},
  {value: 'created', label: 'Date Created', order: 'desc' as SortOrder},
  {value: 'lastTransaction', label: 'Last Transaction', order: 'desc' as SortOrder},
  {value: 'totalAmount', label: 'Amount (High)', order: 'desc' as SortOrder},
  {value: 'totalAmount', label: 'Amount (Low)', order: 'asc' as SortOrder}
];

const getCurrentSortLabel = $derived.by(() => {
  const option = sortOptions.find(opt => opt.value === sortBy && opt.order === sortOrder);
  if (option) {
    return option.label + (option.order === 'asc' && option.value === 'name' ? ' (A-Z)' :
                          option.order === 'desc' && option.value === 'name' ? ' (Z-A)' : '');
  }
  return 'Sort';
});

// Count active filters for badge
const activeFilterCount = $derived.by(() => {
  let count = 0;
  if (filters.hasParent !== undefined) count++;
  if (filters.hasTransactions !== undefined) count++;
  if (filters.categoryType !== undefined) count++;
  if (filters.isTaxDeductible !== undefined) count++;
  if (filters.spendingPriority !== undefined) count++;
  if (filters.isSeasonal !== undefined) count++;
  if (filters.isActive !== undefined) count++;
  return count;
});

const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  searchQuery = target.value;
  onSearchChange(target.value);
};

const updateFilter = <K extends keyof CategorySearchFilters>(
  key: K,
  value: CategorySearchFilters[K]
) => {
  const newFilters = { ...filters };
  if (value === undefined || value === null || value === '') {
    delete newFilters[key];
  } else {
    newFilters[key] = value;
  }
  filters = newFilters;
  onFiltersChange(newFilters);
};

const clearAllFilters = () => {
  searchQuery = '';
  filters = {};
  onClearAll();
  filtersOpen = false;
};

// Get labels for active filters
const getFilterSummary = $derived(() => {
  const summary: string[] = [];

  if (filters.hasParent !== undefined) {
    summary.push(filters.hasParent ? 'Subcategories Only' : 'Top-level Only');
  }

  if (filters.hasTransactions !== undefined) {
    summary.push(filters.hasTransactions ? 'Has Transactions' : 'No Transactions');
  }

  if (filters.categoryType) {
    summary.push(`Type: ${filters.categoryType.charAt(0).toUpperCase() + filters.categoryType.slice(1)}`);
  }

  if (filters.isTaxDeductible !== undefined) {
    summary.push(filters.isTaxDeductible ? 'Tax Deductible' : 'Not Tax Deductible');
  }

  if (filters.spendingPriority) {
    summary.push(`Priority: ${filters.spendingPriority.charAt(0).toUpperCase() + filters.spendingPriority.slice(1)}`);
  }

  if (filters.isSeasonal !== undefined) {
    summary.push(filters.isSeasonal ? 'Seasonal' : 'Not Seasonal');
  }

  if (filters.isActive !== undefined) {
    summary.push(filters.isActive ? 'Active Only' : 'Inactive Only');
  }

  return summary;
});
</script>

<div class="flex flex-col gap-4">
  <!-- Search and Filter Row -->
  <div class="flex items-center gap-2">
    <!-- Search Input -->
    <div class="relative flex-1 max-w-sm">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search categories..."
        value={searchQuery}
        oninput={handleSearchInput}
        class="pl-9"
      />
    </div>

    <!-- Filter Button -->
    <Popover.Root bind:open={filtersOpen}>
      <Popover.Trigger>
        {#snippet child({props})}
          <Button variant="outline" {...props} class="relative">
            <Filter class="mr-2 h-4 w-4" />
            Filters
            {#if activeFilterCount > 0}
              <Badge variant="secondary" class="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>

      <Popover.Content class="w-80" align="end">
        <div class="space-y-4">
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b">
            <h4 class="font-semibold">Filter Categories</h4>
            {#if activeFilterCount > 0}
              <Button
                variant="ghost"
                size="sm"
                onclick={clearAllFilters}
                class="h-auto px-2 py-1 text-xs">
                Clear all
              </Button>
            {/if}
          </div>

          <!-- Basic Filters Section -->
          <div class="space-y-3">
            <h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Basic Filters</h5>

            <div class="grid grid-cols-2 gap-3">
              <!-- Parent Category Filter -->
              <div class="space-y-1.5">
                <label for="parent-filter" class="text-xs font-medium">Hierarchy</label>
                <Select.Root
                  type="single"
                  value={filters.hasParent?.toString() || ''}
                  onValueChange={(value) => {
                    updateFilter('hasParent', value === 'true' ? true : value === 'false' ? false : undefined);
                  }}>
                  <Select.Trigger id="parent-filter" class="h-9 w-full">
                    {filters.hasParent === true ? 'Subcategories' : filters.hasParent === false ? 'Top-level' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="false">Top-level</Select.Item>
                    <Select.Item value="true">Subcategories</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Transactions Filter -->
              <div class="space-y-1.5">
                <label for="transactions-filter" class="text-xs font-medium">Usage</label>
                <Select.Root
                  type="single"
                  value={filters.hasTransactions?.toString() || ''}
                  onValueChange={(value) => {
                    updateFilter('hasTransactions', value === 'true' ? true : value === 'false' ? false : undefined);
                  }}>
                  <Select.Trigger id="transactions-filter" class="h-9 w-full">
                    {filters.hasTransactions === true ? 'Has Transactions' : filters.hasTransactions === false ? 'No Transactions' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="true">Has Transactions</Select.Item>
                    <Select.Item value="false">No Transactions</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Category Type Filter -->
              <div class="space-y-1.5">
                <label for="type-filter" class="text-xs font-medium">Category Type</label>
                <Select.Root
                  type="single"
                  value={filters.categoryType || ''}
                  onValueChange={(value) => {
                    updateFilter('categoryType', value || undefined);
                  }}>
                  <Select.Trigger id="type-filter" class="h-9 w-full">
                    {filters.categoryType ? filters.categoryType.charAt(0).toUpperCase() + filters.categoryType.slice(1) : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="income">Income</Select.Item>
                    <Select.Item value="expense">Expense</Select.Item>
                    <Select.Item value="transfer">Transfer</Select.Item>
                    <Select.Item value="savings">Savings</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Active Status Filter -->
              <div class="space-y-1.5">
                <label for="active-filter" class="text-xs font-medium">Status</label>
                <Select.Root
                  type="single"
                  value={filters.isActive?.toString() || ''}
                  onValueChange={(value) => {
                    updateFilter('isActive', value === 'true' ? true : value === 'false' ? false : undefined);
                  }}>
                  <Select.Trigger id="active-filter" class="h-9 w-full">
                    {filters.isActive === true ? 'Active' : filters.isActive === false ? 'Inactive' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="true">Active</Select.Item>
                    <Select.Item value="false">Inactive</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </div>

          <!-- Advanced Filters Section -->
          <div class="space-y-3">
            <h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Advanced Filters</h5>

            <div class="grid grid-cols-2 gap-3">
              <!-- Tax Deductible Filter -->
              <div class="space-y-1.5">
                <label for="tax-filter" class="text-xs font-medium">Tax Status</label>
                <Select.Root
                  type="single"
                  value={filters.isTaxDeductible?.toString() || ''}
                  onValueChange={(value) => {
                    updateFilter('isTaxDeductible', value === 'true' ? true : value === 'false' ? false : undefined);
                  }}>
                  <Select.Trigger id="tax-filter" class="h-9 w-full">
                    {filters.isTaxDeductible === true ? 'Tax Deductible' : filters.isTaxDeductible === false ? 'Not Deductible' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="true">Tax Deductible</Select.Item>
                    <Select.Item value="false">Not Deductible</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Seasonal Filter -->
              <div class="space-y-1.5">
                <label for="seasonal-filter" class="text-xs font-medium">Seasonality</label>
                <Select.Root
                  type="single"
                  value={filters.isSeasonal?.toString() || ''}
                  onValueChange={(value) => {
                    updateFilter('isSeasonal', value === 'true' ? true : value === 'false' ? false : undefined);
                  }}>
                  <Select.Trigger id="seasonal-filter" class="h-9 w-full">
                    {filters.isSeasonal === true ? 'Seasonal' : filters.isSeasonal === false ? 'Not Seasonal' : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="true">Seasonal</Select.Item>
                    <Select.Item value="false">Not Seasonal</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Spending Priority Filter (full width) -->
              <div class="space-y-1.5 col-span-2">
                <label for="priority-filter" class="text-xs font-medium">Spending Priority</label>
                <Select.Root
                  type="single"
                  value={filters.spendingPriority || ''}
                  onValueChange={(value) => {
                    updateFilter('spendingPriority', value || undefined);
                  }}>
                  <Select.Trigger id="priority-filter" class="h-9 w-full">
                    {filters.spendingPriority ? filters.spendingPriority.charAt(0).toUpperCase() + filters.spendingPriority.slice(1) : 'All'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="">All</Select.Item>
                    <Select.Item value="essential">Essential</Select.Item>
                    <Select.Item value="important">Important</Select.Item>
                    <Select.Item value="discretionary">Discretionary</Select.Item>
                    <Select.Item value="luxury">Luxury</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </div>

          <!-- Clear Filters Button -->
          {#if activeFilterCount > 0}
            <div class="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onclick={clearAllFilters}
                class="w-full h-9">
                <X class="mr-2 h-3.5 w-3.5" />
                Clear All Filters ({activeFilterCount})
              </Button>
            </div>
          {/if}
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- Sort Dropdown -->
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({props})}
          <Button variant="outline" {...props} class="h-9 w-[180px] justify-start">
            <ArrowUpDown class="mr-2 h-4 w-4" />
            {getCurrentSortLabel}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-56" align="end">
        <div class="space-y-1">
          {#each sortOptions as option}
            <Button
              variant={sortBy === option.value && sortOrder === option.order ? "default" : "ghost"}
              size="sm"
              onclick={() => {
                sortBy = option.value;
                sortOrder = option.order;
                onSortChange?.(option.value, option.order);
              }}
              class="w-full justify-start">
              {option.label}
              {#if option.value === 'name'}
                {option.order === 'asc' ? '(A-Z)' : '(Z-A)'}
              {/if}
            </Button>
          {/each}
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- View Mode Toggle -->
    <div class="flex items-center border rounded-md">
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onclick={() => {
          viewMode = 'list';
          onViewModeChange?.('list');
        }}
        class="h-9 rounded-r-none border-r">
        <List class="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onclick={() => {
          viewMode = 'grid';
          onViewModeChange?.('grid');
        }}
        class="h-9 rounded-l-none">
        <LayoutGrid class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Active Filters Summary -->
  {#if activeFilterCount > 0}
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-sm text-muted-foreground">Active filters:</span>
      {#each getFilterSummary() as filter}
        <Badge variant="secondary" class="text-xs">
          {filter}
        </Badge>
      {/each}
      <Button
        variant="ghost"
        size="sm"
        onclick={clearAllFilters}
        class="h-6 text-xs text-muted-foreground hover:text-foreground">
        <X class="mr-1 h-3 w-3" />
        Clear all
      </Button>
    </div>
  {/if}
</div>