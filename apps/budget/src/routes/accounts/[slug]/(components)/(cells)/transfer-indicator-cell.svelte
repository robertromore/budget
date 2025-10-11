<script lang="ts">
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import {Badge} from '$lib/components/ui/badge';
import type {TransactionsFormat} from '$lib/types';

let {transaction} = $props<{transaction: TransactionsFormat}>();

const isTransfer = $derived((transaction as any).isTransfer === true);
const transferAccountId = $derived((transaction as any).transferAccountId);
</script>

{#if isTransfer}
  <div class="flex items-center gap-2">
    <Badge variant="outline" class="flex items-center gap-1 text-xs border-blue-600/30 text-blue-600 dark:text-blue-400">
      <ArrowRightLeft class="h-3 w-3"></ArrowRightLeft>
      <span>Transfer</span>
    </Badge>
    {#if transferAccountId}
      <span class="text-xs text-muted-foreground">Account #{transferAccountId}</span>
    {/if}
  </div>
{/if}
