<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { ChartType } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { colorUtils } from '$lib/utils/colors';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';
  import type { ChartDataPoint } from '$lib/components/charts/chart-config';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const incomeVsExpensesProcessor = createIncomeVsExpensesProcessor(transactions);

  // Process raw data and transform for chart rendering
  const processedData = $derived(incomeVsExpensesProcessor.data);

  // Transform data for UnifiedChart - flatten into single array with series information
  const chartData = $derived.by((): ChartDataPoint[] => {
    if (!processedData.length) return [];

    // Flatten the data for grouped visualization - each data point represents one series value
    const flatData: ChartDataPoint[] = [];

    processedData.forEach((d, i) => {
      // Convert CalendarDate to Date for proper chart handling
      const monthDate = dateValueToJSDate(d.month);
      const monthLabel = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      // Add income data point
      flatData.push({
        x: monthDate, // Use actual Date for time filtering
        y: d.income || 0,
        category: 'Income', // This will be used for series grouping
        metadata: { 
          series: 'Income', 
          type: 'income',
          monthLabel,
          originalDate: d.month,
          index: i,
          color: colorUtils.getChartColor(1)
        }
      });

      // Add expenses data point
      flatData.push({
        x: monthDate, // Use actual Date for time filtering
        y: d.expenses || 0,
        category: 'Expenses', // This will be used for series grouping
        metadata: { 
          series: 'Expenses', 
          type: 'expenses',
          monthLabel,
          originalDate: d.month,
          index: i,
          color: colorUtils.getChartColor(2)
        }
      });
    });

    return flatData;
  });

  // Available chart types for income vs expenses data
  const availableChartTypes: ChartType[] = ['bar', 'line', 'area'];
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="bar"
    styling={{
      colors: [colorUtils.getChartColor(1), colorUtils.getChartColor(2)],
      legend: { show: true, position: 'top' }
    }}
    axes={{
      x: {
        title: 'Month',
        rotateLabels: true
      },
      y: {
        title: 'Amount ($)',
        nice: true
      }
    }}
    timeFiltering={{
      enabled: true,
      field: 'x'
    }}
    controls={{
      show: true,
      availableTypes: availableChartTypes,
      allowTypeChange: true,
      allowPeriodChange: true
    }}
    class="h-full w-full"
  />
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No income/expense data available
  </div>
{/if}
