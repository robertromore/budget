<script lang="ts">
  import { ChartWrapper } from '$lib/components/charts';
  import type { ChartSeries, ChartType, ChartTypeOption } from '$lib/components/charts/chart-types';
  import { ALL_CHART_TYPES } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { colorUtils } from '$lib/utils/colors';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  let chartType = $state<ChartType>('bar');

  const incomeVsExpensesProcessor = createIncomeVsExpensesProcessor(transactions);

  // Process raw data and transform for chart rendering
  const processedData = $derived(incomeVsExpensesProcessor.data);

  // Debug: Check what periods we have
  $effect(() => {
    console.log('📅 Time Periods Debug:');
    console.log('- Total processed months:', processedData.length);
    console.log('- All months:', processedData.map(d => d.month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })));
  });

  // Transform data for LayerChart grouped bars
  const chartData = $derived.by(() => {
    if (!processedData.length) return [];

    // Flatten the data for grouped bars - each data point represents one bar
    const flatData: Array<{
      month: string;
      value: number;
      series: string;
      type: string;
      color: string;
      index: number;
    }> = [];
    
    processedData.forEach((d, i) => {
      const monthLabel = d.month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      // Add income bar
      flatData.push({
        month: monthLabel,
        value: d.income || 0,
        series: 'Income',
        type: 'income',
        color: colorUtils.getChartColor(1),
        index: i
      });
      
      // Add expenses bar  
      flatData.push({
        month: monthLabel,
        value: d.expenses || 0,
        series: 'Expenses', 
        type: 'expenses',
        color: colorUtils.getChartColor(2),
        index: i
      });
    });
    
    return flatData;
  });

  // Create separate series for income and expenses
  const chartSeries: ChartSeries[] = $derived([
    {
      data: chartData.filter(d => d.type === 'income'),
      type: chartType,
      color: colorUtils.getChartColor(1),
      label: 'Income'
    },
    {
      data: chartData.filter(d => d.type === 'expenses'),
      type: chartType,
      color: colorUtils.getChartColor(2), 
      label: 'Expenses'
    }
  ]);

  // Get chart types from global definitions, filtering for the ones we support
  const availableChartTypes: ChartTypeOption[] = $derived(() => {
    const supportedTypes = ['bar', 'line', 'area'];
    return ALL_CHART_TYPES.flatMap(group => 
      group.options.filter(option => supportedTypes.includes(option.value))
    );
  });
</script>

{#if processedData.length > 0}
  <ChartWrapper
    data={chartData}
    series={chartSeries}
    x="month"
    y="value"
    bind:chartType
    showControls={true}
    {availableChartTypes}
    showLeftAxis={true}
    showBottomAxis={true}
    yNice={true}
    enablePeriodFiltering={true}
    dateField="month"
    padding={{ left: 80, bottom: 80, top: 20, right: 30 }}
    class="h-full w-full"
  />
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No income/expense data available
  </div>
{/if}
