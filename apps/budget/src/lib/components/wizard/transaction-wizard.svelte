<script lang="ts">
import DateInput from '$lib/components/input/date-input.svelte';
import IntelligentEntityInput from '$lib/components/input/intelligent-entity-input.svelte';
import IntelligentNumericInput from '$lib/components/input/intelligent-numeric-input.svelte';
import { Badge } from '$lib/components/ui/badge';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { Textarea } from '$lib/components/ui/textarea';
import { usePayeeIntelligence } from '$lib/hooks/use-payee-intelligence.svelte';
import type { Transaction } from '$lib/schema';
import type { Payee } from '$lib/schema/payees';
import {
  transactionWizardStore,
  type WizardStep as WizardStepType,
} from '$lib/stores/wizardStore.svelte';
import type { EditableEntityItem } from '$lib/types';
import { createTransformAccessors } from '$lib/utils/bind-helpers';
import { currentDate } from '$lib/utils/dates';
import { formatCurrency } from '$lib/utils/formatters';
import { createTransactionValidationEngine } from '$lib/utils/wizard-validation';
import type { DateValue } from '@internationalized/date';
import {
  Calendar,
  HandCoins,
  Info
} from '@lucide/svelte/icons';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';
import type { Component } from 'svelte';
import WizardStep from './wizard-step.svelte';

interface Props {
  accountId: number;
  initialData?: Partial<Transaction>;
  payees?: EditableEntityItem[];
  categories?: EditableEntityItem[];
  onComplete?: (data: Record<string, any>) => Promise<void>;
}

let { accountId, initialData = {}, payees = [], categories = [], onComplete }: Props = $props();

// Initialize wizard steps
const steps: WizardStepType[] = [
  {
    id: 'date-amount',
    title: 'Date & Amount',
    description: 'When did this transaction occur and for how much?',
  },
  {
    id: 'payee-category',
    title: 'Payee & Category',
    description: 'Who was involved and what category does this belong to?',
  },
  {
    id: 'notes-status',
    title: 'Notes & Status',
    description: 'Add any additional details (optional)',
    isOptional: true,
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review your transaction details before saving',
  },
];

const formData = $derived(transactionWizardStore.formData);

// Form state
let dateValue: DateValue = $state(currentDate);
let amount = $state<number>(0);
let payee = $state<EditableEntityItem>({
  id: 0,
  name: '',
});
let category = $state<EditableEntityItem>({
  id: 0,
  name: '',
});
let notes = $state<string>('');
let status = $state<'cleared' | 'pending' | 'scheduled'>('pending');
const statusAccessors = createTransformAccessors(
  () => status,
  (value: 'cleared' | 'pending' | 'scheduled') => {
    status = value;
  }
);

// Payee intelligence integration
const { generateBasicSuggestions } = usePayeeIntelligence();

// Get selected payee data for intelligence
const selectedPayee = $derived.by(() => {
  if (!payee.id || payee.id === 0) return null;
  return (payees as Payee[]).find((p) => p.id === payee.id) || null;
});

// Intelligence suggestions based on selected payee
const intelligenceSuggestions = $derived.by(() => {
  const currentPayee = selectedPayee;
  if (!currentPayee) return null;

  // Generate basic suggestions from payee data
  return generateBasicSuggestions(currentPayee);
});

// Category suggestion for EntityInput
const categorySuggestion = $derived.by(() => {
  const suggestions = intelligenceSuggestions;
  if (!suggestions?.category?.id) return undefined;

  // Find the category entity by id
  const suggestedCategory = categories.find((c) => c.id === suggestions.category?.id);
  if (!suggestedCategory) return undefined;

  return {
    type: 'auto' as const,
    reason: 'Based on payee default category',
    confidence: suggestions.category.confidence,
    suggestedValue: suggestedCategory,
    onApply: () => {
      category = suggestedCategory;
    },
  };
});

// Amount suggestion for NumericInput
const amountSuggestion = $derived.by(() => {
  const suggestions = intelligenceSuggestions;
  if (!suggestions?.amount?.value) return undefined;

  return {
    type: 'smart' as const,
    reason: 'Based on average transaction amount',
    confidence: suggestions.amount.confidence,
    suggestedAmount: suggestions.amount.value,
    onApply: () => {
      if (suggestions.amount?.value) {
        amount = suggestions.amount.value;
      }
    },
  };
});

