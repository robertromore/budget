<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { Label } from '$lib/components/ui/label';
import { AllocationProgress } from '$lib/components/ui/progress';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Select from '$lib/components/ui/select';
import * as Tooltip from '$lib/components/ui/tooltip';
import {
  createAllocation,
  deleteAllocation,
  getBudgetSuggestions,
  listBudgets,
  type BudgetSuggestion,
} from '$lib/query/budgets';
import type { TransactionsFormat } from '$lib/types';
import { cn, formatPercent } from '$lib/utils';
import { toISOString } from '$lib/utils/dates';
import { currencyFormatter } from '$lib/utils/formatters';
import {
  ArrowRightLeft,
  CircleDollarSign,
  Lightbulb,
  PieChart,
  Plus,
  Target,
  Trash2,
  TriangleAlert,
} from '@lucide/svelte/icons';

interface Props {
  open?: boolean;
  transaction?: TransactionsFormat | null;
  onOpenChange?: (open: boolean) => void;
  onAllocationChanged?: () => void;
}

let { open = $bindable(false), transaction, onOpenChange, onAllocationChanged }: Props = $props();

const budgetsQuery = listBudgets().options();
const availableBudgets = $derived.by(() => budgetsQuery.data ?? []);
const createAllocationMutation = createAllocation.options();
const deleteAllocationMutation = deleteAllocation.options();

// Get budget suggestions based on transaction details
const budgetSuggestionsQuery = $derived(
  getBudgetSuggestions.options({
    accountId: transaction?.accountId || 0,
    categoryId: transaction?.categoryId || null,
    payeeId: transaction?.payeeId || null,
    amount: transaction?.amount || 0,
    date: transaction?.date ? toISOString(transaction.date) : '',
  })
);

// Get the top suggestion
const topSuggestion = $derived.by((): BudgetSuggestion | null => {
  const data = budgetSuggestionsQuery.data;
  if (!data || data.length === 0) return null;
  return data[0] ?? null;
});

// Form state for adding new allocation
let selectedBudgetId = $state('');
let allocationAmount = $state<number | undefined>(undefined);
let isSubmitting = $state(false);
let budgetSearchQuery = $state('');

// Validation state
let validationError = $state('');
let validationWarning = $state('');

// Get actual allocations from transaction
const actualAllocations = $derived.by(() => {
  if (!transaction?.budgetAllocations) return [];
  return transaction.budgetAllocations.map((allocation) => ({
    id: allocation.id,
    budgetId: allocation.budgetId,
    budgetName: allocation.budgetName,
    allocatedAmount: Math.abs(allocation.allocatedAmount),
  }));
});

// Derived calculations
const transactionAmount = $derived.by(() => transaction?.amount || 0);
const totalAllocated = $derived.by(() =>
  actualAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0)
);
const remainingAmount = $derived.by(() => Math.abs(transactionAmount) - totalAllocated);
const isFullyAllocated = $derived.by(() => Math.abs(remainingAmount) < 0.01);
const hasUnallocatedAmount = $derived.by(() => Math.abs(remainingAmount) > 0.01);
const allocationPercent = $derived.by(() => {
  const total = Math.abs(transactionAmount);
  if (total === 0) return 0;
  return Math.round((totalAllocated / total) * 100);
});

// Real-time validation for allocation amount
const proposedAmount = $derived.by(() => {
  if (allocationAmount === undefined || allocationAmount === null) return 0;
  return Math.abs(allocationAmount);
});

const wouldBeOverAllocated = $derived.by(() => {
  return proposedAmount > Math.abs(remainingAmount) + 0.01;
});

const selectedBudget = $derived.by(() => {
  if (!selectedBudgetId) return null;
  return availableBudgets.find((b) => b.id === Number(selectedBudgetId));
});

// Reset form when transaction changes or dialog opens
$effect(() => {
  if (open && transaction) {
    resetForm();
  }
});

// Auto-select top suggestion when it becomes available
$effect(() => {
  if (topSuggestion && !selectedBudgetId && open) {
    selectedBudgetId = String(topSuggestion.budgetId);
  }
});

