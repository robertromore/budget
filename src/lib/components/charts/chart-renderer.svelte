<script lang="ts">
  import {
    Chart,
    Svg,
    Bars,
    Area,
    Spline,
    Axis,
    Arc,
    Points,
    Pie,
    Hull,
    Labels,
    Rule,
    Grid,
    Legend,
    Threshold,
    Calendar
  } from 'layerchart';
  import { colorUtils } from '$lib/utils/colors';
  import type { ChartSeries, ChartType } from './chart-types';

  interface Props {
    data: any[];
    series: ChartSeries[];
    x?: string;
    y?: string | string[];
    padding?: { left?: number; right?: number; top?: number; bottom?: number };
    yDomain?: [number | null, number | null];
    xDomain?: [number | null, number | null];
    yNice?: boolean;
    xNice?: boolean;
    showLeftAxis?: boolean;
    showBottomAxis?: boolean;
    showRightAxis?: boolean;
    showTopAxis?: boolean;
    rotateBottomLabels?: boolean;
    showGrid?: boolean;
    showHorizontalGrid?: boolean;
    showVerticalGrid?: boolean;
    showRule?: boolean;
    chartLayoutType?: string;
    innerRadius?: number;
    outerRadius?: number;
    showLegend?: boolean;
    showLabels?: boolean;
  }

  let {
    data,
    series,
    x,
    y,
    padding = { left: 80, bottom: 80, top: 20, right: 30 },
    yDomain = [0, null],
    xDomain,
    yNice = true,
    xNice = false,
    showLeftAxis = true,
    showBottomAxis = true,
    showRightAxis = false,
    showTopAxis = false,
    rotateBottomLabels = true,
    showGrid = false,
    showHorizontalGrid = false,
    showVerticalGrid = false,
    showRule = false,
    chartLayoutType = 'cartesian',
    innerRadius,
    outerRadius,
    showLegend = false,
    showLabels = false
  }: Props = $props();

  // Helper to get color for series
  const getSeriesColor = (series: ChartSeries): string => {
    if (series.color) return series.color;
    if (series.colorIndex !== undefined) return colorUtils.getChartColor(series.colorIndex);
    return colorUtils.getChartColor(0);
  };

  // Check if any series is pie/arc type
  const isPieChart = $derived(series.some(s => s.type === 'pie' || s.type === 'arc'));
</script>

<Chart {data} {x} {y} {yNice} {yDomain} {padding}>
  <Svg>
    {#if !isPieChart}
      {#if showLeftAxis}
        <Axis placement="left" />
      {/if}
      {#if showBottomAxis}
        <Axis
          placement="bottom"
          tickLabelProps={rotateBottomLabels ? { rotate: -45, textAnchor: 'end' } : undefined}
          ticks={data.length > 8 ? data.filter((_, i) => i % Math.ceil(data.length / 4) === 0).map(d => d[x || 'x']) : undefined}
        />
      {/if}
    {/if}

    {#each series as s}
      {#if s.type === 'bar'}
        <Bars
          data={s.data}
          fill={s.fill || getSeriesColor(s)}
        />
      {:else if s.type === 'area'}
        <Area
          data={s.data}
          x={x}
          y={y || 'y'}
          fill={s.fill || getSeriesColor(s)}
          fillOpacity={s.fillOpacity || 0.6}
        />
      {:else if s.type === 'line'}
        <Spline
          data={s.data}
          stroke={s.stroke || getSeriesColor(s)}
          strokeWidth={s.strokeWidth || 2}
          fill="none"
        />
      {:else if s.type === 'scatter'}
        <Points
          data={s.data}
          fill={s.fill || getSeriesColor(s)}
          r={s.r || 3}
        />
      {:else if s.type === 'pie'}
        <Pie
          data={s.data}
          innerRadius={s.innerRadius || 0}
          outerRadius={s.outerRadius || 100}
        />
      {:else if s.type === 'arc'}
        <Pie
          data={s.data}
          innerRadius={s.innerRadius || 30}
          outerRadius={s.outerRadius || 100}
        />
      {:else if s.type === 'threshold'}
        <Threshold
          threshold={s.threshold || 0}
          fill={s.fill || getSeriesColor(s)}
        />
      {:else if s.type === 'hull'}
        <Hull
          fill={s.fill || getSeriesColor(s)}
          fillOpacity={s.fillOpacity || 0.3}
          stroke={s.stroke || getSeriesColor(s)}
        />
      {:else if s.type === 'calendar'}
        <Calendar
          fill={s.fill || getSeriesColor(s)}
        />
      {/if}
    {/each}

    {#if showGrid || showHorizontalGrid}
      <Grid />
    {/if}
    {#if showGrid || showVerticalGrid}
      <Grid />
    {/if}

    {#if showRule}
      <Rule />
    {/if}

    {#if showLabels}
      <Labels />
    {/if}
  </Svg>

  {#if showLegend}
    <Legend />
  {/if}
</Chart>