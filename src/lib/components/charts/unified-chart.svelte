<script lang="ts">
  import {
    Area,
    Axis,
    Bars,
    Calendar,
    Chart,
    Grid,
    Hull,
    Legend,
    Pie,
    Points,
    Rule,
    Spline,
    Svg
  } from 'layerchart';
  import ChartTypeSelector from './chart-type-selector.svelte';
  import ChartPeriodControls from './chart-period-controls.svelte';
  import { generatePeriodOptions, filterDataByPeriod } from '$lib/utils/chart-periods';
  import { resolveChartConfig, validateChartData } from './config-resolver';
  import type { UnifiedChartProps, ChartDataPoint } from './chart-config';
  import { ALL_CHART_TYPES } from './chart-types';

  // Props interface
  let {
    data,
    type,
    axes,
    styling,
    interactions,
    timeFiltering,
    controls,
    class: className = "h-full w-full"
  }: UnifiedChartProps = $props();

  // Resolve complete configuration
  const config = $derived.by(() => {
    const resolved = resolveChartConfig({
      data,
      type,
      axes,
      styling,
      interactions,
      timeFiltering,
      controls
    } as UnifiedChartProps);
    return resolved;
  });

  // Validate data
  const validation = $derived(validateChartData(data));

  // Bindable chart type (for controls)
  let currentChartType = $state(type || 'bar');
  $effect(() => {
    currentChartType = config.type;
  });

  // Generate period options for time filtering
  const availablePeriods = $derived.by(() => {
    if (!config.timeFiltering.enabled) return [];
    return generatePeriodOptions(config.data, config.timeFiltering.field);
  });

  // Bindable current period
  let currentPeriod = $state(0); // Default to "All Time"
  $effect(() => {
    currentPeriod = Number(config.timeFiltering.defaultPeriod);
  });

  // Filter data based on current period
  const filteredData = $derived.by(() => {
    if (!config.timeFiltering.enabled) return config.data;
    return filterDataByPeriod(
      config.data, 
      config.timeFiltering.field, 
      currentPeriod
    ) as ChartDataPoint[];
  });

  // Get available chart types based on controls config
  const availableChartTypes = $derived.by(() => {
    if (!config.controls.availableTypes) return [];
    
    return ALL_CHART_TYPES.flatMap(group => 
      group.options.filter(option => 
        config.controls.availableTypes!.includes(option.value)
      )
    );
  });

  // Detect if chart is circular (pie/arc)
  const isCircularChart = $derived(
    currentChartType === 'pie' || currentChartType === 'arc'
  );

  // Prepare chart data for LayerChart
  const chartData = $derived.by(() => {
    if (isCircularChart) {
      // For circular charts, group by category if available
      const groupedData = filteredData.reduce((acc, item) => {
        const category = item.category || String(item.x);
        const existing = acc.find(d => d.x === category);
        
        if (existing) {
          existing.y += item.y;
        } else {
          acc.push({ x: category, y: item.y, category });
        }
        
        return acc;
      }, [] as ChartDataPoint[]);
      
      return groupedData;
    }
    
    return filteredData;
  });

  // Error handling for invalid data
  $effect(() => {
    if (!validation.isValid) {
      console.error('Chart data validation failed:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Chart data warnings:', validation.warnings);
    }
  });
</script>

