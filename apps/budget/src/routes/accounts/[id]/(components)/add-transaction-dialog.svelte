<script lang="ts">
import {Button} from '$lib/components/ui/button';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import {Label} from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import {Textarea} from '$lib/components/ui/textarea';
import DateInput from '$lib/components/input/date-input.svelte';
import EntityInput from '$lib/components/input/entity-input.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import {today, getLocalTimeZone} from '@internationalized/date';
import type {EditableDateItem, EditableEntityItem} from '$lib/types';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';
import type {Component} from 'svelte';

let {
  open = $bindable(false),
  account,
  payees = [],
  categories = [],
  onSubmit,
}: {
  open: boolean;
  account?: {id: number; name: string} | null;
  payees?: Array<{id: number; name: string}>;
  categories?: Array<{id: number; name: string}>;
  onSubmit: (formData: TransactionFormData) => Promise<void>;
} = $props();

type TransactionFormData = {
  amount: number;
  date: string;
  notes: string | null;
  payeeId: number | null;
  categoryId: number | null;
  status: 'pending' | 'cleared' | 'scheduled' | null;
};

// Transaction form state
let isSubmitting = $state(false);
let transactionForm = $state<TransactionFormData>({
  amount: 0,
  date: today(getLocalTimeZone()).toString(),
  notes: null,
  payeeId: null,
  categoryId: null,
  status: 'cleared',
});

// Input component state
let dateValue: EditableDateItem = $state(today(getLocalTimeZone()));
let amount: number = $state<number>(0);
let payee: EditableEntityItem = $state({
  id: 0,
  name: '',
});
let category: EditableEntityItem = $state({
  id: 0,
  name: '',
});

// Sync component state with form state
$effect(() => {
  transactionForm.date = dateValue.toString();
  transactionForm.amount = amount;
  transactionForm.payeeId = payee.id || null;
  transactionForm.categoryId = category.id || null;
});

// Reset form to defaults
function resetForm() {
  transactionForm = {
    amount: 0,
    date: today(getLocalTimeZone()).toString(),
    notes: null,
    payeeId: null,
    categoryId: null,
    status: 'cleared',
  };
  
  // Reset component state
  dateValue = today(getLocalTimeZone());
  amount = 0;
  payee = { id: 0, name: '' };
  category = { id: 0, name: '' };
}

// Handle form submission
async function handleSubmit() {
  if (!account?.id || !transactionForm.amount) return;

  try {
    isSubmitting = true;
    await onSubmit(transactionForm);

    // Reset form and close dialog on success
    resetForm();
    open = false;
  } catch (error) {
    // Error handling is done by parent component
    console.error('Transaction submission failed:', error);
  } finally {
    isSubmitting = false;
  }
}

// Handle dialog close
function handleClose() {
  if (!isSubmitting) {
    open = false;
    resetForm();
  }
}
</script>

<ResponsiveSheet bind:open>
    {#snippet header()}
      <div>
        <h2 class="text-lg font-semibold">Add New Transaction</h2>
        <p class="text-sm text-muted-foreground">
          Create a new transaction for {account?.name || 'this account'}.
        </p>
      </div>
    {/snippet}

    <div class="space-y-4">
      <!-- Amount -->
      <div class="space-y-2">
        <Label for="amount">Amount</Label>
        <NumericInput bind:value={amount} buttonClass="w-full" />
      </div>

      <!-- Date -->
      <div class="space-y-2">
        <Label for="date">Date</Label>
        <DateInput bind:value={dateValue} />
      </div>

      <!-- Payee -->
      <div class="space-y-2">
        <Label for="payee">Payee</Label>
        <EntityInput
          entityLabel="payees"
          entities={payees as EditableEntityItem[]}
          bind:value={payee}
          icon={HandCoins as unknown as Component}
          buttonClass="w-full" />
      </div>

      <!-- Category -->
      <div class="space-y-2">
        <Label for="category">Category</Label>
        <EntityInput
          entityLabel="categories"
          entities={categories as EditableEntityItem[]}
          bind:value={category}
          icon={SquareMousePointer as unknown as Component}
          buttonClass="w-full" />
      </div>

      <!-- Status -->
      <div class="space-y-2">
        <Label for="status">Status</Label>
        <Select.Root
          selected={{value: transactionForm.status || 'cleared', label: transactionForm.status || 'cleared'}}
          onSelectedChange={(selected) => {
            if (selected?.value) {
              transactionForm.status = selected.value as 'pending' | 'cleared' | 'scheduled';
            }
          }}>
          <Select.Trigger>
            {transactionForm.status || 'Select status'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="pending">Pending</Select.Item>
            <Select.Item value="cleared">Cleared</Select.Item>
            <Select.Item value="scheduled">Scheduled</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Notes -->
      <div class="space-y-2">
        <Label for="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Transaction notes (optional)"
          bind:value={transactionForm.notes}
          rows={3} />
      </div>
    </div>

    {#snippet footer()}
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>Cancel</Button>
      <Button onclick={handleSubmit} disabled={isSubmitting || !transactionForm.amount}>
        {isSubmitting ? 'Adding...' : 'Add Transaction'}
      </Button>
    {/snippet}
</ResponsiveSheet>
