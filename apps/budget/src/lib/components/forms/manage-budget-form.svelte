<script lang="ts">
import { ManageCategoryForm } from '$lib/components/forms';
import { FieldHelpButton } from '$lib/components/help';
import MultiSelectEntityInput from '$lib/components/input/multi-select-entity-input.svelte';
import { helpMode } from '$lib/states/ui/help.svelte';
import { cn } from '$lib/utils';
import DateRangeScrubberInput from '$lib/components/input/date-range-scrubber-input.svelte';
import MonthDayScrubberInput from '$lib/components/input/month-day-scrubber-input.svelte';
import NumberScrubberInput from '$lib/components/input/number-scrubber-input.svelte';
import PeriodRangeScrubberInput from '$lib/components/input/period-range-scrubber-input.svelte';
import QuarterDayScrubberInput from '$lib/components/input/quarter-day-scrubber-input.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { Textarea } from '$lib/components/ui/textarea';
import { useEntityForm } from '$lib/hooks/forms/use-entity-form';
import type { Account } from '$lib/schema/accounts';
import {
  budgetEnforcementLevels,
  budgetTypes,
  periodTemplateTypes,
  type BudgetScope,
  type BudgetType,
} from '$lib/schema/budgets';
import type { Category } from '$lib/schema/categories';
import type { Schedule } from '$lib/schema/schedules';
import { superformInsertBudgetSchema } from '$lib/schema/superforms';
import { BudgetState } from '$lib/states/budgets.svelte';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { EditableEntityItem } from '$lib/types';
import { createTransformAccessors } from '$lib/utils/bind-helpers';
import CircleX from '@lucide/svelte/icons/circle-x';
import Tag from '@lucide/svelte/icons/tag';

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

// Get budget state (may not exist on all pages)
const budgetState = BudgetState.safeGet();

const _formData = (() => formData)();
const _formId = (() => formId)();
const _budgetId = (() => budgetId)();

const form = useEntityForm({
  formData: _formData,
  schema: superformInsertBudgetSchema,
  formId: _formId,
  entityId: _budgetId,
  onSave: (entity) => budgetState?.upsertBudget(entity),
  onUpdate: (entity) => budgetState?.upsertBudget(entity),
  customOptions: {
    dataType: 'json',
    resetForm: false,
    taintedMessage: null,
  },
});

const { form: formStore, enhance, submitting, isUpdate } = form;

// Reactive state from form data
const selectedBudgetType = $derived(($formStore.type || 'account-monthly') as BudgetType);
const selectedAccountIds = $derived($formStore.accountIds || []);
const selectedCategoryIds = $derived($formStore.categoryIds || []);

// Helper to convert day-of-year to a formatted date string
function dayOfYearToDate(dayOfYear: number, year?: number): Date {
  const y = year ?? new Date().getFullYear();
  const date = new Date(y, 0, 1); // January 1st
  date.setDate(dayOfYear);
  return date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to format a number with ordinal suffix (1st, 2nd, 3rd, etc.)
function formatOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// Helper to format day of week (1=Monday, 2=Tuesday, etc.)
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function formatWeekday(day: number): string {
  return weekdays[day - 1] || String(day);
}

// Computed date range for custom periods
const customPeriodDateRange = $derived.by(() => {
  if ($formStore.periodType !== 'custom') return null;
  const startDay = $formStore.startDay || 1;
  const intervalCount = $formStore.intervalCount || 30;
  const startDate = dayOfYearToDate(startDay);
  const endDate = dayOfYearToDate(startDay + intervalCount - 1);
  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
    startFull: startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
  };
});

const availableAccounts = $derived(accounts.filter((a) => a.deletedAt === null));
const availableCategories = $derived(categories);

const selectedAccounts = $derived.by(
  () =>
    selectedAccountIds
      .map((id: number) => availableAccounts.find((account) => account.id === id))
      .filter(Boolean) as Account[]
);

