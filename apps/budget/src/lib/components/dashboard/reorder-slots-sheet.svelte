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
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { rpc } from '$lib/query';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Square from '@lucide/svelte/icons/square';
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

{#snippet widgetRow(widget: DashboardWidget, dragHandleProps: Record<string, any>, indented: boolean)}
  {@const sizes = availableSizesFor(widget)}
  {@const canCycle = sizes.length > 1}
  <div
    class="hover:bg-accent/40 flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm {indented
      ? 'ml-6'
      : ''}">
    <button
      class="text-muted-foreground hover:text-foreground cursor-grab shrink-0 active:cursor-grabbing"
      aria-label="Drag widget"
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
      {#if groupInstances.length > 0}
        <div class="mb-3 flex items-center justify-between">
          <p class="text-muted-foreground text-xs">
            Drag rows to rearrange. Widgets inside a group only move within that group.
          </p>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 text-xs"
            onclick={() => (allExpanded ? collapseAll() : expandAll())}>
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Button>
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
                    {@render widgetRow(slot.widget, dragHandleProps, false)}
                  {:else}
                    <div
                      class="rounded-md border border-primary/25 bg-primary/5 dark:bg-primary/10">
                      <div class="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <button
                          class="text-muted-foreground hover:text-foreground cursor-grab shrink-0 active:cursor-grabbing"
                          aria-label="Drag group"
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
                                  <SortableWidget widget={child}>
                                    {#snippet children({ dragHandleProps: innerHandle })}
                                      {@render widgetRow(child, innerHandle, true)}
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
