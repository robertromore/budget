<script lang="ts" generics="TData, TValue">
  // Framework imports
  import type { Component } from "svelte";

  // Third-party library imports
  import type { Column, Table } from "@tanstack/table-core";

  // UI component imports
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  // State imports
  import { currentViews } from "$lib/states/views";

  // Type imports
  import type { HTMLAttributes } from "svelte/elements";
  import type { WithoutChildren } from "bits-ui";

  // Utility imports
  import { cn } from "$lib/utils";

  // --- Extended Props Interface ---
  interface Props extends HTMLAttributes<HTMLDivElement> {
    // Core data table props
    column: Column<TData, TValue>;
    table?: Table<TData>;
    
    // Display props
    title: string;
    icon?: Component;
    
    // Behavioral props
    sortable?: boolean;
    filterable?: boolean;
    
    // Event handlers
    onSort?: (columnId: string, desc: boolean) => void;
    onFilter?: (columnId: string, value: unknown) => void;
  }

  // --- Props Destructuring ---
  let {
    column,
    table,
    title,
    icon: Icon,
    sortable = true,
    filterable = true,
    onSort,
    onFilter,
    class: className,
    ...restProps
  }: WithoutChildren<Props> = $props();

  // --- Derived State ---
  const currentView = $derived(currentViews.get().activeView);
  const sortState = $derived(
    currentView.view.getSorting().find((sorter) => sorter.id === column.id)
  );
  const canSort = $derived(column?.getCanSort() && sortable);
  const canFilter = $derived(column?.getCanFilter() && filterable);

  // --- Event Handlers ---
  function handleSort(desc: boolean) {
    if (onSort) {
      onSort(column.id, desc);
    } else {
      currentView.updateTableSorter(column.id, desc);
    }
  }

  function handleFilter(value: unknown) {
    if (onFilter) {
      onFilter(column.id, value);
    } else {
      column.setFilterValue(value);
    }
  }
</script>

{#if !canSort && !canFilter}
  <div class={cn("flex items-center", className)} {...restProps}>
    {#if Icon}
      <Icon class="mr-2 size-4" />
    {/if}
    {title}
  </div>
{:else}
  <div class={cn("flex items-center", className)} {...restProps}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="sm" class="-ml-3 h-8">
            {#if Icon}
              <Icon class="mr-2 size-4" />
            {/if}
            {title}
            
            {#if canSort && sortState}
              <!-- Sort indicators -->
              <span class="ml-2">
                {sortState.desc ? "↓" : "↑"}
              </span>
            {/if}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Content align="start">
        {#if canSort}
          <DropdownMenu.Item onclick={() => handleSort(false)}>
            Sort Ascending
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => handleSort(true)}>
            Sort Descending
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
        {/if}
        
        {#if canFilter}
          <DropdownMenu.Item onclick={() => handleFilter(null)}>
            Clear Filter
          </DropdownMenu.Item>
        {/if}
        
        <DropdownMenu.Item onclick={() => column.toggleVisibility()}>
          Hide Column
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
{/if}