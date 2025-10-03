<script lang="ts">
// Framework imports
import type {Component} from 'svelte';

// SvelteKit imports
import {page} from '$app/state';

// Third-party library imports
import HandCoins from '@lucide/svelte/icons/hand-coins';
import FileText from '@lucide/svelte/icons/file-text';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Calendar from '@lucide/svelte/icons/calendar';
import Building from '@lucide/svelte/icons/building';
import Tag from '@lucide/svelte/icons/tag';
import {fieldProxy} from 'sveltekit-superforms';
import {CalendarDate} from '@internationalized/date';
import {useEntityForm} from '$lib/hooks/forms/use-entity-form';

// UI component imports
import * as Form from '$lib/components/ui/form';
import * as Card from '$lib/components/ui/card';
import {Input} from '$lib/components/ui/input';
import {Switch} from '$lib/components/ui/switch';
import {EntityInput, MultiNumericInput} from '$lib/components/input';

// Model imports
import RepeatingDateInputModel from '$lib/models/repeating_date.svelte';

// Schema imports
import {type Schedule} from '$lib/schema/schedules';
import {type Payee, type Category} from '$lib/schema';
import {superformInsertScheduleSchema} from '$lib/schema/superforms';

// State imports
import {SchedulesState} from '$lib/states/entities';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {useQueryClient} from '@tanstack/svelte-query';
import {scheduleKeys} from '$lib/queries/schedules';

// Type imports
import type {EditableEntityItem} from '$lib/types';

// Local component imports
import {RepeatingDateInput} from '$lib/components/input';
import AccountSelector from '$lib/components/input/account-selector.svelte';
import { WizardFormWrapper } from '$lib/components/wizard';
import ScheduleWizard from '$lib/components/wizard/schedule-wizard.svelte';
import { scheduleWizardStore } from '$lib/stores/wizardStore.svelte';
import ManagePayeeForm from '$lib/components/forms/manage-payee-form.svelte';
import ManageCategoryForm from '$lib/components/forms/manage-category-form.svelte';

// Props
let {
  scheduleId,
  duplicateMode = false,
  formId,
  onSave,
}: {
  scheduleId?: number;
  duplicateMode?: boolean;
  formId?: string;
  onSave?: (new_entity: Schedule) => void;
} = $props();

// Page data
const {
  data: {accounts, payees, categories, manageScheduleForm},
} = page;

// State
const schedules = SchedulesState.get();
const payeesState = PayeesState.get();
const categoriesState = CategoriesState.get();
const queryClient = useQueryClient();

// Empty defaults for lookups
const EMPTY_PAYEE: EditableEntityItem = {id: 0, name: ''};
const EMPTY_ACCOUNT: EditableEntityItem = {id: 0, name: ''};
const EMPTY_CATEGORY: EditableEntityItem = {id: 0, name: ''};

// Generate unique form ID if not provided
const uniqueFormId = formId || `schedule-form-${scheduleId || 'new'}-${Math.random().toString(36).substring(2, 9)}`;

// Create lookup maps for efficient searching
const payeeLookup = $derived(new Map(payees?.map(p => [p.id, p]) || []));
const accountLookup = $derived(new Map(accounts?.map(a => [a.id, a]) || []));
const categoryLookup = $derived(new Map(categories?.map(c => [c.id, c]) || []));

// Local state for components that need it
let payee: EditableEntityItem = $state(EMPTY_PAYEE);
let account: EditableEntityItem = $state(EMPTY_ACCOUNT);
let category: EditableEntityItem = $state(EMPTY_CATEGORY);
let repeating_date = $state(new RepeatingDateInputModel());

// Form
const form = useEntityForm({
  formData: manageScheduleForm,
  schema: superformInsertScheduleSchema,
  formId: uniqueFormId,
  entityId: scheduleId || undefined,
  onSave: (savedSchedule: any) => {
    schedules.addSchedule(savedSchedule);

    // Invalidate the schedule detail query to trigger reactivity
    queryClient.invalidateQueries({
      queryKey: scheduleKeys.detail(savedSchedule.id)
    });

    // Invalidate the schedules list to refresh the sidebar
    queryClient.invalidateQueries({
      queryKey: scheduleKeys.lists()
    });

    if (onSave) onSave(savedSchedule);
  },
});

