<script lang="ts">
  import { ChartContainer } from '$lib/components/ui/chart';
  import { Chart, Svg, Arc } from 'layerchart';
  import type { TransactionsFormat } from '$lib/types';
  import { createCategorySpendingProcessor } from '../(analytics)/data-processors.svelte';
  import { colorUtils } from '$lib/utils/colors';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const categorySpendingProcessor = createCategorySpendingProcessor(transactions);
  const categorySpendingData = $derived(categorySpendingProcessor.data);

  const categoryColor = colorUtils.getChartColor(3); // Purple
  
  const chartConfig = {
    category: { label: 'Amount', color: categoryColor }
  };
</script>

{#if categorySpendingData.length > 0}
  <ChartContainer config={chartConfig} class="h-full w-full">
    <Chart data={categorySpendingData} x="category" y="amount" yNice>
      <Svg>
        <Arc />
      </Svg>
    </Chart>
  </ChartContainer>
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No category spending data available
  </div>
{/if}