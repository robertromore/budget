<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import { Label } from '$lib/components/ui/label';
import { Input } from '$lib/components/ui/input';
import { Textarea } from '$lib/components/ui/textarea';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Badge } from '$lib/components/ui/badge';
import ExpenseTypeSelector from './expense-type-selector.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import DateInput from '$lib/components/input/date-input.svelte';
import { parseDate, type DateValue } from '@internationalized/date';
import { medicalExpenseTypeEnum } from '$lib/schema/medical-expenses';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import Check from '@lucide/svelte/icons/check';
import { cn } from '$lib/utils';
import { untrack } from 'svelte';

interface Props {
  hsaAccountId: number;
  accountId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

let { hsaAccountId, accountId, onSuccess, onCancel }: Props = $props();

// Wizard state
let currentStep = $state(1);
const totalSteps = 4;

// Form state
let expenseType = $state('doctor_visit');
let otherExpenseDescription = $state('');
let isQualified = $state(true);
let amount = $state(0);
let insuranceCovered = $state(0);
let outOfPocket = $state(0);
let provider = $state('');
let patientName = $state('');
let serviceDate = $state(parseDate(new Date().toISOString().split('T')[0]));
let paidDate = $state<DateValue | undefined>(undefined);
let taxYear = $state(new Date().getFullYear());
let diagnosis = $state('');
let treatmentDescription = $state('');
let notes = $state('');
let transactionNotes = $state('');

let isSubmitting = $state(false);
let error = $state('');
let fieldErrors = $state<{
  expenseType?: string;
  otherExpenseDescription?: string;
  amount?: string;
  outOfPocket?: string;
}>({});

// Create mutation at component level (not inside async handler)
const createExpenseMutation = rpc.medicalExpenses.createMedicalExpenseWithTransaction.options();

// Auto-calculate out of pocket
$effect(() => {
  if (amount > 0 && insuranceCovered >= 0) {
    outOfPocket = amount - insuranceCovered;
  }
});

// Auto-calculate tax year
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

// Clear field errors when values change
$effect(() => {
  if (expenseType) {
    untrack(() => clearFieldError('expenseType'));
  }
});

$effect(() => {
  if (otherExpenseDescription) {
    untrack(() => clearFieldError('otherExpenseDescription'));
  }
});

$effect(() => {
  if (amount > 0) {
    untrack(() => clearFieldError('amount'));
  }
});

$effect(() => {
  if (outOfPocket >= 0) {
    untrack(() => clearFieldError('outOfPocket'));
  }
});

// Step validation
function canProceedFromStep(step: number): boolean {
  error = '';
  fieldErrors = {};

  switch (step) {
    case 1:
      // Expense type must be selected
      if (!expenseType) {
        fieldErrors.expenseType = 'Please select an expense type';
        return false;
      }
      // "Other" types require description
      if ((expenseType === 'other_qualified' || expenseType === 'non_qualified') && !otherExpenseDescription.trim()) {
        fieldErrors.otherExpenseDescription = 'Please describe this expense';
        return false;
      }
      return true;

    case 2:
      // Basic details validation
      if (amount <= 0) {
        fieldErrors.amount = 'Amount must be greater than 0';
        return false;
      }
      if (outOfPocket < 0) {
        fieldErrors.outOfPocket = 'Out of pocket amount cannot be negative';
        return false;
      }
      return true;

    case 3:
      // Additional info is optional, always can proceed
      return true;

    default:
      return true;
  }
}

// Clear field error when field is edited
function clearFieldError(field: string) {
  const { [field]: _, ...rest } = fieldErrors;
  fieldErrors = rest;
}

function nextStep() {
  if (!canProceedFromStep(currentStep)) return;

  if (currentStep < totalSteps) {
    currentStep++;
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    error = '';
  }
}

async function handleSubmit() {
  if (!canProceedFromStep(currentStep)) return;

  isSubmitting = true;
  error = '';

  try {
    const finalNotes = (expenseType === 'other_qualified' || expenseType === 'non_qualified')
      ? `${otherExpenseDescription.trim()}${notes ? `\n\n${notes}` : ''}`
      : notes;

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

    console.log('Submitting expense data:', createData);
    await createExpenseMutation.mutateAsync(createData);
    onSuccess?.();
  } catch (err: any) {
    console.error('Failed to create expense:', err);
    error = err.message || 'Failed to save medical expense';
  } finally {
    isSubmitting = false;
  }
}

const stepLabels = ['Type', 'Details', 'Info', 'Review'];
</script>

<div class="space-y-6">
  <!-- Stepper -->
  <div class="flex items-center justify-between">
    {#each Array(totalSteps) as _, index}
      {@const stepNum = index + 1}
      {@const isActive = stepNum === currentStep}
      {@const isCompleted = stepNum < currentStep}

      <div class="flex items-center flex-1">
        <!-- Step Circle -->
        <button
          onclick={() => {
            if (stepNum < currentStep) {
              currentStep = stepNum;
              error = '';
            }
          }}
          class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
            {isCompleted ? 'bg-primary border-primary text-primary-foreground' :
             isActive ? 'border-primary text-primary' :
             'border-muted text-muted-foreground'}"
          disabled={stepNum > currentStep}
        >
          {#if isCompleted}
            <Check class="h-5 w-5" />
          {:else}
            {stepNum}
          {/if}
        </button>

        <!-- Step Label -->
        <span class="ml-2 text-sm font-medium {isActive ? 'text-primary' : 'text-muted-foreground'}">
          {stepLabels[index]}
        </span>

        <!-- Connector Line -->
        {#if index < totalSteps - 1}
          <div class="flex-1 h-0.5 mx-4 {stepNum < currentStep ? 'bg-primary' : 'bg-muted'}"></div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
      {error}
    </div>
  {/if}

  <!-- Step Content -->
  <div class="min-h-[400px]">
    {#if currentStep === 1}
      <!-- Step 1: Expense Type -->
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold mb-2">What type of medical expense is this?</h2>
          <p class="text-muted-foreground">Select the category that best describes your expense</p>
        </div>

        <div class="space-y-2">
          <ExpenseTypeSelector
            bind:value={expenseType}
            onValueChange={(value) => {
              expenseType = value;
              clearFieldError('expenseType');
            }}
            buttonClass={fieldErrors.expenseType ? 'border-destructive' : ''}
          />
          {#if fieldErrors.expenseType}
            <p class="text-sm text-destructive">{fieldErrors.expenseType}</p>
          {/if}
        </div>

        {#if expenseType === 'other_qualified' || expenseType === 'non_qualified'}
          <div class="space-y-2">
            <Label for="other-description">Describe this expense *</Label>
            <Textarea
              id="other-description"
              bind:value={otherExpenseDescription}
              oninput={() => clearFieldError('otherExpenseDescription')}
              placeholder="Specify what type of medical expense this is..."
              maxlength={200}
              rows={3}
              class={fieldErrors.otherExpenseDescription ? 'border-destructive' : ''}
            />
            {#if fieldErrors.otherExpenseDescription}
              <p class="text-sm text-destructive">{fieldErrors.otherExpenseDescription}</p>
            {/if}
          </div>
        {/if}

        <div class="flex items-center space-x-2">
          <Checkbox
            id="is-qualified"
            checked={isQualified}
            onCheckedChange={(checked) => { isQualified = checked === true; }}
          />
          <Label for="is-qualified" class="text-sm font-normal cursor-pointer">
            IRS Qualified Medical Expense
          </Label>
        </div>
      </div>

    {:else if currentStep === 2}
      <!-- Step 2: Basic Details -->
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold mb-2">Enter the expense details</h2>
          <p class="text-muted-foreground">Who provided the service and when?</p>
        </div>

        <div class="space-y-2">
          <Label for="provider">Provider / Facility</Label>
          <Input
            id="provider"
            type="text"
            bind:value={provider}
            placeholder="Dr. Smith, ABC Hospital, pharmacy, etc."
            maxlength={200}
          />
        </div>

        <div class="space-y-2">
          <Label for="patient-name">Patient Name</Label>
          <Input
            id="patient-name"
            type="text"
            bind:value={patientName}
            placeholder="Who received care"
            maxlength={100}
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label for="amount">Total Amount *</Label>
            <NumericInput
              id="amount"
              bind:value={amount}
              buttonClass={cn("w-full", fieldErrors.amount && 'border-destructive')}
            />
            {#if fieldErrors.amount}
              <p class="text-sm text-destructive">{fieldErrors.amount}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="insurance-covered">Insurance Covered</Label>
            <NumericInput
              id="insurance-covered"
              bind:value={insuranceCovered}
              buttonClass="w-full"
            />
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
              class={cn("bg-muted", fieldErrors.outOfPocket && 'border-destructive')}
            />
            <p class="text-xs text-muted-foreground">Auto-calculated</p>
            {#if fieldErrors.outOfPocket}
              <p class="text-sm text-destructive">{fieldErrors.outOfPocket}</p>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="service-date">Service Date *</Label>
            <DateInput
              bind:value={serviceDate}
              buttonClass="w-full"
            />
          </div>

          <div class="space-y-2">
            <Label for="paid-date">Payment Date</Label>
            <DateInput
              bind:value={paidDate}
              buttonClass="w-full"
            />
            <p class="text-xs text-muted-foreground">Optional - used for tax year</p>
          </div>
        </div>
      </div>

    {:else if currentStep === 3}
      <!-- Step 3: Additional Info -->
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold mb-2">Additional information (optional)</h2>
          <p class="text-muted-foreground">Add any relevant medical details for your records</p>
        </div>

        <div class="space-y-2">
          <Label for="diagnosis">Diagnosis / Condition</Label>
          <Input
            id="diagnosis"
            type="text"
            bind:value={diagnosis}
            placeholder="ICD code or description"
            maxlength={500}
          />
        </div>

        <div class="space-y-2">
          <Label for="treatment">Treatment / Service Description</Label>
          <Textarea
            id="treatment"
            bind:value={treatmentDescription}
            placeholder="Details about the medical service"
            maxlength={1000}
            rows={3}
          />
        </div>

        <div class="space-y-2">
          <Label for="notes">Medical Notes</Label>
          <Textarea
            id="notes"
            bind:value={notes}
            placeholder="Additional notes for your records"
            maxlength={1000}
            rows={3}
          />
        </div>

        <div class="space-y-2">
          <Label for="transaction-notes">Transaction Notes</Label>
          <Textarea
            id="transaction-notes"
            bind:value={transactionNotes}
            placeholder="Notes for the transaction record"
            maxlength={500}
            rows={2}
          />
        </div>
      </div>

    {:else if currentStep === 4}
      <!-- Step 4: Review -->
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold mb-2">Review your expense</h2>
          <p class="text-muted-foreground">Please verify all details before submitting</p>
        </div>

        <div class="space-y-4 bg-muted p-6 rounded-lg">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">Expense Type</p>
              <p class="font-medium">{medicalExpenseTypeEnum[expenseType]}</p>
              {#if expenseType === 'other_qualified' || expenseType === 'non_qualified'}
                <p class="text-sm italic">{otherExpenseDescription}</p>
              {/if}
            </div>

            <div>
              <p class="text-sm text-muted-foreground">Qualified?</p>
              <Badge variant={isQualified ? 'default' : 'secondary'}>
                {isQualified ? 'Yes' : 'No'}
              </Badge>
            </div>

            {#if provider}
              <div>
                <p class="text-sm text-muted-foreground">Provider</p>
                <p class="font-medium">{provider}</p>
              </div>
            {/if}

            {#if patientName}
              <div>
                <p class="text-sm text-muted-foreground">Patient</p>
                <p class="font-medium">{patientName}</p>
              </div>
            {/if}

            <div>
              <p class="text-sm text-muted-foreground">Total Amount</p>
              <p class="font-medium text-lg">${amount.toFixed(2)}</p>
            </div>

            <div>
              <p class="text-sm text-muted-foreground">Out of Pocket</p>
              <p class="font-medium text-lg text-primary">${outOfPocket.toFixed(2)}</p>
            </div>

            <div>
              <p class="text-sm text-muted-foreground">Service Date</p>
              <p class="font-medium">{serviceDate.toString()}</p>
            </div>

            <div>
              <p class="text-sm text-muted-foreground">Tax Year</p>
              <p class="font-medium">{taxYear}</p>
            </div>
          </div>

          {#if diagnosis || treatmentDescription || notes}
            <div class="border-t pt-4 mt-4">
              {#if diagnosis}
                <div class="mb-2">
                  <p class="text-sm text-muted-foreground">Diagnosis</p>
                  <p class="text-sm">{diagnosis}</p>
                </div>
              {/if}
              {#if treatmentDescription}
                <div class="mb-2">
                  <p class="text-sm text-muted-foreground">Treatment</p>
                  <p class="text-sm">{treatmentDescription}</p>
                </div>
              {/if}
              {#if notes}
                <div>
                  <p class="text-sm text-muted-foreground">Notes</p>
                  <p class="text-sm">{notes}</p>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Navigation Buttons -->
  <div class="flex justify-between pt-6 border-t">
    <div>
      {#if currentStep > 1}
        <Button type="button" variant="outline" onclick={prevStep}>
          <ChevronLeft class="mr-2 h-4 w-4" />
          Back
        </Button>
      {:else}
        <Button type="button" variant="ghost" onclick={onCancel}>
          Cancel
        </Button>
      {/if}
    </div>

    <div class="flex gap-2">
      {#if currentStep < totalSteps}
        <Button type="button" onclick={nextStep}>
          Next
          <ChevronRight class="ml-2 h-4 w-4" />
        </Button>
      {:else}
        <Button type="button" onclick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Expense'}
        </Button>
      {/if}
    </div>
  </div>
</div>
