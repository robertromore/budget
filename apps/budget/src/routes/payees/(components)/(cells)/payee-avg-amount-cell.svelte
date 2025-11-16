<script lang="ts">
import {currencyFormatter} from '$lib/utils';

interface Props {
  avgAmount: number | null;
}

let {avgAmount}: Props = $props();
</script>

{#if avgAmount}
  <span class="font-medium">{currencyFormatter.format(avgAmount)}</span>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
