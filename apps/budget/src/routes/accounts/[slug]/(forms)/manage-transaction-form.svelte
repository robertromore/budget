<script lang="ts">
import * as Form from '$lib/components/ui/form';
import {type Transaction} from '$lib/schema';
import {superformInsertTransactionSchema} from '$lib/schema/superforms';
import {superForm} from 'sveltekit-superforms/client';
import {currentDate} from '$lib/utils/dates';
import type {EditableDateItem, EditableEntityItem} from '$lib/types';
import {Textarea} from '$lib/components/ui/textarea';
import {zod4Client} from 'sveltekit-superforms/adapters';
import {DateInput, EntityInput, NumericInput} from '$lib/components/input';
import {page} from '$app/state';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import type {Component} from 'svelte';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';
import Wallet from '@lucide/svelte/icons/wallet';
import {getBudgetSuggestions, type BudgetSuggestion} from '$lib/query/budgets';
import {Badge} from '$lib/components/ui/badge';
import {toISOString} from '$lib/utils/dates';
import {AdvancedPayeeSelector} from '$lib/components/payees/advanced-payee-selector';

interface Props {
  accountId: number;
  onDelete?: (id: number) => void;
  onSave?: (new_entity: Transaction) => void;
}

let {accountId, onSave}: Props = $props();

const {
  data: {payees, categories, manageTransactionForm},
} = page;

const form = superForm(manageTransactionForm, {
  id: 'transaction-form',
  validators: zod4Client(superformInsertTransactionSchema),
  onResult: async ({result}) => {
    if (onSave) {
      if (result.type === 'success' && result.data) {
        onSave(result.data['entity']);
      }
    }
  },
});

const {form: formData, enhance} = form;

$formData.accountId = accountId;

let dateValue: EditableDateItem = $state(currentDate);
let amount: number = $state<number>(0);
let payee: EditableEntityItem = $state({
  id: 0,
  name: '',
});
let category: EditableEntityItem = $state({
  id: 0,
  name: '',
});
let budget: EditableEntityItem = $state({
  id: 0,
  name: '',
});

// Prepare budgets list for EntityInput
const budgets = $derived<EditableEntityItem[]>(
  page.data['budgets']?.map((b: any) => ({
    id: b.id,
    name: b.name
  })) || []
);

// Get budget suggestions based on transaction details
const budgetSuggestionsQuery = $derived(
  getBudgetSuggestions.options({
    accountId,
    categoryId: category.id || null,
    payeeId: payee.id || null,
    amount: amount || 0,
    date: $formData.date, // Use the ISO string from formData instead of DateValue
  })
);

// Get the top suggestion
const topSuggestion = $derived.by((): BudgetSuggestion | null => {
  const data = budgetSuggestionsQuery.data;
  if (!data || data.length === 0) return null;
  return data[0] ?? null;
});

// Auto-apply top suggestion when it changes (if no budget selected yet)
$effect(() => {
  if (topSuggestion && !budget.id) {
    budget = {
      id: topSuggestion.budgetId,
      name: topSuggestion.budgetName
    };
  }
});

$effect(() => {
  $formData.date = toISOString(dateValue);
  $formData.amount = amount;
  $formData.payeeId = payee.id;
  $formData.categoryId = category.id;
});
</script>

<form method="post" action="/accounts?/add-transaction" use:enhance class="grid grid-cols-2 gap-2">
  <input hidden value={$formData.accountId} name="accountId" />
  <Form.Field {form} name="date">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Date</Form.Label>
        <DateInput {...props} bind:value={dateValue} />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.date} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="amount">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Amount</Form.Label>
        <NumericInput {...props} bind:value={amount} buttonClass="w-full" />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.amount} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="payeeId">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Payee</Form.Label>
        <AdvancedPayeeSelector
          value={payee.id || null}
          onValueChange={(id) => {
            if (id) {
              const selectedPayee = payees.find((p: any) => p.id === id);
              if (selectedPayee) {
                payee = {id: selectedPayee.id, name: selectedPayee.name};
              }
            } else {
              payee = {id: 0, name: ''};
            }
          }}
          transactionContext={{
            amount: amount || 0,
            categoryId: category.id || undefined,
            accountId
          }}
          displayMode="normal"
          groupStrategy="usage"
          showQuickAccess={true}
          allowCreate={false}
          buttonClass="w-full"
          placeholder="Select payee..."
        />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.payeeId} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="categoryId">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Category</Form.Label>
        <EntityInput
          {...props}
          entityLabel="categories"
          entities={categories as EditableEntityItem[]}
          bind:value={category}
          icon={SquareMousePointer as unknown as Component}
          buttonClass="w-full" />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.categoryId} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="budgetId" class="col-span-full">
    <Form.Control>
      {#snippet children({props})}
        <div class="flex items-center gap-2">
          <Form.Label>Budget</Form.Label>
          {#if topSuggestion}
            <Badge variant="secondary" class="text-xs">
              🎯 {topSuggestion.confidence}% confident - {topSuggestion.reasonText}
            </Badge>
          {/if}
        </div>
        <EntityInput
          {...props}
          entityLabel="budgets"
          entities={budgets}
          bind:value={budget}
          icon={Wallet as unknown as Component}
          buttonClass="w-full"
          placeholder="Select budget (optional)" />
        <Form.FieldErrors />
        <input hidden bind:value={budget.id} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="notes" class="col-span-full">
    <Form.Control>
      {#snippet children({props})}
        <Form.Label>Notes</Form.Label>
        <Textarea {...props} bind:value={$formData.notes} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Button>save</Form.Button>
</form>
