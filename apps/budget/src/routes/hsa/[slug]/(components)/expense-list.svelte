<script lang="ts">
import {rpc} from '$lib/query';
import {Button} from '$lib/components/ui/button';
import * as Table from '$lib/components/ui/table';
import {Badge} from '$lib/components/ui/badge';
import * as Select from '$lib/components/ui/select';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import FileText from '@lucide/svelte/icons/file-text';
import Receipt from '@lucide/svelte/icons/receipt';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import Edit from '@lucide/svelte/icons/edit';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Send from '@lucide/svelte/icons/send';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import XCircle from '@lucide/svelte/icons/x-circle';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import ClaimManagementSheet from './claim-management-sheet.svelte';

interface Props {
  hsaAccountId: number;
  onEdit?: (expense: any) => void;
  onAddReceipt?: (expenseId: number) => void;
  onViewClaims?: (expenseId: number) => void;
}

let {hsaAccountId, onEdit, onAddReceipt, onViewClaims}: Props = $props();

// Claim management dialog state
let claimDialogOpen = $state(false);
let selectedExpenseForClaim = $state<any>(null);

function handleManageClaims(expense: any) {
  selectedExpenseForClaim = expense;
  claimDialogOpen = true;
}

// Quick status update functions
async function quickUpdateStatus(expense: any, status: string) {
  const claim = expense.claims?.[expense.claims.length - 1]; // Get most recent claim
  if (!claim) {
    // No claim exists, show advanced dialog
    handleManageClaims(expense);
    return;
  }

  try {
    const today = new Date().toISOString();

    switch (status) {
      case 'submitted':
        await rpc.medicalExpenses.submitClaim.execute({
          id: claim.id,
          medicalExpenseId: expense.id,
          submittedDate: today,
        });
        break;
      case 'approved':
        await rpc.medicalExpenses.approveClaim.execute({
          id: claim.id,
          medicalExpenseId: expense.id,
          approvedAmount: claim.claimedAmount,
          approvalDate: today,
        });
        break;
      case 'paid':
        await rpc.medicalExpenses.markClaimPaid.execute({
          id: claim.id,
          medicalExpenseId: expense.id,
          paidAmount: claim.approvedAmount || claim.claimedAmount,
          paymentDate: today,
        });
        break;
      case 'denied':
        // For deny, we need more info - show advanced dialog
        handleManageClaims(expense);
        break;
    }
  } catch (err: any) {
    console.error('Failed to update claim status:', err);
  }
}

// Current tax year
const currentYear = new Date().getFullYear();
let selectedTaxYear = $state(currentYear);

// Query expenses by tax year
const expensesQuery = $derived(
  rpc.medicalExpenses.getMedicalExpensesByTaxYear(hsaAccountId, selectedTaxYear).options()
);
const expenses = $derived(expensesQuery.data ?? []);
const isLoading = $derived(expensesQuery.isLoading);

// Tax year summary
const summaryQuery = $derived(
  rpc.medicalExpenses.getTaxYearSummary(hsaAccountId, selectedTaxYear).options()
);
const summary = $derived(summaryQuery.data);

// Generate tax year options (last 5 years + current + next year)
const taxYearOptions = Array.from({length: 7}, (_, i) => currentYear - 5 + i);

