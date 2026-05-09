<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Separator } from '$lib/components/ui/separator';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { getTransactionDetail } from '$lib/query/transactions';
import type { Transaction } from '$core/schema';
import { formatCurrency } from '$lib/utils/formatters';
import { createEncryptedFieldState } from '$lib/utils/use-encryption.svelte';
import Calendar from '@lucide/svelte/icons/calendar';
import Clock from '@lucide/svelte/icons/clock';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import FileInput from '@lucide/svelte/icons/file-input';
import FileText from '@lucide/svelte/icons/file-text';
import Info from '@lucide/svelte/icons/info';
import Lock from '@lucide/svelte/icons/lock';
import Tag from '@lucide/svelte/icons/tag';
import User from '@lucide/svelte/icons/user';

function formatDate(dateStr: string | null | undefined, includeTime = false): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (includeTime) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

let {
  id,
  open = $bindable(false),
}: {
  id: number;
  open: boolean;
} = $props();

let transaction = $state<Transaction | null>(null);

const transactionQuery = $derived(
  getTransactionDetail(id).options(() => ({
    enabled: open,
  }))
);

$effect(() => {
  if (open && transactionQuery.data) {
    transaction = transactionQuery.data;
  }
});

// Encrypted field states
const notesState = createEncryptedFieldState(() => transaction?.notes, {
  operation: 'View transaction notes',
});

const payeeNameState = createEncryptedFieldState(() => transaction?.payee?.name, {
  operation: 'View payee name',
});

const needsUnlock = $derived(notesState.needsUnlock || payeeNameState.needsUnlock);

async function handleUnlockAll() {
  await notesState.unlock();
  await payeeNameState.unlock();
}

const importDetailsObj = $derived.by(() => {
  if (transaction?.importDetails) {
    try {
      return JSON.parse(transaction.importDetails);
    } catch {
      return null;
    }
  }
  return null;
});

const rawImportDataObj = $derived.by(() => {
  if (transaction?.rawImportData) {
    try {
      return JSON.parse(transaction.rawImportData);
    } catch {
      return null;
    }
  }
  return null;
});

const hasImportMetadata = $derived(
  transaction?.importedFrom ||
    transaction?.originalPayeeName ||
    transaction?.originalCategoryName ||
    transaction?.inferredCategory ||
    importDetailsObj ||
    rawImportDataObj
);
</script>

