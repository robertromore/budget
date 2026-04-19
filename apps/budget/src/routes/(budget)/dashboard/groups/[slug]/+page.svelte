<script lang="ts">
import { page } from '$app/state';
import { goto } from '$app/navigation';
import type {
  DashboardLayoutConfig,
  DashboardWidget,
  WidgetSettings,
  WidgetSize,
} from '$core/schema/dashboards';
import type { DashboardWidgetGroupItem } from '$core/schema/dashboard-widget-groups';
import ApplyGroupDialog from '$lib/components/dashboard/apply-group-dialog.svelte';
import ConfirmDialog from '$lib/components/dashboard/confirm-dialog.svelte';
import WidgetCatalogSheet from '$lib/components/dashboard/widget-catalog-sheet.svelte';
import WidgetGrid from '$lib/components/dashboard/widget-grid.svelte';
import WidgetSettingsDialog from '$lib/components/dashboard/widget-settings-dialog.svelte';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import { rpc } from '$lib/query';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Copy from '@lucide/svelte/icons/copy';
import Lock from '@lucide/svelte/icons/lock';
import Pencil from '@lucide/svelte/icons/pencil';
import Send from '@lucide/svelte/icons/send';

const slug = $derived(page.params.slug ?? '');
const groupQuery = $derived(rpc.widgetGroups.getWidgetGroup(slug).options());
const group = $derived(groupQuery.data);

const isSystem = $derived(group?.isSystem ?? false);

let catalogOpen = $state(false);
let itemSettingsOpen = $state(false);
let selectedItem = $state<DashboardWidgetGroupItem | null>(null);
let removeOpen = $state(false);
let pendingRemoveId = $state<number | null>(null);
let renameOpen = $state(false);
let renameName = $state('');
let renameDescription = $state('');
let applyOpen = $state(false);

const editorLayout: DashboardLayoutConfig = { columns: 4, gap: 'normal' };

function itemToWidget(item: DashboardWidgetGroupItem): DashboardWidget {
  return {
    id: item.id,
    dashboardId: 0,
    groupInstanceId: null,
    widgetType: item.widgetType,
    title: item.title,
    size: item.size,
    sortOrder: item.sortOrder,
    columnSpan: item.columnSpan,
    settings: item.settings,
    stylePinned: false,
    createdAt: '',
    updatedAt: '',
  };
}

const displayWidgets = $derived(
  group ? group.items.map(itemToWidget) : []
);

async function handleAddWidget(widgetType: string) {
  if (!group || isSystem) return;
  const definition = getWidgetDefinition(widgetType);
  if (!definition) return;
  await rpc.widgetGroups.addGroupItem.execute({
    groupId: group.id,
    widgetType,
    size: definition.defaultSize,
    columnSpan: definition.defaultColumnSpan,
    settings: definition.defaultSettings,
  });
  catalogOpen = false;
}

function handleRemoveItem(itemId: number) {
  if (isSystem) return;
  pendingRemoveId = itemId;
  removeOpen = true;
}

async function confirmRemove() {
  if (pendingRemoveId === null) return;
  await rpc.widgetGroups.removeGroupItem.execute({ id: pendingRemoveId });
  pendingRemoveId = null;
}

function handleItemSettings(widget: DashboardWidget) {
  if (!group) return;
  const item = group.items.find((i) => i.id === widget.id);
  if (item) {
    selectedItem = item;
    itemSettingsOpen = true;
  }
}

async function handleItemSave(update: {
  id: number;
  title: string | null;
  size: WidgetSize;
  columnSpan: number;
  settings: Record<string, unknown>;
}) {
  await rpc.widgetGroups.updateGroupItem.execute({
    id: update.id,
    title: update.title,
    size: update.size,
    columnSpan: update.columnSpan,
    settings: update.settings as WidgetSettings,
  });
}

async function handleReorder(itemIds: number[]) {
  if (!group || isSystem) return;
  await rpc.widgetGroups.reorderGroupItems.execute({
    groupId: group.id,
    itemIds,
  });
}