// Auto-apply suggestions when payee changes
$effect(() => {
  const suggestions = intelligenceSuggestions;
  if (suggestions && payee.id > 0) {
    const shouldApplyCategory = !category.id || category.id === 0;
    const shouldApplyAmount = !amount || amount === 0;

    if (shouldApplyCategory && suggestions.category?.id) {
      const suggestedCategory = categories.find((c) => c.id === suggestions.category?.id);
      if (suggestedCategory) {
        category = suggestedCategory;
      }
    }

    if (shouldApplyAmount && suggestions.amount?.value) {
      amount = suggestions.amount.value;
    }
  }
});

// Set up validation engine
const validationEngine = createTransactionValidationEngine();

// Override the wizard store's validation method
transactionWizardStore.validateStep = (stepId: string, formData: Record<string, any>) => {
  const result = validationEngine.validateStep(stepId, formData);
  transactionWizardStore.setStepValidation(stepId, result.isValid, result.errors);
  return result.isValid;
};

// Initialize the wizard once
let initialized = $state(false);
$effect(() => {
  if (!initialized) {
    const initData = {
      ...initialData,
      accountId,
      date: dateValue.toString(),
      amount,
      payeeId: payee.id,
      categoryId: category.id,
      notes,
      status,
    };
    transactionWizardStore.initialize(steps, initData);
    initialized = true;
  }
});

// Update formData when state changes (without triggering validation on every keystroke)
$effect(() => {
  if (initialized) {
    // Update formData directly without triggering validation
    // Validation will happen when user tries to navigate to next step
    Object.assign(transactionWizardStore.formData, {
      accountId,
      date: dateValue.toString(),
      amount,
      payeeId: payee.id,
      categoryId: category.id,
      notes,
      status,
    });
  }
});

// Status options
const statusOptions = [
  { value: 'pending', label: 'Pending', description: 'Transaction is pending' },
  { value: 'cleared', label: 'Cleared', description: 'Transaction has cleared' },
];

// Review data formatting
const reviewData = $derived.by(() => {
  const selectedPayeeName =
    payees.find((p) => p.id === formData['payeeId'])?.name || 'Not selected';
  const selectedCategoryName =
    categories.find((c) => c.id === formData['categoryId'])?.name || 'Not selected';
  const statusLabel = statusOptions.find((s) => s.value === formData['status'])?.label || 'Pending';

  return {
    date: formData['date'] || 'Not set',
    amount: formData['amount'] || 0,
    payee: selectedPayeeName,
    category: selectedCategoryName,
    status: statusLabel,
    notes: formData['notes'] || 'No notes added',
  };
});

// Handle completion
async function handleComplete() {
  if (onComplete) {
    transactionWizardStore.startCompleting();
    try {
      await onComplete(formData);
      transactionWizardStore.reset();
    } catch (error) {
      console.error('Failed to complete transaction:', error);
    } finally {
      transactionWizardStore.stopCompleting();
    }
  }
}
</script>

<!-- Step 1: Date & Amount -->
<WizardStep
  wizardStore={transactionWizardStore}
  stepId="date-amount"
  title="Date & Amount"
  description="When did this transaction occur and for how much?">
  <div class="space-y-6">
    <!-- Date Input -->
    <div class="space-y-2">
      <Label for="transaction-date" class="text-sm font-medium">Transaction Date *</Label>
      <DateInput bind:value={dateValue} />
      <p class="text-muted-foreground text-xs">Select the date when this transaction occurred.</p>
    </div>

    <!-- Amount Input -->
    <div class="space-y-2">
      <Label for="amount" class="text-sm font-medium">Amount *</Label>
      <IntelligentNumericInput
        bind:value={amount}
        buttonClass="w-full"
        {...amountSuggestion && { suggestion: amountSuggestion }} />
      <p class="text-muted-foreground text-xs">
        Enter a negative amount for expenses, positive for income.
      </p>
    </div>
  </div>
</WizardStep>

