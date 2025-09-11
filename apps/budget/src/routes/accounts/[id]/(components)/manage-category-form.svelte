<script lang="ts">
import {page} from '$app/state';
import * as AlertDialog from '$ui/lib/components/ui/alert-dialog';
import {Button, buttonVariants} from '$ui/lib/components/ui/button';
import * as Form from '$ui/lib/components/ui/form';
import {Input} from '$ui/lib/components/ui/input';
import {Textarea} from '$ui/lib/components/ui/textarea';
import {type Category} from '$lib/schema';
import {superformInsertCategorySchema} from '$lib/schema/superforms';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import type {EditableEntityItem} from '$lib/types';
import {superForm} from 'sveltekit-superforms';
import {zod4Client} from 'sveltekit-superforms/adapters';

let {
  id,
  onDelete,
  onSave,
}: {
  id?: number | undefined;
  onDelete?: (id: number) => void;
  onSave?: (new_category: EditableEntityItem, is_new: boolean) => void;
} = $props();

// Get form data from page if available, otherwise use defaults
const pageData = page.data['manageCategoryForm'];

const form = superForm(pageData || {name: '', notes: ''}, {
  id: 'category-form',
  validators: zod4Client(superformInsertCategorySchema),
  onResult: async ({result}) => {
    if (onSave) {
      if (result.type === 'success' && result.data) {
        onSave(result.data['entity'], (id ?? 0) === 0);
      }
    }
  },
});

const {form: formData, enhance} = form;
if (id) {
  const category: Category = CategoriesState.get().getById(id)!;
  $formData.name = category.name;
  $formData.notes = category.notes;
}

let alertDialogOpen = $state(false);
const deleteCategory = async (id: number) => {
  alertDialogOpen = false;
  if (onDelete) {
    onDelete(id);
  }
};
</script>

<form method="post" action="/categories?/save-category" use:enhance>
  {#if id}
    <input type="hidden" name="id" value={id} />
  {/if}
  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Name</Form.Label>
        <Input {...props} bind:value={$formData.name} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="notes" class="col-span-full">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Notes</Form.Label>
        <Textarea {...props} bind:value={$formData.notes} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Button>save</Form.Button>
  {#if id}
    <Button variant="destructive" onclick={() => (alertDialogOpen = true)}>delete</Button>
  {/if}
</form>

<AlertDialog.Root bind:open={alertDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this category.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={() => deleteCategory(id!)}
        class={buttonVariants({variant: 'destructive'})}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