const {form: formData, enhance} = form;

// Derive current values from formData (single source of truth)
const payeeValue = $derived.by(() =>
  payeeLookup.get($formData.payeeId ?? 0) ?? EMPTY_PAYEE
);
const accountValue = $derived.by(() =>
  accountLookup.get($formData.accountId ?? 0) ?? EMPTY_ACCOUNT
);
const categoryValue = $derived.by(() =>
  categoryLookup.get($formData.categoryId ?? 0) ?? EMPTY_CATEGORY
);

// Determine if this is an update
const isUpdate = scheduleId && scheduleId > 0;

// Handle wizard completion
async function handleWizardComplete(wizardFormData: Record<string, any>) {
  // Update form data with wizard results
  Object.keys(wizardFormData).forEach(key => {
    if (wizardFormData[key] !== undefined) {
      $formData[key] = wizardFormData[key];
    }
  });

  // Wait a tick to ensure reactive updates complete
  await new Promise(resolve => setTimeout(resolve, 0));

  // Submit the form programmatically
  const formElement = document.getElementById(uniqueFormId) as HTMLFormElement;
  if (formElement) {
    formElement.requestSubmit();
  }
}

// Create fieldProxy for repeating_date
const repeatingDateProxy = fieldProxy(form, 'repeating_date');

let amount: [number, number] = $state([0, 0]);
let defaultPayee = $state();
let defaultAccount = $state();
let defaultCategory = $state();

// Set default values for form fields
$formData.amount_type = 'exact';
$formData.status = 'active';
$formData.recurring = false;
$formData.auto_add = false;

// Initialize form data if editing or duplicating
$effect(() => {
  if (scheduleId && scheduleId > 0) {
    const schedule = schedules.getById(scheduleId);
    if (schedule) {
      // Set form data without reactive assignments
      if (duplicateMode) {
        // For duplication, clear the ID and modify the name
        $formData.id = 0;
        $formData.name = `${schedule.name} (Copy)`;
      } else {
        // For editing, use the original values
        $formData.id = scheduleId;
        $formData.name = schedule.name;
      }
      $formData.payeeId = schedule.payeeId;
      $formData.categoryId = schedule.categoryId;
      $formData.accountId = schedule.accountId;
      $formData.amount_type = schedule.amount_type;
      $formData.amount = schedule.amount || 0;
      $formData.amount_2 = schedule.amount_2 || 0;


      // Set local state separately to avoid reactive loops
      defaultPayee = schedule.payeeId;
      defaultCategory = schedule.categoryId;
      defaultAccount = schedule.accountId;

      // Set amount values directly (replace entire array for reactivity)
      amount = [schedule.amount || 0, schedule.amount_2 || 0];

      // Load associated schedule date if it exists
      if (schedule.scheduleDate) {
        // Set recurring checkbox to true since schedule has repeating date
        $formData.recurring = true;

        const scheduleDate = schedule.scheduleDate;
        const startDate = new Date(scheduleDate.start);

        const repeatingDateValue: any = {
          start: new CalendarDate(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            startDate.getDate()
          ),
          end_type: scheduleDate.end ? "until" : null,
          frequency: scheduleDate.frequency || 'daily',
          interval: scheduleDate.interval || 1,
          limit: scheduleDate.limit || 0,
          move_weekends: scheduleDate.move_weekends || 'none',
          move_holidays: scheduleDate.move_holidays || 'none',
          specific_dates: scheduleDate.specific_dates || [],
          on: scheduleDate.on || false,
          on_type: scheduleDate.on_type || 'day',
          days: scheduleDate.days || [],
          weeks: scheduleDate.weeks || [],
          weeks_days: scheduleDate.weeks_days || [],
          week_days: scheduleDate.week_days || []
        };

        // Only add end if it exists
        if (scheduleDate.end) {
          const endDate = new Date(scheduleDate.end);
          repeatingDateValue.end = new CalendarDate(
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            endDate.getDate()
          );
        }

        repeating_date.value = repeatingDateValue;
      }
    }
  }
});

