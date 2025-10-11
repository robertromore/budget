<script lang="ts">
import {Input} from '$lib/components/ui/input';
import * as Select from '$lib/components/ui/select';
import {Button} from '$lib/components/ui/button';
import Search from '@lucide/svelte/icons/search';
import Grid3X3 from '@lucide/svelte/icons/grid-3-x-3';
import List from '@lucide/svelte/icons/list';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import X from '@lucide/svelte/icons/x';

interface Props {
  searchQuery?: string;
  viewMode?: 'grid' | 'list';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSearchChange?: (query: string) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onClearAll?: () => void;
}

let {
  searchQuery = $bindable(''),
  viewMode = $bindable<'grid' | 'list'>('grid'),
  sortBy = $bindable('name'),
  sortOrder = $bindable<'asc' | 'desc'>('asc'),
  onSearchChange,
  onViewModeChange,
  onSortChange,
  onClearAll
}: Props = $props();

const hasActiveFilters = $derived(searchQuery.trim().length > 0);

function handleSearchInput(e: Event) {
  const target = e.target as HTMLInputElement;
  searchQuery = target.value;
  onSearchChange?.(target.value);
}

function toggleViewMode() {
  const newMode = viewMode === 'grid' ? 'list' : 'grid';
  viewMode = newMode;
  onViewModeChange?.(newMode);
}

function toggleSortOrder() {
  const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  sortOrder = newOrder;
  onSortChange?.(sortBy, newOrder);
}

function handleSortByChange(value: string | undefined) {
  if (!value) return;
  sortBy = value;
  onSortChange?.(value, sortOrder);
}

function clearAllFilters() {
  searchQuery = '';
  onClearAll?.();
}
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div class="relative flex-1">
    <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      type="search"
      placeholder="Search budgets..."
      value={searchQuery}
      oninput={handleSearchInput}
      class="pl-9"
    />
  </div>

  <div class="flex items-center gap-2">
    <!-- Sort By -->
    <Select.Root type="single" value={sortBy} onValueChange={handleSortByChange}>
      <Select.Trigger class="w-[140px]">
        <span class="text-sm">Sort: {sortBy === 'name' ? 'Name' : sortBy === 'allocated' ? 'Allocated' : sortBy === 'consumed' ? 'Consumed' : 'Remaining'}</span>
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="name">Name</Select.Item>
        <Select.Item value="allocated">Allocated</Select.Item>
        <Select.Item value="consumed">Consumed</Select.Item>
        <Select.Item value="remaining">Remaining</Select.Item>
      </Select.Content>
    </Select.Root>

    <!-- Sort Order -->
    <Button variant="outline" size="icon" onclick={toggleSortOrder} title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}>
      <ArrowUpDown class="h-4 w-4" />
    </Button>

    <!-- View Mode -->
    <Button variant="outline" size="icon" onclick={toggleViewMode} title={viewMode === 'grid' ? 'Grid View' : 'List View'}>
      {#if viewMode === 'grid'}
        <Grid3X3 class="h-4 w-4" />
      {:else}
        <List class="h-4 w-4" />
      {/if}
    </Button>

    <!-- Clear Filters -->
    {#if hasActiveFilters}
      <Button variant="ghost" size="sm" onclick={clearAllFilters}>
        <X class="mr-1 h-4 w-4" />
        Clear
      </Button>
    {/if}
  </div>
</div>
