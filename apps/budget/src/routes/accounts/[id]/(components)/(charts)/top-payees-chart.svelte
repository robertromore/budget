<script lang="ts">
import {UnifiedChart} from '$lib/components/charts';
import type {TransactionsFormat} from '$lib/types';
import {createTopPayeesProcessor} from '../(analytics)/data-processors.svelte';
import {transformData} from '$lib/utils/chart-data';
import {chartFormatters} from '$lib/utils/chart-formatters';

interface Props {
  transactions: TransactionsFormat[];
}

let {transactions}: Props = $props();

const topPayeesProcessor = createTopPayeesProcessor(transactions);

// Transform data to ChartDataPoint format
const chartData = $derived(
  transformData(topPayeesProcessor.data, {
    x: 'payee',
    y: 'total',
  })
);

// Calculate average payee amount for rules
const averagePayeeAmount = $derived(() => {
  if (chartData.length === 0) return 0;
  const total = chartData.reduce((sum, d) => sum + (typeof d.y === 'number' ? d.y : 0), 0);
  return Math.round(total / chartData.length);
});
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="bar"
    styling={{
      colors: 'auto',
    }}
    axes={{
      x: {
        title: 'Payee',
        rotateLabels: true,
      },
      y: {
        title: 'Total Amount',
        nice: true,
      },
    }}
    controls={{
      show: true,
      availableTypes: ['bar', 'line', 'area'],
      allowTypeChange: true,
      allowPeriodChange: false,
    }}
    annotations={{
      type: 'labels',
      labels: {
        show: true,
        format: chartFormatters.currencySmart,
        position: 'auto',
        class: 'fill-foreground text-xs font-medium',
      },
      rules: {
        show: false,
        values: [averagePayeeAmount()],
      },
    }}
    class="h-full w-full" />
{:else}
  <div class="text-muted-foreground flex h-full items-center justify-center">
    No payee data available
  </div>
{/if}
