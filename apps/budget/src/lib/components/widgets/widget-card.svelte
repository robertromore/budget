<script lang="ts">
import {Settings} from '$lib/components/icons';
import {Button} from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import type {WidgetProps} from '$lib/types/widgets';
import {WIDGET_CHART_TYPES, WIDGET_DEFINITIONS} from '$lib/types/widgets';
import {cn} from '$lib/utils';

let {
  config,
  data,
  onUpdate = undefined,
  onRemove = undefined,
  editMode = false,
  children,
}: WidgetProps & {children: any} = $props();

const sizeClasses = {
  small: 'widget-size-small',
  medium: 'widget-size-medium',
  large: 'widget-size-large',
};

// Get available sizes for this widget type
const availableSizes = WIDGET_DEFINITIONS[config.type]?.availableSizes ?? [
  'small',
  'medium',
  'large',
];

// Get available chart types for this widget type
const availableChartTypes = WIDGET_CHART_TYPES[config.type] ?? [];
const currentChartType = $derived(config.settings?.['chartType']);
</script>

<div
  class={cn(
    'relative flex flex-col overflow-hidden rounded-lg border p-4 transition-all duration-200',
    sizeClasses[config.size],
    editMode && 'border-primary/30 bg-card border-2 border-dashed'
  )}
  data-widget-id={config.id}>
  <!-- Edit mode controls -->
  {#if editMode}
    <div class="absolute top-2 right-2 flex items-center gap-1">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost" size="sm" class="h-6 w-6 p-0">
            <Settings class="size-3" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {#if availableSizes.length > 1}
            <DropdownMenu.Label>Size</DropdownMenu.Label>
            {#each availableSizes as size}
              <DropdownMenu.Item
                onclick={() => onUpdate?.({size})}
                class={config.size === size ? 'bg-accent' : ''}>
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </DropdownMenu.Item>
            {/each}
            <DropdownMenu.Separator />
          {/if}

          {#if availableChartTypes.length > 1}
            <DropdownMenu.Label>Chart Type</DropdownMenu.Label>
            {#each availableChartTypes as chartType}
              <DropdownMenu.Item
                onclick={() =>
                  onUpdate?.({settings: {...config.settings, chartType: chartType.value}})}
                class={currentChartType === chartType.value ? 'bg-accent' : ''}>
                <div class="flex items-center gap-2">
                  <chartType.icon class="size-3" />
                  <span>{chartType.label}</span>
                </div>
              </DropdownMenu.Item>
            {/each}
            <DropdownMenu.Separator />
          {/if}

          <DropdownMenu.Item onclick={() => onRemove?.()} class="text-red-600">
            Remove Widget
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/if}

  <!-- Widget content -->
  <div class={cn('flex-1 overflow-hidden', editMode ? 'pr-16' : '')}>
    {@render children()}
  </div>
</div>
