<script lang="ts">
  import { ChartContainer } from '$lib/components/ui/chart';
  import { Chart, Svg, Bars } from 'layerchart';
  import type { TransactionsFormat } from '$lib/types';
  import { createTopPayeesProcessor } from '../(analytics)/data-processors.svelte';
  import { colorUtils } from '$lib/utils/colors';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const topPayeesProcessor = createTopPayeesProcessor(transactions);
  const topPayeesData = $derived(topPayeesProcessor.data);

  const payeeColor = colorUtils.getChartColor(4); // Orange
  
  const chartConfig = {
    category: { label: 'Amount', color: payeeColor }
  };
</script>

{#if topPayeesData.length > 0}
  <ChartContainer config={chartConfig} class="h-full w-full">
    <Chart data={topPayeesData} x="payee" y="total" yNice>
      <Svg>
        <Bars />
      </Svg>
    </Chart>
  </ChartContainer>
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No payee data available
  </div>
{/if}