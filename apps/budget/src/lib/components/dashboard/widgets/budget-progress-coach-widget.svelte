<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import AlertCircle from '@lucide/svelte/icons/alert-circle';

let { config }: { config: DashboardWidget } = $props();

const budgetsQuery = rpc.budgets.listBudgets().options();
const budgets = $derived(budgetsQuery.data ?? []);
const isLoading = $derived(budgetsQuery.isLoading);

type Row = {
  id: number;
  name: string;
  allocated: number;
  spent: number;
  pct: number;
  remaining: number;
  status: 'on-track' | 'caution' | 'over';
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
      const remaining = allocated - spent;
      const status: Row['status'] = spent > allocated ? 'over' : pct >= 85 ? 'caution' : 'on-track';
      return { id: b.id, name: b.name, allocated, spent, pct, remaining, status };
    })
    .sort((a, b) => b.pct - a.pct);
});

const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const limit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 1;
    case 'medium':
      return 3;
    case 'large':
      return 6;
    default:
      return 20;
  }
});

const rows = $derived(allRows.slice(0, limit));
const remaining = $derived(allRows.length - rows.length);

const overCount = $derived(allRows.filter((r) => r.status === 'over').length);
const cautionCount = $derived(allRows.filter((r) => r.status === 'caution').length);
const totalSpent = $derived(allRows.reduce((s, r) => s + r.spent, 0));
const totalAllocated = $derived(allRows.reduce((s, r) => s + r.allocated, 0));
const topRow = $derived(allRows[0] ?? null);

function coachMessage(row: Row): string {
  if (row.status === 'over') {
    return `Over by ${currencyFormatter.format(Math.abs(row.remaining))}. Pause spend here and revisit the cap next period.`;
  }
  if (row.status === 'caution') {
    return `${row.pct.toFixed(0)}% in — ${currencyFormatter.format(row.remaining)} left. Slow down to stay under.`;
  }
  return `On track — ${currencyFormatter.format(row.remaining)} left (${(100 - row.pct).toFixed(0)}% headroom).`;
}

function bgFor(status: Row['status']): string {
  if (status === 'over') return 'bg-destructive/10 border-destructive/40';
  if (status === 'caution') return 'bg-warning-bg border-warning-fg/30';
  return 'bg-success-bg border-success-fg/30';
}
</script>

<div class="space-y-3">
  {#if isLoading}
    <div class="space-y-2">
      {#each Array(Math.max(limit, 2)) as _}
        <div class="bg-muted h-16 animate-pulse rounded-lg"></div>
      {/each}
    </div>
  {:else if allRows.length === 0}
    <p class="text-muted-foreground py-6 text-center text-sm">
      No active budgets yet. <a href="/budgets" class="text-primary hover:underline">Set one up</a> and the coach will kick in.
    </p>
  {:else if config.size === 'small'}
    <div class="space-y-2">
      <div class="flex items-baseline gap-2">
        <span class="text-xl font-bold tabular-nums">
          {overCount}<span class="text-muted-foreground">/{allRows.length}</span>
        </span>
        <span class="text-muted-foreground text-xs">
          {overCount > 0 ? 'over' : cautionCount > 0 ? 'tight' : 'on track'}
        </span>
      </div>
      {#if topRow}
        <div class="rounded-lg border p-2.5 {bgFor(topRow.status)}">
          <div class="flex items-start gap-2">
            <div class="shrink-0 pt-0.5">
              {#if topRow.status === 'over'}
                <AlertCircle class="text-destructive h-3.5 w-3.5"></AlertCircle>
              {:else if topRow.status === 'caution'}
                <AlertTriangle class="text-warning-fg h-3.5 w-3.5"></AlertTriangle>
              {:else}
                <CheckCircle2 class="text-success-fg h-3.5 w-3.5"></CheckCircle2>
              {/if}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium truncate">{topRow.name}</div>
              <p class="text-foreground/80 text-[11px]">{coachMessage(topRow)}</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    {#if config.size === 'full'}
      <div class="text-muted-foreground flex items-baseline justify-between border-b pb-1.5 text-xs uppercase tracking-wider">
        <span>{allRows.length} budgets · {overCount} over · {cautionCount} tight</span>
        <span class="tabular-nums">
          {currencyFormatter.format(totalSpent)} / {currencyFormatter.format(totalAllocated)}
        </span>
      </div>
    {/if}
    {#each rows as row (row.id)}
      <div class="rounded-lg border p-3 {bgFor(row.status)}">
        <div class="mb-2 flex items-start gap-2">
          <div class="shrink-0 pt-0.5">
            {#if row.status === 'over'}
              <AlertCircle class="text-destructive h-4 w-4"></AlertCircle>
            {:else if row.status === 'caution'}
              <AlertTriangle class="text-warning-fg h-4 w-4"></AlertTriangle>
            {:else}
              <CheckCircle2 class="text-success-fg h-4 w-4"></CheckCircle2>
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <span class="truncate font-medium text-sm">{row.name}</span>
              <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
                {currencyFormatter.format(row.spent)} / {currencyFormatter.format(row.allocated)}
                {#if config.size === 'large' || config.size === 'full'}
                  <span class="ml-1 text-[10px]">· {row.pct.toFixed(0)}%</span>
                {/if}
              </span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                class="h-full rounded-full transition-all"
                class:bg-destructive={row.status === 'over'}
                class:bg-warning-fg={row.status === 'caution'}
                class:bg-success-fg={row.status === 'on-track'}
                style="width: {Math.min(row.pct, 100)}%;">
              </div>
            </div>
          </div>
        </div>
        <p class="ml-6 text-xs text-foreground/80">{coachMessage(row)}</p>
      </div>
    {/each}
    {#if remaining > 0}
      <p class="text-muted-foreground pt-1 text-center text-xs">+{remaining} more</p>
    {/if}
  {/if}
</div>
