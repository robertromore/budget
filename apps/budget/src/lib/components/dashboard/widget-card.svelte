<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import type { DashboardWidget } from '$core/schema/dashboards';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import Lock from '@lucide/svelte/icons/lock';
import Settings from '@lucide/svelte/icons/settings';
import X from '@lucide/svelte/icons/x';
import type { Snippet } from 'svelte';

let {
  widget,
  editMode = false,
  bare = false,
  onRemove,
  onSettings,
  children,
  dragHandleProps = {},
}: {
  widget: DashboardWidget;
  editMode?: boolean;
  /**
   * Self-contained widgets render their own container + header. In
   * that mode we skip the outer Card chrome and float the edit-mode
   * controls as an overlay so there isn't a doubled-up border + title
   * row.
   */
  bare?: boolean;
  onRemove?: () => void;
  onSettings?: () => void;
  children: Snippet;
  dragHandleProps?: Record<string, any>;
} = $props();

const definition = $derived(getWidgetDefinition(widget.widgetType));
const title = $derived(widget.title || definition?.label || widget.widgetType);
</script>

{#if bare}
  <div
    class="group/widget relative h-full {editMode
      ? 'rounded-xl ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
      : ''}">
    {#if editMode}
      <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-1">
        <button
          class="bg-background/80 text-muted-foreground hover:text-foreground pointer-events-auto cursor-grab rounded-md border p-1 shadow-sm backdrop-blur-sm active:cursor-grabbing"
          aria-label="Drag widget"
          {...dragHandleProps}>
          <GripVertical class="h-3.5 w-3.5" />
        </button>
        <div class="pointer-events-auto flex items-center gap-0.5 rounded-md border bg-background/80 p-0.5 shadow-sm backdrop-blur-sm">
          {#if widget.stylePinned}
            <span
              class="flex h-6 w-6 items-center justify-center"
              title="Style pinned — excluded from restyle"
              aria-label="Style pinned">
              <Lock class="h-3.5 w-3.5 text-primary/70" />
            </span>
          {/if}
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
      </div>
    {:else if widget.stylePinned}
      <span
        class="absolute right-2 top-2 z-10"
        title="Style pinned — excluded from restyle"
        aria-label="Style pinned">
        <Lock class="h-3 w-3 text-primary/60" />
      </span>
    {/if}
    {@render children()}
  </div>
{:else}
  <Card.Root class="relative h-full transition-shadow {editMode ? 'ring-2 ring-primary/20' : ''}">
    <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
      <Card.Title class="flex items-center gap-2 text-sm font-medium">
        {#if editMode}
          <button class="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing" {...dragHandleProps}>
            <GripVertical class="h-4 w-4" />
          </button>
        {/if}
        <span class="truncate">{title}</span>
        {#if widget.stylePinned}
          <span
            class="shrink-0"
            title="Style pinned — excluded from restyle"
            aria-label="Style pinned">
            <Lock class="h-3 w-3 text-primary/70" />
          </span>
        {/if}
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
{/if}
