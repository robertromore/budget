<script lang="ts">
  import { Chart, Svg, Area, Spline, Bars, Axis, Legend } from 'layerchart';
  import type { ChartType } from './chart-types';
  import type { ChartDataPoint } from './chart-config';
  import { transformIncomeVsExpensesData } from '$lib/utils/chart-data';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import ChartPeriodControls from './chart-period-controls.svelte';
  import ChartTypeSelector from './chart-type-selector.svelte';
  import { ALL_CHART_TYPES } from './chart-types';
  import { filterDataByPeriod, generatePeriodOptions } from '$lib/utils/chart-periods';
  import { scaleBand, scaleOrdinal } from 'd3-scale';

  interface Props {
    /** Raw data with income and expenses */
    data: Array<{ month: any, income: number, expenses: number }>;
    /** Chart display mode */
    viewMode?: 'combined' | 'side-by-side';
    /** Default chart type */
    type?: ChartType;
    /** Available chart types */
    availableTypes?: ChartType[];
    /** Show controls */
    showControls?: boolean;
    /** Enable period filtering */
    enablePeriodFiltering?: boolean;
    /** Custom colors */
    colors?: {
      income: string;
      expenses: string;
    };
    class?: string;
  }

  let {
    data,
    viewMode = 'combined',
    type = 'bar',
    availableTypes = ['bar', 'line', 'area'],
    showControls = true,
    enablePeriodFiltering = true,
    colors = {
      income: 'hsl(var(--chart-1))', // Green theme color
      expenses: 'hsl(var(--chart-2))' // Red/orange theme color
    },
    class: className = 'h-full w-full'
  }: Props = $props();

  // Transform data for multi-series charts
  const chartData = $derived(
    transformIncomeVsExpensesData(data, {
      x: (item) => dateValueToJSDate(item.month),
      income: 'income',
      expenses: 'expenses'
    })
  );

  // Bindable chart type and view mode
  let currentChartType = $state(type);
  let currentViewMode = $state(viewMode);

  // Get available chart types with icons
  const availableChartTypes = $derived.by(() => {
    return ALL_CHART_TYPES.flatMap(group =>
      group.options.filter(option => availableTypes.includes(option.value))
    );
  });

  // Generate period options for time filtering
  const availablePeriods = $derived.by(() => {
    if (!enablePeriodFiltering) return [];
    return generatePeriodOptions(chartData.income, 'x');
  });

  // Bindable current period
  let currentPeriod = $state(0); // Default to "All Time"

  // Filter data based on current period
  const filteredData = $derived.by(() => {
    if (!enablePeriodFiltering) return chartData;
    
    return {
      combined: filterDataByPeriod(chartData.combined, 'x', currentPeriod) as ChartDataPoint[],
      income: filterDataByPeriod(chartData.income, 'x', currentPeriod) as ChartDataPoint[],
      expenses: filterDataByPeriod(chartData.expenses, 'x', currentPeriod) as ChartDataPoint[],
      series: filterDataByPeriod(chartData.series, 'x', currentPeriod) as ChartDataPoint[]
    };
  });

  // Create color scale for multi-series
  const colorScale = $derived(() => {
    return scaleOrdinal<string, string>()
      .domain(['income', 'expenses'])
      .range([colors.income, colors.expenses]);
  });

  // Create band scale for grouped bars
  const bandScale = $derived.by(() => {
    if (currentChartType === 'bar' && currentViewMode === 'combined') {
      const scale = scaleBand()
        .domain(filteredData.combined.map(d => String(d.x)))
        .range([0, 1])
        .paddingInner(0.1)
        .paddingOuter(0.05);
      return scale;
    }
    return undefined;
  });

  // Prepare data based on view mode
  const displayData = $derived.by(() => {
    if (currentViewMode === 'combined') {
      return {
        dataset: filteredData.series,
        useRScale: true
      };
    } else {
      return {
        dataset: filteredData.combined,
        useRScale: false
      };
    }
  });
</script>

