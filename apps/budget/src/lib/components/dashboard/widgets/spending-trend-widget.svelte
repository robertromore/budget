<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg, Html } from 'layercake';
import { Bar, AxisX, AxisY } from '$lib/components/layercake';
import { scaleBand, scaleLinear } from 'd3-scale';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';

let { config }: { config: DashboardWidget } = $props();

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split('-');
  return `${SHORT_MONTHS[Number(month) - 1]} '${year!.slice(2)}`;
}

const spendingQuery = rpc.transactions.getWorkspaceMonthlySpending().options();
const monthlyData = $derived(
  (spendingQuery.data ?? []) as Array<{
    month: string;
    spending: number;
    income: number;
    transactionCount: number;
  }>
);
const isLoading = $derived(spendingQuery.isLoading);

// Per-size: how many trailing months to plot. The latest data point
// is always at the right edge.
const monthsToShow = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return 0;
    case 'medium':
      return 3;
    case 'large':
      return 6;
    case 'full':
      return 12;
    default:
      return 6;
  }
});

const recentMonths = $derived(monthlyData.slice(-Math.max(monthsToShow, 2)));
const chartData = $derived(
  recentMonths.map((m) => ({
    label: shortMonth(m.month),
    value: Math.abs(Number(m.spending) || 0),
    count: Number(m.transactionCount) || 0,
  }))
);
const yMax = $derived(
  chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) * 1.1 : 100
);
const avg = $derived(
  chartData.length > 0
    ? chartData.reduce((s, d) => s + d.value, 0) / chartData.length
    : 0
);
const latest = $derived(chartData.length > 0 ? chartData[chartData.length - 1]!.value : 0);
const prior = $derived(chartData.length > 1 ? chartData[chartData.length - 2]!.value : latest);
const delta = $derived(latest - prior);
const deltaPct = $derived(prior > 0 ? (delta / prior) * 100 : 0);
const spendingDown = $derived(delta <= 0);

let hoveredItem = $state<any>(null);
</script>

{#if isLoading}
  <div class="flex h-40 items-center justify-center">
    <div class="bg-muted h-full w-full animate-pulse rounded"></div>
  </div>
{:else if chartData.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <TrendingUp class="text-muted-foreground h-10 w-10"></TrendingUp>
    <p class="text-muted-foreground text-sm">Not enough data for trend</p>
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      {#if spendingDown}
        <TrendingDown class="text-amount-positive h-5 w-5"></TrendingDown>
      {:else}
        <TrendingUp class="text-amount-negative h-5 w-5"></TrendingUp>
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-xl font-bold tabular-nums">{currencyFormatter.format(latest)}</div>
      <p class="text-muted-foreground text-xs tabular-nums">
        {delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% vs prior month
      </p>
    </div>
  </div>
{:else}
  {#if config.size === 'large' || config.size === 'full'}
    <div class="mb-3 flex items-baseline justify-between text-xs">
      <div>
        <span class="text-muted-foreground">Avg</span>
        <span class="ml-1 font-semibold tabular-nums">{currencyFormatter.format(avg)}</span>
      </div>
      <div>
        <span class="text-muted-foreground">Latest</span>
        <span class="ml-1 font-semibold tabular-nums">{currencyFormatter.format(latest)}</span>
      </div>
      <div>
        <span class="text-muted-foreground">Δ vs avg</span>
        <span
          class="ml-1 font-semibold tabular-nums"
          class:text-amount-positive={delta < 0}
          class:text-amount-negative={delta > 0}>
          {delta >= 0 ? '+' : ''}{(avg > 0 ? ((latest - avg) / avg) * 100 : 0).toFixed(1)}%
        </span>
      </div>
    </div>
  {/if}

  <div class="h-48">
    <LayerCake
      data={chartData}
      x="label"
      y="value"
      xScale={scaleBand().padding(0.3)}
      yScale={scaleLinear()}
      yDomain={[0, yMax]}
      padding={{ top: 10, right: 10, bottom: 28, left: 55 }}>
      <Svg>
        <AxisY ticks={4} gridlines={true} format={(d) => {
          if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
          return `$${d}`;
        }}></AxisY>
        <AxisX gridlines={false}></AxisX>
        <Bar
          fill="var(--chart-1)"
          opacity={0.85}
          hoverOpacity={1}
          radius={4}
          onhover={(d) => (hoveredItem = d)}></Bar>
      </Svg>
      <Html pointerEvents={false}>
        {#if hoveredItem}
          <div
            class="bg-popover text-popover-foreground pointer-events-none absolute rounded-md border px-2.5 py-1.5 text-xs shadow-md"
            style="left: 50%; top: 0; transform: translateX(-50%);">
            <div class="font-medium">{currencyFormatter.format(hoveredItem.value)}</div>
            <div class="text-muted-foreground">{hoveredItem.count} transactions</div>
          </div>
        {/if}
      </Html>
    </LayerCake>
  </div>

  {#if config.size === 'medium'}
    <div class="text-muted-foreground mt-1 flex items-center justify-between text-xs">
      <span>Monthly spending</span>
      <span>Avg: {currencyFormatter.format(avg)}</span>
    </div>
  {/if}

  {#if config.size === 'full'}
    <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      {#each chartData.slice().reverse() as month}
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-muted-foreground truncate">{month.label}</span>
          <span class="font-medium tabular-nums">{currencyFormatter.format(month.value)}</span>
        </div>
      {/each}
    </div>
  {/if}
{/if}
