<script lang="ts">
  import { ChartWrapper } from '$lib/components/charts';
  import type { WidgetProps, ChartType } from '$lib/types/widgets';
  import { currencyFormatter, periodFormatter } from '$lib/utils/formatters';
  import { TrendingDown, TrendingUp } from '$lib/components/icons';
  import { colorUtils } from '$lib/utils/colors';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const chartData = data?.['incomeExpenses'] ?? [];
  const period = $derived(config.settings?.['period'] ?? 'month');
  const chartType = $derived(config.settings?.['chartType'] ?? 'bar');

  // Calculate totals and net
  const totalIncome = chartData.reduce((sum: number, item: any) => sum + (item.income || 0), 0);
  const totalExpenses = chartData.reduce((sum: number, item: any) => sum + (item.expenses || 0), 0);
  const netAmount = totalIncome - totalExpenses;

  // Prepare data for ChartWrapper based on chart type
  const processedData = $derived(() => {
    if (chartType === 'bar') {
      const incomeData = chartData.map((item: any) => ({ x: item.period, y: item.income || 0 }));
      const expensesData = chartData.map((item: any) => ({ x: item.period, y: item.expenses || 0 }));
      return [...incomeData, ...expensesData];
    } else {
      const incomeData = chartData.map((item: any) => ({ x: item.period, y: item.income || 0 }));
      const expensesData = chartData.map((item: any) => ({ x: item.period, y: item.expenses || 0 }));
      return [...incomeData, ...expensesData];
    }
  });

  const series = $derived(() => {
    if (chartType === 'bar') {
      const incomeData = chartData.map((item: any) => ({ x: item.period, y: item.income || 0 }));
      const expensesData = chartData.map((item: any) => ({ x: item.period, y: item.expenses || 0 }));
      return [
        { data: incomeData, type: 'bar' as ChartType, colorIndex: 1, label: 'Income' },
        { data: expensesData, type: 'bar' as ChartType, colorIndex: 2, label: 'Expenses' }
      ];
    } else {
      const incomeData = chartData.map((item: any) => ({ x: item.period, y: item.income || 0 }));
      const expensesData = chartData.map((item: any) => ({ x: item.period, y: item.expenses || 0 }));
      return [
        { 
          data: incomeData, 
          type: chartType as ChartType, 
          colorIndex: 1, 
          strokeWidth: 2,
          fillOpacity: chartType === 'area' ? 0.3 : undefined,
          label: 'Income' 
        },
        { 
          data: expensesData, 
          type: chartType as ChartType, 
          colorIndex: 2, 
          strokeWidth: 2,
          fillOpacity: chartType === 'area' ? 0.3 : undefined,
          label: 'Expenses' 
        }
      ];
    }
  });
</script>

<WidgetCard 
  {config} 
  {data} 
  {editMode}
  {...(onUpdate && { onUpdate })}
  {...(onRemove && { onRemove })}
>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <div class="text-xs text-muted-foreground">{periodFormatter.toAdverb(period)}</div>
    </div>

    {#if chartData.length > 0}
      <!-- Chart -->
      <div class="h-40">
        <ChartWrapper
          data={processedData()}
          series={series()}
          x="x"
          y="y"
          yNice
          padding={{ left: 60, right: 20, top: 10, bottom: 40 }}
          showBottomAxis={config.size === 'large'}
          showLeftAxis={true}
          rotateBottomLabels={chartData.length > 4}
          showLegend={config.size === 'large'}
          class="h-full w-full"
        />
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
          <div class="text-green-600 font-medium">Income</div>
          <div class="font-semibold text-green-700 dark:text-green-400">
            {currencyFormatter.format(totalIncome)}
          </div>
        </div>

        <div class="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
          <div class="text-red-600 font-medium">Expenses</div>
          <div class="font-semibold text-red-700 dark:text-red-400">
            {currencyFormatter.format(totalExpenses)}
          </div>
        </div>

        <div class="text-center p-2 rounded-lg {netAmount >= 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-orange-50 dark:bg-orange-950/20'}">
          <div class="flex items-center justify-center gap-1 {netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}">
            {#if netAmount > 0}
              <TrendingUp class="w-3 h-3" />
            {:else if netAmount < 0}
              <TrendingDown class="w-3 h-3" />
            {/if}
            <span class="font-medium">Net</span>
          </div>
          <div class="font-semibold {netAmount >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}">
            {currencyFormatter.format(Math.abs(netAmount))}
          </div>
        </div>
      </div>

      <!-- Legend (for large size) -->
      {#if config.size === 'large'}
        <div class="flex items-center justify-center gap-4 text-xs">
          <div class="flex items-center gap-1">
            <div class="w-3 h-2 rounded bg-green-500"></div>
            <span class="text-muted-foreground">Income</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-2 rounded bg-red-500"></div>
            <span class="text-muted-foreground">Expenses</span>
          </div>
        </div>
      {/if}
    {:else}
      <div class="text-center py-8 text-muted-foreground">
        <div class="text-sm">No income/expense data available</div>
      </div>
    {/if}
  </div>
</WidgetCard>
