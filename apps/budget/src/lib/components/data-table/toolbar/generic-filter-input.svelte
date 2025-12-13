<script lang="ts" generics="TData">
import { buttonVariants } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import type { FilterInputOption } from '$lib/types';
import { cn } from '$lib/utils';
import ListFilterPlus from '@lucide/svelte/icons/list-filter-plus';
import type { ColumnFiltersState, Table } from '@tanstack/table-core';

interface Props {
  /** The table instance */
  table: Table<TData>;
  /** Available filter options */
  availableFilters: FilterInputOption<TData>[];
  /** Current column filters state */
  columnFilters?: ColumnFiltersState;
  /** Handler for column filter changes */
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
}

let { table, availableFilters, columnFilters = [], onColumnFiltersChange }: Props = $props();

// Get the list of currently active filter column IDs
const activeFilterColumnIds = $derived(new Set(columnFilters.map((f) => f.id)));

// Map active filters to their FilterInputOption components
const selectedFilters = $derived(
  columnFilters
    .map((filter) => availableFilters.find((af) => af.column.id === filter.id))
    .filter(Boolean) as FilterInputOption<TData>[]
);

// Filters that can still be added (not already active)
const selectableFilters = $derived(
  availableFilters.filter((af) => !activeFilterColumnIds.has(af.column.id))
);

// Check if there are any filters available at all
const hasFilters = $derived(availableFilters.length > 0);

// Add a filter
function addFilter(filter: FilterInputOption<TData>) {
  const newFilters: ColumnFiltersState = [
    ...columnFilters,
    {
      id: filter.column.id,
      value: filter.value,
    },
  ];
  onColumnFiltersChange?.(newFilters);
}

// Remove a filter
function removeFilter(columnId: string) {
  const newFilters = columnFilters.filter((f) => f.id !== columnId);
  onColumnFiltersChange?.(newFilters);
}

// Update a filter value
function updateFilter(columnId: string, value: unknown) {
  const newFilters = columnFilters.map((f) => (f.id === columnId ? { ...f, value } : f));
  onColumnFiltersChange?.(newFilters);
}
</script>

<div class="flex gap-2">
  {#each selectedFilters as filter}
    {#if filter}
      {@const { component: Component, props } = filter.component()}
      <Component
        {...props}
        onRemove={() => removeFilter(filter.column.id)}
        onValueChange={(value: unknown) => updateFilter(filter.column.id, value)} />
    {/if}
  {/each}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class={cn(buttonVariants({ variant: 'outline' }), 'h-8')}
      disabled={!hasFilters}>
      <ListFilterPlus />
      Filter
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Group>
        {#if selectableFilters.length === 0}
          <DropdownMenu.Item disabled>No more filters available</DropdownMenu.Item>
        {:else}
          {#each selectableFilters as selectableFilter}
            <DropdownMenu.Item onSelect={() => addFilter(selectableFilter)}>
              {#if selectableFilter.icon}
                <selectableFilter.icon />
              {/if}
              <span>{selectableFilter.name}</span>
            </DropdownMenu.Item>
          {/each}
        {/if}
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
