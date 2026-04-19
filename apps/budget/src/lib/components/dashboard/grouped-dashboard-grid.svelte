<script lang="ts">
import type {
  DashboardGroupInstanceWithWidgets,
  DashboardLayoutConfig,
  DashboardWidget,
} from '$core/schema/dashboards';
import {
  DndContext,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit-svelte/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit-svelte/sortable';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import Check from '@lucide/svelte/icons/check';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Lock from '@lucide/svelte/icons/lock';
import LockOpen from '@lucide/svelte/icons/lock-open';
import Pencil from '@lucide/svelte/icons/pencil';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';
import X from '@lucide/svelte/icons/x';
import SortableSlot from './sortable-slot.svelte';
import { buildDashboardSlots } from './slot-helpers';
import WidgetCard from './widget-card.svelte';
import WidgetGrid from './widget-grid.svelte';
import { getWidgetImport } from './widgets';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';

let {
  widgets,
  groupInstances,
  layout,
  editMode = false,
  onRemoveWidget,
  onWidgetSettings,
  onReorderSlots,
  onReorderInstance,
  onRenameInstance,
  onRemoveInstance,
  onToggleInstancePin,
  onAddWidget,
}: {
  widgets: DashboardWidget[];
  groupInstances: DashboardGroupInstanceWithWidgets[];
  layout: DashboardLayoutConfig | null;
  editMode?: boolean;
  onRemoveWidget?: (widgetId: number) => void;
  onWidgetSettings?: (widget: DashboardWidget) => void;
  onReorderSlots?: (
    slots: Array<{ kind: 'widget' | 'group'; id: number }>
  ) => void;
  onReorderInstance?: (instanceId: number, widgetIds: number[]) => void;
  onRenameInstance?: (instanceId: number, name: string) => void;
  onRemoveInstance?: (instanceId: number) => void;
  onToggleInstancePin?: (instanceId: number, pinned: boolean) => void;
  onAddWidget?: () => void;
} = $props();

const columns = $derived(layout?.columns ?? 4);
const gap = $derived(layout?.gap ?? 'normal');

const gapClass = $derived(
  gap === 'compact' ? 'gap-3' : gap === 'spacious' ? 'gap-6' : 'gap-4'
);

const gridClass = $derived(
  columns === 1
    ? 'grid-cols-1'
    : columns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
);

function getSpanClass(span: number): string {
  if (span >= columns) return `md:col-span-${columns}`;
  switch (span) {
    case 1:
      return '';
    case 2:
      return 'md:col-span-2';
    case 3:
      return 'md:col-span-2 xl:col-span-3';
    case 4:
      return 'md:col-span-2 xl:col-span-4';
    default:
      return '';
  }
}

const fullWidthSpan = $derived(
  columns === 1
    ? ''
    : columns === 2
      ? 'md:col-span-2'
      : columns === 3
        ? 'md:col-span-2 xl:col-span-3'
        : 'md:col-span-2 xl:col-span-4'
);

const slots = $derived(buildDashboardSlots(widgets, groupInstances));

const slotIds = $derived(slots.map((s) => s.domId));

// Lazy-load widget components for the top-level grid (mirrors widget-grid).
let loadedWidgets = $state<Record<string, any>>({});
async function loadWidgetComponent(type: string) {
  if (loadedWidgets[type]) return loadedWidgets[type];
  const importer = getWidgetImport(type);
  if (!importer) return null;
  const mod = await importer();
  loadedWidgets[type] = mod.default;
  return mod.default;
}

$effect(() => {
  const types = new Set(widgets.map((w) => w.widgetType));
  for (const type of types) loadWidgetComponent(type);
});

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);

function handleTopLevelDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = slotIds.indexOf(String(active.id));
  const newIndex = slotIds.indexOf(String(over.id));
  if (oldIndex === -1 || newIndex === -1) return;

  const newOrder = arrayMove(slotIds, oldIndex, newIndex);
  const payload = newOrder.map((domId): { kind: 'widget' | 'group'; id: number } => {
    const slot = slots.find((s) => s.domId === domId)!;
    return {
      kind: slot.kind,
      id: slot.kind === 'widget' ? slot.widget.id : slot.instance.id,
    };
  });
  onReorderSlots?.(payload);
}

let editingInstanceId = $state<number | null>(null);
let editingName = $state('');

function startEdit(instance: DashboardGroupInstanceWithWidgets) {
  editingInstanceId = instance.id;
  editingName = instance.name;
}

function commitEdit() {
  if (editingInstanceId === null) return;
  const trimmed = editingName.trim();
  if (trimmed) onRenameInstance?.(editingInstanceId, trimmed);
  editingInstanceId = null;
}

function cancelEdit() {
  editingInstanceId = null;
}
</script>

