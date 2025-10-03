<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Calendar,
    FileText,
    CheckCircle2,
    Info,
    RefreshCw,
    DollarSign,
    Building2,
    Tag,
    HandCoins
  } from "@lucide/svelte/icons";
  import WizardStep from "./wizard-step.svelte";
  import RepeatingDateInput from "$lib/components/input/repeating-date-input.svelte";
  import DateInput from "$lib/components/input/date-input.svelte";
  import MultiNumericInput from "$lib/components/input/multi-numeric-input.svelte";
  import RepeatingDateInputModel from "$lib/models/repeating_date.svelte";
  import { type DateValue, today, getLocalTimeZone } from "@internationalized/date";
  import { scheduleWizardStore, type WizardStep as WizardStepType } from "$lib/stores/wizardStore.svelte";
  import { createScheduleValidationEngine } from "$lib/utils/wizardValidation";
  import type { Schedule } from "$lib/schema/schedules";
  import type { EditableEntityItem } from "$lib/types";

  interface Props {
    initialData?: Partial<Schedule>;
    accounts?: EditableEntityItem[];
    payees?: EditableEntityItem[];
    categories?: EditableEntityItem[];
  }

  let { initialData = {}, accounts = [], payees = [], categories = [] }: Props = $props();

  // Date input variables
  let recurringDateModel = $state(new RepeatingDateInputModel());
  let oneTimeDate: DateValue | undefined = $state();

  // Initialize wizard steps
  const steps: WizardStepType[] = [
    {
      id: 'schedule-type',
      title: 'Schedule Type & Frequency',
      description: 'Choose schedule type and configure timing'
    },
    {
      id: 'transaction-details',
      title: 'Transaction Details',
      description: 'Enter the transaction name and amount'
    },
    {
      id: 'payee-account-category',
      title: 'Payee, Account & Category',
      description: 'Select payee, account, and category for this transaction'
    },
    {
      id: 'review-create',
      title: 'Review & Create',
      description: 'Review your schedule details before creating'
    }
  ];

  const formData = $derived(scheduleWizardStore.formData);

  // Amount state - sync with formData
  let amountValue = $state<[number, number]>([0, 0]);
  let amountType = $state<'exact' | 'approximate' | 'range'>('exact');

  // Sync amountValue and amountType with formData
  $effect(() => {
    amountValue = [formData['amount'] ?? 0, formData['amount_2'] ?? 0];
    amountType = (formData['amount_type'] as 'exact' | 'approximate' | 'range') ?? 'exact';
  });

  $effect(() => {
    updateField('amount', amountValue[0]);
    updateField('amount_2', amountValue[1]);
    updateField('amount_type', amountType);
  });

  // Set up validation engine
  const validationEngine = createScheduleValidationEngine();

  // Override the wizard store's validation method
  scheduleWizardStore.validateStep = (stepId: string, formData: Record<string, any>) => {
    // For the first step (schedule-type), validate schedule type and frequency configuration
    if (stepId === 'schedule-type') {
      const recurring = formData['recurring'];

      // First check if recurring field exists and is explicitly true or false
      const hasRecurringValue = 'recurring' in formData && (recurring === true || recurring === false);

      if (!hasRecurringValue) {
        scheduleWizardStore.setStepValidation(stepId, false, ['Please select a schedule type']);
        return false;
      }

      // Then validate the frequency configuration based on schedule type
      if (recurring === false) {
        // For one-time transactions, always treat as valid since DateInput defaults to today
        // If no date is explicitly set, we'll use today's date during submission
        const isValid = true;
        scheduleWizardStore.setStepValidation(stepId, isValid, []);
        return isValid;
      } else {
        // For recurring schedules, validate repeating_date
        const hasRepeatingDate = formData['repeating_date'] !== undefined && formData['repeating_date'] !== null;
        const isValid = hasRepeatingDate;
        scheduleWizardStore.setStepValidation(stepId, isValid, isValid ? [] : ['Please configure the recurring schedule']);
        return isValid;
      }
    }

    // Special handling for review-create step - only valid when other required steps are complete
    if (stepId === 'review-create') {
      const requiredSteps = ['schedule-type', 'transaction-details', 'payee-account-category'];
      const allRequiredValid = requiredSteps.every(id => {
        const result = validationEngine.validateStep(id, formData);
        return result.isValid;
      });
      scheduleWizardStore.setStepValidation(stepId, allRequiredValid, allRequiredValid ? [] : ['Complete previous steps first']);
      return allRequiredValid;
    }

    const result = validationEngine.validateStep(stepId, formData);
    scheduleWizardStore.setStepValidation(stepId, result.isValid, result.errors);
    return result.isValid;
  };

  // Initialize the wizard once
  $effect(() => {
    scheduleWizardStore.initialize(steps, initialData);
  });

  // Form handlers
  function updateField(field: string, value: any) {
    scheduleWizardStore.updateFormData(field, value);

    // Handle recurring field changes
    if (field === 'recurring') {
      if (value === false) {
        // Initialize one-time date with today's date if not already set
        const todayDate = today(getLocalTimeZone());
        if (!oneTimeDate) {
          oneTimeDate = todayDate;
        }
        scheduleWizardStore.updateFormData('transaction_date', oneTimeDate || todayDate);
      }
      scheduleWizardStore.validateCurrentStep();
    }
  }

  // Sync recurring date model with form data
  $effect(() => {
    if (recurringDateModel?.value) {
      updateField('repeating_date', recurringDateModel.value);
    }
  });

  // Schedule type options
  const scheduleTypes = [
    {
      value: true,
      title: 'Recurring Schedule',
      description: 'Repeats automatically on a regular schedule',
      icon: RefreshCw,
      examples: ['Monthly salary', 'Weekly groceries', 'Annual subscription']
    },
    {
      value: false,
      title: 'One-time Transaction',
      description: 'Scheduled for a specific date only',
      icon: Calendar,
      examples: ['Holiday bonus', 'Tax refund', 'One-time purchase']
    }
  ];
