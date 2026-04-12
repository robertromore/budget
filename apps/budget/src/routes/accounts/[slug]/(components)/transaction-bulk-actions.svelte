<script lang="ts">
import type { Table } from '@tanstack/table-core';
import type { TransactionsFormat } from '$lib/types';
import { Button } from '$lib/components/ui/button';
import * as Popover from '$lib/components/ui/popover/index.js';
import * as Command from '$lib/components/ui/command/index.js';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { bulkUpdateStatus, bulkUpdateCategoryByIds } from '$lib/query/transactions';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import Tag from '@lucide/svelte/icons/tag';
import Trash2 from '@lucide/svelte/icons/trash-2';
import X from '@lucide/svelte/icons/x';

interface Props {
  table: Table<TransactionsFormat>;
  allTransactions: TransactionsFormat[];
  accountId: number;
  onBulkDelete: (transactions: TransactionsFormat[]) => void;
}

let { table, allTransactions, accountId, onBulkDelete }: Props = $props();

const selectedRows = $derived(table.getSelectedRowModel().rows);
const selectedCount = $derived(selectedRows.length);
const selectedTransactions = $derived(selectedRows.map((row) => row.original));
// Filter out scheduled transactions (those with string IDs) but include reconciliation markers
const realTransactions = $derived(
  allTransactions.filter((t) => typeof t.id === 'number' || t.isReconciliationMarker)
);
const totalCount = $derived(realTransactions.length);
const pageRowCount = $derived(
  table
    .getRowModel()
    .rows.filter(
      (row) => typeof row.original.id === 'number' || row.original.isReconciliationMarker
    ).length
);
const allPageRowsSelected = $derived(table.getIsAllPageRowsSelected());
const canSelectAll = $derived(allPageRowsSelected && totalCount > pageRowCount);

let selectingAll = $state(false);

const selectedOrAllTransactions = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return realTransactions;
  }
  return selectedTransactions.filter((t) => typeof t.id === 'number' || t.isReconciliationMarker);
});

const displayCount = $derived.by(() => {
  if (selectingAll && allPageRowsSelected) {
    return totalCount;
  }
  return selectedTransactions.filter((t) => typeof t.id === 'number' || t.isReconciliationMarker)
    .length;
});

const selectedIds = $derived(
  selectedOrAllTransactions
    .map((t) => t.id)
    .filter((id): id is number => typeof id === 'number')
);

// Category picker state
let categoryPopoverOpen = $state(false);
let categorySearch = $state('');
const categoriesState = CategoriesState.get();
const categories = $derived(
  Array.from(categoriesState.categories.values()).filter((c) =>
    categorySearch ? (c.name ?? '').toLowerCase().includes(categorySearch.toLowerCase()) : true
  )
);

// Mutations
const bulkStatusMutation = bulkUpdateStatus.options();
const bulkCategoryMutation = bulkUpdateCategoryByIds.options();

async function handleMarkCleared() {
  if (selectedIds.length === 0 || !accountId) return;
  await bulkStatusMutation.mutateAsync({ ids: selectedIds, status: 'cleared', accountId });
  table.resetRowSelection();
  selectingAll = false;
}

async function handleSetCategory(categoryId: number | null) {
  if (selectedIds.length === 0 || !accountId) return;
  categoryPopoverOpen = false;
  categorySearch = '';
  await bulkCategoryMutation.mutateAsync({ ids: selectedIds, categoryId, accountId });
  table.resetRowSelection();
  selectingAll = false;
}

const isVisible = $derived(selectedCount > 0 && displayCount > 0);
</script>

<div
  class="pointer-events-none relative h-0"
  aria-hidden={!isVisible}>
  <div
    class="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 rounded-md border border-b-2 border-border bg-muted px-4 py-2 shadow-sm transition-all duration-150 {isVisible
      ? 'translate-y-0 opacity-100'
      : '-translate-y-1 opacity-0 pointer-events-none'}"
    data-tour-id="transactions-bulk-actions">
    <!-- Left side: count + select all -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">
        {displayCount}
        {displayCount === 1 ? 'transaction' : 'transactions'} selected
      </span>

      {#if canSelectAll && !selectingAll}
        <button
          class="text-primary text-sm font-medium underline-offset-4 hover:underline"
          onclick={() => (selectingAll = true)}>
          Select all {totalCount}
        </button>
      {/if}
      {#if selectingAll}
        <span class="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs font-medium">
          All {totalCount} selected
        </span>
        <button
          class="text-muted-foreground text-xs hover:underline"
          onclick={() => (selectingAll = false)}>
          Clear
        </button>
      {/if}
    </div>

    <!-- Right side: action buttons -->
    <div class="ml-auto flex items-center gap-1.5">
      <!-- Edit Category -->
      <Popover.Root bind:open={categoryPopoverOpen}>
        <Popover.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="outline" size="sm">
              <Tag class="mr-2 h-4 w-4" />
              Set Category
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content class="w-56 p-0" align="end">
          <Command.Root>
            <Command.Input placeholder="Search categories..." bind:value={categorySearch} />
            <Command.List>
              <Command.Empty>No categories found</Command.Empty>
              <Command.Group>
                <Command.Item value="__none__" onSelect={() => handleSetCategory(null)}>
                  <span class="text-muted-foreground italic">No category</span>
                </Command.Item>
                {#each categories as category (category.id)}
                  <Command.Item
                    value={category.name ?? undefined}
                    onSelect={() => handleSetCategory(category.id)}>
                    {#if category.categoryColor}
                      <span
                        class="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                        style="background-color: {category.categoryColor}"></span>
                    {/if}
                    {category.name}
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>

      <!-- Mark as Cleared -->
      <Button onclick={handleMarkCleared} variant="outline" size="sm">
        <CheckCircle class="mr-2 h-4 w-4" />
        Mark Cleared
      </Button>

      <!-- Delete -->
      <Button
        onclick={() => onBulkDelete(selectedOrAllTransactions)}
        variant="destructive"
        size="sm">
        <Trash2 class="mr-2 h-4 w-4" />
        Delete
      </Button>

      <!-- Clear Selection -->
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
</div>
