<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { {{ICON_NAME}} } from '$lib/components/icons';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  // TODO: Extract your metric from data
  const currentValue = data?.['{{METRIC_KEY}}'] ?? 0;
  const previousValue = data?.['{{PREVIOUS_METRIC_KEY}}'] ?? 0;
  
  // Calculate trend
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
  const isPositive = change >= 0;
  const isGoodChange = {{IS_POSITIVE_GOOD}}; // true if positive change is good, false otherwise

  // Format display values
  const displayValue = $derived(() => {
    // TODO: Customize formatting based on your metric type
    if (config.type === '{{WIDGET_TYPE}}') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(currentValue);
    }
    return currentValue.toString();
  });

  const displayChange = $derived(() => {
    if (change === 0) return '';
    const prefix = isPositive ? '+' : '';
    const suffix = Math.abs(changePercent) > 0.1 ? ` (${prefix}${changePercent.toFixed(1)}%)` : '';
    return `${prefix}${change.toFixed(2)}${suffix}`;
  });
</script>

<WidgetCard 
  {config} 
  {data} 
  {editMode}
  {...(onUpdate && { onUpdate })}
  {...(onRemove && { onRemove })}
>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <{{ICON_NAME}} class="h-4 w-4 text-muted-foreground" />
    </div>

    <div class="space-y-1">
      <div class="text-2xl font-bold">
        {displayValue}
      </div>
      
      {#if displayChange}
        <div class="flex items-center gap-1 text-xs">
          <span class="text-muted-foreground">Change:</span>
          <span class:text-green-600={isPositive === isGoodChange} 
                class:text-red-600={isPositive !== isGoodChange}>
            {displayChange}
          </span>
        </div>
      {/if}
      
      <!-- TODO: Add additional context or details -->
      {#if config.settings?.showDetails}
        <div class="text-xs text-muted-foreground">
          <!-- Add contextual information -->
          {{ADDITIONAL_INFO}}
        </div>
      {/if}
    </div>
  </div>
</WidgetCard>