</script>

<!-- Step 1: Schedule Type & Frequency -->
<WizardStep
  wizardStore={scheduleWizardStore}
  stepId="schedule-type"
  title="Schedule Type & Frequency"
  description="Choose schedule type and configure when it occurs."
>
  <div class="space-y-8">
    <!-- Schedule Type Selection -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold">Schedule Type</h3>
      <div class="space-y-4">
        {#each scheduleTypes as scheduleType}
          {@const isSelected = formData['recurring'] === scheduleType.value}
          <Card.Root
            class="cursor-pointer transition-all duration-200 {isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}"
            onclick={() => updateField('recurring', scheduleType.value)}
          >
            <Card.Content class="p-6">
              <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <scheduleType.icon class="h-5 w-5 text-primary" />
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-base">{scheduleType.title}</h3>
                    <p class="text-sm text-muted-foreground">{scheduleType.description}</p>
                  </div>
                  {#if isSelected}
                    <CheckCircle2 class="h-5 w-5 text-primary" />
                  {/if}
                </div>

                <!-- Examples -->
                <div class="space-y-2">
                  <p class="text-xs font-medium text-muted-foreground">Examples:</p>
                  <div class="flex flex-wrap gap-1">
                    {#each scheduleType.examples as example}
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

    <!-- Frequency Configuration -->
    {#if formData['recurring'] !== undefined}
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">
          {formData['recurring'] ? 'Recurring Frequency' : 'Transaction Date'}
        </h3>

        {#if formData['recurring']}
          <div class="space-y-4">
            <RepeatingDateInput
              bind:value={recurringDateModel}
              hideRecurringToggle={true}
            />
          </div>
        {:else}
          <div class="space-y-4">
            <DateInput
              value={oneTimeDate ?? today(getLocalTimeZone())}
              handleSubmit={(value) => {
                oneTimeDate = value ?? today(getLocalTimeZone());
                updateField('transaction_date', oneTimeDate);
              }}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#snippet helpContent()}
    <div class="space-y-3">
      <div class="space-y-2">
        <p class="text-sm font-medium">Schedule Types:</p>
        <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li><strong>Recurring:</strong> Regular income/expenses (salary, rent, subscriptions)</li>
          <li><strong>One-time:</strong> Scheduled payments that happen only once</li>
        </ul>
      </div>

      {#if formData['recurring'] === true}
        <div class="space-y-2">
          <p class="text-sm font-medium">Recurring Options:</p>
          <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Daily, weekly, monthly, or yearly</li>
            <li>Custom intervals (every 2 weeks, every 3 months, etc.)</li>
            <li>Start and end dates for the schedule</li>
          </ul>
        </div>
      {:else if formData['recurring'] === false}
        <div class="space-y-2">
          <p class="text-sm font-medium">One-time Transaction:</p>
          <p class="text-xs text-muted-foreground">
            Simply choose the date when this transaction should be created.
          </p>
        </div>
      {/if}
    </div>
  {/snippet}
</WizardStep>

<!-- Step 2: Transaction Details -->
<WizardStep
  wizardStore={scheduleWizardStore}
  stepId="transaction-details"
  title="Transaction Details"
  description="Enter the basic information about this transaction."
>
  <div class="space-y-6">
    <!-- Schedule Name -->
    <div class="space-y-2">
      <Label for="schedule-name" class="text-sm font-medium">
        Schedule Name *
      </Label>
      <Input
        id="schedule-name"
        value={formData['name'] || ''}
        oninput={(e) => updateField('name', e.currentTarget.value)}
        placeholder="e.g., Monthly Salary, Weekly Groceries"
        class="w-full"
        required
      />
      <p class="text-xs text-muted-foreground">
        Choose a clear name that describes this transaction.
      </p>
    </div>

    <!-- Amount Configuration -->
    <MultiNumericInput bind:value={amountValue} bind:type={amountType} />

    <!-- Auto-add Setting -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <Label class="text-sm font-medium">Automatic Transaction Creation</Label>
          <p class="text-xs text-muted-foreground">
            Automatically create transactions based on this schedule
          </p>
        </div>
        <Switch
          checked={formData['auto_add'] || false}
          onCheckedChange={(checked) => updateField('auto_add', checked)}
        />
      </div>
    </div>
  </div>

  {#snippet helpContent()}
    <div class="space-y-2">
      <p class="text-sm">
        <strong>Amount Types:</strong>
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        <li><strong>Exact:</strong> Use for fixed amounts like salary or rent</li>
        <li><strong>Range:</strong> Set minimum and maximum for variable expenses</li>
        <li><strong>Approximate:</strong> Estimate for expenses that fluctuate</li>
      </ul>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 3: Payee, Account & Category -->
<WizardStep
  wizardStore={scheduleWizardStore}
  stepId="payee-account-category"
  title="Payee, Account & Category"
  description="Select who this transaction is to/from, which account, and category."
>
  <div class="space-y-6">
    <!-- Payee Selection -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Payee *</Label>
      <Select.Root
        type="single"
        value={formData['payeeId']?.toString() || ''}
        onValueChange={(value) => value && updateField('payeeId', parseInt(value))}
      >
        <Select.Trigger>
          <div class="flex items-center gap-2">
            <HandCoins class="h-4 w-4 text-muted-foreground" />
            <span>{payees.find(p => p.id === formData['payeeId'])?.name || 'Select payee...'}</span>
          </div>
        </Select.Trigger>
        <Select.Content>
          {#each payees as payee}
            <Select.Item value={payee.id.toString()}>{payee.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      <p class="text-xs text-muted-foreground">
        Who is this transaction to or from?
      </p>
    </div>

    <!-- Account Selection -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Account *</Label>
      <Select.Root
        type="single"
        value={formData['accountId']?.toString() || ''}
        onValueChange={(value) => value && updateField('accountId', parseInt(value))}
      >
        <Select.Trigger>
          <div class="flex items-center gap-2">
            <Building2 class="h-4 w-4 text-muted-foreground" />
            <span>{accounts.find(a => a.id === formData['accountId'])?.name || 'Select account...'}</span>
          </div>
        </Select.Trigger>
        <Select.Content>
          {#each accounts as account}
            <Select.Item value={account.id.toString()}>{account.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      <p class="text-xs text-muted-foreground">
        Which account will this transaction affect?
      </p>
    </div>

    <!-- Category Selection -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">Category</Label>
      <Select.Root
        type="single"
        value={formData['categoryId']?.toString() || ''}
        onValueChange={(value) => value && updateField('categoryId', parseInt(value))}
      >
        <Select.Trigger>
          <div class="flex items-center gap-2">
            <Tag class="h-4 w-4 text-muted-foreground" />
            <span>{categories.find(c => c.id === formData['categoryId'])?.name || 'Select category...'}</span>
          </div>
        </Select.Trigger>
        <Select.Content>
          {#each categories as category}
            <Select.Item value={category.id.toString()}>{category.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      <p class="text-xs text-muted-foreground">
        Categorize this transaction for better tracking (optional).
      </p>
    </div>
  </div>

  {#snippet helpContent()}
    <div class="space-y-3">
      <div class="space-y-2">
        <p class="text-sm font-medium">What is a payee?</p>
        <p class="text-sm text-muted-foreground">
          The person, company, or organization you're paying money to or receiving money from.
        </p>
        <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li>Your employer (salary)</li>
          <li>Grocery stores (food expenses)</li>
          <li>Utility companies (bills)</li>
        </ul>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium">Accounts vs Categories:</p>
        <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li><strong>Account:</strong> Where money comes from/goes to (checking, credit card)</li>
          <li><strong>Category:</strong> Type of expense/income (groceries, salary, entertainment)</li>
        </ul>
      </div>
    </div>
  {/snippet}
</WizardStep>

<!-- Step 4: Review & Create -->
<WizardStep
  wizardStore={scheduleWizardStore}
  stepId="review-create"
  title="Review & Create Schedule"
  description="Please review the schedule details below before creating."
  showNavigation={false}
>
  <div class="space-y-6">
    <!-- Schedule Summary -->
    <Card.Root>
      <Card.Header class="pb-4">
        <Card.Title class="flex items-center gap-2">
          <CheckCircle2 class="h-5 w-5 text-green-600" />
          Schedule Summary
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Schedule Type -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Schedule Type</p>
            <p class="text-muted-foreground text-sm">How often this occurs</p>
          </div>
          <div class="text-right">
            <Badge variant={formData['recurring'] ? "default" : "secondary"}>
              {formData['recurring'] ? "Recurring" : "One-time"}
            </Badge>
          </div>
        </div>

        <!-- Schedule Name -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Name</p>
            <p class="text-muted-foreground text-sm">Schedule identifier</p>
          </div>
          <div class="text-right">
            <p class="font-mono text-sm">{formData['name'] || 'Not specified'}</p>
            {#if !formData['name']}
              <Badge variant="destructive" class="text-xs">Required</Badge>
            {/if}
          </div>
        </div>

        <!-- Amount -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Amount</p>
            <p class="text-muted-foreground text-sm">Transaction amount</p>
          </div>
          <div class="text-right">
            {#if (formData['amount_type'] || 'exact') === 'range'}
              <p class="font-mono text-sm">${formData['amount'] || 0} - ${formData['amount_2'] || 0}</p>
              <Badge variant="outline" class="text-xs">Range</Badge>
            {:else}
              <p class="font-mono text-sm">${formData['amount'] || 0}</p>
              <Badge variant="outline" class="text-xs">
                {(formData['amount_type'] || 'exact') === 'approximate' ? 'Approximate' : 'Exact'}
              </Badge>
            {/if}
          </div>
        </div>

        <!-- Auto-add -->
        <div class="flex justify-between items-start">
          <div>
            <p class="font-medium text-sm">Auto-create Transactions</p>
            <p class="text-muted-foreground text-sm">Automatic transaction creation</p>
          </div>
          <div class="text-right">
            <Badge variant={formData['auto_add'] ? "default" : "secondary"}>
              {formData['auto_add'] ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        <!-- Creation Notice -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
          <div class="flex items-start gap-3">
            <Info class="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
              <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
                Ready to Create Schedule
              </p>
              <p class="text-sm text-blue-700 dark:text-blue-200">
                Click "Complete" to create your schedule. You can edit these details later if needed.
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
            <p class="text-sm">Your schedule will be created and activated</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-300">2</span>
            </div>
            <p class="text-sm">
              {formData['auto_add'] ? 'Transactions will be created automatically based on the schedule' : 'You can manually create transactions from this schedule'}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span class="text-xs font-medium text-blue-600 dark:text-blue-300">3</span>
            </div>
            <p class="text-sm">Manage and edit your schedule from the schedules page</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</WizardStep>