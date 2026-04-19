<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const limit = $derived((config.settings as any)?.limit ?? 8);

const categoriesQuery = $derived(rpc.transactions.getWorkspaceTopCategories(limit).options());
const categories = $derived(
  ((categoriesQuery.data ?? []) as Array<{
    categoryName: string;
    totalAmount: number;
    transactionCount: number;
  }>).map((c) => ({
    name: c.categoryName ?? 'Uncategorized',
    amount: Math.abs(Number(c.totalAmount) || 0),
    count: Number(c.transactionCount) || 0,
  }))
);
const isLoading = $derived(categoriesQuery.isLoading);

const total = $derived(categories.reduce((s, c) => s + c.amount, 0));
const maxAmount = $derived(categories.length > 0 ? Math.max(...categories.map((c) => c.amount)) : 0);

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

function padRight(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

function bar(pct: number): string {
  const filled = Math.min(Math.round(pct / 10), 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
</script>

<div class="widget-terminal">
  <div class="mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || 'CAT.SPEND'}</span>
    <span class="widget-terminal-faint text-[10px]">TOTAL {compactCurrency(total)}</span>
  </div>

  {#if isLoading}
    <div class="space-y-1.5">
      {#each Array(4) as _}
        <div class="h-4 animate-pulse rounded bg-(--term-bg-soft)"></div>
      {/each}
    </div>
  {:else if categories.length === 0}
    <div class="widget-terminal-muted py-6 text-center text-[10px]">
      &gt; no.spending.data
    </div>
  {:else}
    <div class="space-y-1 text-[11px] tabular-nums">
      <div class="widget-terminal-muted text-[10px] uppercase">
        {padRight('CATEGORY', 18)}[&nbsp;&nbsp;&nbsp;SHARE&nbsp;&nbsp;&nbsp;]&nbsp;&nbsp;AMOUNT
      </div>
      {#each categories as cat}
        {@const pct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0}
        <div class="flex items-center gap-1.5">
          <span class="widget-terminal-bright shrink-0">{padRight(cat.name, 18)}</span>
          <span class="widget-terminal-faint shrink-0">[</span>
          <span class="widget-terminal-bright shrink-0">{bar(pct)}</span>
          <span class="widget-terminal-faint shrink-0">]</span>
          <span class="widget-terminal-pos ml-auto shrink-0">
            {compactCurrency(cat.amount)}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