<div class={className}>
  {#if showControls}
    <div class="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg mb-4">
      <div class="flex items-center gap-6 text-sm">
        <!-- View Mode Toggle -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">View:</span>
          <div class="flex rounded-lg border border-input bg-background p-1">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {currentViewMode === 'combined' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
              onclick={() => currentViewMode = 'combined'}
            >
              Combined
            </button>
            <button
              type="button"  
              class="inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {currentViewMode === 'side-by-side'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
              onclick={() => currentViewMode = 'side-by-side'}
            >
              Side-by-Side
            </button>
          </div>
        </div>

        <!-- Chart Type Controls -->
        {#if availableChartTypes.length > 1}
          <ChartTypeSelector
            bind:chartType={currentChartType}
            availableChartTypes={availableChartTypes}
          />
        {/if}

        <!-- Period Controls -->
        {#if enablePeriodFiltering}
          <ChartPeriodControls
            bind:currentPeriod
            data={availablePeriods}
            dateField="x"
            enablePeriodFiltering={true}
          />
        {/if}
      </div>
    </div>
  {/if}

  {#if currentViewMode === 'combined'}
    <!-- Combined Chart - Single Chart with Multiple Series -->
    <Chart
      data={displayData.dataset}
      x="x"
      y="y"
      r="series"
      rScale={colorScale()}
      yNice={true}
      {...(bandScale ? { xScale: bandScale } : {})}
    >
      <Svg>
        <!-- Axes -->
        <Axis placement="left" />
        <Axis placement="bottom" />

        <!-- Render based on chart type -->
        {#if currentChartType === 'bar'}
          <Bars
            groupBy="series"
            groupPaddingInner={0.2}
            groupPaddingOuter={0.1}
          />
        {:else if currentChartType === 'area'}
          <!-- Multi-series area charts with transparency -->
          <Area
            data={filteredData.income}
            x="x"
            y="y"
            fill={colors.income}
            fillOpacity={0.6}
          />
          <Area
            data={filteredData.expenses}
            x="x" 
            y="y"
            fill={colors.expenses}
            fillOpacity={0.6}
          />
        {:else if currentChartType === 'line'}
          <!-- Multi-series line charts -->
          <Spline
            data={filteredData.income}
            x="x"
            y="y"
            stroke={colors.income}
            strokeWidth={3}
            fill="none"
          />
          <Spline
            data={filteredData.expenses}
            x="x"
            y="y" 
            stroke={colors.expenses}
            strokeWidth={3}
            fill="none"
          />
        {/if}

        <!-- Legend for combined view -->
        <Legend />
      </Svg>
    </Chart>

  {:else}
    <!-- Side-by-Side View - Two Separate Charts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <!-- Income Chart -->
      <div class="flex flex-col">
        <h3 class="text-sm font-medium text-muted-foreground mb-2 px-2">Income</h3>
        <div class="flex-1">
          <Chart
            data={filteredData.income}
            x="x"
            y="y"
            yNice={true}
          >
          <Svg>
            <Axis placement="left" />
            <Axis placement="bottom" />

            {#if currentChartType === 'bar'}
              <Bars fill={colors.income} />
            {:else if currentChartType === 'area'}
              <Area fill={colors.income} fillOpacity={0.6} />
            {:else if currentChartType === 'line'}
              <Spline stroke={colors.income} strokeWidth={3} fill="none" />
            {/if}
          </Svg>
        </Chart>
        </div>
      </div>

      <!-- Expenses Chart -->
      <div class="flex flex-col">
        <h3 class="text-sm font-medium text-muted-foreground mb-2 px-2">Expenses</h3>
        <div class="flex-1">
          <Chart
            data={filteredData.expenses}
            x="x"
            y="y" 
            yNice={true}
          >
          <Svg>
            <Axis placement="left" />
            <Axis placement="bottom" />

            {#if currentChartType === 'bar'}
              <Bars fill={colors.expenses} />
            {:else if currentChartType === 'area'}
              <Area fill={colors.expenses} fillOpacity={0.6} />
            {:else if currentChartType === 'line'}
              <Spline stroke={colors.expenses} strokeWidth={3} fill="none" />
            {/if}
          </Svg>
        </Chart>
        </div>
      </div>
    </div>
  {/if}

  {#if !data?.length}
    <div class="flex items-center justify-center h-full text-muted-foreground">
      No income vs expenses data available
    </div>
  {/if}
</div>