// Real-time validation feedback
$effect(() => {
  validationError = '';
  validationWarning = '';

  if (allocationAmount === undefined || allocationAmount === 0 || !selectedBudgetId) return;

  if (proposedAmount <= 0) {
    validationError = 'Amount must be greater than zero';
    return;
  }

  if (wouldBeOverAllocated) {
    validationError = `Cannot allocate more than remaining amount (${currencyFormatter.format(Math.abs(remainingAmount))})`;
    return;
  }

  if (
    proposedAmount < Math.abs(remainingAmount) &&
    Math.abs(remainingAmount) - proposedAmount > 0.01
  ) {
    const leftOver = Math.abs(remainingAmount) - proposedAmount;
    validationWarning = `${currencyFormatter.format(leftOver)} will remain unallocated`;
  }
});

// Form is valid if there are no errors
const isFormValid = $derived.by(() => {
  return (
    selectedBudgetId && allocationAmount !== undefined && proposedAmount > 0 && !validationError
  );
});

function resetForm() {
  selectedBudgetId = '';
  allocationAmount = Math.abs(remainingAmount);
  isSubmitting = false;
  budgetSearchQuery = '';
}

async function handleAddAllocation() {
  if (
    !selectedBudgetId ||
    allocationAmount === undefined ||
    !transaction ||
    typeof transaction.id !== 'number'
  )
    return;

  try {
    isSubmitting = true;

    const signedAmount =
      transactionAmount >= 0 ? Math.abs(allocationAmount) : -Math.abs(allocationAmount);

    await createAllocationMutation.mutateAsync({
      transactionId: transaction.id,
      budgetId: Number(selectedBudgetId),
      allocatedAmount: signedAmount,
      autoAssigned: false,
      assignedBy: 'user',
    });

    resetForm();
    onAllocationChanged?.();
  } catch {
    // Error handled by mutation's error toast
  } finally {
    isSubmitting = false;
  }
}

async function handleRemoveAllocation(allocationId: number) {
  try {
    await deleteAllocationMutation.mutateAsync(allocationId);
    onAllocationChanged?.();
  } catch {
    // Error handled by mutation's error toast
  }
}

function handleOpenChange(newOpen: boolean) {
  open = newOpen;
  onOpenChange?.(newOpen);
  if (!newOpen) {
    resetForm();
  }
}

// Filter out already allocated budgets from the dropdown
const allocatedBudgetIds = $derived(new Set(actualAllocations.map((a) => a.budgetId)));
const availableBudgetOptions = $derived.by(() => {
  let filtered = availableBudgets.filter((budget) => !allocatedBudgetIds.has(budget.id));
  if (budgetSearchQuery) {
    const q = budgetSearchQuery.toLowerCase();
    filtered = filtered.filter((b) => b.name.toLowerCase().includes(q));
  }
  return filtered;
});

const hasBudgets = $derived(availableBudgets.length > 0);
</script>

