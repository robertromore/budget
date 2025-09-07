<script lang="ts">
  import { Chart, Svg, Area, Spline, Bars, Axis, Rule } from 'layerchart';
  import type { ChartType } from './chart-types';
  import type { ChartDataPoint } from './chart-config';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import ChartPeriodControls from './chart-period-controls.svelte';
  import ChartTypeSelector from './chart-type-selector.svelte';
  import { ALL_CHART_TYPES } from './chart-types';
  import { filterDataByPeriod, generatePeriodOptions } from '$lib/utils/chart-periods';
  import { colorUtils } from '$lib/utils/colors';
  import { curveLinear } from 'd3-shape';
  import type { CalendarDate } from '@internationalized/date';

  interface Props {
    /** Cash flow data with month, cashFlow, income, expenses */
    data: Array<{ month: CalendarDate, cashFlow: number, income: number, expenses: number }>;
    /** Default chart type */
    type?: ChartType;
    /** Available chart types */
    availableTypes?: ChartType[];
    /** Show controls */
    showControls?: boolean;
    /** Enable period filtering */
    enablePeriodFiltering?: boolean;
    /** Show zero line reference */
    showZeroLine?: boolean;
    class?: string;
  }

  let {
    data,
    type = 'line',
    availableTypes = ['line', 'area', 'bar'],
    showControls = true,
    enablePeriodFiltering = true,
    showZeroLine = true,
    class: className = 'h-full w-full'
  }: Props = $props();

  // Transform data for chart
  const chartData = $derived.by((): ChartDataPoint[] => {
    return data.map(item => ({
      x: dateValueToJSDate(item.month),
      y: item.cashFlow,
      metadata: {
        income: item.income,
        expenses: item.expenses,
        cashFlow: item.cashFlow,
        month: item.month
      }
    }));
  });

  // Bindable chart type
  let currentChartType = $state(type);

  // Get available chart types with icons
  const availableChartTypes = $derived.by(() => {
    return ALL_CHART_TYPES.flatMap(group =>
      group.options.filter(option => availableTypes.includes(option.value))
    );
  });

  // Generate period options for time filtering
  const availablePeriods = $derived.by(() => {
    if (!enablePeriodFiltering) return [];
    return generatePeriodOptions(chartData, 'x');
  });

  // Bindable current period
  let currentPeriod = $state(0); // Default to "All Time"

  // Filter data based on current period
  const filteredData = $derived.by(() => {
    if (!enablePeriodFiltering) return chartData;
    return filterDataByPeriod(chartData, 'x', currentPeriod) as ChartDataPoint[];
  });

  // Determine if cash flow is mostly positive or negative for color theming
  const cashFlowTrend = $derived.by(() => {
    const totalCashFlow = filteredData.reduce((sum, item) => sum + item.y, 0);
    return totalCashFlow >= 0 ? 'positive' : 'negative';
  });

  // Chart colors using semantic financial color mappings
  const chartColors = $derived(() => {
    const financialColors = colorUtils.getFinancialColors();
    const colors = {
      primary: cashFlowTrend === 'positive' 
        ? financialColors.positive 
        : financialColors.negative, // Red for negative cash flow
      warning: financialColors.warning, // Orange for warning states
      zeroLine: financialColors.zeroLine
    };
    
    
    return colors;
  });

  // Summary calculations - period-aware calculation
  const summaryData = $derived(() => {    
    if (!data || data.length === 0) {
      return { totalIncome: 0, totalExpenses: 0, netCashFlow: 0 };
    }
    
    // Use the same filtered data as the chart
    const dataToSummarize = enablePeriodFiltering 
      ? filterDataByPeriod(
          data.map(item => ({ ...item, x: dateValueToJSDate(item.month) })), 
          'x', 
          currentPeriod
        )
      : data;
    
    if (!dataToSummarize || dataToSummarize.length === 0) {
      return { totalIncome: 0, totalExpenses: 0, netCashFlow: 0 };
    }
    
    // Calculate totals from period-filtered data
    const totalIncome = dataToSummarize.reduce((sum, item) => sum + (item.income || 0), 0);
    const totalExpenses = dataToSummarize.reduce((sum, item) => sum + (item.expenses || 0), 0);
    const netCashFlow = totalIncome - totalExpenses;
    
    return { 
      totalIncome: Number(totalIncome) || 0, 
      totalExpenses: Number(totalExpenses) || 0, 
      netCashFlow: Number(netCashFlow) || 0 
    };
  });
</script>

<div class={className}>
  {#if showControls}
    <div class="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg mb-4">
      <div class="flex items-center gap-6 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">Cash Flow:</span>
          <span class="text-xs px-2 py-1 rounded-full {cashFlowTrend === 'positive' 
            ? 'bg-chart-1/10 text-chart-1' 
            : 'bg-chart-2/10 text-chart-2'}">
            {cashFlowTrend === 'positive' ? 'Net Positive' : 'Net Negative'}
          </span>
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

  {#if filteredData.length > 0}
    <Chart
      data={filteredData}
      x="x"
      y="y"
      yNice={true}
      yDomain={undefined}
      padding={{ top: 20, right: 20, bottom: 20, left: 40 }}
    >
      <Svg>
        <!-- Axes -->
        <Axis placement="left" />
        <Axis placement="bottom" />

        <!-- Zero line reference -->
        {#if showZeroLine}
          <Rule y={0} stroke={chartColors().zeroLine} strokeWidth={1} />
        {/if}

        <!-- Render based on chart type -->
        {#if currentChartType === 'bar'}
          <Bars
            fill={chartColors().primary}
            stroke={chartColors().primary}
            strokeWidth={1}
            radius={4}
            padding={0.1}
          />
        {:else if currentChartType === 'area'}
          <Area
            fill={chartColors().primary}
            fillOpacity={0.3}
            stroke={chartColors().primary}
            strokeWidth={2}
          />
        {:else if currentChartType === 'line'}
          <Spline
            stroke={chartColors().primary}
            strokeWidth={3}
            fill="none"
            curve={curveLinear}
          />
        {/if}
      </Svg>
    </Chart>

    <!-- Cash flow summary -->
    {#if showControls}
      <div class="mt-4 p-3 bg-muted/20 rounded-lg">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="text-center">
            <div class="text-xs text-muted-foreground">Total Income</div>
            <div class="text-lg font-semibold text-chart-1">
              ${(summaryData().totalIncome ?? 0).toLocaleString()}
            </div>
          </div>
          
          <div class="text-center">
            <div class="text-xs text-muted-foreground">Total Expenses</div>
            <div class="text-lg font-semibold text-chart-2">
              ${(summaryData().totalExpenses ?? 0).toLocaleString()}
            </div>
          </div>
          
          <div class="text-center">
            <div class="text-xs text-muted-foreground">Net Cash Flow</div>
            <div class="text-lg font-semibold {(summaryData().netCashFlow ?? 0) >= 0 ? 'text-chart-1' : 'text-chart-2'}">
              {(summaryData().netCashFlow ?? 0) >= 0 ? '+' : ''}${(summaryData().netCashFlow ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <div class="flex items-center justify-center h-full text-center p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-muted-foreground">No Cash Flow Data</h3>
        <p class="text-sm text-muted-foreground">
          Add some transactions to see your cash flow trends over time.
        </p>
      </div>
    </div>
  {/if}
</div>