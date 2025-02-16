<script lang="ts" generics="TData, TValue">
  import type { Column } from '@tanstack/table-core';
  import { DataTableFacetedFilter } from '..';
  import CircleUserRound from 'lucide-svelte/icons/circle-user-round';
  import UsersRound from 'lucide-svelte/icons/users-round';
  import type { Component } from 'svelte';
  import { page } from '$app/state';
  import type { Category, Transaction } from '$lib/schema';
  import { currentViews } from '$lib/states/current-views.svelte';

  type Props<TData, TValue> = {
		column: Column<TData, TValue>;
	};

	let { column }: Props<TData, TValue> = $props();

  const { data } = $derived(page);
  const account = $derived(data.account);

  const activeView = $derived(currentViews.get().activeView);
  const activeViewModel = $derived(activeView.view);
  const selectedValues = $derived(activeViewModel.getFilterValue(column.id));

  const categories = $derived(account.transactions.map((transaction: Transaction) => transaction.category).concat(selectedValues));
  const allCategories = $derived(data.categories);

  const categoryOptions = $derived(categories?.map((category: Category) => {
    return {
      label: category.name || '',
      value: category.id + '',
      icon: CircleUserRound as unknown as Component,
    }
  }));

  const allCategoryOptions = $derived(allCategories?.map((category: Category) => {
    return {
      label: category.name || '',
      value: category.id + '',
      icon: CircleUserRound as unknown as Component,
    }
  }));
</script>

<DataTableFacetedFilter
  column={column}
  title="Category"
  options={categoryOptions}
  allOptions={allCategoryOptions}
  allIcon={UsersRound as unknown as Component}
/>
