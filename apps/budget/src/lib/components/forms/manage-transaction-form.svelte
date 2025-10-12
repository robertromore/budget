<script lang="ts">
import * as Form from '$lib/components/ui/form';
import {type Transaction} from '$lib/schema';
import {superformInsertTransactionSchema} from '$lib/schema/superforms';
import {today, getLocalTimeZone} from '@internationalized/date';
import type {EditableDateItem, EditableEntityItem} from '$lib/types';
import type {Payee} from '$lib/schema/payees';
import {Textarea} from '$lib/components/ui/textarea';
import DateInput from '$lib/components/input/date-input.svelte';
import IntelligentEntityInput from '$lib/components/input/intelligent-entity-input.svelte';
import IntelligentNumericInput from '$lib/components/input/intelligent-numeric-input.svelte';
import {page} from '$app/state';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import type {Component} from 'svelte';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';
import {useEntityForm} from '$lib/hooks/forms/use-entity-form';
import {usePayeeIntelligence} from '$lib/hooks/use-payee-intelligence.svelte';
import { Switch } from '$lib/components/ui/switch';
import { Label } from '$lib/components/ui/label';
import Settings from '@lucide/svelte/icons/settings';
import { getApplicableBudgets, validateTransactionStrict } from '$lib/query/budgets';
import * as Select from '$lib/components/ui/select';
import * as Alert from '$lib/components/ui/alert';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import { Button } from '$lib/components/ui/button';
import Plus from '@lucide/svelte/icons/plus';
import X from '@lucide/svelte/icons/x';
import { formatCurrency } from '$lib/utils';
import BudgetImpactPreview from '$lib/components/budgets/budget-impact-preview.svelte';

let {
  accountId,
  onSave,
}: {
  accountId: number;
  onDelete?: (id: number) => void;
  onSave?: (new_entity: Transaction) => void;
} = $props();

const {
  data: {payees, categories, manageTransactionForm},
} = page;

const form = useEntityForm({
  formData: manageTransactionForm,
  schema: superformInsertTransactionSchema,
  formId: 'transaction-form',
  ...(onSave && { onSave }),
});

const {form: formData, enhance} = form;

// Initialize account ID
$effect(() => {
  if ($formData) {
    $formData.accountId = accountId;
  }
});

// Form state with Svelte 5 runes
let dateValue: EditableDateItem = $state(today(getLocalTimeZone()));
let amount = $state<number>(0);
let payee = $state<EditableEntityItem>({
  id: 0,
  name: '',
});
let category = $state<EditableEntityItem>({
  id: 0,
  name: '',
});

// Payee intelligence integration
const { getPayeeSuggestionsFor, generateBasicSuggestions } = usePayeeIntelligence();

// Get selected payee data for intelligence
const selectedPayee = $derived.by(() => {
  if (!payee.id || payee.id === 0) return null;
  return (payees as Payee[]).find(p => p.id === payee.id) || null;
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

  const suggestedCategory = (categories as EditableEntityItem[]).find(c => c.id === suggestions.category?.id);
  if (!suggestedCategory) return undefined;

  return {
    type: 'intelligent' as const,
    reason: 'Based on your transaction history',
    confidence: suggestions.category.confidence ?? 0.8,
    suggestedValue: suggestedCategory,
    onApply: () => {
      if (suggestedCategory) {
        category = suggestedCategory;
      }
    }
  };
});

// Amount suggestion for NumericInput
const amountSuggestion = $derived.by(() => {
  const suggestions = intelligenceSuggestions;
  if (!suggestions?.amount?.value) return undefined;

  return {
    type: 'smart' as const,
    reason: 'Based on your transaction history',
    confidence: suggestions.amount.confidence ?? 0.6,
    suggestedAmount: suggestions.amount.value,
    onApply: () => {
      if (suggestions.amount?.value) {
        amount = suggestions.amount.value;
      }
    }
  };
});

// Auto-apply suggestions when payee changes (configurable behavior)
let autoApplySuggestions = $state<boolean>(true);

$effect(() => {
  // When payee changes and we have suggestions, optionally auto-apply them
  const suggestions = intelligenceSuggestions;
  if (autoApplySuggestions && suggestions && payee.id > 0) {
    // Only auto-apply if current values are empty/default
    const shouldApplyCategory = !category.id || category.id === 0;
    const shouldApplyAmount = !amount || amount === 0;

    if (shouldApplyCategory && suggestions.category?.id) {
      const suggestedCategory = (categories as EditableEntityItem[]).find(c => c.id === suggestions.category?.id);
      if (suggestedCategory) {
        category = suggestedCategory;
      }
    }

    if (shouldApplyAmount && suggestions.amount?.value) {
      amount = suggestions.amount.value;
    }
  }
});

// Budget allocation state
interface BudgetAllocation {
  budgetId: number;
  amount: number;
}

