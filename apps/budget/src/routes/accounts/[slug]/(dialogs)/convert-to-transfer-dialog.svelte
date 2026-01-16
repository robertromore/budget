<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import { Button } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import AccountSelector from '$lib/components/input/account-selector.svelte';
import { rpc } from '$lib/query';
import { AccountsState } from '$lib/states/entities';
import type { TransactionsFormat } from '$lib/types';
import type { EditableEntityItem } from '$lib/types';
import { formatCurrency } from '$lib/utils/formatters';
import { toast } from '$lib/utils/toast-interceptor';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Users from '@lucide/svelte/icons/users';

interface Props {
  transaction: TransactionsFormat;
  dialogOpen: boolean;
}

let { transaction, dialogOpen = $bindable() }: Props = $props();

// Get accounts state
const accountsState = AccountsState.get();

// Filter out the current account from selection
const availableAccounts = $derived(
  accountsState?.all
    .filter((a) => a.id !== transaction.accountId && !a.closed)
    .map((a) => ({
      id: a.id,
      name: a.name,
      accountIcon: a.accountIcon,
      accountColor: a.accountColor,
      accountType: a.accountType,
      institution: a.institution,
    })) ?? []
);

let selectedAccount = $state<{ id: number; name: string } | undefined>(undefined);
let isSubmitting = $state(false);
let rememberMapping = $state(false);
let convertSimilar = $state(false);

// Get the payee string to use for mapping (prefer original import string, fall back to payee name)
const payeeStringForMapping = $derived(
  transaction.originalPayeeName || transaction.payee?.name || null
);

// Determine transfer direction based on amount
const isOutgoing = $derived(transaction.amount < 0);
const absAmount = $derived(Math.abs(transaction.amount));

// Get transaction ID (handles string IDs from scheduled transactions)
const transactionId = typeof transaction.id === 'number'
  ? transaction.id
  : parseInt(transaction.id as string);

// Query for similar payee transactions - the .options() method creates and returns the query store
const similarQuery = rpc.transactions.findSimilarPayeeTransactions(transactionId).options();

const similarCount = $derived(similarQuery.data?.count ?? 0);
const similarTransactions = $derived(similarQuery.data?.similarTransactions ?? []);

// Mutations
const convertMutation = rpc.transactions.convertToTransfer.options();
const convertBulkMutation = rpc.transactions.convertToTransferBulk.options();

async function handleSubmit() {
  if (!selectedAccount) {
    toast.error('Please select a destination account');
    return;
  }

  isSubmitting = true;

  try {
    if (convertSimilar && similarCount > 0) {
      // Bulk convert including similar transactions
      const allTransactionIds = [
        transactionId,
        ...similarTransactions.map((t) => t.id),
      ];

      const result = await convertBulkMutation.mutateAsync({
        transactionIds: allTransactionIds,
        targetAccountId: selectedAccount.id,
        rememberMapping: rememberMapping && !!payeeStringForMapping,
        rawPayeeString: payeeStringForMapping ?? undefined,
      });

      const convertedCount = result.converted;
      const errorCount = result.errors.length;

      if (errorCount > 0) {
        toast.warning(`Converted ${convertedCount} transactions, ${errorCount} failed`);
      } else {
        const mappingNote = rememberMapping && payeeStringForMapping ? ' (mapping saved)' : '';
        toast.success(`Converted ${convertedCount} transactions to transfers${mappingNote}`);
      }
    } else {
      // Single transaction conversion
      await convertMutation.mutateAsync({
        transactionId,
        targetAccountId: selectedAccount.id,
        rememberMapping: rememberMapping && !!payeeStringForMapping,
        rawPayeeString: payeeStringForMapping ?? undefined,
      });

      const successMessage = rememberMapping && payeeStringForMapping
        ? 'Transaction converted to transfer (mapping saved)'
        : 'Transaction converted to transfer';
      toast.success(successMessage);
    }

    dialogOpen = false;
    selectedAccount = undefined;
    rememberMapping = false;
    convertSimilar = false;
  } catch (error) {
    console.error('Failed to convert to transfer:', error);
    toast.error('Failed to convert transaction to transfer');
  } finally {
    isSubmitting = false;
  }
}

