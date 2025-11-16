<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {Input} from '$lib/components/ui/input';
import {Textarea} from '$lib/components/ui/textarea';
import type {View} from '$lib/schema/views';
import type {ViewDisplayState, ViewFilter, TableEntityType} from '$lib/types';
import {saveView} from '$lib/query/views';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';

interface Props {
  /** The view being edited (undefined for new view) */
  view?: View | undefined;
  /** Entity type for the view */
  entityType: TableEntityType;
  /** Current filters to save with the view */
  filters?: ViewFilter[];
  /** Current display state to save with the view */
  display?: ViewDisplayState;
  /** Handler for cancel */
  onCancel?: () => void;
  /** Handler for successful save */
  onSave?: (view: View) => void;
}

let {view, entityType, filters = [], display, onCancel, onSave}: Props = $props();

const isUpdate = $derived(view !== undefined && view.id !== undefined);
const mutation = saveView.options();

// Form state
let name = $state(view?.name ?? '');
let description = $state(view?.description ?? '');

// Reset form when view changes
$effect(() => {
  if (view) {
    name = view.name ?? '';
    description = view.description ?? '';
  } else {
    name = '';
    description = '';
  }
});

async function handleSave() {
  if (!name.trim()) {
    return;
  }

  try {
    const viewData = {
      ...(view?.id ? {id: view.id} : {}),
      entityType,
      name: name.trim(),
      description: description.trim() || null,
      filters: filters.length > 0 ? filters : null,
      display: display ?? null,
      dirty: false,
    };

    const result = await mutation.mutateAsync(viewData);
    onSave?.(result);
  } catch (error) {
    console.error('Failed to save view:', error);
  }
}

function handleCancel() {
  onCancel?.();
  // Reset form
  name = view?.name ?? '';
  description = view?.description ?? '';
}
</script>

<div class="bg-background rounded-sm border p-4">
  <div class="flex gap-2">
    <div class="flex-1 space-y-2">
      <Input bind:value={name} placeholder="View name" disabled={mutation.isPending} class="h-9" />
      <Textarea
        bind:value={description}
        placeholder="Description (optional)"
        rows={2}
        disabled={mutation.isPending}
        class="min-h-[60px] resize-none" />
    </div>
    <div class="flex flex-col gap-2">
      <Button onclick={handleSave} disabled={!name.trim() || mutation.isPending} size="sm">
        {#if mutation.isPending}
          <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {isUpdate ? 'Update' : 'Create'}
      </Button>
      <Button variant="outline" onclick={handleCancel} disabled={mutation.isPending} size="sm">
        Cancel
      </Button>
    </div>
  </div>
</div>
