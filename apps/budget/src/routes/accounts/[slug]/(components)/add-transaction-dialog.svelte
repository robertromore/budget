<script lang="ts">
import {Button} from '$lib/components/ui/button';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Tabs from '$lib/components/ui/tabs';
import {Label} from '$lib/components/ui/label';
import {Textarea} from '$lib/components/ui/textarea';
import DateInput from '$lib/components/input/date-input.svelte';
import EntityInput from '$lib/components/input/entity-input.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import TransactionWizard from '$lib/components/wizard/transaction-wizard.svelte';
import {today, getLocalTimeZone} from '@internationalized/date';
import type {EditableDateItem, EditableEntityItem} from '$lib/types';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';
import CircleDollarSign from '@lucide/svelte/icons/circle-dollar-sign';
import type {Component} from 'svelte';
import {BudgetSelector} from '$lib/components/budgets';
import TransferTransactionForm from '$lib/components/forms/transfer-transaction-form.svelte';

// Currency formatter
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

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
  budgetId: number | null;
  budgetAllocation: number | null;
};

// Tab state
let activeTab = $state('manual');

// Transaction form state
let isSubmitting = $state(false);
let transactionForm = $state<TransactionFormData>({
  amount: 0,
  date: today(getLocalTimeZone()).toString(),
  notes: null,
  payeeId: null,
  categoryId: null,
  status: 'pending',
  budgetId: null,
  budgetAllocation: null,
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
let selectedBudgetId: string = $state('');

// Sync component state with form state
$effect(() => {
  transactionForm.date = dateValue.toString();
  transactionForm.amount = amount;
  transactionForm.payeeId = payee.id || null;
  transactionForm.categoryId = category.id || null;
  transactionForm.budgetId = selectedBudgetId ? Number(selectedBudgetId) : null;
  // Default allocation to full amount if budget is selected
  transactionForm.budgetAllocation = selectedBudgetId && amount ? amount : null;
});

// Reset form to defaults
function resetForm() {
  transactionForm = {
    amount: 0,
    date: today(getLocalTimeZone()).toString(),
    notes: null,
    payeeId: null,
    categoryId: null,
    status: 'pending',
    budgetId: null,
    budgetAllocation: null,
  };

  // Reset component state
  dateValue = today(getLocalTimeZone());
  amount = 0;
  payee = { id: 0, name: '' };
  category = { id: 0, name: '' };
  selectedBudgetId = '';
}

// Handle form submission
async function handleSubmit() {
  if (!account?.id || transactionForm.amount === null || transactionForm.amount === undefined) return;

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

// Handle wizard completion
async function handleWizardComplete(data: Record<string, any>) {
  const wizardFormData: TransactionFormData = {
    amount: data.amount,
    date: data.date,
    notes: data.notes || null,
    payeeId: data.payeeId || null,
    categoryId: data.categoryId || null,
    status: data.status || 'pending',
    budgetId: null,
    budgetAllocation: null,
  };

  try {
    isSubmitting = true;
    await onSubmit(wizardFormData);
    resetForm();
    open = false;
  } catch (error) {
    console.error('Transaction submission failed:', error);
  } finally {
    isSubmitting = false;
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

    <Tabs.Root bind:value={activeTab} class="w-full">
      <Tabs.List class="grid w-full grid-cols-3">
        <Tabs.Trigger value="manual">Manual</Tabs.Trigger>
        <Tabs.Trigger value="transfer">Transfer</Tabs.Trigger>
        <Tabs.Trigger value="guided">Guided</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="manual" class="mt-4">
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

      <!-- Budget -->
      <div class="space-y-2">
        <Label for="budget">Budget (Optional)</Label>
        <BudgetSelector
          bind:value={selectedBudgetId}
          placeholder="Allocate to budget..."
        />
        {#if selectedBudgetId && transactionForm.budgetAllocation}
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <CircleDollarSign class="h-3 w-3" />
            <span>
              Allocating {currencyFormatter.format(Math.abs(transactionForm.budgetAllocation))} to selected budget
            </span>
          </div>
        {/if}
      </div>

      <!-- Status - Hidden, defaults to pending -->

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
      </Tabs.Content>

      <Tabs.Content value="transfer" class="mt-4">
        <TransferTransactionForm
          fromAccountId={account?.id || 0}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </Tabs.Content>

      <Tabs.Content value="guided" class="mt-4">
        <TransactionWizard
          accountId={account?.id || 0}
          payees={payees}
          categories={categories}
          onComplete={handleWizardComplete}
        />
      </Tabs.Content>
    </Tabs.Root>

    {#snippet footer()}
      {#if activeTab === 'manual'}
        <div class="flex gap-2">
          <Button variant="outline" onclick={handleClose} disabled={isSubmitting} class="flex-1">
            Cancel
          </Button>
          <Button onclick={handleSubmit} disabled={isSubmitting || !transactionForm.amount} class="flex-1">
            {isSubmitting ? 'Adding...' : 'Add Transaction'}
          </Button>
        </div>
      {/if}
    {/snippet}
</ResponsiveSheet>
