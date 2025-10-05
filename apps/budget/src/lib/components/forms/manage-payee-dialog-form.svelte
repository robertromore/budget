<script lang="ts">
import * as Form from '$lib/components/ui/form';
import {type Payee} from '$lib/schema';
import {superformInsertPayeeSchema} from '$lib/schema/superforms';
import {Textarea} from '$lib/components/ui/textarea';
import {Input} from '$lib/components/ui/input';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {superForm} from 'sveltekit-superforms';
import {zod4Client} from 'sveltekit-superforms/adapters';

let {
  payeeId,
  onSave,
  formId = 'payee-form',
}: {
  payeeId?: number;
  onDelete?: (id: number) => void;
  onSave?: (new_entity: Payee) => void;
  formId?: string;
} = $props();

const payees = PayeesState.get();
const isUpdate = payeeId && payeeId > 0;

// Initialize form data
let initialData = { name: '', notes: '' };
if (isUpdate && payeeId) {
  const existingPayee = payees.getById(payeeId);
  if (existingPayee) {
    initialData = {
      name: existingPayee.name ?? '',
      notes: existingPayee.notes || ''
    };
  }
}

const form = superForm(initialData, {
  id: formId,
  validators: zod4Client(superformInsertPayeeSchema),
  onResult: async ({result}) => {
    if (result.type === 'success' && result.data) {
      const entity = result.data['entity'] as Payee;
      if (isUpdate) {
        payees.updatePayee(entity);
      } else {
        payees.addPayee(entity);
      }
      onSave?.(entity);
    }
  },
  delayMs: 300,
  timeoutMs: 8000,
});

const {enhance, form: formData, submitting} = form;
</script>

<form method="post" action="/payees?/save-payee" use:enhance class="space-y-4">
  {#if payeeId}
    <input type="hidden" name="id" value={payeeId} />
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