<div class={className}>
  {#if validation.isValid}
    {#if config.controls.show}
      <div class="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg mb-4">
        <div class="flex items-center gap-6 text-sm">
          <!-- Chart Type Controls -->
          {#if config.controls.allowTypeChange && availableChartTypes.length > 1}
            <ChartTypeSelector 
              bind:chartType={currentChartType} 
              availableChartTypes={availableChartTypes}
            />
          {/if}

          <!-- Period Controls -->
          {#if config.controls.allowPeriodChange && config.timeFiltering.enabled}
            <ChartPeriodControls 
              bind:currentPeriod
              data={availablePeriods}
              dateField={config.timeFiltering.field}
              enablePeriodFiltering={true}
            />
          {/if}
        </div>
      </div>
    {/if}

    <Chart 
      data={chartData}
      {...(isCircularChart ? {} : { x: "x", y: "y" })}
      {...(config.axes.y.nice ? { yNice: config.axes.y.nice } : {})}
      {...(config.axes.x.nice ? { xNice: config.axes.x.nice } : {})}
      {...(config.axes.y.domain && (config.axes.y.domain[0] !== null || config.axes.y.domain[1] !== null) ? { yDomain: config.axes.y.domain } : {})}
      {...(config.axes.x.domain && (config.axes.x.domain[0] !== null || config.axes.x.domain[1] !== null) ? { xDomain: config.axes.x.domain } : {})}
      {...(config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {})}
    >
      <Svg>
        <!-- Axes for non-circular charts -->
        {#if !isCircularChart}
          {#if config.axes.y.show}
            <Axis placement="left" />
          {/if}
          {#if config.axes.x.show}
            <Axis
              placement="bottom"
              {...(config.axes.x.rotateLabels ? { 
                tickLabelProps: { rotate: -45, textAnchor: 'end' } 
              } : {})}
              {...(chartData.length > 8 ? { 
                ticks: chartData.filter((_, i) => 
                  i % Math.ceil(chartData.length / 4) === 0
                ).map(d => d.x) 
              } : {})}
            />
          {/if}
        {/if}

        <!-- Render chart based on current type -->
        {#if currentChartType === 'bar'}
          <Bars
            data={chartData}
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
          />
        {:else if currentChartType === 'area'}
          <Area
            data={chartData}
            x="x"
            y="y"
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
            fillOpacity={0.6}
          />
        {:else if currentChartType === 'line'}
          <Spline
            data={chartData}
            stroke={config.resolvedColors[0] || 'hsl(var(--primary))'}
            strokeWidth={2}
            fill="none"
          />
        {:else if currentChartType === 'scatter'}
          <Points
            data={chartData}
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
            r={4}
          />
        {:else if currentChartType === 'pie'}
          <Pie
            data={chartData}
            innerRadius={0}
            outerRadius={Math.min(
              (config.styling.dimensions.padding?.top || 0) + 100,
              120
            )}
          />
        {:else if currentChartType === 'arc'}
          <Pie
            data={chartData}
            innerRadius={40}
            outerRadius={Math.min(
              (config.styling.dimensions.padding?.top || 0) + 100,
              120
            )}
          />
        {:else if currentChartType === 'threshold'}
          <Spline
            data={chartData}
            stroke={config.resolvedColors[0] || 'hsl(var(--primary))'}
            strokeWidth={2}
            fill="none"
          />
          <Rule />
        {:else if currentChartType === 'hull'}
          <Points
            data={chartData}
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
            r={4}
          />
          <Hull data={chartData} />
        {:else if currentChartType === 'calendar'}
          <Calendar
            start={new Date(Math.min(...chartData.map(d => 
              new Date(d.x).getTime()
            )))}
            end={new Date(Math.max(...chartData.map(d => 
              new Date(d.x).getTime()
            )))}
          />
        {/if}

        <!-- Grid -->
        {#if config.styling.grid.show || config.styling.grid.horizontal}
          <Grid {...(config.styling.grid.opacity !== undefined ? { opacity: config.styling.grid.opacity } : {})} />
        {/if}
      </Svg>

      <!-- Legend -->
      {#if config.styling.legend.show}
        <Legend />
      {/if}
    </Chart>
  {:else}
    <!-- Error state -->
    <div class="flex items-center justify-center h-full text-center p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-destructive">Chart Data Error</h3>
        <div class="text-sm text-muted-foreground space-y-1">
          {#each validation.errors as error}
            <p>{error}</p>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>