<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import { Textarea } from '$lib/components/ui/textarea';
import type { CategoryGroup } from '$lib/schema';
import { superformInsertCategoryGroupSchema } from '$lib/schema/superforms';
import { superForm } from 'sveltekit-superforms';
import { zod4Client } from 'sveltekit-superforms/adapters';
import { IconPicker } from '$lib/components/ui/icon-picker';
import { ColorPicker } from '$lib/components/ui/color-picker';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import Palette from '@lucide/svelte/icons/palette';
import { createCategoryGroup, updateCategoryGroup } from '$lib/query/category-groups';

let {
  id,
  initialData,
  onDelete,
  onSave,
  onCancel,
}: {
  id?: number | undefined;
  initialData?: CategoryGroup | undefined;
  onDelete?: (id: number) => void;
  onSave?: () => void;
  onCancel?: () => void;
} = $props();

// Capture props at mount time to avoid reactivity warnings
const _id = (() => id)();
const _initialData = (() => initialData)();

const isUpdate = $derived(_id !== undefined && _id > 0);
const createMutation = createCategoryGroup.options();
const updateMutation = updateCategoryGroup.options();

// Generate unique form ID based on group ID or a random value for new groups
const formId = _id
  ? `category-group-form-${_id}`
  : `category-group-form-new-${Math.random().toString(36).slice(2, 9)}`;

const defaults = {
  name: _initialData?.name ?? '',
  description: (_initialData?.description ?? '') as string | null | undefined,
  groupIcon: (_initialData?.groupIcon ?? '') as string | null | undefined,
  groupColor: (_initialData?.groupColor ?? '') as string | null | undefined,
  sortOrder: _initialData?.sortOrder ?? 0,
};

const form = superForm(defaults, {
  id: formId,
  validators: zod4Client(superformInsertCategoryGroupSchema),
  onSubmit: async ({ formData, cancel }) => {
    cancel(); // Prevent default form submission

    const data = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      groupIcon: (formData.get('groupIcon') as string) || null,
      groupColor: (formData.get('groupColor') as string) || null,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
    };

    try {
      if (isUpdate && _id) {
        await updateMutation.mutateAsync({ id: _id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      onSave?.();
    } catch {
      // Mutation handles error display
    }
  },
});

const { form: formData, enhance, submitting } = form;
const isSaving = $derived(createMutation.isPending || updateMutation.isPending);

function handleIconChange(event: CustomEvent<{ value: string }>) {
  const iconValue = event.detail.value;
  if (typeof iconValue === 'string') {
    $formData.groupIcon = iconValue;
  }
}

function handleColorChange(event: CustomEvent<{ value: string }>) {
  const colorValue = event.detail.value;
  if (typeof colorValue === 'string') {
    $formData.groupColor = colorValue;
  }
}

let alertDialogOpen = $state(false);
const deleteGroup = async (id: number) => {
  alertDialogOpen = false;
  if (onDelete) {
    onDelete(id);
  }
};
</script>

<form method="post" use:enhance class="space-y-6">
  {#if _id}
    <input type="hidden" name="id" value={_id} />
  {/if}
  <input type="hidden" name="sortOrder" value={$formData.sortOrder} />
  <input type="hidden" name="groupIcon" value={$formData.groupIcon ?? ''} />
  <input type="hidden" name="groupColor" value={$formData.groupColor ?? ''} />

  <!-- Basic Information Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <FolderOpen class="text-primary h-5 w-5" />
        <Card.Title class="text-lg">Group Information</Card.Title>
      </div>
      <Card.Description>Enter the basic details for your category group.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 gap-4">
        <!-- Group Name -->
        <Form.Field {form} name="name">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Name</Form.Label>
              <Input
                {...props}
                bind:value={$formData.name}
                placeholder="e.g., Food & Dining, Transportation, Housing" />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Description -->
        <Form.Field {form} name="description">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Description (Optional)</Form.Label>
              <Textarea
                {...props}
                bind:value={$formData.description}
                placeholder="Describe what categories belong in this group..."
                class="min-h-20 resize-none" />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Visual Appearance Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <Palette class="text-primary h-5 w-5" />
        <Card.Title class="text-lg">Visual Appearance</Card.Title>
      </div>
      <Card.Description>Customize the icon and color for this group.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Icon Picker -->
        <Form.Field {form} name="groupIcon">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Icon</Form.Label>
              <IconPicker value={$formData.groupIcon ?? ''} onchange={handleIconChange} />
              <Form.Description>Choose an icon to represent this group</Form.Description>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Color Picker -->
        <Form.Field {form} name="groupColor">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Color</Form.Label>
              <ColorPicker value={$formData.groupColor ?? ''} onchange={handleColorChange} />
              <Form.Description>Select a color for the group badge</Form.Description>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Action Buttons -->
  <div class="flex items-center justify-between gap-4">
    <div class="flex-1">
      {#if _id}
        <AlertDialog.Root bind:open={alertDialogOpen}>
          <AlertDialog.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="destructive" type="button">Delete Group</Button>
            {/snippet}
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete Category Group?</AlertDialog.Title>
              <AlertDialog.Description>
                This will remove the group and unassign all categories from it. Categories will not
                be deleted.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                class="bg-destructive hover:bg-destructive/90"
                onclick={() => deleteGroup(_id)}>
                Delete
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if onCancel}
        <Button type="button" variant="destructive" onclick={onCancel} class="flex-1">
          Cancel
        </Button>
      {/if}
      <Button type="submit" disabled={isSaving} class={onCancel ? 'flex-1' : ''}>
        {#if isSaving}
          Saving...
        {:else}
          {_id ? 'Update' : 'Create'} Group
        {/if}
      </Button>
    </div>
  </div>
</form>
