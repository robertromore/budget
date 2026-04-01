<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import type { DashboardWidget } from '$lib/schema/dashboards';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import Settings from '@lucide/svelte/icons/settings';
import X from '@lucide/svelte/icons/x';
import type { Snippet } from 'svelte';

let {
  widget,
  editMode = false,
  onRemove,
  onSettings,
  children,
  dragHandleProps = {},
}: {
  widget: DashboardWidget;
  editMode?: boolean;
  onRemove?: () => void;
  onSettings?: () => void;
  children: Snippet;
  dragHandleProps?: Record<string, any>;
} = $props();

const definition = $derived(getWidgetDefinition(widget.widgetType));
const title = $derived(widget.title || definition?.label || widget.widgetType);
</script>

<Card.Root class="relative h-full transition-shadow {editMode ? 'ring-2 ring-primary/20' : ''}">
  <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
    <Card.Title class="flex items-center gap-2 text-sm font-medium">
      {#if editMode}
        <button class="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing" {...dragHandleProps}>
          <GripVertical class="h-4 w-4" />
        </button>
      {/if}
      {title}
    </Card.Title>
    {#if editMode}
      <div class="flex items-center gap-1">
        {#if onSettings}
          <Button variant="ghost" size="icon" class="h-6 w-6" onclick={onSettings}>
            <Settings class="h-3.5 w-3.5" />
          </Button>
        {/if}
        {#if onRemove}
          <Button variant="ghost" size="icon" class="h-6 w-6 text-destructive" onclick={onRemove}>
            <X class="h-3.5 w-3.5" />
          </Button>
        {/if}
      </div>
    {/if}
  </Card.Header>
  <Card.Content>
    {@render children()}
  </Card.Content>
</Card.Root>
