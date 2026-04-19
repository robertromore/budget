<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import PieChart from '@lucide/svelte/icons/pie-chart';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const limit = $derived((config.settings as any)?.limit ?? 6);
const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

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

const totalSpent = $derived(categories.reduce((s, c) => s + c.amount, 0));
const maxAmount = $derived(categories.length > 0 ? Math.max(...categories.map((c) => c.amount)) : 0);
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-3 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="rounded-lg p-1.5 {p.iconBg}">
        <PieChart class="h-3.5 w-3.5 {p.iconFg}" />
      </div>
      <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        {config.title || 'Top categories'}
      </span>
    </div>
    {#if totalSpent > 0}
      <span class="text-muted-foreground text-xs tabular-nums">
        {currencyFormatter.format(totalSpent)} total
      </span>
    {/if}
  </div>

  {#if isLoading}
    <div class="space-y-2">
      {#each Array(4) as _}
        <div class="bg-muted h-10 animate-pulse rounded-lg"></div>
      {/each}
    </div>
  {:else if categories.length === 0}
    <p class="text-muted-foreground py-6 text-center text-sm">No spending data yet</p>
  {:else}
    <div class="space-y-2">
      {#each categories as cat}
        {@const widthPct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0}
        {@const sharePct = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0}
        <div class="space-y-1">
          <div class="flex items-baseline justify-between gap-2 text-xs">
            <span class="truncate font-medium">{cat.name}</span>
            <span class="shrink-0 tabular-nums text-muted-foreground">
              {currencyFormatter.format(cat.amount)}
              <span class="ml-1 text-[10px]">· {sharePct.toFixed(0)}%</span>
            </span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full {p.trackBg}">
            <div
              class="h-full rounded-full transition-all {p.barFill}"
              style="width: {widthPct}%;">
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