let autoAssignBudgets = $state<boolean>(true);
let budgetAllocations = $state<BudgetAllocation[]>([]);

// Get applicable budgets based on account and category
const applicableBudgetsQuery = $derived.by(() => {
  const accId = accountId;
  const catId = category.id > 0 ? category.id : undefined;

  if (!accId && !catId) return null;

  return getApplicableBudgets(accId, catId).options();
});

const applicableBudgets = $derived.by(() => {
  const query = applicableBudgetsQuery;
  if (!query) return [];

  return query.data ?? [];
});

// Calculate total allocated and remaining amounts
const totalAllocated = $derived.by(() => {
  return budgetAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
});

const remainingAmount = $derived.by(() => {
  return amount - totalAllocated;
});

const isOverAllocated = $derived.by(() => {
  return Math.abs(totalAllocated) > Math.abs(amount) && amount !== 0;
});

// Strict budget validation
const strictValidationQuery = $derived.by(() => {
  const accId = accountId;
  const catId = category.id > 0 ? category.id : undefined;

  if (!accId && !catId) return null;
  if (amount === 0) return null;

  return validateTransactionStrict(amount, accId, catId).options();
});

const strictValidation = $derived.by(() => {
  const query = strictValidationQuery;
  if (!query) return null;

  return query.data ?? null;
});

const hasStrictViolations = $derived.by(() => {
  const validation = strictValidation;
  return validation && !validation.allowed && validation.violations.length > 0;
});

// Auto-assign budgets when applicable budgets or amount changes
$effect(() => {
  if (autoAssignBudgets && applicableBudgets.length > 0 && amount !== 0) {
    // Simple auto-assignment: allocate full amount to first applicable budget
    if (budgetAllocations.length === 0 || budgetAllocations[0]?.budgetId !== applicableBudgets[0]?.id) {
      budgetAllocations = [{
        budgetId: applicableBudgets[0]!.id,
        amount: amount,
      }];
    } else {
      // Update amount for existing allocation
      budgetAllocations[0]!.amount = amount;
    }
  }
});

// Helper functions for budget allocation UI
function addAllocation() {
  if (applicableBudgets.length > 0) {
    budgetAllocations = [
      ...budgetAllocations,
      { budgetId: applicableBudgets[0]!.id, amount: remainingAmount },
    ];
  }
}

function removeAllocation(index: number) {
  budgetAllocations = budgetAllocations.filter((_, i) => i !== index);
}

function updateAllocationAmount(index: number, newAmount: number) {
  budgetAllocations[index]!.amount = newAmount;
}

function updateAllocationBudget(index: number, budgetId: number) {
  budgetAllocations[index]!.budgetId = budgetId;
}

function getBudgetName(budgetId: number): string {
  return applicableBudgets.find((b: {id: number, name: string}) => b.id === budgetId)?.name ?? 'Select budget';
}

// Sync form data
$effect(() => {
  if ($formData) {
    $formData.date = dateValue.toString();
    $formData.amount = amount;
    $formData.payeeId = payee.id;
    $formData.categoryId = category.id;

    // Add budget allocations as metadata for server processing
    // Note: This will need server-side handling in the form action
    ($formData as any).budgetAllocations = budgetAllocations;
    ($formData as any).autoAssignBudgets = autoAssignBudgets;
  }
});
</script>

