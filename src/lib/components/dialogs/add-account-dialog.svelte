<script lang="ts">
  import { page } from '$app/state';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Form from '$lib/components/ui/form';
  import { Input } from '$lib/components/ui/input';
  import { formInsertAccountSchema } from '$lib/schema';
  import { newAccountDialog } from '$lib/states/global.svelte';
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';

  const dialogOpen = $derived(newAccountDialog.get());
  let { data } = page;

  const form = superForm(data.manageAccountForm, {
    validators: zodClient(formInsertAccountSchema),
    onResult: () => {
      dialogOpen.current = false;
    }
  });

  const { form: formData, enhance, submitting } = form;
  // const balanceProxy = numberProxy(form, 'balance');
</script>

<Dialog.Root bind:open={dialogOpen.current}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Account</Dialog.Title>
      <Dialog.Description>
        <form method="post" action="/accounts?/add-account" use:enhance>
          <Form.Field {form} name="name">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Account Name</Form.Label>
                <Input {...props} bind:value={$formData.name} />
                <Form.Description>An account name like "Checking", "Savings Account", "401k", etc.</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
          <!-- <Form.Field {form} name="balance">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Balance</Form.Label>
                <Input {...props} bind:value={$formData.balance} />
                <Form.Description>Your account's current balance.</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field> -->
          <Form.Button disabled={$submitting}>Submit</Form.Button>
        </form>
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
