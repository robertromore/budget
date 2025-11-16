<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label/label.svelte";
  import {
    createAllocation,
    deleteAllocation,
    listBudgets,
    validateAllocation,
  } from "$lib/query/budgets";
  import type { BudgetTransaction } from "$lib/schema/budgets";
  import type { BudgetWithRelations } from "$lib/server/domains/budgets";
  import type { AllocationValidationResult } from "$lib/server/domains/budgets/services";
  import { cn } from "$lib/utils";
  import { currencyFormatter, formatBudgetName, toSignedAmount } from "$lib/utils/formatters";
  import { AlertTriangle, CheckCircle, Plus, Wallet, X } from "@lucide/svelte/icons";
  import BudgetSelector from "./budget-selector.svelte";

  interface Props {
    transactionId: number;
    transactionAmount: number;
    existingAllocations?: BudgetTransaction[];
    class?: string;
    onAllocationCreated?: (allocation: BudgetTransaction) => void;
    onAllocationRemoved?: (allocationId: number) => void;
    onValidationResult?: (result: AllocationValidationResult) => void;
  }

  let {
    transactionId,
    transactionAmount,
    existingAllocations = [],
    class: className,
    onAllocationCreated,
    onAllocationRemoved,
    onValidationResult,
  }: Props = $props();

  const budgetsQuery = listBudgets("active").options();
  const availableBudgets = $derived.by(() => budgetsQuery.data ?? []);
  const isBudgetsLoading = $derived.by(() => budgetsQuery.isPending);
  const budgetLookup = $derived(
    new Map<number, BudgetWithRelations>(availableBudgets.map((budget) => [budget.id, budget]))
  );

  let selectedBudgetId = $state<string>('');
  let allocationInput = $state<string>("");

  let validationResult = $state<AllocationValidationResult | null>(null);
  let validationError = $state<string | null>(null);
  let validationPending = $state(false);
  let validationController: AbortController | null = null;

  const createAllocationMutation = createAllocation.options();
  const deleteAllocationMutation = deleteAllocation.options();
  const isCreating = $derived(createAllocationMutation.isPending);
  const isDeleting = $derived(deleteAllocationMutation.isPending);

  const normalizedTransactionAmount = $derived(Math.abs(transactionAmount));
  const existingAllocated = $derived(
    existingAllocations.reduce((sum, allocation) => sum + Math.abs(allocation.allocatedAmount), 0)
  );
  const inputAmount = $derived.by(() => {
    const value = parseFloat(allocationInput);
    return Number.isFinite(value) && value > 0 ? Math.abs(value) : 0;
  });
  const remaining = $derived(normalizedTransactionAmount - existingAllocated - inputAmount);

  const isFormValid = $derived.by(() => {
    if (!selectedBudgetId) return false;
    if (inputAmount <= 0) return false;
    if (validationPending) return false;
    return validationResult?.isValid ?? false;
  });

  const remainingClass = $derived(remaining < 0 ? "text-destructive" : "text-foreground");
  const remainingDisplay = $derived(currencyFormatter.format(Math.abs(remaining)));
  const transactionDisplay = $derived(currencyFormatter.format(normalizedTransactionAmount));


  const shouldValidate = $derived.by(() => {
    const budgetId = selectedBudgetId;
    const amount = parseFloat(allocationInput);

    if (!budgetId || !Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return { budgetId, amount };
  });

  $effect(() => {
    // Cancel any pending validation
    if (validationController) {
      validationController.abort();
    }

    const validation = shouldValidate;

    if (!validation) {
      validationResult = null;
      validationError = null;
      validationPending = false;
      return;
    }

    validationPending = true;
    const controller = new AbortController();
    validationController = controller;

    const performValidation = async () => {
      try {
        const result = await validateAllocation(
          transactionId,
          toSignedAmount(validation.amount, transactionAmount)
        ).execute();

        if (controller.signal.aborted) return;

        validationResult = result;
        validationError = null;
        validationPending = false;
        onValidationResult?.(result);
      } catch (error) {
        if (controller.signal.aborted) return;

        validationResult = null;
        validationError = error instanceof Error ? error.message : "Unable to validate allocation.";
        validationPending = false;
      }
    };

    performValidation();

    return () => {
      controller.abort();
    };
  });



  function resetAllocationForm() {
    selectedBudgetId = "";
    allocationInput = "";
    validationResult = null;
    validationError = null;
    if (validationController) {
      validationController.abort();
      validationController = null;
    }
  }

  async function handleCreateAllocation() {
    if (!isFormValid || !selectedBudgetId) return;

    try {
      const allocation = await createAllocationMutation.mutateAsync({
        transactionId,
        budgetId: parseInt(selectedBudgetId, 10),
        allocatedAmount: toSignedAmount(parseFloat(allocationInput), transactionAmount),
        autoAssigned: false,
        assignedBy: "user",
      });

      resetAllocationForm();
      onAllocationCreated?.(allocation);
    } catch (error) {
      console.error("Failed to create allocation", error);
    }
  }

  async function handleRemoveAllocation(allocationId: number) {
    try {
      await deleteAllocationMutation.mutateAsync(allocationId);
      onAllocationRemoved?.(allocationId);
    } catch (error) {
      console.error("Failed to remove allocation", error);
    }
  }
</script>

<Card.Root class={cn("w-full", className)}>
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      <Wallet class="h-5 w-5" />
      Budget Allocation
    </Card.Title>
    <Card.Description>
      Assign transaction amounts to budgets for tracking and enforcement.
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    <div class="flex flex-col justify-between gap-4 rounded-lg bg-muted p-3 md:flex-row md:items-center">
      <div>
        <span class="text-sm font-medium">Transaction Amount</span>
        <div class="text-lg font-bold">{transactionDisplay}</div>
      </div>
      <div class="text-right">
        <span class="text-sm text-muted-foreground">Remaining (incl. new allocation)</span>
        <div class={cn("text-lg font-bold", remainingClass)}>{remainingDisplay}</div>
      </div>
    </div>

    {#if existingAllocations.length > 0}
      <div class="space-y-2">
        <Label class="text-sm font-medium">Current Allocations</Label>
        <div class="space-y-2">
          {#each existingAllocations as allocation (allocation.id)}
            <div class="flex items-center justify-between rounded-md border p-2">
              <div class="flex items-center gap-2">
                <Badge variant="outline">{formatBudgetName(allocation.budgetId, budgetLookup.get(allocation.budgetId)?.name)}</Badge>
                <span class="text-sm">{currencyFormatter.format(Math.abs(allocation.allocatedAmount))}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onclick={() => handleRemoveAllocation(allocation.id)}
                disabled={isDeleting}
              >
                <X class="h-4 w-4" />
                <span class="sr-only">Remove allocation</span>
              </Button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="space-y-4 border-t pt-4">
      <Label class="text-sm font-medium">Add New Allocation</Label>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label>Budget</Label>
          <BudgetSelector
            bind:value={selectedBudgetId}
            budgets={availableBudgets}
            placeholder={isBudgetsLoading ? "Loading budgets..." : "Select a budget"}
            disabled={isBudgetsLoading || availableBudgets.length === 0}
          />
          {#if !isBudgetsLoading && availableBudgets.length === 0}
            <p class="text-xs text-muted-foreground">No active budgets available.</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="allocation-amount">Amount</Label>
          <Input
            id="allocation-amount"
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0"
            bind:value={allocationInput}
            placeholder="0.00"
          />
          <p class="text-xs text-muted-foreground">
            Sign is applied automatically based on the transaction direction.
          </p>
        </div>
      </div>

      {#if validationPending}
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
          Validating allocation...
        </div>
      {:else if validationResult}
        <div
          class={cn(
            "flex items-start gap-2 rounded-lg p-3",
            validationResult.isValid
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {#if validationResult.isValid}
            <CheckCircle class="mt-0.5 h-4 w-4 shrink-0" />
          {:else}
            <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
          {/if}
          <div class="flex-1 space-y-1 text-sm">
            <p class="font-medium">
              {validationResult.isValid ? "Allocation looks good" : "Allocation needs attention"}
            </p>
            <p class="text-xs opacity-80">
              Remaining after allocation: {currencyFormatter.format(Math.abs(validationResult.remaining))}
            </p>
            {#if !validationResult.isValid}
              {@const baseMessages = validationResult.errors ?? []}
              {@const messages = [
                ...baseMessages,
                ...(validationResult.hasSignMismatch
                  ? ["Allocation does not match the transaction direction."]
                  : []),
                ...(validationResult.wouldExceed
                  ? ["Allocation would exceed the remaining transaction amount."]
                  : []),
              ]}
              {#if messages.length}
                <ul class="space-y-1">
                  {#each messages as message}
                    <li>• {message}</li>
                  {/each}
                </ul>
              {/if}
            {/if}
          </div>
        </div>
      {:else if validationError}
        <div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      {/if}

      <Button
        type="button"
        class="w-full"
        onclick={handleCreateAllocation}
        disabled={!isFormValid || isCreating}
      >
        {#if isCreating}
          <span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
          Creating Allocation...
        {:else}
          <Plus class="mr-2 h-4 w-4" />
          Add Allocation
        {/if}
      </Button>
    </div>
  </Card.Content>
</Card.Root>
