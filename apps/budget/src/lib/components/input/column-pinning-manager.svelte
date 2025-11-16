<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import { Label } from '$lib/components/ui/label';
import * as Popover from '$lib/components/ui/popover';
import { cn } from '$lib/utils';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronUp from '@lucide/svelte/icons/chevron-up';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import Plus from '@lucide/svelte/icons/plus';
import X from '@lucide/svelte/icons/x';
import type { Column } from '@tanstack/table-core';

interface Props {
  label?: string;
  pinnedColumns: string[];
  availableColumns: Column<any, unknown>[];
  onUpdate: (newPinning: string[]) => void;
}

let { label, pinnedColumns, availableColumns, onUpdate }: Props = $props();

let draggedIndex = $state<number | null>(null);
let addColumnOpen = $state(false);

// Get columns that are not currently pinned
const unpinnedColumns = $derived(availableColumns.filter((col) => !pinnedColumns.includes(col.id)));

// Get column label from meta
const getColumnLabel = (columnId: string) => {
  const column = availableColumns.find((col) => col.id === columnId);
  return column?.columnDef.meta?.label ?? columnId;
};

// Move column up
const moveUp = (index: number) => {
  if (index === 0) return;
  const newPinning = [...pinnedColumns];
  const temp = newPinning[index - 1];
  const current = newPinning[index];
  if (!temp || !current) return;
  newPinning[index - 1] = current;
  newPinning[index] = temp;
  onUpdate(newPinning);
};

// Move column down
const moveDown = (index: number) => {
  if (index === pinnedColumns.length - 1) return;
  const newPinning = [...pinnedColumns];
  const current = newPinning[index];
  const next = newPinning[index + 1];
  if (!current || !next) return;
  newPinning[index] = next;
  newPinning[index + 1] = current;
  onUpdate(newPinning);
};

// Remove column from pinning
const removeColumn = (index: number) => {
  const newPinning = pinnedColumns.filter((_, i) => i !== index);
  onUpdate(newPinning);
};

// Add column to pinning
const addColumn = (columnId: string) => {
  const newPinning = [...pinnedColumns, columnId];
  onUpdate(newPinning);
  addColumnOpen = false;
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

  const newPinning = [...pinnedColumns];
  const movedItem = newPinning[draggedIndex];
  if (!movedItem) {
    draggedIndex = null;
    return;
  }
  newPinning.splice(draggedIndex, 1);
  newPinning.splice(dropIndex, 0, movedItem);
  onUpdate(newPinning);
  draggedIndex = null;
};

const handleDragEnd = () => {
  draggedIndex = null;
};
</script>

{#snippet content()}
  {#if pinnedColumns.length === 0}
    <div
      class="text-muted-foreground flex h-20 items-center justify-center rounded-md border border-dashed text-sm">
      No columns pinned
    </div>
  {:else}
    <div class="space-y-1">
      {#each pinnedColumns as columnId, index (columnId)}
        <div
          class={cn(
            'border-input bg-background flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors',
            draggedIndex === index && 'opacity-50'
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
              disabled={index === pinnedColumns.length - 1}
              aria-label="Move down">
              <ChevronDown class="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-6"
              onclick={() => removeColumn(index)}
              aria-label="Remove">
              <X class="size-3" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if unpinnedColumns.length > 0}
    <Popover.Root bind:open={addColumnOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button variant="outline" size="sm" class="w-full" {...props}>
            <Plus class="mr-2 size-4" />
            Add Column
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-[200px] p-0" align="start">
        <Command.Root>
          <Command.Input placeholder="Search columns..." />
          <Command.Empty>No column found.</Command.Empty>
          <Command.Group class="max-h-[200px] overflow-auto">
            {#each unpinnedColumns as column}
              <Command.Item value={column.id} onSelect={() => addColumn(column.id)}>
                {column.columnDef.meta?.label ?? column.id}
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
  {/if}
{/snippet}

{#if label}
  <div class="grid grid-cols-3 items-start gap-4">
    <Label class="pt-2">{label}</Label>
    <div class="col-span-2 space-y-2">
      {@render content()}
    </div>
  </div>
{:else}
  <div class="space-y-2">
    {@render content()}
  </div>
{/if}
