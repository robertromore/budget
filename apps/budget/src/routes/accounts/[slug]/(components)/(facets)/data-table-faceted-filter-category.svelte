<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import DataTableEntityFacetedFilter from './data-table-entity-faceted-filter.svelte';
import type {Category} from '$lib/schema';
import {CategoriesState} from '$lib/states/entities';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
};

let {column}: Props<TData, TValue> = $props();

const categoriesState = CategoriesState.get();
const allCategories = $derived(categoriesState?.all || []);

const categoryConfig = $derived({
  entities: allCategories,
  getId: (category: Category) => category.id,
  getLabel: (category: Category) => category.name || '',
  icon: SquareMousePointer,
  title: 'Category',
  allIcon: SquareMousePointer,
});
</script>

<DataTableEntityFacetedFilter {column} config={categoryConfig} />
