<!--
  Bulk Delete Transactions Dialog — confirms a multi-row delete from
  the transactions tab and dispatches to the right mutation depending
  on what's in the selection (regular transactions, transfers,
  reconciliation/balance-reset markers). Bind a `transactions` array
  from the parent; setting it non-empty opens the dialog.
-->
<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { rpc } from '$lib/query';
import type { TransactionsFormat } from '$lib/types';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';

interface Props {
  transactions: TransactionsFormat[];
  accountId: number | undefined;
}

let { transactions = $bindable([]), accountId }: Props = $props();

const bulkDeleteMutation = rpc.transactions.bulkDeleteTransactions.options();
const deleteTransferMutation = rpc.transactions.deleteTransfer.options();
const clearReconciledBalanceMutation = rpc.accounts.clearReconciledBalance.options();
const clearBalanceResetDateMutation = rpc.accounts.clearBalanceResetDate.options();

const isOpen = $derived(transactions.length > 0);
const transferTransactionsToDelete = $derived(
  transactions.filter((t) => t.isTransfer && t.transferId)
);
const hasTransfersToDelete = $derived(transferTransactionsToDelete.length > 0);

let isDeleting = $state(false);
let alsoDeleteLinkedTransfers = $state(true);

function close() {
  transactions = [];
  alsoDeleteLinkedTransfers = true;
}

function handleOpenChange(open: boolean) {
  if (!open) close();
}

async function confirmDelete() {
  if (isDeleting || transactions.length === 0) return;

  isDeleting = true;
  try {
    const reconciliationMarkers = transactions.filter(
      (t) => t.isReconciliationMarker && t.markerType === 'reconciliation'
    );
    const balanceResetMarkers = transactions.filter(
      (t) => t.isReconciliationMarker && t.markerType === 'balance-reset'
    );
    const realTransactions = transactions.filter((t) => !t.isReconciliationMarker);

    if (reconciliationMarkers.length > 0 && accountId) {
      await clearReconciledBalanceMutation.mutateAsync({ accountId: Number(accountId) });
    }

    if (balanceResetMarkers.length > 0 && accountId) {
      await clearBalanceResetDateMutation.mutateAsync({ accountId: Number(accountId) });
    }

    if (realTransactions.length > 0) {
      if (alsoDeleteLinkedTransfers && hasTransfersToDelete) {
        const transferIds = [...new Set(transferTransactionsToDelete.map((t) => t.transferId!))];
        for (const transferId of transferIds) {
          await deleteTransferMutation.mutateAsync({ transferId });
        }

        const nonTransferIds = realTransactions
          .filter((t) => typeof t.id === 'number' && !t.isTransfer)
          .map((t) => t.id as number);

        if (nonTransferIds.length > 0) {
          await bulkDeleteMutation.mutateAsync(nonTransferIds);
        }
      } else {
        const idsToDelete = realTransactions
          .filter((t) => typeof t.id === 'number')
          .map((t) => t.id as number);

        if (idsToDelete.length > 0) {
          await bulkDeleteMutation.mutateAsync(idsToDelete);
        }
      }
    }

    close();
  } catch {
    // Mutation surfaces the error via toast.
  } finally {
    isDeleting = false;
  }
}
</script>

<AlertDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        Delete {transactions.length} Transaction{transactions.length > 1 ? 's' : ''}
      </AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {transactions.length} transaction{transactions.length > 1
          ? 's'
          : ''}? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if hasTransfersToDelete}
      <div class="bg-muted/50 flex items-start gap-3 rounded-lg border p-4">
        <ArrowRightLeft class="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
        <div class="flex-1 space-y-3">
          <p class="text-sm">
            {transferTransactionsToDelete.length} of the selected transactions {transferTransactionsToDelete.length ===
            1
              ? 'is a transfer'
              : 'are transfers'} linked to transactions in other accounts.
          </p>
          <div class="flex items-center gap-2">
            <Checkbox id="bulk-delete-linked" bind:checked={alsoDeleteLinkedTransfers} />
            <Label for="bulk-delete-linked" class="cursor-pointer text-sm font-medium">
              Also delete the linked transfer transactions
            </Label>
          </div>
        </div>
      </div>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDelete}
        disabled={isDeleting}
        class={buttonVariants({ variant: 'destructive' })}>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
