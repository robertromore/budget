<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import {DataTableFacetedFilter} from '..';
import CircleUserRound from '@lucide/svelte/icons/circle-user-round';
import UsersRound from '@lucide/svelte/icons/users-round';
import type {Component} from 'svelte';
import {TransactionStatuses} from '$lib/schema';
import {SvelteMap} from 'svelte/reactivity';
import {currentViews} from '$lib/states/views';
import type {FacetedFilterOption} from '$lib/types';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
};

let {column}: Props<TData, TValue> = $props();

const activeView = $derived(currentViews.get().activeView);
const activeViewModel = $derived(activeView.view);
const selectedValues = $derived(activeViewModel.getFilterValue(column.id));

// Get faceted values with counts from TanStack Table
const facets = $derived(column?.getFacetedUniqueValues?.() || new Map());
const allStatuses = $derived(Object.values(TransactionStatuses));

const statusOptions = $derived.by(() => {
  const options = new SvelteMap<string, FacetedFilterOption>();

  // Add options based on faceted data (actual data in table with counts)
  facets.forEach((count: number, value: string) => {
    if (value && Object.values(TransactionStatuses).includes(value as TransactionStatuses)) {
      const status = value as TransactionStatuses;
      options.set(status, {
        label: status,
        value: status,
        icon: CircleUserRound as unknown as Component,
      });
    }
  });

  return options;
});

const allStatusOptions = $derived(
  new SvelteMap<string, FacetedFilterOption>(
    allStatuses?.map((status: TransactionStatuses) => {
      return [
        status,
        {
          label: status,
          value: status,
          icon: CircleUserRound as unknown as Component,
        },
      ];
    })
  )
);
</script>

<DataTableFacetedFilter
  {column}
  title="Status"
  options={statusOptions}
  allOptions={allStatusOptions}
  allIcon={UsersRound as unknown as Component} />
