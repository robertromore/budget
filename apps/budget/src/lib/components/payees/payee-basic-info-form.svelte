<script lang="ts">
import ManageCategoryForm from '$lib/components/forms/manage-category-form.svelte';
import ManagePayeeCategoryForm from '$lib/components/forms/manage-payee-category-form.svelte';
import EntityInput from '$lib/components/input/entity-input.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import * as Select from '$lib/components/ui/select';
import { Switch } from '$lib/components/ui/switch';
import { Textarea } from '$lib/components/ui/textarea';
import { payeeTypes, paymentFrequencies } from '$lib/schema/payees';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { PayeeCategoriesState } from '$lib/states/entities/payee-categories.svelte';
import type { EditableEntityItem } from '$lib/types';
// Icons
import FolderOpen from '@lucide/svelte/icons/folder-open';
import Tag from '@lucide/svelte/icons/tag';
import User from '@lucide/svelte/icons/user';

interface Props {
  formData: any; // Store type from superform
  entityForm: any;
  categories: any[];
}

let { formData, entityForm, categories }: Props = $props();

// Category state and handlers
const categoriesState = CategoriesState.get();

// Make categories reactive by deriving from state
const reactiveCategories = $derived(categoriesState.all as EditableEntityItem[]);

let selectedCategory = $derived.by(() => {
  if (!$formData.defaultCategoryId) return undefined;
  return reactiveCategories.find((cat) => cat.id === Number($formData.defaultCategoryId)) as
    | EditableEntityItem
    | undefined;
});

const handleCategorySelect = (category?: EditableEntityItem) => {
  if (category) {
    $formData.defaultCategoryId = category.id.toString();
  } else {
    $formData.defaultCategoryId = '0';
  }
};

const handleCategorySave = (category: EditableEntityItem, isNew: boolean) => {
  if (isNew) {
    categoriesState.addCategory(category as any);
  } else {
    categoriesState.updateCategory(category as any);
  }
  $formData.defaultCategoryId = category.id.toString();
};

const handleCategoryDelete = async (id: number) => {
  await categoriesState.deleteCategory(id);
  if ($formData.defaultCategoryId === id.toString()) {
    $formData.defaultCategoryId = '0';
  }
};

// Payee Category state and handlers
const payeeCategoriesState = PayeeCategoriesState.get();

// Make payee categories reactive by deriving from state
const reactivePayeeCategories = $derived((payeeCategoriesState?.all ?? []) as EditableEntityItem[]);

let selectedPayeeCategory = $derived.by(() => {
  if (!$formData.payeeCategoryId) return undefined;
  return reactivePayeeCategories.find((cat) => cat.id === Number($formData.payeeCategoryId)) as
    | EditableEntityItem
    | undefined;
});

const handlePayeeCategorySelect = (category?: EditableEntityItem) => {
  if (category) {
    $formData.payeeCategoryId = category.id.toString();
  } else {
    $formData.payeeCategoryId = null;
  }
};

const handlePayeeCategorySave = (category: EditableEntityItem, isNew: boolean) => {
  if (!payeeCategoriesState) return;
  if (isNew) {
    payeeCategoriesState.addCategory(category as any);
  } else {
    payeeCategoriesState.updateCategory(category as any);
  }
  $formData.payeeCategoryId = category.id.toString();
};

const handlePayeeCategoryDelete = async (id: number) => {
  if (!payeeCategoriesState) return;
  await payeeCategoriesState.deleteCategory(id);
  if ($formData.payeeCategoryId === id.toString()) {
    $formData.payeeCategoryId = null;
  }
};

