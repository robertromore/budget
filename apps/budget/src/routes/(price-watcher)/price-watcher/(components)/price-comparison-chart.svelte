<script lang="ts">
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import { CustomLine, AxisX, AxisY } from '$lib/components/layercake';
import { scaleTime, scaleLinear } from 'd3-scale';
import ComparisonTooltip from './comparison-tooltip.svelte';

export interface ComparisonSeries {
  key: string;
  label: string;
  color: string;
  data: Array<{ x: Date; y: number }>;
}

interface Props {
  series: ComparisonSeries[];
  normalized?: boolean;
}

let { series, normalized = false }: Props = $props();

// Compute domains across all visible series
const visibleSeries = $derived(
  series.filter((s) => !chartInteractions.isSeriesHidden(s.key) && s.data.length > 0)
);

const xDomain = $derived.by(() => {
  if (visibleSeries.length === 0) return [Date.now(), Date.now()] as [number, number];
  let min = Infinity;
  let max = -Infinity;
  for (const s of visibleSeries) {
    for (const d of s.data) {
      const t = d.x.getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
  }
  return [min, max] as [number, number];
});

const yDomain = $derived.by(() => {
  if (visibleSeries.length === 0) return [0, 100] as [number, number];
  let min = Infinity;
  let max = -Infinity;
  for (const s of visibleSeries) {
    for (const d of s.data) {
      if (d.y < min) min = d.y;
      if (d.y > max) max = d.y;
    }
  }
  const padding = (max - min) * 0.05 || 1;
  return [min - padding, max + padding] as [number, number];
});

// Dummy data point for LayerCake (it needs a non-empty data array)
const dummyData = $derived([
  { x: xDomain[0], y: yDomain[0] },
  { x: xDomain[1], y: yDomain[1] },
]);

const formatYAxis = $derived(
  normalized
    ? (d: number) => `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`
    : (d: number) => currencyFormatter.format(d)
);

const formatTooltipValue = $derived(
  normalized
    ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    : (v: number) => currencyFormatter.format(v)
);
</script>

{#if series.length === 0}
  <div class="text-muted-foreground flex h-80 items-center justify-center rounded-lg border border-dashed text-sm">
    Select products to compare
  </div>
{:else if visibleSeries.length === 0}
  <div class="text-muted-foreground flex h-80 items-center justify-center rounded-lg border border-dashed text-sm">
    All series hidden. Click a legend item to show.
  </div>
{:else}
  <div class="rounded-lg border p-4">
    <div class="h-80">
      <LayerCake
        data={dummyData}
        x="x"
        y="y"
        xScale={scaleTime()}
        yScale={scaleLinear()}
        xDomain={xDomain}
        yDomain={yDomain}
        padding={{ top: 8, right: 8, bottom: 24, left: 56 }}>
        <Svg>
          <AxisX
            ticks={6}
            gridlines={false}
            tickMarks={false}
            format={(d) => d instanceof Date ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} />
          <AxisY
            ticks={5}
            gridlines
            format={formatYAxis} />

          {#each series as s (s.key)}
            {#if !chartInteractions.isSeriesHidden(s.key) && s.data.length >= 2}
              <CustomLine
                data={s.data}
                stroke={s.color}
                strokeWidth={2}
                opacity={chartInteractions.getSeriesOpacity(s.key, 0.9)} />
            {/if}
          {/each}

          <ComparisonTooltip {series} formatValue={formatTooltipValue} />
        </Svg>
      </LayerCake>
    </div>
  </div>
{/if}
