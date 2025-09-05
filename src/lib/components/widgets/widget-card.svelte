<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
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
    small: 'col-span-1',
    medium: 'col-span-2', 
    large: 'col-span-3'
  };
</script>

<div 
  class={cn(
    "rounded-lg border p-4 relative transition-all duration-200",
    sizeClasses[config.size],
    editMode && "border-dashed border-2 border-blue-300 bg-blue-50/50"
  )}
  data-widget-id={config.id}
>
  <!-- Edit mode controls -->
  {#if editMode}
    <div class="absolute top-2 right-2 flex items-center gap-1">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="ghost" size="sm" class="h-6 w-6 p-0">
            <MoreVertical class="size-3" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onclick={() => onUpdate?.({ size: 'small' })}>
            Small
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => onUpdate?.({ size: 'medium' })}>
            Medium  
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => onUpdate?.({ size: 'large' })}>
            Large
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => onRemove?.()} class="text-red-600">
            Remove Widget
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/if}

  <!-- Widget content -->
  <div class={editMode ? 'pr-16' : ''}>
    {@render children()}
  </div>
</div>