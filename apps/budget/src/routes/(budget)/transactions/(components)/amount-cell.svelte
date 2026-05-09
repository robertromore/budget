<script lang="ts">
import { currencyFormatter } from '$lib/utils/formatters';

interface Props {
  amount: number | null | undefined;
}

let { amount }: Props = $props();

const colorClass = $derived(
  amount === null || amount === undefined || amount === 0
    ? 'text-muted-foreground'
    : amount > 0
      ? 'text-amount-positive'
      : 'text-amount-negative'
);
</script>

{#if amount === null || amount === undefined}
  <span class="text-muted-foreground tabular-nums">—</span>
{:else}
  <span class={`font-medium tabular-nums ${colorClass}`}>
    {currencyFormatter.format(amount)}
  </span>
{/if}
