<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { rpc } from '$lib/query';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';

let {
  transactions,
  dialogOpen = $bindable(),
  onDelete,
  // Transfer-related props for single transaction deletion
  isTransfer = false,
  transferId,
  transferAccountName,
}: {
  transactions?: number[];
  dialogOpen: boolean;
  onDelete?: () => void;
  isTransfer?: boolean;
  transferId?: string | null;
  transferAccountName?: string | null;
} = $props();

// Use new query mutations for proper cache invalidation
const bulkDeleteMutation = rpc.transactions.bulkDeleteTransactions.options();
const singleDeleteMutation = rpc.transactions.deleteTransaction.options();
const deleteTransferMutation = rpc.transactions.deleteTransfer.options();

// State for the "also delete linked transfer" checkbox
let alsoDeleteLinkedTransfer = $state(true);

// Determine if we should show the transfer option (single transfer transaction)
const showTransferOption = $derived(
  isTransfer && transferId && transferAccountName && transactions?.length === 1
);

let confirmDeleteTransaction = async () => {
  if (transactions && transactions.length > 0) {
    try {
      // Handle transfer deletion
      if (showTransferOption && alsoDeleteLinkedTransfer && transferId) {
        // Delete both sides of the transfer
        await deleteTransferMutation.mutateAsync({ transferId });
      } else if (transactions.length === 1) {
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
        {#if showTransferOption}
          This transaction is part of a transfer. Deleting it will leave the linked transaction in
          "{transferAccountName}" orphaned.
        {:else}
          This action cannot be undone. This will permanently delete this transaction.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if showTransferOption}
      <div class="bg-muted/50 flex items-start gap-3 rounded-lg border p-4">
        <ArrowRightLeft class="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
        <div class="flex-1 space-y-3">
          <p class="text-sm">
            This transfer is linked to a transaction in <strong>{transferAccountName}</strong>.
          </p>
          <div class="flex items-center gap-2">
            <Checkbox id="delete-linked" bind:checked={alsoDeleteLinkedTransfer} />
            <Label for="delete-linked" class="cursor-pointer text-sm font-medium">
              Also delete the linked transaction in {transferAccountName}
            </Label>
          </div>
        </div>
      </div>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteTransaction}
        class={buttonVariants({ variant: 'destructive' })}>
        {#if showTransferOption && alsoDeleteLinkedTransfer}
          Delete Both
        {:else}
          Delete
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
