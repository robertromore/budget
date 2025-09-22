<script lang="ts">
import * as Form from '$lib/components/ui/form';
import {type Transaction} from '$lib/schema';
import {superformInsertTransactionSchema} from '$lib/schema/superforms';
import {superForm} from 'sveltekit-superforms/client';
import {today, getLocalTimeZone} from '@internationalized/date';
import type {EditableDateItem, EditableEntityItem} from '$lib/types';
import {Textarea} from '$lib/components/ui/textarea';
import {zod4Client} from 'sveltekit-superforms/adapters';
import {DateInput, EntityInput, NumericInput} from '$lib/components/input';
import {page} from '$app/state';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import type {Component} from 'svelte';
import SquareMousePointer from '@lucide/svelte/icons/square-mouse-pointer';
import { BudgetSelector } from '$lib/components/budgets';
import { BudgetsState } from '$lib/states/budgets.svelte';
import { Wallet } from '@lucide/svelte';

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

// Budget state
const budgetsState = BudgetsState.get();
const budgets = $derived(budgetsState.activeBudgets);
let selectedBudgetId = $state<number | null>(null);

// Filter budgets that apply to this account/category combination
const applicableBudgets = $derived.by(() => {
  return budgets.filter(budget => {
    // For account-scoped budgets, check if this account applies
    if (budget.scope === 'account') {
      // TODO: Check budget-account associations when implemented
      return true; // For now, show all account budgets
    }

    // For category-scoped budgets, check if the selected category applies
    if (budget.scope === 'category' && category.id > 0) {
      // TODO: Check budget-category associations when implemented
      return true; // For now, show all category budgets
    }

    // Global budgets apply to all transactions
    if (budget.scope === 'global') {
      return true;
    }

    // Mixed scope budgets have complex rules
    if (budget.scope === 'mixed') {
      return true; // For now, show all mixed budgets
    }

    return false;
  });
});

$effect(() => {
  $formData.date = dateValue.toString();
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
        <EntityInput
          {...props}
          entityLabel="payees"
          entities={payees as EditableEntityItem[]}
          bind:value={payee}
          icon={HandCoins as unknown as Component}
          buttonClass="w-full" />
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

  <!-- Budget Selection -->
  <div class="col-span-full space-y-2">
    <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      Budget (Optional)
    </label>
    <BudgetSelector
      budgets={applicableBudgets}
      bind:selectedBudgetId
      placeholder="Assign to a budget..."
      allowClear={true}
      showOnlyActive={true}
    />
    <p class="text-xs text-muted-foreground">
      {#if applicableBudgets.length === 0}
        No budgets available for this transaction. Create budgets to track spending.
      {:else}
        Assign this transaction to a budget to track spending against your goals.
      {/if}
    </p>
  </div>

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
