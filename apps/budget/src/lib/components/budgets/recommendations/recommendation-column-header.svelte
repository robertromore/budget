<script lang="ts" generics="TData, TValue">
import type {Column} from '@tanstack/table-core';
import {Button} from '$lib/components/ui/button';
import {ArrowDown, ArrowUp, ChevronsUpDown} from '@lucide/svelte/icons';

interface Props {
  column: Column<TData, TValue>;
  title: string;
}

let {column, title}: Props = $props();
</script>

<Button
  variant="ghost"
  onclick={() => {
    const isSorted = column.getIsSorted();
    if (isSorted === 'asc') {
      column.toggleSorting(true);
    } else if (isSorted === 'desc') {
      column.clearSorting();
    } else {
      column.toggleSorting(false);
    }
  }}
  class="data-[state=open]:bg-accent -ml-3 h-8">
  <span>{title}</span>
  {#if column.getIsSorted() === 'desc'}
    <ArrowDown class="ml-2 h-4 w-4" />
  {:else if column.getIsSorted() === 'asc'}
    <ArrowUp class="ml-2 h-4 w-4" />
  {:else}
    <ChevronsUpDown class="ml-2 h-4 w-4" />
  {/if}
</Button>
