<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { formatShortDate } from '$lib/utils/date-formatters';
import { currencyFormatter } from '$lib/utils/formatters';
import Receipt from '@lucide/svelte/icons/receipt';

let { config }: { config: DashboardWidget } = $props();

// Per-size row count. The user's explicit `limit` setting (from the
// settings dialog) wins so power users can override.
const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const limit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 1;
    case 'large':
      return 10;
    case 'full':
      return 15;
    default:
      return 5;
  }
});

const txQuery = $derived(
  rpc.transactions
    .getTransactionsList({ sortBy: 'date', sortOrder: 'desc' }, { page: 0, pageSize: limit })
    .options()
);
const transactions = $derived((txQuery.data as any)?.transactions ?? []);
const isLoading = $derived(txQuery.isLoading);
</script>

{#if isLoading}
  <div class="space-y-2">
    {#each Array(Math.min(limit, 5)) as _}
      <div class="bg-muted h-8 animate-pulse rounded"></div>
    {/each}
  </div>
{:else if transactions.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-4">
    <Receipt class="text-muted-foreground h-8 w-8"></Receipt>
    <p class="text-muted-foreground text-sm">No transactions yet</p>
  </div>
{:else}
  <div class="space-y-1.5">
    {#each transactions as tx}
      <div class="flex items-center justify-between gap-2 rounded px-1 py-1">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">{tx.payeeName ?? tx.notes ?? 'Unknown'}</div>
          <div class="text-muted-foreground text-xs">
            {formatShortDate(new Date(tx.date))}
            {#if (config.size === 'large' || config.size === 'full') && tx.categoryName}
              · {tx.categoryName}
            {/if}
            {#if config.size === 'full' && tx.accountName}
              · {tx.accountName}
            {/if}
          </div>
        </div>
        <span
          class="shrink-0 text-sm font-medium tabular-nums"
          class:text-amount-positive={tx.amount > 0}
          class:text-amount-negative={tx.amount < 0}
          class:text-muted-foreground={tx.amount === 0}>
          {currencyFormatter.format(tx.amount)}
        </span>
      </div>
    {/each}
  </div>
{/if}
