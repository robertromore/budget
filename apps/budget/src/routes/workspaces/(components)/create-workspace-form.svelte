<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import { formInsertWorkspaceSchema, type FormInsertWorkspaceSchema } from '$lib/schema/workspaces';
import { toast } from '$lib/utils/toast-interceptor';
import type { SuperValidated } from 'sveltekit-superforms';
import { superForm } from 'sveltekit-superforms';
import { zod4Client } from 'sveltekit-superforms/adapters';

interface Props {
  data: SuperValidated<FormInsertWorkspaceSchema>;
  onSuccess?: () => void;
}

let { data, onSuccess }: Props = $props();

// svelte-ignore state_referenced_locally - superForm intentionally captures initial value
const form = superForm(data, {
  validators: zod4Client(formInsertWorkspaceSchema),
  dataType: 'json',
  resetForm: true,
  invalidateAll: 'force',
  onUpdate({ form }) {
    if (form.valid && form.message) {
      toast.success('Workspace created successfully');
      if (onSuccess) {
        onSuccess();
      }
    }
  },
  onError({ result }) {
    if (result.type === 'error') {
      toast.error(result.error.message || 'Failed to create workspace');
    }
  },
});

const { form: formData, enhance, errors, delayed, submitting } = form;

// Auto-generate slug from display name
let slugTouched = $state(false);

function handleDisplayNameInput(value: string) {
  if (!slugTouched) {
    $formData['slug'] = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Create New Workspace</Card.Title>
    <Card.Description>
      Create a new workspace to manage separate budgets, accounts, and transactions.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <form method="POST" action="?/create" use:enhance class="space-y-4">
      <Form.Field {form} name="displayName">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Workspace Name</Form.Label>
            <Input
              {...props}
              bind:value={$formData['displayName']}
              oninput={(e) => handleDisplayNameInput(e.currentTarget.value)}
              placeholder="Personal, Business, Family, etc."
              disabled={$submitting || $delayed} />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field {form} name="slug">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Slug</Form.Label>
            <Input
              {...props}
              bind:value={$formData['slug']}
              oninput={() => (slugTouched = true)}
              placeholder="personal, business, family, etc."
              disabled={$submitting || $delayed} />
          {/snippet}
        </Form.Control>
        <Form.Description>
          Used for URLs. Only lowercase letters, numbers, and hyphens.
        </Form.Description>
        <Form.FieldErrors />
      </Form.Field>

      <Form.Field {form} name="preferences">
        <input
          type="hidden"
          name="preferences"
          value={JSON.stringify({
            locale: 'en-US',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            theme: 'system',
          })} />
      </Form.Field>

      <div class="flex justify-end gap-2">
        <Button type="submit" disabled={$submitting || $delayed}>
          {$submitting || $delayed ? 'Creating...' : 'Create Workspace'}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>
