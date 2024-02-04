<script lang="ts">
  import { page } from "$app/stores";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
	import * as Form from "$lib/components/ui/form";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { PageData, ActionData } from './$types';
	import { formInsertAccountSchema, type Account, type InsertAccountSchema } from '$lib/schema';
	import type { FormOptions } from "formsnap";
	import type { FormResult } from "sveltekit-superforms/client";
	import { trpc } from "$lib/trpc/client";
	import { currencyFormatter } from "$lib/helpers/formatters";

  type AccountPageData = PageData & {
    form: SuperValidated<InsertAccountSchema>,
    accounts: Account[]
  };

  let { data, dialogOpen = false, alertDialogOpen = false } = $props<{data: AccountPageData, dialogOpen: boolean, alertDialogOpen: boolean}>();
  let form: SuperValidated<InsertAccountSchema> = $state(data.form);
  let accounts = $state(data.accounts);

  let formOptions: FormOptions<InsertAccountSchema> = {
    onResult(event) {
      const result = event.result as FormResult<ActionData>;
      if (result.type === 'success') {
        dialogOpen = false;
        if (result.data?.entity) {
          accounts.push(result.data.entity);
        }
      }
    },
  }

  let deleteId: number;
  const deleteAccount = (id: number) => {
    deleteId = id;
    alertDialogOpen = true;
  };

  const confirmDeleteAccount = async() => {
    alertDialogOpen = false;
    await trpc($page).accountRoutes.remove.mutate({ id: deleteId }).then(async() => {
      await loadAccounts();
    });
  };

  const loadAccounts = async() => {
    accounts = await trpc($page).accountRoutes.all.query();
  };
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Trigger class={buttonVariants({ variant: "default" })}>Add Account</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Account</Dialog.Title>
      <Dialog.Description>
        <Form.Root method="post" action="?/add-account" {form} schema={formInsertAccountSchema} options={formOptions} let:config let:submitting>
          <Form.Field {config} name="name">
            <Form.Item>
              <Form.Label>Account Name</Form.Label>
              <Form.Input />
              <Form.Description>An account name like "Checking", "Savings Account", "401k", etc.</Form.Description>
              <Form.Validation />
            </Form.Item>
          </Form.Field>
          <Form.Field {config} name="balance">
            <Form.Item>
              <Form.Label>Balance</Form.Label>
              <Form.Input placeholder="$0.00" />
              <Form.Description>Your account's current balance.</Form.Description>
              <Form.Validation />
            </Form.Item>
          </Form.Field>
          <Form.Button disabled={submitting}>Submit</Form.Button>
        </Form.Root>
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>

<div class="grid grid-cols-4 gap-4 mt-4">
{#each accounts as { id, name, balance, notes }}
  <Card.Root>
    <Card.Header>
      <Card.Title><a href="/accounts/{id}">{name}</a></Card.Title>
      <Card.Description>{notes?.length || 0 > 100 ? notes?.substring(0, 100) + '...' : notes}</Card.Description>
    </Card.Header>
    <Card.Content>
      <strong>Balance:</strong> {currencyFormatter.format(balance ?? 0)}
    </Card.Content>
    <Card.Footer>
      <Button onclick={() => deleteAccount(id)} class={buttonVariants({ variant: "secondary" })}>Delete</Button>
    </Card.Footer>
  </Card.Root>
{/each}
</div>

<AlertDialog.Root bind:open={alertDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete your account
        and any associated information with it.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmDeleteAccount} class={buttonVariants({ variant: "destructive" })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
