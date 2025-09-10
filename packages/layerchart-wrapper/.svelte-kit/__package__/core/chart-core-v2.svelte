<script lang="ts">
  import { calculateOptimalOpacity, createThemeDetector } from '@budget-shared/utils/accessibility-colors';
  import { chartFormatters } from '@budget-shared/utils/chart-formatters';
  import type { ChartProps } from '../config/chart-config';
  import {
    AreaChart,
    LineChart,
    BarChart,
    ScatterChart,
    LinearGradient,
    Area,
    Line,
    Bars,
    Spline,
    Points,
    Rule,
    Highlight,
    Tooltip
  } from 'layerchart';

  interface ChartCoreV2Props extends ChartProps {
    data: any[];
    chartType: string;
    seriesData?: any[];
    seriesColors?: string[];
    isMultiSeries?: boolean;
    config: any;
    class?: string;
  }

  let {
    data,
    chartType,
    seriesData = [],
    seriesColors = [],
    isMultiSeries = false,
    config,
    class: className = ''
  }: ChartCoreV2Props = $props();

  // Theme detection for accessibility
  const themeDetector = createThemeDetector();
  const currentColorScheme = $derived(seriesColors.length > 0 ? seriesColors : ['hsl(var(--chart-1))']);

  // Calculate accessibility-aware opacity
  const accessibleOpacity = $derived.by(() => {
    return calculateOptimalOpacity(currentColorScheme, themeDetector.mode);
  });

  // Determine effective colors
  const effectiveColors = $derived(() => {
    return seriesColors.length > 0 ? seriesColors : ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];
  });

  // Get the high-level chart component based on type
  const ChartComponent = $derived(() => {
    switch (chartType) {
      case 'area': return AreaChart;
      case 'line': return LineChart;
      case 'spline': return LineChart; // Use LineChart with curve for spline
      case 'bar': return BarChart;
      case 'scatter': return ScatterChart;
      default: return AreaChart;
    }
  });

  // Threshold configuration
  const thresholdConfig = $derived(() => {
    if (!config.threshold?.enabled) return null;
    return {
      value: config.threshold.value ?? 0,
      aboveColor: config.threshold.aboveColor ?? 'hsl(var(--chart-1))',
      belowColor: config.threshold.belowColor ?? 'hsl(var(--chart-2))',
      aboveOpacity: config.threshold.aboveOpacity ?? 0.2,
      belowOpacity: config.threshold.belowOpacity ?? 0.2,
      showLine: config.threshold.showLine ?? true,
      lineColor: config.threshold.lineColor ?? 'hsl(var(--muted-foreground))',
      lineStyle: config.threshold.lineStyle ?? 'dashed',
      lineOpacity: config.threshold.lineOpacity ?? 0.5,
      lineWidth: config.threshold.lineWidth ?? 1
    };
  });

  // Chart props for high-level components
  const chartProps = $derived(() => {
    const baseProps: any = {
      data,
      x: config.dataMapping?.x || 'x',
      y: config.dataMapping?.y || 'y',
      class: className,
      ...(config.axes?.x?.domain && { xDomain: config.axes.x.domain }),
      ...(config.axes?.y?.domain && { yDomain: config.axes.y.domain }),
      ...(config.axes?.y?.nice !== false && { yNice: true })
    };

    // Add chart-specific props
    if (chartType === 'spline') {
      baseProps.curve = 'curveCardinal'; // or other curve type
    }

    return baseProps;
  });
</script>

{#if !data || data.length === 0}
  <div class="flex items-center justify-center h-full">
    <p class="text-muted-foreground">No data available</p>
  </div>
{:else}
  {@const Component = ChartComponent()}
  
  <Component {...chartProps}>
    <!-- Marks snippet for threshold visualization -->
    {#snippet marks({ context })}
      {#if thresholdConfig && ['area', 'line', 'spline'].includes(chartType)}
        {@const thresholdValue = thresholdConfig.value}
        {@const thresholdOffset = context.yScale(thresholdValue) / (context.height + context.padding.bottom)}
        
        <LinearGradient
          stops={[
            [thresholdOffset, thresholdConfig.aboveColor],
            [thresholdOffset, thresholdConfig.belowColor],
          ]}
          units="userSpaceOnUse"
          vertical
        >
          {#snippet children({ gradient })}
            {#if chartType === 'area'}
              <Area
                y0={() => thresholdValue}
                line={{ stroke: gradient }}
                fill={gradient}
                fillOpacity={thresholdConfig.aboveOpacity}
              />
            {:else if chartType === 'line'}
              <Line stroke={gradient} strokeWidth={2} />
            {:else if chartType === 'spline'}
              <Spline stroke={gradient} strokeWidth={2} />
            {/if}
          {/snippet}
        </LinearGradient>
        
        <!-- Threshold line -->
        {#if thresholdConfig.showLine}
          <Rule
            y={thresholdValue}
            strokeWidth={thresholdConfig.lineWidth}
            stroke={thresholdConfig.lineColor}
            opacity={thresholdConfig.lineOpacity}
            class="threshold-line {thresholdConfig.lineStyle === 'dashed' ? 'stroke-dasharray-4' : thresholdConfig.lineStyle === 'dotted' ? 'stroke-dasharray-2' : ''}"
          />
        {/if}
      {:else}
        <!-- Default rendering without threshold -->
        {#if chartType === 'area'}
          <Area fill={effectiveColors[0]} fillOpacity={0.6} stroke={effectiveColors[0]} strokeWidth={1} />
        {:else if chartType === 'line'}
          <Line stroke={effectiveColors[0]} strokeWidth={2} fill="none" />
        {:else if chartType === 'spline'}
          <Spline stroke={effectiveColors[0]} strokeWidth={2} fill="none" />
        {:else if chartType === 'bar'}
          <Bars fill={effectiveColors[0]} />
        {:else if chartType === 'scatter'}
          <Points fill={effectiveColors[0]} r={4} />
        {/if}
      {/if}
    {/snippet}

    <!-- Highlight snippet for interactive effects -->
    {#snippet highlight({ context })}
      {#if config.interactions?.highlight?.enabled}
        <Highlight
          lines={{ 
            stroke: 'hsl(var(--muted-foreground))', 
            strokeWidth: 1,
            opacity: 0.6
          }}
          points={{
            fill: effectiveColors[0],
            stroke: 'white',
            strokeWidth: 2,
            r: 6
          }}
        />
      {/if}
    {/snippet}

    <!-- Tooltip snippet -->
    {#snippet tooltip({ context })}
      {#if config.interactions?.tooltip?.enabled}
        <Tooltip.Root>
          {#snippet children({ data })}
            {@const xValue = context.x(data)}
            {@const yValue = context.y(data)}
            
            <Tooltip.Header>
              {chartFormatters.formatTooltipLabel(xValue, config.dataMapping?.x)}
            </Tooltip.Header>
            <Tooltip.List>
              <Tooltip.Item
                label={config.dataMapping?.y || 'Value'}
                value={chartFormatters.formatTooltipValue(yValue, config.dataMapping?.y)}
                color={effectiveColors[0]}
              />
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      {/if}
    {/snippet}
  </Component>
{/if}

<style>
  :global(.stroke-dasharray-4) {
    stroke-dasharray: 4 4;
  }
  
  :global(.stroke-dasharray-2) {
    stroke-dasharray: 2 2;
  }
</style>