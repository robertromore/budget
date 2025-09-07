<script lang="ts">
  import { aggregateForPerformance } from '$lib/utils/chart-data';
  import { filterDataByPeriod, generatePeriodOptions } from '$lib/utils/chart-periods';
  import {
    getDataAccessorsForChartType,
    isCircularChart,
    requiresHierarchicalData,
    supportsMultiSeries,
    transformDataForChartType
  } from '$lib/utils/chart-transformers';
  import { colorUtils } from '$lib/utils/colors';
  import { getSchemeColors } from '$lib/utils/chart-colors';
  import { scaleBand } from 'd3-scale';
  import {
    Axis,
    Chart,
    Grid,
    Labels,
    Legend,
    Rule,
    Svg
  } from 'layerchart';
  import ChartColorSelector from './chart-color-selector.svelte';
  import type { ChartDataPoint, ChartDataValidation, UnifiedChartProps } from './chart-config';
  import ChartCurveSelector from './chart-curve-selector.svelte';
  import ChartViewModeSelector from './chart-view-mode-selector.svelte';
  import ChartPeriodControls from './chart-period-controls.svelte';
  import ChartTypeSelector from './chart-type-selector.svelte';
  import { ALL_CHART_TYPES } from './chart-types';
  import { resolveChartConfig, validateChartData } from './config-resolver';
  import DynamicChartRenderer from './dynamic-chart-renderer.svelte';

  // Props interface
  let {
    data,
    type,
    axes,
    styling,
    interactions,
    timeFiltering,
    controls,
    annotations,
    yFields,
    yFieldLabels,
    colorField,
    categoryField,
    viewMode,
    viewModeData,
    suppressDuplicateWarnings = false,
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
  const validation: ChartDataValidation = $derived(
    validateChartData(data, { suppressDuplicateWarnings })
  );

  // Bindable chart type (for controls)
  let currentChartType = $state(type || 'bar');
  $effect(() => {
    // Update from config, but ensure it's a valid type if controls are enabled
    if (config.controls.availableTypes && config.controls.availableTypes.length > 0) {
      // If the current type is not in the available types, use the first available type
      if (!config.controls.availableTypes.includes(config.type)) {
        currentChartType = config.controls.availableTypes[0];
      } else {
        currentChartType = config.type;
      }
    } else {
      currentChartType = config.type;
    }
  });

  // Interactive color and curve controls
  let selectedColorScheme = $state('default');
  let selectedCurve = $state('curveLinear');
  let selectedViewMode = $state(viewMode || 'combined');

  // Color scheme definitions (using existing colorUtils)
  const colorSchemes = {
    default: Array.from({ length: 8 }, (_, i) => colorUtils.getChartColor(i)),
    financial: [
      colorUtils.getChartColor(1), // Green - positive
      colorUtils.getChartColor(2), // Red - negative
      colorUtils.getChartColor(0), // Blue - neutral
      colorUtils.getChartColor(4)  // Orange - accent
    ],
    monochrome: [
      'hsl(220 13% 69%)',  // Light gray
      'hsl(220 13% 50%)',  // Medium gray
      'hsl(220 13% 31%)',  // Dark gray
      'hsl(220 13% 18%)'   // Very dark gray
    ],
    vibrant: [
      'hsl(340 82% 52%)', // Vibrant pink
      'hsl(291 64% 42%)', // Vibrant purple
      'hsl(262 83% 58%)', // Vibrant blue
      'hsl(175 70% 41%)'  // Vibrant teal
    ],
    pastel: [
      'hsl(210 40% 80%)', // Pastel blue
      'hsl(120 40% 80%)', // Pastel green
      'hsl(60 40% 80%)',  // Pastel yellow
      'hsl(0 40% 80%)'    // Pastel red
    ]
  };

  // Override colors if control is enabled
  const effectiveColors = $derived.by(() => {
    if (config.controls.allowColorChange) {
      return getSchemeColors(selectedColorScheme);
    }
    return config.resolvedColors;
  });

  // Generate period options for time filtering
  const availablePeriods = $derived.by(() => {
    if (!config.timeFiltering.enabled) return [];

    // Only use transaction-based filtering for radial charts (pie/arc) that need it
    const hasSourceData = config.timeFiltering.sourceData && config.timeFiltering.sourceData.length > 0;

    if (isChartCircular && hasSourceData) {
      return generatePeriodOptions(config.timeFiltering.sourceData, config.timeFiltering.sourceDateField);
    }

    // Default: use chart data for all other charts
    return generatePeriodOptions(config.data, config.timeFiltering.field);
  });

  // Bindable current period
  let currentPeriod = $state(0); // Default to "All Time"
  $effect(() => {
    currentPeriod = Number(config.timeFiltering.defaultPeriod);
  });

  // Select data based on view mode
  const selectedData = $derived.by(() => {
    if (!viewModeData || selectedViewMode === 'combined') {
      return config.data;
    }
    
    // For side-by-side mode, we'll handle the data differently later
    // For now, return the combined data to avoid breaking existing functionality
    return viewModeData.combined || config.data;
  });

  // Filter data based on current period
  const filteredData = $derived.by(() => {
    const dataToFilter = selectedData;
    if (!config.timeFiltering.enabled) return dataToFilter;

    // Only use transaction-based filtering for radial charts (pie/arc)
    const hasSourceData = config.timeFiltering.sourceData &&
                        config.timeFiltering.sourceData.length > 0 &&
                        config.timeFiltering.sourceProcessor;

    if (isChartCircular && hasSourceData) {
      // Filter source data first, then process (for radial charts only)
      const filteredSourceData = currentPeriod === 0 ? config.timeFiltering.sourceData :
        filterDataByPeriod(
          config.timeFiltering.sourceData,
          config.timeFiltering.sourceDateField,
          currentPeriod
        );

      // Process filtered source data into chart data
      return config.timeFiltering.sourceProcessor(filteredSourceData);
    }

    // Default: filter chart data directly (for all linear charts: bar, line, area, etc.)
    return filterDataByPeriod(
      dataToFilter,
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

  // Detect chart characteristics using utilities
  const isChartCircular = $derived(isCircularChart(currentChartType));
  const isChartHierarchical = $derived(requiresHierarchicalData(currentChartType));
  const chartSupportsMultiSeries = $derived(supportsMultiSeries(currentChartType));

  // Create band scale for bar charts with string x values
  const bandScale = $derived.by(() => {
    if (currentChartType === 'bar' && chartData.length > 0 && !isChartCircular) {
      const scale = scaleBand()
        .domain(chartData.map(d => String(d.x)))
        .range([0, 1]) // LayerChart expects normalized range
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  });

  // Create band scales for side-by-side income and expenses charts
  const incomeBandScale = $derived.by(() => {
    if (currentChartType === 'bar' && viewModeData?.income && viewModeData.income.length > 0 && !isChartCircular) {
      const scale = scaleBand()
        .domain(viewModeData.income.map(d => String(d.x)))
        .range([0, 1])
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  });

  const expensesBandScale = $derived.by(() => {
    if (currentChartType === 'bar' && viewModeData?.expenses && viewModeData.expenses.length > 0 && !isChartCircular) {
      const scale = scaleBand()
        .domain(viewModeData.expenses.map(d => String(d.x)))
        .range([0, 1])
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  });

  // Detect if this is multi-series data
  const isMultiSeries = $derived.by(() => {
    return chartSupportsMultiSeries && yFields && yFields.length > 1 && filteredData.some(item => item.series || item.category);
  });

  // Get unique series for multi-series charts
  const seriesList = $derived.by(() => {
    if (!isMultiSeries) return [];

    const uniqueSeries = new Set<string>();
    chartData.forEach(item => {
      if (item.series) uniqueSeries.add(item.series);
      else if (item.category) uniqueSeries.add(item.category);
    });

    return Array.from(uniqueSeries);
  });

  // Prepare series data for multi-series charts
  const seriesData = $derived.by(() => {
    if (!isMultiSeries) return [];

    return seriesList.map(series =>
      chartData.filter(d =>
        (d.series === series) || (d.category === series)
      )
    );
  });

  // Get data accessors for the current chart type
  const dataAccessors = $derived(getDataAccessorsForChartType(currentChartType));

  // Prepare chart data for LayerChart with performance optimization and transformation
  const chartData = $derived.by(() => {
    // Ensure we have valid data before processing
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    // Performance optimization: aggregate large datasets
    const dataToProcess = filteredData.length > 500
      ? aggregateForPerformance(filteredData, 500)
      : filteredData;

    // Transform data based on chart type requirements
    const transformed = transformDataForChartType(dataToProcess, currentChartType, {
      categoryField: categoryField || 'category',
      valueField: 'y',
      seriesField: 'series',
      colors: config.resolvedColors
    });

    // Special handling for bar charts with Date x-axis values (preserve existing logic)
    if (currentChartType === 'bar' && dataToProcess.length > 0 && !isChartCircular) {
      const firstItem = dataToProcess[0];
      const shouldConvertToCategories = firstItem &&
        firstItem.x instanceof Date &&
        dataToProcess.length <= 12 && // Only for small datasets that should be categorical
        !isMultiSeries; // Don't convert for multi-series time charts

      if (shouldConvertToCategories) {
        return dataToProcess.map(item => ({
          ...item,
          x: item.x instanceof Date
            ? item.x.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : String(item.x)
        }));
      }
    }

    return Array.isArray(transformed) ? transformed : [transformed];
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

    if (validation.dataQuality.duplicateKeys > 0 && !suppressDuplicateWarnings) {
      console.warn(`Chart has ${validation.dataQuality.duplicateKeys} duplicate keys which may affect visualization`);
    }
  });

  // Loading state management for large datasets
  $effect(() => {
    isLoading = data.length > 1000;
    hasRenderError = false;
  });

</script>

<div class={className} role="img"
     aria-label={`${currentChartType} chart with ${chartData.length} data points`}
     aria-describedby={`chart-description-${chartId}`}>
  {#if hasRenderError}
    <!-- Render error state -->
    <div class="flex items-center justify-center h-full text-center p-6">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-destructive">Chart Rendering Error</h3>
        <p class="text-sm text-muted-foreground">
          The chart encountered an error during rendering. Please try again.
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

          <!-- Color Controls -->
          {#if config.controls.allowColorChange}
            <ChartColorSelector bind:selectedScheme={selectedColorScheme} />
          {/if}

          <!-- Curve Controls -->
          {#if config.controls.allowCurveChange}
            <ChartCurveSelector bind:curve={selectedCurve} chartType={currentChartType} />
          {/if}
          <!-- View Mode Controls -->
          {#if config.controls.allowViewModeChange}
            <ChartViewModeSelector 
              bind:viewMode={selectedViewMode} 
              availableViewModes={config.controls.availableViewModes}
            />
          {/if}
        </div>
      </div>
    {/if}

    {#if selectedViewMode === 'side-by-side' && viewModeData && viewModeData.income && viewModeData.expenses}
      <!-- Side-by-side view: separate charts for income and expenses -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        <!-- Income Chart -->
        <div class="h-full">
          <h4 class="text-sm font-medium mb-2 text-center">Income</h4>
          <Chart
            data={viewModeData.income}
            {...(!isChartCircular && !isChartHierarchical ? {
              x: dataAccessors.x || "x",
              y: dataAccessors.y || "y",
              ...(config.axes.y.nice ? { yNice: config.axes.y.nice } : {}),
              ...(config.axes.x.nice ? { xNice: config.axes.x.nice } : {}),
              ...(incomeBandScale ? { xScale: incomeBandScale } : {})
            } : {
              ...dataAccessors,
              ...(isChartCircular && config.resolvedColors.length > 0 ? {
                cRange: [effectiveColors[0] || 'hsl(var(--chart-1))']
              } : {})
            })}
            {...(config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {})}
          >
            <Svg>
              {#if !isChartCircular && !isChartHierarchical}
                {#if config.axes.y.show}
                  <Axis placement="left" />
                {/if}
                {#if config.axes.x.show}
                  <Axis placement="bottom" />
                {/if}
              {/if}
              <DynamicChartRenderer
                chartType={currentChartType}
                data={viewModeData.income}
                config={{
                  padding: currentChartType === 'bar' ? 4 : undefined,
                  fillOpacity: currentChartType === 'area' ? 0.6 : undefined,
                  strokeWidth: ['line', 'spline', 'threshold'].includes(currentChartType) ? 2 : undefined,
                  fill: ['line', 'spline'].includes(currentChartType) ? 'none' : undefined,
                  stroke: ['line', 'spline'].includes(currentChartType) ? (effectiveColors[0] || 'hsl(var(--chart-1))') : undefined,
                  curve: ['line', 'spline', 'area'].includes(currentChartType) && config.controls.allowCurveChange ? selectedCurve : undefined
                }}
                seriesData={[]}
                seriesColors={[effectiveColors[0] || 'hsl(var(--chart-1))']}
                isMultiSeries={false}
              />
            </Svg>
          </Chart>
        </div>

        <!-- Expenses Chart -->
        <div class="h-full">
          <h4 class="text-sm font-medium mb-2 text-center">Expenses</h4>
          <Chart
            data={viewModeData.expenses}
            {...(!isChartCircular && !isChartHierarchical ? {
              x: dataAccessors.x || "x",
              y: dataAccessors.y || "y",
              ...(config.axes.y.nice ? { yNice: config.axes.y.nice } : {}),
              ...(config.axes.x.nice ? { xNice: config.axes.x.nice } : {}),
              ...(expensesBandScale ? { xScale: expensesBandScale } : {})
            } : {
              ...dataAccessors,
              ...(isChartCircular && config.resolvedColors.length > 0 ? {
                cRange: [effectiveColors[1] || 'hsl(var(--chart-2))']
              } : {})
            })}
            {...(config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {})}
          >
            <Svg>
              {#if !isChartCircular && !isChartHierarchical}
                {#if config.axes.y.show}
                  <Axis placement="left" />
                {/if}
                {#if config.axes.x.show}
                  <Axis placement="bottom" />
                {/if}
              {/if}
              <DynamicChartRenderer
                chartType={currentChartType}
                data={viewModeData.expenses}
                config={{
                  padding: currentChartType === 'bar' ? 4 : undefined,
                  fillOpacity: currentChartType === 'area' ? 0.6 : undefined,
                  strokeWidth: ['line', 'spline', 'threshold'].includes(currentChartType) ? 2 : undefined,
                  fill: ['line', 'spline'].includes(currentChartType) ? 'none' : undefined,
                  stroke: ['line', 'spline'].includes(currentChartType) ? (effectiveColors[1] || 'hsl(var(--chart-2))') : undefined,
                  curve: ['line', 'spline', 'area'].includes(currentChartType) && config.controls.allowCurveChange ? selectedCurve : undefined
                }}
                seriesData={[]}
                seriesColors={[effectiveColors[1] || 'hsl(var(--chart-2))']}
                isMultiSeries={false}
              />
            </Svg>
          </Chart>
        </div>
      </div>
    {:else}
      <!-- Combined view: single chart with all data -->
      <Chart
        data={chartData}
        {...(!isChartCircular && !isChartHierarchical ? {
          x: dataAccessors.x || "x",
          y: dataAccessors.y || "y",
          ...(isMultiSeries ? { r: "series" } : {}),
          ...(config.axes.y.nice ? { yNice: config.axes.y.nice } : {}),
          ...(config.axes.x.nice ? { xNice: config.axes.x.nice } : {}),
          ...(config.axes.y.domain && (config.axes.y.domain[0] !== null || config.axes.y.domain[1] !== null) ? { yDomain: config.axes.y.domain } : {}),
          ...(config.axes.x.domain && (config.axes.x.domain[0] !== null || config.axes.x.domain[1] !== null) ? { xDomain: config.axes.x.domain } : {}),
          ...(bandScale ? { xScale: bandScale } : {})
        } : {
          // For circular and hierarchical charts, use appropriate data accessors
          ...dataAccessors,
          // For pie charts, configure color scale with cRange
          ...(isChartCircular && config.resolvedColors.length > 0 ? {
            cRange: effectiveColors
          } : {})
        })}
        {...(config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {})}
      >
        <Svg>
          <!-- Axes for non-circular and non-hierarchical charts -->
          {#if !isChartCircular && !isChartHierarchical}
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
                ).map(d =>
                  (typeof d === 'object' && 'x' in d) ? d.x : ''
                )
              } : {})}
            />
          {/if}
        {/if}

        <!-- Dynamic chart rendering using the component registry -->
        <DynamicChartRenderer
          chartType={currentChartType}
          data={chartData}
          config={{
            padding: currentChartType === 'bar' ? 4 : undefined,
            fillOpacity: currentChartType === 'area' ? 0.6 : undefined,
            strokeWidth: ['line', 'spline', 'threshold'].includes(currentChartType) ? 2 : undefined,
            fill: ['line', 'spline'].includes(currentChartType) ? 'none' : undefined,
            stroke: ['line', 'spline'].includes(currentChartType) ? (effectiveColors[0] || 'hsl(var(--chart-1))') : undefined,
            curve: ['line', 'spline', 'area'].includes(currentChartType) && config.controls.allowCurveChange ? selectedCurve : undefined,
            r: currentChartType === 'scatter' ? 4 : undefined,
            innerRadius: currentChartType === 'arc' ? 40 : undefined,
            outerRadius: currentChartType === 'arc' ? 150 : undefined,
            start: currentChartType === 'calendar' && chartData.length > 0 ? new Date(Math.min(...chartData.map(d => {
              if (typeof d === 'object' && 'x' in d) {
                if (d.x instanceof Date) return d.x.getTime();
                if (typeof d.x === 'string') return new Date(d.x).getTime();
                if (typeof d.x === 'number') return d.x;
              }
              return new Date().getTime();
            }))) : undefined,
            end: currentChartType === 'calendar' && chartData.length > 0 ? new Date(Math.max(...chartData.map(d => {
              if (typeof d === 'object' && 'x' in d) {
                if (d.x instanceof Date) return d.x.getTime();
                if (typeof d.x === 'string') return new Date(d.x).getTime();
                if (typeof d.x === 'number') return d.x;
              }
              return new Date().getTime();
            }))) : undefined
          }}
          seriesData={seriesData}
          seriesColors={effectiveColors}
          isMultiSeries={isMultiSeries || false}
        />

        <!-- Additional components for specific chart types -->
        {#if currentChartType === 'threshold'}
          <Rule />
        {/if}

        <!-- Grid -->
        {#if config.styling.grid.show || config.styling.grid.horizontal}
          <Grid {...(config.styling.grid.opacity !== undefined ? { opacity: config.styling.grid.opacity } : {})} />
        {/if}

        <!-- Annotations: Rules and Labels -->
        {#if config.annotations.type === 'rules' || config.annotations.type === 'both'}
          {#if config.annotations.rules.show && config.annotations.rules.values && config.annotations.rules.values.length > 0}
            <!-- Rules: Reference lines for thresholds, averages, etc. -->
            {#each config.annotations.rules.values as ruleValue}
              <Rule
                y={ruleValue}
                {...(config.annotations.rules.class ? { class: config.annotations.rules.class } : {})}
                {...(config.annotations.rules.strokeWidth ? { strokeWidth: config.annotations.rules.strokeWidth } : {})}
                {...(config.annotations.rules.strokeDasharray ? { style: `stroke-dasharray: ${config.annotations.rules.strokeDasharray}` } : {})}
              />
            {/each}
          {/if}
        {/if}

        {#if config.annotations.type === 'labels' || config.annotations.type === 'both'}
          {#if config.annotations.labels.show && !isCircularChart}
            <!-- Labels: Data point value labels for non-circular charts -->
            <Labels
              data={chartData}
              x="x"
              y="y"
              format={config.annotations.labels.format || ((d) => {
                // Handle both object and primitive data formats
                if (typeof d === 'object' && d !== null) {
                  // For object data, look for common value fields
                  return String(d.y ?? d.value ?? d.amount ?? d);
                }
                return String(d);
              })}
              {...(config.annotations.labels.class ? { class: config.annotations.labels.class } : {})}
              offset={config.annotations.labels.offset?.y || 4}
              placement={config.annotations.labels.placement || 'outside'}
            />
          {/if}
        {/if}
      </Svg>

      <!-- Legend -->
      {#if config.styling.legend.show}
        <Legend />
      {/if}
    </Chart>
    {/if}
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
