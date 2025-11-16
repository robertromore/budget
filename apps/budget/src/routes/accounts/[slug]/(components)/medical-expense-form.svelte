<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import { Checkbox } from '$lib/components/ui/checkbox';
import { medicalExpenseTypeEnum, medicalExpenseTypeKeys } from '$lib/schema/medical-expenses';
import ReceiptUploadWidget from './receipt-upload-widget.svelte';
import * as Separator from '$lib/components/ui/separator';
import ExpenseTypeSelector from './expense-type-selector.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import DateInput from '$lib/components/input/date-input.svelte';
import { parseDate } from '@internationalized/date';
import Upload from '@lucide/svelte/icons/upload';

interface Props {
  hsaAccountId: number;
  accountId: number;
  transactionId?: number;
  existingExpense?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

let { hsaAccountId, accountId, transactionId, existingExpense, onSuccess, onCancel }: Props =
  $props();

// Form state - Medical Expense fields
let expenseType = $state(existingExpense?.expenseType || 'doctor_visit');
let otherExpenseDescription = $state(''); // For "other" expense types
let isQualified = $state(existingExpense?.isQualified ?? true);
let provider = $state(existingExpense?.provider || '');
let patientName = $state(existingExpense?.patientName || '');
let diagnosis = $state(existingExpense?.diagnosis || '');
let treatmentDescription = $state(existingExpense?.treatmentDescription || '');
let amount = $state(existingExpense?.amount || 0);
let insuranceCovered = $state(existingExpense?.insuranceCovered || 0);
let outOfPocket = $state(existingExpense?.outOfPocket || 0);

// Date handling with @internationalized/date
let serviceDate = $state(
  existingExpense?.serviceDate
    ? parseDate(existingExpense.serviceDate.split('T')[0]!)
    : parseDate(new Date().toISOString().split('T')[0]!)
);
// Note: new Date().toISOString() is fine here because we only use the date part
// and immediately parse it with parseDate, avoiding timezone issues
let paidDate = $state(
  existingExpense?.paidDate ? parseDate(existingExpense.paidDate.split('T')[0]!) : undefined
);

let taxYear = $state(existingExpense?.taxYear || new Date().getFullYear());
let notes = $state(existingExpense?.notes || '');

// Transaction fields (only for new expenses)
let transactionNotes = $state('');

let isSubmitting = $state(false);
let error = $state('');
let receiptUploadOpen = $state(false);

// Create mutations at component level
const createExpenseMutation = rpc.medicalExpenses.createMedicalExpenseWithTransaction.options();
const updateExpenseMutation = rpc.medicalExpenses.updateMedicalExpense.options();

// Auto-calculate out of pocket
$effect(() => {
  if (amount > 0 && insuranceCovered >= 0) {
    outOfPocket = amount - insuranceCovered;
  }
});

// Auto-calculate tax year from paid date
$effect(() => {
  if (paidDate) {
    const year = paidDate.year;
    if (year >= 2000 && year <= 2100) {
      taxYear = year;
    }
  } else if (serviceDate) {
    const year = serviceDate.year;
    if (year >= 2000 && year <= 2100) {
      taxYear = year;
    }
  }
});

// Expense type labels
// Use labels from schema
const expenseTypeLabels = medicalExpenseTypeEnum;

async function handleSubmit() {
  if (amount <= 0) {
    error = 'Amount must be greater than 0';
    return;
  }

  if (outOfPocket < 0) {
    error = 'Out of pocket amount cannot be negative';
    return;
  }

  // Validate "other" expense types require description
  if (
    (expenseType === 'other_qualified' || expenseType === 'non_qualified') &&
    !otherExpenseDescription.trim()
  ) {
    error = 'Please describe this expense';
    return;
  }

  isSubmitting = true;
  error = '';

  try {
    // Prepend "other" description to notes if applicable
    const finalNotes =
      expenseType === 'other_qualified' || expenseType === 'non_qualified'
        ? `${otherExpenseDescription.trim()}${notes ? `\n\n${notes}` : ''}`
        : notes;

    if (existingExpense) {
      // For updates, only include defined fields
      // Convert DateValue to ISO string (YYYY-MM-DD format)
      // Using .toString() avoids timezone conversion issues
      const serviceDateStr = serviceDate.toString();
      const paidDateStr = paidDate ? paidDate.toString() : undefined;

      const updateData: any = {
        id: existingExpense.id,
        expenseType,
        isQualified,
        amount,
        insuranceCovered,
        outOfPocket,
        serviceDate: serviceDateStr,
        taxYear,
      };
      if (provider) updateData.provider = provider;
      if (patientName) updateData.patientName = patientName;
      if (diagnosis) updateData.diagnosis = diagnosis;
      if (treatmentDescription) updateData.treatmentDescription = treatmentDescription;
      if (paidDateStr) updateData.paidDate = paidDateStr;
      if (finalNotes) updateData.notes = finalNotes;

      await updateExpenseMutation.mutateAsync(updateData);
    } else {
      // For creation, create transaction and medical expense together
      // Convert DateValue to ISO string (YYYY-MM-DD format)
      // Using .toString() avoids timezone conversion issues
      const serviceDateStr = serviceDate.toString();
      const paidDateStr = paidDate ? paidDate.toString() : undefined;

      const createData: any = {
        accountId,
        hsaAccountId,
        expenseType,
        isQualified,
        amount,
        insuranceCovered,
        outOfPocket,
        serviceDate: serviceDateStr,
        taxYear,
      };

      if (provider) createData.provider = provider;
      if (patientName) createData.patientName = patientName;
      if (diagnosis) createData.diagnosis = diagnosis;
      if (treatmentDescription) createData.treatmentDescription = treatmentDescription;
      if (paidDateStr) createData.paidDate = paidDateStr;
      if (finalNotes) createData.notes = finalNotes;
      if (transactionNotes) createData.transactionNotes = transactionNotes;

      await createExpenseMutation.mutateAsync(createData);
    }

    onSuccess?.();
  } catch (err: any) {
    error = err.message || 'Failed to save medical expense';
  } finally {
    isSubmitting = false;
  }
}
</script>

<form
  class="space-y-6"
  onsubmit={(e) => {
    e.preventDefault();
    handleSubmit();
  }}>
  <!-- Expense Type -->
  <ExpenseTypeSelector
    bind:value={expenseType}
    onValueChange={(value) => {
      expenseType = value;
    }} />

