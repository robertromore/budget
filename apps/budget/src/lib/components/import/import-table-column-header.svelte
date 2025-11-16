<script lang="ts">
import {Button} from '$lib/components/ui/button';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import ArrowDown from '@lucide/svelte/icons/arrow-down';
import type {Column} from '@tanstack/table-core';
import type {ImportRow} from '$lib/types/import';

interface Props {
  column: Column<ImportRow, unknown>;
  label: string;
}

let {column, label}: Props = $props();

const isSorted = $derived(column.getIsSorted());
</script>

<Button
  variant="ghost"
  onclick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
  class="h-8 px-2">
  {label}
  {#if isSorted === 'asc'}
    <ArrowUp class="ml-2 h-4 w-4" />
  {:else if isSorted === 'desc'}
    <ArrowDown class="ml-2 h-4 w-4" />
  {:else}
    <ArrowUpDown class="ml-2 h-4 w-4" />
  {/if}
</Button>
