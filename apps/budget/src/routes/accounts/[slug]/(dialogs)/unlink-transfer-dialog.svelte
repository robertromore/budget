<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { rpc } from '$lib/query';
import type { TransactionsFormat } from '$lib/types';
import { toast } from 'svelte-sonner';

interface Props {
  transaction: TransactionsFormat;
  dialogOpen: boolean;
}

let { transaction, dialogOpen = $bindable() }: Props = $props();

const unlinkMutation = rpc.transactions.unlinkTransfer.options();

async function handleUnlink() {
  if (!transaction.transferId) {
    toast.error('This transaction is not part of a transfer');
    dialogOpen = false;
    return;
  }

  try {
    await unlinkMutation.mutateAsync({ transferId: transaction.transferId });
    toast.success('Transfer unlinked successfully');
    dialogOpen = false;
  } catch (error) {
    console.error('Failed to unlink transfer:', error);
    toast.error('Failed to unlink transfer');
  }
}
</script>

<AlertDialog.Root bind:open={dialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Unlink Transfer</AlertDialog.Title>
      <AlertDialog.Description class="space-y-2">
        <p>
          This will convert the linked transfer into two separate, independent transactions.
        </p>
        <p class="text-muted-foreground text-sm">
          Both transactions will remain in their respective accounts, but they will no longer be
          linked as a transfer pair.
        </p>
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleUnlink} class={buttonVariants({ variant: 'default' })}>
        Unlink Transfer
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
