<script lang="ts">
    import { invalidate, invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { buttonVariants } from "$lib/components/ui/button";
  import type { Transaction } from "$lib/schema";
  import { trpc } from "$lib/trpc/client";

  let {
    account,
    dialogOpen,
    onTransactionDeleted
  } = $props<{
    account: number;
    dialogOpen: boolean;
    onTransactionDeleted: (entity: Transaction) => void;
  }>();

  let confirmDeleteTransaction = async() => {
    let entity: Transaction[] = await trpc($page).transactionRoutes.delete.mutate(account);
    onTransactionDeleted(entity[0]);
  };
</script>

<AlertDialog.Root bind:open={dialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this transaction.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteTransaction}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
