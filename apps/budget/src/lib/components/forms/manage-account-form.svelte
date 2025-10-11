<script lang="ts">
import * as Form from '$lib/components/ui/form';
import * as Select from '$lib/components/ui/select';
import * as Card from '$lib/components/ui/card';
import {type Account, accountTypeEnum, type AccountType} from '$lib/schema';
import {superformInsertAccountSchema} from '$lib/schema/superforms';
import {Textarea} from '$lib/components/ui/textarea';
import {page} from '$app/state';
import {Input} from '$lib/components/ui/input';
import {Label} from '$lib/components/ui/label';
import {Switch} from '$lib/components/ui/switch';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import {useEntityForm} from '$lib/hooks/forms/use-entity-form';
import { WizardFormWrapper } from '$lib/components/wizard';
import AccountWizard from '$lib/components/wizard/account-wizard.svelte';
import { accountWizardStore } from '$lib/stores/wizardStore.svelte';
import { IconPicker } from '$lib/components/ui/icon-picker';
import { ColorPicker } from '$lib/components/ui/color-picker';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Palette from '@lucide/svelte/icons/palette';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Wallet from '@lucide/svelte/icons/wallet';

let {
  accountId,
  onSave,
  formId,
  mode: initialMode = 'wizard',
}: {
  accountId?: number;
  onDelete?: (id: number) => void;
  onSave?: (new_entity: Account) => void;
  formId?: string;
  mode?: 'manual' | 'wizard';
} = $props();

// Get form data from accounts page (not layout) to match the action schema
const {
  data: {manageAccountForm},
} = page;

const accounts = AccountsState.get();

const isUpdate = accountId && accountId > 0;

const resolvedFormId = formId ?? (accountId && accountId > 0 ? `account-form-${accountId}` : 'account-form-new');

// Keep mode as 'manual' during SSR and initial hydration
let mode = $state<'manual' | 'wizard'>('manual');
let mounted = $state(false);

import { onMount } from 'svelte';
import { browser } from '$app/environment';

onMount(() => {
  mounted = true;
  // Apply the saved/desired mode only after hydration is complete
  mode = initialMode;
});

const entityForm = useEntityForm({
  formData: manageAccountForm,
  schema: superformInsertAccountSchema,
  formId: resolvedFormId,
  entityId: accountId,
  onSave: (entity: Account) => {
    if (isUpdate) {
      accounts.updateAccount(entity);
    } else {
      accounts.addAccount(entity);
    }
    if (onSave) onSave(entity);
  },
  customOptions: {
    onResult: async ({ result }) => {
      if (result.type === 'success') {
        // Call the original useEntityForm logic manually
        if (result.data && result.data.entity) {
          const entity = result.data.entity;

          if (isUpdate) {
            accounts.updateAccount(entity);
          } else {
            accounts.addAccount(entity);
          }

          if (onSave) {
            onSave(entity);
          }
        }
      }
    }
  }
});

const {form: formData, enhance} = entityForm;

// Initialize form data for existing account
const initialData: Partial<Account> = {};

// Ensure default values for new accounts
if (!accountId || accountId === 0) {
  $formData.onBudget = true;
  $formData.accountColor = $formData.accountColor || '#3b82f6'; // Default blue color
}

if (accountId && accountId > 0) {
  const account = accounts.getById(accountId);
  if (account) {
    $formData.id = accountId;
    $formData.name = account.name;
    $formData.notes = account.notes;
    $formData.accountType = account.accountType || 'checking';
    $formData.institution = account.institution || '';
    $formData.accountIcon = account.accountIcon || '';
    $formData.accountColor = account.accountColor || '';
    $formData.initialBalance = account.initialBalance || 0.0;
    $formData.accountNumberLast4 = String((account as any).accountNumberLast4 || '');
    $formData.onBudget = account.onBudget ?? true;

    // Set initial data for wizard
    initialData.id = accountId;
    initialData.name = account.name;
    initialData.notes = account.notes;
    initialData.accountType = account.accountType;
    initialData.institution = account.institution;
    initialData.accountIcon = account.accountIcon;
    initialData.accountColor = account.accountColor;
    initialData.initialBalance = account.initialBalance;
    initialData.accountNumberLast4 = String((account as any).accountNumberLast4 || '');
    initialData.onBudget = account.onBudget ?? true;
  }
}

