<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { ChartContainer, type ChartConfig } from '$lib/components/ui/chart';
  import { Chart, Svg, Bars } from 'layerchart';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import { currencyFormatter } from '$lib/utils/formatters';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const chartData = data?.incomeExpenses ?? [];
  const period = config.settings?.period ?? 'month';
  
  const chartConfig: ChartConfig = {
    income: {
      label: "Income",
      color: "hsl(var(--success) / 0.8)"
    },
    expenses: {
      label: "Expenses", 
      color: "hsl(var(--destructive) / 0.8)"
    }
  };

  // Calculate totals and net
  const totalIncome = chartData.reduce((sum, item) => sum + (item.income || 0), 0);
  const totalExpenses = chartData.reduce((sum, item) => sum + (item.expenses || 0), 0);
  const netAmount = totalIncome - totalExpenses;
  
  // Prepare data for layerchart (grouped bar chart)
  const chartFormatData = chartData.flatMap(item => [
    {
      period: item.period,
      type: 'income',
      amount: item.income || 0,
      x: item.period,
      y: item.income || 0,
      group: 'income'
    },
    {
      period: item.period,
      type: 'expenses', 
      amount: item.expenses || 0,
      x: item.period,
      y: item.expenses || 0,
      group: 'expenses'
    }
  ]);
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <div class="text-xs text-muted-foreground capitalize">{period}ly</div>
    </div>

    {#if chartData.length > 0}
      <!-- Chart -->
      <div class="h-40">
        <ChartContainer config={chartConfig} class="h-full w-full">
          <Chart data={chartFormatData} x="x" y="amount" groupBy="group" yNice>
            <Svg>
              <Bars 
                groupPadding={0.1}
                className={(d) => d.group === 'income' ? 'fill-green-500' : 'fill-red-500'}
              />
            </Svg>
          </Chart>
        </ChartContainer>
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