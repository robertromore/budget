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
  import Pencil from "lucide-svelte/icons/pencil";
  import Settings2 from "lucide-svelte/icons/settings-2";
  import { cn } from "$lib/utils";
  import { CurrentViewState } from "$lib/states/current-view.svelte";

  let {
    table,
  }: {
    table: Table<TransactionsFormat>;
  } = $props();

  let manageViewForm = $state(false);
  let editViewId = $state(-1);
  let editViewsMode = $state(false);

  let filterComponents: FilterInputOption<TransactionsFormat>[] = $derived.by(() => {
    const columns = table.getAllColumns();
    return columns
      .filter((column) => column && column.getIsVisible() && column.columnDef.meta?.facetedFilter)
      .map((column) => {
        return column.columnDef.meta?.facetedFilter(column);
      });
  });

  const _currentViews = $derived(currentViews.get());
  const firstViewId = $derived(_currentViews.viewsStates.values().next().value?.view.id!);
  let currentViewValue = $state((() => firstViewId)().toString());

  const editableViews = $derived(_currentViews.editableViews.toArray());
  const nonEditableViews = $derived(_currentViews.nonEditableViews.toArray());
</script>

<div class="flex text-sm">
  <ToggleGroup.Root
    type="single"
    size="sm"
    class="items-start justify-start"
    bind:value={currentViewValue}
    onValueChange={(value) => {
      manageViewForm = false;
      let newView: number;
      if (!value) {
        newView = firstViewId;
        currentViewValue = newView.toString();
      } else {
        newView = parseInt(value);
      }
      _currentViews.remove(-1, false).setActive(newView);
    }}
  >
    {#each nonEditableViews as viewState}
      <ToggleGroup.Item value={viewState.view.id.toString()} aria-label={viewState.view.name}>
        {viewState.view.name}
      </ToggleGroup.Item>
    {/each}

    <Separator orientation="vertical" class="mx-1" />

    {#each editableViews as viewState}
      <div class={cn(editViewsMode ? "flex rounded-md border" : "")}>
        <ToggleGroup.Item
          value={viewState.view.id.toString()}
          aria-label={viewState.view.name}
          class={cn(editViewsMode ? "rounded-r-none" : "")}
        >
          {viewState.view.name}
          {#if viewState.view.dirty}
            <Asterisk class="-ml-1" />
          {/if}
        </ToggleGroup.Item>

        {#if editViewsMode}
          <div class="flex gap-0">
            <!-- {#if editableViews.length > 1}
              <Button variant="ghost" class="px-2 h-8 rounded-l-none rounded-r-none cursor-move">
                <GripVertical />
              </Button>
            {/if} -->

            <Toggle
              variant="outline"
              class={cn("h-8 rounded-l-none border-none px-2")}
              bind:pressed={
                () => manageViewForm && viewState.view.id === editViewId,
                (value) => {
                  currentViewValue = viewState.view.id.toString();
                  _currentViews.setActive(viewState.view.id);
                  editViewId = value ? viewState.view.id : -1;
                  manageViewForm = value;
                }
              }
            >
              <Pencil />
            </Toggle>
          </div>
        {/if}
      </div>
    {/each}
  </ToggleGroup.Root>

  <Toggle
    variant="outline"
    size="sm"
    class="ml-2"
    bind:pressed={
      () => editViewsMode,
      (value) => {
        editViewsMode = value;
        manageViewForm = false;
        if (!value) {
          editViewId = -1;
        }
      }
    }
  >
    <Settings2 />
  </Toggle>

  <Toggle
    variant="outline"
    size="sm"
    class="ml-2"
    bind:pressed={
      () => manageViewForm,
      (value) => {
        manageViewForm = value;
        editViewsMode = false;
        if (value) {
          _currentViews.addTemporaryView(table);
        } else {
          _currentViews.removeTemporaryView();
        }
      }
    }
    disabled={manageViewForm}
  >
    {#if manageViewForm && editViewId === -1}
      <Layers class="mr-2 size-4" /> New view <PencilLine class="ml-2 size-4" />
    {:else}
      <CirclePlus class="size-4" />
    {/if}
  </Toggle>
</div>

<Separator />

{#if manageViewForm}
  <ManageViewForm
    availableFilters={filterComponents}
    onCancel={() => {
      manageViewForm = false;
      _currentViews.activeView.resetToInitialState();
    }}
    onDelete={() => {
      manageViewForm = false;
      _currentViews.remove(editViewId);
      currentViewValue = _currentViews.activeView.view.id.toString();
    }}
    onSave={(new_entity) => {
      manageViewForm = false;
      const viewState = new CurrentViewState(new_entity, table);
      _currentViews.add(viewState, true);
    }}
    bind:viewId={editViewId}
  />
{:else}
  <div class="flex">
    <FilterInput availableFilters={filterComponents} />

    <div class="flex-grow"></div>

    <div class="flex gap-1">
      <DisplayInput />
      {#if _currentViews.activeView.view.dirty && parseInt(currentViewValue) >= 0}
        <Button
          variant="outline"
          size="sm"
          onclick={() => {
            _currentViews.activeView.resetToInitialState();
          }}>Clear</Button
        >
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
