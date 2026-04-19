<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const limit = $derived((config.settings as any)?.limit ?? 12);

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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

function padRight(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

function padLeft(s: string, n: number): string {
  if (s.length >= n) return s;
  return ' '.repeat(n - s.length) + s;
}

function formatRow(tx: { date: string; payeeName?: string; notes?: string; amount: number }): string {
  const date = formatDateShort(tx.date);
  const name = padRight(tx.payeeName ?? tx.notes ?? 'unknown', 20);
  const amount = padLeft(currencyFormatter.format(tx.amount), 12);
  return `${date}  ${name}  ${amount}`;
}
</script>

<div class="widget-terminal text-[11px]">
  <div class="mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || 'TX.TAPE'}</span>
    <span class="widget-terminal-faint text-[10px]">{transactions.length} ROWS</span>
  </div>

  {#if isLoading}
    <div class="space-y-1">
      {#each Array(5) as _}
        <div class="h-3.5 animate-pulse rounded bg-(--term-bg-soft)"></div>
      {/each}
    </div>
  {:else if transactions.length === 0}
    <div class="widget-terminal-muted py-6 text-center text-[10px]">
      &gt; no.recent.transactions
    </div>
  {:else}
    <div class="space-y-0.5 leading-relaxed tabular-nums">
      <div class="widget-terminal-muted text-[10px] uppercase">
        {padRight('DATE', 6)}{padRight('PAYEE', 22)}{padLeft('AMOUNT', 12)}
      </div>
      {#each transactions as tx}
        <div class="flex gap-0.5">
          <span class="widget-terminal-dim">{formatDateShort(tx.date)}</span>
          <span class="widget-terminal-faint">&nbsp;</span>
          <span class="flex-1 truncate">{tx.payeeName ?? tx.notes ?? 'unknown'}</span>
          <span
            class:widget-terminal-bright={tx.amount > 0}
            class:widget-terminal-neg={tx.amount < 0}
            class:widget-terminal-faint={tx.amount === 0}>
            {tx.amount > 0 ? '+' : ''}{currencyFormatter.format(tx.amount)}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
