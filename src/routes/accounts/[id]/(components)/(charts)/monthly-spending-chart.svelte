<script lang="ts">
  import { ChartContainer } from '$lib/components/ui/chart';
  import type { TransactionsFormat } from '$lib/types';
  import { Area, Chart, Svg } from 'layerchart';
  import { createMonthlySpendingProcessor } from '../(analytics)/data-processors.svelte';
  import { colorUtils } from '$lib/utils/colors';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  const monthlySpendingProcessor = createMonthlySpendingProcessor(transactions);
  const chartData = $derived(monthlySpendingProcessor.data.map((d, i) => ({ ...d, index: i })));


  // Use the real chart data
  const displayData = $derived(chartData);

  const primaryColor = colorUtils.getChartColor(0); // Blue
  
  const chartConfig = {
    spending: { label: 'Spending', color: primaryColor }
  };
</script>

{#if displayData.length > 0}
  <ChartContainer config={chartConfig} class="h-full w-full">
    <Chart data={displayData} x="index" y="amount" yNice>
      <Svg>
        <Area line={{ stroke: primaryColor, strokeWidth: 2 }} fill={primaryColor} fillOpacity={0.2} />
      </Svg>
    </Chart>
  </ChartContainer>
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No spending data available
  </div>
{/if}
