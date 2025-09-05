<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import { currencyFormatter } from '$lib/utils/formatters';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const monthData = data?.monthlyComparison ?? [];
  const compareMonths = config.settings?.compareMonths ?? 3;
  
  const displayMonths = monthData.slice(-compareMonths);
  const currentMonth = displayMonths[displayMonths.length - 1];
  const previousMonth = displayMonths[displayMonths.length - 2];
  
  const monthChange = currentMonth && previousMonth 
    ? currentMonth.spending - previousMonth.spending 
    : 0;
  const changePercent = previousMonth?.spending 
    ? (monthChange / previousMonth.spending) * 100 
    : 0;
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="space-y-3">
    <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
    
    {#if currentMonth}
      <!-- Current Month Stats -->
      <div class="text-center">
        <div class="text-2xl font-bold">{currencyFormatter.format(currentMonth.spending)}</div>
        <div class="text-xs text-muted-foreground">{currentMonth.name}</div>
        
        {#if previousMonth && Math.abs(monthChange) > 0.01}
          <div class="flex items-center justify-center gap-1 mt-1">
            {#if monthChange > 0}
              <TrendingUp class="w-3 h-3 text-red-600" />
              <span class="text-xs text-red-600">+{currencyFormatter.format(monthChange)}</span>
            {:else}
              <TrendingDown class="w-3 h-3 text-green-600" />
              <span class="text-xs text-green-600">{currencyFormatter.format(monthChange)}</span>
            {/if}
            {#if Math.abs(changePercent) > 0.1}
              <span class="text-xs text-muted-foreground">
                ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%)
              </span>
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Monthly Breakdown -->
      {#if (config.size === 'medium' || config.size === 'large') && displayMonths.length > 1}
        <div class="space-y-2 pt-2 border-t">
          <div class="text-xs font-medium text-muted-foreground">Recent Months</div>
          {#each displayMonths.slice().reverse() as month, i}
            <div class="flex items-center justify-between p-2 rounded {i === 0 ? 'bg-primary/5 border' : 'bg-muted/50'}">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{month.name}</span>
                {#if i === 0}
                  <span class="text-xs px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full">Current</span>
                {/if}
              </div>
              <div class="text-sm font-semibold">{currencyFormatter.format(month.spending)}</div>
            </div>
          {/each}
        </div>
      {/if}
      
      <!-- Average (for large size) -->
      {#if config.size === 'large' && displayMonths.length > 2}
        {@const average = displayMonths.reduce((sum, m) => sum + m.spending, 0) / displayMonths.length}
        <div class="pt-2 border-t text-center">
          <div class="text-xs text-muted-foreground">3-Month Average</div>
          <div class="text-sm font-semibold">{currencyFormatter.format(average)}</div>
        </div>
      {/if}
    {:else}
      <div class="text-center py-8 text-muted-foreground">
        <div class="text-sm">No monthly data available</div>
      </div>
    {/if}
  </div>
</WidgetCard>