<ResponsiveSheet bind:open side="right">
  {#snippet header()}
    <div class="flex items-center justify-between">
      <span class="text-lg font-semibold">Transaction Details</span>
      {#if needsUnlock}
        <Button variant="outline" size="sm" onclick={handleUnlockAll}>
          <Lock class="mr-2 h-4 w-4" />
          Unlock Encrypted Data
        </Button>
      {/if}
    </div>
    <p class="text-muted-foreground text-sm">
      View complete transaction information including import history and audit trail
    </p>
  {/snippet}

  {#snippet content()}
    {#if transactionQuery.isPending && !transaction}
      <div class="text-muted-foreground flex items-center justify-center py-12 text-sm">
        Loading...
      </div>
    {:else if transaction}
      <div class="space-y-6">
        <!-- Basic Information -->
        <div class="space-y-4">
          <h3 class="text-muted-foreground text-sm font-semibold uppercase">Basic Information</h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex min-w-0 items-start gap-2">
              <Calendar class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-muted-foreground text-xs">Date</div>
                <div class="text-sm font-medium">{formatDate(transaction.date)}</div>
              </div>
            </div>

            <div class="flex min-w-0 items-start gap-2">
              <DollarSign class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-muted-foreground text-xs">Amount</div>
                <div
                  class="text-sm font-medium"
                  class:text-amount-negative={transaction.amount < 0}
                  class:text-amount-positive={transaction.amount > 0}>
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            </div>

            <div class="flex min-w-0 items-start gap-2">
              <User class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-muted-foreground text-xs">Payee</div>
                <div class="text-sm font-medium break-all">
                  {#if payeeNameState.isEncrypted}
                    {#if payeeNameState.isLoading}
                      <span class="text-muted-foreground">Decrypting...</span>
                    {:else if payeeNameState.needsUnlock}
                      <span class="text-muted-foreground flex items-center gap-1">
                        <Lock class="h-3 w-3" />
                        Encrypted
                      </span>
                    {:else}
                      {payeeNameState.value || 'None'}
                    {/if}
                  {:else}
                    {transaction.payee?.name || 'None'}
                  {/if}
                </div>
              </div>
            </div>

            <div class="flex min-w-0 items-start gap-2">
              <Tag class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-muted-foreground text-xs">Category</div>
                <div class="text-sm font-medium break-all">
                  {transaction.category?.name || 'Uncategorized'}
                </div>
              </div>
            </div>
          </div>

          {#if transaction.notes}
            <div class="flex min-w-0 items-start gap-2">
              <FileText class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-muted-foreground text-xs">Notes</div>
                <div class="text-sm wrap-break-word">
                  {#if notesState.isEncrypted}
                    {#if notesState.isLoading}
                      <span class="text-muted-foreground">Decrypting...</span>
                    {:else if notesState.needsUnlock}
                      <span class="text-muted-foreground flex items-center gap-1">
                        <Lock class="h-3 w-3" />
                        Encrypted - click unlock to view
                      </span>
                    {:else}
                      {notesState.value}
                    {/if}
                  {:else}
                    {transaction.notes}
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <div class="flex items-center gap-2">
            <div class="text-muted-foreground text-xs">Status</div>
            <Badge variant={transaction.status === 'cleared' ? 'default' : 'secondary'}>
              {transaction.status}
            </Badge>
          </div>
        </div>

        {#if hasImportMetadata}
          <Separator />

          <!-- Import Information -->
          <div class="space-y-3">
            <h3
              class="text-muted-foreground flex items-center gap-2 text-sm font-semibold uppercase">
              <FileInput class="h-4 w-4" />
              Import Information
            </h3>

            {#if transaction.importedFrom}
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="min-w-0">
                  <div class="text-muted-foreground text-xs">Source File</div>
                  <div class="font-mono text-xs font-medium break-all">
                    {transaction.importedFrom}
                  </div>
                </div>

                {#if transaction.importedAt}
                  <div class="min-w-0">
                    <div class="text-muted-foreground text-xs">Imported At</div>
                    <div class="text-sm">{formatDate(transaction.importedAt, true)}</div>
                  </div>
                {/if}
              </div>
            {/if}

            {#if transaction.originalPayeeName}
              <div class="space-y-2">
                <div class="text-muted-foreground text-xs">Original Payee Name</div>
                <div class="bg-muted rounded-md p-2 font-mono text-xs break-all">
                  {transaction.originalPayeeName}
                </div>
                <div class="text-muted-foreground text-xs">
                  Normalized to: <span class="font-medium break-all"
                    >{transaction.payee?.name}</span>
                </div>
              </div>
            {/if}

            {#if rawImportDataObj}
              <div class="mt-4 space-y-4">
                <div class="text-muted-foreground text-xs font-semibold">Raw Import Data</div>
                {#if rawImportDataObj.originalFileData}
                  <div class="space-y-2">
                    <div class="text-xs font-medium">Original File Data</div>
                    <div class="bg-muted max-h-48 overflow-y-auto rounded-md p-3">
                      <div class="space-y-2">
                        {#each Object.entries(rawImportDataObj.originalFileData) as [key, value]}
                          <div class="flex flex-col gap-1 text-xs sm:flex-row">
                            <span class="text-muted-foreground min-w-[120px] font-medium"
                              >{key}:</span>
                            <span class="font-mono break-all">
                              {typeof value === 'object' ? JSON.stringify(value) : value}
                            </span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                {:else}
                  <div class="bg-muted max-h-48 overflow-y-auto rounded-md p-3">
                    <div class="space-y-2">
                      {#each Object.entries(rawImportDataObj) as [key, value]}
                        <div class="flex flex-col gap-1 text-xs">
                          <span class="text-muted-foreground font-medium">{key}:</span>
                          <span class="font-mono break-all">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <Separator />

        <!-- Audit Trail -->
        <div class="space-y-3">
          <h3 class="text-muted-foreground flex items-center gap-2 text-sm font-semibold uppercase">
            <Clock class="h-4 w-4 shrink-0" />
            Audit Trail
          </h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="min-w-0">
              <div class="text-muted-foreground text-xs">Created</div>
              <div class="text-sm wrap-break-word">{formatDate(transaction.createdAt, true)}</div>
            </div>

            <div class="min-w-0">
              <div class="text-muted-foreground text-xs">Last Modified</div>
              <div class="text-sm wrap-break-word">{formatDate(transaction.updatedAt, true)}</div>
            </div>
          </div>
        </div>

        {#if transaction.isTransfer}
          <Separator />

          <div class="space-y-3">
            <h3
              class="text-muted-foreground flex items-center gap-2 text-sm font-semibold uppercase">
              <Info class="h-4 w-4" />
              Transfer Information
            </h3>
            <div class="text-sm">
              This is a transfer transaction
              {#if transaction.transferAccountId}
                linked to another account
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="text-muted-foreground py-8 text-center">No transaction selected</div>
    {/if}
  {/snippet}
</ResponsiveSheet>
