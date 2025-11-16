<script lang="ts" generics="TData, TValue">
import type { Column } from '@tanstack/table-core';
import DataTableEntityFacetedFilter from './data-table-entity-faceted-filter.svelte';
import type { Payee } from '$lib/schema';
import { PayeesState } from '$lib/states/entities';
import HandCoins from '@lucide/svelte/icons/hand-coins';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
};

let { column }: Props<TData, TValue> = $props();

const payeesState = PayeesState.get();
const allPayees = $derived(payeesState?.all || []);

const payeeConfig = $derived({
  entities: allPayees,
  getId: (payee: Payee) => payee.id,
  getLabel: (payee: Payee) => payee.name || '',
  icon: HandCoins,
  title: 'Payee',
  allIcon: HandCoins,
});
</script>

<DataTableEntityFacetedFilter {column} config={payeeConfig} />
