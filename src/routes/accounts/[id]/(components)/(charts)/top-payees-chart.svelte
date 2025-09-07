<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { TransactionsFormat } from '$lib/types';
  import { createTopPayeesProcessor } from '../(analytics)/data-processors.svelte';
  import { transformData } from '$lib/utils/chart-data';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const topPayeesProcessor = createTopPayeesProcessor(transactions);

  // Transform data to ChartDataPoint format
  const chartData = $derived(
    transformData(topPayeesProcessor.data, {
      x: 'payee',
      y: 'total'
    })
  );
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="bar"
    styling={{
      colors: 'auto'
    }}
    axes={{
      x: {
        title: 'Payee',
        rotateLabels: true
      },
      y: {
        title: 'Total Amount',
        nice: true
      }
    }}
    controls={{
      show: true,
      availableTypes: ['bar', 'line', 'area'],
      allowTypeChange: true,
      allowPeriodChange: false
    }}
    class="h-full w-full"
  />
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No payee data available
  </div>
{/if}