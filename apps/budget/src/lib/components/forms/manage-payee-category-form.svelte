<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import {Input} from '$lib/components/ui/input';
import {Textarea} from '$lib/components/ui/textarea';
import type {PayeeCategory} from '$lib/schema';
import {superformInsertPayeeCategorySchema} from '$lib/schema/superforms';
import {superForm} from 'sveltekit-superforms';
import {zod4Client} from 'sveltekit-superforms/adapters';
import {IconPicker} from '$lib/components/ui/icon-picker';
import {ColorPicker} from '$lib/components/ui/color-picker';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import Palette from '@lucide/svelte/icons/palette';
import {savePayeeCategory, deletePayeeCategory} from '$lib/query/payee-categories';

let {
  id,
  initialData,
  onDelete,
  onSave,
  onCancel,
}: {
  id?: number | undefined;
  initialData?: PayeeCategory | undefined;
  onDelete?: (id: number) => void;
  onSave?: () => void;
  onCancel?: () => void;
} = $props();

const isUpdate = $derived(id !== undefined && id > 0);
const saveMutation = savePayeeCategory.options();
const deleteMutation = deletePayeeCategory.options();

// Generate unique form ID based on category ID or a random value for new categories
const formId = id
  ? `payee-category-form-${id}`
  : `payee-category-form-new-${Math.random().toString(36).slice(2, 9)}`;

const defaults = {
  name: initialData?.name ?? '',
  description: (initialData?.description ?? '') as string | null | undefined,
  icon: (initialData?.icon ?? '') as string | null | undefined,
  color: (initialData?.color ?? '') as string | null | undefined,
  displayOrder: initialData?.displayOrder ?? 0,
  isActive: initialData?.isActive ?? true,
};

const form = superForm(defaults, {
  id: formId,
  validators: zod4Client(superformInsertPayeeCategorySchema),
  onSubmit: async ({formData, cancel}) => {
    cancel(); // Prevent default form submission

    const data = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      icon: (formData.get('icon') as string) || null,
      color: (formData.get('color') as string) || null,
      displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
      isActive: formData.get('isActive') === 'true',
    };

    try {
      if (isUpdate && id) {
        await saveMutation.mutateAsync({id, ...data});
      } else {
        await saveMutation.mutateAsync(data);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      onSave?.();
    } catch {
      // Mutation handles error display
    }
  },
});

const {form: formData, enhance, submitting} = form;
const isSaving = $derived(saveMutation.isPending);

function handleIconChange(event: CustomEvent<{value: string}>) {
  const iconValue = event.detail.value;
  if (typeof iconValue === 'string') {
    $formData.icon = iconValue;
  }
}

function handleColorChange(event: CustomEvent<{value: string}>) {
  const colorValue = event.detail.value;
  if (typeof colorValue === 'string') {
    $formData.color = colorValue;
  }
}

let alertDialogOpen = $state(false);
const handleDelete = async (id: number) => {
  alertDialogOpen = false;
  try {
    await deleteMutation.mutateAsync(id);
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (onDelete) {
      onDelete(id);
    }
  } catch {
    // Mutation handles error display
  }
};
</script>

<form method="post" use:enhance class="space-y-6">
  {#if id}
    <input type="hidden" name="id" value={id} />
  {/if}
  <input type="hidden" name="displayOrder" value={$formData.displayOrder} />
  <input type="hidden" name="isActive" value={$formData.isActive} />
  <input type="hidden" name="icon" value={$formData.icon ?? ''} />
  <input type="hidden" name="color" value={$formData.color ?? ''} />

  <!-- Basic Information Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <FolderOpen class="text-primary h-5 w-5" />
        <Card.Title class="text-lg">Category Information</Card.Title>
      </div>
      <Card.Description>Enter the basic details for your payee category.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 gap-4">
        <!-- Category Name -->
        <Form.Field {form} name="name">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Name</Form.Label>
              <Input
                {...props}
                bind:value={$formData.name}
                placeholder="e.g., Utilities, Subscriptions, Healthcare Providers" />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Description -->
        <Form.Field {form} name="description">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Description (Optional)</Form.Label>
              <Textarea
                {...props}
                bind:value={$formData.description}
                placeholder="Describe what payees belong in this category..."
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
      <Card.Description>Customize the icon and color for this category.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Icon Picker -->
        <Form.Field {form} name="icon">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Icon</Form.Label>
              <IconPicker value={$formData.icon ?? ''} onchange={handleIconChange} />
              <Form.Description>Choose an icon to represent this category</Form.Description>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Color Picker -->
        <Form.Field {form} name="color">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Color</Form.Label>
              <ColorPicker value={$formData.color ?? ''} onchange={handleColorChange} />
              <Form.Description>Select a color for the category badge</Form.Description>
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
      {#if id}
        <AlertDialog.Root bind:open={alertDialogOpen}>
          <AlertDialog.Trigger asChild>
            {#snippet child({builder})}
              <Button builders={[builder]} variant="destructive" type="button">
                Delete Category
              </Button>
            {/snippet}
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete Payee Category?</AlertDialog.Title>
              <AlertDialog.Description>
                This will remove the category and unassign all payees from it. Payees will not be
                deleted.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                class="bg-destructive hover:bg-destructive/90"
                onclick={() => handleDelete(id)}>
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
          {id ? 'Update' : 'Create'} Category
        {/if}
      </Button>
    </div>
  </div>
</form>
