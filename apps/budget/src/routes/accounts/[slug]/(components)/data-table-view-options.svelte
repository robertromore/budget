<script lang="ts" generics="TData">
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import Pin from '@lucide/svelte/icons/pin';
import PinOff from '@lucide/svelte/icons/pin-off';
import type {Table} from '@tanstack/table-core';
import {buttonVariants} from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import {currentViews} from '$lib/states/views';

let {table}: {table: Table<TData>} = $props();

// Get context during component initialization
const _currentViews = currentViews.get();

function togglePinning(columnId: string) {
  const column = table.getColumn(columnId);
  if (!column) return;

  const currentPin = column.getIsPinned();

  // Cycle through: unpinned -> left -> right -> unpinned
  if (!currentPin) {
    column.pin('left');
  } else if (currentPin === 'left') {
    column.pin('right');
  } else {
    column.pin(false);
  }

  // Sync with view
  if (_currentViews?.activeView) {
    setTimeout(() => {
      _currentViews.activeView?.syncPinningFromTable();
    }, 0);
  }
}

function getPinIcon(columnId: string) {
  const column = table.getColumn(columnId);
  const pinned = column?.getIsPinned();

  if (pinned === 'left') return 'left';
  if (pinned === 'right') return 'right';
  return 'none';
}
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class={buttonVariants({
      variant: 'outline',
      size: 'sm',
      class: 'ml-auto hidden h-8 lg:flex',
    })}>
    <SlidersHorizontal class="mr-2 size-4" />
    Display
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-56">
    <DropdownMenu.Group>
      <DropdownMenu.GroupHeading>Pin columns</DropdownMenu.GroupHeading>
      <DropdownMenu.Separator />
      {#each table
        .getAllColumns()
        .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanPin()) as column}
        {@const pinState = getPinIcon(column.id)}
        <DropdownMenu.Item
          onclick={() => togglePinning(column.id)}
          class="capitalize justify-between"
          closeOnSelect={false}>
          <span>{column.id}</span>
          {#if pinState === 'left'}
            <Pin class="size-4 text-muted-foreground" />
          {:else if pinState === 'right'}
            <Pin class="size-4 text-muted-foreground rotate-90" />
          {:else}
            <PinOff class="size-4 text-muted-foreground" />
          {/if}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Group>

    <DropdownMenu.Separator />

    <DropdownMenu.Group>
      <DropdownMenu.GroupHeading>Toggle columns</DropdownMenu.GroupHeading>
      <DropdownMenu.Separator />
      {#each table
        .getAllColumns()
        .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide()) as column}
        <DropdownMenu.CheckboxItem
          bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
          class="capitalize"
          closeOnSelect={false}>
          {column.id}
        </DropdownMenu.CheckboxItem>
      {/each}
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
