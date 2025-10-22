<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import * as Form from '$lib/components/ui/form';
import {Input} from '$lib/components/ui/input';
import {Label} from '$lib/components/ui/label';
import {Textarea} from '$lib/components/ui/textarea';
import {Badge} from '$lib/components/ui/badge';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import {superForm} from 'sveltekit-superforms';
import {zod4Client} from 'sveltekit-superforms/adapters';
import {superformInsertBudgetSchema} from '$lib/schema/superforms';
import {
  budgetTypes,
  budgetEnforcementLevels,
  periodTemplateTypes,
  type BudgetType,
  type BudgetScope,
} from '$lib/schema/budgets';
import type {Account} from '$lib/schema/accounts';
import type {Category} from '$lib/schema/categories';
import type {Schedule} from '$lib/schema/schedules';
import { createTransformAccessors } from '$lib/utils/bind-helpers';

let {
  formData,
  accounts,
  categories,
  schedules = [],
  budgetId,
  onCancel,
  formId = 'budget-form',
}: {
  formData: any;
  accounts: Account[];
  categories: Category[];
  schedules?: Schedule[];
  budgetId?: number;
  onCancel?: () => void;
  formId?: string;
} = $props();

const isUpdate = $derived(budgetId !== undefined && budgetId > 0);

const form = superForm(formData, {
  validators: zod4Client(superformInsertBudgetSchema),
  dataType: 'json',
  id: formId,
  resetForm: false,
  taintedMessage: null,
});

const {form: formStore, enhance, submitting} = form;

// Reactive state from form data
const selectedBudgetType = $derived(($formStore.type || "account-monthly") as BudgetType);
const selectedAccountIds = $derived($formStore.accountIds || []);
const selectedCategoryIds = $derived($formStore.categoryIds || []);

const availableAccounts = $derived(accounts.filter(a => a.deletedAt === null));
const availableCategories = $derived(categories);

const selectedAccounts = $derived.by(() =>
  selectedAccountIds
    .map((id: number) => availableAccounts.find(account => account.id === id))
    .filter(Boolean) as Account[]
);

const selectedCategories = $derived.by(() =>
  selectedCategoryIds
    .map((id: number) => availableCategories.find(category => category.id === id))
    .filter(Boolean) as Category[]
);

// Budget type configurations
const budgetTypeConfigs: Record<BudgetType, {
  label: string;
  description: string;
  scope: BudgetScope;
  requiresAccounts: boolean;
  requiresCategories: boolean;
  requiresAmount: boolean;
}> = {
  "account-monthly": {
    label: "Account Monthly",
    description: "Set monthly spending limits per account",
    scope: "account",
    requiresAccounts: true,
    requiresCategories: false,
    requiresAmount: true
  },
  "category-envelope": {
    label: "Category Envelope",
    description: "YNAB-style envelope budgeting with rollover",
    scope: "category",
    requiresAccounts: false,
    requiresCategories: true,
    requiresAmount: true
  },
  "goal-based": {
    label: "Goal-Based",
    description: "Track progress toward savings or spending goals",
    scope: "mixed",
    requiresAccounts: false,
    requiresCategories: true,
    requiresAmount: true
  },
  "scheduled-expense": {
    label: "Scheduled Expense",
    description: "Budget for recurring scheduled transactions",
    scope: "account",
    requiresAccounts: true,
    requiresCategories: false,
    requiresAmount: true
  }
};

const currentBudgetConfig = $derived(budgetTypeConfigs[selectedBudgetType]);

function addAccount(accountId: number) {
  if (!selectedAccountIds.includes(accountId)) {
    $formStore.accountIds = [...selectedAccountIds, accountId];
  }
}

function removeAccount(accountId: number) {
  $formStore.accountIds = selectedAccountIds.filter((id: number) => id !== accountId);
}

function addCategory(categoryId: number) {
  if (!selectedCategoryIds.includes(categoryId)) {
    $formStore.categoryIds = [...selectedCategoryIds, categoryId];
  }
}

function removeCategory(categoryId: number) {
  $formStore.categoryIds = selectedCategoryIds.filter((id: number) => id !== categoryId);
}

