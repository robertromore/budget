<script lang="ts">
  import { CashFlowChart } from '$lib/components/charts';
  import type { TransactionsFormat } from '$lib/types';
  import { createCashFlowProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
    /** Default chart type */
    chartType?: 'line' | 'area' | 'bar';
    /** Show chart controls */
    showControls?: boolean;
    /** Show zero line reference */
    showZeroLine?: boolean;
  }

  let { 
    transactions, 
    chartType = 'line',
    showControls = true,
    showZeroLine = true
  }: Props = $props();

  // Process cash flow data
  const cashFlowProcessor = createCashFlowProcessor(transactions);

  // Available chart types for cash flow visualization
  const availableChartTypes = ['line', 'area', 'bar'] as const;
</script>

{#if cashFlowProcessor.data.length > 0}
  <CashFlowChart
    data={cashFlowProcessor.data}
    type={chartType}
    availableTypes={[...availableChartTypes]}
    {showControls}
    {showZeroLine}
    enablePeriodFiltering={true}
    class="h-full w-full"
  />
{:else}
  <div class="flex items-center justify-center h-full text-center p-6">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-muted-foreground">No Cash Flow Data</h3>
      <p class="text-sm text-muted-foreground">
        Add some transactions with both income and expenses to see your cash flow trends.
      </p>
    </div>
  </div>
{/if}