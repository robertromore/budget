<script lang="ts">
  import { UnifiedChart } from '@layerchart-wrapper/charts';
  import { transformBalanceHistory } from '$lib/utils/finance-chart-data';
  import type { WidgetProps } from '$lib/types/widgets';
  import type { ChartType } from '@layerchart-wrapper/charts/config/chart-types';
  import { currencyFormatter, periodFormatter } from '$lib/utils/formatters';
  import { TrendingDown, TrendingUp } from '$lib/components/icons';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const balanceHistory = data?.['balanceHistory'] ?? [];
  const period = $derived(config.settings?.['period'] ?? 'day');
  const chartType = $derived((config.settings?.['chartType'] ?? 'line') as ChartType);

  // Calculate trend
  const firstBalance = balanceHistory[0]?.balance ?? 0;
  const lastBalance = balanceHistory[balanceHistory.length - 1]?.balance ?? 0;
  const totalChange = lastBalance - firstBalance;
  const percentageChange = firstBalance !== 0 ? (totalChange / Math.abs(firstBalance)) * 100 : 0;

  // Transform data using the new utility
  const chartData = $derived(transformBalanceHistory(balanceHistory));

  // Find min/max for context
  const minBalance = Math.min(...balanceHistory.map((h: any) => h.balance));
  const maxBalance = Math.max(...balanceHistory.map((h: any) => h.balance));
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
        <UnifiedChart
          data={chartData}
          type={chartType}
          styling={{
            colors: [totalChange >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'],
            dimensions: {
              padding: {
                left: 80,
                right: 20,
                top: 10,
                bottom: chartType === 'bar' ? 40 : 10
              }
            }
          }}
          axes={{
            x: { 
              show: chartType === 'bar',
              rotateLabels: chartType === 'bar'
            },
            y: { 
              show: config.size === 'large',
              nice: true
            }
          }}
          timeFiltering={{
            enabled: true,
            field: 'date'
          }}
          controls={{
            show: false
          }}
          class="h-full w-full"
        />
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
