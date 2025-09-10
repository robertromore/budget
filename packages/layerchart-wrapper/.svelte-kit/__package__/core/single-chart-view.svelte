<!--
  Single Chart View Component
  Phase 2D Refactoring: Reusable single chart rendering component
  
  This component handles the rendering of a single chart instance,
  eliminating duplication between main view and side-by-side view.
-->

<script lang="ts">
  import {
    Axis,
    Chart,
    Grid,
    Group,
    Highlight,
    Labels,
    Points,
    Rule,
    Svg,
    Tooltip
  } from 'layerchart';
  import type { ResolvedChartConfig } from '../config/chart-config';
  import type { ChartType } from '../config/chart-types';
  import ChartTooltip from './chart-tooltip.svelte';
  import DynamicChartRenderer from './dynamic-chart-renderer.svelte';

  // Props interface following Svelte 5 patterns
  interface SingleChartViewProps {
    // Chart data
    data: any[];
    
    // Chart configuration
    chartType: ChartType;
    config: ResolvedChartConfig & {
      type: ChartType;
      data: any[];
      resolvedColors: string[];
    };
    
    // Scales and accessors
    bandScale?: any;
    dataAccessors: any;
    
    // Chart characteristics
    effectiveColors: string[];
    isChartCircular: boolean;
    isChartHierarchical: boolean;
    
    // Styling
    currentColorScheme: string;
    accessibleCrosshairOpacity: number;
    
    // Context
    viewModeLabel?: string; // For side-by-side views
    colors: string[];
    
    // Axis ticks (optional)
    xAxisTicks?: any[];
  }

  let { 
    data,
    chartType, 
    config,
    bandScale,
    dataAccessors,
    effectiveColors,
    isChartCircular,
    isChartHierarchical,
    currentColorScheme,
    accessibleCrosshairOpacity,
    viewModeLabel,
    colors,
    xAxisTicks
  }: SingleChartViewProps = $props();
</script>

<Chart
  {data}
  {...(!isChartCircular && !isChartHierarchical ? {
    x: dataAccessors.x || "x",
    y: dataAccessors.y || "y",
    ...(config.axes.y.nice ? { yNice: config.axes.y.nice } : {}),
    ...(config.axes.x.nice ? { xNice: config.axes.x.nice } : {}),
    ...(bandScale ? { xScale: bandScale } : {})
  } : {
    ...dataAccessors,
    ...(isChartCircular && effectiveColors.length > 0 ? {
      cRange: [effectiveColors[0] || 'hsl(var(--chart-1))']
    } : {})
  })}
  {...(config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {})}
>
  <!-- Tooltip Context -->
  <Tooltip.Context mode="bisect-x">
    <Svg>
      {#if !isChartCircular && !isChartHierarchical}
        {#if config.axes.y.show}
          <Axis
            placement="left"
            {...(config.axes.y.format ? { format: config.axes.y.format } : {})}
            {...(config.axes.y.nice ? { formatTicks: config.axes.y.format } : {})}
            {...(config.axes.y.fontSize ? { fontSize: config.axes.y.fontSize } : {})}
            {...(config.axes.y.title ? { title: config.axes.y.title } : {})}
            class={config.axes.y.class}
          />
        {/if}
        
        {#if config.axes.x.show}
          <Axis
            placement="bottom"
            {...(config.axes.x.format ? { format: config.axes.x.format } : {})}
            {...(xAxisTicks ? { ticks: xAxisTicks } : {})}
            {...(config.axes.x.rotateLabels ? { rotate: -45 } : {})}
            {...(config.axes.x.fontSize ? { fontSize: config.axes.x.fontSize } : {})}
            {...(config.axes.x.title ? { title: config.axes.x.title } : {})}
            class={config.axes.x.class}
          />
        {/if}
      {/if}

      {#if config.styling.grid.show && !isChartCircular}
        <Grid
          horizontal={config.styling.grid.horizontal}
          vertical={config.styling.grid.vertical}
          opacity={config.styling.grid.opacity}
        />
      {/if}

      <!-- Render main chart components -->
      {#if isChartCircular}
        <Group center={true}>
          <DynamicChartRenderer 
            {chartType} 
            {data}
            colors={effectiveColors}
            {config}
          />
        </Group>
      {:else}
        <DynamicChartRenderer 
          {chartType} 
          {data}
          colors={effectiveColors}
          {config}
        />
      {/if}

      {#if config.styling.points.show}
        <Points
          class="fill-white stroke-current transition-all duration-200"
          radius={config.styling.points.radius}
          strokeWidth={config.styling.points.strokeWidth}
          fillOpacity={config.styling.points.fillOpacity}
          strokeOpacity={config.styling.points.strokeOpacity}
          {...(config.styling.points.fill ? { fill: config.styling.points.fill } : {})}
          {...(config.styling.points.stroke ? { stroke: config.styling.points.stroke } : {})}
        />
      {/if}

      {#if config.styling.labels.show}
        <Labels
          placement={config.styling.labels.placement}
          offset={config.styling.labels.offset}
          format={config.styling.labels.format}
          class={config.styling.labels.class}
        />
      {/if}

      {#if config.interactions.crosshair.enabled}
        <Rule
          axis={config.interactions.crosshair.axis || 'x'}
          style={config.interactions.crosshair.style}
          opacity={accessibleCrosshairOpacity}
        />
      {/if}

      {#if config.interactions.highlight.enabled}
        <Highlight
          axis={config.interactions.highlight.axis !== undefined ? config.interactions.highlight.axis : 'x'}
          points={config.interactions.highlight.showPoints}
          pointRadius={config.interactions.highlight.pointRadius}
        />
      {/if}
    </Svg>

    <!-- Tooltip -->
    {#if config.interactions.tooltip.enabled}
      <ChartTooltip 
        config={config.interactions.tooltip}
        {colors}
        {viewModeLabel}
      />
    {/if}
  </Tooltip.Context>
</Chart>