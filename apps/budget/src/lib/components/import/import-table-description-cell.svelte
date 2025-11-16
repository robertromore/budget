<script lang="ts">
import type {Row} from '@tanstack/table-core';
import type {ImportRow} from '$lib/types/import';
import TextAreaInput from '$lib/components/input/text-area-input.svelte';

interface Props {
  row: Row<ImportRow>;
  onUpdate?: (rowIndex: number, description: string | null) => void;
}

let {row, onUpdate}: Props = $props();

const rowIndex = $derived(row.original.rowIndex);

// Initialize local state directly from row data
const initialDescription = (() => {
  const desc = row.original.normalizedData['description'] || row.original.normalizedData['notes'];
  return (typeof desc === 'string' ? desc : null) as string | null;
})();

let localValue = $state<string | null>(initialDescription);

function handleUpdate(description: string | null) {
  localValue = description;
  onUpdate?.(rowIndex, description);
}
</script>

<TextAreaInput
  bind:value={localValue}
  placeholder="Add description..."
  label="Description"
  displayPlaceholder="—"
  rows={4}
  onUpdate={handleUpdate}
  buttonVariant="outline" />
