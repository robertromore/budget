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

const limit = $derived((config.settings as any)?.limit ?? 8);

const categoriesQuery = $derived(
  rpc.transactions.getWorkspaceTopCategories(limit).options()
);
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
</script>

{#if isLoading}
  <div class="space-y-3">
    {#each Array(5) as _}
      <div class="bg-muted h-6 animate-pulse rounded"></div>
    {/each}
  </div>
{:else if chartData.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-6">
    <PieChart class="text-muted-foreground h-10 w-10" />
    <p class="text-muted-foreground text-sm">No spending data yet</p>
  </div>
{:else}
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
        <AxisY gridlines={false} tickMarks={false} />
        <HorizontalBar fill="var(--chart-1)" opacity={0.8} radius={3} />
        <HorizontalBarLabels format={(d) => currencyFormatter.format(d.value)} />
      </Svg>
    </LayerCake>
  </div>
{/if}
