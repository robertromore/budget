<script lang="ts">
import { currencyFormatter } from '$lib/utils/formatters';
import DollarSign from '@lucide/svelte/icons/dollar-sign';

interface Props {
  min: number | null;
  max: number | null;
}

let { min, max }: Props = $props();
</script>

{#if min || max}
  <div class="flex items-center gap-1 text-sm">
    <DollarSign class="text-muted-foreground h-3 w-3" />
    {#if min && max}
      <span>{currencyFormatter.format(min)} - {currencyFormatter.format(max)}</span>
    {:else if min}
      <span>Min: {currencyFormatter.format(min)}</span>
    {:else if max}
      <span>Max: {currencyFormatter.format(max)}</span>
    {/if}
  </div>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
