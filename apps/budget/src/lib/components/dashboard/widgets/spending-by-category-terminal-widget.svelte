<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const limit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 1;
    case 'large':
      return 7;
    case 'full':
      return 12;
    default:
      return 4;
  }
});

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

function bar(pct: number, width = 10): string {
  const filled = Math.min(Math.round((pct / 100) * width), width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
</script>

<div class="widget-terminal">
  <div class="mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || 'CAT.SPEND'}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[10px]">TOTAL {compactCurrency(total)}</span>
    {/if}
  </div>

  {#if isLoading}
    <div class="space-y-1.5">
      {#each Array(Math.min(limit, 4)) as _}
        <div class="h-4 animate-pulse rounded bg-(--term-bg-soft)"></div>
      {/each}
    </div>
  {:else if categories.length === 0}
    <div class="widget-terminal-muted py-6 text-center text-[10px]">
      &gt; no.spending.data
    </div>
  {:else if config.size === 'small'}
    {@const top = categories[0]!}
    <div class="text-[11px] tabular-nums">
      <span class="widget-terminal-bright">{padRight(top.name, 18)}</span>
      <span class="widget-terminal-pos ml-2">{compactCurrency(top.amount)}</span>
    </div>
  {:else}
    <div class="space-y-1 text-[11px] tabular-nums">
      {#if config.size !== 'medium'}
        <div class="widget-terminal-muted text-[10px] uppercase">
          {padRight('CATEGORY', 18)}[&nbsp;&nbsp;&nbsp;SHARE&nbsp;&nbsp;&nbsp;]&nbsp;&nbsp;AMOUNT{config.size === 'full' ? '   TX' : ''}
        </div>
      {/if}
      {#each categories as cat}
        {@const pct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0}
        <div class="flex items-center gap-1.5">
          <span class="widget-terminal-bright shrink-0">{padRight(cat.name, 18)}</span>
          <span class="widget-terminal-faint shrink-0">[</span>
          <span class="widget-terminal-bright shrink-0">{bar(pct)}</span>
          <span class="widget-terminal-faint shrink-0">]</span>
          <span class="widget-terminal-pos ml-auto shrink-0">{compactCurrency(cat.amount)}</span>
          {#if config.size === 'full'}
            <span class="widget-terminal-faint shrink-0">{cat.count}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
