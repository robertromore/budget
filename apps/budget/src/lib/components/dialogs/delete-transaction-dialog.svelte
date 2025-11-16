<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { CurrentAccountState } from '$lib/states/current-account.svelte';

let {
  transactions,
  dialogOpen = $bindable(),
  onDelete,
}: {
  transactions?: number[];
  dialogOpen: boolean;
  onDelete?: () => void;
} = $props();

let account: CurrentAccountState = CurrentAccountState.get();

let confirmDeleteTransaction = async () => {
  if (transactions) {
    account?.deleteTransactions(transactions);
  }
  if (onDelete) {
    onDelete();
  }
  dialogOpen = false;
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
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
