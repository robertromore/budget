<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { ChartType } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { transformIncomeVsExpensesData } from '$lib/utils/chart-data';
  import { generatePeriodOptions } from '$lib/utils/chart-periods';
  import { colorUtils } from '$lib/utils/colors';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const incomeVsExpensesProcessor = createIncomeVsExpensesProcessor(transactions);

  // Process raw data using standard transformation utilities
  const processedData = $derived(incomeVsExpensesProcessor.data);

  // Transform data for multi-series visualization
  const transformedData = $derived(
    transformIncomeVsExpensesData(processedData, {
      x: (item) => dateValueToJSDate(item.month),
      income: 'income',
      expenses: 'expenses'
    })
  );

  // Provide all data formats for different view modes
  const chartData = $derived({
    combined: transformedData.combined,
    income: transformedData.income,
    expenses: transformedData.expenses,
    series: transformedData.series
  });

  // Generate available periods based on the combined data
  const availablePeriods = $derived(
    transformedData.combined.length === 0 ? [] : generatePeriodOptions(transformedData.combined, 'x')
  );

  // Available chart types for income vs expenses data
  const availableChartTypes: ChartType[] = ['bar', 'line', 'area'];
</script>

{#if transformedData.combined.length > 0}
  <div class="h-full">
    <UnifiedChart
      data={chartData.combined}
      type="bar"
      styling={{
        colors: [
          colorUtils.getChartColor(1), // Green for income
          colorUtils.getChartColor(2)  // Red/orange for expenses
        ],
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
      yFields={['income', 'expenses']}
      yFieldLabels={['Income', 'Expenses']}
      suppressDuplicateWarnings={true}
      viewModeData={{
        combined: chartData.combined,
        income: chartData.income,
        expenses: chartData.expenses
      }}
      timeFiltering={{
        enabled: availablePeriods.length > 0,
        field: 'x'
      }}
      controls={{
        show: true,
        availableTypes: availableChartTypes,
        allowTypeChange: true,
        allowPeriodChange: availablePeriods.length > 0,
        allowColorChange: true,
        allowCurveChange: true,
        allowViewModeChange: true,
        availableViewModes: ['combined', 'side-by-side']
      }}
      class="h-full w-full"
    />
  </div>
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No income/expense data available
  </div>
{/if}