async function handleDelete(expense: any) {
  if (!confirm(`Delete medical expense for ${expense.provider || 'this expense'}?`)) return;

  try {
    await rpc.medicalExpenses.deleteMedicalExpense.execute({
      id: expense.id,
      hsaAccountId,
      taxYear: expense.taxYear,
    });
  } catch (err: any) {
    console.error('Failed to delete expense:', err);
  }
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const expenseTypeLabels: Record<string, string> = {
  doctor_visit: 'Doctor Visit',
  specialist_visit: 'Specialist',
  urgent_care: 'Urgent Care',
  emergency_room: 'ER',
  hospital_stay: 'Hospital',
  surgery: 'Surgery',
  lab_tests: 'Lab Tests',
  imaging: 'Imaging',
  prescription: 'Prescription',
  otc_medicine: 'OTC Medicine',
  dental: 'Dental',
  vision: 'Vision',
  mental_health: 'Mental Health',
  physical_therapy: 'PT',
  chiropractor: 'Chiropractor',
  medical_equipment: 'Equipment',
  hearing_aids: 'Hearing Aids',
  home_health_care: 'Home Health',
  long_term_care: 'Long-term Care',
  health_insurance_premiums: 'Insurance',
  other_qualified: 'Other Qualified',
  non_qualified: 'Non-Qualified',
};

// Claim status labels and variants
const claimStatusLabels: Record<string, string> = {
  not_submitted: 'No Claim',
  pending_submission: 'Pending',
  submitted: 'Submitted',
  in_review: 'In Review',
  approved: 'Approved',
  partially_approved: 'Partial',
  denied: 'Denied',
  resubmission_required: 'Resubmit',
  paid: 'Paid',
  withdrawn: 'Withdrawn',
};

const claimStatusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  not_submitted: 'outline',
  pending_submission: 'secondary',
  submitted: 'secondary',
  in_review: 'secondary',
  approved: 'default',
  partially_approved: 'default',
  denied: 'destructive',
  resubmission_required: 'destructive',
  paid: 'default',
  withdrawn: 'outline',
};

function getClaimStatus(expense: any): {
  status: string;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  // If no claims, show "No Claim"
  if (!expense.claims || expense.claims.length === 0) {
    return {
      status: 'not_submitted',
      label: claimStatusLabels['not_submitted'] || 'No Claim',
      variant: (claimStatusVariants['not_submitted'] || 'outline') as
        | 'default'
        | 'secondary'
        | 'destructive'
        | 'outline',
    };
  }

  // Get the most recent claim (claims should be sorted by creation date)
  const mostRecentClaim = expense.claims[expense.claims.length - 1];
  const status = mostRecentClaim.status || 'not_submitted';

  return {
    status,
    label: claimStatusLabels[status] || status,
    variant: (claimStatusVariants[status] || 'outline') as
      | 'default'
      | 'secondary'
      | 'destructive'
      | 'outline',
  };
}
</script>

