<script lang="ts">
import type {
  DashboardGroupInstanceWithWidgets,
  DashboardWidget,
  WidgetSize,
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
  verticalListSortingStrategy,
} from '@dnd-kit-svelte/sortable';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { rpc } from '$lib/query';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Square from '@lucide/svelte/icons/square';
import X from '@lucide/svelte/icons/x';
import { SvelteSet } from 'svelte/reactivity';
import { buildDashboardSlots } from './slot-helpers';
import SortableSlot from './sortable-slot.svelte';
import SortableWidget from './sortable-widget.svelte';

let {
  open = $bindable(false),
  dashboardId,
  widgets,
  groupInstances,
}: {
  open?: boolean;
  dashboardId: number;
  widgets: DashboardWidget[];
  groupInstances: DashboardGroupInstanceWithWidgets[];
} = $props();

const slots = $derived(buildDashboardSlots(widgets, groupInstances));
const slotIds = $derived(slots.map((s) => s.domId));

let expanded = $state<Record<number, boolean>>({});

/**
 * Multi-select state. Only one zone can have an active selection at a
 * time — picking a row in a different zone clears the previous selection.
 * `activeZone` is `'top'` for the top-level slot list, or `inst:<id>`
 * for a specific group instance's children.
 */
let activeZone = $state<string | null>(null);
const topLevelSelection = $state(new SvelteSet<string>());
const instanceSelection = $state(new SvelteSet<number>());

function setZone(zone: string) {
  if (activeZone === zone) return;
  activeZone = zone;
  topLevelSelection.clear();
  instanceSelection.clear();
}

function toggleSlot(domId: string) {
  setZone('top');
  if (topLevelSelection.has(domId)) topLevelSelection.delete(domId);
  else topLevelSelection.add(domId);
  if (topLevelSelection.size === 0) activeZone = null;
}

function toggleChild(instanceId: number, widgetId: number) {
  setZone(`inst:${instanceId}`);
  if (instanceSelection.has(widgetId)) instanceSelection.delete(widgetId);
  else instanceSelection.add(widgetId);
  if (instanceSelection.size === 0) activeZone = null;
}

function clearSelection() {
  topLevelSelection.clear();
  instanceSelection.clear();
  activeZone = null;
}

const selectionCount = $derived.by(() => {
  if (activeZone === 'top') return topLevelSelection.size;
  if (activeZone?.startsWith('inst:')) return instanceSelection.size;
  return 0;
});

async function moveSelectedTopLevel(direction: 'top' | 'bottom') {
  if (topLevelSelection.size === 0) return;
  const selected = slotIds.filter((id) => topLevelSelection.has(id));
  const rest = slotIds.filter((id) => !topLevelSelection.has(id));
  const newOrder = direction === 'top' ? [...selected, ...rest] : [...rest, ...selected];
  const payload = newOrder.map((domId): { kind: 'widget' | 'group'; id: number } => {
    const slot = slots.find((s) => s.domId === domId)!;
    return {
      kind: slot.kind,
      id: slot.kind === 'widget' ? slot.widget.id : slot.instance.id,
    };
  });
  await rpc.dashboards.reorderDashboardSlots.execute({ dashboardId, slots: payload });
  clearSelection();
}

async function moveSelectedInstance(instanceId: number, direction: 'top' | 'bottom') {
  const instance = groupInstances.find((i) => i.id === instanceId);
  if (!instance || instanceSelection.size === 0) return;
  const ids = instance.widgets.map((w) => w.id);
  const selected = ids.filter((id) => instanceSelection.has(id));
  const rest = ids.filter((id) => !instanceSelection.has(id));
  const newOrder = direction === 'top' ? [...selected, ...rest] : [...rest, ...selected];
  await rpc.widgetGroups.reorderGroupInstanceWidgets.execute({
    instanceId,
    widgetIds: newOrder,
  });
  clearSelection();
}

function toggle(instanceId: number) {
  expanded[instanceId] = !expanded[instanceId];
}

function expandAll() {
  const next: Record<number, boolean> = {};
  for (const inst of groupInstances) next[inst.id] = true;
  expanded = next;
}

function collapseAll() {
  expanded = {};
}

const allExpanded = $derived(
  groupInstances.length > 0 && groupInstances.every((i) => expanded[i.id])
);

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);

async function handleTopLevelDragEnd(event: DragEndEvent) {
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
  await rpc.dashboards.reorderDashboardSlots.execute({ dashboardId, slots: payload });
}

