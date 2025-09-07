<script lang="ts">
  import { IncomeExpensesChart } from '$lib/components/charts';
  import type { TransactionsFormat } from '$lib/types';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
    /** Chart display mode - combined shows both series in one chart, side-by-side shows separate charts */
    viewMode?: 'combined' | 'side-by-side';
    /** Default chart type */
    chartType?: 'bar' | 'line' | 'area';
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

  // Available chart types for income vs expenses comparison
  const availableChartTypes = ['bar', 'line', 'area'] as const;

  // Custom colors matching your theme
  const chartColors = {
    income: 'hsl(var(--chart-1))',   // Green for income
    expenses: 'hsl(var(--chart-2))'  // Red/orange for expenses
  };
</script>

{#if incomeVsExpensesProcessor.data.length > 0}
  <IncomeExpensesChart
    data={incomeVsExpensesProcessor.data}
    {viewMode}
    type={chartType}
    availableTypes={[...availableChartTypes]}
    {showControls}
    enablePeriodFiltering={true}
    colors={chartColors}
    class="h-full w-full"
  />
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