// Dropdown options
const payeeTypeOptions = payeeTypes.map((type) => ({
  value: type,
  label: type
    .replace('_', ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}));

const paymentFrequencyOptions = paymentFrequencies.map((freq) => ({
  value: freq,
  label: freq
    .replace('_', ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}));
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center gap-2">
      <User class="text-primary h-5 w-5" />
      <Card.Title>Basic Information</Card.Title>
    </div>
    <Card.Description>Essential payee details and categorization settings.</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- Payee Name -->
      <Form.Field form={entityForm} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Payee Name</Form.Label>
            <Input
              {...props}
              bind:value={$formData.name}
              placeholder="e.g., Starbucks, Netflix, Electric Company" />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Payee Type -->
      <Form.Field form={entityForm} name="payeeType">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Payee Type</Form.Label>
            <Select.Root type="single" bind:value={$formData.payeeType}>
              <Select.Trigger {...props} class="w-full">
                <span
                  >{$formData.payeeType
                    ? payeeTypeOptions.find((opt) => opt.value === $formData.payeeType)?.label
                    : 'Select type'}</span>
              </Select.Trigger>
              <Select.Content>
                {#each payeeTypeOptions as option}
                  <Select.Item value={option.value}>{option.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <Form.Description class="text-xs">
              Business entity type (individual, business, etc.)
            </Form.Description>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Payee Category (UI Organization) -->
      <Form.Field form={entityForm} name="payeeCategoryId">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Payee Category (Optional)</Form.Label>
            <EntityInput
              entityLabel="Payee Category"
              entities={reactivePayeeCategories}
              bind:value={selectedPayeeCategory}
              handleSubmit={handlePayeeCategorySelect}
              buttonClass="w-full"
              icon={FolderOpen}
              management={{
                enable: true,
                component: ManagePayeeCategoryForm,
                onSave: handlePayeeCategorySave,
                onDelete: handlePayeeCategoryDelete,
              }} />
            <Form.Description class="text-xs">
              Organize payees in lists (e.g., Utilities, Subscriptions). For UI organization only,
              not budgeting.
            </Form.Description>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Payment Frequency -->
      <Form.Field form={entityForm} name="paymentFrequency">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Payment Frequency</Form.Label>
            <Select.Root type="single" bind:value={$formData.paymentFrequency}>
              <Select.Trigger {...props} class="w-full">
                <span
                  >{$formData.paymentFrequency
                    ? paymentFrequencyOptions.find(
                        (opt) => opt.value === $formData.paymentFrequency
                      )?.label
                    : 'Select frequency'}</span>
              </Select.Trigger>
              <Select.Content>
                {#each paymentFrequencyOptions as option}
                  <Select.Item value={option.value}>{option.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <Form.Description class="text-xs">
              How often you typically pay this payee
            </Form.Description>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Default Category -->
      <Form.Field form={entityForm} name="defaultCategoryId">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Default Category</Form.Label>
            <EntityInput
              entityLabel="Category"
              entities={reactiveCategories}
              bind:value={selectedCategory}
              handleSubmit={handleCategorySelect}
              buttonClass="w-full"
              icon={Tag}
              management={{
                enable: true,
                component: ManageCategoryForm,
                onSave: handleCategorySave,
                onDelete: handleCategoryDelete,
              }} />
            <Form.Description class="text-xs">
              Budget category for transactions (e.g., Groceries, Entertainment). Auto-applied to new
              transactions.
            </Form.Description>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Average Amount -->
      <Form.Field form={entityForm} name="avgAmount">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Average Transaction Amount</Form.Label>
            <NumericInput bind:value={$formData.avgAmount} buttonClass="w-full" />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>
    </div>

    <!-- Notes -->
    <Form.Field form={entityForm} name="notes">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Notes</Form.Label>
          <Textarea
            {...props}
            bind:value={$formData.notes}
            placeholder="Additional notes about this payee..." />
          <Form.FieldErrors />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <!-- Flags -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <!-- Tax Relevant -->
      <label
        for="payee-tax-relevant"
        class="hover:bg-accent/50 relative flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors">
        <div class="flex h-5 items-center">
          <Switch id="payee-tax-relevant" bind:checked={$formData.taxRelevant} />
        </div>
        <div class="flex-1">
          <div class="font-medium">Tax Relevant</div>
          <p class="text-muted-foreground mt-1 text-xs">
            Mark if expenses to this payee are tax-deductible or need to be reported
          </p>
        </div>
      </label>

      <!-- Seasonal -->
      <label
        for="payee-seasonal"
        class="hover:bg-accent/50 relative flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors">
        <div class="flex h-5 items-center">
          <Switch id="payee-seasonal" bind:checked={$formData.isSeasonal} />
        </div>
        <div class="flex-1">
          <div class="font-medium">Seasonal Payee</div>
          <p class="text-muted-foreground mt-1 text-xs">
            Payments only occur during specific times of year (e.g., landscaping, heating)
          </p>
        </div>
      </label>

      <!-- Active -->
      <label
        for="payee-active"
        class="hover:bg-accent/50 relative flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors">
        <div class="flex h-5 items-center">
          <Switch id="payee-active" bind:checked={$formData.isActive} />
        </div>
        <div class="flex-1">
          <div class="font-medium">Active</div>
          <p class="text-muted-foreground mt-1 text-xs">
            Uncheck to archive this payee and hide it from active lists
          </p>
        </div>
      </label>
    </div>
  </Card.Content>
</Card.Root>
