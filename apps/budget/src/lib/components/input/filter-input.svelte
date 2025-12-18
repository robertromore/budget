<script lang="ts">
import { buttonVariants } from '$lib/components/ui/button/index.js';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { currentViews } from '$lib/states/views';
import type { FilterInputOption, ViewFilter } from '$lib/types';
import { cn } from '$lib/utils';
import ListFilterPlus from '@lucide/svelte/icons/list-filter-plus';

let {
  value = $bindable(),
  availableFilters,
}: {
  value?: ViewFilter[];
  availableFilters: FilterInputOption[];
} = $props();

// Use runed Context API instead of Svelte's getContext
const currentViewsState = $derived(currentViews.get());
const currentView = $derived(currentViewsState?.activeView);
const _selectedFilters = $derived(
  currentView?.view
    ?.getAllFilteredColumns()
    ?.map((selectedFilter) =>
      availableFilters.find((availableFilter) => availableFilter.column.id === selectedFilter)
    ) ?? []
);

let selectableFilters = $derived(
  availableFilters.filter(
    (availableFilter) =>
      _selectedFilters.findIndex((filter) => filter?.name === availableFilter.name) < 0
  )
);
</script>

<div class="flex gap-2">
  {#each _selectedFilters as filter}
    {#if filter}
      {@const { component: Component, props } = filter.component()}
      <Component {...props}></Component>
    {/if}
  {/each}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger class={cn(buttonVariants({ variant: 'outline' }), 'h-8')}>
      <ListFilterPlus />
      Filter
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Group>
        {#each selectableFilters as selectableFilter}
          <DropdownMenu.Item
            onSelect={() => {
              currentView.addFilter({
                column: selectableFilter.column.id,
                value: selectableFilter.value,
                filter: selectableFilter.column.columnDef.filterFn?.toString() || '',
              });
              value = currentView.view.getAllFilterValues();
            }}>
            {#if selectableFilter.icon}
              <selectableFilter.icon />
            {/if}
            <span>{selectableFilter.name}</span>
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
