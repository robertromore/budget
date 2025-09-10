<script lang="ts">
  import { UnifiedChart } from '@layerchart-wrapper/charts';
  import type { ChartType } from '@layerchart-wrapper/charts/config/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { transformIncomeVsExpensesData } from '$lib/utils/finance-chart-data';
  import { colorUtils } from '@budget-shared/utils';
  import { dateValueToJSDate } from '@budget-shared/utils';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
    /** Chart display mode - combined shows both series in one chart, side-by-side shows separate charts */
    viewMode?: 'combined' | 'side-by-side';
    /** Default chart type */
    chartType?: ChartType;
    /** Show chart controls */
    showControls?: boolean;
  }

  let { 
    transactions, 
    viewMode = 'combined',
    chartType = 'bar',
    showControls = true
  }: Props = $props();

  // Process income vs expenses data
  const incomeVsExpensesProcessor = createIncomeVsExpensesProcessor(transactions);

  // Transform data for multi-series visualization
  const transformedData = $derived(
    transformIncomeVsExpensesData(incomeVsExpensesProcessor.data, {
      x: (item) => dateValueToJSDate(item.month),
      income: 'income',
      expenses: 'expenses'
    })
  );

  // Available chart types for income vs expenses comparison
  const availableChartTypes: ChartType[] = ['bar', 'line', 'area'];

  // Use semantic colors from colorUtils for consistent theming
  const chartColors = $derived(() => {
    const financialColors = colorUtils.getFinancialColors();
    return [
      financialColors.positive,  // Green for income
      financialColors.negative   // Red for expenses
    ];
  });
</script>

{#if transformedData.combined.length > 0}
  <!-- For combined view, use the multi-series data -->
  {#if viewMode === 'combined'}
    <UnifiedChart
      data={transformedData.combined}
      type={chartType}
      styling={{
        colors: chartColors(),
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
      timeFiltering={{
        enabled: true,
        field: 'x'
      }}
      controls={{
        show: showControls,
        availableTypes: availableChartTypes,
        allowTypeChange: true,
        allowPeriodChange: true
      }}
      class="h-full w-full"
    />
  {:else}
    <!-- Side-by-side view with two separate charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      <!-- Income Chart -->
      <div class="flex flex-col">
        <h3 class="text-sm font-semibold mb-2 text-green-700 flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" style="background-color: {chartColors()[0]}"></div>
          Income
        </h3>
        <div class="flex-1">
          <UnifiedChart
            data={transformedData.income}
            type={chartType}
            styling={{
              colors: [chartColors()[0]],
              legend: { show: false }
            }}
            axes={{
              x: {
                title: 'Month',
                rotateLabels: true
              },
              y: {
                title: 'Income ($)',
                nice: true
              }
            }}
            timeFiltering={{
              enabled: true,
              field: 'x'
            }}
            controls={{
              show: showControls,
              availableTypes: availableChartTypes,
              allowTypeChange: true,
              allowPeriodChange: true
            }}
            class="h-full w-full"
          />
        </div>
      </div>
      
      <!-- Expenses Chart -->
      <div class="flex flex-col">
        <h3 class="text-sm font-semibold mb-2 text-red-700 flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" style="background-color: {chartColors()[1]}"></div>
          Expenses
        </h3>
        <div class="flex-1">
          <UnifiedChart
            data={transformedData.expenses}
            type={chartType}
            styling={{
              colors: [chartColors()[1]],
              legend: { show: false }
            }}
            axes={{
              x: {
                title: 'Month', 
                rotateLabels: true
              },
              y: {
                title: 'Expenses ($)',
                nice: true
              }
            }}
            timeFiltering={{
              enabled: true,
              field: 'x'
            }}
            controls={{
              show: showControls,
              availableTypes: availableChartTypes,
              allowTypeChange: true,
              allowPeriodChange: true
            }}
            class="h-full w-full"
          />
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="flex items-center justify-center h-full text-center p-6">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-muted-foreground">No Income vs Expenses Data</h3>
      <p class="text-sm text-muted-foreground">
        Add some transactions with positive (income) and negative (expense) amounts to see the comparison.
      </p>
    </div>
  </div>
{/if}