<script lang="ts" generics="TData">
  import type { Table } from "@tanstack/table-core";
  import { DataTableViewOptions } from "./";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import { page } from "$app/state";
  import type { View } from "$lib/schema/view";
  import type { ViewFilter } from "$lib/types";

  let {
    table,
  }: {
    table: Table<TData>,
  } = $props();

  const views: View[] = $derived<View[]>(page.data.views);

  let currentView = $state('upcoming');
  let currentViewFilters: ViewFilter[] = $derived<ViewFilter[]>(views.find(view => view.name === currentView)?.filters as ViewFilter[]);
  const updateViewFilters = () => {
    if (currentViewFilters.length === 0) {
      table.resetColumnFilters();
    }
    currentViewFilters.forEach(filter => {
      table.getColumn(filter.column)?.setFilterValue(filter.value);
    });
  };
  updateViewFilters();
</script>

<ToggleGroup.Root
  type="single"
  class="justify-start items-start"
  value={currentView}
  onValueChange={value => {
    currentView = value;
    updateViewFilters();
  }}>
  {#each views as view}
    <ToggleGroup.Item value={view.name} aria-label={view.label}>
      {view.label}
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>

<div class="flex items-center justify-between">
  <div class="flex flex-1 items-center space-x-2">
      {#each currentViewFilters as filter}
        {@const column = table.getColumn(filter.column)}
        {#if column?.getIsVisible()}
          <filter.component {column} value={filter.value}/>
        {/if}
      {/each}
    <!-- <Input
      placeholder="Filter tasks..."
      value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
      oninput={(e) => {
        table.getColumn("title")?.setFilterValue(e.currentTarget.value);
      }}
      onchange={(e) => {
        table.getColumn("title")?.setFilterValue(e.currentTarget.value);
      }}
      class="h-8 w-[150px] lg:w-[250px]"
    /> -->
    <!-- {#if payeeCol?.getIsVisible()}
      <DataTableFacetedFilterPayee
        column={payeeCol}
      />
    {/if}
    {#if categoryCol?.getIsVisible()}
      <DataTableFacetedFilterCategory
        column={categoryCol}
      />
    {/if}
    {#if dateCol?.getIsVisible()}
      <DataTableFacetedFilterDate
        column={dateCol}
      />
    {/if}

    {#if isFiltered}
      <Button
        variant="ghost"
        onclick={() => table.resetColumnFilters()}
        class="h-8 px-2 lg:px-3"
      >
        Reset
        <Cross2 class="ml-2 size-4" />
      </Button>
    {/if} -->
    <!-- {#if statusCol?.getIsVisible()}
      <DataTableFacetedFilterStatus
        column={statusCol}
      />
    {/if} -->
  </div>

  <DataTableViewOptions {table} />
</div>
