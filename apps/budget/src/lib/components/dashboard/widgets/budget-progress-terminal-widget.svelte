<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

const budgetsQuery = rpc.budgets.listBudgets().options();
const budgets = $derived(budgetsQuery.data ?? []);
const isLoading = $derived(budgetsQuery.isLoading);

type Row = {
  name: string;
  spent: number;
  allocated: number;
  pct: number;
  isOver: boolean;
};

const allRows = $derived.by<Row[]>(() => {
  return budgets
    .filter((b: any) => b.metadata?.allocatedAmount && b.metadata.allocatedAmount > 0)
    .map((b: any) => {
      const allocated = Number(b.metadata?.allocatedAmount) || 0;
      const spent = (b.transactions ?? []).reduce(
        (sum: number, bt: any) =>
          sum + Math.abs(Number(bt.allocatedAmount ?? bt.transaction?.amount ?? 0)),
        0
      );
      const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
      return { name: b.name, spent, allocated, pct, isOver: spent > allocated };
    })
    .sort((a, b) => b.pct - a.pct);
});

const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const limit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 5;
    case 'large':
      return 10;
    default:
      return 25;
  }
});

const rows = $derived(allRows.slice(0, limit));
const remaining = $derived(allRows.length - rows.length);

const overCount = $derived(allRows.filter((r) => r.isOver).length);
const totalActive = $derived(allRows.length);
const biggest = $derived(allRows[0] ?? null);
const totalSpent = $derived(allRows.reduce((s, r) => s + r.spent, 0));
const totalAllocated = $derived(allRows.reduce((s, r) => s + r.allocated, 0));

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
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
</script>

<div class="widget-terminal">
  <div class="mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || 'BUDGET.STATUS'}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[10px]">
        {totalActive} ACTIVE{overCount > 0 ? ` · ${overCount} OVER` : ''}
      </span>
    {/if}
  </div>

  {#if isLoading}
    <div class="space-y-1.5">
      {#each Array(Math.max(limit, 3)) as _}
        <div class="h-4 animate-pulse rounded bg-(--term-bg-soft)"></div>
      {/each}
    </div>
  {:else if allRows.length === 0}
    <div class="widget-terminal-muted py-6 text-center text-[10px]">
      &gt; no.active.budgets
    </div>
  {:else if config.size === 'small'}
    <div class="flex items-baseline gap-2">
      <span class="widget-terminal-bright text-base tabular-nums">
        {overCount}<span class="widget-terminal-muted">/{totalActive}</span>
      </span>
      {#if biggest}
        <span
          class="text-[10px] tabular-nums"
          class:widget-terminal-bright={biggest.pct < 85}
          class:widget-terminal-warn={biggest.pct >= 85 && !biggest.isOver}
          class:widget-terminal-neg={biggest.isOver}>
          TOP {biggest.pct.toFixed(0)}%
        </span>
      {/if}
    </div>
    <div class="widget-terminal-faint mt-0.5 text-[9px] uppercase">OVER · ACTIVE</div>
  {:else}
    {#if config.size === 'full'}
      <div class="mb-2 grid grid-cols-2 gap-2 text-[10px] tabular-nums">
        <div>
          <span class="widget-terminal-faint uppercase">SPEND</span>
          <span class="widget-terminal-bright ml-1">{compactCurrency(totalSpent)}</span>
        </div>
        <div>
          <span class="widget-terminal-faint uppercase">ALLOC</span>
          <span class="widget-terminal-bright ml-1">{compactCurrency(totalAllocated)}</span>
        </div>
      </div>
    {/if}
    <div class="space-y-1 text-[11px] leading-relaxed tabular-nums">
      <div class="widget-terminal-muted text-[10px] uppercase">
        {padRight('BUDGET', 18)}USE%&nbsp;&nbsp;[&nbsp;&nbsp;&nbsp;METER&nbsp;&nbsp;&nbsp;]&nbsp;&nbsp;SPEND
      </div>
      {#each rows as row}
        <div class="flex items-center gap-1.5">
          <span class="widget-terminal-bright shrink-0">{padRight(row.name, 18)}</span>
          <span
            class="w-10 shrink-0 text-right"
            class:widget-terminal-bright={!row.isOver && row.pct < 85}
            class:widget-terminal-warn={!row.isOver && row.pct >= 85}
            class:widget-terminal-neg={row.isOver}>
            {row.pct.toFixed(0)}%
          </span>
          <span class="widget-terminal-faint shrink-0">[</span>
          <span
            class="shrink-0"
            class:widget-terminal-bright={!row.isOver && row.pct < 85}
            class:widget-terminal-warn={!row.isOver && row.pct >= 85}
            class:widget-terminal-neg={row.isOver}>{bar(row.pct)}</span>
          <span class="widget-terminal-faint shrink-0">]</span>
          <span class="widget-terminal-dim ml-auto shrink-0">
            {compactCurrency(row.spent)}/{compactCurrency(row.allocated)}
          </span>
        </div>
      {/each}
      {#if remaining > 0}
        <div class="widget-terminal-muted pt-1 text-[10px]">
          &hellip; +{remaining} more
        </div>
      {/if}
    </div>
  {/if}
</div>
