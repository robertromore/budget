<script lang="ts">
import { page } from '$app/state';
import { rpc } from '$lib/query';
import * as Tabs from '$lib/components/ui/tabs';
import { Button } from '$lib/components/ui/button';
import * as ResponsiveSheet from '$lib/components/ui/responsive-sheet';
import { Badge } from '$lib/components/ui/badge';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import Wand from '@lucide/svelte/icons/wand';
import FileText from '@lucide/svelte/icons/file-text';
import SquarePen from '@lucide/svelte/icons/square-pen';
import HsaDashboard from './(components)/hsa-dashboard.svelte';
import ExpenseTableContainer from './(components)/expense-table-container.svelte';
import MedicalExpenseForm from './(components)/medical-expense-form.svelte';
import ExpenseWizard from './(components)/expense-wizard.svelte';

// Get account slug from page data
const accountSlug = $derived(page.data['accountSlug']);

// Query account data
const accountQuery = $derived(
  rpc.accounts.getAccountDetail(accountSlug).options()
);
const accountData = $derived(accountQuery.data);

// State for expense form
let addExpenseOpen = $state(false);
let useWizard = $state(true); // Default to wizard for new expenses
let editingExpense = $state<any | null>(null);

function handleEditExpense(expense: any) {
  editingExpense = expense;
  useWizard = false; // Use regular form for editing
  addExpenseOpen = true;
}

function handleAddExpense() {
  editingExpense = null;
  useWizard = true; // Use wizard for new expenses
  addExpenseOpen = true;
}
</script>

<div class="container mx-auto px-4 py-8">
  <!-- Header -->
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">{accountData?.name || 'HSA Account'}</h1>
      <p class="text-muted-foreground">Health Savings Account</p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/accounts/{accountSlug}/edit">
        <SquarePen class="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button onclick={handleAddExpense}>
        <HeartPulse class="mr-2 h-4 w-4" />
        Add Expense
      </Button>
    </div>
  </div>

  <!-- Tabs -->
  <Tabs.Root value="dashboard" class="w-full">
    <Tabs.List>
      <Tabs.Trigger value="dashboard">Dashboard</Tabs.Trigger>
      <Tabs.Trigger value="expenses">Expenses</Tabs.Trigger>
      <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
    </Tabs.List>

    <!-- Dashboard Tab -->
    <Tabs.Content value="dashboard">
      {#if accountData}
        <HsaDashboard account={accountData} />
      {/if}
    </Tabs.Content>

    <!-- Expenses Tab -->
    <Tabs.Content value="expenses">
      {#if accountData}
        <ExpenseTableContainer
          hsaAccountId={accountData.id}
          onEdit={handleEditExpense}
        />
      {/if}
    </Tabs.Content>

    <!-- Analytics Tab -->
    <Tabs.Content value="analytics">
      <div class="rounded-lg border p-8 text-center">
        <p class="text-muted-foreground">HSA Analytics coming soon</p>
      </div>
    </Tabs.Content>
  </Tabs.Root>

  <!-- Add/Edit Expense Sheet -->
  {#if accountData}
    <ResponsiveSheet.Root bind:open={addExpenseOpen}>
      {#snippet header()}
        <div class="space-y-2">
          <h2 class="text-lg font-semibold">
            {editingExpense ? 'Edit Medical Expense' : 'Add Medical Expense'}
          </h2>
          <p class="text-sm text-muted-foreground">
            {editingExpense ? 'Update the medical expense details' : useWizard ? 'Follow the guided wizard to add your expense' : 'Add a new medical expense to your HSA account'}
          </p>
        </div>
      {/snippet}
      {#snippet content()}
        {#if editingExpense}
          <!-- Editing uses regular form only -->
          <MedicalExpenseForm
            hsaAccountId={accountData.id}
            accountId={accountData.id}
            existingExpense={editingExpense}
            onSuccess={() => {
              addExpenseOpen = false;
              editingExpense = null;
            }}
            onCancel={() => {
              addExpenseOpen = false;
              editingExpense = null;
            }}
          />
        {:else}
          <!-- Adding new expense: tabs for wizard vs manual -->
          <div class="space-y-6">
            <Tabs.Root value={useWizard ? 'wizard' : 'manual'} onValueChange={(value) => {
              useWizard = value === 'wizard';
            }}>
              <Tabs.List class="grid w-full grid-cols-2">
                <Tabs.Trigger value="wizard" class="flex items-center gap-2">
                  <Wand class="h-4 w-4" />
                  Guided Setup
                  <Badge variant="secondary" class="text-xs">Helpful</Badge>
                </Tabs.Trigger>
                <Tabs.Trigger value="manual" class="flex items-center gap-2">
                  <FileText class="h-4 w-4" />
                  Manual Form
                  <Badge variant="secondary" class="text-xs">Quick</Badge>
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="wizard" class="mt-6">
                <div class="bg-muted/20 border border-muted rounded-lg p-4 mb-4">
                  <p class="text-sm text-muted-foreground">
                    Step-by-step guided setup. We'll walk you through each option with clear instructions.
                  </p>
                </div>
                <ExpenseWizard
                  hsaAccountId={accountData.id}
                  accountId={accountData.id}
                  onSuccess={() => {
                    addExpenseOpen = false;
                  }}
                  onCancel={() => {
                    addExpenseOpen = false;
                  }}
                />
              </Tabs.Content>

              <Tabs.Content value="manual" class="mt-6">
                <div class="bg-muted/20 border border-muted rounded-lg p-4 mb-4">
                  <p class="text-sm text-muted-foreground">
                    Fill out the form directly if you're familiar with the options.
                    Switch to <strong>Guided Setup</strong> for step-by-step help.
                  </p>
                </div>
                <MedicalExpenseForm
                  hsaAccountId={accountData.id}
                  accountId={accountData.id}
                  onSuccess={() => {
                    addExpenseOpen = false;
                  }}
                  onCancel={() => {
                    addExpenseOpen = false;
                  }}
                />
              </Tabs.Content>
            </Tabs.Root>
          </div>
        {/if}
      {/snippet}
    </ResponsiveSheet.Root>
  {/if}
</div>