{#snippet groupSection(instance: DashboardGroupInstanceWithWidgets, dragHandleProps: Record<string, any>)}
  <section
    class="relative space-y-3 rounded-xl border border-primary/25 bg-primary/4 p-4 shadow-sm dark:border-primary/30 dark:bg-primary/6">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary/40"></div>
    <header class="flex items-center justify-between gap-2 pl-2">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        {#if editMode}
          <button
            class="text-muted-foreground hover:text-foreground cursor-grab shrink-0 active:cursor-grabbing"
            aria-label="Drag group"
            {...dragHandleProps}>
            <GripVertical class="h-4 w-4" />
          </button>
        {/if}
        <div class="bg-primary/15 flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
          <LayoutGrid class="text-primary h-3.5 w-3.5" />
        </div>
        {#if editingInstanceId === instance.id}
          <Input
            bind:value={editingName}
            class="h-7 text-sm font-medium max-w-sm"
            autofocus
            onkeydown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }} />
          <Button size="icon" variant="ghost" class="h-7 w-7" onclick={commitEdit}>
            <Check class="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" class="h-7 w-7" onclick={cancelEdit}>
            <X class="h-3.5 w-3.5" />
          </Button>
        {:else}
          <h2 class="truncate text-sm font-semibold">{instance.name}</h2>
          <Badge variant="outline" class="shrink-0 text-xs">
            {instance.widgets.length} widget{instance.widgets.length === 1 ? '' : 's'}
          </Badge>
          {#if instance.stylePinned}
            <Badge
              variant="outline"
              class="shrink-0 gap-1 border-primary/40 text-[10px] text-primary">
              <Lock class="h-2.5 w-2.5" />
              Pinned
            </Badge>
          {/if}
        {/if}
      </div>
      {#if editMode && editingInstanceId !== instance.id}
        <div class="flex shrink-0 gap-1">
          {#if onToggleInstancePin}
            <Button
              size="icon"
              variant="ghost"
              class="h-7 w-7 {instance.stylePinned ? 'text-primary' : ''}"
              title={instance.stylePinned
                ? 'Unpin style — allow dashboard restyle'
                : 'Pin style — exclude from dashboard restyle'}
              onclick={() => onToggleInstancePin(instance.id, !instance.stylePinned)}>
              {#if instance.stylePinned}
                <Lock class="h-3.5 w-3.5" />
              {:else}
                <LockOpen class="h-3.5 w-3.5" />
              {/if}
            </Button>
          {/if}
          <Button
            size="icon"
            variant="ghost"
            class="h-7 w-7"
            onclick={() => startEdit(instance)}>
            <Pencil class="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            class="text-destructive h-7 w-7"
            onclick={() => onRemoveInstance?.(instance.id)}>
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      {/if}
    </header>

    {#if instance.widgets.length > 0}
      <WidgetGrid
        widgets={instance.widgets}
        {layout}
        {editMode}
        onRemoveWidget={editMode ? onRemoveWidget : undefined}
        onWidgetSettings={editMode ? onWidgetSettings : undefined}
        onReorder={editMode
          ? (ids) => onReorderInstance?.(instance.id, ids)
          : undefined} />
    {:else}
      <p class="text-muted-foreground py-4 text-center text-sm">
        This group has no widgets. Remove it or add widgets via the group editor.
      </p>
    {/if}
  </section>
{/snippet}

{#if editMode}
  <DndContext
    {sensors}
    collisionDetection={rectIntersection}
    onDragEnd={handleTopLevelDragEnd}>
    <SortableContext items={slotIds} strategy={rectSortingStrategy}>
      <div class="grid {gridClass} {gapClass}">
        {#each slots as slot (slot.domId)}
          {#if slot.kind === 'widget'}
            {@const WidgetComponent = loadedWidgets[slot.widget.widgetType]}
            {@const spanClass = getSpanClass(slot.widget.columnSpan)}
            {@const bare = getWidgetDefinition(slot.widget.widgetType)?.selfContained ?? false}
            <SortableSlot id={slot.domId} class={spanClass}>
              {#snippet children({ dragHandleProps })}
                <WidgetCard
                  widget={slot.widget}
                  editMode={true}
                  {bare}
                  {dragHandleProps}
                  onRemove={onRemoveWidget ? () => onRemoveWidget(slot.widget.id) : undefined}
                  onSettings={onWidgetSettings
                    ? () => onWidgetSettings(slot.widget)
                    : undefined}>
                  {#if WidgetComponent}
                    <WidgetComponent config={slot.widget} />
                  {:else}
                    <div class="text-muted-foreground flex h-16 items-center justify-center text-sm">
                      Loading...
                    </div>
                  {/if}
                </WidgetCard>
              {/snippet}
            </SortableSlot>
          {:else}
            <SortableSlot id={slot.domId} class={fullWidthSpan}>
              {#snippet children({ dragHandleProps })}
                {@render groupSection(slot.instance, dragHandleProps)}
              {/snippet}
            </SortableSlot>
          {/if}
        {/each}
        {#if onAddWidget}
          <button
            class="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors hover:border-primary/40 hover:bg-accent/30"
            onclick={onAddWidget}>
            <Plus class="text-muted-foreground h-6 w-6" />
            <span class="text-muted-foreground text-sm">Add Widget</span>
          </button>
        {/if}
      </div>
    </SortableContext>
  </DndContext>
{:else}
  <div class="grid {gridClass} {gapClass}">
    {#each slots as slot (slot.domId)}
      {#if slot.kind === 'widget'}
        {@const WidgetComponent = loadedWidgets[slot.widget.widgetType]}
        {@const spanClass = getSpanClass(slot.widget.columnSpan)}
        {@const bare = getWidgetDefinition(slot.widget.widgetType)?.selfContained ?? false}
        <div class={spanClass}>
          <WidgetCard widget={slot.widget} editMode={false} {bare}>
            {#if WidgetComponent}
              <WidgetComponent config={slot.widget} />
            {:else}
              <div class="text-muted-foreground flex h-16 items-center justify-center text-sm">
                Loading...
              </div>
            {/if}
          </WidgetCard>
        </div>
      {:else}
        <div class={fullWidthSpan}>
          {@render groupSection(slot.instance, {})}
        </div>
      {/if}
    {/each}
  </div>
{/if}