// Handle wizard completion
async function handleWizardComplete(wizardFormData: Record<string, any>) {
  // Update form data with wizard results
  $formData.name = wizardFormData['name'] || '';
  $formData.notes = wizardFormData['notes'] || '';
  $formData.accountType = wizardFormData['accountType'] || 'checking';
  $formData.institution = wizardFormData['institution'] || '';
  $formData.accountIcon = wizardFormData['accountIcon'] || '';
  $formData.accountColor = wizardFormData['accountColor'] || '#3B82F6'; // Default blue color
  $formData.initialBalance = wizardFormData['initialBalance'] || 0.0;
  $formData.accountNumberLast4 = wizardFormData['accountNumberLast4'] || '';
  $formData.onBudget = wizardFormData['onBudget'] ?? true;

  // Wait a tick to ensure reactive updates complete
  await new Promise(resolve => setTimeout(resolve, 0));

  // Submit the wizard form programmatically
  const form = document.getElementById(`${resolvedFormId}-wizard`) as HTMLFormElement;
  if (form) {
    // Ensure all form fields have the correct values
    const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement;
    const notesInput = form.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;
    const accountTypeInput = form.querySelector('input[name="accountType"]') as HTMLInputElement;
    const institutionInput = form.querySelector('input[name="institution"]') as HTMLInputElement;
    const accountIconInput = form.querySelector('input[name="accountIcon"]') as HTMLInputElement;
    const accountColorInput = form.querySelector('input[name="accountColor"]') as HTMLInputElement;
    const initialBalanceInput = form.querySelector('input[name="initialBalance"]') as HTMLInputElement;
    const accountNumberLast4Input = form.querySelector('input[name="accountNumberLast4"]') as HTMLInputElement;
    const onBudgetInput = form.querySelector('input[name="onBudget"]') as HTMLInputElement;

    if (nameInput) nameInput.value = $formData.name;
    if (notesInput) notesInput.value = $formData.notes;
    if (accountTypeInput) accountTypeInput.value = $formData.accountType;
    if (institutionInput) institutionInput.value = $formData.institution;
    if (accountIconInput) accountIconInput.value = $formData.accountIcon;
    if (accountColorInput) accountColorInput.value = $formData.accountColor;
    if (initialBalanceInput) initialBalanceInput.value = String($formData.initialBalance);
    if (accountNumberLast4Input) accountNumberLast4Input.value = $formData.accountNumberLast4;
    if (onBudgetInput) onBudgetInput.value = String($formData.onBudget);

    form.requestSubmit();
  }
}

// Helper functions for form field handling
function handleIconChange(event: CustomEvent<{ value: string; icon: any }>) {
  // Ensure we only set valid icon names
  const iconValue = event.detail.value;
  if (typeof iconValue === 'string') {
    $formData.accountIcon = iconValue;
  }
}

// Account type options for the dropdown
const accountTypeOptions = accountTypeEnum.map(type => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
}));

// Default icons for account types
const accountTypeDefaults: Record<string, { icon: string }> = {
  checking: { icon: 'credit-card' },
  savings: { icon: 'piggy-bank' },
  credit_card: { icon: 'credit-card' },
  investment: { icon: 'trending-up' },
  loan: { icon: 'banknote' },
  cash: { icon: 'wallet' }
};