  <!-- Other Expense Description (only for "other" types) -->
  {#if expenseType === 'other_qualified' || expenseType === 'non_qualified'}
    <div class="space-y-2">
      <Label for="other-description">Describe this expense *</Label>
      <Textarea
        id="other-description"
        bind:value={otherExpenseDescription}
        placeholder="Specify what type of medical expense this is..."
        maxlength={200}
        rows={2}
        required />
      <p class="text-muted-foreground text-xs">
        Please describe the specific type of medical expense
      </p>
    </div>
  {/if}

  <!-- Qualified Expense Checkbox -->
  <div class="flex items-center space-x-2">
    <Checkbox
      id="is-qualified"
      checked={isQualified}
      onCheckedChange={(checked) => {
        isQualified = checked === true;
      }} />
    <Label for="is-qualified" class="cursor-pointer text-sm font-normal">
      IRS Qualified Medical Expense
    </Label>
  </div>

  <!-- Provider -->
  <div class="space-y-2">
    <Label for="provider">Provider / Facility</Label>
    <Input
      id="provider"
      type="text"
      bind:value={provider}
      placeholder="Dr. Smith, ABC Hospital, etc."
      maxlength={200} />
  </div>

  <!-- Patient Name -->
  <div class="space-y-2">
    <Label for="patient-name">Patient Name</Label>
    <Input
      id="patient-name"
      type="text"
      bind:value={patientName}
      placeholder="Who received care"
      maxlength={100} />
  </div>

  <!-- Financial Details -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div class="space-y-2">
      <Label for="amount">Total Amount *</Label>
      <NumericInput id="amount" bind:value={amount} buttonClass="w-full" />
    </div>

    <div class="space-y-2">
      <Label for="insurance-covered">Insurance Covered</Label>
      <NumericInput id="insurance-covered" bind:value={insuranceCovered} buttonClass="w-full" />
    </div>

    <div class="space-y-2">
      <Label for="out-of-pocket">Out of Pocket</Label>
      <Input
        id="out-of-pocket"
        type="number"
        step="0.01"
        min="0"
        bind:value={outOfPocket}
        placeholder="0.00"
        readonly
        class="bg-muted" />
      <p class="text-muted-foreground text-xs">Auto-calculated</p>
    </div>
  </div>

  <!-- Dates -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div class="space-y-2">
      <Label for="service-date">Service Date *</Label>
      <DateInput bind:value={serviceDate} buttonClass="w-full" />
    </div>

    <div class="space-y-2">
      <Label for="paid-date">Payment Date</Label>
      <DateInput bind:value={paidDate} buttonClass="w-full" />
      <p class="text-muted-foreground text-xs">Used for tax year calculation</p>
    </div>

    <div class="space-y-2">
      <Label for="tax-year">Tax Year</Label>
      <Input
        id="tax-year"
        type="number"
        min="2000"
        max="2100"
        bind:value={taxYear}
        readonly
        class="bg-muted" />
      <p class="text-muted-foreground text-xs">Auto-calculated from payment date</p>
    </div>
  </div>

  <!-- Diagnosis -->
  <div class="space-y-2">
    <Label for="diagnosis">Diagnosis / Condition</Label>
    <Input
      id="diagnosis"
      type="text"
      bind:value={diagnosis}
      placeholder="ICD code or description"
      maxlength={500} />
  </div>

  <!-- Treatment Description -->
  <div class="space-y-2">
    <Label for="treatment">Treatment / Service Description</Label>
    <Textarea
      id="treatment"
      bind:value={treatmentDescription}
      placeholder="Details about the medical service"
      maxlength={1000}
      rows={3} />
  </div>

  <!-- Notes -->
  <div class="space-y-2">
    <Label for="notes">Medical Notes</Label>
    <Textarea
      id="notes"
      bind:value={notes}
      placeholder="Medical-specific notes (diagnosis details, treatment info, etc.)"
      maxlength={1000}
      rows={2} />
  </div>

  <!-- Transaction Notes (only for new expenses) -->
  {#if !existingExpense}
    <div class="space-y-2">
      <Label for="transaction-notes">Transaction Notes</Label>
      <Textarea
        id="transaction-notes"
        bind:value={transactionNotes}
        placeholder="General transaction notes (optional)"
        maxlength={500}
        rows={2} />
      <p class="text-muted-foreground text-xs">These notes will appear in the transaction record</p>
    </div>
  {/if}

  <!-- Receipt Upload (only for existing expenses) -->
  {#if existingExpense}
    <Separator.Root class="my-6" />
    <div class="space-y-4">
      <Button variant="outline" onclick={() => (receiptUploadOpen = true)} class="w-full">
        <Upload class="mr-2 h-4 w-4" />
        Upload Receipts
      </Button>
      <ReceiptUploadWidget medicalExpenseId={existingExpense.id} bind:open={receiptUploadOpen} />
    </div>
  {/if}

  <!-- Error Message -->
  {#if error}
    <div class="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
      {error}
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex justify-end gap-2">
    {#if onCancel}
      <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
    {/if}
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? 'Saving...' : existingExpense ? 'Update Expense' : 'Create Expense'}
    </Button>
  </div>
</form>
