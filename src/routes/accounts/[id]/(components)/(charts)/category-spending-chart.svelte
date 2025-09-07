<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { TransactionsFormat } from '$lib/types';
  import { createCategorySpendingProcessor } from '../(analytics)/data-processors.svelte';
  import { transformData } from '$lib/utils/chart-data';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const categorySpendingProcessor = createCategorySpendingProcessor(transactions);

  // Transform data to ChartDataPoint format
  const chartData = $derived(
    transformData(categorySpendingProcessor.data, {
      x: 'category',
      y: 'amount'
    })
  );
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="pie"
    styling={{
      colors: 'auto'
    }}
    axes={{
      x: {
        title: 'Category'
      },
      y: {
        title: 'Amount',
        nice: true
      }
    }}
    controls={{
      show: true,
      availableTypes: ['pie', 'arc', 'bar'],
      allowTypeChange: true,
      allowPeriodChange: false
    }}
    class="h-full w-full"
  />
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No category spending data available
  </div>
{/if}