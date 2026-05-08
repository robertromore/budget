<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { HorizontalBar, AxisY } from '$lib/components/layercake';
import { scaleBand, scaleLinear } from 'd3-scale';
import Target from '@lucide/svelte/icons/target';
import AlertTriangle from '@lucide/svelte/icons/triangle-alert';

let { config }: { config: DashboardWidget } = $props();

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

const budgetsQuery = rpc.budgets.listBudgets().options();
const budgets = $derived(budgetsQuery.data ?? []);
const isLoading = $derived(budgetsQuery.isLoading);

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

const allBudgetRows = $derived.by(() => {
  const items = budgets.filter(
    (b: any) => b.metadata?.allocatedAmount && b.metadata.allocatedAmount > 0
  );
  return items.map((b: any) => {
    const allocated = Number(b.metadata?.allocatedAmount) || 0;
    const spent = (b.transactions ?? []).reduce(
      (sum: number, bt: any) => sum + Math.abs(Number(bt.allocatedAmount ?? bt.transaction?.amount ?? 0)),
      0
    );
    const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
    return {
      label: truncate(b.name, 18),
      value: pct,
      spent,
      allocated,
      isOver: spent > allocated,
    };
  });
});

// Sort by % desc so the most-stressed budgets surface first.
const chartData = $derived(
  [...allBudgetRows].sort((a, b) => b.value - a.value).slice(0, limit)
);
const remaining = $derived(allBudgetRows.length - chartData.length);

const overCount = $derived(allBudgetRows.filter((r) => r.isOver).length);
const totalActive = $derived(allBudgetRows.length);
const biggest = $derived(
  allBudgetRows.length > 0
    ? [...allBudgetRows].sort((a, b) => b.value - a.value)[0]!
    : null
);
const totalSpent = $derived(allBudgetRows.reduce((s, r) => s + r.spent, 0));
const totalAllocated = $derived(allBudgetRows.reduce((s, r) => s + r.allocated, 0));

const xMax = $derived(
  chartData.length > 0 ? Math.max(100, ...chartData.map((d) => d.value)) : 100
);
</script>

{#if isLoading}
  <div class="space-y-3">
    {#each Array(Math.max(limit, 3)) as _}
      <div class="bg-muted h-8 animate-pulse rounded"></div>
    {/each}
  </div>
{:else if allBudgetRows.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <Target class="text-muted-foreground h-10 w-10"></Target>
    <p class="text-muted-foreground text-sm">No active budgets</p>
    <a href="/budgets" class="text-primary text-xs hover:underline">Create a budget</a>
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="rounded-lg p-2.5 shrink-0" class:bg-destructive-bg={overCount > 0} class:bg-primary={overCount === 0} class:bg-primary-foreground={overCount === 0}>
      {#if overCount > 0}
        <AlertTriangle class="text-destructive h-5 w-5"></AlertTriangle>
      {:else}
        <Target class="text-primary h-5 w-5"></Target>
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-xl font-bold tabular-nums">
        {overCount}<span class="text-muted-foreground">/{totalActive}</span>
      </div>
      <p class="text-muted-foreground text-xs">
        over budget{biggest ? ` · top ${biggest.value}%` : ''}
      </p>
    </div>
  </div>
{:else}
  {#if config.size === 'full'}
    <div class="text-muted-foreground mb-2 flex items-baseline justify-between border-b pb-1.5 text-xs uppercase tracking-wider">
      <span>{totalActive} budgets · {overCount} over</span>
      <span class="tabular-nums">
        {currencyFormatter.format(totalSpent)} / {currencyFormatter.format(totalAllocated)}
      </span>
    </div>
  {/if}
  <div style="height: {Math.max(100, chartData.length * 36)}px;">
    <LayerCake
      data={chartData}
      x="value"
      y="label"
      yScale={scaleBand().padding(0.3)}
      xScale={scaleLinear()}
      xDomain={[0, xMax]}
      padding={{ top: 0, right: 40, bottom: 0, left: 130 }}>
      <Svg>
        {#if xMax > 100}
          {@const lineX = (100 / xMax) * 100}
          <line
            x1="{lineX}%"
            y1="0"
            x2="{lineX}%"
            y2="100%"
            stroke="var(--border)"
            stroke-width="1"
            stroke-dasharray="4 3"></line>
        {/if}
        <AxisY gridlines={false} tickMarks={false}></AxisY>
        <HorizontalBar
          fill={(d) => (d.isOver ? 'var(--destructive)' : d.value >= 85 ? 'var(--chart-4)' : 'var(--chart-1)')}
          opacity={0.8}
          radius={3}></HorizontalBar>
      </Svg>
    </LayerCake>
  </div>
  <div class="mt-1 space-y-0.5">
    {#each chartData as d}
      <div class="text-muted-foreground flex items-center justify-between text-xs">
        <span class="truncate">{d.label}</span>
        <span class={d.isOver ? 'text-destructive' : ''}>
          {currencyFormatter.format(d.spent)} / {currencyFormatter.format(d.allocated)}
          ({d.value}%)
        </span>
      </div>
    {/each}
    {#if remaining > 0}
      <p class="text-muted-foreground pt-1 text-center text-xs">+{remaining} more</p>
    {/if}
  </div>
{/if}
