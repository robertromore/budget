<script lang="ts" generics="TData, TValue">
import EyeNone from '@lucide/svelte/icons/eye-off';
import ArrowDown from '@lucide/svelte/icons/arrow-down';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import type {HTMLAttributes} from 'svelte/elements';
import type {Column, Table} from '@tanstack/table-core';
import type {WithoutChildren} from 'bits-ui';
import {cn} from '$lib/utils';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import Button, {buttonVariants} from '$lib/components/ui/button/button.svelte';

interface Props extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  table: Table<TData>;
  title: string;
}

let {column, table, class: className, title, ...restProps}: WithoutChildren<Props> = $props();

const specialColumns = ['select-col', 'expand-contract-col', 'actions', 'transfer'];

function getNormalizedColumnOrder<T>(table: Table<T>) {
  const leafColumns = table.getAllLeafColumns();
  const existingColumnIds = new Set(leafColumns.map((col) => col.id));
  const stateOrder = table.getState().columnOrder ?? [];
  const normalized: string[] = [];

  for (const id of stateOrder) {
    if (existingColumnIds.has(id) && !normalized.includes(id)) {
      normalized.push(id);
    }
  }

  for (const col of leafColumns) {
    if (!normalized.includes(col.id)) {
      normalized.push(col.id);
    }
  }

  return normalized;
}

// Get the visible column order (excluding special columns)
const visibleColumnOrder = $derived.by(() => {
  // Establish reactive dependencies on table state to ensure this derived re-computes
  // when the table's column order or visibility changes
  const _ = table.getState().columnOrder;
  const __ = table.getState().columnVisibility;

  const normalizedOrder = getNormalizedColumnOrder(table);
  if (normalizedOrder.length === 0) {
    return [];
  }

  const visibleIds = new Set(
    table
      .getVisibleLeafColumns()
      .filter((col) => !specialColumns.includes(col.id))
      .map((col) => col.id)
  );

  if (visibleIds.size === 0) {
    return [];
  }

  const orderedVisible = normalizedOrder.filter((id) => visibleIds.has(id));
  if (orderedVisible.length > 0) {
    return orderedVisible;
  }

  return table
    .getVisibleLeafColumns()
    .filter((col) => !specialColumns.includes(col.id))
    .map((col) => col.id);
});

// Check if column can move left or right
const canMoveLeft = $derived.by(() => {
  if (visibleColumnOrder.length === 0) return false;
  const currentIndex = visibleColumnOrder.indexOf(column.id);
  return currentIndex > 0;
});

const canMoveRight = $derived.by(() => {
  if (visibleColumnOrder.length === 0) return false;
  const currentIndex = visibleColumnOrder.indexOf(column.id);
  return currentIndex >= 0 && currentIndex < visibleColumnOrder.length - 1;
});

// Move column left in the order
function moveLeft() {
  const currentPosition = visibleColumnOrder.indexOf(column.id);
  if (currentPosition <= 0) {
    return;
  }

  const targetId = visibleColumnOrder[currentPosition - 1];
  if (!targetId) {
    return;
  }

  const normalizedOrder = getNormalizedColumnOrder(table);
  const fromIndex = normalizedOrder.indexOf(column.id);
  const targetIndex = normalizedOrder.indexOf(targetId);

  if (fromIndex < 0 || targetIndex < 0) {
    return;
  }

  const newOrder = [...normalizedOrder];
  newOrder.splice(fromIndex, 1);
  newOrder.splice(targetIndex, 0, column.id);

  table.setColumnOrder(newOrder);
}

// Move column right in the order
function moveRight() {
  const currentPosition = visibleColumnOrder.indexOf(column.id);
  if (currentPosition < 0 || currentPosition >= visibleColumnOrder.length - 1) {
    return;
  }

  const targetId = visibleColumnOrder[currentPosition + 1];
  if (!targetId) {
    return;
  }

  const normalizedOrder = getNormalizedColumnOrder(table);
  const fromIndex = normalizedOrder.indexOf(column.id);
  const targetIndex = normalizedOrder.indexOf(targetId);

  if (fromIndex < 0 || targetIndex < 0) {
    return;
  }

  const newOrder = [...normalizedOrder];
  newOrder.splice(fromIndex, 1);
  newOrder.splice(targetIndex, 0, column.id);

  table.setColumnOrder(newOrder);
}
</script>

{#if !column?.getCanSort() && !column?.getCanHide()}
  <div class={cn(buttonVariants({variant: 'ghost', size: 'sm'}), className)} {...restProps}>
    {title}
  </div>
{:else}
  <div class={cn('flex items-center', className)} {...restProps}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({props})}
          <Button
            {...props}
            variant="ghost"
            size="sm"
            class="data-[state=open]:bg-accent -ml-3 h-8">
            <span>
              {title}
            </span>
            {#if column.getCanSort()}
              {#if column.getIsSorted() === 'desc'}
                <ArrowDown class="ml-2 size-4" />
              {:else if column.getIsSorted() === 'asc'}
                <ArrowUp class="ml-2 size-4" />
              {:else}
                <ArrowUpDown class="ml-2 size-4" />
              {/if}
            {/if}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        {#if column.getCanSort()}
          <DropdownMenu.Item onclick={() => column.toggleSorting(false)}>
            <ArrowUp class="text-muted-foreground/70 mr-2 size-3.5" />
            Asc
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => column.toggleSorting(true)}>
            <ArrowDown class="text-muted-foreground/70 mr-2 size-3.5" />
            Desc
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
        {/if}
        <DropdownMenu.Item onclick={moveLeft} disabled={!canMoveLeft}>
          <ChevronLeft class="text-muted-foreground/70 mr-2 size-3.5" />
          Move left
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={moveRight} disabled={!canMoveRight}>
          <ChevronRight class="text-muted-foreground/70 mr-2 size-3.5" />
          Move right
        </DropdownMenu.Item>
        {#if column.getCanHide()}
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => column.toggleVisibility(false)}>
            <EyeNone class="text-muted-foreground/70 mr-2 size-3.5" />
            Hide
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
{/if}
