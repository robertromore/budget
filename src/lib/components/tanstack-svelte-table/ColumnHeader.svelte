<script lang="ts" generics="TValue">
  import { cn } from '$lib/utils';
    import type { TransactionsFormat } from '../types';
  import Button from '../ui/button/button.svelte';
  import type { Header } from './index';
  type Props = {
    label?: string
    header: Header<TransactionsFormat, TValue>
  }
  const { label, header }: Props = $props()
</script>

{label ?? header.column.id}

{#if header.column.getCanSort()}
  <Button
    variant="ghost"
    class={cn('cursor-pointer select-none px-2 py-0')}
    on:click={header.column.getToggleSortingHandler()}
  >
    {#if header.column.getIsSorted().toString() === 'asc'}
      <span class="size-4 icon-[lucide--arrow-up]"></span>
    {:else if header.column.getIsSorted().toString() === 'desc'}
      <span class="size-4 icon-[lucide--arrow-down]"></span>
    {:else}
      <span class="size-4 icon-[lucide--arrow-down-up]"></span>
    {/if}
  </Button>
{/if}

{#if header.column.getCanFilter()}
  <Button
    variant="ghost"
    class={cn('cursor-pointer select-none px-2 py-0')}
  >
    <span class="size-4 icon-[lucide--filter]"></span>
  </Button>
{/if}
