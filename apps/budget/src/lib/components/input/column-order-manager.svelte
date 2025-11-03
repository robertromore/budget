<script lang="ts">
import {Button} from '$lib/components/ui/button';
import ChevronUp from '@lucide/svelte/icons/chevron-up';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import type {Column} from '@tanstack/table-core';
import {cn} from '$lib/utils';

interface Props {
  columns: Column<any, unknown>[];
  columnOrder: string[];
  onUpdate: (newOrder: string[]) => void;
}

let {columns, columnOrder, onUpdate}: Props = $props();

let draggedIndex = $state<number | null>(null);

// Get all column IDs in the current order, or use the default table order
// Only include columns that are visible (present in the columns array)
const orderedColumns = $derived.by(() => {
  const visibleColumnIds = new Set(columns.map(col => col.id));

  if (columnOrder.length === 0) {
    // If no custom order, return all visible columns in their default order
    return columns.map(col => col.id);
  }

  // Start with the custom order, but filter out hidden columns
  const ordered = columnOrder.filter(id => visibleColumnIds.has(id));

  // Add any visible columns that aren't in the custom order yet
  const missingColumns = columns
    .map(col => col.id)
    .filter(id => !ordered.includes(id));

  return [...ordered, ...missingColumns];
});

// Get column label from meta
const getColumnLabel = (columnId: string) => {
  const column = columns.find(col => col.id === columnId);
  return column?.columnDef.meta?.label ?? columnId;
};

// Move column up
const moveUp = (index: number) => {
  if (index === 0) return;
  const newOrder = [...orderedColumns];
  const temp = newOrder[index - 1];
  const current = newOrder[index];
  if (!temp || !current) return;
  newOrder[index - 1] = current;
  newOrder[index] = temp;
  onUpdate(newOrder);
};

// Move column down
const moveDown = (index: number) => {
  if (index === orderedColumns.length - 1) return;
  const newOrder = [...orderedColumns];
  const current = newOrder[index];
  const next = newOrder[index + 1];
  if (!current || !next) return;
  newOrder[index] = next;
  newOrder[index + 1] = current;
  onUpdate(newOrder);
};

// Reset to default order
const resetToDefault = () => {
  onUpdate([]);
};

// Drag and drop handlers
const handleDragStart = (e: DragEvent, index: number) => {
  draggedIndex = index;
  e.dataTransfer!.effectAllowed = 'move';
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';
};

const handleDrop = (e: DragEvent, dropIndex: number) => {
  e.preventDefault();
  if (draggedIndex === null || draggedIndex === dropIndex) {
    draggedIndex = null;
    return;
  }

  const newOrder = [...orderedColumns];
  const movedItem = newOrder[draggedIndex];
  if (!movedItem) {
    draggedIndex = null;
    return;
  }
  newOrder.splice(draggedIndex, 1);
  newOrder.splice(dropIndex, 0, movedItem);
  onUpdate(newOrder);
  draggedIndex = null;
};

const handleDragEnd = () => {
  draggedIndex = null;
};
</script>

<div class="space-y-2">
  <div class="flex items-center justify-end">
    <Button
      variant="ghost"
      size="sm"
      class="h-7 px-2"
      onclick={resetToDefault}
      disabled={columnOrder.length === 0}>
      <RotateCcw class="mr-1 size-3" />
      Reset
    </Button>
  </div>

  <div class="border-input max-h-[400px] space-y-1 overflow-y-auto rounded-md border p-2">
    {#each orderedColumns as columnId, index (columnId)}
      <div
        class={cn(
          "border-input bg-background flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
          draggedIndex === index && "opacity-50"
        )}
        draggable="true"
        ondragstart={(e) => handleDragStart(e, index)}
        ondragover={handleDragOver}
        ondrop={(e) => handleDrop(e, index)}
        ondragend={handleDragEnd}
        role="button"
        tabindex="0">
        <div class="flex items-center gap-2">
          <GripVertical class="text-muted-foreground size-4 cursor-grab active:cursor-grabbing" />
          <span class="text-xs">{index + 1}.</span>
          <span>{getColumnLabel(columnId)}</span>
        </div>
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            class="size-6"
            onclick={() => moveUp(index)}
            disabled={index === 0}
            aria-label="Move up">
            <ChevronUp class="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="size-6"
            onclick={() => moveDown(index)}
            disabled={index === orderedColumns.length - 1}
            aria-label="Move down">
            <ChevronDown class="size-3" />
          </Button>
        </div>
      </div>
    {/each}
  </div>

  <p class="text-muted-foreground text-xs">
    Drag columns to reorder, or use the arrow buttons. Click Reset to restore default order.
  </p>
</div>
