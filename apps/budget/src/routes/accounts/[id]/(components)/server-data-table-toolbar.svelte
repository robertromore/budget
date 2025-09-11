<!--
  @fileoverview Server-side data table toolbar with search, filtering, and sorting controls

  This component provides comprehensive filtering capabilities for server-side data tables,
  including debounced search, date range filtering, sort controls, and filter management.
  All filter operations are delegated to the ServerAccountState for consistent state management.

  @component ServerDataTableToolbar
  @example
  ```svelte
  <ServerDataTableToolbar
    accountState={serverAccountState}
    {accountId}
  />
  ```
-->
<script lang="ts">
import {Badge} from '$ui/lib/components/ui/badge';
import {Button} from '$ui/lib/components/ui/button';
import {Input} from '$ui/lib/components/ui/input';
import * as Popover from '$lib/components/ui/popover';
import * as Select from '$ui/lib/components/ui/select';
import type {ServerAccountState} from '$lib/states/views/server-account.svelte';
import Calendar from '@lucide/svelte/icons/calendar';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import Search from '@lucide/svelte/icons/search';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import X from '@lucide/svelte/icons/x';

/**
 * Component props interface
 */
let {
  accountState,
  accountId,
}: {
  /** State manager containing filter state and methods */
  accountState: ServerAccountState;
  /** Account identifier for filter operations */
  accountId: number;
} = $props();

/** Local search input value - synced with account state via debouncing */
let searchValue = $state(accountState.filters.searchQuery || '');
/** Controls visibility of date filter popover */
let dateFiltersOpen = $state(false);
/** Timeout handle for debounced search operations */
let searchTimeout: NodeJS.Timeout | null = null;

/**
 * Debounced search effect - prevents excessive server requests during typing.
 * Triggers search operation 300ms after user stops typing.
 */
$effect(() => {
  if (searchValue !== (accountState.filters.searchQuery || '')) {
    // Clear any existing timeout to reset debounce timer
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search operation
    searchTimeout = setTimeout(() => {
      accountState.searchTransactions(accountId, searchValue);
    }, 300); // 300ms debounce delay for optimal UX
  }
});

/**
 * Clears the search input and triggers server-side search reset
 */
function clearSearch() {
  searchValue = '';
}

/**
 * Resets all filters to their default state and triggers server refresh
 */
function clearAllFilters() {
  searchValue = '';
  accountState.filters.searchQuery = '';
  accountState.filters.dateFrom = '';
  accountState.filters.dateTo = '';
  accountState.loadTransactions(accountId, true);
}

// Refresh data
function refresh() {
  accountState.refresh(accountId);
}

// Count active filters
const activeFiltersCount = $derived(() => {
  let count = 0;
  if (accountState.filters.searchQuery) count++;
  if (accountState.filters.dateFrom || accountState.filters.dateTo) count++;
  return count;
});

// Date range helper
function setDateRange(from?: string, to?: string) {
  accountState.setDateFilter(accountId, from, to);
  dateFiltersOpen = false;
}

// Sort options
const sortOptions = [
  {
    value: 'date-desc',
    label: 'Date (Newest first)',
    sortBy: 'date' as const,
    sortOrder: 'desc' as const,
  },
  {
    value: 'date-asc',
    label: 'Date (Oldest first)',
    sortBy: 'date' as const,
    sortOrder: 'asc' as const,
  },
  {
    value: 'amount-desc',
    label: 'Amount (Highest first)',
    sortBy: 'amount' as const,
    sortOrder: 'desc' as const,
  },
  {
    value: 'amount-asc',
    label: 'Amount (Lowest first)',
    sortBy: 'amount' as const,
    sortOrder: 'asc' as const,
  },
  {
    value: 'notes-asc',
    label: 'Description (A-Z)',
    sortBy: 'notes' as const,
    sortOrder: 'asc' as const,
  },
  {
    value: 'notes-desc',
    label: 'Description (Z-A)',
    sortBy: 'notes' as const,
    sortOrder: 'desc' as const,
  },
];

const selectedSort = $derived(() => {
  const sortValue = `${accountState.filters.sortBy}-${accountState.filters.sortOrder}`;
  // Ensure the value exists in our sort options, fallback to default
  const validOption = sortOptions.find((opt) => opt.value === sortValue);
  return validOption ? validOption.value : 'date-desc';
});

function setSorting(value: string) {
  const option = sortOptions.find((opt) => opt.value === value);
  if (option) {
    accountState.setSorting(accountId, option.sortBy, option.sortOrder);
  }
}
</script>

