<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import * as Select from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import { Building2, FileText, CircleCheck, Info, Palette, CreditCard, Banknote, Wallet } from "@lucide/svelte/icons";
  import WizardStep from "./wizard-step.svelte";
  import IconPicker from "$lib/components/ui/icon-picker/icon-picker.svelte";
  import { ColorPicker } from "$lib/components/ui/color-picker";
  import { accountWizardStore, type WizardStep as WizardStepType } from "$lib/stores/wizardStore.svelte";
  import { createAccountValidationEngine } from "$lib/utils/wizardValidation";
  import { accountTypeEnum, type Account } from "$lib/schema";
  import { getIconByName } from "$lib/components/ui/icon-picker/icon-categories";
  import { createTransformAccessors } from "$lib/utils/bind-helpers";

  interface Props {
    initialData?: Partial<Account>;
    onComplete?: (formData: Record<string, any>) => Promise<void>;
  }

  let { initialData = {}, onComplete }: Props = $props();

  // Initialize wizard steps
  const steps: WizardStepType[] = [
    {
      id: 'account-basics',
      title: 'Account Basics',
      description: 'Enter the basic information for your new account'
    },
    {
      id: 'account-enhanced',
      title: 'Visual & Details',
      description: 'Customize your account appearance and add details',
      isOptional: true
    },
    {
      id: 'account-details',
      title: 'Additional Notes',
      description: 'Add optional notes and description',
      isOptional: true
    },
    {
      id: 'review-create',
      title: 'Review & Create',
      description: 'Review your account details before creating'
    }
  ];

  // Set up validation engine
  const validationEngine = createAccountValidationEngine();

  // Override the wizard store's validation method
  accountWizardStore.validateStep = (stepId: string, formData: Record<string, any>) => {
    const result = validationEngine.validateStep(stepId, formData);
    accountWizardStore.setStepValidation(stepId, result.isValid, result.errors);
    return result.isValid;
  };

  // Initialize the wizard
  $effect(() => {
    accountWizardStore.initialize(steps, initialData);
  });

  const formData = $derived(accountWizardStore.formData);

  // Set default icon and color based on account type when wizard initializes
  $effect(() => {
    const accountType = formData['accountType'];
    const currentIcon = formData['accountIcon'];
    const currentColor = formData['accountColor'];

    // Only set defaults if not already set
    if (accountType && accountTypeDefaults[accountType]) {
      const defaults = accountTypeDefaults[accountType];

      if (!currentIcon && defaults.icon) {
        accountWizardStore.updateFormData('accountIcon', defaults.icon);
      }

      if (!currentColor && defaults.color) {
        accountWizardStore.updateFormData('accountColor', defaults.color);
      }
    }
  });

  // Form handlers
  function updateField(field: string, value: any) {
    accountWizardStore.updateFormData(field, value);
  }

  // Auto-detect account type from name (same logic as in manage-account-form)
  function detectAccountTypeFromName(name: string): string | null {
    const lowerName = name.toLowerCase();

    // Account type keywords and their mappings
    const typeKeywords: Record<string, string> = {
      'checking': 'checking',
      'check': 'checking',
      'chk': 'checking',
      'current': 'checking',

      'savings': 'savings',
      'save': 'savings',
      'sav': 'savings',
      'saving': 'savings',

      'credit': 'credit_card',
      'card': 'credit_card',
      'cc': 'credit_card',
      'mastercard': 'credit_card',
      'visa': 'credit_card',
      'amex': 'credit_card',
      'discover': 'credit_card',

      'investment': 'investment',
      'invest': 'investment',
      'brokerage': 'investment',
      'portfolio': 'investment',
      'ira': 'investment',
      '401k': 'investment',
      'roth': 'investment',

      'loan': 'loan',
      'mortgage': 'loan',
      'auto': 'loan',
      'car': 'loan',
      'student': 'loan',
      'personal': 'loan',

      'cash': 'cash',
      'wallet': 'cash',

      'hsa': 'hsa',
      'health savings': 'hsa',
      'health': 'hsa',
      'petty': 'cash'
    };

    // Check each keyword
    for (const [keyword, type] of Object.entries(typeKeywords)) {
      if (lowerName.includes(keyword)) {
        return type;
      }
    }

    return null;
  }

  // Account type suggestions
  const accountTypes = [
    {
      category: 'Banking Accounts',
      examples: ['Checking', 'Savings', 'Money Market'],
      color: 'text-blue-600',
      description: 'Checking, Savings, Money Market'
    },
    {
      category: 'Credit Accounts',
      examples: ['Credit Card', 'Line of Credit'],
      color: 'text-green-600',
      description: 'Credit Cards, Lines of Credit'
    },
    {
      category: 'Investment Accounts',
      examples: ['Brokerage', '401k', 'IRA'],
      color: 'text-purple-600',
      description: 'Brokerage, 401k, IRA'
    },
    {
      category: 'Health Savings',
      examples: ['HSA', 'Health Savings Account'],
      color: 'text-teal-600',
      description: 'Health Savings Accounts'
    },
    {
      category: 'Loan Accounts',
      examples: ['Mortgage', 'Auto Loan', 'Personal Loan'],
      color: 'text-orange-600',
      description: 'Mortgage, Auto, Personal'
    }
  ];

  // Template state management
  let selectedTemplateType = $state<string>('');
  let isInTemplateMode = $state(false);

  // Example notes categories
  let selectedNotesCategory = $state<string>('all');

  // Auto-select notes category based on initial account type
  $effect(() => {
    const currentAccountType = formData['accountType'];
    if (currentAccountType && noteCategories.find(cat => cat.value === currentAccountType && cat.value !== 'all')) {
      selectedNotesCategory = currentAccountType;
    }
  });

  const exampleNotesByCategory: Record<string, string[]> = {
    checking: [
      'Primary checking account for monthly expenses. Direct deposit setup.',
      'Joint checking account for household bills and shared expenses.',
      'Business checking account for freelance income and expenses.',
      'Second checking for travel and discretionary spending.'
    ],
    savings: [
      'High-yield savings, 2.8% APY. Goal: $10,000 emergency fund.',
      'Vacation savings fund. Target: $5,000 by December.',
      'Down payment savings for house. Goal: $50,000.',
      'Kids college fund. Contributing $200/month.'
    ],
    credit_card: [
      'Rewards credit card, 2% cash back. Pay off monthly.',
      'Travel rewards card, 3x points on travel. $0 annual fee.',
      'Balance transfer card, 0% APR for 18 months.',
      'Cash back card for groceries and gas. 5% back on categories.'
    ],
    investment: [
      'Roth IRA with Vanguard. Target: Max contribution annually.',
      '401k through employer. Contributing 10% with 5% match.',
      'Brokerage account for long-term growth investing.',
      'HSA investment account for healthcare expenses.'
    ],
    loan: [
      'Mortgage - 30 year fixed at 3.5%. Monthly payment $1,800.',
      'Auto loan - 5 year term, 4.2% APR. 36 payments remaining.',
      'Student loan - federal, income-driven repayment plan.',
      'Personal loan for home improvements. 3 year term.'
    ],
    hsa: [
      'Health Savings Account. Tax-free medical expenses. Max contribution $4,150/year.',
      'HSA with investment options. Building healthcare nest egg for retirement.',
      'Paired with High-Deductible Health Plan. Family contribution limit $8,300/year.',
      'Triple tax advantage: deductible contributions, tax-free growth, tax-free withdrawals for qualified medical expenses.'
    ]
  };

  const noteCategories = [
    { value: 'all', label: 'All', color: 'border-l-gray-500' },
    { value: 'checking', label: 'Checking', color: 'border-l-blue-500' },
    { value: 'savings', label: 'Savings', color: 'border-l-green-500' },
    { value: 'credit_card', label: 'Credit Card', color: 'border-l-purple-500' },
    { value: 'investment', label: 'Investment', color: 'border-l-orange-500' },
    { value: 'loan', label: 'Loan', color: 'border-l-red-500' },
    { value: 'hsa', label: 'HSA', color: 'border-l-teal-500' }
  ];

  // Default icons and colors for account types
  const accountTypeDefaults: Record<string, { icon: string; color?: string }> = {
    checking: { icon: 'credit-card', color: '#3B82F6' },      // blue
    savings: { icon: 'piggy-bank', color: '#10B981' },        // green
    credit_card: { icon: 'credit-card', color: '#8B5CF6' },   // purple
    investment: { icon: 'trending-up', color: '#F59E0B' },    // orange
    loan: { icon: 'banknote', color: '#EF4444' },             // red
    cash: { icon: 'wallet', color: '#6B7280' },               // gray
    hsa: { icon: 'heart-pulse', color: '#14B8A6' }            // teal
  };

  // Handle account type selection
  function handleAccountTypeClick(accountType: string) {
    selectedTemplateType = accountType;
    isInTemplateMode = true;

    // Set the actual field value to the template
    const templateValue = accountType + ' - ';
    updateField('name', templateValue);

    // Auto-detect and set the account type based on the selected template
    const detectedType = detectAccountTypeFromName(accountType);
    if (detectedType) {
      handleAccountTypeChange(detectedType);
    }

    // Focus the input and position cursor at the end
    setTimeout(() => {
      const nameInput = document.getElementById('account-name') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
        nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length);
      }
    }, 50);
  }

  // Handle input focus - show template placeholder
  function handleInputFocus() {
    if (isInTemplateMode && !formData['name']?.trim()) {
      // Input gets focus but stays empty, placeholder will show the template
    }
  }

  // Handle input blur - clean up if no user content
  function handleInputBlur() {
    const currentValue = formData['name']?.trim() || '';

    if (isInTemplateMode && selectedTemplateType) {
      const templatePrefix = selectedTemplateType + ' -';
      const templatePrefixWithSpace = selectedTemplateType + ' - ';

      if (currentValue === templatePrefix || currentValue === templatePrefixWithSpace) {
        // User left with just the template pattern, rename to just the account type
        updateField('name', selectedTemplateType);
        selectedTemplateType = '';
        isInTemplateMode = false;
      }
    }
  }

  // Handle input changes
  function handleInputChange(value: string) {
    updateField('name', value);

    // Auto-detect account type from name (only if no type is set or it's still the default)
    if (value.length > 2) {
      const currentAccountType = formData['accountType'];
      // Only auto-detect if account type is unset or still the default 'checking'
      if (!currentAccountType || currentAccountType === 'checking') {
        const detectedType = detectAccountTypeFromName(value);
        if (detectedType && detectedType !== currentAccountType) {
          // Use handleAccountTypeChange to ensure icon is updated
          handleAccountTypeChange(detectedType);
        }
      }
    }

    if (isInTemplateMode && selectedTemplateType) {
      const templatePrefix = selectedTemplateType + ' - ';

      if (value === '') {
        // User cleared everything, clear template state
        selectedTemplateType = '';
        isInTemplateMode = false;
      } else if (value.length > templatePrefix.length) {
        // User started typing after the template, exit template mode
        isInTemplateMode = false;
      }
    }
  }

  // Handle completion when Complete button is clicked
  async function handleComplete() {
    if (onComplete) {
      await onComplete(formData);
    }
  }

  // Computed placeholder text
  const placeholderText = $derived.by(() => {
    return 'e.g., Chase Checking, Wells Fargo Savings, Amex Credit Card';
  });

  // Account type labels
  const accountTypeLabels: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    investment: 'Investment',
    credit_card: 'Credit Card',
    loan: 'Loan',
    cash: 'Cash',
    hsa: 'Health Savings Account',
    other: 'Other'
  };

  // Account type options for select
  const accountTypeOptions = accountTypeEnum.map(type => ({
    value: type,
    label: accountTypeLabels[type] || type
  }));

  // Local state for account type select
  // Initialized with default value, will sync with formData in effect
  let accountTypeValue = $state('checking');
  const accountTypeAccessors = createTransformAccessors(
    () => accountTypeValue,
    (value: string) => { accountTypeValue = value; }
  );

  // Track if this is the initial mount
  let isInitialMount = true;

  // Keep accountTypeValue in sync with formData changes (one-way: formData -> accountTypeValue)
  $effect(() => {
    const formDataValue = formData['accountType'];
    if (formDataValue && formDataValue !== accountTypeValue) {
      accountTypeValue = formDataValue;
    }
  });

  // Sync accountTypeValue changes back to formData and trigger side effects
  // Skip on initial mount to avoid triggering side effects on load
  $effect(() => {
    if (isInitialMount) {
      isInitialMount = false;
      return;
    }

    const previousAccountType = formData['accountType'];

    // Only proceed if accountType actually changed
    if (accountTypeValue === previousAccountType) {
      return;
    }

    updateField('accountType', accountTypeValue);

    // Auto-select matching notes category when account type changes
    if (accountTypeValue && noteCategories.find(cat => cat.value === accountTypeValue && cat.value !== 'all')) {
      selectedNotesCategory = accountTypeValue;
    }

    // Auto-update icon and color if:
    // 1. No icon/color is set yet, OR
    // 2. Current icon/color matches the default for the previous account type (user hasn't customized it)
    const defaults = accountTypeDefaults[accountTypeValue];
    const currentIcon = formData['accountIcon'];
    const currentColor = formData['accountColor'];
    const previousDefaults = previousAccountType ? accountTypeDefaults[previousAccountType] : null;

    const shouldUpdateIcon = defaults && (
      !currentIcon ||
      currentIcon === '' ||
      (previousDefaults && currentIcon === previousDefaults.icon)
    );

    const shouldUpdateColor = defaults?.color && (
      !currentColor ||
      currentColor === '' ||
      (previousDefaults?.color && currentColor === previousDefaults.color)
    );

    if (shouldUpdateIcon) {
      updateField('accountIcon', defaults.icon);
    }

    if (shouldUpdateColor) {
      updateField('accountColor', defaults.color);
    }
  });

  function handleIconChange(event: CustomEvent<{ value: string; icon: any }>) {
    updateField('accountIcon', event.detail.value);
  }

  // Get selected account type option
  const selectedAccountType = $derived(() => {
    const type = formData['accountType'];
    return accountTypeOptions.find(opt => opt.value === type);
  });

  // Get selected icon
  const selectedIcon = $derived(() => {
    return formData['accountIcon'] ? getIconByName(formData['accountIcon']) : null;
  });