// Auto-update scope when type changes using accessors
const typeAccessors = createTransformAccessors(
  () => $formStore.type,
  (value: BudgetType) => {
    $formStore.type = value;
    // Automatically update scope when type changes
    const newScope = budgetTypeConfigs[value].scope;
    if ($formStore.scope !== newScope) {
      $formStore.scope = newScope;
    }
  }
);

// Account/category selection state with accessors
let selectedAccountValue = $state('');
let selectedCategoryValue = $state('');

const accountAccessors = createTransformAccessors(
  () => selectedAccountValue,
  (value: string) => {
    if (value) {
      addAccount(parseInt(value));
      selectedAccountValue = ''; // Reset after adding
    } else {
      selectedAccountValue = value;
    }
  }
);

const categoryAccessors = createTransformAccessors(
  () => selectedCategoryValue,
  (value: string) => {
    if (value) {
      addCategory(parseInt(value));
      selectedCategoryValue = ''; // Reset after adding
    } else {
      selectedCategoryValue = value;
    }
  }
);

// Schedule selection for scheduled-expense budgets
const availableSchedules = $derived(
  schedules.filter(s => s.status === 'active' && !s.budgetId)
);

const selectedSchedule = $derived.by(() => {
  if (!$formStore.linkedScheduleId) return null;
  return schedules.find(s => s.id === $formStore.linkedScheduleId);
});

const scheduleAccessors = createTransformAccessors(
  () => $formStore.linkedScheduleId?.toString() ?? '',
  (value: string) => {
    $formStore.linkedScheduleId = value ? parseInt(value) : null;
  }
);
</script>

