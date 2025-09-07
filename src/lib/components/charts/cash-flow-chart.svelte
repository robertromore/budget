<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { ChartType } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { transformData } from '$lib/utils/chart-data';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import { createCashFlowProcessor } from '../../../routes/accounts/[id]/(components)/(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const cashFlowProcessor = createCashFlowProcessor(transactions);

  // Transform data to ChartDataPoint format
  const chartData = $derived(
    transformData(cashFlowProcessor.data, {
      x: (item) => dateValueToJSDate(item.month), // Convert CalendarDate to JS Date
      y: 'cashFlow' // Use the net cash flow value
    })
  );

  // Available chart types for cash flow data
  const availableChartTypes: ChartType[] = ['area', 'bar', 'line', 'scatter'];

  // Determine semantic colors based on cash flow trend
  const cashFlowTrend = $derived(() => {
    const totalCashFlow = chartData.reduce((sum, item) => sum + item.y, 0);
    return totalCashFlow >= 0 ? 'positive' : 'negative';
  });

  // Use semantic colors for cash flow visualization
  const chartColors = $derived(() => {
    return cashFlowTrend() === 'positive' 
      ? ['hsl(var(--chart-1))'] // Green for positive
      : ['hsl(var(--chart-2))'] // Red for negative
  });
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="area"
    styling={{
      colors: chartColors()
    }}
    axes={{
      x: {
        title: 'Month',
        rotateLabels: true
      },
      y: {
        title: 'Net Cash Flow',
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
    No cash flow data available
  </div>
{/if}