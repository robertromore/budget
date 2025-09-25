<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Target,
    DollarSign,
    Building2,
    Tag,
    Clock,
    Shield,
    CheckCircle2,
    Info,
    PiggyBank,
    Wallet,
    Calendar,
    TrendingUp
  } from "@lucide/svelte/icons";
  import WizardStep from "./wizard-step.svelte";
  import NumericInput from "$lib/components/input/numeric-input.svelte";
  import { budgetWizardStore, type WizardStep as WizardStepType } from "$lib/stores/wizardStore.svelte";
  import { createBudgetValidationEngine } from "$lib/utils/wizardValidation";
  import type { CreateBudgetRequest } from "$lib/server/domains/budgets/services";
  import type { Account } from "$lib/schema/accounts";
  import type { Category } from "$lib/schema/categories";
  import {
    budgetTypes,
    budgetEnforcementLevels,
    periodTemplateTypes,
    type BudgetType,
    type BudgetEnforcementLevel,
    type PeriodTemplateType,
    type BudgetMetadata
  } from "$lib/schema/budgets";

  interface Props {
    initialData?: Partial<CreateBudgetRequest>;
    accounts?: Account[];
    categories?: Category[];
    onComplete?: (data: CreateBudgetRequest) => void;
  }

  let { initialData = {}, accounts = [], categories = [], onComplete }: Props = $props();

  // Local state for form fields that need binding
  let allocatedAmount = $state(initialData?.metadata?.allocatedAmount || 0);

  // Initialize wizard steps
  const steps: WizardStepType[] = [
    {
      id: 'budget-type',
      title: 'Budget Type & Enforcement',
      description: 'Choose budget type and enforcement level'
    },
    {
      id: 'budget-details',
      title: 'Budget Details',
      description: 'Enter budget name and description'
    },
    {
      id: 'period-settings',
      title: 'Period & Amount',
      description: 'Configure period and budget amount'
    },
    {
      id: 'accounts-categories',
      title: 'Accounts & Categories',
      description: 'Select which accounts and categories to include'
    },
    {
      id: 'review-create',
      title: 'Review & Create',
      description: 'Review your budget details before creating'
    }
  ];

  const formData = $derived(budgetWizardStore.formData);

  // Set up validation engine
  const validationEngine = createBudgetValidationEngine();

  // Override the wizard store's validation method
  budgetWizardStore.validateStep = (stepId: string, formData: Record<string, any>) => {
    if (stepId === 'budget-type') {
      const hasType = formData['type'] !== undefined;
      const hasEnforcement = formData['enforcementLevel'] !== undefined;
      const isValid = hasType && hasEnforcement;
      budgetWizardStore.setStepValidation(stepId, isValid, isValid ? [] : ['Please select budget type and enforcement level']);
      return isValid;
    }

    if (stepId === 'accounts-categories') {
      const budgetType = formData['type'];
      const config = budgetTypeConfigs[budgetType as BudgetType];

      if (!config) {
        budgetWizardStore.setStepValidation(stepId, false, ['Invalid budget type']);
        return false;
      }

      const hasAccounts = config.requiresAccounts ? (formData['accountIds']?.length || 0) > 0 : true;
      const hasCategories = config.requiresCategories ? (formData['categoryIds']?.length || 0) > 0 : true;
      const isValid = hasAccounts && hasCategories;

      const errors: string[] = [];
      if (config.requiresAccounts && !hasAccounts) errors.push('Please select at least one account');
      if (config.requiresCategories && !hasCategories) errors.push('Please select at least one category');

      budgetWizardStore.setStepValidation(stepId, isValid, errors);
      return isValid;
    }

    if (stepId === 'review-create') {
      const requiredSteps = ['budget-type', 'budget-details', 'period-settings', 'accounts-categories'];
      const allRequiredValid = requiredSteps.every(id => {
        const result = validationEngine.validateStep(id, formData);
        return result.isValid;
      });
      budgetWizardStore.setStepValidation(stepId, allRequiredValid, allRequiredValid ? [] : ['Complete previous steps first']);
      return allRequiredValid;
    }

    const result = validationEngine.validateStep(stepId, formData);
    budgetWizardStore.setStepValidation(stepId, result.isValid, result.errors);
    return result.isValid;
  };

  // Initialize the wizard once
  $effect(() => {
    // Create enhanced initial data with defaults
    const enhancedInitialData = {
      ...initialData,
      periodType: initialData?.metadata?.defaultPeriod?.type || 'monthly',
      startDay: initialData?.metadata?.defaultPeriod?.startDay || 1,
      ...(initialData?.metadata?.allocatedAmount && { allocatedAmount: initialData.metadata.allocatedAmount })
    };

    budgetWizardStore.initialize(steps, enhancedInitialData);
  });

  // Sync local state with form data
  $effect(() => {
    if (formData['allocatedAmount'] !== undefined && formData['allocatedAmount'] !== allocatedAmount) {
      allocatedAmount = formData['allocatedAmount'] || 0;
    }
  });

  // Form handlers
  function updateField(field: string, value: any) {
    budgetWizardStore.updateFormData(field, value);
    budgetWizardStore.validateCurrentStep();
  }

  function addAccount(accountId: number) {
    const current = formData['accountIds'] || [];
    if (!current.includes(accountId)) {
      updateField('accountIds', [...current, accountId]);
    }
  }

  function removeAccount(accountId: number) {
    const current = formData['accountIds'] || [];
    updateField('accountIds', current.filter((id: number) => id !== accountId));
  }

  function addCategory(categoryId: number) {
    const current = formData['categoryIds'] || [];
    if (!current.includes(categoryId)) {
      updateField('categoryIds', [...current, categoryId]);
    }
  }

  function removeCategory(categoryId: number) {
    const current = formData['categoryIds'] || [];
    updateField('categoryIds', current.filter((id: number) => id !== categoryId));
  }

  // Budget type configurations
  const budgetTypeConfigs = {
    "account-monthly": {
      label: "Account Monthly",
      description: "Set monthly spending limits per account",
      icon: Building2,
      scope: "account",
      requiresAccounts: true,
      requiresCategories: false,
      requiresAmount: true,
      examples: ['Monthly credit card limit', 'Checking account spending', 'Savings goal tracking']
    },
    "category-envelope": {
      label: "Category Envelope",
      description: "YNAB-style envelope budgeting with rollover",
      icon: PiggyBank,
      scope: "category",
      requiresAccounts: false,
      requiresCategories: true,
      requiresAmount: true,
      examples: ['Groceries envelope', 'Entertainment budget', 'Transportation costs']
    },
    "goal-based": {
      label: "Goal-Based",
      description: "Track progress toward savings or spending goals",
      icon: Target,
      scope: "mixed",
      requiresAccounts: false,
      requiresCategories: true,
      requiresAmount: true,
      examples: ['Emergency fund', 'Vacation savings', 'New car fund']
    },
    "scheduled-expense": {
      label: "Scheduled Expense",
      description: "Budget for recurring scheduled transactions",
      icon: Calendar,
      scope: "account",
      requiresAccounts: true,
      requiresCategories: false,
      requiresAmount: true,
      examples: ['Monthly subscriptions', 'Recurring bills', 'Automatic investments']
    }
  } as const;

  // Enforcement level options
  const enforcementLevelOptions = [
    {
      value: 'none' as BudgetEnforcementLevel,
      title: 'None (Tracking Only)',
      description: 'Track spending without restrictions',
      icon: Info,
      examples: ['See spending patterns', 'No alerts or blocks', 'Pure tracking']
    },
    {
      value: 'warning' as BudgetEnforcementLevel,
      title: 'Warning (Alerts)',
      description: 'Show alerts when over budget',
      icon: Shield,
      examples: ['Visual warnings', 'Email notifications', 'Spending alerts']
    },
    {
      value: 'strict' as BudgetEnforcementLevel,
      title: 'Strict (Blocking)',
      description: 'Block transactions when over budget',
      icon: Shield,
      examples: ['Transaction blocking', 'Hard limits', 'Spending prevention']
    }
  ];

  const currentBudgetConfig = $derived.by(() => {
    const type = formData['type'] as BudgetType;
    return type ? budgetTypeConfigs[type] : null;
  });

  const selectedAccounts = $derived.by(() => {
    const accountIds = formData['accountIds'] || [];
    return accounts.filter(account => accountIds.includes(account.id));
  });

  const selectedCategories = $derived.by(() => {
    const categoryIds = formData['categoryIds'] || [];
    return categories.filter(category => categoryIds.includes(category.id));
  });

