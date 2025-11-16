<script lang="ts">
import type { WidgetProps } from '$lib/types/widgets';
import { currencyFormatter } from '$lib/utils/formatters';
import { TrendingDown, TrendingUp } from '$lib/components/icons';
import WidgetCard from './widget-card.svelte';

let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

const monthData = data?.['monthlyComparison'] ?? [];
const compareMonths = config.settings?.['compareMonths'] ?? 3;

const displayMonths = monthData.slice(-compareMonths);
const currentMonth = displayMonths[displayMonths.length - 1];
const previousMonth = displayMonths[displayMonths.length - 2];

const monthChange =
  currentMonth && previousMonth ? currentMonth.spending - previousMonth.spending : 0;
const changePercent = previousMonth?.spending ? (monthChange / previousMonth.spending) * 100 : 0;
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && { onUpdate }} {...onRemove && { onRemove }}>
  <div class="space-y-3">
    <div class="text-muted-foreground text-sm font-medium">{config.title}</div>

    {#if currentMonth}
      <!-- Current Month Stats -->
      <div class="text-center">
        <div class="text-2xl font-bold">{currencyFormatter.format(currentMonth.spending)}</div>
        <div class="text-muted-foreground text-xs">{currentMonth.name}</div>

        {#if previousMonth && Math.abs(monthChange) > 0.01}
          <div class="mt-1 flex items-center justify-center gap-1">
            {#if monthChange > 0}
              <TrendingUp class="h-3 w-3 text-red-600" />
              <span class="text-xs text-red-600">+{currencyFormatter.format(monthChange)}</span>
            {:else}
              <TrendingDown class="h-3 w-3 text-green-600" />
              <span class="text-xs text-green-600">{currencyFormatter.format(monthChange)}</span>
            {/if}
            {#if Math.abs(changePercent) > 0.1}
              <span class="text-muted-foreground text-xs">
                ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%)
              </span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Monthly Breakdown -->
      {#if (config.size === 'medium' || config.size === 'large') && displayMonths.length > 1}
        <div class="space-y-2 border-t pt-2">
          <div class="text-muted-foreground text-xs font-medium">Recent Months</div>
          {#each displayMonths.slice().reverse() as month, i}
            <div
              class="flex items-center justify-between rounded p-2 {i === 0
                ? 'bg-primary/5 border'
                : 'bg-muted/50'}">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{month.name}</span>
                {#if i === 0}
                  <span
                    class="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs"
                    >Current</span>
                {/if}
              </div>
              <div class="text-sm font-semibold">{currencyFormatter.format(month.spending)}</div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Average (for large size) -->
      {#if config.size === 'large' && displayMonths.length > 2}
        {@const average =
          displayMonths.reduce((sum: number, m: any) => sum + m.spending, 0) / displayMonths.length}
        <div class="border-t pt-2 text-center">
          <div class="text-muted-foreground text-xs">3-Month Average</div>
          <div class="text-sm font-semibold">{currencyFormatter.format(average)}</div>
        </div>
      {/if}
    {:else}
      <div class="text-muted-foreground py-8 text-center">
        <div class="text-sm">No monthly data available</div>
      </div>
    {/if}
  </div>
</WidgetCard>
