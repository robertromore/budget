<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { DashboardWithWidgets } from '$core/schema/dashboards';
import DashboardSwitcher from './dashboard-switcher.svelte';
import Pencil from '@lucide/svelte/icons/pencil';
import Check from '@lucide/svelte/icons/check';
import Plus from '@lucide/svelte/icons/plus';
import Settings from '@lucide/svelte/icons/settings';

let {
  dashboard,
  editMode = false,
  onToggleEdit,
  onAddWidget,
  onSettings,
}: {
  dashboard: DashboardWithWidgets;
  editMode?: boolean;
  onToggleEdit?: () => void;
  onAddWidget?: () => void;
  onSettings?: () => void;
} = $props();
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
