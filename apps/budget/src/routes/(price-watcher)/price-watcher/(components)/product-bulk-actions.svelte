<script lang="ts">
import type { Table } from '@tanstack/table-core';
import type { PriceProduct } from '$core/schema/price-products';
import { Button } from '$lib/components/ui/button';
import {
  bulkDeleteProducts,
  bulkUpdateStatus,
  bulkCheckPrices,
} from '$lib/query/price-watcher';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Pause from '@lucide/svelte/icons/pause';
import Play from '@lucide/svelte/icons/play';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import X from '@lucide/svelte/icons/x';

interface Props {
  table: Table<PriceProduct>;
  allProducts: PriceProduct[];
}

let { table, allProducts }: Props = $props();

const selectedRows = $derived(table.getSelectedRowModel().rows);
const selectedCount = $derived(selectedRows.length);
const selectedIds = $derived(selectedRows.map((r) => r.original.id));

const hasMultiplePages = $derived(table.getPageCount() > 1);
const allPageRowsSelected = $derived(table.getIsAllPageRowsSelected());
const canSelectAll = $derived(allPageRowsSelected && hasMultiplePages);
let selectingAll = $state(false);

const idsToActOn = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return allProducts.map((p) => p.id);
  }
  return selectedIds;
});

const displayCount = $derived(
  selectingAll && allPageRowsSelected ? allProducts.length : selectedCount
);

const deleteMut = bulkDeleteProducts.options();
const statusMut = bulkUpdateStatus.options();
const checkMut = bulkCheckPrices.options();

const isAnyPending = $derived(
  deleteMut.isPending || statusMut.isPending || checkMut.isPending
);

async function handleDelete() {
  try {
    await deleteMut.mutateAsync({ ids: idsToActOn });
    clearSelection();
  } catch {}
}

async function handlePause() {
  try {
    await statusMut.mutateAsync({ ids: idsToActOn, status: 'paused' });
    clearSelection();
  } catch {}
}

async function handleActivate() {
  try {
    await statusMut.mutateAsync({ ids: idsToActOn, status: 'active' });
    clearSelection();
  } catch {}
}

async function handleCheckNow() {
  try {
    await checkMut.mutateAsync({ ids: idsToActOn });
    clearSelection();
  } catch {}
}

function clearSelection() {
  table.resetRowSelection();
  selectingAll = false;
}
</script>

{#if selectedCount > 0}
  <!-- Offset: app rail (3rem) + sidebar (16rem) = 19rem on md+ screens -->
  <div class="bg-muted fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-md border px-4 py-2 shadow-lg md:left-[calc(19rem+((100%-19rem)/2))]">
    <span class="text-sm font-medium">
      {displayCount} {displayCount === 1 ? 'product' : 'products'} selected
    </span>

    {#if canSelectAll}
      <Button
        variant={selectingAll ? 'default' : 'outline'}
        size="sm"
        class="h-7 px-3 text-xs"
        onclick={() => (selectingAll = !selectingAll)}>
        {selectingAll ? `All (${allProducts.length})` : `This page`}
      </Button>
    {/if}

    <div class="ml-auto flex flex-wrap items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onclick={handleCheckNow}
        disabled={isAnyPending}>
        <RefreshCw class="mr-1.5 h-3.5 w-3.5 {checkMut.isPending ? 'animate-spin' : ''}" />
        Check Now
      </Button>
      <Button
        variant="outline"
        size="sm"
        onclick={handlePause}
        disabled={isAnyPending}>
        <Pause class="mr-1.5 h-3.5 w-3.5" />
        Pause
      </Button>
      <Button
        variant="outline"
        size="sm"
        onclick={handleActivate}
        disabled={isAnyPending}>
        <Play class="mr-1.5 h-3.5 w-3.5" />
        Activate
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onclick={handleDelete}
        disabled={isAnyPending}>
        <Trash2 class="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        onclick={clearSelection}
        aria-label="Clear selection">
        <X class="h-4 w-4" />
      </Button>
    </div>
  </div>
{/if}
