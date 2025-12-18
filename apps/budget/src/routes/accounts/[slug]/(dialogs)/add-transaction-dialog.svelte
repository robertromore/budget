<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import * as Tabs from '$lib/components/ui/tabs';
import TransactionWizard from '$lib/components/wizard/transaction-wizard.svelte';
import type { Transaction } from '$lib/schema';
import { CategoriesState, PayeesState } from '$lib/states/entities';
import { CurrentAccountState } from '$lib/states/views/current-account.svelte';
import ManageTransactionForm from '../(forms)/manage-transaction-form.svelte';

let {
  // account,
  dialogOpen = $bindable(),
}: {
  // account: Account;
  dialogOpen: boolean;
} = $props();

let account: CurrentAccountState = CurrentAccountState.get();

// Entity states for wizard
const categoriesState = CategoriesState.get();
const payeesState = PayeesState.get();
const categories = $derived(categoriesState?.all || []);
const payees = $derived(payeesState?.all || []);

// Tab state
let activeTab = $state('manual');

const onSave = async (new_entity: Transaction) => {
  dialogOpen = false;
  account?.addTransaction(new_entity);
};

// Handle wizard completion
const handleWizardComplete = async (data: Record<string, any>) => {
  // Convert wizard data to Transaction type
  const transaction: Partial<Transaction> = {
    accountId: data.accountId,
    date: data.date,
    amount: data.amount,
    payeeId: data.payeeId || null,
    categoryId: data.categoryId || null,
    notes: data.notes || null,
    status: data.status || 'pending',
  };

  await onSave(transaction as Transaction);
};
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Add Transaction</Dialog.Title>
      <Dialog.Description>Choose your preferred method to add a transaction.</Dialog.Description>
    </Dialog.Header>

    <Tabs.Root bind:value={activeTab} class="w-full">
      <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="manual">Manual</Tabs.Trigger>
        <Tabs.Trigger value="guided">Guided</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="manual" class="mt-4">
        <ManageTransactionForm accountId={account?.id || 0} {onSave} />
      </Tabs.Content>

      <Tabs.Content value="guided" class="mt-4">
        <TransactionWizard
          accountId={account?.id || 0}
          {payees}
          {categories}
          onComplete={handleWizardComplete} />
      </Tabs.Content>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
