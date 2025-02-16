<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import ListFilterPlus from "lucide-svelte/icons/list-filter-plus";
  import { cn } from "$lib/utils";
  import type { FilterInputOption, TransactionsFormat, ViewFilter } from "$lib/types";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import { currentViews } from "$lib/states/current-views.svelte";

  let {
    value = $bindable(),
    availableFilters,
  }: {
    value?: ViewFilter[];
    availableFilters: FilterInputOption<TransactionsFormat>[];
  } = $props();

  const currentView = $derived(currentViews.get().activeView);
  // const _selectedColumnValues = $derived(new SvelteMap<string, SvelteSet<unknown>>([...currentView.filters.values()].map(selectedFilter => [selectedFilter.column, selectedFilter.value])));
  // const _selectedColumnValues = $derived(currentView.view.getAllFilterValues());
  const _selectedFilters = $derived(currentView.view.getAllFilteredColumns().map(selectedFilter => availableFilters.find((availableFilter) => availableFilter.column.id === selectedFilter)));

  // $effect(() => {
  //   value = _selectedFilters.map(_selectedFilter => {
  //     return {
  //       column: _selectedFilter!.column.id,
  //       filter: _selectedFilter!.name,
  //       value: _selectedFilter!.value
  //     }
  //   });
  // })

  let selectableFilters = $derived(availableFilters.filter((availableFilter) => _selectedFilters.toArray().findIndex(filter => filter?.name === availableFilter.name) < 0));

  // $effect(() => {
  //   _selectedFilters.forEach(availableFilter => availableFilter.column.setFilterValue(availableFilter.value));
  // });

  // $effect(() => {
  //   selectedFilters = _selectedFilters.values().toArray().map(filter => {
  //     const filterId = filter.column.columnDef.meta?.availableFilters.find((availableFilter: AvailableFiltersEntry) => availableFilter.id === filter.column.getFilterFn()?.name)?.id || '';
  //     const filterValue = filter.column.getFilterValue() || '';
  //     return [filterId, filterValue] as [string, unknown];
  //   });
  // })
</script>

<div class="flex gap-2">
  {#each _selectedFilters as filter}
    {#if filter}
      {@const { component: Component, props } = filter.component()}
      <Component {...props}></Component>
    {/if}
  {/each}

  <DropdownMenu.Root>
    <DropdownMenu.Trigger class={cn(buttonVariants({ variant: "outline" }), 'h-8')}>
      <ListFilterPlus />
      Filter
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Group>
        {#each selectableFilters as selectableFilter}
          <DropdownMenu.Item onSelect={() => currentView.addFilter({
            column: selectableFilter.column.id,
            value: selectableFilter.value,
            filter: selectableFilter.column.columnDef.filterFn?.toString() || ''
          })}>
            {#if selectableFilter.icon}
              <selectableFilter.icon/>
            {/if}
            <span>{selectableFilter.name}</span>
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
