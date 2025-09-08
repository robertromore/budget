<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import type { WidgetProps } from '$lib/types/widgets';
  import type { ChartType } from '$lib/components/charts/config/chart-types';
  import type { ChartDataPoint } from '$lib/components/charts/config/chart-config';
  import { currencyFormatter, periodFormatter } from '$lib/utils/formatters';
  import { TrendingDown, TrendingUp } from '$lib/components/icons';
  import { colorUtils } from '$lib/utils/colors';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const chartData = data?.['incomeExpenses'] ?? [];
  const period = $derived(config.settings?.['period'] ?? 'month');
  const chartType = $derived((config.settings?.['chartType'] ?? 'bar') as ChartType);

  // Calculate totals and net
  const totalIncome = chartData.reduce((sum: number, item: any) => sum + (item.income || 0), 0);
  const totalExpenses = chartData.reduce((sum: number, item: any) => sum + (item.expenses || 0), 0);
  const netAmount = totalIncome - totalExpenses;

  // Transform data for UnifiedChart - flatten into single array with series information
  const transformedChartData = $derived.by((): ChartDataPoint[] => {
    if (!chartData.length) return [];

    const flatData: ChartDataPoint[] = [];

    chartData.forEach((item: any, index: number) => {
      // Add income data point
      flatData.push({
        x: item.period,
        y: item.income || 0,
        category: 'Income',
        metadata: { 
          series: 'Income', 
          type: 'income',
          index,
          color: colorUtils.getChartColor(1)
        }
      });

      // Add expenses data point
      flatData.push({
        x: item.period,
        y: item.expenses || 0,
        category: 'Expenses',
        metadata: { 
          series: 'Expenses', 
          type: 'expenses',
          index,
          color: colorUtils.getChartColor(2)
        }
      });
    });

    return flatData;
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

    {#if transformedChartData.length > 0}
      <!-- Chart -->
      <div class="h-40">
        <UnifiedChart
          data={transformedChartData}
          type={chartType}
          styling={{
            colors: [colorUtils.getChartColor(1), colorUtils.getChartColor(2)],
            legend: { show: config.size === 'large', position: 'top' },
            dimensions: {
              padding: { left: 60, right: 20, top: 10, bottom: 40 }
            }
          }}
          axes={{
            x: { 
              show: config.size === 'large',
              rotateLabels: chartData.length > 4
            },
            y: { 
              show: true, 
              nice: true
            }
          }}
          controls={{
            show: false
          }}
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
