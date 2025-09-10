<script lang="ts">
import type {ChartType} from '../config/chart-types';
import {getComponentConfig, validateDataCompatibility} from '../config/layerchart-registry';
import {transformCurveInConfig} from '$lib/utils/chart-curves';
import {Area, Bars, Line, Spline, Threshold, Rule} from 'layerchart';

interface DynamicChartRendererProps {
  chartType: ChartType;
  data: any[];
  config?: Record<string, any>;
  seriesData?: any[];
  seriesColors?: string[];
  isMultiSeries: boolean;
  class?: string;
  threshold?: {
    enabled?: boolean;
    value?: number;
    aboveColor?: string;
    belowColor?: string;
    aboveOpacity?: number;
    belowOpacity?: number;
    showLine?: boolean;
    lineColor?: string;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    lineOpacity?: number;
    lineWidth?: number;
  };
}

let {
  chartType,
  data,
  config = {},
  seriesData = [],
  seriesColors = [],
  isMultiSeries,
  class: className = '',
  threshold,
}: DynamicChartRendererProps = $props();

// Get component configuration from registry
const componentConfig = $derived.by(() => getComponentConfig(chartType));

// Validate data compatibility
const validation = $derived(() => validateDataCompatibility(chartType, data));

// Prepare component props
const componentProps = $derived(() => {
  if (!componentConfig) return {};

  // Transform curve strings to functions if needed
  const transformedConfig = transformCurveInConfig(config);

  const baseProps: Record<string, any> = {
    data,
    class: className,
    ...transformedConfig,
  };

  // Add color props if available
  if (seriesColors.length > 0) {
    if (isMultiSeries && seriesColors.length > 1) {
      // Multi-series coloring handled by parent
    } else {
      // Only set fill/stroke if not explicitly set in config
      if (transformedConfig['fill'] === undefined) {
        baseProps['fill'] = seriesColors[0];
      }
      if (transformedConfig['stroke'] === undefined) {
        baseProps['stroke'] = seriesColors[0];
      }
    }
  }

  return baseProps;
});

// Get the actual component to render
const ComponentToRender = $derived(() => {
  const config = componentConfig;
  return config?.component || null;
});
</script>