// Sync derived values to local state (one-way: formData -> local state)
$effect.pre(() => {
  if (payee.id !== payeeValue.id || payee.name !== payeeValue.name) {
    payee = {...payeeValue};
  }
});

$effect.pre(() => {
  if (account.id !== accountValue.id || account.name !== accountValue.name) {
    account = {...accountValue};
  }
});

$effect.pre(() => {
  if (category.id !== categoryValue.id || category.name !== categoryValue.name) {
    category = {...categoryValue};
  }
});


// Safe handlers that prevent reactive loops
function handlePayeeChange(selected?: EditableEntityItem) {
  if (selected && $formData.payeeId !== selected.id) {
    $formData.payeeId = selected.id || 0;
  }
}

function handleAccountChange(selected?: EditableEntityItem) {
  if (selected && $formData.accountId !== selected.id) {
    $formData.accountId = selected.id || 0;
  }
}

function handleCategoryChange(selected?: EditableEntityItem) {
  if (selected && $formData.categoryId !== selected.id) {
    $formData.categoryId = selected.id || 0;
  }
}


// Sync repeating date to form field (only when actually needed)
$effect(() => {
  const shouldHaveData = $formData.recurring && repeating_date.value;
  const newProxy = shouldHaveData ? JSON.stringify(repeating_date.value) : undefined;
  if ($repeatingDateProxy !== newProxy) {
    $repeatingDateProxy = newProxy;
  }
});

// Sync amount changes to formData (one-way only to prevent loops)
$effect(() => {
  $formData.amount = amount[0];
  $formData.amount_2 = amount[1];
});

</script>

<WizardFormWrapper
  title={isUpdate ? "Edit Schedule" : "Create New Schedule"}
  subtitle={isUpdate ? "Update your schedule details" : "Add a new recurring or one-time transaction schedule"}
  wizardStore={scheduleWizardStore}
  onComplete={handleWizardComplete}
  defaultMode="manual"
  currentFormData={{
    name: $formData.name,
    recurring: $formData.recurring,
    amount: $formData.amount,
    amount_2: $formData.amount_2,
    amount_type: $formData.amount_type,
    payeeId: $formData.payeeId,
    accountId: $formData.accountId,
    categoryId: $formData.categoryId,
    auto_add: $formData.auto_add
  }}