// Auto-detect account type from name
function detectAccountTypeFromName(name: string): AccountType | null {
  const lowerName = name.toLowerCase();

  // Account type keywords and their mappings
  const typeKeywords: Record<string, AccountType> = {
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

// Handle name change with auto-detection
function handleNameChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const name = target.value;
  $formData.name = name;

  // Only auto-detect for new accounts and if account type hasn't been manually set
  if (!isUpdate && name.length > 2) {
    const detectedType = detectAccountTypeFromName(name);
    if (detectedType && (!$formData.accountType || $formData.accountType === 'checking')) {
      const previousAccountType = $formData.accountType;
      $formData.accountType = detectedType;
      // Auto-set icon when type is auto-detected, passing the previous type
      updateIconForAccountType(detectedType, previousAccountType);
    }
  }
}

// Handle account type change and auto-set icon
function handleAccountTypeChange(value: string) {
  const previousAccountType = $formData.accountType;
  $formData.accountType = value;
  updateIconForAccountType(value, previousAccountType);
}

// Update icon based on account type change
function updateIconForAccountType(newAccountType: string, previousAccountType: string | undefined) {
  // Auto-update icon if:
  // 1. No icon is set yet, OR
  // 2. Current icon matches the default for the previous account type (user hasn't customized it)
  const defaults = accountTypeDefaults[newAccountType];
  const currentIcon = $formData.accountIcon;
  const previousDefaults = previousAccountType ? accountTypeDefaults[previousAccountType] : null;

  const shouldUpdateIcon = defaults && (
    !currentIcon ||
    currentIcon === '' ||
    (previousDefaults && currentIcon === previousDefaults.icon)
  );

  if (shouldUpdateIcon) {
    $formData.accountIcon = defaults.icon;
  }
}
</script>

<WizardFormWrapper
  title={isUpdate ? "Edit Account" : "Create New Account"}
  subtitle={isUpdate ? "Update your account details" : "Add a new account to track your finances"}
  wizardStore={accountWizardStore}
  onComplete={handleWizardComplete}
  defaultMode="wizard"
  showWizardActions={true}
  showWizardPrevious={true}
  currentFormData={{
    name: $formData.name,
    notes: $formData.notes,
    accountType: $formData.accountType,
    institution: $formData.institution,
    accountIcon: $formData.accountIcon,
    accountColor: $formData.accountColor,
    initialBalance: $formData.initialBalance,
    accountNumberLast4: $formData.accountNumberLast4,
    onBudget: $formData.onBudget
  }}
  bind:currentMode={mode}
>
  {#snippet formContent()}
    <form id={`${resolvedFormId}-manual`} method="post" action="/accounts?/add-account" use:enhance class="space-y-6">
      <input hidden value={$formData.id} name="id" />
      <input hidden value={$formData.accountType} name="accountType" />
      <input hidden value={$formData.institution} name="institution" />
      <input hidden value={$formData.accountIcon} name="accountIcon" />
      <input hidden value={$formData.accountColor} name="accountColor" />
      <input hidden value={$formData.initialBalance} name="initialBalance" />
      <input hidden value={$formData.accountNumberLast4} name="accountNumberLast4" />
      <input hidden value={$formData.onBudget} name="onBudget" />

      <!-- Basic Information Section -->
      <Card.Root>
        <Card.Header class="pb-4">
          <div class="flex items-center gap-2">
            <CreditCard class="h-5 w-5 text-primary" />
            <Card.Title class="text-lg">Account Information</Card.Title>
          </div>
          <Card.Description>
            Enter the basic details for your account including name, type, and institution.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Account Name -->
            <Form.Field form={entityForm} name="name">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Account Name</Form.Label>
                  <Input
                    {...props}
                    bind:value={$formData.name}
                    oninput={handleNameChange}
                    placeholder="e.g., Chase Checking, Wells Fargo Savings, Amex Credit Card"
                  />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Account Type -->
            <Form.Field form={entityForm} name="accountType">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Account Type</Form.Label>
                  <Select.Root type="single" value={$formData.accountType} onValueChange={handleAccountTypeChange}>
                    <Select.Trigger {...props}>
                      <span>{$formData.accountType ? accountTypeOptions.find(opt => opt.value === $formData.accountType)?.label : "Select account type"}</span>
                    </Select.Trigger>
                    <Select.Content>
                      {#each accountTypeOptions as option}
                        <Select.Item value={option.value}>{option.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Institution -->
            <Form.Field form={entityForm} name="institution">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Bank/Institution</Form.Label>
                  <Input {...props} bind:value={$formData.institution} placeholder="e.g., Chase Bank" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Account Number Last 4 -->
            <Form.Field form={entityForm} name="accountNumberLast4">
              <Form.Control>
                {#snippet children({props})}
                  <Form.Label>Last 4 Digits</Form.Label>
                  <Input {...props} bind:value={$formData.accountNumberLast4} placeholder="1234" maxlength={4} type="text" inputmode="numeric" />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Visual Customization Section -->
      <Card.Root>
        <Card.Header class="pb-4">
          <div class="flex items-center gap-2">
            <Palette class="h-5 w-5 text-primary" />
            <Card.Title class="text-lg">Visual Customization</Card.Title>
          </div>
          <Card.Description>
            Choose an icon and color to help identify this account visually.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Account Icon -->
            <Form.Field form={entityForm} name="accountIcon">
              <Form.Control>
                {#snippet children({})}
                  <Form.Label>Account Icon</Form.Label>
                  <IconPicker
                    value={$formData.accountIcon}
                    placeholder="Select an icon..."
                    onchange={handleIconChange}
                  />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>

            <!-- Account Color -->
            <Form.Field form={entityForm} name="accountColor">
              <Form.Control>
                {#snippet children({})}
                  <Form.Label>Account Color</Form.Label>
                  <ColorPicker
                    value={$formData.accountColor}
                    placeholder="Choose account color"
                    onchange={(event) => {
                      $formData.accountColor = event.detail.value;
                    }}
                  />
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Initial Balance (only for new accounts) -->
      {#if !isUpdate}
        <Card.Root>
          <Card.Header class="pb-4">
            <div class="flex items-center gap-2">
              <DollarSign class="h-5 w-5 text-primary" />
              <Card.Title class="text-lg">Starting Balance</Card.Title>
            </div>
            <Card.Description>
              Set the initial balance for this account. This will be your starting point for tracking.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <Form.Field form={entityForm} name="initialBalance">
              <Form.Control>
                {#snippet children({})}
                  <Form.Label>Initial Balance</Form.Label>
                  <NumericInput
                    bind:value={$formData.initialBalance}
                    buttonClass="w-full max-w-xs"
                  />
                  <Form.Description>The starting balance for this account</Form.Description>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Budget Settings -->
      <Card.Root>
        <Card.Header class="pb-4">
          <div class="flex items-center gap-2">
            <Wallet class="h-5 w-5 text-primary" />
            <Card.Title class="text-lg">Budget Inclusion</Card.Title>
          </div>
          <Card.Description>
            Control whether this account is included in budget calculations. Off-budget accounts are tracked for net worth only.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="flex items-center space-x-3">
            <Switch bind:checked={$formData.onBudget} />
            <div class="flex-1">
              <Label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Include in budget calculations
              </Label>
              <p class="text-sm text-muted-foreground mt-1">
                {#if $formData.onBudget}
                  This account will be included in your budget totals and spending reports.
                {:else}
                  This account will only be tracked for net worth (e.g., investments, loans).
                {/if}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Notes Section -->
      <Card.Root>
        <Card.Header class="pb-4">
          <Card.Title class="text-lg">Additional Notes</Card.Title>
          <Card.Description>
            Add any additional information or notes about this account.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form.Field form={entityForm} name="notes">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Notes</Form.Label>
                <Textarea {...props} bind:value={$formData.notes} placeholder="Optional notes about this account..." />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        </Card.Content>
      </Card.Root>

      <!-- Submit Button -->
      <div class="flex justify-end">
        <Form.Button class="w-full sm:w-auto px-8">
          {isUpdate ? 'Update Account' : 'Create Account'}
        </Form.Button>
      </div>
    </form>
  {/snippet}

  {#snippet wizardContent()}
    <AccountWizard
      initialData={initialData}
      onComplete={handleWizardComplete}
    />

    <!-- Hidden form for wizard submission -->
    <form id={`${resolvedFormId}-wizard`} method="post" action="/accounts?/add-account" use:enhance class="hidden">
      <input hidden value={$formData.id} name="id" />
      <input hidden value={$formData.name} name="name" />
      <input hidden value={$formData.notes} name="notes" />
      <input hidden value={$formData.accountType} name="accountType" />
      <input hidden value={$formData.institution} name="institution" />
      <input hidden value={$formData.accountIcon} name="accountIcon" />
      <input hidden value={$formData.accountColor} name="accountColor" />
      <input hidden value={$formData.initialBalance} name="initialBalance" />
      <input hidden value={$formData.accountNumberLast4} name="accountNumberLast4" />
      <input hidden value={$formData.onBudget} name="onBudget" />
    </form>
  {/snippet}
</WizardFormWrapper>
