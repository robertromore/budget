<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import { Badge } from '$lib/components/ui/badge';
import * as Dialog from '$lib/components/ui/dialog';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import * as Separator from '$lib/components/ui/separator';
import * as Card from '$lib/components/ui/card';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import DateInput from '$lib/components/input/date-input.svelte';
import { timezone, currentDate } from '$lib/utils/dates';
import { claimStatusEnum, type ClaimStatus } from '$lib/schema/hsa-claims';
import Plus from '@lucide/svelte/icons/plus';
import Send from '@lucide/svelte/icons/send';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import XCircle from '@lucide/svelte/icons/x-circle';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Edit from '@lucide/svelte/icons/edit';
import Trash2 from '@lucide/svelte/icons/trash-2';

interface Props {
  expense: any;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

let { expense, open = $bindable(), onOpenChange }: Props = $props();

// Query claims for this expense
const claimsQuery = $derived(
  rpc.medicalExpenses.getClaims(expense.id).options()
);
const claims = $derived(claimsQuery.data ?? []);
const isLoading = $derived(claimsQuery.isLoading);

// Form state
let showNewClaimForm = $state(false);
let editingClaim = $state<any>(null);
let claimedAmount = $state(expense.outOfPocket || 0);
let claimNumber = $state('');
let administratorName = $state('');
let notes = $state('');
let internalNotes = $state('');
let error = $state('');
let isSubmitting = $state(false);

// Create mutations at component level
const updateClaimMutation = rpc.medicalExpenses.updateClaim.options();
const createClaimMutation = rpc.medicalExpenses.createClaim.options();
const submitClaimMutation = rpc.medicalExpenses.submitClaim.options();
const markClaimInReviewMutation = rpc.medicalExpenses.markClaimInReview.options();
const approveClaimMutation = rpc.medicalExpenses.approveClaim.options();
const denyClaimMutation = rpc.medicalExpenses.denyClaim.options();
const markClaimPaidMutation = rpc.medicalExpenses.markClaimPaid.options();
const requestResubmissionMutation = rpc.medicalExpenses.requestResubmission.options();
const withdrawClaimMutation = rpc.medicalExpenses.withdrawClaim.options();
const deleteClaimMutation = rpc.medicalExpenses.deleteClaim.options();

// Status update form
let selectedClaim = $state<any>(null);
let newStatus = $state<ClaimStatus>('submitted');
let approvedAmount = $state(0);
let deniedAmount = $state(0);
let paidAmount = $state(0);
let denialReason = $state('');
let denialCode = $state('');
let statusDate = $state(currentDate);
let deleteDialogOpen = $state(false);
let claimToDelete = $state<any>(null);

function resetForm() {
  showNewClaimForm = false;
  editingClaim = null;
  claimedAmount = expense.outOfPocket || 0;
  claimNumber = '';
  administratorName = '';
  notes = '';
  internalNotes = '';
  error = '';
}

function startNewClaim() {
  resetForm();
  showNewClaimForm = true;
}

function startEditClaim(claim: any) {
  editingClaim = claim;
  claimedAmount = claim.claimedAmount;
  claimNumber = claim.claimNumber || '';
  administratorName = claim.administratorName || '';
  notes = claim.notes || '';
  internalNotes = claim.internalNotes || '';
  showNewClaimForm = true;
}

function cancelForm() {
  resetForm();
  selectedClaim = null;
}

async function handleCreateClaim() {
  if (claimedAmount <= 0) {
    error = 'Claimed amount must be greater than 0';
    return;
  }

  isSubmitting = true;
  error = '';

  try {
    if (editingClaim) {
      await updateClaimMutation.mutateAsync({
        id: editingClaim.id,
        medicalExpenseId: expense.id,
        claimedAmount,
        ...(claimNumber && { claimNumber }),
        ...(administratorName && { administratorName }),
        ...(notes && { notes }),
        ...(internalNotes && { internalNotes }),
      });
    } else {
      await createClaimMutation.mutateAsync({
        medicalExpenseId: expense.id,
        claimedAmount,
        ...(claimNumber && { claimNumber }),
        ...(administratorName && { administratorName }),
        ...(notes && { notes }),
        ...(internalNotes && { internalNotes }),
      });
    }
    resetForm();
  } catch (err: any) {
    error = err.message || 'Failed to save claim';
  } finally {
    isSubmitting = false;
  }
}

async function handleStatusUpdate(claim: any, status: ClaimStatus) {
  selectedClaim = claim;
  newStatus = status;

  // Pre-fill amounts based on status
  if (status === 'approved' || status === 'partially_approved') {
    approvedAmount = claim.claimedAmount;
    deniedAmount = 0;
  } else if (status === 'denied') {
    approvedAmount = 0;
    deniedAmount = claim.claimedAmount;
  } else if (status === 'paid') {
    paidAmount = claim.approvedAmount || claim.claimedAmount;
  }
}

async function submitStatusUpdate() {
  if (!selectedClaim) return;

  isSubmitting = true;
  error = '';

  try {
    // Convert DateValue to ISO datetime string with timezone
    const dateStr = statusDate.toDate(timezone).toISOString();

    switch (newStatus) {
      case 'submitted':
        await submitClaimMutation.mutateAsync({
          id: selectedClaim.id,
          medicalExpenseId: expense.id,
          ...(claimNumber && { claimNumber }),
          submittedDate: dateStr,
        });
        break;

      case 'in_review':
        await markClaimInReviewMutation.mutateAsync({
          id: selectedClaim.id,
          medicalExpenseId: expense.id,
          reviewDate: dateStr,
        });
        break;

      case 'approved':
      case 'partially_approved':
        await approveClaimMutation.mutateAsync({
          id: selectedClaim.id,
          medicalExpenseId: expense.id,
          approvedAmount,
          ...(deniedAmount && { deniedAmount }),
          approvalDate: dateStr,
        });
        break;

      case 'denied':
        await denyClaimMutation.mutateAsync({
          id: selectedClaim.id,
          medicalExpenseId: expense.id,
          denialReason,
          ...(denialCode && { denialCode }),
        });
        break;

      case 'paid':
        await markClaimPaidMutation.mutateAsync({
          id: selectedClaim.id,
          medicalExpenseId: expense.id,
          paidAmount,
          paymentDate: dateStr,
        });
        break;

      case 'resubmission_required':
        await requestResubmissionMutation.mutateAsync({
          id: selectedClaim.id,
          medicalExpenseId: expense.id,
          reason: denialReason,
        });
        break;

      case 'withdrawn':
        await withdrawClaimMutation.mutateAsync({
          id: selectedClaim.id,
          medicalExpenseId: expense.id,
        });
        break;
    }

    selectedClaim = null;
    denialReason = '';
    denialCode = '';
  } catch (err: any) {
    error = err.message || 'Failed to update claim status';
  } finally {
    isSubmitting = false;
  }
}

function handleDeleteClaim(claim: any) {
  claimToDelete = claim;
  deleteDialogOpen = true;
}

async function confirmDeleteClaim() {
  if (!claimToDelete) return;

  try {
    await deleteClaimMutation.mutateAsync({
      id: claimToDelete.id,
      medicalExpenseId: expense.id,
    });
    deleteDialogOpen = false;
    claimToDelete = null;
  } catch (err: any) {
    error = err.message || 'Failed to delete claim';
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

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
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
  return variants[status] || 'outline';
}
</script>

<Dialog.Root bind:open {...(onOpenChange && { onOpenChange })}>
  <Dialog.Content class="max-w-3xl max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Claim Management</Dialog.Title>
      <Dialog.Description>
        Manage HSA reimbursement claims for this expense
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6">
      <!-- Expense Summary -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-base">Expense Details</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Provider:</span>
            <span class="font-medium">{expense.provider || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Service Date:</span>
            <span class="font-medium">{formatDate(expense.serviceDate)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Total Amount:</span>
            <span class="font-medium">{formatCurrency(expense.amount)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Insurance Covered:</span>
            <span class="font-medium">{formatCurrency(expense.insuranceCovered)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Out of Pocket:</span>
            <span class="font-semibold text-lg">{formatCurrency(expense.outOfPocket)}</span>
          </div>
        </Card.Content>
      </Card.Root>

      <Separator.Root />

      <!-- Existing Claims List -->
      {#if isLoading}
        <div class="text-center py-4 text-muted-foreground">Loading claims...</div>
      {:else if claims.length > 0}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Claims ({claims.length})</h3>
            {#if !showNewClaimForm && !selectedClaim}
              <Button size="sm" onclick={startNewClaim}>
                <Plus class="h-4 w-4 mr-2" />
                New Claim
              </Button>
            {/if}
          </div>

          {#each claims as claim}
            <Card.Root>
              <Card.Header>
                <div class="flex items-start justify-between">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <Card.Title class="text-base">
                        {#if claim.claimNumber}
                          Claim #{claim.claimNumber}
                        {:else}
                          Claim {claim.id}
                        {/if}
                      </Card.Title>
                      <Badge variant={getStatusBadgeVariant(claim.status)}>
                        {claimStatusEnum[claim.status as ClaimStatus]}
                      </Badge>
                    </div>
                    {#if claim.administratorName}
                      <p class="text-sm text-muted-foreground">{claim.administratorName}</p>
                    {/if}
                  </div>
                  <div class="flex gap-1">
                    <Button variant="ghost" size="sm" onclick={() => startEditClaim(claim)}>
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onclick={() => handleDeleteClaim(claim)}>
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card.Header>
              <Card.Content class="space-y-3">
                <!-- Financial Details -->
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span class="text-muted-foreground">Claimed:</span>
                    <span class="ml-2 font-medium">{formatCurrency(claim.claimedAmount)}</span>
                  </div>
                  {#if claim.approvedAmount && claim.approvedAmount > 0}
                    <div>
                      <span class="text-muted-foreground">Approved:</span>
                      <span class="ml-2 font-medium text-green-600">{formatCurrency(claim.approvedAmount)}</span>
                    </div>
                  {/if}
                  {#if claim.deniedAmount && claim.deniedAmount > 0}
                    <div>
                      <span class="text-muted-foreground">Denied:</span>
                      <span class="ml-2 font-medium text-red-600">{formatCurrency(claim.deniedAmount)}</span>
                    </div>
                  {/if}
                  {#if claim.paidAmount && claim.paidAmount > 0}
                    <div>
                      <span class="text-muted-foreground">Paid:</span>
                      <span class="ml-2 font-medium text-green-600">{formatCurrency(claim.paidAmount)}</span>
                    </div>
                  {/if}
                </div>

                <!-- Dates -->
                <div class="grid grid-cols-2 gap-3 text-sm">
                  {#if claim.submittedDate}
                    <div>
                      <span class="text-muted-foreground">Submitted:</span>
                      <span class="ml-2">{formatDate(claim.submittedDate)}</span>
                    </div>
                  {/if}
                  {#if claim.approvalDate}
                    <div>
                      <span class="text-muted-foreground">Approved:</span>
                      <span class="ml-2">{formatDate(claim.approvalDate)}</span>
                    </div>
                  {/if}
                  {#if claim.paymentDate}
                    <div>
                      <span class="text-muted-foreground">Paid:</span>
                      <span class="ml-2">{formatDate(claim.paymentDate)}</span>
                    </div>
                  {/if}
                </div>

                <!-- Notes -->
                {#if claim.notes}
                  <div class="text-sm">
                    <span class="text-muted-foreground">Notes:</span>
                    <p class="mt-1">{claim.notes}</p>
                  </div>
                {/if}

                <!-- Denial Info -->
                {#if claim.denialReason}
                  <div class="text-sm bg-destructive/10 p-3 rounded-md">
                    <span class="font-medium text-destructive">Denial Reason:</span>
                    <p class="mt-1">{claim.denialReason}</p>
                    {#if claim.denialCode}
                      <p class="mt-1 text-muted-foreground">Code: {claim.denialCode}</p>
                    {/if}
                  </div>
                {/if}

                <!-- Status Actions -->
                {#if !selectedClaim && !showNewClaimForm}
                  <div class="flex flex-wrap gap-2 pt-2">
                    {#if claim.status === 'not_submitted' || claim.status === 'pending_submission'}
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'submitted')}>
                        <Send class="h-4 w-4 mr-2" />
                        Submit
                      </Button>
                    {/if}
                    {#if claim.status === 'submitted'}
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'in_review')}>
                        In Review
                      </Button>
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'approved')}>
                        <CheckCircle class="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'denied')}>
                        <XCircle class="h-4 w-4 mr-2" />
                        Deny
                      </Button>
                    {/if}
                    {#if claim.status === 'in_review'}
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'approved')}>
                        <CheckCircle class="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'denied')}>
                        <XCircle class="h-4 w-4 mr-2" />
                        Deny
                      </Button>
                    {/if}
                    {#if claim.status === 'approved' || claim.status === 'partially_approved'}
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'paid')}>
                        <DollarSign class="h-4 w-4 mr-2" />
                        Mark Paid
                      </Button>
                    {/if}
                    {#if claim.status === 'denied'}
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'resubmission_required')}>
                        Request Resubmission
                      </Button>
                    {/if}
                    {#if claim.status !== 'paid' && claim.status !== 'withdrawn'}
                      <Button size="sm" variant="outline" onclick={() => handleStatusUpdate(claim, 'withdrawn')}>
                        Withdraw
                      </Button>
                    {/if}
                  </div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      {:else if !showNewClaimForm}
        <div class="text-center py-8">
          <p class="text-muted-foreground mb-4">No claims filed for this expense yet</p>
          <Button onclick={startNewClaim}>
            <Plus class="h-4 w-4 mr-2" />
            Create First Claim
          </Button>
        </div>
      {/if}

      <!-- New/Edit Claim Form -->
      {#if showNewClaimForm}
        <Card.Root>
          <Card.Header>
            <Card.Title>{editingClaim ? 'Edit Claim' : 'New Claim'}</Card.Title>
            <Card.Description>
              {editingClaim ? 'Update claim details' : 'Create a new reimbursement claim'}
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            {#if error}
              <div class="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            {/if}

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="claimedAmount">Claimed Amount *</Label>
                <NumericInput
                  id="claimedAmount"
                  bind:value={claimedAmount}
                />
              </div>

              <div class="space-y-2">
                <Label for="claimNumber">Claim Number</Label>
                <Input
                  id="claimNumber"
                  bind:value={claimNumber}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="administratorName">HSA Administrator</Label>
              <Input
                id="administratorName"
                bind:value={administratorName}
                placeholder="e.g., Fidelity, HSA Bank"
              />
            </div>

            <div class="space-y-2">
              <Label for="notes">Notes</Label>
              <Textarea
                id="notes"
                bind:value={notes}
                placeholder="Public notes about this claim"
                rows={2}
              />
            </div>

            <div class="space-y-2">
              <Label for="internalNotes">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                bind:value={internalNotes}
                placeholder="Private notes (not for submission)"
                rows={2}
              />
            </div>

            <div class="flex gap-2">
              <Button onclick={handleCreateClaim} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingClaim ? 'Update Claim' : 'Create Claim'}
              </Button>
              <Button variant="outline" onclick={cancelForm}>Cancel</Button>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Status Update Form -->
      {#if selectedClaim}
        <Card.Root>
          <Card.Header>
            <Card.Title>Update Claim Status</Card.Title>
            <Card.Description>
              Update status to: <Badge variant={getStatusBadgeVariant(newStatus)}>{claimStatusEnum[newStatus]}</Badge>
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            {#if error}
              <div class="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            {/if}

            {#if newStatus === 'submitted'}
              <div class="space-y-2">
                <Label for="claimNumberSubmit">Claim Number (Optional)</Label>
                <Input
                  id="claimNumberSubmit"
                  bind:value={claimNumber}
                  placeholder="Enter claim number from HSA administrator"
                />
              </div>
            {/if}

            {#if newStatus === 'approved' || newStatus === 'partially_approved'}
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="approvedAmount">Approved Amount *</Label>
                  <NumericInput
                    id="approvedAmount"
                    bind:value={approvedAmount}
                  />
                </div>
                <div class="space-y-2">
                  <Label for="deniedAmount">Denied Amount</Label>
                  <NumericInput
                    id="deniedAmount"
                    bind:value={deniedAmount}
                  />
                </div>
              </div>
            {/if}

            {#if newStatus === 'denied' || newStatus === 'resubmission_required'}
              <div class="space-y-4">
                <div class="space-y-2">
                  <Label for="denialReason">Denial Reason *</Label>
                  <Textarea
                    id="denialReason"
                    bind:value={denialReason}
                    placeholder="Explain why the claim was denied"
                    rows={3}
                  />
                </div>
                <div class="space-y-2">
                  <Label for="denialCode">Denial Code</Label>
                  <Input
                    id="denialCode"
                    bind:value={denialCode}
                    placeholder="Optional denial code"
                  />
                </div>
              </div>
            {/if}

            {#if newStatus === 'paid'}
              <div class="space-y-2">
                <Label for="paidAmount">Paid Amount *</Label>
                <NumericInput
                  id="paidAmount"
                  bind:value={paidAmount}
                />
              </div>
            {/if}

            {#if newStatus !== 'withdrawn'}
              <div class="space-y-2">
                <Label for="statusDate">Date</Label>
                <DateInput
                  bind:value={statusDate}
                />
              </div>
            {/if}

            <div class="flex gap-2">
              <Button onclick={submitStatusUpdate} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Status'}
              </Button>
              <Button variant="outline" onclick={cancelForm}>Cancel</Button>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete Claim Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Claim</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this claim? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteClaim}
        disabled={deleteClaimMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {#if deleteClaimMutation.isPending}
          Deleting...
        {:else}
          Delete Claim
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
