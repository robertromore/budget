<script lang="ts">
import {UnifiedChart} from '$lib/components/charts';
import type {ChartType} from '$lib/components/charts/config/chart-types';
import type {TransactionsFormat} from '$lib/types';
import {transformData} from '$lib/utils/chart-data';
import {dateValueToJSDate} from '$lib/utils/dates';
import {createMonthlySpendingProcessor} from '../(analytics)/data-processors.svelte';

interface Props {
  transactions: TransactionsFormat[];
}

let {transactions}: Props = $props();

const monthlySpendingProcessor = createMonthlySpendingProcessor(transactions);

// Transform data to ChartDataPoint format
const chartData = $derived(
  transformData(monthlySpendingProcessor.data, {
    x: (item) => dateValueToJSDate(item.month), // Convert CalendarDate to JS Date
    y: 'amount',
  })
);

// Available chart types for spending data
const availableChartTypes: ChartType[] = ['area', 'bar', 'line', 'scatter'];
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="line"
    styling={{
      colors: 'auto',
      points: {
        show: true,
        radius: 6,
        stroke: 'white',
        strokeWidth: 0,
      },
    }}
    axes={{
      x: {
        title: 'Month',
        rotateLabels: true,
      },
      y: {
        title: 'Spending Amount',
        nice: true,
      },
    }}
    annotations={{
      type: 'labels',
      labels: {
        show: true,
        placement: 'outside',
      },
    }}
    timeFiltering={{
      enabled: true,
      field: 'x',
    }}
    interactions={{
      tooltip: {
        enabled: true,
        format: 'currency',
      },
      highlight: {
        enabled: true,
      },
    }}
    controls={{
      show: true,
      availableTypes: availableChartTypes,
      allowTypeChange: true,
      allowPeriodChange: true,
      allowColorChange: true,
      allowCurveChange: true,
      allowPointsChange: true,
      allowFontChange: true,
      allowGridChange: true,
      allowCrosshairChange: true,
      allowHighlightChange: true,
      allowLabelChange: true,
      allowViewModeChange: true,
    }}
    class="h-full w-full" />
{:else}
  <div class="text-muted-foreground flex h-full items-center justify-center">
    No spending data available
  </div>
{/if}
