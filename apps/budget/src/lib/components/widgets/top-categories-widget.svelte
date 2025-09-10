<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import { colorUtils } from '@budget-shared/utils';
  import { currencyFormatter } from '$lib/utils/formatters';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const categories = data?.['topCategories'] ?? [];
  const limit = config.settings?.['limit'] ?? 5;
  const period = config.settings?.['period'] ?? 'month';

  const displayCategories = categories.slice(0, limit);
  const maxAmount = displayCategories[0]?.amount ?? 1;
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
      <div class="text-xs text-muted-foreground capitalize">{period}</div>
    </div>

    <div class="space-y-2">
      {#each displayCategories as category, i (category.name)}
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" style="background-color: {category.color || colorUtils.getChartColor(i)}"></div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium truncate">{category.name}</span>
              <span class="text-sm font-semibold">{currencyFormatter.format(category.amount)}</span>
            </div>
            <div class="w-full bg-muted rounded-full h-1.5 mt-1">
              <div
                class="h-1.5 rounded-full transition-all duration-300"
                style="width: {(category.amount / maxAmount) * 100}%; background-color: {category.color || colorUtils.getChartColor(i)}"
              ></div>
            </div>
          </div>
        </div>
      {:else}
        <div class="text-sm text-muted-foreground text-center py-4">
          No category data available
        </div>
      {/each}
    </div>

    {#if config.size === 'large' && categories.length > limit}
      <div class="text-xs text-muted-foreground text-center pt-2 border-t">
        +{categories.length - limit} more categories
      </div>
    {/if}
  </div>
</WidgetCard>
