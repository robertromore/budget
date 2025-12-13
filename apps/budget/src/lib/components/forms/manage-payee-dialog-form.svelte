<script lang="ts">
import * as Form from '$lib/components/ui/form';
import { useEntityForm } from '$lib/hooks/forms/use-entity-form';
import { type Payee } from '$lib/schema';
import { superformInsertPayeeSchema } from '$lib/schema/superforms';
import { Textarea } from '$lib/components/ui/textarea';
import { Input } from '$lib/components/ui/input';
import { PayeesState } from '$lib/states/entities/payees.svelte';

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

// Capture props at mount time to avoid reactivity warnings
const _formId = (() => formId)();
const _payeeId = (() => payeeId)();

const payees = PayeesState.get();

// Initialize form data
let initialData = { name: '', notes: '' };
if (_payeeId && _payeeId > 0) {
  const existingPayee = payees.getById(_payeeId);
  if (existingPayee) {
    initialData = {
      name: existingPayee.name ?? '',
      notes: existingPayee.notes || '',
    };
  }
}

const form = useEntityForm<Payee>({
  formData: initialData,
  schema: superformInsertPayeeSchema,
  formId: _formId,
  entityId: _payeeId,
  onSave: (entity) => {
    payees.addPayee(entity);
    onSave?.(entity);
  },
  onUpdate: (entity) => {
    payees.updatePayee(entity);
    onSave?.(entity);
  },
  customOptions: {
    delayMs: 300,
    timeoutMs: 8000,
  },
});

const { enhance, form: formData, submitting, isUpdate } = form;
</script>

<form method="post" action="/payees?/save-payee" use:enhance class="space-y-4">
  {#if _payeeId}
    <input type="hidden" name="id" value={_payeeId} />
  {/if}

  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Name</Form.Label>
        <Input {...props} bind:value={$formData.name} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Form.Field {form} name="notes">
    <Form.Control>
      {#snippet children({ props })}
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
