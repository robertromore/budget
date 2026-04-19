<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { Area, AxisX, Line } from '$lib/components/layercake';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { scalePoint, scaleLinear } from 'd3-scale';
import { LayerCake, Svg } from 'layercake';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortMonth(isoMonth: string): string {
  const [, month] = isoMonth.split('-');
  return SHORT_MONTHS[Number(month) - 1]!;
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

const recentMonths = $derived(monthlyData.slice(-6));
const chartData = $derived(
  recentMonths.map((m) => ({
    label: shortMonth(m.month),
    value: Math.abs(Number(m.spending) || 0),
  }))
);

const latest = $derived(chartData.length > 0 ? chartData[chartData.length - 1]!.value : 0);
const prior = $derived(chartData.length > 1 ? chartData[chartData.length - 2]!.value : latest);
const delta = $derived(latest - prior);
const deltaPct = $derived(prior > 0 ? (delta / prior) * 100 : 0);
const spendingDown = $derived(delta <= 0);

const yMax = $derived(
  chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) * 1.15 : 100
);
</script>

<div
  class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-3 flex items-start justify-between gap-3">
    <div class="space-y-0.5">
      <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        {config.title || 'Spending · last 6 months'}
      </span>
      <div class="text-xl font-bold tabular-nums">
        {currencyFormatter.format(latest)}
      </div>
    </div>
    <span
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      class:bg-success-bg={spendingDown && delta !== 0}
      class:text-success-fg={spendingDown && delta !== 0}
      class:bg-destructive-bg={!spendingDown && delta !== 0}
      class:text-destructive={!spendingDown && delta !== 0}
      class:bg-muted={delta === 0}
      class:text-muted-foreground={delta === 0}>
      {#if spendingDown}
        <TrendingDown class="h-3 w-3" />
      {:else}
        <TrendingUp class="h-3 w-3" />
      {/if}
      {delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
    </span>
  </div>

  {#if isLoading}
    <div class="bg-muted h-36 animate-pulse rounded-lg"></div>
  {:else if chartData.length >= 2}
    <div class="h-36">
      <LayerCake
        data={chartData}
        x="label"
        y="value"
        xScale={scalePoint()}
        yScale={scaleLinear()}
        yDomain={[0, yMax]}
        padding={{ top: 4, right: 8, bottom: 22, left: 8 }}>
        <Svg>
          <Area fill="var(--chart-2)" opacity={0.18} />
          <Line stroke="var(--chart-2)" strokeWidth={2.5} />
          <AxisX gridlines={false} tickMarks={false} />
        </Svg>
      </LayerCake>
    </div>
  {:else}
    <p class="text-muted-foreground py-6 text-center text-sm">
      Not enough months yet for a trend.
    </p>
  {/if}
</div>
