<script lang="ts">
import type { Table } from '@tanstack/table-core';
import type { FilterInputOption, TransactionsFormat } from '$lib/types';
import { Separator } from '$lib/components/ui/separator';
import CirclePlus from '@lucide/svelte/icons/circle-plus';
import Layers from '@lucide/svelte/icons/layers';
import PencilLine from '@lucide/svelte/icons/pencil-line';
import Toggle from '$lib/components/ui/toggle/toggle.svelte';
import ManageViewForm from './manage-view-form.svelte';
import { FilterInput, DisplayInput } from '$lib/components/input';
import { currentViews } from '$lib/states/views';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import * as Tooltip from '$lib/components/ui/tooltip';
import Pencil from '@lucide/svelte/icons/pencil';
import Settings2 from '@lucide/svelte/icons/settings-2';
import { cn } from '$lib/utils';
import { CurrentViewState } from '$lib/states/views/current-view.svelte';
import * as Tabs from '$lib/components/ui/tabs';

interface Props {
  table: Table<TransactionsFormat>;
}

let { table }: Props = $props();

let manageViewForm = $state(false);
let editViewId = $state(0);
let editViewsMode = $state(false);

// svelte-ignore state_referenced_locally
const columns = table.getAllColumns();
let filterComponents: FilterInputOption[] = $derived.by(() => {
  return columns
    .filter((column) => column && column.getIsVisible() && column.columnDef.meta?.facetedFilter)
    .map((column) => {
      return column.columnDef.meta!.facetedFilter!(column);
    });
});

const _currentViews = $derived(currentViews.get());
const firstViewId = $derived(_currentViews?.viewsStates.values().next().value?.view.id);
let currentViewValue = $state('');

// Initialize currentViewValue when firstViewId changes
$effect(() => {
  if (firstViewId && !currentViewValue) {
    currentViewValue = firstViewId.toString();
  }
});

const editableViews = $derived(_currentViews?.editableViews ?? []);
const editableViewsSize = $derived(editableViews.length);
const nonEditableViews = $derived(_currentViews?.nonEditableViews ?? []);
</script>

<div class="flex text-sm" data-help-id="transaction-toolbar" data-help-title="Transaction Toolbar">
  <Tabs.Root
    bind:value={currentViewValue}
    onValueChange={(value) => {
      manageViewForm = false;
      let newView: number;
      if (!value) {
        if (!firstViewId) return;
        newView = firstViewId;
        currentViewValue = newView.toString();
      } else {
        newView = parseInt(value);
      }
      _currentViews?.remove(0, false).setActive(newView);
    }}>
    <Tabs.List>
      {#each nonEditableViews as viewState}
        <Tabs.Trigger value={viewState.view.id.toString()} aria-label={viewState.view.name}>
          {viewState.view.name}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
    <Tabs.Content value="account"></Tabs.Content>
  </Tabs.Root>

  <Separator orientation="vertical" class="mx-1" />

  {#if editableViewsSize > 0}
    <Tabs.Root
      bind:value={currentViewValue}
      onValueChange={(value) => {
        manageViewForm = false;
        let newView: number;
        if (!value) {
          if (!firstViewId) return;
          newView = firstViewId;
          currentViewValue = newView.toString();
        } else {
          newView = parseInt(value);
        }
        _currentViews?.remove(0, false).setActive(newView);
      }}>
      <Tabs.List>
        {#each editableViews as viewState}
          <Tabs.Trigger value={viewState.view.id.toString()} aria-label={viewState.view.name}>
            <span class="flex items-center gap-2">
              {viewState.view.name}
              {#if viewState.view.dirty}
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    {#snippet child({ props })}
                      <Badge
                        variant="destructive"
                        class="h-4 px-1.5 text-[10px] font-medium"
                        {...props}>
                        Unsaved
                      </Badge>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>This view has unsaved changes</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              {/if}
            </span>
          </Tabs.Trigger>

          {#if editViewsMode}
            <div class="flex gap-0">
              <Toggle
                variant="outline"
                class={cn('h-8 rounded-none border-none shadow-none')}
                bind:pressed={
                  () => manageViewForm && viewState.view.id === editViewId,
                  (value) => {
                    currentViewValue = viewState.view.id.toString();
                    _currentViews?.setActive(viewState.view.id);
                    editViewId = value ? viewState.view.id : 0;
                    manageViewForm = value;
                  }
                }>
                <Pencil />
              </Toggle>
            </div>
          {/if}
        {/each}
      </Tabs.List>
      <Tabs.Content value="account"></Tabs.Content>
    </Tabs.Root>

    <Toggle
      variant="outline"
      class="ml-2"
      bind:pressed={
        () => editViewsMode,
        (value) => {
          editViewsMode = value;
          manageViewForm = false;
          if (!value) {
            editViewId = 0;
          }
        }
      }>
      <Settings2 /> Edit views
    </Toggle>
  {/if}

  <Toggle
    variant="outline"
    class="ml-2"
    bind:pressed={
      () => manageViewForm,
      (value) => {
        manageViewForm = value;
        editViewsMode = false;
        if (value) {
          _currentViews?.addTemporaryView(table);
        } else {
          _currentViews?.removeTemporaryView();
        }
      }
    }
    disabled={manageViewForm}>
    {#if manageViewForm && editViewId === 0}
      <Layers class="mr-2 size-4" /> New view <PencilLine class="ml-2 size-4" />
    {:else}
      <CirclePlus class="size-4" /> New view
    {/if}
  </Toggle>
</div>

{#if manageViewForm}
  <div class="mt-4">
    <ManageViewForm
      availableFilters={filterComponents}
      onCancel={() => {
        manageViewForm = false;
        _currentViews?.activeView?.resetToInitialState();
      }}
      onDelete={() => {
        manageViewForm = false;
        _currentViews?.remove(editViewId);
        currentViewValue = _currentViews?.activeView?.view.id?.toString() ?? '';
      }}
      onSave={(new_entity) => {
        manageViewForm = false;
        const viewState = new CurrentViewState(new_entity, table);
        _currentViews?.add(viewState, true);
      }}
      bind:viewId={editViewId} />
  </div>
{:else}
  <div class="mt-4 flex">
    <div data-help-id="transaction-filters" data-help-title="Filter Transactions">
      <FilterInput availableFilters={filterComponents} />
    </div>

    <div class="grow"></div>

    <div class="flex gap-1" data-help-id="transaction-view-options" data-help-title="View Options">
      <DisplayInput />
      {#if _currentViews?.activeView?.view?.dirty}
        <Button
          variant="outline"
          size="sm"
          onclick={() => {
            _currentViews?.activeView?.resetToInitialState();
          }}>Reset</Button>
        {#if parseInt(currentViewValue) >= 0}
          <Button size="sm" onclick={() => _currentViews?.activeView?.view?.saveView()}
            >Save</Button>
        {/if}
      {/if}
    </div>
  </div>
{/if}
