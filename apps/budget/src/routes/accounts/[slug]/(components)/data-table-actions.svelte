<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { archiveTransaction, unarchiveTransaction, getTransactionDetail } from '$lib/query/transactions';
import type { Transaction } from '$lib/schema';
import type { TransactionsFormat } from '$lib/types';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Archive from '@lucide/svelte/icons/archive';
import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
import Info from '@lucide/svelte/icons/info';
import Unlink from '@lucide/svelte/icons/unlink';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Trash2 from '@lucide/svelte/icons/trash-2';
import DeleteTransactionDialog from '../(dialogs)/delete-transaction-dialog.svelte';
import TransactionDetailsDialog from '../(dialogs)/transaction-details-dialog.svelte';
import ConvertToTransferDialog from '../(dialogs)/convert-to-transfer-dialog.svelte';
import UnlinkTransferDialog from '../(dialogs)/unlink-transfer-dialog.svelte';

let {
  id,
  transaction,
}: {
  id: number;
  transaction: TransactionsFormat;
} = $props();

let deleteOpen = $state(false);
let detailsOpen = $state(false);
let convertToTransferOpen = $state(false);
let unlinkTransferOpen = $state(false);
let selectedTransaction = $state<Transaction | null>(null);

// Check if this is a transfer
const isTransfer = $derived(transaction.isTransfer === true);

// Check if this is archived
const isArchived = $derived(transaction.isArchived === true);

async function handleToggleArchive() {
	if (isArchived) {
		await unarchiveTransaction.execute({ id });
	} else {
		await archiveTransaction.execute({ id });
	}
}

// Fetch transaction details when opening the details dialog
const transactionQuery = $derived(
  getTransactionDetail(id).options(() => ({
    enabled: detailsOpen,
  }))
);

$effect(() => {
  if (detailsOpen && transactionQuery.data) {
    selectedTransaction = transactionQuery.data;
  }
});
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button variant="ghost" size="icon" class="relative size-8 p-0" {...props}>
        <span class="sr-only">Open menu</span>
        <MoreHorizontal class="size-4" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Item onSelect={() => (detailsOpen = true)}>
        <Info class="mr-2 h-4 w-4" />
        View Details
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      {#if isTransfer}
        <DropdownMenu.Item onSelect={() => (unlinkTransferOpen = true)}>
          <Unlink class="mr-2 h-4 w-4" />
          Unlink Transfer
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item onSelect={() => (convertToTransferOpen = true)}>
          <ArrowRightLeft class="mr-2 h-4 w-4" />
          Convert to Transfer
        </DropdownMenu.Item>
      {/if}
      <DropdownMenu.Item onSelect={handleToggleArchive}>
        {#if isArchived}
          <ArchiveRestore class="mr-2 h-4 w-4" />
          Restore from Archive
        {:else}
          <Archive class="mr-2 h-4 w-4" />
          Archive
        {/if}
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      <DropdownMenu.Item
        onSelect={() => (deleteOpen = true)}
        class="text-destructive focus:text-destructive">
        <Trash2 class="mr-2 h-4 w-4" />
        Delete
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>

{#if deleteOpen}
  <DeleteTransactionDialog
    transactions={[id]}
    bind:dialogOpen={deleteOpen}
    {isTransfer}
    transferId={transaction.transferId}
    transferAccountName={transaction.transferAccountName} />
{/if}

{#if detailsOpen}
  <TransactionDetailsDialog bind:transaction={selectedTransaction} bind:dialogOpen={detailsOpen} />
{/if}

{#if convertToTransferOpen}
  <ConvertToTransferDialog {transaction} bind:dialogOpen={convertToTransferOpen} />
{/if}

{#if unlinkTransferOpen}
  <UnlinkTransferDialog {transaction} bind:dialogOpen={unlinkTransferOpen} />
{/if}
