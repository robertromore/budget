<script lang="ts">
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
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import {
  WIDGET_STYLE_LABELS,
  WIDGET_STYLES,
  type WidgetStyle,
} from '$lib/types/dashboard-widgets';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import SortableSlot from './sortable-slot.svelte';

let {
  open = $bindable(false),
  currentPriority,
  onApply,
}: {
  open?: boolean;
  currentPriority: WidgetStyle[] | null;
  onApply: (priority: WidgetStyle[]) => void | Promise<void>;
} = $props();

function initialOrder(): WidgetStyle[] {
  if (!currentPriority || currentPriority.length === 0) {
    return [...WIDGET_STYLES];
  }
  // Respect persisted order; append any missing styles at the end so the
  // user can see every option even if the stored priority is partial.
  const present = new Set(currentPriority);
  const missing = WIDGET_STYLES.filter((s) => !present.has(s));
  return [...currentPriority.filter((s) => WIDGET_STYLES.includes(s)), ...missing];
}

let order = $state<WidgetStyle[]>(initialOrder());
let saving = $state(false);

// Re-sync when the dialog reopens with a different persisted priority.
$effect(() => {
  if (open) {
    order = initialOrder();
  }
});

const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const from = order.indexOf(String(active.id) as WidgetStyle);
  const to = order.indexOf(String(over.id) as WidgetStyle);
  if (from === -1 || to === -1) return;
  order = arrayMove(order, from, to) as WidgetStyle[];
}

function swatchClass(style: WidgetStyle): string {
  switch (style) {
    case 'terminal':
      return 'bg-emerald-500';
    case 'narrative':
      return 'bg-violet-500';
    case 'coach':
      return 'bg-amber-500';
    case 'copilot':
      return 'bg-sky-500';
    case 'classic':
    default:
      return 'bg-muted-foreground';
  }
}

async function handleApply() {
  saving = true;
  try {
    await onApply([...order]);
    open = false;
  } finally {
    saving = false;
  }
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Style priority</Dialog.Title>
      <Dialog.Description>
        Drag to reorder. When you restyle, each widget adopts the first style in the list that
        has a variant. Pinned widgets and groups are skipped.
      </Dialog.Description>
    </Dialog.Header>

    <DndContext
      {sensors}
      collisionDetection={rectIntersection}
      onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div class="space-y-1.5">
          {#each order as style, i (style)}
            <SortableSlot id={style}>
              {#snippet children({ dragHandleProps })}
                <div class="flex items-center gap-3 rounded-md border bg-background px-2 py-2 text-sm">
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground cursor-grab shrink-0 active:cursor-grabbing"
                    aria-label="Drag {WIDGET_STYLE_LABELS[style]}"
                    {...dragHandleProps}>
                    <GripVertical class="h-4 w-4" />
                  </button>
                  <span
                    aria-hidden="true"
                    class="h-2.5 w-2.5 shrink-0 rounded-full {swatchClass(style)}"></span>
                  <span class="flex-1 font-medium">{WIDGET_STYLE_LABELS[style]}</span>
                  <span class="text-muted-foreground text-xs tabular-nums">{i + 1}</span>
                </div>
              {/snippet}
            </SortableSlot>
          {/each}
        </div>
      </SortableContext>
    </DndContext>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)} disabled={saving}>Cancel</Button>
      <Button onclick={handleApply} disabled={saving}>
        {saving ? 'Applying…' : 'Apply'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
