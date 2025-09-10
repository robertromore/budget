<script lang="ts">
  import { transformCurveInConfig } from '@budget-shared/utils';
  import { Rule } from 'layerchart';
  import type { ChartType } from '../config/chart-types';
  import {
    getComponentConfig,
    validateDataCompatibility
  } from '../config/layerchart-registry';

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
    class: className = "",
    threshold
  }: DynamicChartRendererProps = $props();

  // Get component configuration from registry
  const componentConfig = $derived.by(() => getComponentConfig(chartType));

  // Validate data compatibility
  const validation = $derived.by(() => validateDataCompatibility(chartType, data));

  // Prepare component props
  const componentProps = $derived.by(() => {
    if (!componentConfig) return {};

    // Transform curve strings to functions if needed
    const transformedConfig = transformCurveInConfig(config);

    const baseProps: Record<string, any> = {
      data,
      class: className,
      ...transformedConfig
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
  const ComponentToRender = $derived.by(() => {
    const config = componentConfig;
    return config?.component || null;
  });
</script>

{#if !componentConfig}
  <div class="flex items-center justify-center h-full">
    <p class="text-muted-foreground">Unsupported chart type: {chartType}</p>
  </div>
{:else if !validation.isValid}
  <div class="flex items-center justify-center h-full">
    <div class="text-center space-y-2">
      <p class="text-destructive font-medium">Data Validation Error</p>
      {#each validation.errors as error}
        <p class="text-sm text-muted-foreground">{error}</p>
      {/each}
    </div>
  </div>
{:else if ComponentToRender}
  {#if threshold?.enabled && ['line', 'area', 'spline'].includes(chartType)}
    <!-- Threshold configuration with proper defaults -->
    {@const thresholdConfig = {
      value: threshold.value ?? 0,
      aboveColor: threshold.aboveColor ?? 'hsl(var(--chart-1))', // Green for positive
      belowColor: threshold.belowColor ?? 'hsl(var(--chart-2))', // Red for negative
      aboveOpacity: threshold.aboveOpacity ?? 0.2,
      belowOpacity: threshold.belowOpacity ?? 0.2,
      showLine: threshold.showLine ?? true,
      lineColor: threshold.lineColor ?? 'hsl(var(--muted-foreground))',
      lineStyle: threshold.lineStyle ?? 'dashed',
      lineOpacity: threshold.lineOpacity ?? 0.5,
      lineWidth: threshold.lineWidth ?? 1
    }}

    {@const transformedConfig = transformCurveInConfig(config)}

    <!-- Render the main chart on top of threshold areas -->
    {@const Component = ComponentToRender}
    {#if Component}
      {#if chartType === 'area'}
        <!-- Area chart with transparency to show threshold colors underneath -->
        <Component
          {...componentProps}
          {...transformedConfig}
        />
      {:else if chartType === 'line' || chartType === 'spline'}
        <!-- Line/Spline charts render normally with no fill -->
        <Component
          {...componentProps}
          {...transformedConfig}
          fill="none"
        />
      {/if}
    {/if}

    <!-- Render threshold line if enabled -->
    {#if thresholdConfig.showLine}
      <Rule
        y={thresholdConfig.value}
        strokeWidth={thresholdConfig.lineWidth}
        stroke={thresholdConfig.lineColor}
        opacity={thresholdConfig.lineOpacity}
        class="threshold-line {thresholdConfig.lineStyle === 'dashed' ? 'stroke-dasharray-4' : thresholdConfig.lineStyle === 'dotted' ? 'stroke-dasharray-2' : ''}"
      />
    {/if}
  {:else if isMultiSeries && seriesData.length > 0}
    <!-- Multi-series rendering -->
    {#each seriesData as series, index}
      {@const seriesColor = seriesColors[index % seriesColors.length] || 'hsl(var(--chart-1))'}
      {@const seriesProps = transformCurveInConfig({
        ...componentProps,
        data: series,
        fill: ['line', 'spline'].includes(chartType) ? 'none' : seriesColor,
        stroke: seriesColor
      })}
      {@const Component = ComponentToRender}

      {#if Component}
        <Component {...seriesProps} />
      {/if}
    {/each}
  {:else}
    <!-- Single series rendering -->
    {@const Component = ComponentToRender}
    {#if Component}
      <Component {...componentProps} />
    {/if}
  {/if}
{:else}
  <div class="flex items-center justify-center h-full">
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
