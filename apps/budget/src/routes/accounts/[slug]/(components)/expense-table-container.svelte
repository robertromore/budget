<script lang="ts">
import { rpc } from '$lib/query';
import { parseDate } from '@internationalized/date';
import { columns, type ExpenseFormat } from '../(data)/expense-columns.svelte';
import ExpenseDataTable from './expense-data-table.svelte';
import ExpenseSkeleton from './expense-skeleton.svelte';
import ClaimManagementSheet from './claim-management-sheet.svelte';
import ReceiptUploadWidget from './receipt-upload-widget.svelte';

interface Props {
  hsaAccountId: number;
  views?: any[];
  onEdit?: (expense: any) => void;
}

let { hsaAccountId, views = [], onEdit }: Props = $props();

// State for dialogs
let claimDialogOpen = $state(false);
let receiptUploadOpen = $state(false);
let selectedExpense = $state<ExpenseFormat | null>(null);
let selectedExpenseId = $state<number | null>(null);

// Create mutations at component level
const updateMedicalExpenseMutation = rpc.medicalExpenses.updateMedicalExpense.options();
const deleteMedicalExpenseMutation = rpc.medicalExpenses.deleteMedicalExpense.options();

// Query all expenses with relations
const expensesQuery = $derived(
  rpc.medicalExpenses.getAllExpensesWithRelations(hsaAccountId).options()
);
const rawExpenses = $derived(expensesQuery.data ?? []);
const isLoading = $derived(expensesQuery.isLoading);

// Transform expenses to ExpenseFormat
const expenses = $derived.by((): ExpenseFormat[] => {
  if (!rawExpenses || rawExpenses.length === 0) {
    return [];
  }
  return rawExpenses.map((expense) => {
    // Parse date
    let date;
    try {
      date = parseDate(expense.serviceDate.split('T')[0]);
    } catch {
      date = parseDate(new Date().toISOString().split('T')[0]);
    }

    // Compute claim status - use most recent claim status if exists
    const claims = expense.claims || [];
    const mostRecentClaim =
      claims.length > 0
        ? claims.sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
        : null;
    const claimStatus = mostRecentClaim?.status || 'not_submitted';

    return {
      id: expense.id,
      date,
      provider: expense.provider,
      patientName: expense.patientName,
      expenseType: expense.expenseType,
      diagnosis: expense.diagnosis,
      treatmentDescription: expense.treatmentDescription,
      amount: expense.amount,
      insuranceCovered: expense.insuranceCovered || 0,
      outOfPocket: expense.outOfPocket,
      serviceDate: expense.serviceDate,
      paidDate: expense.paidDate,
      taxYear: expense.taxYear,
      notes: expense.notes,
      isQualified: expense.isQualified,
      hsaAccountId: expense.hsaAccountId,
      transactionId: expense.transactionId,
      claims: expense.claims || [],
      receipts: expense.receipts || [],
      claimStatus: claimStatus as any,
      hasReceipts: (expense.receipts || []).length > 0,
    };
  });
});

// Inline editing handler
async function handleUpdateData(id: number, columnId: string, newValue?: unknown) {
  try {
    const updateData: any = {
      id,
      hsaAccountId,
    };

    // Map column IDs to update fields
    switch (columnId) {
      case 'date':
        if (newValue) {
          updateData.serviceDate = (newValue as any).toString();
        }
        break;
      case 'provider':
        updateData.provider = newValue as string;
        break;
      case 'patientName':
        updateData.patientName = newValue as string;
        break;
      case 'expenseType':
        updateData.expenseType = newValue as string;
        break;
      case 'diagnosis':
        updateData.diagnosis = newValue as string;
        break;
      case 'treatmentDescription':
        updateData.treatmentDescription = newValue as string;
        break;
      case 'amount':
        updateData.amount = newValue as number;
        break;
      case 'insuranceCovered':
        updateData.insuranceCovered = newValue as number;
        // Recalculate out of pocket
        const expense = expenses.find((e) => e.id === id);
        if (expense) {
          updateData.outOfPocket = expense.amount - (newValue as number);
        }
        break;
      case 'notes':
        updateData.notes = newValue as string;
        break;
    }

    await updateMedicalExpenseMutation.mutateAsync(updateData);
  } catch (error) {
    console.error('Failed to update expense:', error);
    throw error;
  }
}

// Action handlers
function handleEditExpense(expense: ExpenseFormat) {
  if (onEdit) {
    onEdit(expense);
  }
}

function handleDeleteExpense(expense: ExpenseFormat) {
  if (confirm(`Are you sure you want to delete this expense for ${expense.provider}?`)) {
    deleteMedicalExpenseMutation.mutateAsync({
      id: expense.id,
      hsaAccountId,
      taxYear: expense.taxYear,
    });
  }
}

function handleManageClaims(expense: ExpenseFormat) {
  selectedExpense = expense;
  claimDialogOpen = true;
}

function handleAddReceipt(expenseId: number) {
  selectedExpenseId = expenseId;
  receiptUploadOpen = true;
}

// Bulk delete handler
function handleBulkDelete(selectedExpenses: ExpenseFormat[]) {
  if (
    confirm(
      `Are you sure you want to delete ${selectedExpenses.length} expense${selectedExpenses.length > 1 ? 's' : ''}?`
    )
  ) {
    Promise.all(
      selectedExpenses.map((expense) =>
        deleteMedicalExpenseMutation.mutateAsync({
          id: expense.id,
          hsaAccountId,
          taxYear: expense.taxYear,
        })
      )
    );
  }
}

// Create column definitions with handlers
const tableColumns = $derived(
  columns(
    handleUpdateData,
    handleEditExpense,
    handleDeleteExpense,
    handleManageClaims,
    handleAddReceipt
  )
);
</script>

{#if isLoading}
  <ExpenseSkeleton />
{:else}
  <ExpenseDataTable columns={tableColumns} {expenses} {views} onBulkDelete={handleBulkDelete} />
{/if}

<!-- Claim Management Sheet -->
{#if selectedExpense}
  <ClaimManagementSheet bind:open={claimDialogOpen} expense={selectedExpense} />
{/if}

<!-- Receipt Upload Widget -->
{#if selectedExpenseId !== null}
  <ReceiptUploadWidget medicalExpenseId={selectedExpenseId} bind:open={receiptUploadOpen} />
{/if}
