<script lang="ts">
// Form data is now handled locally
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {Button, buttonVariants} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import * as Select from '$lib/components/ui/select';
import {Input} from '$lib/components/ui/input';
import {Textarea} from '$lib/components/ui/textarea';
import {type Category, categoryTypeEnum, type CategoryType, taxCategories, type TaxCategory, spendingPriorityEnum, incomeReliabilityEnum} from '$lib/schema';
import {superformInsertCategorySchema} from '$lib/schema/superforms';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import type {EditableEntityItem} from '$lib/types';
import {superForm} from 'sveltekit-superforms';
import {zod4Client} from 'sveltekit-superforms/adapters';
import { IconPicker } from '$lib/components/ui/icon-picker';
import { ColorPicker } from '$lib/components/ui/color-picker';
import { Checkbox } from '$lib/components/ui/checkbox';
import Tag from '@lucide/svelte/icons/tag';
import Palette from '@lucide/svelte/icons/palette';
import Receipt from '@lucide/svelte/icons/receipt';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import NumericInput from '$lib/components/input/numeric-input.svelte';

let {
  id,
  onDelete,
  onSave,
}: {
  id?: number | undefined;
  onDelete?: (id: number) => void;
  onSave?: (new_category: EditableEntityItem, is_new: boolean) => void;
} = $props();

// Generate unique form ID based on category ID or a random value for new categories
const formId = id ? `category-form-${id}` : `category-form-new-${Math.random().toString(36).slice(2, 9)}`;

const defaults: Omit<Category, 'id' | 'parentId' | 'isActive' | 'createdAt' | 'updatedAt' | 'dateCreated' | 'displayOrder'> = {
  name: '',
  notes: '',
  slug: '',
  categoryType: 'expense' as CategoryType,
  categoryIcon: '',
  categoryColor: '',
  isTaxDeductible: false,
  taxCategory: 'other' as TaxCategory,
  deductiblePercentage: 0,
  isSeasonal: false,
  seasonalMonths: '',
  expectedMonthlyMin: 0,
  expectedMonthlyMax: 0,
  spendingPriority: null,
  incomeReliability: null,
  deletedAt: null,
};

if (id) {
  const category: Category = CategoriesState.get().getById(id)!;
  defaults.name = category.name ?? '';
  defaults.notes = category.notes ?? '';
  defaults.categoryType = category.categoryType || 'expense';
  defaults.categoryIcon = category.categoryIcon || '';
  defaults.categoryColor = category.categoryColor || '';
  defaults.isTaxDeductible = category.isTaxDeductible || false;
  defaults.taxCategory = category.taxCategory || 'other';
  defaults.deductiblePercentage = category.deductiblePercentage ?? 0;
  defaults.isSeasonal = category.isSeasonal || false;
  defaults.seasonalMonths = category.seasonalMonths || '';
  defaults.expectedMonthlyMin = category.expectedMonthlyMin || null;
  defaults.expectedMonthlyMax = category.expectedMonthlyMax || null;
  defaults.spendingPriority = category.spendingPriority;
  defaults.incomeReliability = category.incomeReliability || null;
}

const form = superForm(defaults, {
  id: formId,
  validators: zod4Client(superformInsertCategorySchema),
  onResult: async ({result}) => {
    if (onSave) {
      if (result.type === 'success' && result.data) {
        onSave(result.data['entity'], (id ?? 0) === 0);
      }
    }
  },
  delayMs: 300,
  timeoutMs: 8000,
});

const {form: formData, enhance, submitting} = form;

// Category type options for the dropdown
const categoryTypeOptions = categoryTypeEnum.map(type => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1)
}));

// Tax category options
const taxCategoryOptions = taxCategories.map(cat => ({
  value: cat,
  label: cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}));

// Spending priority options
const spendingPriorityOptions = spendingPriorityEnum.map(priority => ({
  value: priority,
  label: priority.charAt(0).toUpperCase() + priority.slice(1)
}));

// Income reliability options
const incomeReliabilityOptions = incomeReliabilityEnum.map(reliability => ({
  value: reliability,
  label: reliability.charAt(0).toUpperCase() + reliability.slice(1)
}));

function handleIconChange(event: CustomEvent<{ value: string }>) {
  const iconValue = event.detail.value;
  if (typeof iconValue === 'string') {
    $formData.categoryIcon = iconValue;
  }
}

let alertDialogOpen = $state(false);
const deleteCategory = async (id: number) => {
  alertDialogOpen = false;
  if (onDelete) {
    onDelete(id);
  }
};
</script>

