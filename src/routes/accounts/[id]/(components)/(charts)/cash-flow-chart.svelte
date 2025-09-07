<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { ChartType } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { transformData } from '$lib/utils/chart-data';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import { colorUtils } from '$lib/utils/colors';
  import { createCashFlowProcessor } from '../(analytics)/data-processors.svelte';
  import { extent } from 'd3-array';

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
    const financialColors = colorUtils.getFinancialColors();
    return cashFlowTrend() === 'positive' 
      ? [financialColors.positive] // Green for positive cash flow
      : [financialColors.negative] // Red for negative cash flow
  });

  // Calculate dynamic domains with intelligent buffers
  const chartDomains = $derived.by(() => {
    if (chartData.length === 0) {
      return { xDomain: undefined, yDomain: undefined };
    }

    // Calculate data extents
    const xExtent = extent(chartData, d => d.x) as [Date, Date];
    const yExtent = extent(chartData, d => d.y) as [number, number];

    // Add time buffer (7 days on each side)
    const timeBuffer = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const xDomain: [Date, Date] = [
      new Date(xExtent[0].getTime() - timeBuffer),
      new Date(xExtent[1].getTime() + timeBuffer)
    ];

    // Add percentage buffer for y-axis (5% on each side)
    const yRange = Math.abs(yExtent[1] - yExtent[0]);
    const yBuffer = Math.max(yRange * 0.05, 100); // Minimum 100 unit buffer
    const yDomain: [number, number] = [
      yExtent[0] - yBuffer,
      yExtent[1] + yBuffer
    ];

    return { xDomain, yDomain };
  });
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="area"
    styling={{
      colors: chartColors(),
      dimensions: {
        padding: { top: 20, right: 30, bottom: 60, left: 70 }
      }
    }}
    axes={{
      x: {
        title: 'Month',
        rotateLabels: true
      },
      y: {
        title: 'Net Cash Flow',
        nice: false,
        domain: chartDomains.yDomain
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