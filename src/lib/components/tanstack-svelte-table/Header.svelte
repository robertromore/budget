<script lang="ts">
  import { cn } from '$lib/utils';
  import Button from '../ui/button/button.svelte';
  import type { Header } from './index';
  type Props = {
    label?: string
    header: Header
  }
  const { label, header }: Props = $props()
</script>

<Button
  variant="ghost"
  class={cn(header.column.getCanSort() ? 'cursor-pointer select-none' : '')}
  on:click={header.column.getToggleSortingHandler()}
>
  {label ?? header.column.id}
  {#if header.column.getCanSort()}
    {#if header.column.getIsSorted().toString() === 'asc'}
      <span class="ml-2 size-4 icon-[lucide--arrow-up]"/>
    {:else if header.column.getIsSorted().toString() === 'desc'}
      <span class="ml-2 size-4 icon-[lucide--arrow-down]"/>
    {:else}
      <span class="ml-2 size-4 icon-[lucide--arrow-down-up]"/>
    {/if}
  {/if}
</Button>

