<script lang="ts">
  import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
  import * as Select from "$lib/components/ui/select";
  import {Button} from "$lib/components/ui/button";
  import {Badge} from "$lib/components/ui/badge";
  import {Input} from "$lib/components/ui/input";
  import {Label} from "$lib/components/ui/label";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import {cn} from "$lib/utils";
  import {CircleDollarSign, Plus, AlertTriangle, Trash2, Target, PieChart, Wallet, ArrowRightLeft} from "@lucide/svelte/icons";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {listBudgets, createAllocation, deleteAllocation} from "$lib/query/budgets";
  import type {TransactionsFormat} from "$lib/types";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import Progress from "$lib/components/ui/progress/progress.svelte";

  interface Props {
    open?: boolean;
    transaction?: TransactionsFormat | null;
    onOpenChange?: (open: boolean) => void;
    onAllocationChanged?: () => void;
  }

  let {
    open = $bindable(false),
    transaction,
    onOpenChange,
    onAllocationChanged,
  }: Props = $props();

  const budgetsQuery = listBudgets().options();
  const availableBudgets = $derived.by(() => $budgetsQuery.data ?? []);
  const createAllocationMutation = createAllocation.options();
  const deleteAllocationMutation = deleteAllocation.options();

  // Form state for adding new allocation
  let selectedBudgetId = $state("");
  let allocationAmount = $state("");
  let isSubmitting = $state(false);

  // Validation state
  let validationError = $state("");
  let validationWarning = $state("");

  // Get actual allocations from transaction
  const actualAllocations = $derived.by(() => {
    if (!transaction?.budgetAllocations) return [];
    return transaction.budgetAllocations.map(allocation => ({
      id: allocation.id,
      budgetId: allocation.budgetId,
      budgetName: allocation.budgetName,
      allocatedAmount: Math.abs(allocation.allocatedAmount)
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

  // Real-time validation for allocation amount
  const proposedAmount = $derived.by(() => {
    const amount = Number(allocationAmount);
    return isNaN(amount) ? 0 : Math.abs(amount);
  });

  const wouldBeOverAllocated = $derived.by(() => {
    return proposedAmount > Math.abs(remainingAmount) + 0.01;
  });

  const selectedBudget = $derived.by(() => {
    if (!selectedBudgetId) return null;
    return availableBudgets.find(b => b.id === Number(selectedBudgetId));
  });

  // Simulated budget limits for validation (this would come from real budget data)
  const budgetLimit = $derived.by(() => {
    if (!selectedBudget) return null;
    // Simulate budget limits based on metadata or default values
    const allocatedAmount = selectedBudget.metadata?.allocatedAmount as number | undefined;
    return allocatedAmount || 1000; // Default limit for demo
  });

  const budgetUtilization = $derived.by(() => {
    if (!selectedBudget || !budgetLimit) return 0;
    // Simulate current budget usage (this would come from real data)
    return budgetLimit * 0.3; // 30% used for demo
  });

  const wouldExceedBudgetLimit = $derived.by(() => {
    if (!budgetLimit) return false;
    const currentUsage = budgetUtilization;
    const newTotal = currentUsage + proposedAmount;
    return newTotal > budgetLimit;
  });

  // Reset form when transaction changes or dialog opens
  $effect(() => {
    if (open && transaction) {
      resetForm();
    }
  });

  // Real-time validation feedback
  $effect(() => {
    validationError = "";
    validationWarning = "";

    if (!allocationAmount || !selectedBudgetId) return;

    if (proposedAmount <= 0) {
      validationError = "Amount must be greater than zero";
      return;
    }

    if (wouldBeOverAllocated) {
      validationError = `Cannot allocate more than remaining amount (${currencyFormatter.format(Math.abs(remainingAmount))})`;
      return;
    }

    if (wouldExceedBudgetLimit && budgetLimit) {
      const availableInBudget = budgetLimit - budgetUtilization;
      validationError = `This would exceed the budget limit. Available in budget: ${currencyFormatter.format(availableInBudget)}`;
      return;
    }

    // Show warnings for potentially problematic allocations
    if (selectedBudget && budgetLimit) {
      const utilizationAfter = ((budgetUtilization + proposedAmount) / budgetLimit) * 100;
      if (utilizationAfter > 80) {
        validationWarning = `This allocation will use ${utilizationAfter.toFixed(1)}% of the budget`;
      }
    }

    if (proposedAmount < Math.abs(remainingAmount) && Math.abs(remainingAmount) - proposedAmount > 0.01) {
      const leftOver = Math.abs(remainingAmount) - proposedAmount;
      validationWarning = `${currencyFormatter.format(leftOver)} will remain unallocated`;
    }
  });

  // Form is valid if there are no errors
  const isFormValid = $derived.by(() => {
    return selectedBudgetId && allocationAmount && proposedAmount > 0 && !validationError;
  });

  function resetForm() {
    selectedBudgetId = "";
    allocationAmount = String(Math.abs(remainingAmount));
    isSubmitting = false;
  }


  async function handleAddAllocation() {
    if (!selectedBudgetId || !allocationAmount || !transaction || typeof transaction.id !== 'number') return;

    try {
      isSubmitting = true;
      const amount = Number(allocationAmount);

      // Ensure allocation has the same sign as the transaction
      const signedAmount = transactionAmount >= 0 ? Math.abs(amount) : -Math.abs(amount);

      // Create the allocation using the real API
      await $createAllocationMutation.mutateAsync({
        transactionId: transaction.id,
        budgetId: Number(selectedBudgetId),
        allocatedAmount: signedAmount,
        autoAssigned: false,
        assignedBy: 'user'
      });

      resetForm();
      onAllocationChanged?.();
    } catch (error) {
      console.error("Failed to add budget allocation:", error);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleRemoveAllocation(allocationId: number) {
    try {
      // Delete the allocation using the real API
      await $deleteAllocationMutation.mutateAsync(allocationId);

      onAllocationChanged?.();
    } catch (error) {
      console.error("Failed to remove budget allocation:", error);
    }
  }

  function getBudgetName(budgetId: number): string {
    const budget = availableBudgets.find(b => b.id === budgetId);
    return budget?.name ?? `Budget ${budgetId}`;
  }

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
    if (!newOpen) {
      resetForm();
    }
  }

  // Filter out already allocated budgets from the dropdown
  const availableBudgetOptions = $derived.by(() => {
    const allocatedBudgetIds = new Set(actualAllocations.map(a => a.budgetId));
    return availableBudgets.filter(budget => !allocatedBudgetIds.has(budget.id));
  });
</script>

<ResponsiveSheet bind:open onOpenChange={handleOpenChange}>
  {#snippet header()}
    <div>
      <h2 class="text-lg font-semibold">Manage Budget Allocation</h2>
      <p class="text-sm text-muted-foreground">
        Allocate this transaction to your budgets
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    {#if transaction}
      <div class="space-y-4">
        <!-- Transaction Info -->
        <div class="rounded-lg border bg-gradient-to-r from-muted/50 to-muted/30 p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Wallet class="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 class="font-medium">Transaction Allocation</h3>
              <p class="text-sm text-muted-foreground">Distribute funds across budgets</p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Total Amount</span>
              <span class="text-lg font-mono font-bold">{currencyFormatter.format(Math.abs(transactionAmount))}</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Allocated</span>
                <span class="font-mono">{currencyFormatter.format(totalAllocated)}</span>
              </div>

              <!-- Progress bar showing allocation progress -->
              <div class="relative">
                <Progress value={Math.min(100, (totalAllocated / Math.abs(transactionAmount)) * 100)} class="h-2" />
                {#if totalAllocated > Math.abs(transactionAmount)}
                  <div class="absolute top-0 left-0 h-2 bg-destructive rounded-full" style="width: {Math.min(100, ((totalAllocated - Math.abs(transactionAmount)) / Math.abs(transactionAmount)) * 100)}%"></div>
                {/if}
              </div>

              <div class="flex items-center justify-between text-xs">
                <span class={cn(
                  "font-medium",
                  remainingAmount < 0 ? "text-destructive" : remainingAmount > 0.01 ? "text-orange-600" : "text-emerald-600"
                )}>
                  {remainingAmount < 0 ? "Over-allocated" : remainingAmount > 0.01 ? "Remaining" : "Fully allocated"}
                </span>
                <span class={cn("font-mono font-medium",
                  remainingAmount < 0 ? "text-destructive" : remainingAmount > 0.01 ? "text-orange-600" : "text-emerald-600"
                )}>
                  {currencyFormatter.format(Math.abs(remainingAmount))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Existing Allocations -->
        {#if actualAllocations.length > 0}
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Target class="h-4 w-4 text-emerald-600" />
              <Label class="text-sm font-medium">Current Allocations</Label>
              <Badge variant="secondary" class="text-xs">
                {actualAllocations.length} budget{actualAllocations.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div class="grid gap-3 md:grid-cols-1">
              {#each actualAllocations as allocation (allocation.id)}
                <div class="group relative rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 transition-all hover:shadow-md hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/20 dark:hover:border-emerald-700">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3 flex-1">
                      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 dark:bg-emerald-800 dark:group-hover:bg-emerald-700 transition-colors">
                        <PieChart class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-emerald-900 dark:text-emerald-100 truncate">
                          {allocation.budgetName}
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                          <span class="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            {currencyFormatter.format(allocation.allocatedAmount)}
                          </span>
                          <div class="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <span>•</span>
                            <span>{((allocation.allocatedAmount / Math.abs(transactionAmount)) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <div class="mt-2">
                          <div class="h-1.5 bg-emerald-100 dark:bg-emerald-900 rounded-full overflow-hidden">
                            <div
                              class="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style="width: {Math.min(100, (allocation.allocatedAmount / Math.abs(transactionAmount)) * 100)}%"
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button
                          size="sm"
                          variant="ghost"
                          onclick={() => handleRemoveAllocation(allocation.id)}
                          class="h-8 w-8 p-0 text-emerald-600 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        Remove allocation
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Add New Allocation -->
        {#if availableBudgetOptions.length > 0 && hasUnallocatedAmount}
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Plus class="h-4 w-4 text-primary" />
              <Label class="text-sm font-medium">Add New Allocation</Label>
              <Badge variant="outline" class="text-xs">
                {currencyFormatter.format(Math.abs(remainingAmount))} available
              </Badge>
            </div>

            <div class="space-y-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 transition-all hover:border-primary/50 hover:bg-primary/10">
              <div class="space-y-2">
                <Label for="budget-select" class="text-xs">Budget</Label>
                <Select.Root type="single" bind:value={selectedBudgetId}>
                  <Select.Trigger id="budget-select" class="h-9">
                    <span>{selectedBudgetId ? getBudgetName(Number(selectedBudgetId)) : "Select budget"}</span>
                  </Select.Trigger>
                  <Select.Content>
                    {#each availableBudgetOptions as budget (budget.id)}
                      <Select.Item value={String(budget.id)}>
                        <div class="flex items-center gap-3 w-full">
                          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                            <Target class="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="font-medium truncate">{budget.name}</div>
                            <div class="flex items-center gap-2 text-xs text-muted-foreground">
                              <span class="capitalize">{budget.type}</span>
                              <span>•</span>
                              <span>{budget.status}</span>
                              {#if budget.metadata?.allocatedAmount}
                                <span>•</span>
                                <span>{currencyFormatter.format(budget.metadata.allocatedAmount)}</span>
                              {/if}
                            </div>
                          </div>
                        </div>
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <div class="space-y-2">
                <Label for="amount-input" class="text-xs">Amount</Label>
                <Input
                  id="amount-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  bind:value={allocationAmount}
                  class={cn("h-9", validationError ? "border-red-500 focus:border-red-500" : "")}
                />

                <!-- Real-time validation feedback -->
                {#if validationError}
                  <div class="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle class="h-3 w-3" />
                    <span>{validationError}</span>
                  </div>
                {:else if validationWarning}
                  <div class="flex items-center gap-1 text-xs text-orange-600">
                    <AlertTriangle class="h-3 w-3" />
                    <span>{validationWarning}</span>
                  </div>
                {/if}

                <!-- Budget utilization info -->
                {#if selectedBudget && budgetLimit}
                  <div class="text-xs text-muted-foreground">
                    Budget usage: {currencyFormatter.format(budgetUtilization)} / {currencyFormatter.format(budgetLimit)}
                    ({((budgetUtilization / budgetLimit) * 100).toFixed(1)}%)
                  </div>
                {/if}
              </div>

              <!-- Quick allocation buttons -->
              {#if remainingAmount > 0.01}
                <div class="space-y-2">
                  <Label class="text-xs">Quick Allocations</Label>
                  <div class="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => allocationAmount = String(Math.abs(remainingAmount))}
                      class="text-xs"
                    >
                      <ArrowRightLeft class="h-3 w-3 mr-1" />
                      All ({currencyFormatter.format(Math.abs(remainingAmount))})
                    </Button>
                    {#if Math.abs(remainingAmount) >= 2}
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => allocationAmount = String(Math.abs(remainingAmount) / 2)}
                        class="text-xs"
                      >
                        Half ({currencyFormatter.format(Math.abs(remainingAmount) / 2)})
                      </Button>
                    {/if}
                    {#if Math.abs(remainingAmount) >= 4}
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => allocationAmount = String(Math.abs(remainingAmount) / 4)}
                        class="text-xs"
                      >
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
                size="sm"
              >
                {#if isSubmitting}
                  <div class="flex items-center gap-2">
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding to Budget...
                  </div>
                {:else}
                  <div class="flex items-center gap-2">
                    <Plus class="h-4 w-4" />
                    Add to Budget ({currencyFormatter.format(proposedAmount)})
                  </div>
                {/if}
              </Button>
            </div>
          </div>
        {:else if !hasUnallocatedAmount}
          <div class="rounded-lg border bg-green-50 p-3 text-center dark:bg-green-950/20">
            <CircleDollarSign class="mx-auto h-8 w-8 text-green-600" />
            <p class="mt-2 text-sm font-medium text-green-800 dark:text-green-200">
              Transaction Fully Allocated
            </p>
            <p class="text-xs text-green-600 dark:text-green-400">
              All funds have been allocated to budgets
            </p>
          </div>
        {:else if availableBudgetOptions.length === 0}
          <div class="rounded-lg border bg-muted/50 p-3 text-center">
            <AlertTriangle class="mx-auto h-8 w-8 text-muted-foreground" />
            <p class="mt-2 text-sm font-medium">No Available Budgets</p>
            <p class="text-xs text-muted-foreground">
              All budgets have been allocated or no budgets exist
            </p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex items-center justify-center py-8">
        <div class="text-center">
          <AlertTriangle class="mx-auto h-8 w-8 text-muted-foreground" />
          <p class="mt-2 text-sm text-muted-foreground">No transaction selected</p>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-end">
      <Button variant="outline" onclick={() => handleOpenChange(false)}>
        Done
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
