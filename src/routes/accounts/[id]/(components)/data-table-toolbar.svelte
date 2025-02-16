<script lang="ts">
  import type { Table } from "@tanstack/table-core";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import type { FilterInputOption, TransactionsFormat } from "$lib/types";
  import { Separator } from "$lib/components/ui/separator";
  import CirclePlus from "lucide-svelte/icons/circle-plus";
  import Layers from "lucide-svelte/icons/layers";
  import PencilLine from "lucide-svelte/icons/pencil-line";
  import Toggle from "$lib/components/ui/toggle/toggle.svelte";
  import ManageViewForm from "$lib/components/forms/manage-view-form.svelte";
  import FilterInput from "$lib/components/input/filter-input.svelte";
  import { currentViews } from "$lib/states/current-views.svelte";
  import DisplayInput from "$lib/components/input/display-input.svelte";
  import Asterisk from "lucide-svelte/icons/asterisk";
  import { Button } from "$lib/components/ui/button";

  let {
    table,
  }: {
    table: Table<TransactionsFormat>;
  } = $props();

  let newViewForm = $state(false);
  let filterComponents: FilterInputOption<TransactionsFormat>[] = $derived.by(() => {
    const columns = table.getAllColumns();
    return columns
      .filter(column => column && column.getIsVisible() && column.columnDef.meta?.facetedFilter)
      .map(column => {
        return column.columnDef.meta?.facetedFilter(column);
      });
  });

  const _currentViews = $derived(currentViews.get());
  const firstViewId = $derived(_currentViews.viewsStates.values().next().value?.view.id!);
  let currentViewValue = $state((() => firstViewId)().toString());
</script>

<div class="flex text-sm">
  <ToggleGroup.Root
    type="single"
    size="sm"
    class="justify-start items-start"
    bind:value={currentViewValue}
    onValueChange={value => {
      newViewForm = false;
      let newView: number;
      if (!value) {
        newView = firstViewId;
        currentViewValue = newView.toString();
      } else {
        newView = parseInt(value);
      }
      _currentViews.remove(-1).setActive(newView);
    }}>
    {#each _currentViews.viewsStates.values() as currentView}
      <ToggleGroup.Item value={currentView.view.id.toString()} aria-label={currentView.view.name}>
        {currentView.view.name}
        {#if currentView.view.dirty}
          <Asterisk class="-ml-1"/>
        {/if}
      </ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>

  <Separator orientation="vertical" class="mx-4"/>

  <Toggle variant="outline" size="sm" bind:pressed={
    () => newViewForm,
    (value) => {
      newViewForm = value;
      if (value) {
        _currentViews.addTemporaryView(table);
      } else {
        _currentViews.removeTemporaryView();
      }
    }
  } disabled={newViewForm}>
    {#if newViewForm}
      <Layers class="size-4 mr-2" /> New view <PencilLine class="size-4 ml-2" />
    {:else}
      <CirclePlus class="size-4"/>
    {/if}
  </Toggle>
</div>

<Separator/>

{#if newViewForm}
  <ManageViewForm availableFilters={filterComponents} onCancel={() => newViewForm = false} />
{:else}
  <div class="flex">
    <FilterInput availableFilters={filterComponents} />

    <div class="flex-grow"></div>

    <div class="gap-1 flex">
      <DisplayInput />
      {#if _currentViews.activeView.view.dirty}
        <Button variant="outline" size="sm" onclick={() => _currentViews.activeView.resetToInitialState()}>Clear</Button>
        <Button size="sm" onclick={() => _currentViews.activeView.view.saveView()}>Save</Button>
      {/if}
    </div>
  </div>
{/if}

  <!-- <div class="flex flex-1 items-center space-x-2">
    {#each currentViewFilters as filter}
      {@const column = table.getColumn(filter.column)}
      {#if column?.getIsVisible()}
        <filter.component {column} value={filter.value}/>
      {/if}
    {/each}

    <Button variant="ghost">
      <ListFilterPlus/>
    </Button> -->

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
  <!-- </div> -->

  <!-- <DataTableViewOptions {table} /> -->