<!-- Step 2: Payee & Category -->
<WizardStep
  wizardStore={transactionWizardStore}
  stepId="payee-category"
  title="Payee & Category"
  description="Who was involved and what category does this belong to?">
  <div class="space-y-6">
    <!-- Payee Selection -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Payee</Label>
      <IntelligentEntityInput
        entityLabel="payees"
        entities={payees}
        bind:value={payee}
        icon={HandCoins as unknown as Component}
        buttonClass="w-full" />
      <p class="text-muted-foreground text-xs">
        Select the person or organization involved in this transaction.
      </p>
    </div>

    <!-- Category Selection -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Category</Label>
      <IntelligentEntityInput
        entityLabel="categories"
        entities={categories}
        bind:value={category}
        icon={SquareMousePointer as unknown as Component}
        buttonClass="w-full"
        {...categorySuggestion && { suggestion: categorySuggestion }} />
      <p class="text-muted-foreground text-xs">
        Choose the category that best describes this transaction.
      </p>
    </div>
  </div>
</WizardStep>

<!-- Step 3: Notes & Status (Optional) -->
<WizardStep
  wizardStore={transactionWizardStore}
  stepId="notes-status"
  title="Notes & Status"
  description="Add any additional details (optional)">
  <div class="space-y-6">
    <!-- Status Selection -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Transaction Status</Label>
      <Select.Root type="single" bind:value={statusAccessors.get, statusAccessors.set}>
        <Select.Trigger>
          {statusOptions.find((s) => s.value === status)?.label || 'Select status'}
        </Select.Trigger>
        <Select.Content>
          {#each statusOptions as statusOption}
            <Select.Item value={statusOption.value}>
              <div class="flex flex-col">
                <span>{statusOption.label}</span>
                <span class="text-muted-foreground text-xs">{statusOption.description}</span>
              </div>
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Notes -->
    <div class="space-y-2">
      <Label for="notes" class="text-sm font-medium">Notes</Label>
      <Textarea
        id="notes"
        bind:value={notes}
        placeholder="Add any notes about this transaction..."
        rows={4} />
      <p class="text-muted-foreground text-xs">
        Optional notes to help you remember details about this transaction.
      </p>
    </div>
  </div>
</WizardStep>

<!-- Step 4: Review -->
<WizardStep
  wizardStore={transactionWizardStore}
  stepId="review"
  title="Review Transaction"
  description="Review your transaction details before saving"
  onNext={handleComplete}>
  <div class="space-y-6">
    <!-- Transaction Summary -->
    <div class="bg-card space-y-4 rounded-lg border p-6">
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm font-medium">Amount</p>
          <p class="text-2xl font-bold">
            {formatCurrency(Math.abs(reviewData.amount))}
            {#if reviewData.amount < 0}
              <Badge variant="destructive" class="ml-2">Expense</Badge>
            {:else}
              <Badge variant="default" class="ml-2">Income</Badge>
            {/if}
          </p>
        </div>
        <Calendar class="text-muted-foreground h-8 w-8" />
      </div>

      <div class="grid grid-cols-2 gap-4 border-t pt-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-xs font-medium">Date</p>
          <p class="text-sm">{reviewData.date}</p>
        </div>
        <div class="space-y-1">
          <p class="text-muted-foreground text-xs font-medium">Status</p>
          <p class="text-sm">{reviewData.status}</p>
        </div>
        <div class="space-y-1">
          <p class="text-muted-foreground text-xs font-medium">Payee</p>
          <p class="text-sm">{reviewData.payee}</p>
        </div>
        <div class="space-y-1">
          <p class="text-muted-foreground text-xs font-medium">Category</p>
          <p class="text-sm">{reviewData.category}</p>
        </div>
      </div>

      {#if reviewData.notes && reviewData.notes !== 'No notes added'}
        <div class="space-y-1 border-t pt-4">
          <p class="text-muted-foreground text-xs font-medium">Notes</p>
          <p class="text-sm">{reviewData.notes}</p>
        </div>
      {/if}
    </div>

    <!-- Help Text -->
    <div class="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
      <Info class="text-muted-foreground mt-0.5 h-5 w-5" />
      <div class="space-y-1">
        <p class="text-sm font-medium">Ready to save?</p>
        <p class="text-muted-foreground text-xs">
          Click "Complete" to save this transaction. You can edit it later if needed.
        </p>
      </div>
    </div>
  </div>
</WizardStep>
