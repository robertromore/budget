<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { ChartContainer, ChartTooltip, type ChartConfig } from '$lib/components/ui/chart';
  import { Chart, Svg, Spline, Axis, Labels } from 'layerchart';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import { currencyFormatter } from '$lib/utils/formatters';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const balanceHistory = data?.balanceHistory ?? [];
  const period = config.settings?.period ?? 'day';
  
  const chartConfig: ChartConfig = {
    balance: {
      label: "Balance",
      color: "hsl(var(--primary))"
    }
  };

  // Calculate trend
  const firstBalance = balanceHistory[0]?.balance ?? 0;
  const lastBalance = balanceHistory[balanceHistory.length - 1]?.balance ?? 0;
  const totalChange = lastBalance - firstBalance;
  const percentageChange = firstBalance !== 0 ? (totalChange / Math.abs(firstBalance)) * 100 : 0;

  // Prepare chart data
  const chartData = balanceHistory.map((item, index) => ({
    date: item.date,
    balance: item.balance,
    x: index,
    y: item.balance
  }));

  // Find min/max for context
  const minBalance = Math.min(...balanceHistory.map(h => h.balance));
  const maxBalance = Math.max(...balanceHistory.map(h => h.balance));
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <div class="text-xs text-muted-foreground capitalize">{period}ly</div>
    </div>

    {#if chartData.length > 0}
      <!-- Trend Summary -->
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-bold">{currencyFormatter.format(lastBalance)}</div>
          <div class="text-xs text-muted-foreground">Current Balance</div>
        </div>
        
        <div class="text-right">
          <div class="flex items-center gap-1 {totalChange >= 0 ? 'text-green-600' : 'text-red-600'}">
            {#if totalChange > 0}
              <TrendingUp class="w-3 h-3" />
              <span class="text-sm font-semibold">+{currencyFormatter.format(totalChange)}</span>
            {:else if totalChange < 0}
              <TrendingDown class="w-3 h-3" />
              <span class="text-sm font-semibold">{currencyFormatter.format(totalChange)}</span>
            {:else}
              <span class="text-sm font-semibold">No change</span>
            {/if}
          </div>
          {#if Math.abs(percentageChange) > 0.01}
            <div class="text-xs text-muted-foreground">
              ({percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
            </div>
          {/if}
        </div>
      </div>

      <!-- Chart -->
      <div class="h-32">
        <ChartContainer config={chartConfig} class="h-full w-full">
          <Chart data={chartData} x="x" y="balance" yNice>
            <Svg>
              <Axis placement="bottom" formatTick={(i) => chartData[i]?.date?.split('T')[0] || ''} />
              <Spline 
                class={totalChange >= 0 ? 'stroke-green-500' : totalChange < 0 ? 'stroke-red-500' : 'stroke-gray-500'}
                className="stroke-2" 
              />
            </Svg>
          </Chart>
        </ChartContainer>
      </div>

      <!-- Stats (for medium/large sizes) -->
      {#if config.size === 'medium' || config.size === 'large'}
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
            <div class="text-green-600 font-medium">Highest</div>
            <div class="font-semibold text-green-700 dark:text-green-400">
              {currencyFormatter.format(maxBalance)}
            </div>
          </div>
          
          <div class="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
            <div class="text-red-600 font-medium">Lowest</div>
            <div class="font-semibold text-red-700 dark:text-red-400">
              {currencyFormatter.format(minBalance)}
            </div>
          </div>
        </div>
      {/if}

      <!-- Date Range (for large size) -->
      {#if config.size === 'large' && balanceHistory.length > 1}
        <div class="flex justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>{new Date(balanceHistory[0].date).toLocaleDateString()}</span>
          <span>{new Date(balanceHistory[balanceHistory.length - 1].date).toLocaleDateString()}</span>
        </div>
      {/if}
    {:else}
      <div class="text-center py-8 text-muted-foreground">
        <div class="text-sm">No balance history available</div>
      </div>
    {/if}
  </div>
</WidgetCard>