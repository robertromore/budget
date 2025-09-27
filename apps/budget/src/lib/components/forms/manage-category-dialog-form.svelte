<script lang="ts">
import * as Form from '$lib/components/ui/form';
import {type Category} from '$lib/schema';
import {superformInsertCategorySchema} from '$lib/schema/superforms';
import {Textarea} from '$lib/components/ui/textarea';
import {Input} from '$lib/components/ui/input';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {superForm} from 'sveltekit-superforms';
import {zod4Client} from 'sveltekit-superforms/adapters';

let {
  categoryId,
  onSave,
  formId = 'category-form',
}: {
  categoryId?: number;
  onDelete?: (id: number) => void;
  onSave?: (new_entity: Category) => void;
  formId?: string;
} = $props();

const categories = CategoriesState.get();
const isUpdate = categoryId && categoryId > 0;

// Initialize form data
let initialData = { name: '', notes: '' };
if (isUpdate && categoryId) {
  const existingCategory = categories.getById(categoryId);
  if (existingCategory) {
    initialData = {
      name: existingCategory.name,
      notes: existingCategory.notes || ''
    };
  }
}

const form = superForm(initialData, {
  id: formId,
  validators: zod4Client(superformInsertCategorySchema),
  onResult: async ({result}) => {
    if (result.type === 'success' && result.data) {
      const entity = result.data['entity'] as Category;
      if (isUpdate) {
        categories.updateCategory(entity);
      } else {
        categories.addCategory(entity);
      }
      onSave?.(entity);
    }
  },
  delayMs: 300,
  timeoutMs: 8000,
});

const {enhance, form: formData, submitting} = form;
</script>

<form method="post" action="/categories?/save-category" use:enhance class="space-y-4">
  {#if categoryId}
    <input type="hidden" name="id" value={categoryId} />
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

  <Form.Field {form} name="notes">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Notes</Form.Label>
        <Textarea {...props} bind:value={$formData.notes} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Form.Button disabled={$submitting}>
    {$submitting ? 'Saving...' : 'Save'}
  </Form.Button>
</form>