<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import * as Dialog from '$lib/components/ui/dialog';
import { Separator } from '$lib/components/ui/separator';
import type { Transaction } from '$lib/schema';
import { formatCurrency } from '$lib/utils/formatters';
import Calendar from '@lucide/svelte/icons/calendar';
import Clock from '@lucide/svelte/icons/clock';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import FileInput from '@lucide/svelte/icons/file-input';
import FileText from '@lucide/svelte/icons/file-text';
import Info from '@lucide/svelte/icons/info';
import Tag from '@lucide/svelte/icons/tag';
import User from '@lucide/svelte/icons/user';

// Helper to format date strings
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
  transaction = $bindable(),
  dialogOpen = $bindable(),
}: {
  transaction?: Transaction | null;
  dialogOpen: boolean;
} = $props();

// Parse import details if available
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

// Parse raw import data if available
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

// Check if transaction has import metadata
const hasImportMetadata = $derived(
  transaction?.importedFrom ||
    transaction?.originalPayeeName ||
    transaction?.originalCategoryName ||
    transaction?.inferredCategory ||
    importDetailsObj ||
    rawImportDataObj
);
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Transaction Details</Dialog.Title>
      <Dialog.Description>
        View complete transaction information including import history and audit trail
      </Dialog.Description>
    </Dialog.Header>

    {#if transaction}
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
                  class:text-red-600={transaction.amount < 0}
                  class:text-green-600={transaction.amount > 0}>
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            </div>

            <div class="flex min-w-0 items-start gap-2">
              <User class="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-muted-foreground text-xs">Payee</div>
                <div class="text-sm font-medium break-all">{transaction.payee?.name || 'None'}</div>
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
                <div class="text-sm wrap-break-word">{transaction.notes}</div>
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

            {#if transaction.originalCategoryName}
              <div>
                <div class="text-muted-foreground text-xs">Original Category</div>
                <div class="text-sm">{transaction.originalCategoryName}</div>
              </div>
            {/if}

            {#if transaction.inferredCategory}
              <div>
                <div class="text-muted-foreground text-xs">Inferred Category</div>
                <div class="text-sm">{transaction.inferredCategory}</div>
                {#if transaction.category?.name !== transaction.inferredCategory}
                  <div class="text-muted-foreground mt-1 text-xs">
                    Category was manually changed
                  </div>
                {/if}
              </div>
            {/if}

            {#if importDetailsObj}
              <div class="space-y-2">
                <div class="text-muted-foreground text-xs">Additional Details</div>
                <div class="bg-muted space-y-2 rounded-md p-3">
                  {#if importDetailsObj.fitid}
                    <div class="flex flex-col gap-1 text-xs">
                      <span class="text-muted-foreground">Transaction ID:</span>
                      <span class="font-mono break-all">{importDetailsObj.fitid}</span>
                    </div>
                  {/if}
                  {#if importDetailsObj.extractedDetails}
                    <div class="flex flex-col gap-1 text-xs">
                      <span class="text-muted-foreground">Extracted Info:</span>
                      <span class="break-all">{importDetailsObj.extractedDetails}</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            {#if rawImportDataObj}
              <div class="mt-4 space-y-4">
                <div class="text-muted-foreground text-xs font-semibold">Raw Import Data</div>

                <!-- Check if new structured format -->
                {#if rawImportDataObj.originalFileData}
                  <!-- Original File Data -->
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

                  <!-- Normalized Before Import -->
                  {#if rawImportDataObj.normalizedBeforeImport}
                    <div class="space-y-2">
                      <div class="text-xs font-medium">Normalized (Before Import Adjustments)</div>
                      <div class="bg-muted max-h-48 overflow-y-auto rounded-md p-3">
                        <div class="space-y-2">
                          {#each Object.entries(rawImportDataObj.normalizedBeforeImport) as [key, value]}
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
                  {/if}

                  <!-- Import Adjustments Applied -->
                  {#if rawImportDataObj.importAdjustments}
                    <div class="space-y-2">
                      <div class="text-xs font-medium">Import Adjustments Applied</div>
                      <div class="bg-muted rounded-md p-3">
                        <div class="space-y-2">
                          {#each Object.entries(rawImportDataObj.importAdjustments) as [key, value]}
                            <div class="flex items-center gap-2 text-xs">
                              <span class="text-muted-foreground min-w-[180px] font-medium"
                                >{key}:</span>
                              <span
                                class="ml-auto {value
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-muted-foreground'}">
                                {value ? 'Yes' : 'No'}
                              </span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    </div>
                  {/if}
                {:else}
                  <!-- Legacy format - just display all data -->
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

        {#if transaction.budgetAllocations && transaction.budgetAllocations.length > 0}
          <Separator />

          <!-- Budget Allocations -->
          <div class="space-y-3">
            <h3 class="text-muted-foreground text-sm font-semibold uppercase">
              Budget Allocations
            </h3>

            <div class="space-y-2">
              {#each transaction.budgetAllocations as allocation}
                <div class="bg-muted flex items-center justify-between rounded-md p-2">
                  <div class="flex-1">
                    <div class="text-sm font-medium">{allocation.budgetName}</div>
                    <div class="text-muted-foreground text-xs">
                      {allocation.autoAssigned ? 'Auto-assigned' : 'Manually assigned'}
                    </div>
                  </div>
                  <div class="text-sm font-medium">
                    {formatCurrency(allocation.allocatedAmount)}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if transaction.isTransfer}
          <Separator />

          <!-- Transfer Information -->
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
  </Dialog.Content>
</Dialog.Root>