</script>

<!-- Step 1: Budget Type & Enforcement -->
<WizardStep
  wizardStore={budgetWizardStore}
  stepId="budget-type"
  title="Budget Type & Enforcement"
  description="Choose the type of budget and how strictly to enforce it."
>
  <div class="space-y-8">
    <!-- Budget Type Selection -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold">Budget Type</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each budgetTypes as budgetType}
          {@const config = budgetTypeConfigs[budgetType]}
          {@const isSelected = formData['type'] === budgetType}
          <Card.Root
            class="cursor-pointer transition-all duration-200 {isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}"
            onclick={() => updateField('type', budgetType)}
          >
            <Card.Content class="p-6">
              <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <config.icon class="h-5 w-5 text-primary" />
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-base">{config.label}</h3>
                    <p class="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  {#if isSelected}
                    <CheckCircle2 class="h-5 w-5 text-primary" />
                  {/if}
                </div>

                <!-- Examples -->
                <div class="space-y-2">
                  <p class="text-xs font-medium text-muted-foreground">Examples:</p>
                  <div class="flex flex-wrap gap-1">
                    {#each config.examples as example}
                      <Badge variant="outline" class="text-xs">{example}</Badge>
                    {/each}
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </div>

    <!-- Enforcement Level Selection -->
    {#if formData['type']}
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Enforcement Level</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {#each enforcementLevelOptions as option}
            {@const isSelected = formData['enforcementLevel'] === option.value}
            <Card.Root
              class="cursor-pointer transition-all duration-200 {isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}"
              onclick={() => updateField('enforcementLevel', option.value)}
            >
              <Card.Content class="p-4">
                <div class="space-y-3">
                  <!-- Header -->
                  <div class="flex items-center gap-2">
                    <div class="p-1.5 rounded-lg bg-primary/10">
                      <option.icon class="h-4 w-4 text-primary" />
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-sm">{option.title}</h4>
                      <p class="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    {#if isSelected}
                      <CheckCircle2 class="h-4 w-4 text-primary" />
                    {/if}
                  </div>

                  <!-- Examples -->
                  <div class="space-y-1">
                    <p class="text-xs font-medium text-muted-foreground">Features:</p>
                    <div class="flex flex-wrap gap-1">
                      {#each option.examples as example}
                        <Badge variant="outline" class="text-xs">{example}</Badge>
                      {/each}
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#snippet helpContent()}
    <div class="space-y-3">
      <div class="space-y-2">
        <p class="text-sm font-medium">Budget Types:</p>
        <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li><strong>Account Monthly:</strong> Limit spending per account per month</li>
          <li><strong>Category Envelope:</strong> Allocate money to specific spending categories</li>
          <li><strong>Goal-Based:</strong> Track progress toward financial goals</li>
          <li><strong>Scheduled Expense:</strong> Budget for recurring transactions</li>
        </ul>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium">Enforcement Levels:</p>
        <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li><strong>None:</strong> Track spending without restrictions</li>
          <li><strong>Warning:</strong> Get alerts when approaching or exceeding limits</li>
          <li><strong>Strict:</strong> Block transactions that would exceed the budget</li>
        </ul>
      </div>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 2: Budget Details -->
<WizardStep
  wizardStore={budgetWizardStore}
  stepId="budget-details"
  title="Budget Details"
  description="Give your budget a name and description."
>
  <div class="space-y-6">
    <!-- Budget Name -->
    <div class="space-y-2">
      <Label for="budget-name" class="text-sm font-medium">
        Budget Name *
      </Label>
      <Input
        id="budget-name"
        value={formData['name'] || ''}
        oninput={(e) => updateField('name', e.currentTarget.value)}
        placeholder="e.g., Monthly Expenses, Emergency Fund"
        class="w-full"
        required
      />
      <p class="text-xs text-muted-foreground">
        Choose a clear name that describes this budget's purpose.
      </p>
    </div>

    <!-- Description -->
    <div class="space-y-2">
      <Label for="budget-description" class="text-sm font-medium">
        Description (Optional)
      </Label>
      <Textarea
        id="budget-description"
        value={formData['description'] || ''}
        oninput={(e) => updateField('description', e.currentTarget.value)}
        placeholder="Describe what this budget covers and any special considerations..."
        rows={3}
        class="w-full"
      />
      <p class="text-xs text-muted-foreground">
        Add details about what this budget includes or excludes.
      </p>
    </div>
  </div>

  {#snippet helpContent()}
    <div class="space-y-2">
      <p class="text-sm font-medium">Naming Tips:</p>
      <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
        <li>Use descriptive names like "Groceries & Dining" instead of "Food"</li>
        <li>Include the time period if relevant: "Q1 Marketing Budget"</li>
        <li>For goals: "Emergency Fund - 6 months expenses"</li>
        <li>Keep it concise but meaningful</li>
      </ul>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 3: Period & Amount -->
<WizardStep
  wizardStore={budgetWizardStore}
  stepId="period-settings"
  title="Period & Amount"
  description="Configure the budget period and amount."
>
  <div class="space-y-6">
    <!-- Period Type -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Budget Period *</Label>
      <Select.Root
        type="single"
        value={formData['periodType'] || 'monthly'}
        onValueChange={(value) => value && updateField('periodType', value)}
      >
        <Select.Trigger>
          <div class="flex items-center gap-2">
            <Clock class="h-4 w-4 text-muted-foreground" />
            <span>{(formData['periodType'] || 'monthly').charAt(0).toUpperCase() + (formData['periodType'] || 'monthly').slice(1)}</span>
          </div>
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

    <!-- Start Day -->
    <div class="space-y-2">
      <Label for="start-day" class="text-sm font-medium">Period Start Day</Label>
      <Input
        id="start-day"
        type="number"
        min="1"
        max={formData['periodType'] === 'monthly' ? 31 : formData['periodType'] === 'weekly' ? 7 : 366}
        value={formData['startDay'] || 1}
        oninput={(e) => updateField('startDay', parseInt(e.currentTarget.value) || 1)}
        placeholder={(formData['periodType'] === 'monthly' ? '1-31' : formData['periodType'] === 'weekly' ? '1-7 (1=Monday)' : '1-366')}
        class="w-full"
      />
      <p class="text-xs text-muted-foreground">
        {formData['periodType'] === 'monthly' ? 'Day of the month when budget period starts (1-31)' :
         formData['periodType'] === 'weekly' ? 'Day of the week when budget period starts (1=Monday, 7=Sunday)' :
         formData['periodType'] === 'yearly' ? 'Day of the year when budget period starts (1-366)' :
         'Day when budget period starts'}
      </p>
    </div>

    <!-- Budget Amount -->
    {#if currentBudgetConfig?.requiresAmount}
      <div class="space-y-2">
        <Label class="text-sm font-medium">
          <div class="flex items-center gap-2">
            <DollarSign class="h-4 w-4 text-muted-foreground" />
            <span>
              {formData['type'] === 'goal-based' ? 'Goal Amount *' : 'Budget Amount *'}
            </span>
          </div>
        </Label>
        <NumericInput
          bind:value={allocatedAmount}
          onSubmit={() => {
            updateField('allocatedAmount', allocatedAmount);
          }}
          buttonClass="w-full"
        />
        <p class="text-xs text-muted-foreground">
          {formData['type'] === 'goal-based'
            ? 'The target amount you want to save or spend'
            : `How much to allocate per ${formData['periodType'] || 'month'}`}
        </p>
      </div>
    {/if}
  </div>

  {#snippet helpContent()}
    <div class="space-y-2">
      <p class="text-sm font-medium">Period Planning:</p>
      <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
        <li><strong>Monthly:</strong> Most common for salary-based budgeting</li>
        <li><strong>Weekly:</strong> Good for cash flow management</li>
        <li><strong>Quarterly:</strong> Useful for business or project budgets</li>
        <li><strong>Yearly:</strong> Great for annual goals and tax planning</li>
      </ul>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 4: Accounts & Categories -->
<WizardStep
  wizardStore={budgetWizardStore}
  stepId="accounts-categories"
  title="Accounts & Categories"
  description="Select which accounts and categories this budget applies to."
>
  <div class="space-y-6">
    <!-- Account Selection -->
    {#if currentBudgetConfig?.requiresAccounts}
      <div class="space-y-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium flex items-center gap-2">
            <Building2 class="h-4 w-4 text-muted-foreground" />
            Accounts *
          </Label>
          <Select.Root
            type="single"
            onValueChange={(value) => value && addAccount(parseInt(value))}
          >
            <Select.Trigger>
              Select accounts to include
            </Select.Trigger>
            <Select.Content>
              {#each accounts as account}
                {#if !selectedAccounts.some(selected => selected.id === account.id)}
                  <Select.Item value={account.id.toString()}>
                    {account.name}
                  </Select.Item>
                {/if}
              {/each}
            </Select.Content>
          </Select.Root>
          <p class="text-xs text-muted-foreground">
            Choose which accounts this budget will monitor and control.
          </p>
        </div>

        {#if selectedAccounts.length > 0}
          <div class="space-y-2">
            <Label class="text-xs font-medium text-muted-foreground">Selected Accounts:</Label>
            <div class="flex flex-wrap gap-2">
              {#each selectedAccounts as account}
                <Badge variant="secondary" class="flex items-center gap-1">
                  {account.name}
                  <button
                    type="button"
                    onclick={() => removeAccount(account.id)}
                    class="ml-1 rounded-full hover:bg-secondary-foreground/20"
                  >
                    <span class="sr-only">Remove {account.name}</span>
                    ×
                  </button>
                </Badge>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Category Selection -->
    {#if currentBudgetConfig?.requiresCategories}
      <div class="space-y-4">
        <div class="space-y-2">
          <Label class="text-sm font-medium flex items-center gap-2">
            <Tag class="h-4 w-4 text-muted-foreground" />
            Categories *
          </Label>
          <Select.Root
            type="single"
            onValueChange={(value) => value && addCategory(parseInt(value))}
          >
            <Select.Trigger>
              Select categories to include
            </Select.Trigger>
            <Select.Content>
              {#each categories as category}
                {#if !selectedCategories.some(selected => selected.id === category.id)}
                  <Select.Item value={category.id.toString()}>
                    {category.name}
                  </Select.Item>
                {/if}
              {/each}
            </Select.Content>
          </Select.Root>
          <p class="text-xs text-muted-foreground">
            Choose which spending categories this budget will track.
          </p>
        </div>

        {#if selectedCategories.length > 0}
          <div class="space-y-2">
            <Label class="text-xs font-medium text-muted-foreground">Selected Categories:</Label>
            <div class="flex flex-wrap gap-2">
              {#each selectedCategories as category}
                <Badge variant="secondary" class="flex items-center gap-1">
                  {category.name}
                  <button
                    type="button"
                    onclick={() => removeCategory(category.id)}
                    class="ml-1 rounded-full hover:bg-secondary-foreground/20"
                  >
                    <span class="sr-only">Remove {category.name}</span>
                    ×
                  </button>
                </Badge>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#snippet helpContent()}
    <div class="space-y-2">
      <p class="text-sm font-medium">Selection Tips:</p>
      <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
        <li><strong>Accounts:</strong> Include all accounts where this spending occurs</li>
        <li><strong>Categories:</strong> Be specific - separate "Groceries" from "Dining Out"</li>
        <li>You can always add or remove accounts/categories later</li>
        <li>Consider starting with fewer categories and expanding over time</li>
      </ul>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 5: Review & Create -->
<WizardStep
  wizardStore={budgetWizardStore}
  stepId="review-create"
  title="Review & Create Budget"
  description="Review your budget configuration before creating."
  showNavigation={false}
>
  <div class="space-y-6">
    <!-- Budget Summary -->
    <Card.Root>
      <Card.Header class="pb-4">
        <Card.Title class="flex items-center gap-2">
          <CheckCircle2 class="h-5 w-5 text-green-600" />
          Budget Summary
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Budget Type -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Budget Type</p>
            <p class="text-muted-foreground text-sm">How this budget works</p>
          </div>
          <div class="text-right">
            <Badge variant="default">
              {currentBudgetConfig?.label || formData['type']}
            </Badge>
          </div>
        </div>

        <!-- Enforcement Level -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Enforcement</p>
            <p class="text-muted-foreground text-sm">How strictly enforced</p>
          </div>
          <div class="text-right">
            <Badge variant={formData['enforcementLevel'] === 'strict' ? 'destructive' : formData['enforcementLevel'] === 'warning' ? 'default' : 'secondary'}>
              {formData['enforcementLevel'] === 'none' ? 'Tracking Only' :
               formData['enforcementLevel'] === 'warning' ? 'Alerts' :
               formData['enforcementLevel'] === 'strict' ? 'Blocking' : formData['enforcementLevel']}
            </Badge>
          </div>
        </div>

        <!-- Budget Name -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Name</p>
            <p class="text-muted-foreground text-sm">Budget identifier</p>
          </div>
          <div class="text-right">
            <p class="font-mono text-sm">{formData['name'] || 'Not specified'}</p>
            {#if !formData['name']}
              <Badge variant="destructive" class="text-xs">Required</Badge>
            {/if}
          </div>
        </div>

        <!-- Amount -->
        {#if currentBudgetConfig?.requiresAmount}
          <div class="flex justify-between items-start">
            <div>
              <p class="font-medium text-sm">
                {formData['type'] === 'goal-based' ? 'Goal Amount' : 'Budget Amount'}
              </p>
              <p class="text-muted-foreground text-sm">
                {formData['type'] === 'goal-based' ? 'Target to reach' : `Per ${formData['periodType'] || 'month'}`}
              </p>
            </div>
            <div class="text-right">
              <p class="font-mono text-sm">${allocatedAmount || 0}</p>
            </div>
          </div>
        {/if}

        <!-- Period Configuration -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Period</p>
            <p class="text-muted-foreground text-sm">Budget reset schedule</p>
          </div>
          <div class="text-right">
            <p class="text-sm">{(formData['periodType'] || 'monthly').charAt(0).toUpperCase() + (formData['periodType'] || 'monthly').slice(1)}</p>
            <p class="text-xs text-muted-foreground">Starts day {formData['startDay'] || 1}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Scope Summary -->
    {#if (currentBudgetConfig?.requiresAccounts && selectedAccounts.length > 0) || (currentBudgetConfig?.requiresCategories && selectedCategories.length > 0)}
      <Card.Root>
        <Card.Header class="pb-3">
          <Card.Title class="text-base">Scope</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#if currentBudgetConfig?.requiresAccounts && selectedAccounts.length > 0}
            <div>
              <p class="font-medium text-sm mb-2">Accounts ({selectedAccounts.length})</p>
              <div class="flex flex-wrap gap-1">
                {#each selectedAccounts as account}
                  <Badge variant="outline" class="text-xs">{account.name}</Badge>
                {/each}
              </div>
            </div>
          {/if}

          {#if currentBudgetConfig?.requiresCategories && selectedCategories.length > 0}
            <div>
              <p class="font-medium text-sm mb-2">Categories ({selectedCategories.length})</p>
              <div class="flex flex-wrap gap-1">
                {#each selectedCategories as category}
                  <Badge variant="outline" class="text-xs">{category.name}</Badge>
                {/each}
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Next Steps -->
    <Card.Root>
      <Card.Header class="pb-4">
        <Card.Title class="text-base">What happens next?</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-300">1</span>
            </div>
            <p class="text-sm">Your budget will be created and activated</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-300">2</span>
            </div>
            <p class="text-sm">
              {formData['enforcementLevel'] === 'none' ? 'You can track spending against this budget' :
               formData['enforcementLevel'] === 'warning' ? 'You\'ll receive alerts when approaching limits' :
               'Transactions will be blocked when limits are exceeded'}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-300">3</span>
            </div>
            <p class="text-sm">Monitor progress and adjust settings from the budgets page</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Note: Completion is handled by WizardFormWrapper's "Complete Setup" button -->
  </div>
</WizardStep>