>
  {#snippet formContent()}
    <form id={uniqueFormId} method="post" action="/schedules?/save-schedule" use:enhance class="space-y-6">
  <input hidden value={$formData.id} name="id" />

  <!-- Basic Details Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <FileText class="h-5 w-5 text-primary" />
        <Card.Title class="text-lg">Basic Details</Card.Title>
      </div>
      <Card.Description>
        Give your schedule a descriptive name to identify it easily.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <Form.Field {form} name="name">
        <Form.Control>
          {#snippet children({props})}
            <Form.Label>Schedule Name</Form.Label>
            <Input {...props} bind:value={$formData.name} placeholder="e.g., Monthly Rent, Weekly Groceries" />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>
    </Card.Content>
  </Card.Root>

  <!-- Transaction Details Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <CreditCard class="h-5 w-5 text-primary" />
        <Card.Title class="text-lg">Transaction Details</Card.Title>
      </div>
      <Card.Description>
        Configure where the money comes from, where it goes, and how much.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Account and Payee Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Form.Field {form} name="accountId">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>From Account</Form.Label>
              <AccountSelector
                entityLabel="account"
                entities={accounts}
                defaultValue={defaultAccount}
                bind:value={account}
                handleSubmit={handleAccountChange}
                buttonClass="w-full" />
              <Form.FieldErrors />
              <input hidden bind:value={$formData.accountId} name={props.name} />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <Form.Field {form} name="payeeId">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>{$formData.amount >= 0 ? 'From' : 'To'} Payee</Form.Label>
              <EntityInput
                entityLabel="payees"
                entities={payees as EditableEntityItem[]}
                defaultValue={defaultPayee}
                bind:value={payee}
                handleSubmit={handlePayeeChange}
                icon={HandCoins as unknown as Component}
                buttonClass="w-full"
                management={{
                  enable: false,
                  component: ManagePayeeForm,
                  onSave: (new_value: EditableEntityItem, is_new: boolean) => {
                    if (is_new) {
                      payeesState.addPayee(new_value as Payee);
                    } else {
                      payeesState.updatePayee(new_value as Payee);
                    }
                  },
                  onDelete: (id: number) => {
                    payeesState.deletePayee(id);
                  },
                }} />
              <Form.FieldErrors />
              <input hidden bind:value={$formData.payeeId} name={props.name} />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <Form.Field {form} name="categoryId">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Category</Form.Label>
              <EntityInput
                entityLabel="categories"
                entities={categories as EditableEntityItem[]}
                defaultValue={defaultCategory}
                bind:value={category}
                handleSubmit={handleCategoryChange}
                icon={Tag as unknown as Component}
                buttonClass="w-full"
                management={{
                  enable: false,
                  component: ManageCategoryForm,
                  onSave: (new_value: EditableEntityItem, is_new: boolean) => {
                    if (is_new) {
                      categoriesState.addCategory(new_value as Category);
                    } else {
                      categoriesState.updateCategory(new_value as Category);
                    }
                  },
                  onDelete: (id: number) => {
                    categoriesState.deleteCategory(id);
                  },
                }} />
              <Form.FieldErrors />
              <input hidden bind:value={$formData.categoryId} name={props.name} />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>

      <!-- Amount Field -->
      <Form.Field {form} name="amount">
        <Form.Control>
          {#snippet children({props})}
            <Form.Label>Transaction Amount</Form.Label>
            <MultiNumericInput {...props} bind:value={amount} bind:type={$formData.amount_type} />
            <Form.FieldErrors />
            <input hidden bind:value={$formData.amount} name={props.name} />
          {/snippet}
        </Form.Control>
      </Form.Field>
    </Card.Content>
  </Card.Root>

  <!-- Recurrence Settings Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <Calendar class="h-5 w-5 text-primary" />
        <Card.Title class="text-lg">Recurrence Settings</Card.Title>
      </div>
      <Card.Description>
        Set up when and how often this transaction should occur automatically.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <Form.Field {form} name="repeating_date">
        <Form.Control>
          {#snippet children({props})}
            <RepeatingDateInput {...props} bind:value={repeating_date} bind:isRepeating={$formData.recurring} />
            <input hidden bind:value={$repeatingDateProxy} name={props.name} />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Auto-add toggle -->
      {#if $formData.recurring}
        <div class="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div class="space-y-0.5">
            <div class="text-sm font-medium">Automatically add transactions</div>
            <div class="text-xs text-muted-foreground">
              When enabled, upcoming transactions will appear in account views for better planning
            </div>
          </div>
          <Switch bind:checked={$formData.auto_add} />
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Hidden fields for required form data -->
  <Form.Field {form} name="amount_2">
    <Form.Control>
      {#snippet children({props})}
        <input hidden bind:value={$formData.amount_2} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Form.Field {form} name="amount_type">
    <Form.Control>
      {#snippet children({props})}
        <input hidden bind:value={$formData.amount_type} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Form.Field {form} name="status">
    <Form.Control>
      {#snippet children({props})}
        <input hidden bind:value={$formData.status} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Form.Field {form} name="recurring">
    <Form.Control>
      {#snippet children({props})}
        <input hidden bind:value={$formData.recurring} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Form.Field {form} name="auto_add">
    <Form.Control>
      {#snippet children({props})}
        <input hidden bind:value={$formData.auto_add} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Save Button -->
  <div class="flex justify-end pt-4">
    <Form.Button class="px-8">
      {#if duplicateMode}
        Duplicate Schedule
      {:else if scheduleId && scheduleId > 0}
        Update Schedule
      {:else}
        Create Schedule
      {/if}
    </Form.Button>
  </div>
</form>
  {/snippet}

  {#snippet wizardContent()}
    <ScheduleWizard
      initialData={{
        name: $formData.name,
        recurring: $formData.recurring,
        amount: $formData.amount,
        amount_2: $formData.amount_2,
        amount_type: $formData.amount_type,
        payeeId: $formData.payeeId,
        accountId: $formData.accountId,
        categoryId: $formData.categoryId,
        auto_add: $formData.auto_add
      }}
      accounts={accounts}
      payees={payees}
      categories={categories}
    />
  {/snippet}
</WizardFormWrapper>
