<script lang="ts">
  import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
  import * as Select from "$lib/components/ui/select";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label/label.svelte";
  import {Textarea} from "$lib/components/ui/textarea";
  import {Badge} from "$lib/components/ui/badge";
  import NumericInput from "$lib/components/input/numeric-input.svelte";
  import {updateBudget, deleteBudget} from "$lib/query/budgets";
  import {AccountsState} from "$lib/states/entities/accounts.svelte";
  import type {UpdateBudgetRequest} from "$lib/server/domains/budgets/services";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {Account} from "$lib/schema/accounts";
  import {budgetStatuses, budgetEnforcementLevels} from "$lib/schema/budgets";

  interface Props {
    budget: BudgetWithRelations | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onBudgetUpdated?: () => void;
    onBudgetDeleted?: () => void;
  }

  let {
    budget,
    open = $bindable(false),
    onOpenChange,
    onBudgetUpdated,
    onBudgetDeleted,
  }: Props = $props();

  const accountsState = AccountsState.get();
  const updateBudgetMutation = updateBudget.options();
  const deleteBudgetMutation = deleteBudget.options();

  const availableAccounts = $derived.by(() => accountsState.getSortedActiveAccounts());
  const isLoading = $derived.by(() => $updateBudgetMutation.isPending || $deleteBudgetMutation.isPending);

  let name = $state("");
  let description = $state("");
  let status = $state("");
  let enforcementLevel = $state("");
  let selectedAccountIds = $state<string[]>([]);
  let allocatedAmount = $state(0);

  let deleteDialogOpen = $state(false);

  const accountMap = $derived.by(() =>
    new Map(availableAccounts.map(account => [String(account.id), account]))
  );

  const selectedAccounts = $derived.by(() =>
    selectedAccountIds.map(id => accountMap.get(id)).filter(Boolean) as Account[]
  );

  const hasChanges = $derived.by(() => {
    if (!budget) return false;

    const currentAccountIds = budget.accounts?.map(a => String(a.id)) ?? [];
    const currentAllocation = (budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number;

    return name !== budget.name ||
           description !== (budget.description ?? "") ||
           status !== budget.status ||
           enforcementLevel !== budget.enforcementLevel ||
           JSON.stringify(selectedAccountIds.sort()) !== JSON.stringify(currentAccountIds.sort()) ||
           allocatedAmount !== (currentAllocation ?? 0);
  });

  function initializeForm() {
    if (!budget) return;

    name = budget.name;
    description = budget.description ?? "";
    status = budget.status;
    enforcementLevel = budget.enforcementLevel ?? "warning";
    selectedAccountIds = budget.accounts?.map(a => String(a.id)) ?? [];

    const currentAllocation = (budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number;
    allocatedAmount = currentAllocation ?? 0;
  }

  function addAccount(accountId: string) {
    if (!selectedAccountIds.includes(accountId)) {
      selectedAccountIds = [...selectedAccountIds, accountId];
    }
  }

  function removeAccount(accountId: string) {
    selectedAccountIds = selectedAccountIds.filter(id => id !== accountId);
  }

  function resetForm() {
    initializeForm();
  }

  async function handleSubmit() {
    if (!budget || !hasChanges) return;

    try {
      const updateData: UpdateBudgetRequest = {};

      if (name !== budget.name) {
        updateData.name = name.trim();
      }

      if (description !== (budget.description ?? "")) {
        updateData.description = description.trim() || null;
      }

      if (status !== budget.status) {
        updateData.status = status as any;
      }

      if (enforcementLevel !== budget.enforcementLevel) {
        updateData.enforcementLevel = enforcementLevel as any;
      }

      const currentAccountIds = budget.accounts?.map(a => String(a.id)) ?? [];
      if (JSON.stringify(selectedAccountIds.sort()) !== JSON.stringify(currentAccountIds.sort())) {
        updateData.accountIds = selectedAccountIds.map(id => Number(id));
      }

      const currentAllocation = (budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number;
      if (allocatedAmount !== (currentAllocation ?? 0)) {
        updateData.metadata = {
          ...budget.metadata,
          allocatedAmount: allocatedAmount,
        };
      }

      await $updateBudgetMutation.mutateAsync({
        id: budget.id,
        data: updateData,
      });

      open = false;
      onOpenChange?.(false);
      onBudgetUpdated?.();
    } catch (error) {
      console.error("Failed to update budget:", error);
    }
  }

  async function handleDelete() {
    if (!budget) return;

    try {
      await $deleteBudgetMutation.mutateAsync(budget.id);

      deleteDialogOpen = false;
      open = false;
      onOpenChange?.(false);
      onBudgetDeleted?.();
    } catch (error) {
      console.error("Failed to delete budget:", error);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
    if (newOpen && budget) {
      initializeForm();
    }
  }

  $effect(() => {
    if (open && budget) {
      initializeForm();
    }
  });
</script>

<ResponsiveSheet bind:open onOpenChange={handleOpenChange}>
  {#snippet header()}
    <h2 class="text-lg font-semibold">Manage Budget</h2>
    <p class="text-sm text-muted-foreground">
      Edit budget settings or delete this budget.
    </p>
  {/snippet}

  {#snippet content()}
    {#if budget}
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <div class="space-y-2">
          <Label for="budget-name">Budget Name</Label>
          <Input
            id="budget-name"
            bind:value={name}
            placeholder="e.g., Monthly Expenses"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="budget-description">Description (optional)</Label>
          <Textarea
            id="budget-description"
            bind:value={description}
            placeholder="Describe what this budget covers..."
            rows={2}
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="budget-status">Status</Label>
            <Select.Root type="single" bind:value={status}>
              <Select.Trigger>
                <span class="capitalize">{status || "Select status"}</span>
              </Select.Trigger>
              <Select.Content>
                {#each budgetStatuses as statusOption}
                  <Select.Item value={statusOption}>
                    <span class="capitalize">{statusOption}</span>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>

          <div class="space-y-2">
            <Label for="budget-enforcement">Enforcement</Label>
            <Select.Root type="single" bind:value={enforcementLevel}>
              <Select.Trigger>
                <span class="capitalize">{enforcementLevel || "Select level"}</span>
              </Select.Trigger>
              <Select.Content>
                {#each budgetEnforcementLevels as level}
                  <Select.Item value={level}>
                    <span class="capitalize">{level}</span>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="budget-amount">Monthly Allocation</Label>
          <NumericInput bind:value={allocatedAmount} buttonClass="w-full" />
        </div>

        <div class="space-y-2">
          <Label>Accounts</Label>
          <Select.Root
            type="single"
            onValueChange={(value) => value && addAccount(value)}
          >
            <Select.Trigger>
              Select accounts to include
            </Select.Trigger>
            <Select.Content>
              {#each availableAccounts as account (account.id)}
                {#if !selectedAccountIds.includes(String(account.id))}
                  <Select.Item value={String(account.id)}>
                    {account.name}
                  </Select.Item>
                {/if}
              {/each}
            </Select.Content>
          </Select.Root>

          {#if selectedAccounts.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each selectedAccounts as account (account.id)}
                <Badge variant="secondary" class="flex items-center gap-1">
                  {account.name}
                  <button
                    type="button"
                    onclick={() => removeAccount(String(account.id))}
                    class="ml-1 rounded-full hover:bg-secondary-foreground/20"
                  >
                    <span class="sr-only">Remove {account.name}</span>
                    ×
                  </button>
                </Badge>
              {/each}
            </div>
          {/if}
        </div>
      </form>
    {/if}
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-between gap-2">
      <Button
        type="button"
        variant="destructive"
        onclick={() => deleteDialogOpen = true}
        disabled={isLoading}
      >
        Delete Budget
      </Button>

      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onclick={() => handleOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onclick={handleSubmit}
          disabled={!hasChanges || isLoading}
        >
          {#if $updateBudgetMutation.isPending}
            Updating...
          {:else}
            Update Budget
          {/if}
        </Button>
      </div>
    </div>
  {/snippet}
</ResponsiveSheet>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Budget</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{budget?.name}"? This action cannot be undone and will remove all associated budget data including periods and allocations.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleDelete}
        disabled={$deleteBudgetMutation.isPending}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {#if $deleteBudgetMutation.isPending}
          Deleting...
        {:else}
          Delete Budget
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
