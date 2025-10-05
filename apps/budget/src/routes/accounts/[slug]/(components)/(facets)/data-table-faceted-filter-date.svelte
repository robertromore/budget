<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import {DataTableFacetedFilter} from '..';
import UsersRound from '@lucide/svelte/icons/users-round';
import type {Component} from 'svelte';
import type {HTMLAttributes} from 'svelte/elements';
import type {FacetedFilterOption} from '$lib/types';
import {SvelteMap} from 'svelte/reactivity';
import * as Command from '$lib/components/ui/command';
import {AdvancedDateDialog} from '$lib/components/dialogs';
import {DateFiltersState} from '$lib/states/ui/date-filters.svelte';

type Props<TData, TValue> = HTMLAttributes<HTMLDivElement> & {
  column: Column<TData, TValue>;
};

let {column}: Props<TData, TValue> = $props();

const dateFiltersState = $derived(DateFiltersState.get());
const allDates = $derived(dateFiltersState?.dateFilters);

// Fallback to column's own faceted unique values if DateFiltersState is not available
const columnFacetedValues = $derived.by(() => {
  const facetedUniqueValues = column.getFacetedUniqueValues();
  if (!facetedUniqueValues || facetedUniqueValues.size === 0) return [];

  return Array.from(facetedUniqueValues.entries()).map(([value, count]) => ({
    value: value as string,
    label: value as string, // Will be formatted properly by the actual date formatter
    count
  }));
});

// Use DateFiltersState dates if available, otherwise fall back to column's faceted values
// Ensure we always have a valid array, never undefined
const effectiveDates = $derived.by(() => {
  if (allDates?.length > 0) return allDates;
  if (columnFacetedValues?.length > 0) return columnFacetedValues;
  return []; // Always return an array, never undefined
});

const allOptions = $derived(
  new SvelteMap<string, FacetedFilterOption>(
    effectiveDates.map((date: FacetedFilterOption) => [date.value, date])
  )
);

const options = $derived(
  new SvelteMap<string, FacetedFilterOption>(
    effectiveDates.map((date: FacetedFilterOption) => [date.value, date])
  )
);

let dialogOpen = $state(false);
</script>

{#snippet customValueSnippet()}
  <Command.Item onSelect={() => (dialogOpen = true)} class="justify-center text-center">
    Custom value
  </Command.Item>
{/snippet}

<DataTableFacetedFilter
  {column}
  title="Date"
  {options}
  {allOptions}
  allIcon={UsersRound as unknown as Component}
  {customValueSnippet} />

<AdvancedDateDialog
  bind:dialogOpen
  onSubmit={(new_value: FacetedFilterOption) => {
    dateFiltersState?.add(new_value);
    dialogOpen = false;
  }} />
