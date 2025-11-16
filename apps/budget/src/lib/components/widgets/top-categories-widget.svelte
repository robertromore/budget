<script lang="ts">
import type { WidgetProps } from '$lib/types/widgets';
import { colorUtils } from '$lib/utils/colors';
import { currencyFormatter } from '$lib/utils/formatters';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import Tag from '@lucide/svelte/icons/tag';
import WidgetCard from './widget-card.svelte';

let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

const categories = data?.['topCategories'] ?? [];
const limit = config.settings?.['limit'] ?? 5;
const period = config.settings?.['period'] ?? 'month';

const displayCategories = categories.slice(0, limit);
const maxAmount = displayCategories[0]?.amount ?? 1;

// Helper to get category icon
const getCategoryIcon = (iconName: string | null | undefined) => {
  if (!iconName) return Tag;
  const iconData = getIconByName(iconName);
  return iconData?.icon || Tag;
};
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && { onUpdate }} {...onRemove && { onRemove }}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-muted-foreground text-sm font-medium">{config.title}</div>
      <div class="text-muted-foreground text-xs capitalize">{period}</div>
    </div>

    <div class="space-y-2">
      {#each displayCategories as category, i (category.name)}
        {@const Icon = getCategoryIcon(category.icon)}
        <div class="flex items-center gap-2">
          <div class="flex items-center justify-center">
            {#if category.icon}
              <Icon
                class="h-4 w-4"
                style={category.color
                  ? `color: ${category.color};`
                  : `color: ${colorUtils.getChartColor(i)};`} />
            {:else}
              <div
                class="h-3 w-3 rounded-full"
                style="background-color: {category.color || colorUtils.getChartColor(i)}">
              </div>
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <span class="truncate text-sm font-medium">{category.name}</span>
              <span class="text-sm font-semibold">{currencyFormatter.format(category.amount)}</span>
            </div>
            <div class="bg-muted mt-1 h-1.5 w-full rounded-full">
              <div
                class="h-1.5 rounded-full transition-all duration-300"
                style="width: {(category.amount / maxAmount) *
                  100}%; background-color: {category.color || colorUtils.getChartColor(i)}">
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="text-sm text-muted-foreground text-center py-4">No category data available</div>
      {/each}
    </div>

    {#if config.size === 'large' && categories.length > limit}
      <div class="text-muted-foreground border-t pt-2 text-center text-xs">
        +{categories.length - limit} more categories
      </div>
    {/if}
  </div>
</WidgetCard>
