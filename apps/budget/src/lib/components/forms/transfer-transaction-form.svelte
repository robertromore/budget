<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { DateInput, NumericInput } from '$lib/components/input';
import { Textarea } from '$lib/components/ui/textarea';
import * as Select from '$lib/components/ui/select';
import type { DateValue } from '@internationalized/date';
import { toISOString, currentDate } from '$lib/utils/dates';
import { createTransfer } from '$lib/query/transactions';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';

interface Props {
  fromAccountId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

let { fromAccountId, onSuccess, onCancel }: Props = $props();

// State
let dateValue: DateValue = $state(currentDate);
let amount: number = $state(0);
let toAccountIdString: string = $state('');
let notes: string = $state('');
let isSubmitting: boolean = $state(false);
let error: string = $state('');

// Get accounts for selection (excluding the source account)
const accountsState = $derived(AccountsState.get());
const accounts = $derived(accountsState.sorted);
const targetAccounts = $derived(accounts.filter((a) => a.id !== fromAccountId));

// Convert string to number for finding selected account
const toAccountId = $derived(toAccountIdString ? parseInt(toAccountIdString, 10) : 0);
const selectedAccount = $derived(targetAccounts.find((a) => a.id === toAccountId));

// Get mutation
const transferMutation = createTransfer.options();

// Handle form submission
async function handleSubmit() {
  if (isSubmitting) return;

  // Validation
  if (amount <= 0) {
    error = 'Amount must be greater than zero';
    return;
  }

  if (!toAccountId) {
    error = 'Please select a destination account';
    return;
  }

  isSubmitting = true;
  error = '';

  try {
    const baseData = {
      fromAccountId,
      toAccountId,
      amount,
      date: toISOString(dateValue),
    };

    const transferData = notes.trim() ? { ...baseData, notes: notes.trim() } : baseData;

    await transferMutation.mutateAsync(transferData);

    if (onSuccess) onSuccess();
  } catch (err: any) {
    error = err.message || 'Failed to create transfer';
  } finally {
    isSubmitting = false;
  }
}
</script>

<div class="space-y-4">
  <div class="flex items-center gap-2 border-b pb-2">
    <ArrowRightLeft class="h-5 w-5 text-blue-600"></ArrowRightLeft>
    <h3 class="text-lg font-semibold">Transfer Money</h3>
  </div>

  {#if error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {error}
    </div>
  {/if}

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
    class="space-y-4">
    <!-- Date -->
    <div class="space-y-2">
      <label for="date" class="text-sm font-medium">Date</label>
      <DateInput bind:value={dateValue} />
    </div>

    <!-- Amount -->
    <div class="space-y-2">
      <label for="amount" class="text-sm font-medium">Amount</label>
      <NumericInput bind:value={amount} buttonClass="w-full" />
    </div>

    <!-- To Account -->
    <div class="space-y-2">
      <label for="toAccount" class="text-sm font-medium">To Account</label>
      <Select.Root type="single" bind:value={toAccountIdString}>
        <Select.Trigger class="w-full">
          {selectedAccount?.name ?? 'Select destination account'}
        </Select.Trigger>
        <Select.Content>
          {#each targetAccounts as account (account.id)}
            <Select.Item value={account.id.toString()}>
              <div class="flex items-center gap-2">
                <span>{account.name}</span>
                <span class="text-muted-foreground text-xs capitalize">
                  ({account.accountType?.replace('_', ' ')})
                </span>
              </div>
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Notes -->
    <div class="space-y-2">
      <label for="notes" class="text-sm font-medium">Notes (Optional)</label>
      <Textarea bind:value={notes} placeholder="Add transfer notes..." />
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-2">
      <Button type="submit" disabled={isSubmitting || amount <= 0 || !toAccountId} class="flex-1">
        {isSubmitting ? 'Creating Transfer...' : 'Create Transfer'}
      </Button>
      {#if onCancel}
        <Button type="button" variant="outline" onclick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      {/if}
    </div>
  </form>
</div>
