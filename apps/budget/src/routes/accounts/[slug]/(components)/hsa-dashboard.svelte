<script lang="ts">
import { rpc } from '$lib/query';
import * as Card from '$lib/components/ui/card';
import * as ResponsiveSheet from '$lib/components/ui/responsive-sheet';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import FileText from '@lucide/svelte/icons/file-text';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import MedicalExpenseForm from './medical-expense-form.svelte';
import ReceiptUploadWidget from './receipt-upload-widget.svelte';
import ExpenseList from './expense-list.svelte';

interface Props {
  account: any;
}

let { account }: Props = $props();

const hsaAccountId = $derived(account.id);
const hsaAccount = $derived(account);

const currentYear = new Date().getFullYear();

// Query data
const summaryQuery = $derived(
  rpc.medicalExpenses?.getTaxYearSummary?.(hsaAccountId, currentYear)?.options?.() ?? null
);
const summary = $derived(summaryQuery?.data);

const pendingClaimsQuery = $derived(
  rpc.medicalExpenses?.getPendingClaims?.()?.options?.() ?? null
);
const pendingClaims = $derived(pendingClaimsQuery?.data ?? []);

// Dialog state
let showExpenseForm = $state(false);
let showReceiptUpload = $state(false);
let selectedExpenseId = $state<number | null>(null);
let editingExpense = $state<any | null>(null);

function handleAddExpense() {
  editingExpense = null;
  showExpenseForm = true;
}

function handleEditExpense(expense: any) {
  editingExpense = expense;
  showExpenseForm = true;
}

function handleAddReceipt(expenseId: number) {
  selectedExpenseId = expenseId;
  showReceiptUpload = true;
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Calculate contribution progress
const contributionLimit = $derived(hsaAccount?.hsaContributionLimit || 0);
const contributionProgress = $derived(
  contributionLimit > 0 ? ((summary?.totalExpenses || 0) / contributionLimit) * 100 : 0
);
</script>

<div class="space-y-6">
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total Expenses -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Expenses</Card.Title>
        <DollarSign class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{formatCurrency(summary?.totalExpenses)}</div>
        <p class="text-xs text-muted-foreground">
          {summary?.expenseCount || 0} expenses in {currentYear}
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Out of Pocket -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Out of Pocket</Card.Title>
        <TrendingUp class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{formatCurrency(summary?.totalOutOfPocket)}</div>
        <p class="text-xs text-muted-foreground">
          Your HSA-eligible expenses
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Qualified Expenses -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Qualified Expenses</Card.Title>
        <FileText class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{formatCurrency(summary?.qualifiedExpenses)}</div>
        <p class="text-xs text-muted-foreground">
          IRS Publication 502 compliant
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Pending Claims -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Pending Claims</Card.Title>
        <AlertCircle class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{pendingClaims.length}</div>
        <p class="text-xs text-muted-foreground">
          Awaiting review or payment
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Contribution Limit Progress -->
  {#if contributionLimit > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Contribution Limit Tracker</Card.Title>
        <Card.Description>
          Annual HSA contribution limit: {formatCurrency(contributionLimit)}
          ({hsaAccount?.hsaType || 'individual'})
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span>Contributions</span>
            <span class="font-medium">
              {formatCurrency(summary?.totalExpenses)} / {formatCurrency(contributionLimit)}
            </span>
          </div>
          <div class="w-full bg-secondary rounded-full h-2">
            <div
              class="bg-primary h-2 rounded-full transition-all"
              class:bg-destructive={contributionProgress > 100}
              style="width: {Math.min(contributionProgress, 100)}%"
            ></div>
          </div>
          <p class="text-xs text-muted-foreground">
            {contributionProgress > 100
              ? 'Over contribution limit!'
              : `${(100 - contributionProgress).toFixed(1)}% remaining`}
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Expense List -->
  <!-- <ExpenseList
    {hsaAccountId}
    onEdit={handleEditExpense}
    onAddReceipt={handleAddReceipt}
  /> -->

  <!-- Add/Edit Expense Sheet -->
  <ResponsiveSheet.Root bind:open={showExpenseForm}>
    {#snippet header()}
      <div class="space-y-2">
        <h2 class="text-lg font-semibold">
          {editingExpense ? 'Edit Medical Expense' : 'Add Medical Expense'}
        </h2>
        <p class="text-sm text-muted-foreground">
          {editingExpense
            ? 'Update the details of this medical expense'
            : 'Add a new medical expense to your HSA account'}
        </p>
      </div>
    {/snippet}
    {#snippet content()}
      <MedicalExpenseForm
        {hsaAccountId}
        accountId={account.id}
        existingExpense={editingExpense}
        onSuccess={() => { showExpenseForm = false; }}
        onCancel={() => { showExpenseForm = false; }}
      />
    {/snippet}
  </ResponsiveSheet.Root>

  <!-- Receipt Upload Sheet -->
  {#if selectedExpenseId}
    <ReceiptUploadWidget
      medicalExpenseId={selectedExpenseId}
      bind:open={showReceiptUpload}
    />
  {/if}
</div>