<div class="space-y-4">
  <!-- Header with Controls -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold">Medical Expenses</h2>
      <p class="text-muted-foreground text-sm">HSA medical expenses for tax reporting</p>
    </div>
    <div class="flex items-center gap-4">
      <Select.Root
        type="single"
        value={selectedTaxYear.toString()}
        onValueChange={(value) => {
          if (value) selectedTaxYear = parseInt(value);
        }}>
        <Select.Trigger class="w-32">
          {selectedTaxYear}
        </Select.Trigger>
        <Select.Content>
          {#each taxYearOptions as year}
            <Select.Item value={year.toString()}>{year}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <!-- Summary Cards -->
  {#if summary}
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="bg-muted rounded-lg p-4">
        <p class="text-muted-foreground text-sm">Total Expenses</p>
        <p class="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</p>
      </div>
      <div class="bg-muted rounded-lg p-4">
        <p class="text-muted-foreground text-sm">Out of Pocket</p>
        <p class="text-2xl font-bold">{formatCurrency(summary.totalOutOfPocket)}</p>
      </div>
      <div class="bg-muted rounded-lg p-4">
        <p class="text-muted-foreground text-sm">Insurance Covered</p>
        <p class="text-2xl font-bold">{formatCurrency(summary.insuranceCovered)}</p>
      </div>
      <div class="bg-muted rounded-lg p-4">
        <p class="text-muted-foreground text-sm">Qualified Expenses</p>
        <p class="text-2xl font-bold">{formatCurrency(summary.qualifiedExpenses)}</p>
      </div>
    </div>
  {/if}

  <!-- Data Table -->
  <div class="rounded-md border">
    {#if isLoading}
      <div class="text-muted-foreground py-8 text-center">Loading expenses...</div>
    {:else if expenses.length === 0}
      <div class="py-12 text-center">
        <FileText class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <p class="mb-2 text-lg font-medium">No expenses for {selectedTaxYear}</p>
        <p class="text-muted-foreground text-sm">Medical expenses will appear here once recorded</p>
      </div>
    {:else}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Date</Table.Head>
            <Table.Head>Type</Table.Head>
            <Table.Head>Provider</Table.Head>
            <Table.Head>Patient</Table.Head>
            <Table.Head class="text-right">Total</Table.Head>
            <Table.Head class="text-right">Out of Pocket</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each expenses as expense}
            <Table.Row>
              <Table.Cell>{formatDate(expense.serviceDate)}</Table.Cell>
              <Table.Cell>
                <Badge variant="outline">
                  {expenseTypeLabels[expense.expenseType] || expense.expenseType}
                </Badge>
              </Table.Cell>
              <Table.Cell>{expense.provider || '-'}</Table.Cell>
              <Table.Cell>{expense.patientName || '-'}</Table.Cell>
              <Table.Cell class="text-right font-medium">
                {formatCurrency(expense.amount)}
              </Table.Cell>
              <Table.Cell class="text-right font-medium">
                {formatCurrency(expense.outOfPocket)}
              </Table.Cell>
              <Table.Cell>
                {@const claimStatus = getClaimStatus(expense)}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({props})}
                      <Button {...props} variant="ghost" size="sm" class="h-auto px-2 py-0">
                        <Badge variant={claimStatus.variant}>{claimStatus.label}</Badge>
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Label>Update Status</DropdownMenu.Label>
                    <DropdownMenu.Separator />
                    {#if claimStatus.status === 'not_submitted' || claimStatus.status === 'pending_submission'}
                      <DropdownMenu.Item onclick={() => quickUpdateStatus(expense, 'submitted')}>
                        <Send class="mr-2 h-4 w-4" />
                        Mark Submitted
                      </DropdownMenu.Item>
                    {/if}
                    {#if claimStatus.status === 'submitted' || claimStatus.status === 'in_review'}
                      <DropdownMenu.Item onclick={() => quickUpdateStatus(expense, 'approved')}>
                        <CheckCircle class="mr-2 h-4 w-4" />
                        Mark Approved
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onclick={() => quickUpdateStatus(expense, 'denied')}>
                        <XCircle class="mr-2 h-4 w-4" />
                        Mark Denied
                      </DropdownMenu.Item>
                    {/if}
                    {#if claimStatus.status === 'approved' || claimStatus.status === 'partially_approved'}
                      <DropdownMenu.Item onclick={() => quickUpdateStatus(expense, 'paid')}>
                        <DollarSign class="mr-2 h-4 w-4" />
                        Mark Paid
                      </DropdownMenu.Item>
                    {/if}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onclick={() => handleManageClaims(expense)}>
                      <MoreHorizontal class="mr-2 h-4 w-4" />
                      Advanced Options
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Table.Cell>
              <Table.Cell>
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleManageClaims(expense)}
                    title="Manage claims">
                    <ClipboardList class="h-4 w-4" />
                  </Button>
                  {#if onAddReceipt}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => onAddReceipt?.(expense.id)}
                      title="Add receipt">
                      <Receipt class="h-4 w-4" />
                    </Button>
                  {/if}
                  {#if onEdit}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => onEdit?.(expense)}
                      title="Edit">
                      <Edit class="h-4 w-4" />
                    </Button>
                  {/if}
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleDelete(expense)}
                    title="Delete">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </div>
</div>

<!-- Claim Management Sheet -->
{#if selectedExpenseForClaim}
  <ClaimManagementSheet expense={selectedExpenseForClaim} bind:open={claimDialogOpen} />
{/if}
