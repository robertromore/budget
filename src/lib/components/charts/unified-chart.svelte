<script lang="ts">
  import { aggregateForPerformance } from '$lib/utils/chart-data';
  import { filterDataByPeriod, generatePeriodOptions } from '$lib/utils/chart-periods';
  import { scaleBand } from 'd3-scale';
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
  import type { ChartDataPoint, ChartDataValidation, UnifiedChartProps } from './chart-config';
  import ChartPeriodControls from './chart-period-controls.svelte';
  import ChartTypeSelector from './chart-type-selector.svelte';
  import { ALL_CHART_TYPES } from './chart-types';
  import { resolveChartConfig, validateChartData } from './config-resolver';

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

  // Loading and error state management
  let isLoading = $state(false);
  let hasRenderError = $state(false);

  // Accessibility ID for stable references
  const chartId = Math.random().toString(36).substr(2, 9);

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
  const validation: ChartDataValidation = $derived(validateChartData(data));

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

  // Create band scale for bar charts with string x values
  const bandScale = $derived.by(() => {
    if (currentChartType === 'bar' && filteredData.length > 0) {
      const scale = scaleBand()
        .domain(filteredData.map(d => String(d.x)))
        .range([0, 1]) // LayerChart expects normalized range
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  });

  // Prepare chart data for LayerChart with performance optimization
  const chartData = $derived.by(() => {
    // Performance optimization: aggregate large datasets
    const dataToProcess = filteredData.length > 500
      ? aggregateForPerformance(filteredData, 500)
      : filteredData;

    if (isCircularChart) {
      // For circular charts, group by category if available
      const groupedData = dataToProcess.reduce((acc, item) => {
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

    // Special handling for bar charts with Date x-axis values
    if (currentChartType === 'bar' && dataToProcess.length > 0) {
      // Convert Date objects to string labels for bar charts
      return dataToProcess.map(item => ({
        ...item,
        x: item.x instanceof Date
          ? item.x.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : String(item.x)
      }));
    }

    return dataToProcess;
  });

  // Error handling for invalid data with enhanced messaging
  $effect(() => {
    if (!validation.isValid) {
      console.error('Chart data validation failed:', validation.errors.map((e: any) => e.message));
      console.error('Detailed errors:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('Chart data warnings:', validation.warnings.map((w: any) => w.message));
      console.warn('Detailed warnings:', validation.warnings);
    }

    if (validation.dataQuality.duplicateKeys > 0) {
      console.warn(`Chart has ${validation.dataQuality.duplicateKeys} duplicate keys which may affect visualization`);
    }
  });

  // Loading state management for large datasets
  $effect(() => {
    isLoading = data.length > 1000;
    hasRenderError = false;
  });

  // Chart render error boundary simulation
  $effect(() => {
    try {
      if (chartData.length === 0 && data.length > 0) {
        throw new Error('Chart data processing failed');
      }
    } catch (error) {
      hasRenderError = true;
      console.error('Chart render error:', error);
    }
  });
</script>

<div class={className} role="img"
     aria-label={`${currentChartType} chart with ${chartData.length} data points`}
     aria-describedby={`chart-description-${chartId}`}>
  {#if hasRenderError}
    <!-- Render error state -->
    <div class="flex items-center justify-center h-full text-center p-6">
      <div class="space-y-4">
        <div class="text-4xl">⚠️</div>
        <h3 class="text-lg font-semibold text-destructive">Chart Rendering Error</h3>
        <p class="text-sm text-muted-foreground">
          The chart encountered an error during rendering. Please try again or contact support.
        </p>
      </div>
    </div>
  {:else if isLoading}
    <!-- Loading state -->
    <div class="flex items-center justify-center h-full">
      <div class="space-y-4 text-center">
        <div class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p class="text-sm text-muted-foreground">
          Loading chart... ({data.length.toLocaleString()} data points)
        </p>
      </div>
    </div>
  {:else if validation.isValid}
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
      {...(bandScale ? { xScale: bandScale } : {})}
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
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
            padding={4}
          />
        {:else if currentChartType === 'area'}
          <Area
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
            fillOpacity={0.6}
          />
        {:else if currentChartType === 'line'}
          <Spline
            stroke={config.resolvedColors[0] || 'hsl(var(--primary))'}
            strokeWidth={2}
            fill="none"
          />
        {:else if currentChartType === 'scatter'}
          <Points
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
            r={4}
          />
        {:else if currentChartType === 'pie'}
          <Pie
            innerRadius={0}
            outerRadius={Math.min(
              (config.styling.dimensions.padding?.top || 0) + 100,
              120
            )}
          />
        {:else if currentChartType === 'arc'}
          <Pie
            innerRadius={40}
            outerRadius={Math.min(
              (config.styling.dimensions.padding?.top || 0) + 100,
              120
            )}
          />
        {:else if currentChartType === 'threshold'}
          <Spline
            stroke={config.resolvedColors[0] || 'hsl(var(--primary))'}
            strokeWidth={2}
            fill="none"
          />
          <Rule />
        {:else if currentChartType === 'hull'}
          <Points
            fill={config.resolvedColors[0] || 'hsl(var(--primary))'}
            r={4}
          />
          <Hull />
        {:else if currentChartType === 'calendar'}
          <Calendar
            start={new Date(Math.min(...chartData.map(d => {
              if (d.x instanceof Date) return d.x.getTime();
              if (typeof d.x === 'string') return new Date(d.x).getTime();
              if (typeof d.x === 'number') return d.x;
              return new Date().getTime();
            })))}
            end={new Date(Math.max(...chartData.map(d => {
              if (d.x instanceof Date) return d.x.getTime();
              if (typeof d.x === 'string') return new Date(d.x).getTime();
              if (typeof d.x === 'number') return d.x;
              return new Date().getTime();
            })))}
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
    <!-- Error state with enhanced error display -->
    <div class="flex items-center justify-center h-full text-center p-6">
      <div class="space-y-4 max-w-md">
        <h3 class="text-lg font-semibold text-destructive">Chart Data Error</h3>
        <div class="space-y-3">
          {#each validation.errors as error}
            <div class="text-sm border rounded-md p-3 bg-destructive/5 border-destructive/20">
              <div class="font-medium text-destructive">{error.type.replace('_', ' ').toUpperCase()}</div>
              <div class="text-muted-foreground mt-1">{error.message}</div>
              {#if error.dataIndex !== undefined}
                <div class="text-xs text-muted-foreground mt-1">
                  Data point: {error.dataIndex}{error.field ? ` (field: ${error.field})` : ''}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Data quality summary even in error state -->
        {#if validation.dataQuality.totalPoints > 0}
          <div class="text-xs text-muted-foreground border-t pt-2">
            <div>Total data points: {validation.dataQuality.totalPoints}</div>
            <div>Missing values: {validation.dataQuality.missingValues}</div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Screen reader description -->
  <div id={`chart-description-${chartId}`} class="sr-only">
    {#if validation.isValid && chartData.length > 0}
      <p>
        This is a {currentChartType} chart displaying {chartData.length} data points.
        {#if validation.dataQuality.valueRanges.y[0] !== validation.dataQuality.valueRanges.y[1]}
          Values range from {validation.dataQuality.valueRanges.y[0]} to {validation.dataQuality.valueRanges.y[1]}.
        {/if}
        {#if validation.warnings.length > 0 && validation.warnings[0]}
          Note: {validation.warnings[0].message}
        {/if}
      </p>
    {:else if !validation.isValid}
      <p>Chart contains invalid data and cannot be displayed.</p>
    {:else}
      <p>Chart has no data to display.</p>
    {/if}
  </div>
</div>