</script>

<!-- Step 1: Account Basics -->
<WizardStep
  wizardStore={accountWizardStore}
  stepId="account-basics"
  title="Account Basics"
  description="Let's start with the essential information for your new account."
>
  <!-- Account Name -->
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <CreditCard class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">Account Name</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Choose a clear, descriptive name that helps you identify this account easily.
      </p>
    </div>
    <div class="space-y-2">
      <Label for="account-name" class="text-sm font-medium">
        Account Name *
      </Label>
      <Input
        id="account-name"
        value={formData['name'] || ''}
        oninput={(e) => handleInputChange(e.currentTarget.value)}
        onfocus={handleInputFocus}
        onblur={handleInputBlur}
        placeholder={placeholderText}
        class="w-full"
        required
      />
    </div>
  </div>

  <!-- Account Type Quick Start -->
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Info class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">Quick Start - Choose an Account Type</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Click any account type below to automatically fill in your account name
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      {#each accountTypes as accountType}
        <div class="p-3 border rounded-lg">
          <div class="space-y-3">
            <!-- Category Header -->
            <div class="flex items-center gap-2">
              <Building2 class="h-4 w-4 {accountType.color}" />
              <div>
                <p class="font-medium text-sm">{accountType.category}</p>
                <p class="text-xs text-muted-foreground">{accountType.description}</p>
              </div>
            </div>

            <!-- Clickable Account Type Buttons -->
            <div class="flex flex-wrap gap-1">
              {#each accountType.examples as example}
                <button
                  type="button"
                  onclick={() => handleAccountTypeClick(example)}
                  class="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                >
                  {example}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  {#snippet helpContent()}
    <div class="space-y-2">
      <p class="text-sm">
        <strong>Quick Start:</strong>
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        <li>Click any account type button to auto-fill the name field</li>
        <li>Then add your bank name or specific details after the dash</li>
        <li>Example: "Checking - Chase Main" or "Savings - Emergency Fund"</li>
      </ul>

      <p class="text-sm mt-3">
        <strong>General tips for naming accounts:</strong>
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        <li>Use the bank name and account type (e.g., "Chase Checking")</li>
        <li>Include the account purpose (e.g., "Emergency Savings")</li>
        <li>Keep names concise but descriptive</li>
        <li>Avoid using account numbers for security</li>
      </ul>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 2: Enhanced Account Features -->
<WizardStep
  wizardStore={accountWizardStore}
  stepId="account-enhanced"
  title="Visual & Details"
  description="Customize your account's appearance and add important details for better organization."
>
  <!-- Account Type Selection -->
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Building2 class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">Account Type</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Choose the type that best describes this account
      </p>
    </div>
    <Select.Root
      type="single"
      bind:value={accountTypeAccessors.get, accountTypeAccessors.set}
    >
      <Select.Trigger class="w-full">
        <span>{selectedAccountType()?.label || 'Select account type'}</span>
      </Select.Trigger>
      <Select.Content>
        {#each accountTypeOptions as option}
          <Select.Item value={option.value}>
            {option.label}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Visual Customization -->
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Palette class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">Visual Customization</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Choose an icon and color to help identify this account visually.
      </p>
    </div>
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Icon Selection -->
        <div class="space-y-2">
          <Label class="text-sm font-medium flex items-center gap-2">
            <CreditCard class="h-4 w-4" />
            Account Icon
          </Label>
          <IconPicker
            value={formData['accountIcon'] || ''}
            placeholder="Choose an icon"
            onchange={handleIconChange}
            class="w-full"
          />
          <p class="text-xs text-muted-foreground">
            Pick an icon to visually identify this account
          </p>
        </div>

        <!-- Color Selection -->
        <div class="space-y-2">
          <Label class="text-sm font-medium flex items-center gap-2">
            <Palette class="h-4 w-4" />
            Account Color
          </Label>
          <ColorPicker
            value={formData['accountColor']}
            placeholder="Choose account color"
            onchange={(event) => {
              updateField('accountColor', event.detail.value);
            }}
          />
          <p class="text-xs text-muted-foreground">
            Choose a color to help distinguish this account
          </p>
        </div>
      </div>

      <!-- Preview Card -->
      {#if formData['name'] || selectedIcon() || formData['accountColor']}
        {#snippet previewCard()}
          <div class="space-y-2">
            <Label class="text-sm font-medium">Preview</Label>
            <div class="border border-l-4 p-4 rounded-lg" style={`border-left-color: ${formData['accountColor'] || 'hsl(var(--primary))'}`}>
              <div class="flex items-center gap-3">
                {#if selectedIcon()}
                  {@const iconData = selectedIcon()}
                  {#if iconData}
                    <iconData.icon class="h-6 w-6" style={formData['accountColor'] ? `color: ${formData['accountColor']}` : ''} />
                  {:else}
                    <CreditCard class="h-6 w-6 text-muted-foreground" />
                  {/if}
                {:else}
                  <CreditCard class="h-6 w-6 text-muted-foreground" />
                {/if}
                <div>
                  <p class="font-medium">{formData['name'] || 'Account Name'}</p>
                  <p class="text-sm text-muted-foreground">
                    {selectedAccountType()?.label || 'Account Type'}
                    {formData['institution'] ? ` • ${formData['institution']}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        {/snippet}
        {@render previewCard()}
      {/if}
    </div>
  </div>

  <!-- Additional Details -->
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Building2 class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">Additional Details</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Add optional details like institution, starting balance, and account identification.
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Institution -->
      <div class="space-y-2">
        <Label for="institution" class="text-sm font-medium flex items-center gap-2">
          <Building2 class="h-4 w-4" />
          Bank/Institution
        </Label>
        <Input
          id="institution"
          value={formData['institution'] || ''}
          oninput={(e) => updateField('institution', e.currentTarget.value)}
          placeholder="e.g., Chase Bank, Fidelity"
          class="w-full"
        />
        <p class="text-xs text-muted-foreground">
          The financial institution that holds this account
        </p>
      </div>

      <!-- Initial Balance -->
      <div class="space-y-2">
        <Label for="initial-balance" class="text-sm font-medium flex items-center gap-2">
          <Banknote class="h-4 w-4" />
          Starting Balance
        </Label>
        <Input
          id="initial-balance"
          type="number"
          step="0.01"
          value={formData['initialBalance'] || ''}
          oninput={(e) => updateField('initialBalance', parseFloat(e.currentTarget.value) || 0)}
          placeholder="0.00"
          class="w-full"
        />
        <p class="text-xs text-muted-foreground">
          The current balance of this account (optional)
        </p>
      </div>

      <!-- Account Number Last 4 -->
      <div class="space-y-2">
        <Label for="account-last4" class="text-sm font-medium">
          Account Last 4 Digits
        </Label>
        <Input
          id="account-last4"
          value={formData['accountNumberLast4'] || ''}
          oninput={(e) => updateField('accountNumberLast4', e.currentTarget.value)}
          placeholder="1234"
          pattern="[0-9]{4}"
          maxlength={4}
          class="w-full"
        />
        <p class="text-xs text-muted-foreground">
          Last 4 digits for easy identification (optional)
        </p>
      </div>
    </div>
  </div>

  <!-- Budget Inclusion -->
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Wallet class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">Budget Inclusion</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Choose whether this account should be included in your budget calculations.
      </p>
    </div>
    <div class="border rounded-lg p-4">
      <div class="flex items-start space-x-3">
        <Switch
          id="wizard-on-budget"
          checked={formData['onBudget'] ?? true}
          onCheckedChange={(checked) => updateField('onBudget', checked)}
        />
        <div class="flex-1 space-y-1">
          <Label for="wizard-on-budget" class="text-sm font-medium leading-none">
            Include in budget calculations
          </Label>
          <p class="text-sm text-muted-foreground">
            {#if formData['onBudget'] ?? true}
              This account will be included in your budget totals and spending reports. Transactions will count toward your budget.
            {:else}
              This account will only be tracked for net worth. Use this for investments, loans, or other accounts you don't budget for.
            {/if}
          </p>
        </div>
      </div>

      <!-- Info Box -->
      <div class="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <div class="flex items-start gap-2">
          <Info class="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div class="space-y-1">
            <p class="text-xs font-medium text-blue-900 dark:text-blue-100">
              When to use off-budget accounts:
            </p>
            <ul class="text-xs text-blue-700 dark:text-blue-200 space-y-0.5 list-disc list-inside">
              <li>Investment accounts (401k, IRA, brokerage)</li>
              <li>Loan accounts (mortgage, car loans)</li>
              <li>Accounts you track for net worth but don't actively budget</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  {#snippet helpContent()}
    <div class="space-y-2">
      <p class="text-sm">
        <strong>Visual Customization Tips:</strong>
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        <li>Choose colors that help you quickly identify account types</li>
        <li>Use consistent colors for related accounts (e.g., all Chase accounts in blue)</li>
        <li>Pick icons that match the account purpose or institution</li>
        <li>Use the preview to see how your account will appear in lists</li>
      </ul>

      <p class="text-sm mt-3">
        <strong>Account Details:</strong>
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        <li>Institution name helps track which bank/service the account is with</li>
        <li>Starting balance can be updated later if you prefer</li>
        <li>Last 4 digits help verify you're working with the right account</li>
      </ul>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 3: Additional Details -->
<WizardStep
  wizardStore={accountWizardStore}
  stepId="account-details"
  title="Additional Details"
  description="Add optional notes to help you remember important details about this account."
>
  <!-- Notes -->
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <FileText class="h-5 w-5 text-primary" />
        <h3 class="text-lg font-semibold">Additional Notes</h3>
      </div>
      <p class="text-sm text-muted-foreground">
        Add any details that will help you manage this account effectively.
      </p>
    </div>
    <Textarea
      id="account-notes"
      value={formData['notes'] || ''}
      oninput={(e) => updateField('notes', e.currentTarget.value)}
      placeholder="e.g., High-yield savings account, 2.5% APY, used for emergency fund"
      rows={4}
      class="w-full"
    />
  </div>

  <!-- Example Notes -->
  <div class="space-y-4">
    <div class="space-y-2">
      <h4 class="text-lg font-semibold">Example Notes</h4>
      <p class="text-sm text-muted-foreground">
        Choose a category and click any example to use it as your notes
      </p>
    </div>

    <!-- Category Selector -->
    <div class="flex flex-wrap gap-2">
      {#each noteCategories as category}
        <button
          type="button"
          onclick={() => selectedNotesCategory = category.value}
          class={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            selectedNotesCategory === category.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {category.label}
        </button>
      {/each}
    </div>

    <!-- Example Notes List -->
    <div class="space-y-2">
      {#if selectedNotesCategory === 'all'}
        {#each Object.entries(exampleNotesByCategory) as [categoryKey, notes]}
          {@const category = noteCategories.find(c => c.value === categoryKey)}
          {#if category}
            {#each notes as note}
              <button
                type="button"
                onclick={() => updateField('notes', note)}
                class="w-full p-3 border border-l-4 {category.color} rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <p class="text-sm">"{note}"</p>
              </button>
            {/each}
          {/if}
        {/each}
      {:else}
        {@const category = noteCategories.find(c => c.value === selectedNotesCategory)}
        {#if category && exampleNotesByCategory[selectedNotesCategory]}
          {#each exampleNotesByCategory[selectedNotesCategory] as note}
            <button
              type="button"
              onclick={() => updateField('notes', note)}
              class="w-full p-3 border border-l-4 {category.color} rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
            >
              <p class="text-sm">"{note}"</p>
            </button>
          {/each}
        {/if}
      {/if}
    </div>
  </div>

  {#snippet helpContent()}
    <div class="space-y-2">
      <p class="text-sm">
        <strong>Useful information to include:</strong>
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        <li>Interest rates or APY</li>
        <li>Account purpose or goals</li>
        <li>Special features (rewards, fees, etc.)</li>
        <li>Payment schedules or reminders</li>
        <li>Account restrictions or requirements</li>
      </ul>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 3: Review & Create -->
<WizardStep
  wizardStore={accountWizardStore}
  stepId="review-create"
  title="Review & Create Account"
  description="Please review the account details below before creating your account."
  onNext={handleComplete}
  showNavigation={false}
>
  <!-- Account Summary -->
  <div class="space-y-4">
    <div class="space-y-2">
      <h3 class="flex items-center gap-2 text-lg font-semibold">
        <CircleCheck class="h-5 w-5 text-green-600" />
        Account Summary
      </h3>
    </div>
    <div class="space-y-4">
        <!-- Account Preview -->
        {#snippet accountPreview()}
          <div class="space-y-3">
            <div>
              <p class="font-medium text-sm">Account Preview</p>
              <p class="text-muted-foreground text-sm">How your account will appear</p>
            </div>
            <div class="border border-l-4 p-4 w-full rounded-lg" style={`border-left-color: ${formData['accountColor'] || 'hsl(var(--primary))'}`}>
              <div class="flex items-center gap-3">
                {#if selectedIcon()}
                  {@const iconData = selectedIcon()}
                  {#if iconData}
                    <iconData.icon class="h-6 w-6" style={formData['accountColor'] ? `color: ${formData['accountColor']}` : ''} />
                  {:else}
                    <CreditCard class="h-6 w-6 text-muted-foreground" />
                  {/if}
                {:else}
                  <CreditCard class="h-6 w-6 text-muted-foreground" />
                {/if}
                <div>
                  <p class="font-medium">{formData['name'] || 'Not specified'}</p>
                  <p class="text-sm text-muted-foreground">
                    {selectedAccountType()?.label || 'No type selected'}
                    {formData['institution'] ? ` • ${formData['institution']}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        {/snippet}
        {@render accountPreview()}

        <!-- Account Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <p class="font-medium text-sm">Account Name</p>
            <p class="text-sm text-muted-foreground">{formData['name'] || 'Not specified'}</p>
            {#if !formData['name']}
              <Badge variant="destructive" class="text-xs">Required</Badge>
            {/if}
          </div>

          {#if formData['accountType']}
            <div class="space-y-1">
              <p class="font-medium text-sm">Account Type</p>
              <p class="text-sm text-muted-foreground">{selectedAccountType()?.label}</p>
            </div>
          {/if}

          {#if formData['institution']}
            <div class="space-y-1">
              <p class="font-medium text-sm">Institution</p>
              <p class="text-sm text-muted-foreground">{formData['institution']}</p>
            </div>
          {/if}

          {#if formData['initialBalance'] !== undefined && formData['initialBalance'] !== 0}
            <div class="space-y-1">
              <p class="font-medium text-sm">Starting Balance</p>
              <p class="text-sm text-muted-foreground">${formData['initialBalance']?.toFixed(2)}</p>
            </div>
          {/if}

          {#if formData['accountNumberLast4']}
            <div class="space-y-1">
              <p class="font-medium text-sm">Account Last 4</p>
              <p class="text-sm text-muted-foreground font-mono">••••{formData['accountNumberLast4']}</p>
            </div>
          {/if}

          {#if formData['accountIcon']}
            <div class="space-y-1">
              <p class="font-medium text-sm">Icon</p>
              <p class="text-sm text-muted-foreground">{formData['accountIcon']}</p>
            </div>
          {/if}

          <div class="space-y-1">
            <p class="font-medium text-sm">Color</p>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded border" style="background-color: {formData['accountColor'] || 'hsl(var(--primary))'}"></div>
              <p class="text-sm text-muted-foreground font-mono">{formData['accountColor'] || 'hsl(var(--primary))'}</p>
            </div>
          </div>

          <div class="space-y-1">
            <p class="font-medium text-sm">Budget Inclusion</p>
            <div class="flex items-center gap-2">
              {#if formData['onBudget'] ?? true}
                <Badge variant="default" class="text-xs">On Budget</Badge>
                <p class="text-sm text-muted-foreground">Included in budget calculations</p>
              {:else}
                <Badge variant="secondary" class="text-xs">Off Budget</Badge>
                <p class="text-sm text-muted-foreground">Tracked for net worth only</p>
              {/if}
            </div>
          </div>
        </div>

        <!-- Notes -->
        {#if formData['notes']}
          <div class="space-y-1">
            <p class="font-medium text-sm">Notes</p>
            <p class="text-sm text-muted-foreground">"{formData['notes']}"</p>
          </div>
        {/if}

        <!-- Creation Notice -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
          <div class="flex items-start gap-3">
            <Info class="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
              <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
                Ready to Create Account
              </p>
              <p class="text-sm text-blue-700 dark:text-blue-200">
                Click "Complete" to create your account. You can edit these details later if needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

  <!-- Next Steps Preview -->
  <div class="space-y-4">
    <div class="space-y-2">
      <h4 class="text-base font-semibold">What happens next?</h4>
    </div>
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <span class="text-xs font-medium text-blue-600 dark:text-blue-300">1</span>
        </div>
        <p class="text-sm">Your account will be created and available immediately</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <span class="text-xs font-medium text-blue-600 dark:text-blue-300">2</span>
        </div>
        <p class="text-sm">You can start adding transactions and tracking balances</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <span class="text-xs font-medium text-blue-600 dark:text-blue-300">3</span>
        </div>
        <p class="text-sm">Set up budgets and schedules for better financial management</p>
      </div>
    </div>
  </div>
</WizardStep>
