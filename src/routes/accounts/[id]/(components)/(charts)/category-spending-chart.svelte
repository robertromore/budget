<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { ChartType } from '$lib/components/charts/chart-types';
  import type { TransactionsFormat } from '$lib/types';
  import { transformData } from '$lib/utils/chart-data';
  import { chartFormatters } from '$lib/utils/chart-formatters';
  import { colorUtils } from '$lib/utils/colors';
  import { dateValueToJSDate } from '$lib/utils/dates';
  import { createCategorySpendingProcessor } from '../(analytics)/data-processors.svelte';

  interface Props {
    transactions: TransactionsFormat[];
  }

  let { transactions }: Props = $props();

  // Process categories from all transactions - ensure we have data before processing
  const categoryProcessor = $derived.by(() => {
    if (!transactions || transactions.length === 0) return { data: [] };
    return createCategorySpendingProcessor(transactions);
  });

  // Transform data to ChartDataPoint format - only if we have processed data
  const chartData = $derived.by(() => {
    if (!categoryProcessor.data || categoryProcessor.data.length === 0) return [];
    return transformData(categoryProcessor.data, {
      x: 'category',
      y: 'amount'
    });
  });

  // Prepare transaction data with JS dates for UnifiedChart filtering
  const transactionsWithDates = $derived.by(() => {
    if (!transactions || transactions.length === 0) return [];
    return transactions.map(t => ({
      ...t,
      date_js: dateValueToJSDate(t.date) // Add JS Date for filtering
    }));
  });

  // Create processor function for UnifiedChart transaction-based filtering
  const processCategoriesFromTransactions = (filteredTransactions: any[]) => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return [];
    }

    // Process categories directly without using the reactive processor
    const categoryData: Record<string, number> = {};

    filteredTransactions.forEach(t => {
      if (t.amount < 0 && t.category?.name) {
        const category = t.category.name;
        categoryData[category] = (categoryData[category] || 0) + Math.abs(t.amount);
      }
    });

    const processedData = Object.entries(categoryData)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return transformData(processedData, {
      x: 'category',
      y: 'amount'
    });
  };

  // Available chart types for category spending data
  const availableChartTypes: ChartType[] = ['pie', 'arc', 'bar', 'scatter'];

  // Generate consistent colors for categories
  const chartColors = $derived(() => {
    return chartData.map((_, index) =>
      colorUtils.getChartColor(index % 8) // Cycle through color palette
    );
  });

  // Calculate average spending for rules
  const averageSpending = $derived(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + (typeof d.y === 'number' ? d.y : 0), 0);
    return Math.round(total / chartData.length);
  });
</script>

{#if chartData.length > 0}
  <UnifiedChart
    data={chartData}
    type="pie"
    styling={{
      colors: chartColors(),
      dimensions: {
        padding: { top: 20, right: 30, bottom: 60, left: 70 }
      }
    }}
    axes={{
      x: {
        title: 'Category',
        rotateLabels: true
      },
      y: {
        title: 'Spending Amount',
        nice: true
      }
    }}
    timeFiltering={{
      enabled: true,
      field: 'date',
      sourceData: transactionsWithDates,
      sourceProcessor: processCategoriesFromTransactions,
      sourceDateField: 'date_js'
    }}
    controls={{
      show: true,
      availableTypes: availableChartTypes,
      allowTypeChange: true,
      allowPeriodChange: true
    }}
    annotations={{
      type: 'both',
      labels: {
        show: true,
        format: chartFormatters.currencySmart,
        position: 'auto'
      },
      rules: {
        show: true,
        values: [averageSpending()],
        orientation: 'horizontal',
        class: 'stroke-primary/60',
        strokeWidth: 2,
        strokeDasharray: '4 2'
      }
    }}
    class="h-full w-full"
  />
{:else}
  <div class="flex items-center justify-center h-full text-muted-foreground">
    No category spending data available
  </div>
{/if}
