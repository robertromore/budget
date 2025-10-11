<script lang="ts">
import type {BudgetWithRelations} from '$lib/server/domains/budgets';
import type {Table} from '@tanstack/table-core';
import {Button} from '$lib/components/ui/button';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Archive from '@lucide/svelte/icons/archive';
import X from '@lucide/svelte/icons/x';

interface Props {
	table: Table<BudgetWithRelations>;
	allBudgets: BudgetWithRelations[];
	onBulkDelete: (budgets: BudgetWithRelations[]) => void;
	onBulkArchive: (budgets: BudgetWithRelations[]) => void;
}

let {table, allBudgets, onBulkDelete, onBulkArchive}: Props = $props();

const selectedRows = $derived(table.getSelectedRowModel().rows);
const selectedCount = $derived(selectedRows.length);
const selectedBudgets = $derived(selectedRows.map((row) => row.original));
const totalCount = $derived(allBudgets.length);
const pageRowCount = $derived(table.getRowModel().rows.length);
const allPageRowsSelected = $derived(table.getIsAllPageRowsSelected());
const canSelectAll = $derived(allPageRowsSelected && totalCount > pageRowCount);

let selectingAll = $state(false);

const selectedOrAllBudgets = $derived.by(() => {
	if (selectingAll && allPageRowsSelected) {
		return allBudgets;
	}
	return selectedBudgets;
});

const displayCount = $derived.by(() => {
	if (selectingAll && allPageRowsSelected) {
		return totalCount;
	}
	return selectedCount;
});
</script>

{#if selectedCount > 0}
	<div class="flex items-center gap-2 rounded-md border bg-muted px-4 py-2">
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium">
				{displayCount}
				{displayCount === 1 ? 'budget' : 'budgets'} selected
			</span>

			{#if canSelectAll}
				<Button
					variant={selectingAll ? 'default' : 'outline'}
					size="sm"
					class="h-7 px-3 text-xs font-medium"
					onclick={() => (selectingAll = !selectingAll)}
				>
					{selectingAll ? `All pages (${totalCount})` : `This page (${pageRowCount})`}
				</Button>
			{/if}
		</div>

		<div class="ml-auto flex items-center gap-2">
			<Button onclick={() => onBulkArchive(selectedOrAllBudgets)} variant="secondary" size="sm">
				<Archive class="mr-2 h-4 w-4" />
				Archive Selected
			</Button>

			<Button onclick={() => onBulkDelete(selectedOrAllBudgets)} variant="destructive" size="sm">
				<Trash2 class="mr-2 h-4 w-4" />
				Delete Selected
			</Button>

			<Button
				onclick={() => {
					table.resetRowSelection();
					selectingAll = false;
				}}
				variant="ghost"
				size="sm"
				aria-label="Clear selection"
			>
				<X class="h-4 w-4" />
			</Button>
		</div>
	</div>
{/if}
