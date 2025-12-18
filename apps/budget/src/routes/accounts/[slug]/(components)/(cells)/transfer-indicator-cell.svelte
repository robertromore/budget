<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import type { TransactionsFormat } from '$lib/types';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';

let { transaction } = $props<{ transaction: TransactionsFormat }>();

const isTransfer = $derived((transaction as any).isTransfer === true);
const transferAccountId = $derived((transaction as any).transferAccountId);
</script>

{#if isTransfer}
  <div class="flex items-center gap-2">
    <Badge
      variant="outline"
      class="flex items-center gap-1 border-blue-600/30 text-xs text-blue-600 dark:text-blue-400">
      <ArrowRightLeft class="h-3 w-3"></ArrowRightLeft>
      <span>Transfer</span>
    </Badge>
    {#if transferAccountId}
      <span class="text-muted-foreground text-xs">Account #{transferAccountId}</span>
    {/if}
  </div>
{/if}
