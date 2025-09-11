<script lang="ts">
import {Button} from '$ui/lib/components/ui/button';
import * as Dialog from '$ui/lib/components/ui/dialog';
import {Input} from '$ui/lib/components/ui/input';
import {Label} from '$ui/lib/components/ui/label';
import * as Select from '$ui/lib/components/ui/select';
import {Textarea} from '$ui/lib/components/ui/textarea';
import {today, getLocalTimeZone} from '@internationalized/date';

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

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Add New Transaction</Dialog.Title>
      <Dialog.Description>
        Create a new transaction for {account?.name || 'this account'}.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Amount -->
      <div class="space-y-2">
        <Label for="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          bind:value={transactionForm.amount} />
      </div>

      <!-- Date -->
      <div class="space-y-2">
        <Label for="date">Date</Label>
        <Input id="date" type="date" bind:value={transactionForm.date} />
      </div>

      <!-- Payee -->
      <div class="space-y-2">
        <Label for="payee">Payee</Label>
        <Select.Root
          type="single"
          value={transactionForm.payeeId?.toString() ?? undefined}
          onValueChange={(value) => {
            transactionForm.payeeId = value ? parseInt(value) : null;
          }}>
          <Select.Trigger>
            {payees.find((p) => p.id === transactionForm.payeeId)?.name ||
              'Select payee (optional)'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">No payee</Select.Item>
            {#each payees as payee}
              <Select.Item value={payee.id.toString()}>{payee.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Category -->
      <div class="space-y-2">
        <Label for="category">Category</Label>
        <Select.Root
          type="single"
          value={transactionForm.categoryId?.toString() ?? undefined}
          onValueChange={(value) => {
            transactionForm.categoryId = value ? parseInt(value) : null;
          }}>
          <Select.Trigger>
            {categories.find((c) => c.id === transactionForm.categoryId)?.name ||
              'Select category (optional)'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">No category</Select.Item>
            {#each categories as category}
              <Select.Item value={category.id.toString()}>{category.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Status -->
      <div class="space-y-2">
        <Label for="status">Status</Label>
        <Select.Root
          type="single"
          value={transactionForm.status}
          onValueChange={(value) => {
            if (value) {
              transactionForm.status = value as 'pending' | 'cleared' | 'scheduled';
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

    <Dialog.Footer>
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>Cancel</Button>
      <Button onclick={handleSubmit} disabled={isSubmitting || !transactionForm.amount}>
        {isSubmitting ? 'Adding...' : 'Add Transaction'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