const selectedCategories = $derived.by(
  () =>
    selectedCategoryIds
      .map((id: number) => availableCategories.find((category) => category.id === id))
      .filter(Boolean) as Category[]
);

// Categories state for entity management
const categoriesState = CategoriesState.get();

// Category management handlers
const handleCategorySave = (newCategory: EditableEntityItem, isNew: boolean) => {
  if (isNew) {
    categoriesState.addCategory(newCategory as Category);
    // Auto-add to selected categories
    addCategory(newCategory.id);
  } else {
    categoriesState.updateCategory(newCategory as Category);
  }
};

const handleCategoryDelete = (id: number) => {
  categoriesState.deleteCategory(id);
  // Remove from selected categories if it was selected
  removeCategory(id);
};

// Budget type configurations
const budgetTypeConfigs: Record<
  BudgetType,
  {
    label: string;
    description: string;
    scope: BudgetScope;
    requiresAccounts: boolean;
    requiresCategories: boolean;
    requiresAmount: boolean;
  }
> = {
  'account-monthly': {
    label: 'Account Monthly',
    description: 'Set monthly spending limits per account',
    scope: 'account',
    requiresAccounts: true,
    requiresCategories: false,
    requiresAmount: true,
  },
  'category-envelope': {
    label: 'Category Envelope',
    description: 'YNAB-style envelope budgeting with rollover',
    scope: 'category',
    requiresAccounts: false,
    requiresCategories: true,
    requiresAmount: true,
  },
  'goal-based': {
    label: 'Goal-Based',
    description: 'Track progress toward savings or spending goals',
    scope: 'mixed',
    requiresAccounts: false,
    requiresCategories: true,
    requiresAmount: true,
  },
  'scheduled-expense': {
    label: 'Scheduled Expense',
    description: 'Budget for recurring scheduled transactions',
    scope: 'account',
    requiresAccounts: true,
    requiresCategories: false,
    requiresAmount: true,
  },
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

// Account selection state with accessors
let selectedAccountValue = $state('');

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

// Schedule selection for scheduled-expense budgets
const availableSchedules = $derived(schedules.filter((s) => s.status === 'active' && !s.budgetId));

const selectedSchedule = $derived.by(() => {
  if (!$formStore.linkedScheduleId) return null;
  return schedules.find((s) => s.id === $formStore.linkedScheduleId);
});

const scheduleAccessors = createTransformAccessors(
  () => $formStore.linkedScheduleId?.toString() ?? '',
  (value: string) => {
    $formStore.linkedScheduleId = value ? parseInt(value) : null;
  }
);

// Helper to check if a help ID is currently being documented
const isHelpHighlighted = (helpId: string) =>
  helpMode.isSheetOpen && helpMode.currentDocId === helpId;
</script>

<form method="POST" use:enhance>
  <Card.Root>
    <Card.Header>
      <Card.Title>Budget Information</Card.Title>
      <Card.Description>
        Fill in the details for your new budget. Choose the type that best fits your tracking needs.
      </Card.Description>
    </Card.Header>
    <Card.Content class="@container space-y-6">
      <!-- Budget Type & Name (side-by-side on larger containers) -->
      <div class="grid grid-cols-1 gap-4 @lg:grid-cols-2">
        <Form.Field {form} name="type" data-help-id="budget-type-field" data-help-title="Budget Type" class={cn(isHelpHighlighted('budget-type-field') && 'help-topic-highlight')}>
          <Form.Control>
            {#snippet children({ props })}
              <div class="flex items-center gap-1.5">
                <Form.Label>Budget Type</Form.Label>
                <FieldHelpButton helpId="budget-type-field" />
              </div>
              <Select.Root type="single" bind:value={typeAccessors.get, typeAccessors.set}>
                <Select.Trigger {...props} class="w-full">
                  {currentBudgetConfig.label}
                </Select.Trigger>
                <Select.Content>
                  {#each budgetTypes as budgetType}
                    <Select.Item value={budgetType}>
                      <div class="flex flex-col">
                        <span class="font-medium">{budgetTypeConfigs[budgetType].label}</span>
                        <span class="text-muted-foreground text-xs"
                          >{budgetTypeConfigs[budgetType].description}</span>
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

        <Form.Field {form} name="name" class={cn(isHelpHighlighted('budget-name-field') && 'help-topic-highlight')} data-help-id="budget-name-field" data-help-title="Budget Name">
          <Form.Control>
            {#snippet children({ props })}
              <div class="flex items-center gap-1.5">
                <Form.Label>Budget Name</Form.Label>
                <FieldHelpButton helpId="budget-name-field" />
              </div>
              <Input {...props} bind:value={$formStore.name} placeholder="e.g., Monthly Expenses" />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>

      <!-- Additional Information -->
      <div class="grid grid-cols-1 gap-4 @lg:grid-cols-2">
        <Form.Field {form} name="description" class="@lg:col-span-2">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Description (optional)</Form.Label>
              <Textarea
                {...props}
                bind:value={$formStore.description}
                placeholder="Describe what this budget covers..."
                rows={2} />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <Form.Field {form} name="enforcementLevel" data-help-id="budget-enforcement-field" data-help-title="Enforcement Level" class={cn(isHelpHighlighted('budget-enforcement-field') && 'help-topic-highlight')}>
          <Form.Control>
            {#snippet children({ props })}
              <div class="flex items-center gap-1.5">
                <Form.Label>Enforcement Level</Form.Label>
                <FieldHelpButton helpId="budget-enforcement-field" />
              </div>
              <Select.Root type="single" bind:value={$formStore.enforcementLevel}>
                <Select.Trigger {...props} class="w-full">
                  {$formStore.enforcementLevel === 'none'
                    ? 'None (Tracking Only)'
                    : $formStore.enforcementLevel === 'warning'
                      ? 'Warning (Alerts)'
                      : $formStore.enforcementLevel === 'strict'
                        ? 'Strict (Blocking)'
                        : $formStore.enforcementLevel}
                </Select.Trigger>
                <Select.Content>
                  {#each budgetEnforcementLevels as level}
                    <Select.Item value={level}>
                      <div class="flex flex-col">
                        <span class="font-medium">
                          {level === 'none'
                            ? 'None (Tracking Only)'
                            : level === 'warning'
                              ? 'Warning (Alerts)'
                              : level === 'strict'
                                ? 'Strict (Blocking)'
                                : level}
                        </span>
                        <span class="text-muted-foreground text-xs">
                          {level === 'none'
                            ? 'Track spending without restrictions'
                            : level === 'warning'
                              ? 'Show alerts when over budget'
                              : level === 'strict'
                                ? 'Block transactions when over budget'
                                : ''}
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
          <Form.Field {form} name="allocatedAmount" data-help-id="budget-amount-field" data-help-title="Budget Amount" class={cn(isHelpHighlighted('budget-amount-field') && 'help-topic-highlight')}>
            <Form.Control>
              {#snippet children({ props })}
                <div class="flex items-center gap-1.5">
                  <Form.Label>
                    {selectedBudgetType === 'goal-based' ? 'Goal Amount' : 'Budget Amount'}
                  </Form.Label>
                  <FieldHelpButton helpId="budget-amount-field" />
                </div>
                <NumericInput bind:value={$formStore.allocatedAmount} buttonClass="w-full" />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        {/if}
      </div>

      <!-- Period Configuration -->
      <div class={cn('border-border space-y-4 border-t pt-4', isHelpHighlighted('budget-period-field') && 'help-topic-highlight')} data-help-id="budget-period-field" data-help-title="Budget Period">
        <div class="flex items-center gap-1.5">
          <h3 class="text-sm font-medium">Period Configuration</h3>
          <FieldHelpButton helpId="budget-period-field" />
        </div>
        <div class="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <Form.Field {form} name="periodType">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Period Type</Form.Label>
                <Select.Root type="single" bind:value={$formStore.periodType}>
                  <Select.Trigger {...props} class="w-full">
                    {$formStore.periodType
                      ? $formStore.periodType.charAt(0).toUpperCase() +
                        $formStore.periodType.slice(1)
                      : 'Monthly'}
                  </Select.Trigger>
                  <Select.Content>
                    {#each periodTemplateTypes as type}
                      <Select.Item value={type}>
                        <div class="flex flex-col">
                          <span class="font-medium"
                            >{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                          <span class="text-muted-foreground text-xs">
                            {type === 'weekly'
                              ? 'Budget resets every week'
                              : type === 'monthly'
                                ? 'Budget resets every month'
                                : type === 'quarterly'
                                  ? 'Budget resets every 3 months'
                                  : type === 'yearly'
                                    ? 'Budget resets every year'
                                    : type === 'custom'
                                      ? 'Define custom period length'
                                      : ''}
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

          {#if $formStore.periodType === 'custom'}
            <!-- Custom period: use two-phase range scrubber for start day and duration -->
            <div>
              <Label class="mb-2 block">Custom Period Range</Label>
              <PeriodRangeScrubberInput
                bind:startDay={$formStore.startDay}
                bind:duration={$formStore.intervalCount}
                min={1}
                max={366}
              />
            </div>
          {:else if $formStore.periodType === 'yearly'}
            <!-- Yearly period: use month-based scrubber -->
            <Form.Field {form} name="startDay">
              <Form.Control>
                {#snippet children({ props })}
                  <Form.Label>Start Day</Form.Label>
                  <MonthDayScrubberInput
                    id={props.id}
                    bind:value={$formStore.startDay}
                    min={1}
                    max={366}
                  />
                  <Form.Description>
                    Day of the year when budget period starts
                  </Form.Description>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          {:else if $formStore.periodType === 'quarterly'}
            <!-- Quarterly period: use quarter-based date scrubber -->
            <Form.Field {form} name="startDay">
              <Form.Control>
                {#snippet children({ props })}
                  <Form.Label>Start Day</Form.Label>
                  <QuarterDayScrubberInput
                    id={props.id}
                    bind:value={$formStore.startDay}
                    min={1}
                    max={92}
                  />
                  <Form.Description>
                    Day of the quarter when budget period starts
                  </Form.Description>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          {:else}
            <!-- Other standard periods (weekly, monthly): show start day field -->
            <Form.Field {form} name="startDay">
              <Form.Control>
                {#snippet children({ props })}
                  <Form.Label>Start Day</Form.Label>
                  <NumberScrubberInput
                    id={props.id}
                    bind:value={$formStore.startDay}
                    min={1}
                    max={$formStore.periodType === 'monthly' ? 31 : 7}
                    formatDisplay={$formStore.periodType === 'monthly' ? formatOrdinal : formatWeekday}
                  />
                  <Form.Description>
                    {$formStore.periodType === 'monthly'
                      ? 'Day of the month when budget period starts'
                      : 'Day of the week when budget period starts'}
                  </Form.Description>
                  <Form.FieldErrors />
                {/snippet}
              </Form.Control>
            </Form.Field>
          {/if}
        </div>
      </div>

      <!-- Account Selection -->
      {#if currentBudgetConfig.requiresAccounts}
        <div class={cn('border-border space-y-2 border-t pt-4', isHelpHighlighted('budget-account-field') && 'help-topic-highlight')} data-help-id="budget-account-field" data-help-title="Account Selection">
          <div class="flex items-center gap-1.5">
            <Label>Accounts</Label>
            <FieldHelpButton helpId="budget-account-field" />
          </div>
          <Select.Root type="single" bind:value={accountAccessors.get, accountAccessors.set}>
            <Select.Trigger class="w-full">Select accounts to include</Select.Trigger>
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
            <div class="mt-2 flex flex-wrap gap-2">
              {#each selectedAccounts as account (account.id)}
                <Badge variant="secondary" class="flex items-center gap-1">
                  {account.name}
                  <button
                    type="button"
                    onclick={() => removeAccount(account.id)}
                    class="hover:bg-secondary-foreground/20 ml-1 rounded-full">
                    <span class="sr-only">Remove {account.name}</span>
                    ×
                  </button>
                </Badge>
              {/each}
            </div>
          {:else}
            <p class="text-muted-foreground text-sm">Select at least one account for this budget</p>
          {/if}
        </div>
      {/if}

      <!-- Schedule Selection (for scheduled-expense budgets) -->
      {#if selectedBudgetType === 'scheduled-expense'}
        <div class="border-border space-y-2 border-t pt-4">
          <Label>Link to Schedule (Optional)</Label>
          <Select.Root type="single" bind:value={scheduleAccessors.get, scheduleAccessors.set}>
            <Select.Trigger class="w-full">
              {selectedSchedule ? selectedSchedule.name : 'Select a schedule...'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">None</Select.Item>
              {#each availableSchedules as schedule (schedule.id)}
                <Select.Item value={String(schedule.id)}>
                  <div class="flex flex-col">
                    <span class="font-medium">{schedule.name}</span>
                    <span class="text-muted-foreground text-xs">
                      {schedule.payee?.name || 'No payee'} • {schedule.scheduleDate?.frequency ||
                        'One-time'}
                    </span>
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <p class="text-muted-foreground text-sm">
            Link this budget to a recurring schedule for automatic tracking
          </p>
          {#if selectedSchedule}
            <div class="bg-muted rounded-md p-3">
              <p class="text-sm font-medium">{selectedSchedule.name}</p>
              <p class="text-muted-foreground mt-1 text-xs">
                Amount: ${selectedSchedule.amount.toFixed(2)} •
                {selectedSchedule.scheduleDate?.frequency || 'One-time'}
              </p>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Category Selection -->
      {#if currentBudgetConfig.requiresCategories}
        <div class={cn('border-border space-y-2 border-t pt-4', isHelpHighlighted('budget-category-field') && 'help-topic-highlight')} data-help-id="budget-category-field" data-help-title="Category Selection">
          <div class="flex items-center gap-1.5">
            <Label>Categories</Label>
            <FieldHelpButton helpId="budget-category-field" />
          </div>
          <p class="text-muted-foreground mb-2 text-sm">
            Select categories to include in this budget. Click the + button to create a new
            category.
          </p>
          <MultiSelectEntityInput
            entityLabel="category"
            entities={availableCategories}
            value={selectedCategoryIds}
            icon={Tag}
            buttonClass="w-full"
            management={{
              enable: true,
              component: ManageCategoryForm,
              onSave: handleCategorySave,
              onDelete: handleCategoryDelete,
            }}
            handleChange={(selectedIds) => {
              $formStore.categoryIds = selectedIds;
            }} />

          {#if selectedCategories.length > 0}
            <div class="mt-2 flex flex-wrap gap-2">
              {#each selectedCategories as category (category.id)}
                <Badge variant="secondary" class="flex items-center gap-1.5 pr-1">
                  {category.name}
                  <button
                    type="button"
                    onclick={() => removeCategory(category.id)}
                    class="hover:bg-destructive/20 rounded-full p-0.5 transition-colors">
                    <CircleX class="h-3.5 w-3.5" />
                    <span class="sr-only">Remove {category.name}</span>
                  </button>
                </Badge>
              {/each}
            </div>
          {:else}
            <p class="text-muted-foreground text-sm">
              Select at least one category for this budget
            </p>
          {/if}
        </div>
      {/if}
    </Card.Content>
    <Card.Footer class="flex gap-2">
      <Form.Button disabled={$submitting}>
        {#if isUpdate}
          {$submitting ? 'Updating...' : 'Update Budget'}
        {:else}
          {$submitting ? 'Creating...' : 'Create Budget'}
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