function handleAccountSelect(account?: EditableEntityItem & { accountIcon?: string | null }) {
  selectedAccount = account ? { id: account.id, name: account.name ?? '' } : undefined;
}
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Convert to Transfer</Dialog.Title>
      <Dialog.Description>
        Convert this transaction into a transfer between two accounts.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Transaction summary -->
      <div class="bg-muted/50 rounded-lg p-3">
        <div class="text-sm font-medium">Transaction Details</div>
        <div class="mt-2 flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Amount</span>
          <span class={isOutgoing ? 'text-red-600' : 'text-green-600'}>
            {formatCurrency(transaction.amount)}
          </span>
        </div>
        {#if transaction.notes}
          <div class="mt-1 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Notes</span>
            <span class="truncate max-w-[200px]">{transaction.notes}</span>
          </div>
        {/if}
      </div>

      <!-- Transfer visualization -->
      <div class="flex items-center justify-center gap-3 py-2">
        <div class="text-center">
          <div class="text-muted-foreground text-xs">
            {isOutgoing ? 'From' : 'To'}
          </div>
          <div class="font-medium text-sm">Current Account</div>
        </div>
        {#if isOutgoing}
          <ArrowRight class="h-5 w-5 text-blue-500" />
        {:else}
          <ArrowLeft class="h-5 w-5 text-blue-500" />
        {/if}
        <div class="text-center">
          <div class="text-muted-foreground text-xs">
            {isOutgoing ? 'To' : 'From'}
          </div>
          <div class="font-medium text-sm">
            {selectedAccount?.name || 'Select account'}
          </div>
        </div>
      </div>

      <!-- Account selector -->
      <div class="space-y-2">
        <Label>
          {isOutgoing ? 'Transfer to' : 'Transfer from'}
        </Label>
        <AccountSelector
          entityLabel="account"
          entities={availableAccounts}
          value={selectedAccount}
          handleSubmit={handleAccountSelect}
          buttonClass="w-full" />
      </div>

      <!-- Similar transactions checkbox -->
      {#if similarCount > 0}
        <div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div class="flex items-start gap-3">
            <Checkbox
              id="convert-similar"
              bind:checked={convertSimilar}
              class="mt-0.5" />
            <div class="space-y-1">
              <Label for="convert-similar" class="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Users class="h-4 w-4 text-blue-600" />
                Also convert {similarCount} similar transaction{similarCount > 1 ? 's' : ''}
              </Label>
              <p class="text-muted-foreground text-xs">
                Found other transactions with the same payee that can be converted to transfers.
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Remember mapping checkbox -->
      {#if payeeStringForMapping}
        <div class="flex items-start gap-3">
          <Checkbox
            id="remember-mapping"
            bind:checked={rememberMapping}
            class="mt-0.5" />
          <div class="space-y-1">
            <Label for="remember-mapping" class="text-sm font-normal cursor-pointer">
              Remember for future imports
            </Label>
            <p class="text-muted-foreground text-xs">
              When importing transactions with "{payeeStringForMapping.length > 40
                ? payeeStringForMapping.slice(0, 40) + '...'
                : payeeStringForMapping}", automatically suggest this transfer.
            </p>
          </div>
        </div>
      {/if}

      <p class="text-muted-foreground text-xs">
        This will create a matching transaction in the selected account and link them as a transfer pair.
      </p>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
      <Button onclick={handleSubmit} disabled={!selectedAccount || isSubmitting}>
        {#if isSubmitting}
          Converting...
        {:else if convertSimilar && similarCount > 0}
          Convert {similarCount + 1} Transactions
        {:else}
          Convert to Transfer
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