{#if !componentConfig}
  <div class="flex h-full items-center justify-center">
    <p class="text-muted-foreground">Unsupported chart type: {chartType}</p>
  </div>
{:else if !validation().isValid}
  <div class="flex h-full items-center justify-center">
    <div class="space-y-2 text-center">
      <p class="text-destructive font-medium">Data Validation Error</p>
      {#each validation().errors as error}
        <p class="text-muted-foreground text-sm">{error}</p>
      {/each}
    </div>
  </div>
{:else if ComponentToRender()}
  {#if threshold?.enabled && ['line', 'area', 'bar', 'spline', 'threshold'].includes(chartType)}
    <!-- Threshold gradient rendering for line, area, bar, and spline charts -->
    {@const thresholdConfig = {
      value: threshold.value ?? 0,
      aboveColor: threshold.aboveColor ?? 'hsl(142 71% 45%)',
      belowColor: threshold.belowColor ?? 'hsl(350 89% 60%)',
      aboveOpacity: threshold.aboveOpacity ?? 0.3,
      belowOpacity: threshold.belowOpacity ?? 0.3,
      showLine: threshold.showLine ?? true,
      lineColor: threshold.lineColor ?? 'hsl(var(--muted-foreground))',
      lineStyle: threshold.lineStyle ?? 'dashed',
      lineOpacity: threshold.lineOpacity ?? 0.5,
      lineWidth: threshold.lineWidth ?? 1,
    }}

    {@const transformedConfig = transformCurveInConfig(config)}

    <!-- Render threshold areas with gradient effect -->
    <Threshold
      y={thresholdConfig.value}
      curve={transformedConfig['curve']}
      defined={(d) => d.y !== null && d.y !== undefined}>
      {#snippet above({curve, defined})}
        {#if chartType === 'area' || chartType === 'threshold'}
          <!-- Area chart: fill above threshold -->
          <Area
            fill={thresholdConfig.aboveColor}
            fillOpacity={thresholdConfig.aboveOpacity}
            class="threshold-above"
            {...curve ? {curve} : {}}
            {...defined ? {defined} : {}} />
        {:else if chartType === 'bar'}
          <!-- Bar chart: color bars above threshold -->
          <Bars
            fill={thresholdConfig.aboveColor}
            fillOpacity={1}
            class="threshold-above"
            {...defined ? {defined} : {}}
            {...componentProps()} />
        {:else if chartType === 'line' || chartType === 'spline'}
          <!-- Line/Spline: area fill above threshold -->
          <Area
            fill={thresholdConfig.aboveColor}
            fillOpacity={thresholdConfig.aboveOpacity}
            stroke="none"
            class="threshold-above"
            {...curve ? {curve} : {}}
            {...defined ? {defined} : {}} />
        {/if}
      {/snippet}

      {#snippet below({curve, defined})}
        {#if chartType === 'area' || chartType === 'threshold'}
          <!-- Area chart: fill below threshold -->
          <Area
            fill={thresholdConfig.belowColor}
            fillOpacity={thresholdConfig.belowOpacity}
            class="threshold-below"
            {...curve ? {curve} : {}}
            {...defined ? {defined} : {}} />
        {:else if chartType === 'bar'}
          <!-- Bar chart: color bars below threshold -->
          <Bars
            fill={thresholdConfig.belowColor}
            fillOpacity={1}
            class="threshold-below"
            {...defined ? {defined} : {}}
            {...componentProps()} />
        {:else if chartType === 'line' || chartType === 'spline'}
          <!-- Line/Spline: area fill below threshold -->
          <Area
            fill={thresholdConfig.belowColor}
            fillOpacity={thresholdConfig.belowOpacity}
            stroke="none"
            class="threshold-below"
            {...curve ? {curve} : {}}
            {...defined ? {defined} : {}} />
        {/if}
      {/snippet}
    </Threshold>

    <!-- Render the actual chart line/bars on top -->
    {#if chartType === 'line'}
      {@const Component = ComponentToRender()}
      {#if Component}
        <Component {...componentProps()} />
      {/if}
    {:else if chartType === 'spline'}
      {@const Component = ComponentToRender()}
      {#if Component}
        <Component {...componentProps()} />
      {/if}
    {:else if chartType === 'bar'}
      <!-- Bar outlines for visibility -->
      <Bars {...componentProps()} fillOpacity={0.8} />
    {/if}

    <!-- Render threshold line if enabled -->
    {#if thresholdConfig.showLine}
      <Rule
        y={thresholdConfig.value}
        strokeWidth={thresholdConfig.lineWidth}
        stroke={thresholdConfig.lineColor}
        opacity={thresholdConfig.lineOpacity}
        class="threshold-line {thresholdConfig.lineStyle === 'dashed'
          ? 'stroke-dasharray-4'
          : thresholdConfig.lineStyle === 'dotted'
            ? 'stroke-dasharray-2'
            : ''}" />
    {/if}
  {:else if isMultiSeries && seriesData.length > 0}
    <!-- Multi-series rendering -->
    {#each seriesData as series, index}
      {@const seriesColor = seriesColors[index % seriesColors.length] || 'hsl(var(--chart-1))'}
      {@const seriesProps = transformCurveInConfig({
        ...componentProps(),
        data: series,
        fill: ['line', 'spline'].includes(chartType) ? 'none' : seriesColor,
        stroke: seriesColor,
      })}
      {@const Component = ComponentToRender()}

      {#if Component}
        <Component {...seriesProps} />
      {/if}
    {/each}
  {:else}
    <!-- Single series rendering -->
    {@const Component = ComponentToRender()}
    {#if Component}
      <Component {...componentProps()} />
    {/if}
  {/if}
{:else}
  <div class="flex h-full items-center justify-center">
    <p class="text-muted-foreground">Component not available: {chartType}</p>
  </div>
{/if}

<style>
:global(.stroke-dasharray-4) {
  stroke-dasharray: 4 4;
}

:global(.stroke-dasharray-2) {
  stroke-dasharray: 2 2;
}
</style>
