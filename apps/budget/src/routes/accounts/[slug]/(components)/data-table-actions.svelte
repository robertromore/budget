<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { Button } from '$lib/components/ui/button';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Info from '@lucide/svelte/icons/info';
import Trash2 from '@lucide/svelte/icons/trash-2';
import DeleteTransactionDialog from '../(dialogs)/delete-transaction-dialog.svelte';
import TransactionDetailsDialog from '../(dialogs)/transaction-details-dialog.svelte';
import { getTransactionDetail } from '$lib/query/transactions';
import type { Transaction } from '$lib/schema';

let {
  id,
}: {
  id: number;
} = $props();

let deleteOpen = $state(false);
let detailsOpen = $state(false);
let selectedTransaction = $state<Transaction | null>(null);

// Fetch transaction details when opening the details dialog
const transactionQuery = $derived(
  getTransactionDetail(id).options({
    enabled: detailsOpen,
  })
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
  <DeleteTransactionDialog transactions={[id]} bind:dialogOpen={deleteOpen} />
{/if}

{#if detailsOpen}
  <TransactionDetailsDialog bind:transaction={selectedTransaction} bind:dialogOpen={detailsOpen} />
{/if}
