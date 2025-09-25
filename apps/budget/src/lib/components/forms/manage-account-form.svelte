<script lang="ts">
import * as Form from '$lib/components/ui/form';
import {type Account} from '$lib/schema';
import {superformInsertAccountSchema} from '$lib/schema/superforms';
import {Textarea} from '$lib/components/ui/textarea';
import {page} from '$app/state';
import {Input} from '$lib/components/ui/input';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import {useEntityForm} from '$lib/hooks/forms/use-entity-form';
import { WizardFormWrapper } from '$lib/components/wizard';
import AccountWizard from '$lib/components/wizard/account-wizard.svelte';
import { accountWizardStore } from '$lib/stores/wizardStore.svelte';

let {
  accountId,
  onSave,
  formId = 'account-form',
}: {
  accountId?: number;
  onDelete?: (id: number) => void;
  onSave?: (new_entity: Account) => void;
  formId?: string;
} = $props();

// Get form data from accounts page (not layout) to match the action schema
const {
  data: {manageAccountForm},
} = page;

const accounts = AccountsState.get();

const isUpdate = accountId && accountId > 0;

const entityForm = useEntityForm({
  formData: manageAccountForm,
  schema: superformInsertAccountSchema,
  formId,
  entityId: accountId,
  onSave: (entity: Account) => {
    if (isUpdate) {
      accounts.updateAccount(entity);
    } else {
      accounts.addAccount(entity);
    }
    if (onSave) onSave(entity);
  }
});

const {form: formData, enhance} = entityForm;

// Initialize form data for existing account
const initialData: Partial<Account> = {};
if (accountId && accountId > 0) {
  const account = accounts.getById(accountId);
  if (account) {
    $formData.id = accountId;
    $formData.name = account.name;
    $formData.notes = account.notes;

    // Set initial data for wizard
    initialData.id = accountId;
    initialData.name = account.name;
    initialData.notes = account.notes;
  }
}

// Handle wizard completion
async function handleWizardComplete(wizardFormData: Record<string, any>) {
  // Update form data with wizard results
  $formData.name = wizardFormData.name || '';
  $formData.notes = wizardFormData.notes || '';

  // Wait a tick to ensure reactive updates complete
  await new Promise(resolve => setTimeout(resolve, 0));

  // Submit the form programmatically
  const form = document.getElementById(formId) as HTMLFormElement;
  if (form) {
    // Ensure the form fields have the correct values
    const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement;
    const notesInput = form.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;

    if (nameInput) {
      nameInput.value = $formData.name;
    }
    if (notesInput) {
      notesInput.value = $formData.notes;
    }

    form.requestSubmit();
  }
}
</script>

<WizardFormWrapper
  title={isUpdate ? "Edit Account" : "Create New Account"}
  subtitle={isUpdate ? "Update your account details" : "Add a new account to track your finances"}
  wizardStore={accountWizardStore}
  onComplete={handleWizardComplete}
  defaultMode="manual"
  currentFormData={{ name: $formData.name, notes: $formData.notes }}
>
  {#snippet formContent()}
    <form id={formId} method="post" action="/accounts?/add-account" use:enhance class="grid grid-cols-2 gap-2">
      <input hidden value={$formData.id} name="id" />
      <Form.Field form={entityForm} name="name">
        <Form.Control>
          {#snippet children({props})}
            <Form.Label>Name</Form.Label>
            <Input {...props} bind:value={$formData.name} />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>
      <Form.Field form={entityForm} name="notes" class="col-span-full">
        <Form.Control>
          {#snippet children({props})}
            <Form.Label>Notes</Form.Label>
            <Textarea {...props} bind:value={$formData.notes} />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>
      <Form.Button>Save Account</Form.Button>
    </form>
  {/snippet}

  {#snippet wizardContent()}
    <AccountWizard
      initialData={initialData}
    />
  {/snippet}
</WizardFormWrapper>
