<script lang="ts" generics="TFilters extends Record<string, any>, TSortBy extends string">
import {Button} from '$lib/components/ui/button';
import * as InputGroup from '$lib/components/ui/input-group';
import * as Popover from '$lib/components/ui/popover';
import {Badge} from '$lib/components/ui/badge';
import Search from '@lucide/svelte/icons/search';
import Filter from '@lucide/svelte/icons/filter';
import X from '@lucide/svelte/icons/x';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import List from '@lucide/svelte/icons/list';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import type {ViewMode, SortOrder} from './entity-search-state.svelte';
import type {SortOption, FilterSummary} from './types';
import type {Snippet} from 'svelte';

interface Props {
  // Search query
  searchQuery: string;
  searchPlaceholder?: string;

  // Filters
  filters: TFilters;
  activeFilterCount?: number;
  filterSummaries?: FilterSummary[];

  // View mode
  viewMode?: ViewMode;
  showViewModeToggle?: boolean;

  // Sort
  sortBy?: TSortBy;
  sortOrder?: SortOrder;
  sortOptions?: SortOption<TSortBy>[];

  // Callbacks
  onSearchChange: (query: string) => void;
  onFiltersChange?: (filters: TFilters) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onSortChange?: (sortBy: TSortBy, sortOrder: SortOrder) => void;
  onClearAll: () => void;

  // Snippets for custom content
  filterContent?: Snippet<[]>;
}

let {
  searchQuery = $bindable(),
  searchPlaceholder = 'Search...',
  filters = $bindable(),
  activeFilterCount = 0,
  filterSummaries = [],
  viewMode = $bindable('list'),
  showViewModeToggle = true,
  sortBy = $bindable(),
  sortOrder = $bindable('asc'),
  sortOptions = [],
  onSearchChange,
  onFiltersChange,
  onViewModeChange,
  onSortChange,
  onClearAll,
  filterContent
}: Props = $props();

let filtersOpen = $state(false);

const getCurrentSortLabel = $derived.by(() => {
  if (!sortBy || !sortOptions.length) return 'Sort';

  const option = sortOptions.find(opt => opt.value === sortBy && opt.order === sortOrder);
  if (option) {
    return option.label + (option.order === 'asc' && option.value === 'name' ? ' (A-Z)' :
                          option.order === 'desc' && option.value === 'name' ? ' (Z-A)' : '');
  }
  return 'Sort';
});

const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  searchQuery = target.value;
  onSearchChange(target.value);
};

const clearAllFilters = () => {
  searchQuery = '';
  filters = {} as TFilters;
  onClearAll();
  filtersOpen = false;
};
</script>

<div class="flex flex-col gap-4">
  <!-- Search and Filter Row -->
  <div class="flex items-center gap-2">
    <!-- Search Input -->
    <div class="flex-1 max-w-sm">
      <InputGroup.InputGroup>
        <InputGroup.InputGroupAddon align="inline-start">
          <Search class="h-4 w-4" />
        </InputGroup.InputGroupAddon>
        <InputGroup.InputGroupInput
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          oninput={handleSearchInput}
        />
      </InputGroup.InputGroup>
    </div>

    <!-- Filter Button -->
    {#if filterContent}
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

        <Popover.Content class="w-96" align="end">
          <div class="space-y-4">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b">
              <h4 class="font-semibold">Filters</h4>
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

            <!-- Custom Filter Content -->
            {@render filterContent()}

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
    {/if}

    <!-- Sort Dropdown -->
    {#if sortOptions.length > 0 && onSortChange}
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
    {/if}

    <!-- View Mode Toggle -->
    {#if showViewModeToggle && onViewModeChange}
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
    {/if}
  </div>

  <!-- Active Filters Summary -->
  {#if activeFilterCount > 0 && filterSummaries.length > 0}
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-sm text-muted-foreground">Active filters:</span>
      {#each filterSummaries as filter}
        <Badge variant="secondary" class="text-xs">
          {filter.label}
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