<ResponsiveSheet bind:open onOpenChange={handleOpenChange}>
  {#snippet header()}
    <div>
      <h2 class="text-lg font-semibold">Manage Budget Allocation</h2>
      <p class="text-muted-foreground text-sm">Allocate this transaction to your budgets</p>
    </div>
  {/snippet}

  {#snippet content()}
    {#if transaction}
      <div class="space-y-4">
        <!-- Allocation Summary -->
        <div class="rounded-lg border p-4">
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-medium">Total Amount</span>
            <span class="font-mono text-lg font-bold">
              {currencyFormatter.format(Math.abs(transactionAmount))}
            </span>
          </div>

          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Allocated ({allocationPercent}%)</span>
              <span class="font-mono">{currencyFormatter.format(totalAllocated)}</span>
            </div>

            <AllocationProgress
              value={totalAllocated}
              projected={proposedAmount}
              max={Math.abs(transactionAmount)}
              class="h-2" />

            <div class="flex items-center justify-between text-xs">
              <span
                class={cn(
                  'font-medium',
                  remainingAmount < 0
                    ? 'text-destructive'
                    : remainingAmount > 0.01
                      ? 'text-warning'
                      : 'text-success'
                )}>
                {remainingAmount < 0
                  ? 'Over-allocated'
                  : remainingAmount > 0.01
                    ? 'Remaining'
                    : 'Fully allocated'}
              </span>
              <span
                class={cn(
                  'font-mono font-medium',
                  remainingAmount < 0
                    ? 'text-destructive'
                    : remainingAmount > 0.01
                      ? 'text-warning'
                      : 'text-success'
                )}>
                {currencyFormatter.format(Math.abs(remainingAmount))}
              </span>
            </div>
          </div>
        </div>

        <!-- Existing Allocations -->
        {#if actualAllocations.length > 0}
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Target class="text-success h-4 w-4" />
              <Label class="text-sm font-medium">Current Allocations</Label>
              <Badge variant="secondary" class="text-xs">
                {actualAllocations.length}
              </Badge>
            </div>
            <div class="space-y-2">
              {#each actualAllocations as allocation (allocation.id)}
                <div
                  class="group flex items-center gap-3 rounded-lg border bg-success-bg p-3">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <PieChart class="h-4 w-4 text-success" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium">{allocation.budgetName}</div>
                    <div class="text-muted-foreground flex items-center gap-2 text-xs">
                      <span class="font-mono font-medium">
                        {currencyFormatter.format(allocation.allocatedAmount)}
                      </span>
                      <span>·</span>
                      <span>
                        {formatPercent(
                          allocation.allocatedAmount / Math.abs(transactionAmount),
                          1
                        )}
                      </span>
                    </div>
                  </div>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Button
                        size="sm"
                        variant="ghost"
                        onclick={() => handleRemoveAllocation(allocation.id)}
                        aria-label="Remove allocation from {allocation.budgetName}"
                        class="hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Remove allocation</Tooltip.Content>
                  </Tooltip.Root>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Add New Allocation -->
        {#if availableBudgetOptions.length > 0 && hasUnallocatedAmount}
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Plus class="text-primary h-4 w-4" />
              <Label class="text-sm font-medium">
                {actualAllocations.length === 0 ? 'Allocate to Budget' : 'Add Another Allocation'}
              </Label>
              <Badge variant="outline" class="text-xs">
                {currencyFormatter.format(Math.abs(remainingAmount))} available
              </Badge>
            </div>
            {#if actualAllocations.length === 0}
              <p class="text-muted-foreground text-xs">
                Distribute this transaction across one or more budgets.
              </p>
            {/if}

            <div class="space-y-4 rounded-lg border p-4">
              {#if topSuggestion}
                <div class="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Lightbulb class="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Suggested: <span class="text-foreground font-medium"
                      >{topSuggestion.budgetName}</span>
                    <span class="text-muted-foreground/70"
                      >({topSuggestion.confidence}% confident)</span>
                  </span>
                </div>
              {/if}

              <div class="space-y-2">
                <Label for="budget-select" class="text-xs">Budget</Label>
                <Select.Root type="single" bind:value={selectedBudgetId}>
                  <Select.Trigger id="budget-select" class="h-auto! w-full whitespace-normal">
                    <div class="flex items-center gap-2 py-0.5">
                      <Target class="text-muted-foreground h-4 w-4 shrink-0" />
                      {#if selectedBudgetId && selectedBudget}
                        <div class="flex min-w-0 flex-col items-start">
                          <span class="truncate text-sm font-medium">{selectedBudget.name}</span>
                          <span class="text-muted-foreground text-xs capitalize">
                            {selectedBudget.type.replace('-', ' ')}
                          </span>
                        </div>
                      {:else}
                        <span class="text-muted-foreground">Select budget...</span>
                      {/if}
                    </div>
                  </Select.Trigger>
                  <Select.Content>
                    {#if availableBudgets.length > 5}
                      <div class="p-2">
                        <Input
                          type="text"
                          placeholder="Search budgets..."
                          class="h-8 text-sm"
                          bind:value={budgetSearchQuery} />
                      </div>
                    {/if}
                    {#each availableBudgetOptions as budget (budget.id)}
                      <Select.Item value={String(budget.id)} class="cursor-pointer py-2">
                        <div class="flex w-full items-center gap-3">
                          <div class="min-w-0 flex-1">
                            <div class="truncate font-medium">{budget.name}</div>
                            <div class="text-muted-foreground text-xs capitalize">
                              {budget.type.replace('-', ' ')}
                              {#if budget.metadata?.allocatedAmount}
                                · {currencyFormatter.format(
                                  budget.metadata.allocatedAmount as number
                                )} budgeted
                              {/if}
                            </div>
                          </div>
                        </div>
                      </Select.Item>
                    {:else}
                      <div class="text-muted-foreground px-2 py-4 text-center text-sm">
                        No budgets match "{budgetSearchQuery}"
                      </div>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <div class="space-y-2">
                <Label class="text-xs">Amount</Label>
                <NumericInput
                  bind:value={allocationAmount}
                  onSubmit={handleAddAllocation}
                  buttonClass={cn('w-full h-9', validationError ? 'border-destructive' : '')} />

                {#if validationError}
                  <div
                    id="amount-error"
                    role="alert"
                    class="flex items-center gap-1 text-xs text-destructive">
                    <TriangleAlert class="h-3 w-3" aria-hidden="true" />
                    <span>{validationError}</span>
                  </div>
                {:else if validationWarning}
                  <div
                    id="amount-warning"
                    role="status"
                    class="flex items-center gap-1 text-xs text-warning">
                    <TriangleAlert class="h-3 w-3" aria-hidden="true" />
                    <span>{validationWarning}</span>
                  </div>
                {/if}
              </div>

              <!-- Quick allocation buttons -->
              {#if remainingAmount > 0.01}
                <div class="space-y-2">
                  <Label class="text-xs">Quick Allocations</Label>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => (allocationAmount = Math.abs(remainingAmount))}
                      class="text-xs">
                      <ArrowRightLeft class="mr-1 h-3 w-3" />
                      All ({currencyFormatter.format(Math.abs(remainingAmount))})
                    </Button>
                    {#if Math.abs(remainingAmount) >= 2}
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => (allocationAmount = Math.abs(remainingAmount) / 2)}
                        class="text-xs">
                        Half ({currencyFormatter.format(Math.abs(remainingAmount) / 2)})
                      </Button>
                    {/if}
                    {#if Math.abs(remainingAmount) >= 4}
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => (allocationAmount = Math.abs(remainingAmount) / 4)}
                        class="text-xs">
                        Quarter ({currencyFormatter.format(Math.abs(remainingAmount) / 4)})
                      </Button>
                    {/if}
                  </div>
                </div>
              {/if}

              <Button
                onclick={handleAddAllocation}
                disabled={!isFormValid || isSubmitting}
                class="w-full"
                size="sm">
                {#if isSubmitting}
                  <div class="flex items-center gap-2">
                    <div
                      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent">
                    </div>
                    Adding...
                  </div>
                {:else}
                  <Plus class="mr-1.5 h-4 w-4" />
                  Add to Budget ({currencyFormatter.format(proposedAmount)})
                {/if}
              </Button>
            </div>
          </div>
        {:else if !hasUnallocatedAmount}
          <div class="rounded-lg border bg-success-bg p-4 text-center">
            <CircleDollarSign class="text-success mx-auto h-8 w-8" />
            <p class="text-success-fg mt-2 text-sm font-medium">Fully Allocated</p>
            <p class="text-muted-foreground mt-1 text-xs">
              All funds have been distributed to budgets
            </p>
          </div>
        {:else if !hasBudgets}
          <div class="rounded-lg border p-4 text-center">
            <Target class="text-muted-foreground mx-auto h-8 w-8" />
            <p class="mt-2 text-sm font-medium">No Budgets</p>
            <p class="text-muted-foreground mt-1 text-xs">
              Create a budget to start allocating transactions
            </p>
            <Button variant="outline" size="sm" href="/budgets/new" class="mt-3">
              <Plus class="mr-1.5 h-3.5 w-3.5" />
              Create Budget
            </Button>
          </div>
        {:else}
          <div class="rounded-lg border p-4 text-center">
            <TriangleAlert class="text-muted-foreground mx-auto h-8 w-8" />
            <p class="mt-2 text-sm font-medium">All Budgets Allocated</p>
            <p class="text-muted-foreground mt-1 text-xs">
              This transaction is already allocated to all available budgets
            </p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex items-center justify-center py-8">
        <div class="text-center">
          <TriangleAlert class="text-muted-foreground mx-auto h-8 w-8" />
          <p class="text-muted-foreground mt-2 text-sm">No transaction selected</p>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet footer()}
    <div class="flex items-center justify-between">
      {#if hasUnallocatedAmount && actualAllocations.length > 0}
        <p class="text-muted-foreground text-xs">
          {currencyFormatter.format(Math.abs(remainingAmount))} remains unallocated
        </p>
      {:else}
        <div></div>
      {/if}
      <Button
        variant={isFullyAllocated ? 'default' : 'outline'}
        onclick={() => handleOpenChange(false)}>
        Done
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