async function handleInstanceDragEnd(instanceId: number, event: DragEndEvent) {
  const instance = groupInstances.find((i) => i.id === instanceId);
  if (!instance) return;
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const ids = instance.widgets.map((w) => w.id);
  const oldIndex = ids.indexOf(Number(active.id));
  const newIndex = ids.indexOf(Number(over.id));
  if (oldIndex === -1 || newIndex === -1) return;

  const newOrder = arrayMove(ids, oldIndex, newIndex);
  await rpc.widgetGroups.reorderGroupInstanceWidgets.execute({
    instanceId,
    widgetIds: newOrder,
  });
}

type KeyboardAction = 'up' | 'down' | 'top' | 'bottom' | null;

function keyToAction(e: KeyboardEvent): KeyboardAction {
  if (e.key === 'ArrowUp' || (e.key === 'k' && e.ctrlKey)) return 'up';
  if (e.key === 'ArrowDown' || (e.key === 'j' && e.ctrlKey)) return 'down';
  if (e.key === 'Home' || (e.key === 'ArrowUp' && e.metaKey)) return 'top';
  if (e.key === 'End' || (e.key === 'ArrowDown' && e.metaKey)) return 'bottom';
  return null;
}

function reorderArray(ids: string[] | number[], from: number, to: number) {
  const copy: any[] = [...ids];
  copy.splice(from, 1);
  copy.splice(to, 0, ids[from]);
  return copy;
}

function newIndexFor(action: KeyboardAction, current: number, length: number): number {
  switch (action) {
    case 'up':
      return Math.max(0, current - 1);
    case 'down':
      return Math.min(length - 1, current + 1);
    case 'top':
      return 0;
    case 'bottom':
      return length - 1;
    default:
      return current;
  }
}

function refocusGrip(selector: string) {
  // Wait one tick past the cache invalidation + re-render before refocusing.
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      const btn = document.querySelector(selector) as HTMLButtonElement | null;
      btn?.focus();
    });
  });
}

async function handleSlotKeydown(e: KeyboardEvent, domId: string) {
  const action = keyToAction(e);
  if (!action) return;
  e.preventDefault();

  const current = slotIds.indexOf(domId);
  if (current === -1) return;
  const next = newIndexFor(action, current, slotIds.length);
  if (next === current) return;

  const newOrder = reorderArray(slotIds, current, next) as string[];
  const payload = newOrder.map((id): { kind: 'widget' | 'group'; id: number } => {
    const slot = slots.find((s) => s.domId === id)!;
    return {
      kind: slot.kind,
      id: slot.kind === 'widget' ? slot.widget.id : slot.instance.id,
    };
  });
  await rpc.dashboards.reorderDashboardSlots.execute({ dashboardId, slots: payload });
  refocusGrip(`[data-reorder-grip-id="slot:${domId}"]`);
}

async function handleChildKeydown(e: KeyboardEvent, instanceId: number, widgetId: number) {
  const action = keyToAction(e);
  if (!action) return;
  e.preventDefault();

  const instance = groupInstances.find((i) => i.id === instanceId);
  if (!instance) return;
  const ids = instance.widgets.map((w) => w.id);
  const current = ids.indexOf(widgetId);
  if (current === -1) return;
  const next = newIndexFor(action, current, ids.length);
  if (next === current) return;

  const newOrder = reorderArray(ids, current, next) as number[];
  await rpc.widgetGroups.reorderGroupInstanceWidgets.execute({
    instanceId,
    widgetIds: newOrder,
  });
  refocusGrip(`[data-reorder-grip-id="child:${instanceId}:${widgetId}"]`);
}

function widgetLabel(w: DashboardWidget): string {
  if (w.title && w.title.trim()) return w.title;
  return getWidgetDefinition(w.widgetType)?.label ?? w.widgetType;
}

const FALLBACK_SIZES: WidgetSize[] = ['small', 'medium', 'large', 'full'];

const SIZE_TO_COLUMN_SPAN: Record<WidgetSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
  full: 4,
};

function availableSizesFor(widget: DashboardWidget): WidgetSize[] {
  const def = getWidgetDefinition(widget.widgetType);
  return def?.availableSizes?.length ? def.availableSizes : FALLBACK_SIZES;
}

async function cycleSize(widget: DashboardWidget) {
  const sizes = availableSizesFor(widget);
  if (sizes.length <= 1) return;
  const idx = sizes.indexOf(widget.size);
  const next = sizes[(idx + 1) % sizes.length]!;
  if (next === widget.size) return;
  // Size is a label; columnSpan is what actually allocates grid space.
  // Cycle both together so the dashboard visibly reflows.
  const nextSpan = Math.min(SIZE_TO_COLUMN_SPAN[next], 4);
  await rpc.dashboards.updateWidget.execute({
    id: widget.id,
    size: next,
    columnSpan: nextSpan,
  });
}
</script>

