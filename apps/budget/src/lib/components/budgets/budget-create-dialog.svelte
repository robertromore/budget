<script lang="ts">
  import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
  import * as Select from "$lib/components/ui/select";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label/label.svelte";
  import {Textarea} from "$lib/components/ui/textarea";
  import {Badge} from "$lib/components/ui/badge";
  import NumericInput from "$lib/components/input/numeric-input.svelte";
  import {createBudget} from "$lib/query/budgets";
  import {AccountsState} from "$lib/states/entities/accounts.svelte";
  import {newBudgetDialog, managingBudgetId} from "$lib/states/ui/global.svelte";
  import type {CreateBudgetRequest} from "$lib/server/domains/budgets/services";
  import type {Account} from "$lib/schema/accounts";
  import {budgetTypes, budgetScopes, type BudgetType, type BudgetScope, type BudgetMetadata} from "$lib/schema/budgets";

  const _newBudgetDialog = $derived(newBudgetDialog);
  const _managingBudgetId = $derived(managingBudgetId);
  const open = $derived(_newBudgetDialog.current);
  const isEditing = $derived(_managingBudgetId.current > 0);

  const accountsState = AccountsState.get();
  const createBudgetMutation = createBudget.options();

  const availableAccounts = $derived.by(() => accountsState.getSortedActiveAccounts());
  const isLoading = $derived.by(() => $createBudgetMutation.isPending);

  let name = $state("");
  let description = $state("");
  let selectedBudgetType = $state<BudgetType>("account-monthly");
  let selectedAccountIds = $state<string[]>([]);
  let allocatedAmount = $state(0);

  const accountMap = $derived.by(() =>
    new Map(availableAccounts.map(account => [String(account.id), account]))
  );

  const selectedAccounts = $derived.by(() =>
    selectedAccountIds.map(id => accountMap.get(id)).filter(Boolean) as Account[]
  );

  // Budget type configurations
  const budgetTypeConfigs = {
    "account-monthly": {
      label: "Account Monthly",
      description: "Set monthly spending limits per account",
      scope: "account" as BudgetScope,
      requiresAccounts: true,
      requiresAmount: true
    },
    "category-envelope": {
      label: "Category Envelope",
      description: "YNAB-style envelope budgeting with rollover",
      scope: "category" as BudgetScope,
      requiresAccounts: false,
      requiresAmount: true
    },
    "goal-based": {
      label: "Goal-Based",
      description: "Track progress toward savings or spending goals",
      scope: "mixed" as BudgetScope,
      requiresAccounts: false,
      requiresAmount: true
    },
    "scheduled-expense": {
      label: "Scheduled Expense",
      description: "Budget for recurring scheduled transactions",
      scope: "account" as BudgetScope,
      requiresAccounts: true,
      requiresAmount: true
    }
  } as const;

  const currentBudgetConfig = $derived.by(() => budgetTypeConfigs[selectedBudgetType]);

  const isFormValid = $derived.by(() => {
    const hasName = name.trim().length >= 2;
    const hasAmount = currentBudgetConfig.requiresAmount ? allocatedAmount > 0 : true;
    const hasAccounts = currentBudgetConfig.requiresAccounts ? selectedAccountIds.length > 0 : true;
    return hasName && hasAmount && hasAccounts;
  });

  function addAccount(accountId: string) {
    if (!selectedAccountIds.includes(accountId)) {
      selectedAccountIds = [...selectedAccountIds, accountId];
    }
  }

  function removeAccount(accountId: string) {
    selectedAccountIds = selectedAccountIds.filter(id => id !== accountId);
  }

  function resetForm() {
    name = "";
    description = "";
    selectedBudgetType = "account-monthly";
    selectedAccountIds = [];
    allocatedAmount = 0;
  }

  async function handleSubmit() {
    if (!isFormValid) return;

    try {
      const metadata: BudgetMetadata = {
        defaultPeriod: {
          type: selectedBudgetType === "category-envelope" ? "monthly" : "monthly",
          startDay: 1,
        },
      };

      if (currentBudgetConfig.requiresAmount) {
        metadata.allocatedAmount = allocatedAmount;
      }

      const budgetData: CreateBudgetRequest = {
        name: name.trim(),
        description: description.trim() || null,
        type: selectedBudgetType,
        scope: currentBudgetConfig.scope,
        status: "active",
        enforcementLevel: "warning",
        metadata,
        ...(currentBudgetConfig.requiresAccounts && { accountIds: selectedAccountIds.map(id => Number(id)) }),
      };

      await $createBudgetMutation.mutateAsync(budgetData);

      resetForm();
      _newBudgetDialog.setFalse();
    } catch (error) {
      console.error("Failed to create budget:", error);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      _newBudgetDialog.setTrue();
    } else {
      _newBudgetDialog.setFalse();
      resetForm();
    }
  }
</script>

<ResponsiveSheet {open} onOpenChange={handleOpenChange}>
  {#snippet header()}
    <h2 class="text-lg font-semibold">Create Budget</h2>
    <p class="text-sm text-muted-foreground">
      Create a new budget to track your spending against planned amounts.
    </p>
  {/snippet}

  {#snippet content()}
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div class="space-y-2">
        <Label for="budget-type">Budget Type</Label>
        <Select.Root
          type="single"
          bind:value={selectedBudgetType}
        >
          <Select.Trigger id="budget-type">
            {currentBudgetConfig.label}
          </Select.Trigger>
          <Select.Content>
            {#each budgetTypes as budgetType}
              <Select.Item value={budgetType}>
                <div class="flex flex-col">
                  <span class="font-medium">{budgetTypeConfigs[budgetType].label}</span>
                  <span class="text-xs text-muted-foreground">{budgetTypeConfigs[budgetType].description}</span>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

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

      {#if currentBudgetConfig.requiresAmount}
        <div class="space-y-2">
          <Label for="budget-amount">
            {selectedBudgetType === "goal-based" ? "Goal Amount" : "Monthly Allocation"}
          </Label>
          <NumericInput bind:value={allocatedAmount} buttonClass="w-full" />
        </div>
      {/if}

      {#if currentBudgetConfig.requiresAccounts}
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
      {/if}
    </form>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onclick={() => handleOpenChange(false)}
        class="flex-1"
      >
        Cancel
      </Button>
      <Button
        type="button"
        onclick={handleSubmit}
        disabled={!isFormValid || isLoading}
        class="flex-1"
      >
        {#if isLoading}
          Creating...
        {:else}
          Create Budget
        {/if}
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
