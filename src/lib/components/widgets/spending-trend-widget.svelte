<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { ChartContainer, type ChartConfig } from '$lib/components/ui/chart';
  import { Area, Chart, Svg, Spline } from 'layerchart';
  import { currencyFormatter } from '$lib/utils/formatters';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const spendingData = data?.spendingTrend ?? [];
  const period = config.settings?.period ?? 'month';
  const showAverage = config.settings?.showAverage ?? true;
  
  const maxAmount = Math.max(...spendingData.map(d => d.amount), 1);
  const average = spendingData.length > 0 
    ? spendingData.reduce((sum, d) => sum + d.amount, 0) / spendingData.length 
    : 0;

  const chartConfig: ChartConfig = {
    amount: {
      label: "Spending",
      color: "hsl(var(--destructive))"
    }
  };

  const chartData = spendingData.map((item, index) => ({
    period: item.label || `Period ${index + 1}`,
    amount: item.amount,
    x: index,
    y: item.amount
  }));
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <div class="text-xs text-muted-foreground capitalize">Per {period}</div>
    </div>
    
{#if chartData.length > 0}
      <!-- Chart -->
      <div class="h-32">
        <ChartContainer config={chartConfig} class="h-full w-full">
          <Chart data={chartData} x="x" y="amount" yNice>
            <Svg>
              <Area class="fill-destructive/20" />
              <Spline class="stroke-destructive stroke-2" />
            </Svg>
          </Chart>
        </ChartContainer>
      </div>
      
      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div class="text-muted-foreground">Current</div>
          <div class="font-semibold">{currencyFormatter.format(spendingData[spendingData.length - 1]?.amount ?? 0)}</div>
        </div>
        {#if showAverage}
          <div>
            <div class="text-muted-foreground">Average</div>
            <div class="font-semibold">{currencyFormatter.format(average)}</div>
          </div>
        {/if}
      </div>
      
      <!-- Period Labels (for large size) -->
      {#if config.size === 'large'}
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>{spendingData[Math.max(0, spendingData.length - 6)]?.label ?? ''}</span>
          <span>{spendingData[spendingData.length - 1]?.label ?? ''}</span>
        </div>
      {/if}
    {:else}
      <div class="text-center py-8 text-muted-foreground">
        <div class="text-sm">No spending data available</div>
      </div>
    {/if}
  </div>
</WidgetCard>