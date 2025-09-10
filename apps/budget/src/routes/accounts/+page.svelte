<script lang="ts">
  import AddAccountDialog from "$lib/components/dialogs/add-account-dialog.svelte";
  import DeleteAccountDialog from "$lib/components/dialogs/delete-account-dialog.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { AccountsState } from "$lib/states/entities/accounts.svelte";
  import {
    deleteAccountDialog,
    deleteAccountId,
    managingAccountId,
    newAccountDialog,
  } from "$lib/states/ui/global.svelte";
  import { currencyFormatter } from "$lib/utils/formatters";

  const accountsState = $derived(AccountsState.get());
  const accounts = $derived(accountsState.accounts.values());

  let deleteDialogId = $derived(deleteAccountId);
  let deleteDialogOpen = $derived(deleteAccountDialog);

  const deleteAccount = (id: number) => {
    deleteDialogId.current = id;
    deleteDialogOpen.setTrue();
  };

  const dialogOpen = $derived(newAccountDialog);
  const managingAccount = $derived(managingAccountId);

  const editAccount = (id: number) => {
    managingAccount.current = id;
    dialogOpen.current = true;
  };
</script>

<Button
  onclick={() => {
    managingAccount.current = 0;
    dialogOpen.current = true;
  }}>Add Account</Button
>

<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {#each accounts as { id, name, balance, notes }}
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <a
            href="/accounts/{id}"
            class="text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            {name}
          </a>
        </Card.Title>
        <Card.Description
          >{(notes?.length || 0) > 100 ? notes?.substring(0, 100) + "..." : notes}</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <strong>Balance:</strong>
        {currencyFormatter.format(balance ?? 0)}
      </Card.Content>
      <Card.Footer class="flex gap-2">
        <Button
          onclick={() => editAccount(id)}
          variant="outline"
          size="sm"
          aria-label="Edit account {name}"
        >
          Edit
        </Button>
        <Button
          onclick={() => deleteAccount(id)}
          variant="secondary"
          size="sm"
          aria-label="Delete account {name}"
        >
          Delete
        </Button>
      </Card.Footer>
    </Card.Root>
  {/each}
</div>

<DeleteAccountDialog />
<AddAccountDialog />
