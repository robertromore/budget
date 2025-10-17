<script lang="ts">
import type {Table} from '@tanstack/table-core';
import type {ExpenseFormat} from '../(data)/expense-columns.svelte';
import type {FilterInputOption} from '$lib/types';
import {Separator} from '$lib/components/ui/separator';
import {FilterInput, DisplayInput} from '$lib/components/input';
import {getContext} from 'svelte';
import type {CurrentViewsState} from '$lib/states/views';
import * as Tabs from '$lib/components/ui/tabs';

interface Props {
  table: Table<ExpenseFormat>;
}

let {table}: Props = $props();

// Get filter components from visible columns that have facetedFilter defined
const columns = table.getAllColumns();
let filterComponents: FilterInputOption<ExpenseFormat>[] = $derived.by(() => {
  return columns
    .filter((column) => column && column.getIsVisible() && column.columnDef.meta?.facetedFilter)
    .map((column) => {
      return column.columnDef.meta?.facetedFilter(column);
    });
});

const _currentViews = getContext<CurrentViewsState<ExpenseFormat>>('current_views');
const firstViewId = $derived(_currentViews?.viewsStates.values().next().value?.view.id);
let currentViewValue = $state('');

// Initialize currentViewValue when firstViewId changes
$effect(() => {
  if (firstViewId && !currentViewValue) {
    currentViewValue = firstViewId.toString();
  }
});

const editableViews = $derived(_currentViews?.editableViews ?? []);
const nonEditableViews = $derived(_currentViews?.nonEditableViews ?? []);
</script>

<div class="space-y-4">
  <div class="flex text-sm">
    <!-- Default Views Tabs -->
    <Tabs.Root
      bind:value={currentViewValue}
      onValueChange={(value) => {
        let newView: number;
        if (!value) {
          newView = firstViewId;
          currentViewValue = newView.toString();
        } else {
          newView = parseInt(value);
        }
        _currentViews.remove(0, false).setActive(newView);
      }}>
      <Tabs.List>
        {#each nonEditableViews as viewState}
          <Tabs.Trigger value={viewState.view.id.toString()} aria-label={viewState.view.name}>
            {viewState.view.name}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
    </Tabs.Root>

    {#if editableViews.length > 0}
      <Separator orientation="vertical" class="mx-1" />

      <!-- User Created Views Tabs -->
      <Tabs.Root
        bind:value={currentViewValue}
        onValueChange={(value) => {
          let newView: number;
          if (!value) {
            newView = firstViewId;
            currentViewValue = newView.toString();
          } else {
            newView = parseInt(value);
          }
          _currentViews.remove(0, false).setActive(newView);
        }}>
        <Tabs.List>
          {#each editableViews as viewState}
            <Tabs.Trigger value={viewState.view.id.toString()} aria-label={viewState.view.name}>
              {viewState.view.name}
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
      </Tabs.Root>
    {/if}
  </div>

  <!-- Filter Components and Display Options Row -->
  <div class="flex items-center justify-between">
    <div class="flex flex-1 items-center flex-wrap gap-2">
      {#if filterComponents.length > 0}
        <FilterInput availableFilters={filterComponents} />
      {/if}
    </div>
    <DisplayInput />
  </div>
</div>
