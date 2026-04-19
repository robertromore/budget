<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { formatShortDate } from '$lib/utils/date-formatters';
import { currencyFormatter } from '$lib/utils/formatters';
import ArrowDownRight from '@lucide/svelte/icons/arrow-down-right';
import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
import Receipt from '@lucide/svelte/icons/receipt';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const limit = $derived((config.settings as any)?.limit ?? 8);
const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const txQuery = $derived(
  rpc.transactions
    .getTransactionsList(
      { sortBy: 'date', sortOrder: 'desc' },
      { page: 0, pageSize: limit }
    )
    .options()
);
const transactions = $derived((txQuery.data as any)?.transactions ?? []);
const isLoading = $derived(txQuery.isLoading);
</script>

<div class="overflow-hidden rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-3 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Receipt class="h-3.5 w-3.5 {p.iconFg}" />
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Recent activity'}
    </span>
  </div>

  {#if isLoading}
    <div class="space-y-2">
      {#each Array(4) as _}
        <div class="bg-muted h-10 animate-pulse rounded-lg"></div>
      {/each}
    </div>
  {:else if transactions.length === 0}
    <p class="text-muted-foreground py-6 text-center text-sm">No transactions yet</p>
  {:else}
    <div class="space-y-1.5">
      {#each transactions as tx}
        {@const iconBg =
          tx.amount > 0
            ? 'bg-emerald-500/15 text-emerald-600'
            : tx.amount < 0
              ? 'bg-rose-500/15 text-rose-600'
              : 'bg-muted text-muted-foreground'}
        <div class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors {p.rowHover}">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {iconBg}">
            {#if tx.amount > 0}
              <ArrowDownRight class="h-4 w-4" />
            {:else if tx.amount < 0}
              <ArrowUpRight class="h-4 w-4" />
            {:else}
              <Receipt class="h-3.5 w-3.5" />
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">
              {tx.payeeName ?? tx.notes ?? 'Unknown'}
            </div>
            <div class="text-muted-foreground text-xs">
              {formatShortDate(new Date(tx.date))}
            </div>
          </div>
          <span
            class="shrink-0 text-sm font-semibold tabular-nums"
            class:text-amount-positive={tx.amount > 0}
            class:text-amount-negative={tx.amount < 0}
            class:text-muted-foreground={tx.amount === 0}>
            {tx.amount > 0 ? '+' : ''}{currencyFormatter.format(tx.amount)}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
