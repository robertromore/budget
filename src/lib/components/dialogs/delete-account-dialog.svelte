<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { buttonVariants } from "$lib/components/ui/button";
  import { goto } from "$app/navigation";
  import { deleteAccountDialog, deleteAccountId } from "$lib/states/ui/global.svelte";
  import { AccountsState } from "$lib/states/entities/accounts.svelte";

  const _deleteAccountDialog = $derived(deleteAccountDialog);
  const _deleteAccountId = $derived(deleteAccountId);
  const accountsState = AccountsState.get();
  const confirmDeleteAccount = async () => {
    _deleteAccountDialog.current = false;
    accountsState.deleteAccount(_deleteAccountId.current);
    await goto('/accounts');
  };
</script>

<AlertDialog.Root bind:open={() => _deleteAccountDialog.current, (newOpen) => _deleteAccountDialog.current = newOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete your account and any associated
        information with it.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteAccount}
        class={buttonVariants({ variant: "destructive" })}>Continue</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
