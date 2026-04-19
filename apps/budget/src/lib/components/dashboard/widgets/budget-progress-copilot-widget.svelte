<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import Target from '@lucide/svelte/icons/target';
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

const rows = $derived.by<Row[]>(() => {
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
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);
});
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-3 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <Target class="h-3.5 w-3.5 {p.iconFg}" />
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Budget progress'}
    </span>
  </div>

  {#if isLoading}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="bg-muted h-10 animate-pulse rounded-lg"></div>
      {/each}
    </div>
  {:else if rows.length === 0}
    <p class="text-muted-foreground py-4 text-center text-sm">
      No active budgets yet
    </p>
  {:else}
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
            <span class="shrink-0 tabular-nums text-muted-foreground">
              {currencyFormatter.format(row.spent)}
              <span class="text-muted-foreground/60">/ {currencyFormatter.format(row.allocated)}</span>
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
    </div>
  {/if}
</div>
