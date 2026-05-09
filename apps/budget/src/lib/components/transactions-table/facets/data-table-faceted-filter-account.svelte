<script lang="ts" generics="TData, TValue">
import type { Column } from '@tanstack/table-core';
import DataTableEntityFacetedFilter from './data-table-entity-faceted-filter.svelte';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import type { Account } from '$core/schema';
import Wallet from '@lucide/svelte/icons/wallet';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
};

let { column }: Props<TData, TValue> = $props();

const accountsState = AccountsState.get();
const allAccounts = $derived(accountsState?.all || []);

const accountConfig = $derived({
  entities: allAccounts,
  getId: (account: Account) => account.id,
  getLabel: (account: Account) => account.name || '',
  icon: Wallet,
  title: 'Account',
  allIcon: Wallet,
});
</script>

<DataTableEntityFacetedFilter {column} config={accountConfig} />
