<script lang="ts">
import {UnifiedChart} from '$lib/components/charts';
import type {ChartType} from '$lib/components/charts/config/chart-types';
import type {TransactionsFormat} from '$lib/types';
import {transformIncomeVsExpensesData} from '$lib/utils/finance-chart-data';
import {colorUtils} from '$lib/utils/colors';
import {dateValueToJSDate} from '$lib/utils/dates';
import {createIncomeVsExpensesProcessor} from '../(analytics)/data-processors.svelte';

interface Props {
  transactions: TransactionsFormat[];
  /** Chart display mode - combined shows both series in one chart, side-by-side shows separate charts */
  viewMode?: 'combined' | 'side-by-side';
  /** Default chart type */
  chartType?: ChartType;
  /** Show chart controls */
  showControls?: boolean;
}

let {transactions, viewMode = 'combined', chartType = 'bar', showControls = true}: Props = $props();

// Process income vs expenses data
const incomeVsExpensesProcessor = createIncomeVsExpensesProcessor(transactions);

// Transform data for multi-series visualization
const transformedData = $derived(
  transformIncomeVsExpensesData(incomeVsExpensesProcessor.data, {
    x: (item) => dateValueToJSDate(item.month),
    income: 'income',
    expenses: 'expenses',
  })
);

// Available chart types for income vs expenses comparison
const availableChartTypes: ChartType[] = ['bar', 'line', 'area'];

// Use semantic colors from colorUtils for consistent theming
const chartColors = $derived(() => {
  const financialColors = colorUtils.getFinancialColors();
  return [
    financialColors.positive, // Green for income
    financialColors.negative, // Red for expenses
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
        legend: {show: true, position: 'top'},
      }}
      axes={{
        x: {
          title: 'Month',
          rotateLabels: true,
        },
        y: {
          title: 'Amount ($)',
          nice: true,
        },
      }}
      yFields={['income', 'expenses']}
      yFieldLabels={['Income', 'Expenses']}
      suppressDuplicateWarnings={true}
      timeFiltering={{
        enabled: true,
        field: 'x',
      }}
      controls={{
        show: showControls,
        availableTypes: availableChartTypes,
        allowTypeChange: true,
        allowPeriodChange: true,
      }}
      class="h-full w-full" />
  {:else}
    <!-- Side-by-side view with two separate charts -->
    <div class="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Income Chart -->
      <div class="flex flex-col">
        <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700">
          <div class="h-3 w-3 rounded-full" style="background-color: {chartColors()[0]}"></div>
          Income
        </h3>
        <div class="flex-1">
          <UnifiedChart
            data={transformedData.income}
            type={chartType}
            styling={{
              colors: [chartColors()[0]],
              legend: {show: false},
            }}
            axes={{
              x: {
                title: 'Month',
                rotateLabels: true,
              },
              y: {
                title: 'Income ($)',
                nice: true,
              },
            }}
            timeFiltering={{
              enabled: true,
              field: 'x',
            }}
            controls={{
              show: showControls,
              availableTypes: availableChartTypes,
              allowTypeChange: true,
              allowPeriodChange: true,
            }}
            class="h-full w-full" />
        </div>
      </div>

      <!-- Expenses Chart -->
      <div class="flex flex-col">
        <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
          <div class="h-3 w-3 rounded-full" style="background-color: {chartColors()[1]}"></div>
          Expenses
        </h3>
        <div class="flex-1">
          <UnifiedChart
            data={transformedData.expenses}
            type={chartType}
            styling={{
              colors: [chartColors()[1]],
              legend: {show: false},
            }}
            axes={{
              x: {
                title: 'Month',
                rotateLabels: true,
              },
              y: {
                title: 'Expenses ($)',
                nice: true,
              },
            }}
            timeFiltering={{
              enabled: true,
              field: 'x',
            }}
            controls={{
              show: showControls,
              availableTypes: availableChartTypes,
              allowTypeChange: true,
              allowPeriodChange: true,
            }}
            class="h-full w-full" />
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="flex h-full items-center justify-center p-6 text-center">
    <div class="space-y-2">
      <h3 class="text-muted-foreground text-lg font-semibold">No Income vs Expenses Data</h3>
      <p class="text-muted-foreground text-sm">
        Add some transactions with positive (income) and negative (expense) amounts to see the
        comparison.
      </p>
    </div>
  </div>
{/if}
