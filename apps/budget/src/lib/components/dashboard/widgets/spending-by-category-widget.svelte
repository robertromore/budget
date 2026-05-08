<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { HorizontalBar, HorizontalBarLabels, AxisY } from '$lib/components/layercake';
import { scaleBand, scaleLinear } from 'd3-scale';
import PieChart from '@lucide/svelte/icons/pie-chart';

let { config }: { config: DashboardWidget } = $props();

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// Per-size row count. The user's `limit` setting still wins so power
// users can override the per-size defaults.
const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const limit = $derived.by(() => {
  if (customLimit > 0) return customLimit;
  switch (config.size) {
    case 'small':
      return 1;
    case 'large':
      return 6;
    case 'full':
      return 10;
    default:
      return 3;
  }
});

const categoriesQuery = $derived(rpc.transactions.getWorkspaceTopCategories(limit).options());
const categories = $derived(
  (categoriesQuery.data ?? []) as Array<{
    categoryName: string;
    totalAmount: number;
    transactionCount: number;
  }>
);
const isLoading = $derived(categoriesQuery.isLoading);

const chartData = $derived(
  categories.map((c) => ({
    label: truncate(c.categoryName ?? 'Uncategorized', 18),
    value: Math.abs(Number(c.totalAmount) || 0),
    count: Number(c.transactionCount) || 0,
  }))
);
const xMax = $derived(
  chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) * 1.1 : 100
);
const total = $derived(chartData.reduce((s, c) => s + c.value, 0));
</script>

{#if isLoading}
  <div class="space-y-3">
    {#each Array(Math.min(limit, 4)) as _}
      <div class="bg-muted h-6 animate-pulse rounded"></div>
    {/each}
  </div>
{:else if chartData.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <PieChart class="text-muted-foreground h-10 w-10"></PieChart>
    <p class="text-muted-foreground text-sm">No spending data yet</p>
  </div>
{:else if config.size === 'small'}
  {@const top = chartData[0]!}
  <div class="flex items-center gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      <PieChart class="text-primary h-5 w-5"></PieChart>
    </div>
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium">{top.label}</div>
      <div class="text-muted-foreground text-xs tabular-nums">
        {currencyFormatter.format(top.value)} · {top.count} tx
      </div>
    </div>
  </div>
{:else}
  <div class="space-y-2">
    {#if config.size === 'full'}
      <div class="text-muted-foreground flex items-baseline justify-between border-b pb-1.5 text-xs uppercase tracking-wider">
        <span>Top {chartData.length}</span>
        <span class="tabular-nums">{currencyFormatter.format(total)} total</span>
      </div>
    {/if}
    <div style="height: {Math.max(120, chartData.length * 32)}px;">
      <LayerCake
        data={chartData}
        x="value"
        y="label"
        yScale={scaleBand().padding(0.25)}
        xScale={scaleLinear()}
        xDomain={[0, xMax]}
        padding={{ top: 0, right: 65, bottom: 0, left: 130 }}>
        <Svg>
          <AxisY gridlines={false} tickMarks={false}></AxisY>
          <HorizontalBar fill="var(--chart-1)" opacity={0.8} radius={3}></HorizontalBar>
          <HorizontalBarLabels format={(d) => currencyFormatter.format(d.value)}></HorizontalBarLabels>
        </Svg>
      </LayerCake>
    </div>
  </div>
{/if}
