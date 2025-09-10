<!--
  Chart Core Component
  Phase 2A Refactoring: Pure chart rendering logic extracted from unified-chart.svelte

  This component handles the single responsibility of rendering LayerChart components
  with processed data from chart-data-processor. No data processing, no controls,
  just pure chart visualization.
-->

<script lang="ts">
import {
  Axis,
  Chart,
  Grid,
  Group,
  Highlight,
  Labels,
  Layer,
  Points,
  Rule,
  Svg,
  Tooltip,
} from 'layerchart';
import type {ResolvedChartConfig} from '../config/chart-config';
import {DEFAULT_STYLING_CONFIG, DEFAULT_INTERACTIONS_CONFIG} from '../config/chart-config';
import type {ChartType} from '../config/chart-types';
import type {ChartDataProcessor} from '../processors/chart-data-processor.svelte';
import ChartLegend from './chart-legend.svelte';
import ChartTooltip from './chart-tooltip.svelte';
import DynamicChartRenderer from './dynamic-chart-renderer.svelte';
import {calculateOptimalOpacity, createThemeDetector} from '$lib/utils/accessibility-colors';

// Props interface following Svelte 5 patterns
interface ChartCoreProps {
  // Processed data from chart-data-processor
  processor: ChartDataProcessor;

  // Chart configuration
  chartType: ChartType;
  config: ResolvedChartConfig & {
    type: ChartType;
    data: any[];
    resolvedColors: string[];
  };

  // View mode support
  viewMode?: 'combined' | 'side-by-side' | 'stacked' | 'overlaid';
  viewModeData?: {
    income?: any[];
    expenses?: any[];
    combined?: any[];
  };

  // Additional options
  selectedCurve?: string;
  legendTitle?: string;
  yFieldLabels?: string[];

  // Crosshair options
  showCrosshair?: boolean;
  crosshairAxis?: 'x' | 'y' | 'both' | 'none';
  crosshairStyle?: 'solid' | 'dashed' | 'dotted';
  crosshairOpacity?: number;

  // Highlight options
  showHighlightPoints?: boolean;
  highlightPointRadius?: number;

  // Styling
  class?: string;
}

let {
  processor,
  chartType,
  config,
  viewMode = 'combined',
  viewModeData,
  selectedCurve,
  legendTitle,
  yFieldLabels,
  showCrosshair = DEFAULT_INTERACTIONS_CONFIG.crosshair.enabled,
  crosshairAxis = DEFAULT_INTERACTIONS_CONFIG.crosshair.axis,
  crosshairStyle = DEFAULT_INTERACTIONS_CONFIG.crosshair.style,
  crosshairOpacity = DEFAULT_INTERACTIONS_CONFIG.crosshair.opacity,
  showHighlightPoints = DEFAULT_INTERACTIONS_CONFIG.highlight.showPoints,
  highlightPointRadius = DEFAULT_INTERACTIONS_CONFIG.highlight.pointRadius,
  class: className = '',
}: ChartCoreProps = $props();

// Extract frequently used values from processor
const {
  chartData,
  isMultiSeries,
  legendItems,
  seriesData,
  bandScale,
  incomeBandScale,
  expensesBandScale,
  effectiveColors,
  isChartCircular,
  isChartHierarchical,
  dataAccessors,
} = $derived(processor);

// Theme detection for accessibility-aware opacity calculations
const themeDetector = createThemeDetector();

// Map color scheme from effectiveColors (simplified mapping)
const currentColorScheme = $derived.by(() => {
  const primaryColor = effectiveColors[0];
  if (!primaryColor) return 'default';

  if (primaryColor.includes('22c55e') || primaryColor.includes('green')) return 'green';
  if (primaryColor.includes('f97316') || primaryColor.includes('orange')) return 'orange';
  if (primaryColor.includes('ef4444') || primaryColor.includes('red')) return 'red';
  if (primaryColor.includes('a855f7') || primaryColor.includes('purple')) return 'purple';
  return 'default'; // blue
});

// Calculate accessibility-aware opacity for crosshair
const accessibleCrosshairOpacity = $derived.by(() => {
  return calculateOptimalOpacity(currentColorScheme, themeDetector.mode);
});

