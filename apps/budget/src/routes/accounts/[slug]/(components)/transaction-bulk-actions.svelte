<script lang="ts">
import type {Transaction} from '$lib/schema';
import type {Table} from '@tanstack/table-core';
import type {TransactionsFormat} from '$lib/types';
import {Button} from '$lib/components/ui/button';
import Trash2 from '@lucide/svelte/icons/trash-2';
import X from '@lucide/svelte/icons/x';

interface Props {
  table: Table<TransactionsFormat>;
  allTransactions: TransactionsFormat[];
  onBulkDelete: (transactions: TransactionsFormat[]) => void;
}

let {table, allTransactions, onBulkDelete}: Props = $props();

const selectedRows = $derived(table.getSelectedRowModel().rows);
const selectedCount = $derived(selectedRows.length);
const selectedTransactions = $derived(selectedRows.map((row) => row.original));
// Filter out scheduled transactions (those with string IDs)
const realTransactions = $derived(allTransactions.filter((t) => typeof t.id === 'number'));
const totalCount = $derived(realTransactions.length);
const pageRowCount = $derived(
  table.getRowModel().rows.filter((row) => typeof row.original.id === 'number').length
);
const allPageRowsSelected = $derived(table.getIsAllPageRowsSelected());
const canSelectAll = $derived(allPageRowsSelected && totalCount > pageRowCount);

let selectingAll = $state(false);

const selectedOrAllTransactions = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return realTransactions;
  }
  // Filter out scheduled transactions from selected (string IDs)
  return selectedTransactions.filter((t) => typeof t.id === 'number');
});

const displayCount = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return totalCount;
  }
  // Only count real transactions (exclude scheduled ones with string IDs)
  return selectedTransactions.filter((t) => typeof t.id === 'number').length;
});
</script>

{#if selectedCount > 0 && displayCount > 0}
  <div class="bg-muted flex items-center gap-2 rounded-md border px-4 py-2">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">
        {displayCount}
        {displayCount === 1 ? 'transaction' : 'transactions'} selected
      </span>

      {#if canSelectAll}
        <Button
          variant={selectingAll ? 'default' : 'outline'}
          size="sm"
          class="h-7 px-3 text-xs font-medium"
          onclick={() => (selectingAll = !selectingAll)}>
          {selectingAll ? `All pages (${totalCount})` : `This page (${pageRowCount})`}
        </Button>
      {/if}
    </div>

    <div class="ml-auto flex items-center gap-2">
      <Button
        onclick={() => onBulkDelete(selectedOrAllTransactions)}
        variant="destructive"
        size="sm">
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
        aria-label="Clear selection">
        <X class="h-4 w-4" />
      </Button>
    </div>
  </div>
{/if}
