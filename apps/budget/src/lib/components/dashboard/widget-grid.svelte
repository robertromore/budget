<script lang="ts">
import type { DashboardWidget, DashboardLayoutConfig } from '$core/schema/dashboards';
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
import { getWidgetImport } from './widgets';
import WidgetCard from './widget-card.svelte';
import SortableWidget from './sortable-widget.svelte';
import Plus from '@lucide/svelte/icons/plus';

let {
  widgets,
  layout,
  editMode = false,
  onRemoveWidget,
  onWidgetSettings,
  onReorder,
  onAddWidget,
}: {
  widgets: DashboardWidget[];
  layout: DashboardLayoutConfig | null;
  editMode?: boolean;
  onRemoveWidget?: (widgetId: number) => void;
  onWidgetSettings?: (widget: DashboardWidget) => void;
  onReorder?: (widgetIds: number[]) => void;
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

// Widget component cache
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
  for (const type of types) {
    loadWidgetComponent(type);
  }
});

// DnD
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);

const widgetIds = $derived(widgets.map((w) => w.id));

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = widgets.findIndex((w) => w.id === active.id);
  const newIndex = widgets.findIndex((w) => w.id === over.id);
  if (oldIndex === -1 || newIndex === -1) return;

  const newOrder = arrayMove(widgetIds, oldIndex, newIndex);
  onReorder?.(newOrder);
}
</script>

{#if editMode}
  <DndContext
    {sensors}
    collisionDetection={rectIntersection}
    onDragEnd={handleDragEnd}>
    <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
      <div class="grid {gridClass} {gapClass}">
        {#each widgets as widget (widget.id)}
          {@const WidgetComponent = loadedWidgets[widget.widgetType]}
          {@const spanClass = getSpanClass(widget.columnSpan)}
          <div class={spanClass}>
            <SortableWidget {widget}>
              {#snippet children({ dragHandleProps })}
                <WidgetCard
                  {widget}
                  editMode={true}
                  {dragHandleProps}
                  onRemove={onRemoveWidget ? () => onRemoveWidget(widget.id) : undefined}
                  onSettings={onWidgetSettings ? () => onWidgetSettings(widget) : undefined}>
                  {#if WidgetComponent}
                    <WidgetComponent config={widget} />
                  {:else}
                    <div class="text-muted-foreground flex h-16 items-center justify-center text-sm">
                      Loading...
                    </div>
                  {/if}
                </WidgetCard>
              {/snippet}
            </SortableWidget>
          </div>
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
    {#each widgets as widget (widget.id)}
      {@const WidgetComponent = loadedWidgets[widget.widgetType]}
      {@const spanClass = getSpanClass(widget.columnSpan)}
      <div class={spanClass}>
        <WidgetCard
          {widget}
          editMode={false}
          onRemove={undefined}
          onSettings={undefined}>
          {#if WidgetComponent}
            <WidgetComponent config={widget} />
          {:else}
            <div class="text-muted-foreground flex h-16 items-center justify-center text-sm">
              Loading...
            </div>
          {/if}
        </WidgetCard>
      </div>
    {/each}
  </div>
{/if}
