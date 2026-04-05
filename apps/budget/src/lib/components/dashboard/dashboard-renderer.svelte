<script lang="ts">
import { rpc } from '$lib/query';
import type { DashboardWithWidgets, DashboardWidget } from '$core/schema/dashboards';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import DashboardToolbar from './dashboard-toolbar.svelte';
import WidgetGrid from './widget-grid.svelte';
import WidgetCatalogSheet from './widget-catalog-sheet.svelte';
import DashboardSettingsDialog from './dashboard-settings-dialog.svelte';
import WidgetSettingsDialog from './widget-settings-dialog.svelte';
import ConfirmDialog from './confirm-dialog.svelte';

let {
  dashboard,
}: {
  dashboard: DashboardWithWidgets;
} = $props();

let editMode = $state(false);
let catalogOpen = $state(false);
let settingsOpen = $state(false);
let widgetSettingsOpen = $state(false);
let selectedWidget = $state<DashboardWidget | null>(null);
let removeDialogOpen = $state(false);
let pendingRemoveWidgetId = $state<number | null>(null);

async function handleAddWidget(widgetType: string) {
  const definition = getWidgetDefinition(widgetType);
  if (!definition) return;

  await rpc.dashboards.addWidget.execute({
    dashboardId: dashboard.id,
    widgetType,
    size: definition.defaultSize,
    columnSpan: definition.defaultColumnSpan,
    settings: definition.defaultSettings,
  });
  catalogOpen = false;
}

function handleRemoveWidget(widgetId: number) {
  pendingRemoveWidgetId = widgetId;
  removeDialogOpen = true;
}

async function confirmRemoveWidget() {
  if (pendingRemoveWidgetId === null) return;
  await rpc.dashboards.removeWidget.execute({ id: pendingRemoveWidgetId });
  pendingRemoveWidgetId = null;
}

function handleWidgetSettings(widget: DashboardWidget) {
  selectedWidget = widget;
  widgetSettingsOpen = true;
}

async function handleReorder(widgetIds: number[]) {
  await rpc.dashboards.reorderWidgets.execute({
    dashboardId: dashboard.id,
    widgetIds,
  });
}
</script>

<div class="space-y-6">
  <DashboardToolbar
    {dashboard}
    {editMode}
    onToggleEdit={() => (editMode = !editMode)}
    onAddWidget={() => (catalogOpen = true)}
    onSettings={() => (settingsOpen = true)} />

  <WidgetGrid
    widgets={dashboard.widgets}
    layout={dashboard.layout}
    {editMode}
    onRemoveWidget={handleRemoveWidget}
    onWidgetSettings={handleWidgetSettings}
    onReorder={handleReorder}
    onAddWidget={() => (catalogOpen = true)} />

  {#if dashboard.widgets.length === 0}
    <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
      <p class="text-muted-foreground text-lg">This dashboard has no widgets yet</p>
      <button
        class="text-primary hover:text-primary/80 text-sm underline"
        onclick={() => {
          editMode = true;
          catalogOpen = true;
        }}>
        Add your first widget
      </button>
    </div>
  {/if}

  <WidgetCatalogSheet bind:open={catalogOpen} onAddWidget={handleAddWidget} />
  <DashboardSettingsDialog bind:open={settingsOpen} {dashboard} />
  <WidgetSettingsDialog bind:open={widgetSettingsOpen} widget={selectedWidget} />
  <ConfirmDialog
    bind:open={removeDialogOpen}
    title="Remove Widget"
    description="This widget will be removed from the dashboard."
    confirmLabel="Remove"
    onConfirm={confirmRemoveWidget} />
</div>
