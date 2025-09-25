<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Building2, FileText, CheckCircle2, Info } from "@lucide/svelte/icons";
  import WizardStep from "./wizard-step.svelte";
  import { accountWizardStore, type WizardStep as WizardStepType } from "$lib/stores/wizardStore.svelte";
  import { createAccountValidationEngine } from "$lib/utils/wizardValidation";
  import type { Account } from "$lib/schema";

  interface Props {
    initialData?: Partial<Account>;
  }

  let { initialData = {} }: Props = $props();

  // Initialize wizard steps
  const steps: WizardStepType[] = [
    {
      id: 'account-basics',
      title: 'Account Basics',
      description: 'Enter the basic information for your new account'
    },
    {
      id: 'account-details',
      title: 'Additional Details',
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
  const originalValidateStep = accountWizardStore.validateStep;
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
  const currentStep = $derived(accountWizardStore.currentStep);

  // Form handlers
  function updateField(field: string, value: any) {
    accountWizardStore.updateFormData(field, value);
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
      category: 'Loan Accounts',
      examples: ['Mortgage', 'Auto Loan', 'Personal Loan'],
      color: 'text-orange-600',
      description: 'Mortgage, Auto, Personal'
    }
  ];

  // Template state management
  let selectedAccountType = $state<string>('');
  let isInTemplateMode = $state(false);

  // Handle account type selection
  function handleAccountTypeClick(accountType: string) {
    selectedAccountType = accountType;
    isInTemplateMode = true;

    // Set the actual field value to the template
    const templateValue = accountType + ' - ';
    updateField('name', templateValue);

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
    if (isInTemplateMode && !formData.name?.trim()) {
      // Input gets focus but stays empty, placeholder will show the template
    }
  }

  // Handle input blur - clean up if no user content
  function handleInputBlur() {
    const currentValue = formData.name?.trim() || '';

    if (isInTemplateMode && selectedAccountType) {
      const templatePrefix = selectedAccountType + ' -';
      const templatePrefixWithSpace = selectedAccountType + ' - ';

      if (currentValue === templatePrefix || currentValue === templatePrefixWithSpace) {
        // User left with just the template pattern, rename to just the account type
        updateField('name', selectedAccountType);
        selectedAccountType = '';
        isInTemplateMode = false;
      }
    }
  }

  // Handle input changes
  function handleInputChange(value: string) {
    updateField('name', value);

    if (isInTemplateMode && selectedAccountType) {
      const templatePrefix = selectedAccountType + ' - ';

      if (value === '') {
        // User cleared everything, clear template state
        selectedAccountType = '';
        isInTemplateMode = false;
      } else if (value.length > templatePrefix.length) {
        // User started typing after the template, exit template mode
        isInTemplateMode = false;
      }
    }
  }

  // Computed placeholder text
  const placeholderText = $derived.by(() => {
    return 'e.g., Primary Checking, Savings Account';
  });


</script>

<!-- Step 1: Account Basics -->
<WizardStep
  wizardStore={accountWizardStore}
  stepId="account-basics"
  title="Account Basics"
  description="Let's start with the essential information for your new account."
>
  <div class="space-y-6">
    <!-- Account Name -->
    <div class="space-y-2">
      <Label for="account-name" class="text-sm font-medium">
        Account Name *
      </Label>
      <Input
        id="account-name"
        value={formData.name || ''}
        oninput={(e) => handleInputChange(e.currentTarget.value)}
        onfocus={handleInputFocus}
        onblur={handleInputBlur}
        placeholder={placeholderText}
        class="w-full"
        required
      />
      <p class="text-xs text-muted-foreground">
        Choose a clear, descriptive name that helps you identify this account easily.
      </p>
    </div>

    <!-- Account Type Example Cards -->
    <div class="space-y-3">
      <h4 class="text-sm font-medium flex items-center gap-2">
        <Info class="h-4 w-4" />
        Quick Start - Choose an Account Type
      </h4>
      <p class="text-xs text-muted-foreground">
        Click any account type below to automatically fill in your account name
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each accountTypes as accountType}
          <Card.Root class="p-3">
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
          </Card.Root>
        {/each}
      </div>
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

<!-- Step 2: Additional Details -->
<WizardStep
  wizardStore={accountWizardStore}
  stepId="account-details"
  title="Additional Details"
  description="Add optional notes to help you remember important details about this account."
>
  <div class="space-y-6">
    <!-- Notes -->
    <div class="space-y-2">
      <Label for="account-notes" class="text-sm font-medium flex items-center gap-2">
        <FileText class="h-4 w-4" />
        Notes (Optional)
      </Label>
      <Textarea
        id="account-notes"
        value={formData.notes || ''}
        oninput={(e) => updateField('notes', e.currentTarget.value)}
        placeholder="e.g., High-yield savings account, 2.5% APY, used for emergency fund"
        rows={4}
        class="w-full"
      />
      <p class="text-xs text-muted-foreground">
        Add any details that will help you manage this account effectively.
      </p>
    </div>

    <!-- Example Notes -->
    <div class="space-y-3">
      <h4 class="text-sm font-medium">Example Notes:</h4>
      <div class="space-y-2">
        <Card.Root class="p-3 border-l-4 border-l-blue-500">
          <p class="text-sm">"Primary checking account for monthly expenses. Direct deposit setup."</p>
        </Card.Root>
        <Card.Root class="p-3 border-l-4 border-l-green-500">
          <p class="text-sm">"High-yield savings, 2.8% APY. Goal: $10,000 emergency fund."</p>
        </Card.Root>
        <Card.Root class="p-3 border-l-4 border-l-purple-500">
          <p class="text-sm">"Rewards credit card, 2% cash back. Pay off monthly."</p>
        </Card.Root>
      </div>
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
  showNavigation={false}
>
  <div class="space-y-6">
    <!-- Account Summary -->
    <Card.Root>
      <Card.Header class="pb-4">
        <Card.Title class="flex items-center gap-2">
          <CheckCircle2 class="h-5 w-5 text-green-600" />
          Account Summary
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Account Name -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Account Name</p>
            <p class="text-muted-foreground text-sm">The display name for this account</p>
          </div>
          <div class="text-right">
            <p class="font-mono text-sm">{formData.name || 'Not specified'}</p>
            {#if !formData.name}
              <Badge variant="destructive" class="text-xs">Required</Badge>
            {/if}
          </div>
        </div>

        <!-- Notes -->
        {#if formData.notes}
          <div class="flex justify-between items-start">
            <div>
              <p class="font-medium text-sm">Notes</p>
              <p class="text-muted-foreground text-sm">Additional details</p>
            </div>
            <div class="text-right max-w-xs">
              <p class="text-sm text-muted-foreground">"{formData.notes}"</p>
            </div>
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
      </Card.Content>
    </Card.Root>

    <!-- Next Steps Preview -->
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
      </Card.Content>
    </Card.Root>
  </div>
</WizardStep>
