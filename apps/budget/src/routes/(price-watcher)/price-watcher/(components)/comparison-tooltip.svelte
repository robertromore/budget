<script lang="ts">
/**
 * Custom tooltip for multi-product price comparison chart.
 * Searches each series independently since products have different check timestamps.
 */
import { getContext } from 'svelte';
import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
import type { Readable } from 'svelte/store';

interface SeriesData {
  key: string;
  label: string;
  color: string;
  data: Array<{ x: Date; y: number }>;
}

interface Props {
  series: SeriesData[];
  formatValue: (v: number) => string;
}

let { series, formatValue }: Props = $props();

interface LayerCakeContext {
  xScale: Readable<any>;
  yScale: Readable<any>;
  width: Readable<number>;
  height: Readable<number>;
}

const { xScale, yScale, width, height } = getContext<LayerCakeContext>('LayerCake');

let hoveredDate = $state<Date | null>(null);
let mouseX = $state(0);

function findClosest(data: Array<{ x: Date; y: number }>, target: Date) {
  let closest = data[0];
  let minDist = Infinity;
  for (const d of data) {
    const dist = Math.abs(d.x.getTime() - target.getTime());
    if (dist < minDist) {
      minDist = dist;
      closest = d;
    }
  }
  return closest;
}

function handleMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  hoveredDate = $xScale.invert(mouseX);
}

function handleMouseLeave() {
  hoveredDate = null;
}

const closestPoints = $derived.by(() => {
  if (!hoveredDate) return [];
  return series
    .filter((s) => !chartInteractions.isSeriesHidden(s.key) && s.data.length > 0)
    .map((s) => {
      const point = findClosest(s.data, hoveredDate!);
      return {
        key: s.key,
        label: s.label,
        color: s.color,
        point,
        cx: $xScale(point.x) as number,
        cy: $yScale(point.y) as number,
      };
    });
});

// Position the tooltip to avoid going off-screen
const tooltipX = $derived(mouseX > $width / 2 ? mouseX - 180 : mouseX + 12);
</script>

<g class="comparison-tooltip-layer" role="presentation">
  {#if $width > 0 && $height > 0}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <rect
      x={0}
      y={0}
      width={$width}
      height={$height}
      fill="transparent"
      onmousemove={handleMouseMove}
      onmouseleave={handleMouseLeave}
      style="cursor: crosshair;" />
  {/if}

  {#if hoveredDate && closestPoints.length > 0}
    <g style="pointer-events: none;">
      <!-- Vertical crosshair -->
      <line
        x1={mouseX}
        x2={mouseX}
        y1={0}
        y2={$height}
        class="stroke-muted-foreground/50"
        stroke-dasharray="4" />

      <!-- Dots per series -->
      {#each closestPoints as cp (cp.key)}
        <circle
          cx={cp.cx}
          cy={cp.cy}
          r={4}
          fill={cp.color}
          class="stroke-background"
          stroke-width={2} />
      {/each}

      <!-- Tooltip card -->
      <foreignObject
        x={tooltipX}
        y={8}
        width={170}
        height={closestPoints.length * 28 + 32}
        style="overflow: visible;">
        <div class="bg-popover border-border rounded-md border px-3 py-2 shadow-md">
          <div class="text-muted-foreground mb-1 text-[10px]">
            {hoveredDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {#each closestPoints as cp (cp.key)}
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="flex items-center gap-1.5 truncate">
                <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style="background-color: {cp.color};"></span>
                <span class="truncate">{cp.label}</span>
              </span>
              <span class="font-medium">{formatValue(cp.point.y)}</span>
            </div>
          {/each}
        </div>
      </foreignObject>
    </g>
  {/if}
</g>