<form method="post" action="/categories?/save-category" use:enhance class="space-y-6">
  {#if id}
    <input type="hidden" name="id" value={id} />
  {/if}

  <!-- Basic Information Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <Tag class="h-5 w-5 text-primary" />
        <Card.Title class="text-lg">Category Information</Card.Title>
      </div>
      <Card.Description>
        Enter the basic details for your category.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Category Name -->
        <Form.Field {form} name="name">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Name</Form.Label>
              <Input {...props} bind:value={$formData.name} placeholder="e.g., Groceries, Utilities, Entertainment" />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Category Type -->
        <Form.Field {form} name="categoryType">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Category Type</Form.Label>
              <Select.Root type="single" bind:value={$formData.categoryType}>
                <Select.Trigger {...props}>
                  <span>{$formData.categoryType ? categoryTypeOptions.find(opt => opt.value === $formData.categoryType)?.label : "Select category type"}</span>
                </Select.Trigger>
                <Select.Content>
                  {#each categoryTypeOptions as option}
                    <Select.Item value={option.value}>{option.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <input type="hidden" name="categoryType" value={$formData.categoryType} />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>

      <!-- Notes (full width) -->
      <Form.Field {form} name="notes" class="col-span-full">
        <Form.Control>
          {#snippet children({props})}
            <Form.Label>Notes</Form.Label>
            <Textarea {...props} bind:value={$formData.notes} placeholder="Optional notes about this category" />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>
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
        Choose an icon and color to help identify this category visually.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Category Icon -->
        <Form.Field {form} name="categoryIcon">
          <Form.Control>
            {#snippet children({})}
              <Form.Label>Category Icon</Form.Label>
              <IconPicker
                value={$formData.categoryIcon ?? ''}
                placeholder="Select an icon..."
                onchange={handleIconChange}
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Category Color -->
        <Form.Field {form} name="categoryColor">
          <Form.Control>
            {#snippet children({})}
              <Form.Label>Category Color</Form.Label>
              <ColorPicker
                value={$formData.categoryColor ?? ''}
                placeholder="Choose category color"
                onchange={(event) => {
                  $formData.categoryColor = event.detail.value;
                }}
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Tax Tracking Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <Receipt class="h-5 w-5 text-primary" />
        <Card.Title class="text-lg">Tax Tracking</Card.Title>
      </div>
      <Card.Description>
        Track tax-deductible expenses for easier tax preparation.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Tax Deductible Checkbox -->
      <Form.Field {form} name="isTaxDeductible" class="flex flex-row items-start space-x-3 space-y-0">
        <Form.Control>
          {#snippet children({props})}
            <Checkbox
              {...props}
              checked={$formData.isTaxDeductible}
              onCheckedChange={(checked) => {
                $formData.isTaxDeductible = checked === true;
              }}
            />
            <div class="space-y-1 leading-none">
              <Form.Label>Tax Deductible</Form.Label>
              <Form.Description>Mark this category as tax-deductible</Form.Description>
            </div>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      {#if $formData.isTaxDeductible}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Tax Category -->
          <Form.Field {form} name="taxCategory">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Tax Category</Form.Label>
                <Select.Root type="single" bind:value={$formData.taxCategory as string}>
                  <Select.Trigger {...props}>
                    <span>{$formData.taxCategory ? taxCategoryOptions.find(opt => opt.value === $formData.taxCategory)?.label : "Select tax category"}</span>
                  </Select.Trigger>
                  <Select.Content>
                    {#each taxCategoryOptions as option}
                      <Select.Item value={option.value}>{option.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
                <input type="hidden" name="taxCategory" value={$formData.taxCategory || ''} />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <!-- Deductible Percentage -->
          <Form.Field {form} name="deductiblePercentage">
            <Form.Control>
              {#snippet children({props})}
                <Form.Label>Deductible Percentage</Form.Label>
                <NumericInput
                  {...props}
                  bind:value={$formData.deductiblePercentage as number}
                />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Spending Patterns Section (for expenses) -->
  {#if $formData.categoryType === 'expense'}
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <TrendingUp class="h-5 w-5 text-primary" />
        <Card.Title class="text-lg">Spending Patterns</Card.Title>
      </div>
      <Card.Description>
        Set spending priorities and seasonal patterns for better planning.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Spending Priority -->
        <Form.Field {form} name="spendingPriority">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Spending Priority</Form.Label>
              <Select.Root type="single" bind:value={$formData.spendingPriority as string}>
                <Select.Trigger {...props}>
                  <span>{$formData.spendingPriority ? spendingPriorityOptions.find(opt => opt.value === $formData.spendingPriority)?.label : "Select priority"}</span>
                </Select.Trigger>
                <Select.Content>
                  {#each spendingPriorityOptions as option}
                    <Select.Item value={option.value}>{option.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <input type="hidden" name="spendingPriority" value={$formData.spendingPriority || ''} />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Seasonal Toggle -->
        <Form.Field {form} name="isSeasonal" class="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <Form.Control>
            {#snippet children({props})}
              <Checkbox
                {...props}
                checked={$formData.isSeasonal}
                onCheckedChange={(checked) => {
                  $formData.isSeasonal = checked === true;
                }}
              />
              <div class="space-y-1 leading-none">
                <Form.Label>Seasonal Category</Form.Label>
                <Form.Description class="text-xs">This category has seasonal spending patterns</Form.Description>
              </div>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>

      {#if $formData.isSeasonal}
        <!-- Seasonal Months -->
        <Form.Field {form} name="seasonalMonths">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Seasonal Months</Form.Label>
              <Input {...props} bind:value={$formData.seasonalMonths} placeholder="e.g., November, December" />
              <Form.Description class="text-xs">Months when spending is higher (comma-separated)</Form.Description>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      {/if}

      <!-- Expected Monthly Range -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Field {form} name="expectedMonthlyMin">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Expected Monthly Min</Form.Label>
              <NumericInput
                {...props}
                bind:value={$formData.expectedMonthlyMin as number}
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <Form.Field {form} name="expectedMonthlyMax">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Expected Monthly Max</Form.Label>
              <NumericInput
                {...props}
                bind:value={$formData.expectedMonthlyMax as number}
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>
    </Card.Content>
  </Card.Root>
  {/if}

  <!-- Income Patterns Section (for income) -->
  {#if $formData.categoryType === 'income'}
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <TrendingUp class="h-5 w-5 text-primary" />
        <Card.Title class="text-lg">Income Patterns</Card.Title>
      </div>
      <Card.Description>
        Track income reliability and seasonal patterns for better planning.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Income Reliability -->
        <Form.Field {form} name="incomeReliability">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Income Reliability</Form.Label>
              <Select.Root type="single" bind:value={$formData.incomeReliability as string}>
                <Select.Trigger {...props}>
                  <span>{$formData.incomeReliability ? incomeReliabilityOptions.find(opt => opt.value === $formData.incomeReliability)?.label : "Select reliability"}</span>
                </Select.Trigger>
                <Select.Content>
                  {#each incomeReliabilityOptions as option}
                    <Select.Item value={option.value}>{option.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <input type="hidden" name="incomeReliability" value={$formData.incomeReliability || ''} />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Seasonal Toggle -->
        <Form.Field {form} name="isSeasonal" class="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <Form.Control>
            {#snippet children({props})}
              <Checkbox
                {...props}
                checked={$formData.isSeasonal}
                onCheckedChange={(checked) => {
                  $formData.isSeasonal = checked === true;
                }}
              />
              <div class="space-y-1 leading-none">
                <Form.Label>Seasonal Income</Form.Label>
                <Form.Description class="text-xs">This income has seasonal patterns</Form.Description>
              </div>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>

      {#if $formData.isSeasonal}
        <!-- Seasonal Months -->
        <Form.Field {form} name="seasonalMonths">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Seasonal Months</Form.Label>
              <Input {...props} bind:value={$formData.seasonalMonths} placeholder="e.g., January (tax refund), December (bonus)" />
              <Form.Description class="text-xs">Months when this income is received (comma-separated)</Form.Description>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      {/if}

      <!-- Expected Monthly Range -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Field {form} name="expectedMonthlyMin">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Expected Monthly Min</Form.Label>
              <NumericInput
                {...props}
                bind:value={$formData.expectedMonthlyMin as number}
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <Form.Field {form} name="expectedMonthlyMax">
          <Form.Control>
            {#snippet children({props})}
              <Form.Label>Expected Monthly Max</Form.Label>
              <NumericInput
                {...props}
                bind:value={$formData.expectedMonthlyMax as number}
              />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>
    </Card.Content>
  </Card.Root>
  {/if}

  <div class="flex gap-2">
    <Form.Button disabled={$submitting}>
      {$submitting ? 'Saving...' : 'Save'}
    </Form.Button>
    {#if id}
      <Button variant="destructive" onclick={() => (alertDialogOpen = true)}>delete</Button>
    {/if}
  </div>
</form>

<AlertDialog.Root bind:open={alertDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this category.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={() => deleteCategory(id!)}
        class={buttonVariants({variant: 'destructive'})}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
