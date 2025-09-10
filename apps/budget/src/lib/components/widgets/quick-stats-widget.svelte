<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import { currencyFormatter } from '$lib/utils/formatters';
  import { Clock, DollarSign, TrendingDown, TrendingUp } from '$lib/components/icons';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const stats = data?.['quickStats'] ?? {};
  const metrics = config.settings?.['metrics'] ?? ['avgTransaction', 'highestExpense', 'lastActivity'];

  const getMetricData = (metric: string) => {
    switch (metric) {
      case 'avgTransaction':
        return {
          label: 'Avg Transaction',
          value: currencyFormatter.format(stats.avgTransaction ?? 0),
          icon: DollarSign,
          trend: stats.avgTransactionTrend,
          color: 'text-blue-600'
        };
      case 'highestExpense':
        return {
          label: 'Highest Expense',
          value: currencyFormatter.format(stats.highestExpense ?? 0),
          icon: TrendingDown,
          trend: null,
          color: 'text-red-600'
        };
      case 'lastActivity':
        return {
          label: 'Last Activity',
          value: stats.lastActivity ?? 'No data',
          icon: Clock,
          trend: null,
          color: 'text-gray-600'
        };
      case 'totalIncome':
        return {
          label: 'Total Income',
          value: currencyFormatter.format(stats.totalIncome ?? 0),
          icon: TrendingUp,
          trend: stats.incomeTrend,
          color: 'text-green-600'
        };
      case 'totalExpenses':
        return {
          label: 'Total Expenses',
          value: currencyFormatter.format(stats.totalExpenses ?? 0),
          icon: TrendingDown,
          trend: stats.expensesTrend,
          color: 'text-red-600'
        };
      default:
        return {
          label: 'Unknown',
          value: '—',
          icon: DollarSign,
          trend: null,
          color: 'text-gray-600'
        };
    }
  };
</script>

<WidgetCard 
  {config} 
  {data} 
  {editMode}
  {...(onUpdate && { onUpdate })}
  {...(onRemove && { onRemove })}
>
  <div class="space-y-3">
    <div class="text-sm font-medium text-muted-foreground">{config.title}</div>

    <div class="grid gap-3 {config.size === 'large' ? 'grid-cols-2' : 'grid-cols-1'}">
      {#each metrics.slice(0, config.size === 'large' ? 6 : config.size === 'medium' ? 4 : 3) as metric}
        {@const metricData = getMetricData(metric)}
        <div class="p-3 rounded-lg border bg-card/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <metricData.icon class="w-4 h-4 {metricData.color}" />
              <div>
                <div class="text-xs text-muted-foreground">{metricData.label}</div>
                <div class="text-sm font-semibold">{metricData.value}</div>
              </div>
            </div>

            {#if metricData.trend}
              <div class="flex items-center gap-1 text-xs">
                {#if metricData.trend > 0}
                  <TrendingUp class="w-3 h-3 text-green-600" />
                  <span class="text-green-600">+{metricData.trend.toFixed(1)}%</span>
                {:else if metricData.trend < 0}
                  <TrendingDown class="w-3 h-3 text-red-600" />
                  <span class="text-red-600">{metricData.trend.toFixed(1)}%</span>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</WidgetCard>
