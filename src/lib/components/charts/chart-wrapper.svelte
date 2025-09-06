<script lang="ts">
  import ChartRenderer from './chart-renderer.svelte';
  import ChartTypeSelector from './chart-type-selector.svelte';
  import ChartPeriodControls from './chart-period-controls.svelte';
  import type { ChartSeries, ChartType, ChartTypeOption } from './chart-types';
  import { generatePeriodOptions, filterDataByPeriod } from '$lib/utils/chart-periods';

  interface Props {
    // Data and chart configuration
    data: any[];
    series: ChartSeries[];

    // Chart setup
    x?: string;
    y?: string | string[];

    // Styling and layout
    padding?: { left?: number; right?: number; top?: number; bottom?: number };
    yDomain?: [number | null, number | null];
    xDomain?: [number | null, number | null];
    yNice?: boolean;
    xNice?: boolean;

    // Axes configuration
    showLeftAxis?: boolean;
    showBottomAxis?: boolean;
    showRightAxis?: boolean;
    showTopAxis?: boolean;
    rotateBottomLabels?: boolean;

    // Grid and styling
    showGrid?: boolean;
    showHorizontalGrid?: boolean;
    showVerticalGrid?: boolean;
    showRule?: boolean;

    // Chart-specific options
    chartLayoutType?: string;
    innerRadius?: number;
    outerRadius?: number;

    // Legends and labels
    showLegend?: boolean;
    showLabels?: boolean;

    // Control features
    showControls?: boolean;
    availableChartTypes?: ChartTypeOption[];
    chartType?: ChartType;

    // Period filtering (requires data with date/month field)
    enablePeriodFiltering?: boolean;
    dateField?: string;
    currentPeriod?: string | number;

    // Dimensions
    class?: string;
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
    showControls = false,
    availableChartTypes,
    chartType = $bindable('bar'),
    enablePeriodFiltering = false,
    dateField = 'month',
    currentPeriod = $bindable(0),
    class: className = "h-full w-full"
  }: Props = $props();

  // Generate period options dynamically based on data
  const availablePeriods = $derived.by(() => {
    if (!enablePeriodFiltering) return [];
    return generatePeriodOptions(data, dateField);
  });

  // Filter data based on selected period
  const filteredData = $derived.by(() => {
    if (!enablePeriodFiltering) return data;
    return filterDataByPeriod(data, dateField, currentPeriod);
  });

  // Filter series data based on selected period  
  const filteredSeries = $derived.by(() => {
    if (!enablePeriodFiltering) return series;
    return series.map(s => ({
      ...s,
      data: filterDataByPeriod(s.data, dateField, currentPeriod)
    }));
  });
</script>

<div class={className}>
  {#if showControls}
    <div class="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg mb-4">
      <div class="flex items-center gap-6 text-sm">
        <!-- Chart Type Controls -->
        {#if availableChartTypes}
          <ChartTypeSelector bind:chartType {availableChartTypes} />
        {/if}

        <!-- Period Controls -->
        <ChartPeriodControls 
          bind:currentPeriod 
          data={availablePeriods}
          {dateField}
          {enablePeriodFiltering}
        />
      </div>
    </div>
  {/if}

  <ChartRenderer 
    data={filteredData}
    series={filteredSeries}
    {x}
    {y}
    {yNice}
    {yDomain}
    {padding}
    {showLeftAxis}
    {showBottomAxis}
    {showRightAxis}
    {showTopAxis}
    {rotateBottomLabels}
    {showGrid}
    {showHorizontalGrid}
    {showVerticalGrid}
    {showRule}
    {chartLayoutType}
    {innerRadius}
    {outerRadius}
    {showLegend}
    {showLabels}
  />
</div>