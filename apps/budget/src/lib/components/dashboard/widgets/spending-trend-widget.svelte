<script lang="ts">
import type { DashboardWidget } from '$lib/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg, Html } from 'layercake';
import { Bar, AxisX, AxisY } from '$lib/components/layercake';
import { scaleBand, scaleLinear } from 'd3-scale';
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

const recentMonths = $derived(monthlyData.slice(-6));
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

let hoveredItem = $state<any>(null);
</script>

{#if isLoading}
  <div class="flex h-40 items-center justify-center">
    <div class="bg-muted h-full w-full animate-pulse rounded"></div>
  </div>
{:else if chartData.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <TrendingUp class="text-muted-foreground h-10 w-10" />
    <p class="text-muted-foreground text-sm">Not enough data for trend</p>
  </div>
{:else}
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
        }} />
        <AxisX gridlines={false} />
        <Bar
          fill="var(--chart-1)"
          opacity={0.85}
          hoverOpacity={1}
          radius={4}
          onhover={(d) => (hoveredItem = d)} />
      </Svg>
      <Html pointerEvents={false}>
        {#if hoveredItem}
          <div class="bg-popover text-popover-foreground pointer-events-none absolute rounded-md border px-2.5 py-1.5 text-xs shadow-md"
            style="left: 50%; top: 0; transform: translateX(-50%);">
            <div class="font-medium">{currencyFormatter.format(hoveredItem.value)}</div>
            <div class="text-muted-foreground">{hoveredItem.count} transactions</div>
          </div>
        {/if}
      </Html>
    </LayerCake>
  </div>
  <div class="text-muted-foreground mt-1 flex items-center justify-between text-xs">
    <span>Monthly spending</span>
    <span>Avg: {currencyFormatter.format(avg)}</span>
  </div>
{/if}
