<script lang="ts" generics="TData, TValue">
import type { Column } from '@tanstack/table-core';
import DataTableEntityFacetedFilter from './data-table-entity-faceted-filter.svelte';
import CircleUserRound from '@lucide/svelte/icons/circle-user-round';
import UsersRound from '@lucide/svelte/icons/users-round';
import { TransactionStatuses } from '$lib/schema';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
};

let { column }: Props<TData, TValue> = $props();

const allStatuses = Object.values(TransactionStatuses);

const statusConfig = {
  entities: allStatuses,
  getId: (status: TransactionStatuses) => status,
  getLabel: (status: TransactionStatuses) => status,
  icon: CircleUserRound,
  title: 'Status',
  allIcon: UsersRound,
};
</script>

<DataTableEntityFacetedFilter {column} config={statusConfig} />
