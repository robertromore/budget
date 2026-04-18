<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { DashboardWithWidgets } from '$core/schema/dashboards';
import DashboardSwitcher from './dashboard-switcher.svelte';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import Pencil from '@lucide/svelte/icons/pencil';
import Check from '@lucide/svelte/icons/check';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Plus from '@lucide/svelte/icons/plus';
import Save from '@lucide/svelte/icons/save';
import Settings from '@lucide/svelte/icons/settings';

let {
  dashboard,
  editMode = false,
  onToggleEdit,
  onAddWidget,
  onAddGroup,
  onReorder,
  onSaveAsGroup,
  onSettings,
}: {
  dashboard: DashboardWithWidgets;
  editMode?: boolean;
  onToggleEdit?: () => void;
  onAddWidget?: () => void;
  onAddGroup?: () => void;
  onReorder?: () => void;
  onSaveAsGroup?: () => void;
  onSettings?: () => void;
} = $props();

const hasSlots = $derived(
  dashboard.widgets.length + dashboard.groupInstances.length > 0
);
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