<form method="POST" use:enhance>
  <Card.Root>
    <Card.Header>
      <Card.Title>Budget Information</Card.Title>
      <Card.Description>
        Fill in the details for your new budget. Choose the type that best fits your tracking needs.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Budget Type Selection -->
      <Form.Field {form} name="type">
        <Form.Control>
          {#snippet children({props})}
            <Form.Label>Budget Type</Form.Label>
            <Select.Root
              type="single"
              bind:value={typeAccessors.get, typeAccessors.set}
            >
              <Select.Trigger {...props}>
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
            <Form.FieldErrors />
            <Form.Description>{currentBudgetConfig.description}</Form.Description>
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Basic Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Field {form} name="name" class="md:col-span-2">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Budget Name</Form.Label>
              <Input
                {...props}
                bind:value={$formStore.name}
                placeholder="e.g., Monthly Expenses"
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <Form.Field {form} name="description" class="md:col-span-2">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Description (optional)</Form.Label>
              <Textarea
                {...props}
                bind:value={$formStore.description}
                placeholder="Describe what this budget covers..."
                rows={2}
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <Form.Field {form} name="enforcementLevel">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Enforcement Level</Form.Label>
              <Select.Root
                type="single"
                bind:value={$formStore.enforcementLevel}
              >
                <Select.Trigger {...props}>
                  {$formStore.enforcementLevel === "none" ? "None (Tracking Only)" :
                   $formStore.enforcementLevel === "warning" ? "Warning (Alerts)" :
                   $formStore.enforcementLevel === "strict" ? "Strict (Blocking)" : $formStore.enforcementLevel}
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
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        {#if currentBudgetConfig.requiresAmount}
          <Form.Field {form} name="allocatedAmount">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>
                  {selectedBudgetType === "goal-based" ? "Goal Amount" : "Budget Amount"}
                </Form.Label>
                <NumericInput bind:value={$formStore.allocatedAmount} buttonClass="w-full" />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        {/if}
      </div>

      <!-- Period Configuration -->
      <div class="space-y-4 pt-4 border-t border-border">
        <h3 class="text-sm font-medium">Period Configuration</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Field {form} name="periodType">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Period Type</Form.Label>
                <Select.Root
                  type="single"
                  bind:value={$formStore.periodType}
                >
                  <Select.Trigger {...props}>
                    {$formStore.periodType ? $formStore.periodType.charAt(0).toUpperCase() + $formStore.periodType.slice(1) : "Monthly"}
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
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <Form.Field {form} name="startDay">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Start Day</Form.Label>
                <Input
                  {...props}
                  type="number"
                  min="1"
                  max={$formStore.periodType === "monthly" ? "31" : $formStore.periodType === "weekly" ? "7" : "366"}
                  bind:value={$formStore.startDay}
                  placeholder={$formStore.periodType === "monthly" ? "1-31" : $formStore.periodType === "weekly" ? "1-7 (1=Monday)" : "1-366"}
                />
                <Form.Description>
                  {$formStore.periodType === "monthly" ? "Day of the month when budget period starts (1-31)" :
                   $formStore.periodType === "weekly" ? "Day of the week when budget period starts (1=Monday, 7=Sunday)" :
                   $formStore.periodType === "yearly" ? "Day of the year when budget period starts (1-366)" :
                   "Day when budget period starts"}
                </Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        </div>
      </div>

      <!-- Account Selection -->
      {#if currentBudgetConfig.requiresAccounts}
        <div class="space-y-2 pt-4 border-t border-border">
          <Label>Accounts</Label>
          <Select.Root
            type="single"
            bind:value={accountAccessors.get, accountAccessors.set}
          >
            <Select.Trigger>
              Select accounts to include
            </Select.Trigger>
            <Select.Content>
              {#each availableAccounts as account (account.id)}
                {#if !selectedAccountIds.includes(account.id)}
                  <Select.Item value={String(account.id)}>
                    {account.name}
                  </Select.Item>
                {/if}
              {/each}
            </Select.Content>
          </Select.Root>

          {#if selectedAccounts.length > 0}
            <div class="flex flex-wrap gap-2 mt-2">
              {#each selectedAccounts as account (account.id)}
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
          {:else}
            <p class="text-sm text-muted-foreground">Select at least one account for this budget</p>
          {/if}
        </div>
      {/if}

      <!-- Schedule Selection (for scheduled-expense budgets) -->
      {#if selectedBudgetType === 'scheduled-expense'}
        <div class="space-y-2 pt-4 border-t border-border">
          <Label>Link to Schedule (Optional)</Label>
          <Select.Root
            type="single"
            bind:value={scheduleAccessors.get, scheduleAccessors.set}
          >
            <Select.Trigger>
              {selectedSchedule ? selectedSchedule.name : 'Select a schedule...'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">None</Select.Item>
              {#each availableSchedules as schedule (schedule.id)}
                <Select.Item value={String(schedule.id)}>
                  <div class="flex flex-col">
                    <span class="font-medium">{schedule.name}</span>
                    <span class="text-xs text-muted-foreground">
                      {schedule.payee?.name || 'No payee'} • {schedule.scheduleDate?.frequency || 'One-time'}
                    </span>
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <Form.Description>
            Link this budget to a recurring schedule for automatic tracking
          </Form.Description>
          {#if selectedSchedule}
            <div class="p-3 bg-muted rounded-md">
              <p class="text-sm font-medium">{selectedSchedule.name}</p>
              <p class="text-xs text-muted-foreground mt-1">
                Amount: ${selectedSchedule.amount.toFixed(2)} •
                {selectedSchedule.scheduleDate?.frequency || 'One-time'}
              </p>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Category Selection -->
      {#if currentBudgetConfig.requiresCategories}
        <div class="space-y-2 pt-4 border-t border-border">
          <Label>Categories</Label>
          <Select.Root
            type="single"
            bind:value={categoryAccessors.get, categoryAccessors.set}
          >
            <Select.Trigger>
              Select categories to include
            </Select.Trigger>
            <Select.Content>
              {#each availableCategories as category (category.id)}
                {#if !selectedCategoryIds.includes(category.id)}
                  <Select.Item value={String(category.id)}>
                    {category.name}
                  </Select.Item>
                {/if}
              {/each}
            </Select.Content>
          </Select.Root>

          {#if selectedCategories.length > 0}
            <div class="flex flex-wrap gap-2 mt-2">
              {#each selectedCategories as category (category.id)}
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
          {:else}
            <p class="text-sm text-muted-foreground">Select at least one category for this budget</p>
          {/if}
        </div>
      {/if}
    </Card.Content>
    <Card.Footer class="flex gap-2">
      <Form.Button disabled={$submitting}>
        {#if isUpdate}
          {$submitting ? "Updating..." : "Update Budget"}
        {:else}
          {$submitting ? "Creating..." : "Create Budget"}
        {/if}
      </Form.Button>
      {#if onCancel}
        <Button type="button" variant="outline" onclick={onCancel} disabled={$submitting}>
          Cancel
        </Button>
      {/if}
    </Card.Footer>
  </Card.Root>
</form>
