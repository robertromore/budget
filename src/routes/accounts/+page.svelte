<script lang="ts">
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { currencyFormatter } from "$lib/helpers/formatters";
  import DeleteAccountDialog from "$lib/components/dialogs/delete-account-dialog.svelte";
  import { deleteAccountDialog, deleteAccountId, managingAccountId, newAccountDialog } from "$lib/states/global.svelte";
  import { AccountsState } from "$lib/states/accounts.svelte";

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
</script>

<Button onclick={() => {
  managingAccount.current = 0;
  dialogOpen.current = true;
}}>Add Account</Button>

<div class="mt-4 grid grid-cols-4 gap-4">
  {#each accounts as { id, name, balance, notes }}
    <Card.Root>
      <Card.Header>
        <Card.Title><a href="/accounts/{id}">{name}</a></Card.Title>
        <Card.Description
          >{(notes?.length || 0) > 100 ? notes?.substring(0, 100) + "..." : notes}</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <strong>Balance:</strong>
        {currencyFormatter.format(balance ?? 0)}
      </Card.Content>
      <Card.Footer>
        <Button onclick={() => deleteAccount(id)} class={buttonVariants({ variant: "secondary" })}
          >Delete</Button
        >
      </Card.Footer>
    </Card.Root>
  {/each}
</div>

<DeleteAccountDialog />
