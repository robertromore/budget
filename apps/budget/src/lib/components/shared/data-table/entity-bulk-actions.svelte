<script lang="ts" generics="TEntity">
import type { Table } from '@tanstack/table-core';
import { Button } from '$lib/components/ui/button';
import Trash2 from '@lucide/svelte/icons/trash-2';
import X from '@lucide/svelte/icons/x';

interface Props {
  table: Table<TEntity>;
  allEntities: TEntity[];
  onBulkDelete: (entities: TEntity[]) => void;
  entityName: string;
  entityNamePlural?: string;
}

let { table, allEntities, onBulkDelete, entityName, entityNamePlural }: Props = $props();

const selectedRows = $derived(table.getSelectedRowModel().rows);
const selectedCount = $derived(selectedRows.length);
const selectedEntities = $derived(selectedRows.map(row => row.original));
const totalCount = $derived(allEntities.length);
const pageRowCount = $derived(table.getRowModel().rows.length);
const allPageRowsSelected = $derived(table.getIsAllPageRowsSelected());
const hasMultiplePages = $derived(table.getPageCount() > 1);
const canSelectAll = $derived(allPageRowsSelected && hasMultiplePages);

let selectingAll = $state(false);

const selectedOrAllEntities = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return allEntities;
  }
  return selectedEntities;
});

const displayCount = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return totalCount;
  }
  return selectedCount;
});

const pluralName = $derived(entityNamePlural ?? `${entityName}s`);
</script>

{#if selectedCount > 0}
  <div class="flex items-center gap-2 rounded-md border bg-muted px-4 py-2">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">
        {displayCount} {displayCount === 1 ? entityName : pluralName} selected
      </span>

      {#if canSelectAll}
        <Button
          variant={selectingAll ? "default" : "outline"}
          size="sm"
          class="h-7 px-3 text-xs font-medium"
          onclick={() => selectingAll = !selectingAll}
        >
          {selectingAll ? `All pages (${totalCount})` : `This page (${pageRowCount})`}
        </Button>
      {/if}
    </div>

    <div class="ml-auto flex items-center gap-2">
      <Button
        onclick={() => onBulkDelete(selectedOrAllEntities)}
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
