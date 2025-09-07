<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { ChartType } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { transformData } from '$lib/utils/chart-data';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import { createMonthlySpendingProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const monthlySpendingProcessor = createMonthlySpendingProcessor(transactions);

  // Transform data to ChartDataPoint format
  const chartData = $derived(
    transformData(monthlySpendingProcessor.data, {
      x: (item) => dateValueToJSDate(item.month), // Convert CalendarDate to JS Date
      y: 'amount'
    })
  );


  // Available chart types for spending data
  const availableChartTypes: ChartType[] = ['area', 'bar', 'line', 'scatter'];
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="area"
    styling={{
      colors: 'auto'
    }}
    axes={{
      x: {
        title: 'Month',
        rotateLabels: true
      },
      y: {
        title: 'Spending Amount',
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
    No spending data available
  </div>
{/if}
