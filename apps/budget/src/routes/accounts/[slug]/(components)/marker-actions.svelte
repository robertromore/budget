<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { rpc } from '$lib/query';
import type { TransactionsFormat } from '$lib/types';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Trash2 from '@lucide/svelte/icons/trash-2';

interface Props {
  transaction: TransactionsFormat;
  accountId: number;
}

let { transaction, accountId }: Props = $props();

let confirmOpen = $state(false);

const clearReconciledBalanceMutation = rpc.accounts.clearReconciledBalance.options();
const clearBalanceResetDateMutation = rpc.accounts.clearBalanceResetDate.options();

const markerLabel = $derived(
  transaction.markerType === 'reconciliation' ? 'Reconciliation Checkpoint' : 'Balance Reset Point'
);

async function handleClear() {
  if (transaction.markerType === 'reconciliation') {
    await clearReconciledBalanceMutation.mutateAsync({ accountId });
  } else if (transaction.markerType === 'balance-reset') {
    await clearBalanceResetDateMutation.mutateAsync({ accountId });
  }
  confirmOpen = false;
}
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" class="flex size-8 p-0 data-[state=open]:bg-muted">
        <MoreHorizontal class="size-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-[160px]" align="end">
    <DropdownMenu.Item
      class="text-destructive focus:text-destructive"
      onclick={() => (confirmOpen = true)}>
      <Trash2 class="mr-2 size-4" />
      Clear
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<AlertDialog.Root bind:open={confirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Clear {markerLabel}?</AlertDialog.Title>
      <AlertDialog.Description>
        This will remove the {markerLabel.toLowerCase()} from this account. The account balance will
        be recalculated using the previous balance management settings.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleClear}>Clear</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
