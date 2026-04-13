<script lang="ts">
import type { TransactionsFormat } from '$lib/types';
import { Badge } from '$lib/components/ui/badge';
import { currencyFormatter } from '$lib/utils/formatters';
import { cn } from '$lib/utils';
import { getLocalTimeZone } from '@internationalized/date';
import TransactionDetailSheet from './transaction-detail-sheet.svelte';

interface Props {
  transactions: TransactionsFormat[];
}

let { transactions }: Props = $props();

let openTransactionId = $state<number | null>(null);
let sheetOpen = $state(false);

function handleCardTap(transaction: TransactionsFormat) {
  if (transaction.status === 'scheduled') return;
  if (transaction.isReconciliationMarker) return;
  if (typeof transaction.id !== 'number') return;
  openTransactionId = transaction.id;
  sheetOpen = true;
}

function formatCardDate(transaction: TransactionsFormat): string {
  if (!transaction.date) return '—';
  try {
    return transaction.date.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getAmountClass(amount: number): string {
  if (amount < 0) return 'text-amount-negative';
  if (amount > 0) return 'text-amount-positive';
  return '';
}
</script>

<div class="space-y-2">
  {#each transactions as transaction (transaction.id)}
    {@const isScheduled = transaction.status === 'scheduled'}
    {@const isReconciliationMarker = transaction.isReconciliationMarker}
    {@const isTappable = !isScheduled && !isReconciliationMarker && typeof transaction.id === 'number'}

    <button
      type="button"
      class={cn(
        'bg-card w-full border rounded-lg px-4 py-3 flex items-center gap-3 text-left',
        isTappable ? 'cursor-pointer hover:bg-accent/30 active:bg-accent/50' : 'cursor-default',
        transaction.isTransfer && 'border-l-2 border-l-info bg-info-bg/30',
        transaction.isArchived && 'opacity-60',
        isReconciliationMarker && 'border-l-4 border-l-success bg-success-bg'
      )}
      onclick={() => { if (isTappable) handleCardTap(transaction); }}>
      <!-- Date -->
      <div class="text-muted-foreground w-12 shrink-0 text-xs">
        {formatCardDate(transaction)}
      </div>

      <!-- Payee + Category -->
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium">
          {#if isReconciliationMarker}
            {transaction.markerType === 'reconciliation' ? '✓ Reconciliation' : '◆ Balance Reset'}
          {:else if transaction.payee?.name}
            {transaction.payee.name}
          {:else}
            <span class="text-muted-foreground">No payee</span>
          {/if}
        </div>
        {#if transaction.category?.name && !isReconciliationMarker}
          <div class="text-muted-foreground mt-0.5 truncate text-xs">
            {transaction.category.name}
          </div>
        {/if}
      </div>

      <!-- Status + Amount -->
      <div class="flex shrink-0 flex-col items-end gap-1">
        <div class={cn('text-sm font-semibold tabular-nums', getAmountClass(transaction.amount ?? 0))}>
          {currencyFormatter.format(transaction.amount ?? 0)}
        </div>
        {#if isScheduled}
          <Badge variant="secondary" class="h-4 px-1 text-[10px]">Scheduled</Badge>
        {:else if transaction.status === 'pending'}
          <Badge variant="outline" class="h-4 px-1 text-[10px]">Pending</Badge>
        {/if}
      </div>
    </button>
  {:else}
    <div class="text-muted-foreground py-12 text-center text-sm">No transactions</div>
  {/each}
</div>

{#if openTransactionId !== null}
  <TransactionDetailSheet id={openTransactionId} bind:open={sheetOpen} />
{/if}
