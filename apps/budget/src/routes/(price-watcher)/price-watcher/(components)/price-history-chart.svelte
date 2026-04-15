<script lang="ts">
import { getPriceHistory } from '$lib/query/price-watcher';
import type { PriceProduct } from '$core/schema/price-products';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { Line, Area, AxisX, AxisY, HorizontalLine, Tooltip, Scatter } from '$lib/components/layercake';
import { scaleTime, scaleLinear } from 'd3-scale';

interface Props {
  product: PriceProduct;
  period?: '7d' | '30d' | '90d' | '1y' | 'all';
}

let { product, period = 'all' }: Props = $props();

const dateRange = $derived.by(() => {
  if (period === 'all') return undefined;
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { dateFrom: from.toISOString() };
});

const historyQuery = $derived(getPriceHistory(product.id, dateRange).options());
const history = $derived(historyQuery.data ?? []);
const isLoading = $derived(historyQuery.isLoading);

const chartData = $derived.by(() => {
  if (history.length === 0) return [];
  return history.map((h) => ({
    date: new Date(h.checkedAt),
    value: h.price,
    source: h.source,
  }));
});

const hasManualEntries = $derived(chartData.some((d) => d.source === 'manual'));

const sourceLabel: Record<string, string> = {
  scrape: 'Scraped',
  api: 'API',
  manual: 'Manual',
};

const yMin = $derived.by(() => {
  if (chartData.length === 0) return 0;
  const prices = chartData.map((d) => d.value);
  const min = Math.min(...prices);
  // Include target price in range if set
  if (product.targetPrice !== null) {
    return Math.min(min, product.targetPrice) * 0.95;
  }
  return min * 0.95;
});

const yMax = $derived.by(() => {
  if (chartData.length === 0) return 100;
  const prices = chartData.map((d) => d.value);
  return Math.max(...prices) * 1.05;
});
</script>

{#if isLoading}
  <div class="bg-muted h-[260px] animate-pulse rounded-lg"></div>
{:else if chartData.length === 0}
  <div class="text-muted-foreground flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm">
    No price history yet
  </div>
{:else}
  <div class="rounded-lg border p-4">
    <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
      <span>{chartData.length} data points</span>
      <span>
        {chartData[0]?.date.toLocaleDateString()} — {chartData[chartData.length - 1]?.date.toLocaleDateString()}
      </span>
    </div>
    <div class="h-[220px]">
      <LayerCake
        data={chartData}
        x="date"
        y="value"
        xScale={scaleTime()}
        yScale={scaleLinear()}
        yDomain={[yMin, yMax]}
        padding={{ top: 8, right: 8, bottom: 24, left: 48 }}>
        <Svg>
          <AxisX
            ticks={Math.min(chartData.length, 6)}
            gridlines={false}
            tickMarks={false}
            format={(d) => d instanceof Date ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} />
          <AxisY
            ticks={5}
            gridlines
            format={(d) => currencyFormatter.format(d)} />
          <Area
            fill="var(--chart-2)"
            opacity={0.1} />
          <Line
            stroke="var(--chart-2)"
            strokeWidth={2} />
          {#if hasManualEntries}
            <Scatter
              fill={(d) => d.source === 'manual' ? 'var(--chart-4)' : 'transparent'}
              stroke={(d) => d.source === 'manual' ? 'var(--background)' : 'transparent'}
              strokeWidth={2}
              radius={(d) => d.source === 'manual' ? 4 : 0}
              opacity={(d) => d.source === 'manual' ? 1 : 0} />
          {/if}
          {#if product.targetPrice !== null}
            <HorizontalLine
              value={product.targetPrice}
              stroke="var(--color-success)"
              strokeWidth={1}
              strokeDasharray="4,4"
              label="Target: {currencyFormatter.format(product.targetPrice)}" />
          {/if}
          <Tooltip>
            {#snippet children({ point, x, y }: { point: any; x: number; y: number })}
              {@const tooltipLeft = x > 150}
              <foreignObject
                x={tooltipLeft ? x - 155 : x + 12}
                y={Math.max(0, y - 28)}
                width={150}
                height={64}
                style="overflow: visible; pointer-events: none;">
                <div class="bg-popover border-border rounded-md border px-2.5 py-1.5 shadow-md">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-medium">{currencyFormatter.format(point.value)}</span>
                    {#if point.source === 'manual'}
                      <span class="rounded bg-chart-4/15 px-1 text-[10px] text-chart-4 font-medium">Manual</span>
                    {/if}
                  </div>
                  <div class="text-muted-foreground text-[10px]">
                    {point.date instanceof Date ? point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    {#if point.source !== 'manual'} · {sourceLabel[point.source] ?? point.source}{/if}
                  </div>
                </div>
              </foreignObject>
            {/snippet}
          </Tooltip>
        </Svg>
      </LayerCake>
    </div>
  </div>
{/if}
