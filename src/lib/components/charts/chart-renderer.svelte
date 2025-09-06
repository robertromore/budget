<script lang="ts">
  import { colorUtils } from '$lib/utils/colors';
  import {
    Area,
    Axis,
    Bars,
    Calendar,
    Chart,
    Grid,
    Hull,
    Labels,
    Legend,
    Pie,
    Points,
    Rule,
    Spline,
    Svg,
    Threshold
  } from 'layerchart';
  import type { ChartSeries, ChartType } from './chart-types';

  interface Props {
    data: any[];
    series: ChartSeries[];
    x?: string | undefined;
    y?: string | string[] | undefined;
    padding?: { left?: number; right?: number; top?: number; bottom?: number };
    yDomain?: [number | null, number | null];
    xDomain?: [number | null, number | null] | undefined;
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
    innerRadius?: number | undefined;
    outerRadius?: number | undefined;
    showLegend?: boolean;
    showLabels?: boolean;
    chartType?: ChartType | undefined;
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
    showLabels = false,
    chartType
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

<Chart {data} {x} {y} {yNice} {xNice} {yDomain} {xDomain} {padding}>
  <Svg>
    {#if !isPieChart}
      {#if showLeftAxis}
        <Axis placement="left" />
      {/if}
      {#if showBottomAxis}
        <Axis
          placement="bottom"
          {...(rotateBottomLabels ? { tickLabelProps: { rotate: -45, textAnchor: 'end' } } : {})}
          {...(data.length > 8 ? { ticks: data.filter((_, i) => i % Math.ceil(data.length / 4) === 0).map(d => d[x || 'x']) } : {})}
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
          y={Array.isArray(y) ? y[0] : (y || 'y')}
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
          r={typeof s.r === 'function' ? 3 : (s.r || 3)}
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
        <Threshold />
      {:else if s.type === 'hull'}
        <Hull />
      {:else if s.type === 'calendar'}
        <Calendar
          start={new Date()}
          end={new Date()}
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
