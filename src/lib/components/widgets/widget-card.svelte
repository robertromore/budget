<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import { WIDGET_DEFINITIONS } from '$lib/types/widgets';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { cn } from '$lib/utils';
  import Settings from '@lucide/svelte/icons/settings';
  import X from '@lucide/svelte/icons/x';
  import MoreVertical from '@lucide/svelte/icons/more-vertical';

  let { 
    config, 
    data, 
    onUpdate, 
    onRemove, 
    editMode = false,
    children
  }: WidgetProps & { children: any } = $props();

  const sizeClasses = {
    small: 'widget-size-small',
    medium: 'widget-size-medium', 
    large: 'widget-size-large'
  };

  // Get available sizes for this widget type
  const availableSizes = WIDGET_DEFINITIONS[config.type]?.availableSizes ?? ['small', 'medium', 'large'];
</script>

<div 
  class={cn(
    "rounded-lg border p-4 relative transition-all duration-200 overflow-hidden flex flex-col",
    sizeClasses[config.size],
    editMode && "border-dashed border-2 border-primary/30 bg-card"
  )}
  data-widget-id={config.id}
>
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
          {#each availableSizes as size}
            <DropdownMenu.Item 
              onclick={() => onUpdate?.({ size })}
              class={config.size === size ? 'bg-accent' : ''}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </DropdownMenu.Item>
          {/each}
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => onRemove?.()} class="text-red-600">
            Remove Widget
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/if}

  <!-- Widget content -->
  <div class={cn("flex-1 overflow-hidden", editMode ? 'pr-16' : '')}>
    {@render children()}
  </div>
</div>