<div class="flex items-center justify-between">
  <div class="flex flex-1 items-center space-x-2">
    <!-- Search input -->
    <div class="relative max-w-sm">
      <Search class="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
      <Input bind:value={searchValue} placeholder="Search transactions..." class="pr-8 pl-8" />
      {#if searchValue}
        <Button
          variant="ghost"
          size="sm"
          class="absolute top-1 right-1 h-6 w-6 p-0"
          onclick={clearSearch}>
          <X class="h-3 w-3" />
        </Button>
      {/if}
      {#if accountState.isSearching}
        <div class="absolute top-2.5 right-2.5">
          <div
            class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent">
          </div>
        </div>
      {/if}
    </div>

    <!-- Date filter -->
    <Popover.Root bind:open={dateFiltersOpen}>
      <Popover.Trigger
        class="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded-md border border-dashed px-3 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
        <Calendar class="mr-2 h-4 w-4" />
        Date Range
        {#if accountState.filters.dateFrom || accountState.filters.dateTo}
          <Badge variant="secondary" class="ml-2 h-4 px-1 text-xs">Active</Badge>
        {/if}
      </Popover.Trigger>
      <Popover.Content class="w-auto p-3" align="start">
        <div class="space-y-3">
          <h4 class="leading-none font-medium">Date Range Filter</h4>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <label for="date-from" class="text-sm font-medium">From</label>
              <Input
                id="date-from"
                type="date"
                value={accountState.filters.dateFrom
                  ? new Date(accountState.filters.dateFrom).toISOString().split('T')[0]
                  : ''}
                onchange={(e) => {
                  const value = e.currentTarget.value;
                  const dateFrom = value ? new Date(value).toISOString() : undefined;
                  setDateRange(dateFrom, accountState.filters.dateTo);
                }} />
            </div>
            <div class="space-y-2">
              <label for="date-to" class="text-sm font-medium">To</label>
              <Input
                id="date-to"
                type="date"
                value={accountState.filters.dateTo
                  ? new Date(accountState.filters.dateTo).toISOString().split('T')[0]
                  : ''}
                onchange={(e) => {
                  const value = e.currentTarget.value;
                  const dateTo = value ? new Date(value).toISOString() : undefined;
                  setDateRange(accountState.filters.dateFrom, dateTo);
                }} />
            </div>
          </div>
          <div class="flex justify-between">
            <Button size="sm" variant="outline" onclick={() => setDateRange(undefined, undefined)}>
              Clear
            </Button>
            <Button size="sm" onclick={() => (dateFiltersOpen = false)}>Close</Button>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- Sort options -->
    <Select.Root type="single" value={selectedSort()} onValueChange={setSorting}>
      <Select.Trigger class="h-8 w-[200px]">
        <SlidersHorizontal class="mr-2 h-4 w-4" />
        {sortOptions.find((opt) => opt.value === selectedSort())?.label || 'Sort by...'}
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Sort Options</Select.Label>
          {#each sortOptions as option, index (index)}
            <Select.Item value={option.value}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>

    <!-- Active filters indicator -->
    {#if activeFiltersCount() > 0}
      <Badge variant="secondary" class="ml-2">
        {activeFiltersCount()} filter{activeFiltersCount() === 1 ? '' : 's'} active
      </Badge>
    {/if}
  </div>

  <div class="flex items-center space-x-2">
    <!-- Clear all filters -->
    {#if activeFiltersCount() > 0}
      <Button variant="ghost" size="sm" onclick={clearAllFilters} class="h-8 px-2">
        <X class="mr-2 h-4 w-4" />
        Clear All
      </Button>
    {/if}

    <!-- Refresh button -->
    <Button
      variant="outline"
      size="sm"
      onclick={refresh}
      class="h-8 px-2"
      disabled={accountState.isLoadingSummary || accountState.isLoadingTransactions}>
      <RotateCcw
        class="mr-2 h-4 w-4 {accountState.isLoadingSummary || accountState.isLoadingTransactions
          ? 'animate-spin'
          : ''}" />
      Refresh
    </Button>
  </div>
</div>

<!-- Results summary -->
<div class="text-muted-foreground flex items-center justify-between text-sm">
  <div>
    {#if accountState.isLoadingTransactions}
      Loading transactions...
    {:else if accountState.filters.searchQuery}
      Found {accountState.pagination.totalCount} transaction{accountState.pagination.totalCount ===
      1
        ? ''
        : 's'}
      matching "{accountState.filters.searchQuery}"
    {:else}
      Showing {accountState.currentTransactions.length} of {accountState.pagination.totalCount} transactions
    {/if}
  </div>

  <div>
    Page {accountState.pagination.page + 1} of {accountState.pagination.totalPages || 1}
  </div>
</div>