function openRename() {
  if (!group || isSystem) return;
  renameName = group.name;
  renameDescription = group.description ?? '';
  renameOpen = true;
}

async function handleRename() {
  if (!group || !renameName.trim()) return;
  await rpc.widgetGroups.updateWidgetGroup.execute({
    id: group.id,
    name: renameName.trim(),
    description: renameDescription.trim() || null,
  });
  renameOpen = false;
}

async function handleDuplicate() {
  if (!group) return;
  const result = await rpc.widgetGroups.duplicateWidgetGroup.execute({ id: group.id });
  await goto(`/dashboard/groups/${result.slug}`);
}

const editMode = $derived(!isSystem);

const settingsDialogWidget = $derived(
  selectedItem ? itemToWidget(selectedItem) : null
);
</script>

<svelte:head>
  <title>{group?.name ?? 'Widget group'} — Budget App</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-start justify-between gap-4">
    <div class="flex items-start gap-3">
      <Button variant="outline" size="icon" href="/dashboard/groups">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold tracking-tight">
            {group?.name ?? 'Loading…'}
          </h1>
          {#if isSystem}
            <Badge variant="outline" class="gap-1">
              <Lock class="h-3 w-3" /> Preset
            </Badge>
          {/if}
        </div>
        {#if group?.description}
          <p class="text-muted-foreground text-sm">{group.description}</p>
        {/if}
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      {#if group && !isSystem}
        <Button variant="outline" onclick={openRename}>
          <Pencil class="mr-1.5 h-4 w-4" />
          Rename
        </Button>
      {/if}
      {#if group}
        <Button variant="outline" onclick={handleDuplicate}>
          <Copy class="mr-1.5 h-4 w-4" />
          Duplicate
        </Button>
        <Button onclick={() => (applyOpen = true)} disabled={displayWidgets.length === 0}>
          <Send class="mr-1.5 h-4 w-4" />
          Apply to dashboard
        </Button>
      {/if}
    </div>
  </div>

  {#if isSystem}
    <div class="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
      Presets are read-only. Click <strong>Duplicate</strong> to fork an editable copy.
    </div>
  {/if}

  {#if groupQuery.isLoading}
    <p class="text-muted-foreground">Loading group…</p>
  {:else if !group}
    <p class="text-muted-foreground">Group not found.</p>
  {:else if displayWidgets.length === 0}
    <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
      <p class="text-muted-foreground">No widgets in this group yet.</p>
      {#if !isSystem}
        <Button onclick={() => (catalogOpen = true)}>Add widget</Button>
      {/if}
    </div>
  {:else}
    <WidgetGrid
      widgets={displayWidgets}
      layout={editorLayout}
      {editMode}
      onRemoveWidget={editMode ? handleRemoveItem : undefined}
      onWidgetSettings={editMode ? handleItemSettings : undefined}
      onReorder={editMode ? handleReorder : undefined}
      onAddWidget={editMode ? () => (catalogOpen = true) : undefined} />
  {/if}
</div>

{#if group && !isSystem}
  <WidgetCatalogSheet bind:open={catalogOpen} onAddWidget={handleAddWidget} />
  <WidgetSettingsDialog
    bind:open={itemSettingsOpen}
    widget={settingsDialogWidget}
    onSave={handleItemSave} />
  <ConfirmDialog
    bind:open={removeOpen}
    title="Remove widget"
    description="This widget will be removed from the group."
    confirmLabel="Remove"
    onConfirm={confirmRemove} />

  <Dialog.Root bind:open={renameOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Rename group</Dialog.Title>
      </Dialog.Header>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="rename-name">Name</Label>
          <Input id="rename-name" bind:value={renameName} />
        </div>
        <div class="space-y-2">
          <Label for="rename-desc">Description</Label>
          <Textarea id="rename-desc" bind:value={renameDescription} rows={3} />
        </div>
      </div>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => (renameOpen = false)}>Cancel</Button>
        <Button onclick={handleRename} disabled={!renameName.trim()}>Save</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}

{#if group}
  <ApplyGroupDialog bind:open={applyOpen} groupId={group.id} groupName={group.name} />
{/if}
