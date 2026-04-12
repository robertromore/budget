<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { Textarea } from '$lib/components/ui/textarea';
import { archiveTransaction, unarchiveTransaction } from '$lib/query/transactions';
import { rpc } from '$lib/query';
import type { TransactionsFormat } from '$lib/types';
import { unsplitTransaction } from '$lib/query/transactions';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Archive from '@lucide/svelte/icons/archive';
import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
import Info from '@lucide/svelte/icons/info';
import Merge from '@lucide/svelte/icons/merge';
import Scissors from '@lucide/svelte/icons/scissors';
import StickyNote from '@lucide/svelte/icons/sticky-note';
import Unlink from '@lucide/svelte/icons/unlink';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Trash2 from '@lucide/svelte/icons/trash-2';
import DeleteTransactionDialog from '../(dialogs)/delete-transaction-dialog.svelte';
import SplitTransactionDialog from '../(dialogs)/split-transaction-dialog.svelte';
import TransactionDetailSheet from './transaction-detail-sheet.svelte';
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
let notesOpen = $state(false);
let notesValue = $state('');
let splitOpen = $state(false);

// Check if this is a transfer
const isTransfer = $derived(transaction.isTransfer === true);

// Check if this is archived
const isArchived = $derived(transaction.isArchived === true);

// Check if this is a split parent
const isSplit = $derived(transaction.isSplit === true);

// Check if this is a child transaction
const isChild = $derived(transaction.parentId !== null && transaction.parentId !== undefined);

// Can this transaction be split?
const canSplit = $derived(!isTransfer && !isChild && !isSplit && transaction.status !== 'scheduled');

const unsplitMutation = unsplitTransaction.options();

const updateMutation = rpc.transactions.updateTransaction.options();

async function handleSaveNotes() {
  await updateMutation.mutateAsync({ id, data: { notes: notesValue || null } });
  notesOpen = false;
}

async function handleToggleArchive() {
  if (isArchived) {
    await unarchiveTransaction.execute({ id });
  } else {
    await archiveTransaction.execute({ id });
  }
}
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
      <DropdownMenu.Item
        onSelect={() => {
          notesValue = transaction.notes ?? '';
          notesOpen = true;
        }}>
        <StickyNote class="mr-2 h-4 w-4" />
        {transaction.notes ? 'Edit Note' : 'Add Note'}
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      {#if canSplit}
        <DropdownMenu.Item onSelect={() => (splitOpen = true)}>
          <Scissors class="mr-2 h-4 w-4" />
          Split Transaction
        </DropdownMenu.Item>
      {/if}
      {#if isSplit}
        <DropdownMenu.Item
          onSelect={() => unsplitMutation.mutateAsync({ parentId: id, accountId: transaction.accountId })}>
          <Merge class="mr-2 h-4 w-4" />
          Unsplit
        </DropdownMenu.Item>
      {/if}
      {#if isTransfer}
        <DropdownMenu.Item onSelect={() => (unlinkTransferOpen = true)}>
          <Unlink class="mr-2 h-4 w-4" />
          Unlink Transfer
        </DropdownMenu.Item>
      {:else if !isChild}
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
  <TransactionDetailSheet {id} bind:open={detailsOpen} />
{/if}

{#if convertToTransferOpen}
  <ConvertToTransferDialog {transaction} bind:dialogOpen={convertToTransferOpen} />
{/if}

{#if unlinkTransferOpen}
  <UnlinkTransferDialog {transaction} bind:dialogOpen={unlinkTransferOpen} />
{/if}

<AlertDialog.Root bind:open={notesOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{transaction.notes ? 'Edit Note' : 'Add Note'}</AlertDialog.Title>
    </AlertDialog.Header>
    <Textarea
      bind:value={notesValue}
      placeholder="Add a note..."
      rows={3}
      class="resize-none" />
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleSaveNotes}>Save</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

{#if splitOpen}
  <SplitTransactionDialog {transaction} bind:open={splitOpen} />
{/if}
