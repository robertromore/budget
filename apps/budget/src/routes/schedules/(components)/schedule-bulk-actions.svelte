<script lang="ts">
import type {Schedule} from '$lib/schema/schedules';
import type {Table} from '@tanstack/table-core';
import {Button} from '$lib/components/ui/button';
import Trash2 from '@lucide/svelte/icons/trash-2';
import X from '@lucide/svelte/icons/x';

interface Props {
  table: Table<Schedule>;
  allSchedules: Schedule[];
  onBulkDelete: (schedules: Schedule[]) => void;
}

let {table, allSchedules, onBulkDelete}: Props = $props();

const selectedRows = $derived(table.getSelectedRowModel().rows);
const selectedCount = $derived(selectedRows.length);
const selectedSchedules = $derived(selectedRows.map((row) => row.original));
const totalCount = $derived(allSchedules.length);
const pageRowCount = $derived(table.getRowModel().rows.length);
const allPageRowsSelected = $derived(table.getIsAllPageRowsSelected());
const canSelectAll = $derived(allPageRowsSelected && totalCount > pageRowCount);

let selectingAll = $state(false);

const selectedOrAllSchedules = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return allSchedules;
  }
  return selectedSchedules;
});

const displayCount = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return totalCount;
  }
  return selectedCount;
});
</script>

{#if selectedCount > 0}
  <div class="bg-muted flex items-center gap-2 rounded-md border px-4 py-2">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">
        {displayCount}
        {displayCount === 1 ? 'schedule' : 'schedules'} selected
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
      <Button onclick={() => onBulkDelete(selectedOrAllSchedules)} variant="destructive" size="sm">
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
