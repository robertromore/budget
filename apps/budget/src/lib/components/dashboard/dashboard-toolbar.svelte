<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import type { DashboardWithWidgets } from '$core/schema/dashboards';
import { WIDGET_STYLE_LABELS, WIDGET_STYLES, type WidgetStyle } from '$lib/types/dashboard-widgets';
import DashboardSwitcher from './dashboard-switcher.svelte';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import ListOrdered from '@lucide/svelte/icons/list-ordered';
import Palette from '@lucide/svelte/icons/palette';
import Pencil from '@lucide/svelte/icons/pencil';
import Check from '@lucide/svelte/icons/check';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Plus from '@lucide/svelte/icons/plus';
import Save from '@lucide/svelte/icons/save';
import Settings from '@lucide/svelte/icons/settings';
import X from '@lucide/svelte/icons/x';

let {
  dashboard,
  editMode = false,
  onToggleEdit,
  onAddWidget,
  onAddGroup,
  onReorder,
  onRestyle,
  onRestylePriority,
  onClearPriority,
  onSaveAsGroup,
  onSettings,
}: {
  dashboard: DashboardWithWidgets;
  editMode?: boolean;
  onToggleEdit?: () => void;
  onAddWidget?: () => void;
  onAddGroup?: () => void;
  onReorder?: () => void;
  onRestyle?: (style: WidgetStyle) => void;
  onRestylePriority?: () => void;
  onClearPriority?: () => void;
  onSaveAsGroup?: () => void;
  onSettings?: () => void;
} = $props();

const hasSlots = $derived(
  dashboard.widgets.length + dashboard.groupInstances.length > 0
);

const priority = $derived(dashboard.stylePriority ?? null);

function styleAbbr(style: WidgetStyle): string {
  return WIDGET_STYLE_LABELS[style].slice(0, 2).toUpperCase();
}

const priorityBadge = $derived.by(() => {
  if (!priority || priority.length === 0) return null;
  return priority.slice(0, 2).map(styleAbbr).join('·');
});
</script>

<div class="flex items-center justify-between">
  <div class="flex items-center gap-3">
    <DashboardSwitcher current={dashboard} />
    {#if dashboard.description}
      <p class="text-muted-foreground hidden text-sm md:block">{dashboard.description}</p>
    {/if}
  </div>
  <div class="flex items-center gap-2">
    {#if editMode}
      <Button variant="outline" size="sm" onclick={onAddWidget}>
        <Plus class="mr-1.5 h-4 w-4" />
        Add Widget
      </Button>
      {#if onAddGroup}
        <Button variant="outline" size="sm" onclick={onAddGroup}>
          <LayoutGrid class="mr-1.5 h-4 w-4" />
          Add Group
        </Button>
      {/if}
      {#if onReorder && hasSlots}
        <Button variant="outline" size="sm" onclick={onReorder}>
          <ArrowUpDown class="mr-1.5 h-4 w-4" />
          Reorder
        </Button>
      {/if}
      {#if onRestyle && hasSlots}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button variant="outline" size="sm" {...props}>
                <Palette class="mr-1.5 h-4 w-4" />
                Style
                {#if priorityBadge}
                  <span class="ml-1.5 rounded bg-primary/15 px-1 py-0.5 font-mono text-[10px] text-primary">
                    {priorityBadge}
                  </span>
                {/if}
                <ChevronDown class="ml-1 h-3 w-3" />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-56">
            <DropdownMenu.Group>
              <DropdownMenu.GroupHeading>Restyle dashboard</DropdownMenu.GroupHeading>
              {#each WIDGET_STYLES as style}
                <DropdownMenu.Item onclick={() => onRestyle(style)}>
                  {WIDGET_STYLE_LABELS[style]}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Group>
            {#if onRestylePriority}
              <DropdownMenu.Separator />
              <DropdownMenu.Item onclick={() => onRestylePriority()}>
                <ListOrdered class="mr-2 h-4 w-4" />
                Set priority…
              </DropdownMenu.Item>
              {#if priority && priority.length > 0 && onClearPriority}
                <DropdownMenu.Item onclick={() => onClearPriority()}>
                  <X class="mr-2 h-4 w-4" />
                  Clear priority
                </DropdownMenu.Item>
              {/if}
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
      {#if onSaveAsGroup && dashboard.widgets.length > 0}
        <Button variant="outline" size="sm" onclick={onSaveAsGroup}>
          <Save class="mr-1.5 h-4 w-4" />
          Save as Group
        </Button>
      {/if}
      <Button variant="outline" size="sm" onclick={onSettings}>
        <Settings class="mr-1.5 h-4 w-4" />
        Settings
      </Button>
    {/if}
    <Button
      variant={editMode ? 'default' : 'outline'}
      size="sm"
      onclick={onToggleEdit}>
      {#if editMode}
        <Check class="mr-1.5 h-4 w-4" />
        Done
      {:else}
        <Pencil class="mr-1.5 h-4 w-4" />
        Edit
      {/if}
    </Button>
  </div>
</div>