<div class="space-y-4">
  <!-- Intelligence Settings -->
  {#if intelligenceSuggestions}
    <div class="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-lg transition-all duration-300">
      <div class="flex items-center gap-3">
        <Settings class="h-4 w-4 text-muted-foreground" />
        <div>
          <Label for="auto-apply" class="text-sm font-medium">Auto-apply suggestions</Label>
          <p class="text-xs text-muted-foreground">Automatically fill in suggested values when selecting a payee</p>
        </div>
      </div>
      <Switch
        id="auto-apply"
        checked={autoApplySuggestions}
        onCheckedChange={(checked) => autoApplySuggestions = checked ?? true}
        class="data-[state=checked]:bg-primary"
      />
    </div>
  {/if}

  <!-- Transaction Form -->
  <form method="post" action="/accounts?/add-transaction" use:enhance class="grid grid-cols-2 gap-4">
  <input hidden value={$formData?.accountId || accountId} name="accountId" />
  <Form.Field {form} name="date">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Date</Form.Label>
        <DateInput {...props} bind:value={dateValue} />
        <Form.FieldErrors />
        <input hidden value={$formData?.date || dateValue.toString()} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="amount">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Amount</Form.Label>
        <IntelligentNumericInput
          {...props}
          bind:value={amount}
          buttonClass="w-full"
          {...(amountSuggestion && { suggestion: amountSuggestion })} />
        <Form.FieldErrors />
        <input hidden value={$formData?.amount || amount} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="payeeId">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Payee</Form.Label>
        <IntelligentEntityInput
          {...props}
          entityLabel="payees"
          entities={payees as EditableEntityItem[]}
          bind:value={payee}
          icon={HandCoins as unknown as Component}
          buttonClass="w-full" />
        <Form.FieldErrors />
        <input hidden value={$formData?.payeeId || payee.id} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="categoryId">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Category</Form.Label>
        <IntelligentEntityInput
          {...props}
          entityLabel="categories"
          entities={categories as EditableEntityItem[]}
          bind:value={category}
          icon={SquareMousePointer as unknown as Component}
          buttonClass="w-full"
          {...(categorySuggestion && { suggestion: categorySuggestion })} />
        <Form.FieldErrors />
        <input hidden value={$formData?.categoryId || category.id} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Budget Allocation Section -->
  {#if applicableBudgets.length > 0}
    <div class="col-span-full space-y-3 p-4 border border-border rounded-lg bg-muted/30">
      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium">Budget Allocation</Label>
        <div class="flex items-center gap-2">
          <Switch
            id="auto-assign-budgets"
            checked={autoAssignBudgets}
            onCheckedChange={(checked) => autoAssignBudgets = checked ?? true}
            class="data-[state=checked]:bg-primary"
          />
          <Label for="auto-assign-budgets" class="text-sm text-muted-foreground cursor-pointer">
            Auto-assign
          </Label>
        </div>
      </div>

      {#if !autoAssignBudgets}
        <!-- Manual allocation interface -->
        <div class="space-y-2">
          {#each budgetAllocations as allocation, index (index)}
            <div class="flex gap-2 items-start">
              <Select.Root
                type="single"
                value={allocation.budgetId.toString()}
                onValueChange={(value) => value && updateAllocationBudget(index, parseInt(value))}
              >
                <Select.Trigger class="flex-1">
                  <span>{getBudgetName(allocation.budgetId)}</span>
                </Select.Trigger>
                <Select.Content>
                  {#each applicableBudgets as budget}
                    <Select.Item value={budget.id.toString()}>
                      {budget.name}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>

              <input
                type="number"
                step="0.01"
                value={allocation.amount}
                oninput={(e) => updateAllocationAmount(index, parseFloat((e.target as HTMLInputElement).value) || 0)}
                class="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="0.00"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onclick={() => removeAllocation(index)}
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          {/each}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={addAllocation}
            class="w-full"
          >
            <Plus class="h-4 w-4 mr-2" />
            Add Allocation
          </Button>

          <!-- Remaining amount indicator -->
          <div class="flex justify-between items-center text-sm pt-2 border-t border-border">
            <span class="text-muted-foreground">Total Allocated:</span>
            <span class="font-medium">{formatCurrency(totalAllocated)}</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-muted-foreground">Remaining:</span>
            <span class="font-medium" class:text-destructive={isOverAllocated}>
              {formatCurrency(remainingAmount)}
            </span>
          </div>
          {#if isOverAllocated}
            <p class="text-xs text-destructive">
              Allocation exceeds transaction amount
            </p>
          {/if}
        </div>
      {:else}
        <!-- Auto-assign preview -->
        <div class="text-sm text-muted-foreground">
          <p>Automatically allocated to: <span class="font-medium text-foreground">{applicableBudgets[0]?.name ?? 'N/A'}</span></p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Budget Impact Preview -->
  {#if budgetAllocations.length > 0 && amount !== 0}
    <div class="col-span-full">
      <BudgetImpactPreview
        budgets={applicableBudgets}
        allocations={budgetAllocations}
      />
    </div>
  {/if}

  <Form.Field {form} name="notes" class="col-span-full">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Notes</Form.Label>
        <Textarea {...props} value={$formData?.notes || ''} onchange={(e: Event) => {
          if ($formData) $formData.notes = (e.target as HTMLTextAreaElement).value;
        }} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Strict Budget Violation Warning -->
  {#if hasStrictViolations && strictValidation}
    <div class="col-span-full">
      <Alert.Root variant="destructive">
        <TriangleAlert class="h-4 w-4" />
        <Alert.Title>Budget Limit Exceeded</Alert.Title>
        <Alert.Description>
          <div class="space-y-1 mt-2">
            <p>This transaction exceeds strict budget limits:</p>
            <ul class="list-disc list-inside ml-2 space-y-0.5">
              {#each strictValidation.violations as violation}
                <li class="text-sm">
                  <span class="font-medium">{violation.budgetName}</span>:
                  exceeds by {formatCurrency(violation.exceeded)}
                </li>
              {/each}
            </ul>
            <p class="text-sm mt-2">You cannot save this transaction until the amount is reduced.</p>
          </div>
        </Alert.Description>
      </Alert.Root>
    </div>
  {/if}

  <Form.Button class="col-span-full" disabled={isOverAllocated || hasStrictViolations}>save</Form.Button>
  </form>
</div>
