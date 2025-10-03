<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {buttonVariants} from '$lib/components/ui/button';
import {rpc} from '$lib/query';

let {
  transactions,
  dialogOpen = $bindable(),
  onDelete,
}: {
  transactions?: number[];
  dialogOpen: boolean;
  onDelete?: () => void;
} = $props();

// Use new query mutations for proper cache invalidation
const bulkDeleteMutation = rpc.transactions.bulkDeleteTransactions.options();
const singleDeleteMutation = rpc.transactions.deleteTransaction.options();

let confirmDeleteTransaction = async () => {
  if (transactions && transactions.length > 0) {
    try {
      if (transactions.length === 1) {
        // Use single delete mutation for one transaction
        await singleDeleteMutation.mutateAsync(transactions[0]);
      } else {
        // Use bulk delete mutation for multiple transactions
        await bulkDeleteMutation.mutateAsync(transactions);
      }

      if (onDelete) {
        onDelete();
      }
      dialogOpen = false;
    } catch (error) {
      console.error('Failed to delete transaction(s):', error);
      // Error handling is done by the mutations (toast notifications)
    }
  }
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
        class={buttonVariants({variant: 'destructive'})}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
