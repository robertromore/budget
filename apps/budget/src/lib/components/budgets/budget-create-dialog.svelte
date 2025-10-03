<script lang="ts">
  import {SvelteMap} from "svelte/reactivity";
  import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
  import * as Select from "$lib/components/ui/select";
  import {Input} from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label/label.svelte";
  import {Textarea} from "$lib/components/ui/textarea";
  import {Badge} from "$lib/components/ui/badge";
  import NumericInput from "$lib/components/input/numeric-input.svelte";
  import BudgetWizard from "$lib/components/wizard/budget-wizard.svelte";
  import { WizardFormWrapper } from "$lib/components/wizard";
  import {createBudget} from "$lib/query/budgets";
  import {AccountsState} from "$lib/states/entities/accounts.svelte";
  import {CategoriesState} from "$lib/states/entities/categories.svelte";
  import {newBudgetDialog, managingBudgetId} from "$lib/states/ui/global.svelte";
  import type {CreateBudgetRequest} from "$lib/server/domains/budgets/services";
  import type {Account} from "$lib/schema/accounts";
  import type {Category} from "$lib/schema/categories";
  import {
    budgetTypes,
    budgetEnforcementLevels,
    periodTemplateTypes,
    type BudgetType,
    type BudgetScope,
    type BudgetEnforcementLevel,
    type PeriodTemplateType,
    type BudgetMetadata
  } from "$lib/schema/budgets";
  import { budgetWizardStore } from "$lib/stores/wizardStore.svelte";

  const _newBudgetDialog = $derived(newBudgetDialog);
  const _managingBudgetId = $derived(managingBudgetId);
  const open = $derived(_newBudgetDialog.current);
  const isEditing = $derived(_managingBudgetId.current > 0);

  const accountsState = AccountsState.get();
  const categoriesState = CategoriesState.get();
  const createBudgetMutation = createBudget.options();

  const availableAccounts = $derived.by(() => accountsState.getSortedActiveAccounts());
  const availableCategories = $derived.by(() => Array.from(categoriesState.categories.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));

  let name = $state("");
  let description = $state("");
  let selectedBudgetType = $state<BudgetType>("account-monthly");
  let selectedAccountIds = $state<string[]>([]);
  let selectedCategoryIds = $state<string[]>([]);
  let allocatedAmount = $state(0);
  let enforcementLevel = $state<BudgetEnforcementLevel>("warning");
  let periodType = $state<PeriodTemplateType>("monthly");
  let startDay = $state(1);

  const selectedAccounts = $derived.by(() =>
    selectedAccountIds
      .map(id => availableAccounts.find(account => String(account.id) === id))
      .filter(Boolean) as Account[]
  );

  const selectedCategories = $derived.by(() =>
    selectedCategoryIds
      .map(id => availableCategories.find(category => String(category.id) === id))
      .filter(Boolean) as Category[]
  );

  // Budget type configurations
  const budgetTypeConfigs = {
    "account-monthly": {
      label: "Account Monthly",
      description: "Set monthly spending limits per account",
      scope: "account" as BudgetScope,
      requiresAccounts: true,
      requiresCategories: false,
      requiresAmount: true
    },
    "category-envelope": {
      label: "Category Envelope",
      description: "YNAB-style envelope budgeting with rollover",
      scope: "category" as BudgetScope,
      requiresAccounts: false,
      requiresCategories: true,
      requiresAmount: true
    },
    "goal-based": {
      label: "Goal-Based",
      description: "Track progress toward savings or spending goals",
      scope: "mixed" as BudgetScope,
      requiresAccounts: false,
      requiresCategories: true,
      requiresAmount: true
    },
    "scheduled-expense": {
      label: "Scheduled Expense",
      description: "Budget for recurring scheduled transactions",
      scope: "account" as BudgetScope,
      requiresAccounts: true,
      requiresCategories: false,
      requiresAmount: true
    }
  } as const;

  const currentBudgetConfig = $derived.by(() => budgetTypeConfigs[selectedBudgetType]);

  const isFormValid = $derived.by(() => {
    const hasName = name.trim().length >= 2;
    const hasAmount = currentBudgetConfig.requiresAmount ? allocatedAmount > 0 : true;
    const hasAccounts = currentBudgetConfig.requiresAccounts ? selectedAccountIds.length > 0 : true;
    const hasCategories = currentBudgetConfig.requiresCategories ? selectedCategoryIds.length > 0 : true;
    return hasName && hasAmount && hasAccounts && hasCategories;
  });

  function addAccount(accountId: string) {
    if (!selectedAccountIds.includes(accountId)) {
      selectedAccountIds = [...selectedAccountIds, accountId];
    }
  }

  function removeAccount(accountId: string) {
    selectedAccountIds = selectedAccountIds.filter(id => id !== accountId);
  }

  function addCategory(categoryId: string) {
    if (!selectedCategoryIds.includes(categoryId)) {
      selectedCategoryIds = [...selectedCategoryIds, categoryId];
    }
  }

  function removeCategory(categoryId: string) {
    selectedCategoryIds = selectedCategoryIds.filter(id => id !== categoryId);
  }

  function resetForm() {
    name = "";
    description = "";
    selectedBudgetType = "account-monthly";
    selectedAccountIds = [];
    selectedCategoryIds = [];
    allocatedAmount = 0;
    enforcementLevel = "warning";
    periodType = "monthly";
    startDay = 1;
  }

  async function handleWizardComplete(wizardFormData: Record<string, any>) {
    // Transform wizard form data to CreateBudgetRequest format
    const budgetType = wizardFormData['type'] as BudgetType;
    const config = budgetTypeConfigs[budgetType];

    const metadata: BudgetMetadata = {
      defaultPeriod: {
        type: wizardFormData['periodType'] || 'monthly',
        startDay: wizardFormData['startDay'] || 1,
      },
    };

    if (config?.requiresAmount && wizardFormData['allocatedAmount']) {
      metadata.allocatedAmount = wizardFormData['allocatedAmount'];
    }

    const budgetData: CreateBudgetRequest = {
      name: wizardFormData['name'] || '',
      description: wizardFormData['description'] || null,
      type: budgetType,
      scope: config?.scope || 'account',
      status: 'active',
      enforcementLevel: wizardFormData['enforcementLevel'] || 'warning',
      metadata,
      ...(config?.requiresAccounts && { accountIds: wizardFormData['accountIds'] || [] }),
      ...(config?.requiresCategories && { categoryIds: wizardFormData['categoryIds'] || [] }),
    };

    try {
      await createBudgetMutation.mutateAsync(budgetData);
      resetForm();
      _newBudgetDialog.setFalse();
    } catch (error) {
      console.error("Failed to create budget:", error);
      throw error; // Re-throw to let the wizard handle the error
    }
  }

  async function handleSubmit() {
    if (!isFormValid) return;

    try {
      const metadata: BudgetMetadata = {
        defaultPeriod: {
          type: periodType,
          startDay: startDay,
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
        enforcementLevel: enforcementLevel,
        metadata,
        ...(currentBudgetConfig.requiresAccounts && { accountIds: selectedAccountIds.map(id => Number(id)) }),
        ...(currentBudgetConfig.requiresCategories && { categoryIds: selectedCategoryIds.map(id => Number(id)) }),
      };

      await createBudgetMutation.mutateAsync(budgetData);

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

<ResponsiveSheet {open} onOpenChange={handleOpenChange} class="sm:max-w-4xl">
  {#snippet header()}
    <h2 class="text-lg font-semibold">Create Budget</h2>
    <p class="text-sm text-muted-foreground">
      Create a new budget to track your spending against planned amounts.
    </p>
  {/snippet}

  {#snippet content()}
    <WizardFormWrapper
      title={isEditing ? "Edit Budget" : "Create New Budget"}
      subtitle={isEditing ? "Update your budget details" : "Set up spending limits and track your financial goals"}
      wizardStore={budgetWizardStore}
      onComplete={handleWizardComplete}
      defaultMode="manual"
      currentFormData={{
        name,
        description,
        type: selectedBudgetType,
        enforcementLevel,
        periodType,
        startDay,
        allocatedAmount,
        accountIds: selectedAccountIds.map(id => parseInt(id)),
        categoryIds: selectedCategoryIds.map(id => parseInt(id))
      }}
    >
      {#snippet formContent()}
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
        <Label for="enforcement-level">Enforcement Level</Label>
        <Select.Root
          type="single"
          bind:value={enforcementLevel}
        >
          <Select.Trigger id="enforcement-level">
            {enforcementLevel === "none" ? "None (Tracking Only)" :
             enforcementLevel === "warning" ? "Warning (Alerts)" :
             enforcementLevel === "strict" ? "Strict (Blocking)" : enforcementLevel}
          </Select.Trigger>
          <Select.Content>
            {#each budgetEnforcementLevels as level}
              <Select.Item value={level}>
                <div class="flex flex-col">
                  <span class="font-medium">
                    {level === "none" ? "None (Tracking Only)" :
                     level === "warning" ? "Warning (Alerts)" :
                     level === "strict" ? "Strict (Blocking)" : level}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {level === "none" ? "Track spending without restrictions" :
                     level === "warning" ? "Show alerts when over budget" :
                     level === "strict" ? "Block transactions when over budget" : ""}
                  </span>
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

      <div class="space-y-2">
        <Label for="period-type">Period Type</Label>
        <Select.Root
          type="single"
          bind:value={periodType}
        >
          <Select.Trigger id="period-type">
            {periodType.charAt(0).toUpperCase() + periodType.slice(1)}
          </Select.Trigger>
          <Select.Content>
            {#each periodTemplateTypes as type}
              <Select.Item value={type}>
                <div class="flex flex-col">
                  <span class="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <span class="text-xs text-muted-foreground">
                    {type === "weekly" ? "Budget resets every week" :
                     type === "monthly" ? "Budget resets every month" :
                     type === "quarterly" ? "Budget resets every 3 months" :
                     type === "yearly" ? "Budget resets every year" :
                     type === "custom" ? "Define custom period length" : ""}
                  </span>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label for="start-day">Start Day</Label>
        <Input
          id="start-day"
          type="number"
          min="1"
          max={periodType === "monthly" ? "31" : periodType === "weekly" ? "7" : "366"}
          bind:value={startDay}
          placeholder={periodType === "monthly" ? "1-31" : periodType === "weekly" ? "1-7 (1=Monday)" : "1-366"}
        />
        <p class="text-xs text-muted-foreground">
          {periodType === "monthly" ? "Day of the month when budget period starts (1-31)" :
           periodType === "weekly" ? "Day of the week when budget period starts (1=Monday, 7=Sunday)" :
           periodType === "yearly" ? "Day of the year when budget period starts (1-366)" :
           "Day when budget period starts"}
        </p>
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

      {#if currentBudgetConfig.requiresCategories}
        <div class="space-y-2">
          <Label>Categories</Label>
        <Select.Root
          type="single"
          onValueChange={(value) => value && addCategory(value)}
        >
          <Select.Trigger>
            Select categories to include
          </Select.Trigger>
          <Select.Content>
            {#each availableCategories as category (category.id)}
              {#if !selectedCategoryIds.includes(String(category.id))}
                <Select.Item value={String(category.id)}>
                  {category.name}
                </Select.Item>
              {/if}
            {/each}
          </Select.Content>
        </Select.Root>

        {#if selectedCategories.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each selectedCategories as category (category.id)}
              <Badge variant="secondary" class="flex items-center gap-1">
                {category.name}
                <button
                  type="button"
                  onclick={() => removeCategory(String(category.id))}
                  class="ml-1 rounded-full hover:bg-secondary-foreground/20"
                >
                  <span class="sr-only">Remove {category.name}</span>
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

      {#snippet wizardContent()}
        <BudgetWizard
          initialData={{
            name,
            description,
            type: selectedBudgetType,
            enforcementLevel,
            metadata: {
              allocatedAmount,
              defaultPeriod: {
                type: periodType,
                startDay
              }
            },
            accountIds: selectedAccountIds.map(id => parseInt(id)),
            categoryIds: selectedCategoryIds.map(id => parseInt(id))
          }}
          accounts={availableAccounts}
          categories={availableCategories}
        />
      {/snippet}
    </WizardFormWrapper>
  {/snippet}

  {#snippet footer()}
    <!-- Footer is now handled by WizardFormWrapper -->
  {/snippet}
</ResponsiveSheet>
