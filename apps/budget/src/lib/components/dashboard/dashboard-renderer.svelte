<script lang="ts">
import { rpc } from '$lib/query';
import type { DashboardWithWidgets, DashboardWidget } from '$core/schema/dashboards';
import {
  findVariantByMetric,
  getWidgetDefinition,
  type WidgetStyle,
} from '$lib/types/dashboard-widgets';
import DashboardToolbar from './dashboard-toolbar.svelte';
import GroupedDashboardGrid from './grouped-dashboard-grid.svelte';
import WidgetCatalogSheet from './widget-catalog-sheet.svelte';
import DashboardSettingsDialog from './dashboard-settings-dialog.svelte';
import WidgetSettingsDialog from './widget-settings-dialog.svelte';
import ConfirmDialog from './confirm-dialog.svelte';
import PickGroupDialog from './pick-group-dialog.svelte';
import ReorderSlotsSheet from './reorder-slots-sheet.svelte';
import SaveAsGroupDialog from './save-as-group-dialog.svelte';
import StylePriorityDialog from './style-priority-dialog.svelte';

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
let pickGroupOpen = $state(false);
let saveAsGroupOpen = $state(false);
let removeGroupOpen = $state(false);
let pendingRemoveGroupId = $state<number | null>(null);
let reorderSheetOpen = $state(false);
let priorityDialogOpen = $state(false);

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

async function handleReorderSlots(
  slots: Array<{ kind: 'widget' | 'group'; id: number }>
) {
  await rpc.dashboards.reorderDashboardSlots.execute({
    dashboardId: dashboard.id,
    slots,
  });
}

function allDashboardWidgets(): DashboardWidget[] {
  const grouped = dashboard.groupInstances.flatMap((g) => g.widgets);
  return [...dashboard.widgets, ...grouped];
}

function computeRestyleUpdates(
  priority: WidgetStyle[]
): Array<{ id: number; widgetType: string }> {
  const updates: Array<{ id: number; widgetType: string }> = [];
  const pinnedInstanceIds = new Set(
    dashboard.groupInstances.filter((g) => g.stylePinned).map((g) => g.id)
  );

  for (const widget of allDashboardWidgets()) {
    if (widget.stylePinned) continue;
    if (
      widget.groupInstanceId !== null &&
      widget.groupInstanceId !== undefined &&
      pinnedInstanceIds.has(widget.groupInstanceId)
    ) {
      continue;
    }

    const def = getWidgetDefinition(widget.widgetType);
    if (!def) continue;

    for (const style of priority) {
      if (def.style === style) break; // already in target — no swap
      const variant = findVariantByMetric(def.metric, style);
      if (variant && variant.type !== widget.widgetType) {
        updates.push({ id: widget.id, widgetType: variant.type });
        break;
      }
    }
  }
  return updates;
}

async function handleRestyle(style: WidgetStyle) {
  const updates = computeRestyleUpdates([style]);
  await rpc.dashboards.restyleDashboardWidgets.execute({
    dashboardId: dashboard.id,
    updates,
  });
}

async function handleRestylePriority(priority: WidgetStyle[]) {
  await rpc.dashboards.saveDashboard.execute({
    id: dashboard.id,
    name: dashboard.name,
    slug: dashboard.slug,
    stylePriority: priority.length > 0 ? priority : null,
  });
  const updates = computeRestyleUpdates(priority);
  await rpc.dashboards.restyleDashboardWidgets.execute({
    dashboardId: dashboard.id,
    updates,
  });
}

async function handleClearPriority() {
  await rpc.dashboards.saveDashboard.execute({
    id: dashboard.id,
    name: dashboard.name,
    slug: dashboard.slug,
    stylePriority: null,
  });
}

async function handleReorderInstance(instanceId: number, widgetIds: number[]) {
  await rpc.widgetGroups.reorderGroupInstanceWidgets.execute({
    instanceId,
    widgetIds,
  });
}

async function handleRenameInstance(instanceId: number, name: string) {
  await rpc.widgetGroups.renameGroupInstance.execute({ id: instanceId, name });
}

async function handleToggleInstancePin(instanceId: number, pinned: boolean) {
  await rpc.widgetGroups.updateGroupInstance.execute({ id: instanceId, stylePinned: pinned });
}

function handleRemoveInstance(instanceId: number) {
  pendingRemoveGroupId = instanceId;
  removeGroupOpen = true;
}

async function confirmRemoveInstance() {
  if (pendingRemoveGroupId === null) return;
  await rpc.widgetGroups.removeGroupInstance.execute({ id: pendingRemoveGroupId });
  pendingRemoveGroupId = null;
}
</script>

<div class="space-y-6">
  <DashboardToolbar
    {dashboard}
    {editMode}
    onToggleEdit={() => (editMode = !editMode)}
    onAddWidget={() => (catalogOpen = true)}
    onAddGroup={() => (pickGroupOpen = true)}
    onReorder={() => (reorderSheetOpen = true)}
    onRestyle={handleRestyle}
    onRestylePriority={() => (priorityDialogOpen = true)}
    onClearPriority={handleClearPriority}
    onSaveAsGroup={() => (saveAsGroupOpen = true)}
    onSettings={() => (settingsOpen = true)} />

  <GroupedDashboardGrid
    widgets={dashboard.widgets}
    groupInstances={dashboard.groupInstances}
    layout={dashboard.layout}
    {editMode}
    onRemoveWidget={handleRemoveWidget}
    onWidgetSettings={handleWidgetSettings}
    onReorderSlots={handleReorderSlots}
    onReorderInstance={handleReorderInstance}
    onRenameInstance={handleRenameInstance}
    onRemoveInstance={handleRemoveInstance}
    onToggleInstancePin={handleToggleInstancePin}
    onAddWidget={() => (catalogOpen = true)} />

  {#if dashboard.widgets.length === 0 && dashboard.groupInstances.length === 0}
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
  <PickGroupDialog bind:open={pickGroupOpen} dashboardId={dashboard.id} />
  <SaveAsGroupDialog
    bind:open={saveAsGroupOpen}
    dashboardId={dashboard.id}
    defaultName={`${dashboard.name} set`} />
  <ConfirmDialog
    bind:open={removeGroupOpen}
    title="Remove group"
    description="This removes the group container and all widgets inside it from the dashboard. The saved group itself is unaffected."
    confirmLabel="Remove group"
    onConfirm={confirmRemoveInstance} />
  <ReorderSlotsSheet
    bind:open={reorderSheetOpen}
    dashboardId={dashboard.id}
    widgets={dashboard.widgets}
    groupInstances={dashboard.groupInstances} />
  <StylePriorityDialog
    bind:open={priorityDialogOpen}
    currentPriority={dashboard.stylePriority}
    onApply={handleRestylePriority} />
</div>
