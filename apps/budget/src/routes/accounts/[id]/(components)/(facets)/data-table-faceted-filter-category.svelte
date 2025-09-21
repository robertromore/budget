<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import {DataTableFacetedFilter} from '..';
import type {Component} from 'svelte';
import type {Category} from '$lib/schema';
import {currentViews} from '$lib/states/views';
import {CategoriesState} from '$lib/states/entities';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';
import type {FacetedFilterOption} from '$lib/types';
import {SvelteMap} from 'svelte/reactivity';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
};

let {column}: Props<TData, TValue> = $props();

const categoriesState = CategoriesState.get();
const allCategories = $derived(categoriesState?.all || []);

const activeView = $derived(currentViews.get().activeView);
const activeViewModel = $derived(activeView.view);
const selectedValues = $derived(activeViewModel.getFilterValue(column.id));

// Get faceted values with counts from TanStack Table
const facets = $derived(column?.getFacetedUniqueValues?.() || new Map());

const categoryOptions = $derived.by(() => {
  const options = new SvelteMap<number | string, FacetedFilterOption>();

  // Add options based on faceted data (actual data in table with counts)
  facets.forEach((count: number, value: string) => {
    if (value === 'null' || value === '') {
      // Handle null/empty categories
      options.set('null', {
        label: '(None)',
        value: 'null',
        icon: SquareMousePointer as unknown as Component,
      });
    } else {
      // Find the category entity
      const categoryId = parseInt(value);
      const category = allCategories.find(c => c.id === categoryId);
      if (category) {
        options.set(category.id, {
          label: category.name || '',
          value: category.id + '',
          icon: SquareMousePointer as unknown as Component,
        });
      }
    }
  });

  return options;
});

const allCategoryOptions = $derived.by(() => {
  const options = new SvelteMap<number | string, FacetedFilterOption>();

  // Include null option if it exists in data
  if (facets.has('null') || facets.has('')) {
    options.set('null', {
      label: '(None)',
      value: 'null',
      icon: SquareMousePointer as unknown as Component,
    });
  }

  // Add all category options
  allCategories?.forEach((category: Category) => {
    options.set(category.id, {
      label: category.name || '',
      value: category.id + '',
      icon: SquareMousePointer as unknown as Component,
    });
  });

  return options;
});
</script>

<DataTableFacetedFilter
  {column}
  title="Category"
  options={categoryOptions}
  allOptions={allCategoryOptions}
  allIcon={SquareMousePointer as unknown as Component} />
