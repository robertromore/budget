<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import type { TransactionsFormat } from '$lib/types';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import ArrowRight from '@lucide/svelte/icons/arrow-right';

interface Props {
  transaction: TransactionsFormat;
}

let { transaction }: Props = $props();

// Determine direction based on amount sign
// Negative amount = money leaving this account (outgoing transfer)
// Positive amount = money coming into this account (incoming transfer)
const isOutgoing = $derived(transaction.amount < 0);
const accountName = $derived(transaction.transferAccountName || 'Unknown Account');
const accountSlug = $derived(transaction.transferAccountSlug);

function navigateToAccount() {
  if (accountSlug) {
    goto(`/accounts/${accountSlug}`);
  }
}
</script>

<Button
  variant="ghost"
  size="sm"
  class="h-8 justify-start gap-1.5 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/50"
  onclick={navigateToAccount}
  disabled={!accountSlug}>
  {#if isOutgoing}
    <ArrowRight class="h-3.5 w-3.5 shrink-0" />
  {:else}
    <ArrowLeft class="h-3.5 w-3.5 shrink-0" />
  {/if}
  <span class="truncate">{accountName}</span>
</Button>