{#snippet widgetRow(
  widget: DashboardWidget,
  dragHandleProps: Record<string, any>,
  indented: boolean,
  onKeydown: (e: KeyboardEvent) => void,
  gripId: string,
  selected: boolean,
  onToggleSelect: () => void
)}
  {@const sizes = availableSizesFor(widget)}
  {@const canCycle = sizes.length > 1}
  <div
    class="hover:bg-accent/40 flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm {indented
      ? 'ml-6'
      : ''} {selected ? 'border-primary/60 bg-primary/5' : ''}">
    <Checkbox
      checked={selected}
      onCheckedChange={() => onToggleSelect()}
      aria-label="Select widget" />
    <button
      class="text-muted-foreground hover:text-foreground cursor-grab shrink-0 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      aria-label="Drag widget (use arrow keys to reorder)"
      data-reorder-grip-id={gripId}
      onkeydown={onKeydown}
      {...dragHandleProps}>
      <GripVertical class="h-3.5 w-3.5" />
    </button>
    <Square class="text-muted-foreground h-3 w-3 shrink-0" />
    <span class="truncate flex-1">{widgetLabel(widget)}</span>
    {#if canCycle}
      <button
        type="button"
        class="shrink-0 rounded-sm transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onclick={() => cycleSize(widget)}
        title="Click to cycle size ({sizes.join(' → ')})">
        <Badge variant="outline" class="text-[10px] capitalize cursor-pointer">{widget.size}</Badge>
      </button>
    {:else}
      <Badge variant="outline" class="shrink-0 text-[10px] capitalize">{widget.size}</Badge>
    {/if}
  </div>
{/snippet}

<ResponsiveSheet
  bind:open
  side="right"
  adjacent={true}
  defaultWidth={380}
  minWidth={320}
  maxWidth={520}
  interactOutsideBehavior="ignore">
  {#snippet header()}
    <div class="flex items-center gap-2">
      <LayoutGrid class="text-primary h-5 w-5" />
      <h2 class="text-lg font-semibold">Reorder</h2>
    </div>
  {/snippet}

  {#snippet content()}
    {#if slots.length === 0}
      <div class="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <LayoutGrid class="h-8 w-8" />
        <span>Nothing to reorder yet.</span>
      </div>
    {:else}
      <div class="mb-3 flex items-start justify-between gap-3">
        <p class="text-muted-foreground text-xs">
          Drag rows or focus a grip and use <kbd class="rounded border bg-muted px-1 text-[10px]">↑</kbd>/<kbd class="rounded border bg-muted px-1 text-[10px]">↓</kbd>/<kbd class="rounded border bg-muted px-1 text-[10px]">Home</kbd>/<kbd class="rounded border bg-muted px-1 text-[10px]">End</kbd>, or check rows for batch actions.
        </p>
        {#if groupInstances.length > 0}
          <Button
            variant="ghost"
            size="sm"
            class="h-7 shrink-0 text-xs"
            onclick={() => (allExpanded ? collapseAll() : expandAll())}>
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Button>
        {/if}
      </div>

      {#if selectionCount > 0}
        <div class="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-md border bg-primary/10 px-2 py-1.5 backdrop-blur">
          <span class="text-xs font-medium">
            {selectionCount} selected
          </span>
          <div class="ml-auto flex items-center gap-1">
            {#if activeZone === 'top'}
              <Button
                size="sm"
                variant="ghost"
                class="h-7 gap-1 text-xs"
                onclick={() => moveSelectedTopLevel('top')}>
                <ArrowUpToLine class="h-3 w-3" />
                Top
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="h-7 gap-1 text-xs"
                onclick={() => moveSelectedTopLevel('bottom')}>
                <ArrowDownToLine class="h-3 w-3" />
                Bottom
              </Button>
            {:else if activeZone?.startsWith('inst:')}
              {@const instanceId = Number(activeZone.slice(5))}
              <Button
                size="sm"
                variant="ghost"
                class="h-7 gap-1 text-xs"
                onclick={() => moveSelectedInstance(instanceId, 'top')}>
                <ArrowUpToLine class="h-3 w-3" />
                Top
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="h-7 gap-1 text-xs"
                onclick={() => moveSelectedInstance(instanceId, 'bottom')}>
                <ArrowDownToLine class="h-3 w-3" />
                Bottom
              </Button>
            {/if}
            <Button
              size="icon"
              variant="ghost"
              class="h-7 w-7"
              aria-label="Clear selection"
              onclick={clearSelection}>
              <X class="h-3 w-3" />
            </Button>
          </div>
        </div>
      {/if}

      <DndContext
        {sensors}
        collisionDetection={rectIntersection}
        onDragEnd={handleTopLevelDragEnd}>
        <SortableContext items={slotIds} strategy={verticalListSortingStrategy}>
          <div class="space-y-1.5">
            {#each slots as slot (slot.domId)}
              <SortableSlot id={slot.domId}>
                {#snippet children({ dragHandleProps })}
                  {#if slot.kind === 'widget'}
                    {@render widgetRow(
                      slot.widget,
                      dragHandleProps,
                      false,
                      (e) => handleSlotKeydown(e, slot.domId),
                      `slot:${slot.domId}`,
                      topLevelSelection.has(slot.domId),
                      () => toggleSlot(slot.domId)
                    )}
                  {:else}
                    {@const groupSelected = topLevelSelection.has(slot.domId)}
                    <div
                      class="rounded-md border {groupSelected
                        ? 'border-primary/60 bg-primary/10 dark:bg-primary/15'
                        : 'border-primary/25 bg-primary/5 dark:bg-primary/10'}">
                      <div class="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <Checkbox
                          checked={groupSelected}
                          onCheckedChange={() => toggleSlot(slot.domId)}
                          aria-label="Select group" />
                        <button
                          class="text-muted-foreground hover:text-foreground cursor-grab shrink-0 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                          aria-label="Drag group (use arrow keys to reorder)"
                          data-reorder-grip-id="slot:{slot.domId}"
                          onkeydown={(e) => handleSlotKeydown(e, slot.domId)}
                          {...dragHandleProps}>
                          <GripVertical class="h-3.5 w-3.5" />
                        </button>
                        <button
                          class="text-muted-foreground hover:text-foreground shrink-0"
                          aria-label={expanded[slot.instance.id] ? 'Collapse group' : 'Expand group'}
                          onclick={() => toggle(slot.instance.id)}>
                          {#if expanded[slot.instance.id]}
                            <ChevronDown class="h-4 w-4" />
                          {:else}
                            <ChevronRight class="h-4 w-4" />
                          {/if}
                        </button>
                        <LayoutGrid class="text-primary h-3.5 w-3.5 shrink-0" />
                        <span class="truncate font-medium flex-1">{slot.instance.name}</span>
                        <Badge variant="outline" class="shrink-0 text-[10px]">
                          {slot.instance.widgets.length}
                        </Badge>
                      </div>
                      {#if expanded[slot.instance.id]}
                        {#if slot.instance.widgets.length === 0}
                          <p class="ml-6 mb-2 text-muted-foreground text-xs">No widgets.</p>
                        {:else}
                          <div class="space-y-1.5 px-2 pb-2">
                            <DndContext
                              {sensors}
                              collisionDetection={rectIntersection}
                              onDragEnd={(e) => handleInstanceDragEnd(slot.instance.id, e)}>
                              <SortableContext
                                items={slot.instance.widgets.map((w) => w.id)}
                                strategy={verticalListSortingStrategy}>
                                {#each slot.instance.widgets as child (child.id)}
                                  {@const childSelected =
                                    activeZone === `inst:${slot.instance.id}` &&
                                    instanceSelection.has(child.id)}
                                  <SortableWidget widget={child}>
                                    {#snippet children({ dragHandleProps: innerHandle })}
                                      {@render widgetRow(
                                        child,
                                        innerHandle,
                                        true,
                                        (e) => handleChildKeydown(e, slot.instance.id, child.id),
                                        `child:${slot.instance.id}:${child.id}`,
                                        childSelected,
                                        () => toggleChild(slot.instance.id, child.id)
                                      )}
                                    {/snippet}
                                  </SortableWidget>
                                {/each}
                              </SortableContext>
                            </DndContext>
                          </div>
                        {/if}
                      {/if}
                    </div>
                  {/if}
                {/snippet}
              </SortableSlot>
            {/each}
          </div>
        </SortableContext>
      </DndContext>
    {/if}
  {/snippet}

  {#snippet footer()}
    <Button variant="outline" class="w-full" onclick={() => (open = false)}>Done</Button>
  {/snippet}
</ResponsiveSheet>
