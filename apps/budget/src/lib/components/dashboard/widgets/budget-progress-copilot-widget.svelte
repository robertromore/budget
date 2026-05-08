<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import Target from '@lucide/svelte/icons/target';
import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const budgetsQuery = rpc.budgets.listBudgets().options();
const budgets = $derived(budgetsQuery.data ?? []);
const isLoading = $derived(budgetsQuery.isLoading);

type Row = {
  name: string;
  spent: number;
  allocated: number;
  pct: number;
  remaining: number;
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
      return {
        name: b.name,
        spent,
        allocated,
        pct,
        remaining: allocated - spent,
        isOver: spent > allocated,
      };
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
      return 4;
    case 'large':
      return 8;
    default:
      return 20;
  }
});

const rows = $derived(allRows.slice(0, limit));
const remaining = $derived(allRows.length - rows.length);

const overCount = $derived(allRows.filter((r) => r.isOver).length);
const totalActive = $derived(allRows.length);
const biggest = $derived(allRows[0] ?? null);
const totalSpent = $derived(allRows.reduce((s, r) => s + r.spent, 0));
const totalAllocated = $derived(allRows.reduce((s, r) => s + r.allocated, 0));
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-3 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Target class="h-3.5 w-3.5 {p.iconFg}"></Target>
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Budget progress'}
    </span>
  </div>

  {#if isLoading}
    <div class="space-y-3">
      {#each Array(Math.max(limit, 3)) as _}
        <div class="bg-muted h-10 animate-pulse rounded-lg"></div>
      {/each}
    </div>
  {:else if allRows.length === 0}
    <p class="text-muted-foreground py-4 text-center text-sm">No active budgets yet</p>
  {:else if config.size === 'small'}
    <div class="flex items-baseline gap-2">
      <span class="text-xl font-bold tabular-nums">
        {overCount}<span class="text-muted-foreground">/{totalActive}</span>
      </span>
      {#if overCount > 0}
        <span class="text-destructive inline-flex items-center gap-1 text-xs font-semibold">
          <AlertTriangle class="h-3 w-3"></AlertTriangle>over
        </span>
      {/if}
    </div>
    {#if biggest}
      <p class="text-muted-foreground mt-0.5 text-xs">
        Top: <span class="font-medium">{biggest.name}</span> at {biggest.pct.toFixed(0)}%
      </p>
    {/if}
  {:else}
    {#if config.size === 'full'}
      <div class="mb-2 flex items-baseline justify-between border-b pb-1.5 text-xs">
        <span class="text-muted-foreground uppercase tracking-wider">
          {totalActive} budgets · {overCount} over
        </span>
        <span class="text-muted-foreground tabular-nums">
          {currencyFormatter.format(totalSpent)} / {currencyFormatter.format(totalAllocated)}
        </span>
      </div>
    {/if}
    <div class="space-y-2.5">
      {#each rows as row}
        {@const barColor = row.isOver
          ? 'bg-linear-to-r from-rose-500 to-rose-400'
          : row.pct >= 85
            ? 'bg-linear-to-r from-amber-500 to-amber-400'
            : p.barFill}
        <div class="space-y-1">
          <div class="flex items-baseline justify-between gap-2 text-xs">
            <span class="truncate font-medium">{row.name}</span>
            <span class="text-muted-foreground shrink-0 tabular-nums">
              {currencyFormatter.format(row.spent)}
              <span class="text-muted-foreground/60">/ {currencyFormatter.format(row.allocated)}</span>
              {#if config.size === 'large' || config.size === 'full'}
                <span class="ml-1 text-[10px]">· {row.pct.toFixed(0)}%</span>
              {/if}
            </span>
          </div>
          <div class="h-2 overflow-hidden rounded-full {p.trackBg}">
            <div
              class="h-full rounded-full transition-all {barColor}"
              style="width: {Math.min(row.pct, 100)}%;">
            </div>
          </div>
        </div>
      {/each}
      {#if remaining > 0}
        <p class="text-muted-foreground pt-1 text-center text-xs">+{remaining} more</p>
      {/if}
    </div>
  {/if}
</div>
