<script lang="ts">
import ChartPlaceholder from '$lib/components/ui/chart-placeholder.svelte';
import type { WidgetProps } from '$lib/types/widgets';
import { currencyFormatter } from '$lib/utils/formatters';
import WidgetCard from './widget-card.svelte';

let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

const spendingData = data?.['spendingTrend'] ?? [];
const period = config.settings?.['period'] ?? 'month';
const showAverage = config.settings?.['showAverage'] ?? true;

// const maxAmount = Math.max(...spendingData.map((d: any) => d.amount), 1);
const average =
  spendingData.length > 0
    ? spendingData.reduce((sum: number, d: any) => sum + d.amount, 0) / spendingData.length
    : 0;

const chartConfig: ChartConfig = {
  amount: {
    label: 'Spending',
    color: 'hsl(var(--destructive))',
  },
};

const chartData = spendingData.map((item: any, index: number) => ({
  period: item.label || `Period ${index + 1}`,
  amount: item.amount,
  x: index,
  y: item.amount,
}));
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && { onUpdate }} {...onRemove && { onRemove }}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-muted-foreground text-sm font-medium">{config.title}</div>
      <div class="text-muted-foreground text-xs capitalize">Per {period}</div>
    </div>

    {#if chartData.length > 0}
      <!-- Chart -->
      <div class="h-32">
        <ChartPlaceholder class="h-full" title="Spending Trend" />
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div class="text-muted-foreground">Current</div>
          <div class="font-semibold">
            {currencyFormatter.format(spendingData[spendingData.length - 1]?.amount ?? 0)}
          </div>
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
        <div class="text-muted-foreground flex justify-between text-xs">
          <span>{spendingData[Math.max(0, spendingData.length - 6)]?.label ?? ''}</span>
          <span>{spendingData[spendingData.length - 1]?.label ?? ''}</span>
        </div>
      {/if}
    {:else}
      <div class="text-muted-foreground py-8 text-center">
        <div class="text-sm">No spending data available</div>
      </div>
    {/if}
  </div>
</WidgetCard>
