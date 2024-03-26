<script lang="ts">
  import { Button, buttonVariants } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import type { Infer, SuperValidated } from 'sveltekit-superforms';
  import type { PageData } from './$types';
  import { type Account, type FormInsertAccountSchema, type RemoveAccountSchema } from '$lib/schema';
  import { currencyFormatter } from '$lib/helpers/formatters';
  import AddAccountDialog from '$lib/components/dialogs/AddAccountDialog.svelte';
  import DeleteAccountDialog from '$lib/components/dialogs/DeleteAccountDialog.svelte';
  import { setAccountState } from '$lib/states/AccountState.svelte';

  type AccountPageData = PageData & {
    addAccountForm: SuperValidated<Infer<FormInsertAccountSchema>>;
    deleteAccountForm: SuperValidated<Infer<RemoveAccountSchema>>;
    accounts: Account[];
  };

  let {
    data,
  } = $props<{ data: AccountPageData; }>();

  setAccountState({
    accounts: data.accounts,
    manageAccountForm: data.manageAccountForm,
    deleteAccountForm: data.deleteAccountForm
  });

  let deleteDialogId: number | null = $state(null);
  let deleteDialogOpen: boolean = $state(false);

  const deleteAccount = (id: number) => {
    deleteDialogId = id;
    deleteDialogOpen = true;
  };
</script>

<AddAccountDialog />

<div class="mt-4 grid grid-cols-4 gap-4">
  {#each data.accounts as { id, name, balance, notes }}
    <Card.Root>
      <Card.Header>
        <Card.Title><a href="/accounts/{id}">{name}</a></Card.Title>
        <Card.Description
          >{notes?.length || 0 > 100 ? notes?.substring(0, 100) + '...' : notes}</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <strong>Balance:</strong>
        {currencyFormatter.format(balance ?? 0)}
      </Card.Content>
      <Card.Footer>
        <Button onclick={() => deleteAccount(id)} class={buttonVariants({ variant: 'secondary' })}
          >Delete</Button
        >
      </Card.Footer>
    </Card.Root>
  {/each}
</div>

<DeleteAccountDialog bind:deleteDialogId={deleteDialogId} bind:deleteDialogOpen={deleteDialogOpen} />