// Determine if we should show the legend
const showLegend = $derived(
  Boolean(
    config.styling.legend.show &&
      (isMultiSeries || isChartCircular || (yFieldLabels && yFieldLabels.length > 1))
  )
);

// Calculate axis tick filtering for large datasets
const xAxisTicks = $derived.by(() => {
  if (chartData.length > 8) {
    return chartData
      .filter((_, i) => i % Math.ceil(chartData.length / 4) === 0)
      .map((d) => (typeof d === 'object' && 'x' in d ? d.x : ''));
  }
  return undefined;
});
</script>

{#if viewMode === 'side-by-side' && viewModeData?.income && viewModeData?.expenses}
  <!-- Side-by-side view: separate charts for income and expenses -->
  <div class="grid h-full grid-cols-1 gap-4 md:grid-cols-2 {className}">
    <!-- Income Chart -->
    <div class="h-full">
      <h4 class="mb-2 text-center text-sm font-medium">Income</h4>
      <Chart
        data={viewModeData.income}
        {...!isChartCircular && !isChartHierarchical
          ? {
              x: dataAccessors.x || 'x',
              y: dataAccessors.y || 'y',
              ...(config.axes.y.nice ? {yNice: config.axes.y.nice} : {}),
              ...(config.axes.x.nice ? {xNice: config.axes.x.nice} : {}),
              ...(incomeBandScale ? {xScale: incomeBandScale} : {}),
            }
          : {
              ...dataAccessors,
              ...(isChartCircular && effectiveColors.length > 0
                ? {
                    cRange: [effectiveColors[0] || 'hsl(var(--chart-1))'],
                  }
                : {}),
            }}
        {...config.styling.dimensions.padding ? {padding: config.styling.dimensions.padding} : {}}>
        <!-- Tooltip Context for Income Chart -->
        <Tooltip.Context mode="bisect-x">
          <Svg>
            {#if !isChartCircular && !isChartHierarchical}
              {#if config.axes.y.show}
                <Axis
                  placement="left"
                  tickLabelProps={{
                    'font-size': config.axes.y.fontSize || '0.75rem',
                    fill: config.axes.y.fontColor || 'hsl(var(--muted-foreground))',
                  }}
                  {...config.axes.y.format ? {format: config.axes.y.format} : {}} />
              {/if}
              {#if config.axes.x.show}
                <Axis
                  placement="bottom"
                  tickLabelProps={{
                    'font-size': config.axes.x.fontSize || '0.75rem',
                    fill: config.axes.x.fontColor || 'hsl(var(--muted-foreground))',
                  }}
                  tickFormat={config.axes.x.format} />
              {/if}
            {/if}

            <!-- Grid lines for Income chart -->
            {#if !isChartCircular && !isChartHierarchical && config.styling.grid.show}
              <Grid
                x={config.styling.grid.vertical ?? false}
                y={config.styling.grid.horizontal ?? true}
                classes={{
                  line: 'stroke-border',
                }}
                style="opacity: {config.styling.grid.opacity ?? 0.5}" />
            {/if}

            {#if isChartCircular}
              <Group center>
                <DynamicChartRenderer
                  {chartType}
                  data={viewModeData.income}
                  config={{
                    padding: chartType === 'bar' ? 4 : undefined,
                    fillOpacity: chartType === 'area' ? 0.6 : undefined,
                    strokeWidth: ['line', 'spline', 'threshold'].includes(chartType)
                      ? 2
                      : undefined,
                    fill: ['line', 'spline'].includes(chartType) ? 'none' : undefined,
                    stroke: ['line', 'spline'].includes(chartType)
                      ? effectiveColors[0] || 'hsl(var(--chart-1))'
                      : undefined,
                    curve:
                      ['line', 'spline', 'area'].includes(chartType) &&
                      config.controls.allowCurveChange
                        ? selectedCurve
                        : undefined,
                    innerRadius: chartType === 'pie' ? 0 : chartType === 'arc' ? 40 : undefined,
                    outerRadius: chartType === 'pie' ? 80 : chartType === 'arc' ? 120 : undefined,
                  }}
                  seriesData={[]}
                  seriesColors={[effectiveColors[0] || 'hsl(var(--chart-1))']}
                  isMultiSeries={false} />
              </Group>
            {:else}
              <DynamicChartRenderer
                {chartType}
                data={viewModeData.income}
                config={{
                  padding: chartType === 'bar' ? 4 : undefined,
                  fillOpacity: chartType === 'area' ? 0.6 : undefined,
                  strokeWidth: ['line', 'spline', 'threshold'].includes(chartType) ? 2 : undefined,
                  fill: ['line', 'spline'].includes(chartType) ? 'none' : undefined,
                  stroke: ['line', 'spline'].includes(chartType)
                    ? effectiveColors[0] || 'hsl(var(--chart-1))'
                    : undefined,
                  curve:
                    ['line', 'spline', 'area'].includes(chartType) &&
                    config.controls.allowCurveChange
                      ? selectedCurve
                      : undefined,
                  innerRadius: chartType === 'pie' ? 0 : chartType === 'arc' ? 40 : undefined,
                  outerRadius: chartType === 'pie' ? 80 : chartType === 'arc' ? 120 : undefined,
                }}
                seriesData={[]}
                seriesColors={[effectiveColors[0] || 'hsl(var(--chart-1))']}
                isMultiSeries={false} />
            {/if}

            <!-- Interactive Hover Effects for Income Chart -->
            {#if config.interactions?.highlight?.enabled && config.interactions?.tooltip?.enabled}
              {@const highlight = config.interactions.highlight}
              <Highlight
                axis={crosshairAxis === 'none' ? 'none' : crosshairAxis}
                points={showHighlightPoints !== false
                  ? {
                      r: highlightPointRadius ?? DEFAULT_STYLING_CONFIG.points.radius ?? 6,
                      fill: effectiveColors[0] || 'hsl(var(--chart-1))',
                      stroke: 'white',
                      strokeWidth: 2,
                    }
                  : false}
                lines={highlight.showLines !== false
                  ? {
                      stroke: 'hsl(var(--muted-foreground))',
                      strokeWidth: 1,
                      class:
                        crosshairStyle === 'dashed'
                          ? '[stroke-dasharray:5,3]'
                          : crosshairStyle === 'dotted'
                            ? '[stroke-dasharray:2,2]'
                            : '[stroke-dasharray:none]',
                      opacity: 0.6,
                    }
                  : false} />
            {/if}

            <!-- Points for income chart -->
            {#if config.styling.points?.show && ['line', 'spline'].includes(chartType)}
              {@const pointColor = effectiveColors[0] || 'hsl(var(--chart-1))'}
              <Points
                data={viewModeData.income}
                r={config.styling.points.radius ?? DEFAULT_STYLING_CONFIG.points.radius ?? 6}
                fill={config.styling.points.fill === 'auto'
                  ? pointColor
                  : config.styling.points.fill || pointColor}
                stroke={config.styling.points.stroke === 'auto'
                  ? pointColor
                  : config.styling.points.stroke || pointColor}
                strokeWidth={config.styling.points.strokeWidth || 1}
                fillOpacity={config.styling.points.fillOpacity || 1.0} />
            {/if}
          </Svg>

          <ChartTooltip
            config={config.interactions.tooltip}
            label="Income"
            colors={effectiveColors}
            viewModeLabel="Income" />
        </Tooltip.Context>
      </Chart>
    </div>

    <!-- Expenses Chart -->
    <div class="h-full">
      <h4 class="mb-2 text-center text-sm font-medium">Expenses</h4>
      <Chart
        data={viewModeData.expenses}
        {...!isChartCircular && !isChartHierarchical
          ? {
              x: dataAccessors.x || 'x',
              y: dataAccessors.y || 'y',
              ...(config.axes.y.nice ? {yNice: config.axes.y.nice} : {}),
              ...(config.axes.x.nice ? {xNice: config.axes.x.nice} : {}),
              ...(expensesBandScale ? {xScale: expensesBandScale} : {}),
            }
          : {
              ...dataAccessors,
              ...(isChartCircular && effectiveColors.length > 0
                ? {
                    cRange: [effectiveColors[1] || 'hsl(var(--chart-2))'],
                  }
                : {}),
            }}
        {...config.styling.dimensions.padding ? {padding: config.styling.dimensions.padding} : {}}>
        <!-- Tooltip Context for Expenses Chart -->
        <Tooltip.Context mode="bisect-x">
          <Svg>
            {#if !isChartCircular && !isChartHierarchical}
              {#if config.axes.y.show}
                <Axis
                  placement="left"
                  tickLabelProps={{
                    'font-size': config.axes.y.fontSize || '0.75rem',
                    fill: config.axes.y.fontColor || 'hsl(var(--muted-foreground))',
                  }} />
              {/if}
              {#if config.axes.x.show}
                <Axis
                  placement="bottom"
                  tickLabelProps={{
                    'font-size': config.axes.x.fontSize || '0.75rem',
                    fill: config.axes.x.fontColor || 'hsl(var(--muted-foreground))',
                  }} />
              {/if}
            {/if}

            <!-- Grid lines for Expenses chart -->
            {#if !isChartCircular && !isChartHierarchical && config.styling.grid.show}
              <Grid
                x={config.styling.grid.vertical ?? false}
                y={config.styling.grid.horizontal ?? true}
                classes={{
                  line: 'stroke-border',
                }}
                style="opacity: {config.styling.grid.opacity ?? 0.5}" />
            {/if}

            {#if isChartCircular}
              <Group center>
                <DynamicChartRenderer
                  {chartType}
                  data={viewModeData.expenses}
                  config={{
                    padding: chartType === 'bar' ? 4 : undefined,
                    fillOpacity: chartType === 'area' ? 0.6 : undefined,
                    strokeWidth: ['line', 'spline', 'threshold'].includes(chartType)
                      ? 2
                      : undefined,
                    fill: ['line', 'spline'].includes(chartType) ? 'none' : undefined,
                    stroke: ['line', 'spline'].includes(chartType)
                      ? effectiveColors[1] || 'hsl(var(--chart-2))'
                      : undefined,
                    curve:
                      ['line', 'spline', 'area'].includes(chartType) &&
                      config.controls.allowCurveChange
                        ? selectedCurve
                        : undefined,
                    innerRadius: chartType === 'pie' ? 0 : chartType === 'arc' ? 40 : undefined,
                    outerRadius: chartType === 'pie' ? 80 : chartType === 'arc' ? 120 : undefined,
                  }}
                  seriesData={[]}
                  seriesColors={[effectiveColors[1] || 'hsl(var(--chart-2))']}
                  isMultiSeries={false} />
              </Group>
            {:else}
              <DynamicChartRenderer
                {chartType}
                data={viewModeData.expenses}
                config={{
                  padding: chartType === 'bar' ? 4 : undefined,
                  fillOpacity: chartType === 'area' ? 0.6 : undefined,
                  strokeWidth: ['line', 'spline', 'threshold'].includes(chartType) ? 2 : undefined,
                  fill: ['line', 'spline'].includes(chartType) ? 'none' : undefined,
                  stroke: ['line', 'spline'].includes(chartType)
                    ? effectiveColors[1] || 'hsl(var(--chart-2))'
                    : undefined,
                  curve:
                    ['line', 'spline', 'area'].includes(chartType) &&
                    config.controls.allowCurveChange
                      ? selectedCurve
                      : undefined,
                  innerRadius: chartType === 'pie' ? 0 : chartType === 'arc' ? 40 : undefined,
                  outerRadius: chartType === 'pie' ? 80 : chartType === 'arc' ? 120 : undefined,
                }}
                seriesData={[]}
                seriesColors={[effectiveColors[1] || 'hsl(var(--chart-2))']}
                isMultiSeries={false} />
            {/if}

            <!-- Interactive Hover Effects for Expenses Chart -->
            {#if config.interactions?.highlight?.enabled && config.interactions?.tooltip?.enabled}
              {@const highlight = config.interactions.highlight}
              <Highlight
                axis={crosshairAxis === 'none' ? 'none' : crosshairAxis}
                points={showHighlightPoints !== false
                  ? {
                      r: highlightPointRadius ?? DEFAULT_STYLING_CONFIG.points.radius ?? 6,
                      fill: effectiveColors[1] || 'hsl(var(--chart-2))',
                      stroke: 'white',
                      strokeWidth: 2,
                    }
                  : false}
                lines={highlight.showLines !== false
                  ? {
                      stroke: 'hsl(var(--muted-foreground))',
                      strokeWidth: 1,
                      class:
                        crosshairStyle === 'dashed'
                          ? '[stroke-dasharray:5,3]'
                          : crosshairStyle === 'dotted'
                            ? '[stroke-dasharray:2,2]'
                            : '[stroke-dasharray:none]',
                      opacity: 0.6,
                    }
                  : false} />
            {/if}

            <!-- Points for expenses chart -->
            {#if config.styling.points?.show && ['line', 'spline'].includes(chartType)}
              {@const pointColor = effectiveColors[1] || 'hsl(var(--chart-2))'}
              <Points
                data={viewModeData.expenses}
                r={config.styling.points.radius ?? DEFAULT_STYLING_CONFIG.points.radius ?? 6}
                fill={config.styling.points.fill === 'auto'
                  ? pointColor
                  : config.styling.points.fill || pointColor}
                stroke={config.styling.points.stroke === 'auto'
                  ? pointColor
                  : config.styling.points.stroke || pointColor}
                strokeWidth={config.styling.points.strokeWidth || 1}
                fillOpacity={config.styling.points.fillOpacity || 1.0} />
            {/if}
          </Svg>

          <ChartTooltip
            config={config.interactions.tooltip}
            label="Expenses"
            colors={effectiveColors}
            viewModeLabel="Expenses" />
        </Tooltip.Context>
      </Chart>
    </div>
  </div>
{:else}
  <!-- Combined view: single chart with all data -->
  <div class={className}>
    <Chart
      data={chartData}
      {...!isChartCircular && !isChartHierarchical
        ? {
            x: dataAccessors.x || 'x',
            y: dataAccessors.y || 'y',
            ...(isMultiSeries
              ? {
                  c: (d: any) => d.series || d.category,
                  cDomain: legendItems,
                  cRange: effectiveColors.slice(0, legendItems.length),
                }
              : {}),
            ...(config.axes.y.nice ? {yNice: config.axes.y.nice} : {}),
            ...(config.axes.x.nice ? {xNice: config.axes.x.nice} : {}),
            ...(config.axes.y.domain &&
            (config.axes.y.domain[0] !== null || config.axes.y.domain[1] !== null)
              ? {yDomain: config.axes.y.domain}
              : {}),
            ...(config.axes.x.domain &&
            (config.axes.x.domain[0] !== null || config.axes.x.domain[1] !== null)
              ? {xDomain: config.axes.x.domain}
              : {}),
            ...(bandScale ? {xScale: bandScale} : {}),
          }
        : {
            // For circular and hierarchical charts, use appropriate data accessors
            ...dataAccessors,
            // For pie charts, configure color scale with cRange
            ...(isChartCircular && effectiveColors.length > 0
              ? {
                  c: (d: any) => d.label || d.category || d.name,
                  cDomain: chartData
                    .map((d: any) => d.label || d.category || d.name)
                    .filter((v, i, a) => a.indexOf(v) === i),
                  cRange: effectiveColors,
                }
              : {}),
          }}
      {...config.styling.dimensions.padding ? {padding: config.styling.dimensions.padding} : {}}>
      <!-- Tooltip Context wraps all chart content -->
      <Tooltip.Context
        mode={isChartCircular ? 'manual' : 'bisect-x'}
        {...isChartCircular ? {radius: 40} : {}}>
        <Layer type="svg">
          <!-- Axes for non-circular and non-hierarchical charts -->
          {#if !isChartCircular && !isChartHierarchical}
            {#if config.axes.y.show}
              <Axis
                placement="left"
                tickLabelProps={{
                  'font-size': config.axes.y.fontSize || '0.75rem',
                  fill: config.axes.y.fontColor || 'hsl(var(--muted-foreground))',
                }}
                {...config.axes.y.format ? {format: config.axes.y.format} : {}} />
            {/if}
            {#if config.axes.x.show}
              <Axis
                placement="bottom"
                tickLabelProps={{
                  'font-size': config.axes.x.fontSize || '0.75rem',
                  fill: config.axes.x.fontColor || 'hsl(var(--muted-foreground))',
                  ...(config.axes.x.rotateLabels ? {rotate: -45, textAnchor: 'end'} : {}),
                }}
                tickFormat={config.axes.x.format}
                {...xAxisTicks ? {ticks: xAxisTicks} : {}} />
            {/if}
          {/if}

          <!-- Grid lines for non-circular and non-hierarchical charts -->
          {#if !isChartCircular && !isChartHierarchical && config.styling.grid.show}
            <Grid
              x={config.styling.grid.vertical ?? false}
              y={config.styling.grid.horizontal ?? true}
              classes={{
                line: 'stroke-border',
              }}
              style="opacity: {config.styling.grid.opacity ?? 0.5}" />
          {/if}

          <!-- Dynamic chart rendering using the component registry -->
          {#if isChartCircular}
            <!-- Center pie/arc charts using Group component -->
            <Group center>
              <DynamicChartRenderer
                {chartType}
                data={chartData}
                config={{
                  padding: chartType === 'bar' ? 4 : undefined,
                  fillOpacity: chartType === 'area' ? 0.6 : undefined,
                  strokeWidth: ['line', 'spline', 'threshold'].includes(chartType) ? 2 : undefined,
                  fill: ['line', 'spline'].includes(chartType) ? 'none' : undefined,
                  stroke: ['line', 'spline'].includes(chartType)
                    ? effectiveColors[0] || 'hsl(var(--chart-1))'
                    : undefined,
                  curve:
                    ['line', 'spline', 'area', 'threshold'].includes(chartType) &&
                    config.controls.allowCurveChange
                      ? selectedCurve
                      : undefined,
                  r: chartType === 'scatter' ? 4 : undefined,
                  innerRadius: chartType === 'arc' ? 40 : chartType === 'pie' ? 0 : undefined,
                  outerRadius: chartType === 'arc' ? 150 : chartType === 'pie' ? 100 : undefined,
                  start:
                    chartType === 'calendar' && chartData.length > 0
                      ? new Date(
                          Math.min(
                            ...chartData.map((d) => {
                              if (typeof d === 'object' && 'x' in d) {
                                if (d.x instanceof Date) return d.x.getTime();
                                if (typeof d.x === 'string') return new Date(d.x).getTime();
                                if (typeof d.x === 'number') return d.x;
                              }
                              return new Date().getTime();
                            })
                          )
                        )
                      : undefined,
                  end:
                    chartType === 'calendar' && chartData.length > 0
                      ? new Date(
                          Math.max(
                            ...chartData.map((d) => {
                              if (typeof d === 'object' && 'x' in d) {
                                if (d.x instanceof Date) return d.x.getTime();
                                if (typeof d.x === 'string') return new Date(d.x).getTime();
                                if (typeof d.x === 'number') return d.x;
                              }
                              return new Date().getTime();
                            })
                          )
                        )
                      : undefined,
                }}
                {seriesData}
                seriesColors={effectiveColors}
                isMultiSeries={isMultiSeries || false}
                threshold={config.threshold} />
            </Group>
          {:else}
            <DynamicChartRenderer
              {chartType}
              data={chartData}
              config={{
                padding: chartType === 'bar' ? 4 : undefined,
                fillOpacity: chartType === 'area' ? 0.6 : undefined,
                strokeWidth: ['line', 'spline', 'threshold'].includes(chartType) ? 2 : undefined,
                fill: ['line', 'spline'].includes(chartType) ? 'none' : undefined,
                stroke: ['line', 'spline'].includes(chartType)
                  ? effectiveColors[0] || 'hsl(var(--chart-1))'
                  : undefined,
                curve:
                  ['line', 'spline', 'area', 'threshold'].includes(chartType) &&
                  config.controls.allowCurveChange
                    ? selectedCurve
                    : undefined,
                r: chartType === 'scatter' ? 4 : undefined,
                innerRadius: chartType === 'arc' ? 40 : chartType === 'pie' ? 0 : undefined,
                outerRadius: chartType === 'arc' ? 150 : chartType === 'pie' ? 100 : undefined,
                start:
                  chartType === 'calendar' && chartData.length > 0
                    ? new Date(
                        Math.min(
                          ...chartData.map((d) => {
                            if (typeof d === 'object' && 'x' in d) {
                              if (d.x instanceof Date) return d.x.getTime();
                              if (typeof d.x === 'string') return new Date(d.x).getTime();
                              if (typeof d.x === 'number') return d.x;
                            }
                            return new Date().getTime();
                          })
                        )
                      )
                    : undefined,
                end:
                  chartType === 'calendar' && chartData.length > 0
                    ? new Date(
                        Math.max(
                          ...chartData.map((d) => {
                            if (typeof d === 'object' && 'x' in d) {
                              if (d.x instanceof Date) return d.x.getTime();
                              if (typeof d.x === 'string') return new Date(d.x).getTime();
                              if (typeof d.x === 'number') return d.x;
                            }
                            return new Date().getTime();
                          })
                        )
                      )
                    : undefined,
              }}
              {seriesData}
              seriesColors={effectiveColors}
              isMultiSeries={isMultiSeries || false}
              threshold={config.threshold} />
          {/if}

          <!-- Points overlay for area charts and other types that support points -->
          {#if config.styling.points.show && ['area', 'line', 'spline'].includes(chartType)}
            {@const pointColor = effectiveColors[0] || 'hsl(var(--chart-1))'}
            <Points
              data={chartData}
              r={config.styling.points.radius ?? DEFAULT_STYLING_CONFIG.points.radius ?? 6}
              fill={config.styling.points.fill === 'auto'
                ? pointColor
                : config.styling.points.fill || pointColor}
              stroke={config.styling.points.stroke === 'auto'
                ? pointColor
                : config.styling.points.stroke || pointColor}
              strokeWidth={config.styling.points.strokeWidth ??
                DEFAULT_STYLING_CONFIG.points.strokeWidth ??
                1}
              fillOpacity={config.styling.points.fillOpacity || 1.0} />
          {/if}

          <!-- Interactive Hover Effects: Highlight component for line/ruler and points -->
          {#if showCrosshair && config.interactions?.highlight?.enabled && config.interactions?.tooltip?.enabled && !isChartCircular && !isChartHierarchical}
            <Highlight
              axis={crosshairAxis === 'none' ? 'none' : crosshairAxis}
              points={showHighlightPoints !== false
                ? {
                    r: highlightPointRadius || 6,
                    fill: effectiveColors[0] || 'hsl(var(--primary))',
                    stroke: 'white',
                    strokeWidth: 2,
                  }
                : false}
              lines={crosshairAxis !== 'none'
                ? {
                    stroke: effectiveColors[0] || '#334155',
                    strokeWidth: 1,
                    class:
                      crosshairStyle === 'dashed'
                        ? '[stroke-dasharray:5,3]'
                        : crosshairStyle === 'dotted'
                          ? '[stroke-dasharray:2,2]'
                          : '[stroke-dasharray:none]',
                    opacity: accessibleCrosshairOpacity,
                  }
                : false} />
          {/if}

          <!-- Points for line and spline charts -->
          {#if config.styling.points?.show && ['line', 'spline'].includes(chartType)}
            {#if isMultiSeries && seriesData.length > 0}
              <!-- Multi-series points -->
              {#each seriesData as series, index}
                {@const pointColor =
                  effectiveColors[index % effectiveColors.length] || 'hsl(var(--chart-1))'}
                <Points
                  data={series}
                  r={config.styling.points.radius ?? DEFAULT_STYLING_CONFIG.points.radius ?? 6}
                  fill={config.styling.points.fill === 'auto'
                    ? pointColor
                    : config.styling.points.fill || pointColor}
                  stroke={config.styling.points.stroke === 'auto'
                    ? pointColor
                    : config.styling.points.stroke || pointColor}
                  strokeWidth={config.styling.points.strokeWidth || 1}
                  fillOpacity={config.styling.points.fillOpacity || 1.0} />
              {/each}
            {:else}
              <!-- Single series points -->
              {@const pointColor = effectiveColors[0] || 'hsl(var(--chart-1))'}
              <Points
                data={chartData}
                r={config.styling.points.radius ?? DEFAULT_STYLING_CONFIG.points.radius ?? 6}
                fill={config.styling.points.fill === 'auto'
                  ? pointColor
                  : config.styling.points.fill || pointColor}
                stroke={config.styling.points.stroke === 'auto'
                  ? pointColor
                  : config.styling.points.stroke || pointColor}
                strokeWidth={config.styling.points.strokeWidth || 1}
                fillOpacity={config.styling.points.fillOpacity || 1.0} />
            {/if}
          {/if}

          <!-- Additional components for specific chart types -->
          {#if chartType === 'threshold'}
            <Rule />
          {/if}

          <!-- Annotations: Rules and Labels -->
          {#if config.annotations?.type === 'rules' || config.annotations?.type === 'both'}
            {#if config.annotations.rules?.show && config.annotations.rules?.values && config.annotations.rules.values.length > 0}
              <!-- Rules: Reference lines for thresholds, averages, etc. -->
              {#each config.annotations.rules.values as ruleValue}
                <Rule
                  y={ruleValue}
                  {...config.annotations.rules.class ? {class: config.annotations.rules.class} : {}}
                  {...config.annotations.rules.strokeWidth
                    ? {strokeWidth: config.annotations.rules.strokeWidth}
                    : {}}
                  {...config.annotations.rules.strokeDasharray
                    ? {style: `stroke-dasharray: ${config.annotations.rules.strokeDasharray}`}
                    : {}} />
              {/each}
            {/if}
          {/if}

          <!-- Labels: Data point value labels with priority order -->
          {#if !isChartCircular}
            <!-- Priority 1: User-controlled styling labels (when controls are enabled and labels are shown) -->
            {#if config.styling.labels?.show}
              <Labels
                data={chartData}
                x="x"
                y="y"
                format={config.styling.labels.format ||
                  ((d) => {
                    // Handle both object and primitive data formats
                    if (typeof d === 'object' && d !== null) {
                      // For object data, look for common value fields
                      return String(d.y ?? d.value ?? d.amount ?? d);
                    }
                    return String(d);
                  })}
                {...config.styling.labels.class ? {class: config.styling.labels.class} : {}}
                offset={config.styling.labels.offset?.y || 4}
                placement={config.styling.labels.placement || 'outside'} />
              <!-- Priority 2: Annotation-based labels (when styling labels are not active AND user hasn't explicitly disabled them) -->
            {:else if (config.annotations?.type === 'labels' || config.annotations?.type === 'both') && config.annotations?.labels?.show && config.styling.labels?.show !== false}
              <Labels
                data={chartData}
                x="x"
                y="y"
                format={config.annotations.labels.format ||
                  ((d) => {
                    // Handle both object and primitive data formats
                    if (typeof d === 'object' && d !== null) {
                      // For object data, look for common value fields
                      return String(d.y ?? d.value ?? d.amount ?? d);
                    }
                    return String(d);
                  })}
                {...config.annotations.labels.class ? {class: config.annotations.labels.class} : {}}
                offset={config.annotations.labels.offset?.y || 4}
                placement={config.annotations.labels.placement || 'outside'} />
            {/if}
          {/if}
        </Layer>

        <!-- Tooltip - Must be inside Tooltip.Context -->
        <ChartTooltip config={config.interactions.tooltip} colors={effectiveColors} />
      </Tooltip.Context>

      <!-- Legend -->
      <ChartLegend
        show={showLegend}
        {...legendTitle ? {title: legendTitle} : {}}
        position={config.styling.legend.position || 'top'}
        items={legendItems}
        colors={effectiveColors}
        variant="swatches" />
    </Chart>
  </div>
{/if}
