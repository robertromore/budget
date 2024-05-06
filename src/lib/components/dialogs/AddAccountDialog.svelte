<script lang="ts">
  import { buttonVariants } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Form from '$lib/components/ui/form';
  import { Input } from '$lib/components/ui/input';
  import { formInsertAccountSchema } from '$lib/schema';
  import { getAccountState } from '$lib/states/AccountState.svelte';
  import SuperDebug, { superForm, numberProxy } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';

  let {
    dialogOpen
  }: {
    dialogOpen?: boolean;
  } = $props();

  const data = getAccountState();

  const form = superForm(data.manageAccountForm, {
    validators: zodClient(formInsertAccountSchema),
    onResult: () => {
      dialogOpen = false;
    }
  });

  const { form: formData, enhance, submitting } = form;
  const balanceProxy = numberProxy(form, 'balance');
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Trigger class={buttonVariants({ variant: 'default' })}>Add Account</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Account</Dialog.Title>
      <Dialog.Description>
        <form method="post" action="/accounts?/add-account" use:enhance>
          <Form.Field {form} name="name">
            <Form.Control let:attrs>
              <Form.Label>Account Name</Form.Label>
              <Input {...attrs} bind:value={$formData.name} />
              <Form.Description
                >An account name like "Checking", "Savings Account", "401k", etc.</Form.Description
              >
              <Form.FieldErrors />
            </Form.Control>
          </Form.Field>
          <Form.Field {form} name="balance">
            <Form.Control let:attrs>
              <Form.Label>Balance</Form.Label>
              <Input {...attrs} bind:value={$balanceProxy} />
              <Form.Description>Your account's current balance.</Form.Description>
              <Form.FieldErrors />
            </Form.Control>
          </Form.Field>
          <Form.Button disabled={$submitting}>Submit</Form.Button>
        </form>
        <SuperDebug data={$formData} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
