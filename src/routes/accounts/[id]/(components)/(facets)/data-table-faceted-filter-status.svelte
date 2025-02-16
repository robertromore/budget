<script lang="ts" generics="TData, TValue">
  import type { Column } from '@tanstack/table-core';
  import { DataTableFacetedFilter } from '..';
  import CircleUserRound from 'lucide-svelte/icons/circle-user-round';
  import UsersRound from 'lucide-svelte/icons/users-round';
  import type { Component } from 'svelte';
  import { page } from '$app/state';
  import { TransactionStatuses, type Transaction } from '$lib/schema';
  import { SvelteSet } from 'svelte/reactivity';
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

  const statuses: TransactionStatuses[] = $derived([...new SvelteSet<TransactionStatuses>(account.transactions.map((transaction: Transaction) => transaction.status)).union(selectedValues)] as TransactionStatuses[]);
  const allStatuses = $derived(Object.values(TransactionStatuses));

  const statusOptions = $derived(statuses?.map((status: TransactionStatuses) => {
    return {
      label: status,
      value: status,
      icon: CircleUserRound as unknown as Component,
    }
  }));

  const allStatusOptions = $derived(allStatuses?.map((status: TransactionStatuses) => {
    return {
      label: status,
      value: status,
      icon: CircleUserRound as unknown as Component,
    }
  }));
</script>

<DataTableFacetedFilter
  column={column}
  title="Status"
  options={statusOptions}
  allOptions={allStatusOptions}
  allIcon={UsersRound as unknown as Component}
/>
