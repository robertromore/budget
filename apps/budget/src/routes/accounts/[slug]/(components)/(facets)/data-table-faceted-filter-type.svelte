<script lang="ts" generics="TData, TValue">
import type { Column } from '@tanstack/table-core';
import DataTableEntityFacetedFilter from './data-table-entity-faceted-filter.svelte';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import List from '@lucide/svelte/icons/list';

type Props<TData, TValue> = {
	column: Column<TData, TValue>;
};

let { column }: Props<TData, TValue> = $props();

const TransactionTypes = {
	TRANSFER: 'transfer',
	REGULAR: 'regular'
} as const;

type TransactionType = (typeof TransactionTypes)[keyof typeof TransactionTypes];

const allTypes = Object.values(TransactionTypes);

const typeConfig = {
	entities: allTypes,
	getId: (type: TransactionType) => type,
	getLabel: (type: TransactionType) =>
		type === TransactionTypes.TRANSFER ? 'Transfer' : 'Regular',
	icon: ArrowRightLeft,
	title: 'Type',
	allIcon: List
};
</script>

<DataTableEntityFacetedFilter {column} config={typeConfig} />
