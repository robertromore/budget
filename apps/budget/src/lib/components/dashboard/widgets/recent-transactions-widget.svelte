<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { formatShortDate } from '$lib/utils/date-formatters';
import Receipt from '@lucide/svelte/icons/receipt';

let { config }: { config: DashboardWidget } = $props();

const limit = $derived((config.settings as any)?.limit ?? 10);

const txQuery = $derived(
  rpc.transactions.getTransactionsList(
    { sortBy: 'date', sortOrder: 'desc' },
    { page: 0, pageSize: limit }
  ).options()
);
const transactions = $derived((txQuery.data as any)?.transactions ?? []);
const isLoading = $derived(txQuery.isLoading);
</script>

{#if isLoading}
  <div class="space-y-2">
    {#each Array(5) as _}
      <div class="bg-muted h-8 animate-pulse rounded"></div>
    {/each}
  </div>
{:else if transactions.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-4">
    <Receipt class="text-muted-foreground h-8 w-8" />
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
          </div>
        </div>
        <span
          class="shrink-0 text-sm font-medium"
          class:text-green-600={tx.amount > 0}
          class:text-red-600={tx.amount < 0}>
          {currencyFormatter.format(tx.amount)}
        </span>
      </div>
    {/each}
  </div>
{/if}
