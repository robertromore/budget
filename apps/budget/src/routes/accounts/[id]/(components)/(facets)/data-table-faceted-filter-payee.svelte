<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import {DataTableFacetedFilter} from '..';
import type {Component} from 'svelte';
import type {Payee} from '$lib/schema';
import {currentViews} from '$lib/states/views';
import {PayeesState} from '$lib/states/entities';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import {SvelteMap} from 'svelte/reactivity';
import type {FacetedFilterOption} from '$lib/types';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
};

let {column}: Props<TData, TValue> = $props();

const payeesState = PayeesState.get();
const allPayees = $derived(payeesState?.all || []);

const activeView = $derived(currentViews.get().activeView);
const activeViewModel = $derived(activeView.view);
const selectedValues = $derived(activeViewModel.getFilterValue(column.id));

// Get faceted values with counts from TanStack Table
const facets = $derived(column?.getFacetedUniqueValues?.() || new Map());

const payeeOptions = $derived.by(() => {
  const options = new SvelteMap<number | string, FacetedFilterOption>();

  // Add options based on faceted data (actual data in table with counts)
  facets.forEach((count: number, value: string) => {
    if (value === 'null' || value === '') {
      // Handle null/empty payees
      options.set('null', {
        label: '(None)',
        value: 'null',
        icon: HandCoins as unknown as Component,
      });
    } else {
      // Find the payee entity
      const payeeId = parseInt(value);
      const payee = allPayees.find(p => p.id === payeeId);
      if (payee) {
        options.set(payee.id, {
          label: payee.name || '',
          value: payee.id + '',
          icon: HandCoins as unknown as Component,
        });
      }
    }
  });

  return options;
});

const allPayeeOptions = $derived.by(() => {
  const options = new SvelteMap<number | string, FacetedFilterOption>();

  // Include null option if it exists in data
  if (facets.has('null') || facets.has('')) {
    options.set('null', {
      label: '(None)',
      value: 'null',
      icon: HandCoins as unknown as Component,
    });
  }

  // Add all payee options
  allPayees?.forEach((payee: Payee) => {
    options.set(payee.id, {
      label: payee.name || '',
      value: payee.id + '',
      icon: HandCoins as unknown as Component,
    });
  });

  return options;
});
</script>

<DataTableFacetedFilter
  {column}
  title="Payee"
  options={payeeOptions}
  allOptions={allPayeeOptions}
  allIcon={HandCoins as unknown as Component} />
