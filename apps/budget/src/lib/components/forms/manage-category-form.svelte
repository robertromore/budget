<script lang="ts">
// Form data is now handled locally
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import * as Select from '$lib/components/ui/select';
import { Input } from '$lib/components/ui/input';
import { Textarea } from '$lib/components/ui/textarea';
import { useEntityForm } from '$lib/hooks/forms/use-entity-form';
import {
  type Category,
  categoryTypeEnum,
  type CategoryType,
  taxCategories,
  type TaxCategory,
  spendingPriorityEnum,
  incomeReliabilityEnum,
} from '$lib/schema';
import { superformInsertCategorySchema } from '$lib/schema/superforms';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { EditableEntityItem } from '$lib/types';
import { IconPicker } from '$lib/components/ui/icon-picker';
import { ColorPicker } from '$lib/components/ui/color-picker';
import { Checkbox } from '$lib/components/ui/checkbox';
import Tag from '@lucide/svelte/icons/tag';
import Palette from '@lucide/svelte/icons/palette';
import Receipt from '@lucide/svelte/icons/receipt';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Settings from '@lucide/svelte/icons/settings';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { ParentCategorySelector } from '$lib/components/categories';
import { Slider } from '$lib/components/ui/slider';
import { createTransformAccessors } from '$lib/utils/bind-helpers';

let {
  id,
  initialParentId,
  onDelete,
  onSave,
}: {
  id?: number | undefined;
  initialParentId?: number | null | undefined;
  onDelete?: (id: number) => void;
  onSave?: (new_category: EditableEntityItem, is_new: boolean) => void;
} = $props();

// Capture props at mount time to avoid reactivity warnings
const _id = (() => id)();
const _initialParentId = (() => initialParentId)();

// Load all categories for parent selector
const categoriesState = CategoriesState.get();
const allCategories = $derived(categoriesState.all);

// Generate unique form ID based on category ID or a random value for new categories
const formId = _id
  ? `category-form-${_id}`
  : `category-form-new-${Math.random().toString(36).slice(2, 9)}`;

const defaults = {
  name: '',
  notes: '' as string | null | undefined,
  slug: '',
  parentId: null as number | null | undefined,
  categoryType: 'expense' as CategoryType | undefined,
  categoryIcon: '' as string | null | undefined,
  categoryColor: '' as string | null | undefined,
  isActive: true as boolean | undefined,
  displayOrder: 0 as number | undefined,
  isTaxDeductible: false as boolean | undefined,
  taxCategory: 'other' as TaxCategory | null | undefined,
  deductiblePercentage: 0 as number | null | undefined,
  isSeasonal: false as boolean | undefined,
  seasonalMonths: [] as string[] | null | undefined,
  expectedMonthlyMin: 0 as number | null | undefined,
  expectedMonthlyMax: 0 as number | null | undefined,
  spendingPriority: null as (typeof spendingPriorityEnum)[number] | null | undefined,
  incomeReliability: null as (typeof incomeReliabilityEnum)[number] | null | undefined,
  deletedAt: null as string | null | undefined,
};

if (_id) {
  // Editing existing category - load from state
  const category: Category = CategoriesState.get().getById(_id)!;
  defaults.name = category.name ?? '';
  defaults.notes = category.notes ?? '';
  defaults.parentId = category.parentId;
  defaults.categoryType = category.categoryType || 'expense';
  defaults.categoryIcon = category.categoryIcon || '';
  defaults.categoryColor = category.categoryColor || '';
  defaults.isActive = category.isActive ?? true;
  defaults.displayOrder = category.displayOrder ?? 0;
  defaults.isTaxDeductible = category.isTaxDeductible || false;
  defaults.taxCategory = category.taxCategory || 'other';
  defaults.deductiblePercentage = category.deductiblePercentage ?? 0;
  defaults.isSeasonal = category.isSeasonal || false;
  defaults.seasonalMonths = category.seasonalMonths ?? [];
  defaults.expectedMonthlyMin = category.expectedMonthlyMin || null;
  defaults.expectedMonthlyMax = category.expectedMonthlyMax || null;
  defaults.spendingPriority = category.spendingPriority;
  defaults.incomeReliability = category.incomeReliability || null;
} else {
  // Creating new category - use initialParentId if provided
  defaults.parentId = _initialParentId ?? null;
}

const form = useEntityForm<Category>({
  formData: defaults,
  schema: superformInsertCategorySchema,
  formId,
  entityId: _id,
  onSave: (entity) => {
    onSave?.(entity, true);
  },
  onUpdate: (entity) => {
    onSave?.(entity, false);
  },
  customOptions: {
    delayMs: 300,
    timeoutMs: 8000,
  },
});

const { form: formData, enhance, submitting, isUpdate } = form;

// Category type options for the dropdown
const categoryTypeOptions = categoryTypeEnum.map((type) => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
}));

// Tax category options
const taxCategoryOptions = taxCategories.map((cat) => ({
  value: cat,
  label: cat
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}));

// Spending priority options
const spendingPriorityOptions = spendingPriorityEnum.map((priority) => ({
  value: priority,
  label: priority.charAt(0).toUpperCase() + priority.slice(1),
}));

// Income reliability options
const incomeReliabilityOptions = incomeReliabilityEnum.map((reliability) => ({
  value: reliability,
  label: reliability.charAt(0).toUpperCase() + reliability.slice(1),
}));

function handleIconChange(event: CustomEvent<{ value: string }>) {
  const iconValue = event.detail.value;
  if (typeof iconValue === 'string') {
    $formData.categoryIcon = iconValue;
  }
}

// Derived values to ensure no undefined for components that don't accept it
const isActiveValue = $derived($formData.isActive ?? true);
const isTaxDeductibleValue = $derived($formData.isTaxDeductible ?? false);
const isSeasonalValue = $derived($formData.isSeasonal ?? false);

// Category type accessor - transforms between CategoryType and form data
const categoryTypeAccessors = createTransformAccessors(
  () => $formData.categoryType ?? 'expense',
  (value: CategoryType) => {
    $formData.categoryType = value;
  }
);

// Deductible percentage accessor - transforms between slider value and form data (0 becomes null)
const deductiblePercentageAccessors = createTransformAccessors(
  () => $formData.deductiblePercentage ?? 0,
  (value: number) => {
    $formData.deductiblePercentage = value === 0 ? null : value;
  }
);

// Seasonal months accessor - transforms between comma-separated string and array
const seasonalMonthsAccessors = createTransformAccessors(
  () => (Array.isArray($formData.seasonalMonths) ? $formData.seasonalMonths.join(', ') : ''),
  (value: string) => {
    $formData.seasonalMonths = !value?.trim()
      ? []
      : value
          .split(',')
          .map((m: string) => m.trim())
          .filter(Boolean);
  }
);

let alertDialogOpen = $state(false);
const deleteCategory = async (id: number) => {
  alertDialogOpen = false;
  if (onDelete) {
    onDelete(id);
  }
};
</script>

<form method="post" action="/categories?/save-category" use:enhance class="space-y-6">
  {#if _id}
    <input type="hidden" name="id" value={_id} />
  {/if}

  <!-- Basic Information Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <Tag class="text-primary h-5 w-5" />
        <Card.Title class="text-lg">Category Information</Card.Title>
      </div>
      <Card.Description>Enter the basic details for your category.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Category Name -->
        <Form.Field {form} name="name">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Name</Form.Label>
              <Input
                {...props}
                bind:value={$formData.name}
                placeholder="e.g., Groceries, Utilities, Entertainment" />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Category Type -->
        <Form.Field {form} name="categoryType">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Category Type</Form.Label>
              <Select.Root
                type="single"
                bind:value={categoryTypeAccessors.get, categoryTypeAccessors.set}>
                <Select.Trigger {...props}>
                  {categoryTypeOptions.find(
                    (opt) => opt.value === ($formData.categoryType ?? 'expense')
                  )?.label ?? 'Select category type'}
                </Select.Trigger>
                <Select.Content>
                  {#each categoryTypeOptions as option}
                    <Select.Item value={option.value}>{option.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <input
                type="hidden"
                name="categoryType"
                value={$formData.categoryType ?? 'expense'} />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>

      <!-- Parent Category (full width) -->
      <Form.Field {form} name="parentId" class="col-span-full">
        <Form.Control>
          {#snippet children({})}
            <ParentCategorySelector
              categories={allCategories}
              bind:value={$formData.parentId}
              currentCategoryId={_id ?? undefined} />
            <input type="hidden" name="parentId" value={$formData.parentId || ''} />
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Notes (full width) -->
      <Form.Field {form} name="notes" class="col-span-full">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Notes</Form.Label>
            <Textarea
              {...props}
              bind:value={$formData.notes}
              placeholder="Optional notes about this category" />
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
        <Palette class="text-primary h-5 w-5" />
        <Card.Title class="text-lg">Visual Customization</Card.Title>
      </div>
      <Card.Description>
        Choose an icon and color to help identify this category visually.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Category Icon -->
        <Form.Field {form} name="categoryIcon">
          <Form.Control>
            {#snippet children({})}
              <Form.Label>Category Icon</Form.Label>
              <IconPicker
                value={$formData.categoryIcon ?? ''}
                placeholder="Select an icon..."
                onchange={handleIconChange} />
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
                }} />
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Status & Ordering Section -->
  <Card.Root>
    <Card.Header class="pb-4">
      <div class="flex items-center gap-2">
        <Settings class="text-primary h-5 w-5" />
        <Card.Title class="text-lg">Status & Ordering</Card.Title>
      </div>
      <Card.Description>Control category visibility and display order in lists.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Active Status Checkbox -->
        <Form.Field {form} name="isActive" class="flex flex-row items-start space-y-0 space-x-3">
          <Form.Control>
            {#snippet children({ props })}
              <Checkbox
                {...props}
                checked={isActiveValue}
                onCheckedChange={(checked) => {
                  $formData.isActive = checked === true;
                }} />
              <div class="space-y-1 leading-none">
                <Form.Label>Active Category</Form.Label>
                <Form.Description>Show this category in lists and dropdowns</Form.Description>
              </div>
              <Form.FieldErrors />
            {/snippet}
          </Form.Control>
        </Form.Field>

        <!-- Display Order -->
        <Form.Field {form} name="displayOrder">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Display Order</Form.Label>
              <Input
                {...props}
                type="number"
                value={$formData.displayOrder ?? ''}
                placeholder="Optional sort order"
                min={0}
                step={1}
                oninput={(event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  const value = target.value;
                  $formData.displayOrder = value === '' ? 0 : Number(value);
                }} />
              <Form.Description
                >Lower numbers appear first. Leave empty for automatic ordering.</Form.Description>
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
        <Receipt class="text-primary h-5 w-5" />
        <Card.Title class="text-lg">Tax Tracking</Card.Title>
      </div>
      <Card.Description>Track tax-deductible expenses for easier tax preparation.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Tax Deductible Checkbox -->
      <Form.Field
        {form}
        name="isTaxDeductible"
        class="flex flex-row items-start space-y-0 space-x-3">
        <Form.Control>
          {#snippet children({ props })}
            <Checkbox
              {...props}
              checked={isTaxDeductibleValue}
              onCheckedChange={(checked) => {
                $formData.isTaxDeductible = checked === true;
              }} />
            <div class="space-y-1 leading-none">
              <Form.Label>Tax Deductible</Form.Label>
              <Form.Description>Mark this category as tax-deductible</Form.Description>
            </div>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      {#if $formData.isTaxDeductible}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Tax Category -->
          <Form.Field {form} name="taxCategory">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Tax Category</Form.Label>
                <Select.Root type="single" bind:value={$formData.taxCategory as string}>
                  <Select.Trigger {...props}>
                    <span
                      >{$formData.taxCategory
                        ? taxCategoryOptions.find((opt) => opt.value === $formData.taxCategory)
                            ?.label
                        : 'Select tax category'}</span>
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
              {#snippet children({})}
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Form.Label>Deductible Percentage</Form.Label>
                    <span class="text-sm font-medium">{$formData.deductiblePercentage ?? 0}%</span>
                  </div>
                  <Slider
                    type="single"
                    bind:value={
                      deductiblePercentageAccessors.get, deductiblePercentageAccessors.set
                    }
                    min={0}
                    max={100}
                    step={1}
                    class="w-full" />
                  <Form.Description class="text-xs"
                    >Percentage of expenses that are tax deductible</Form.Description>
                </div>
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
          <TrendingUp class="text-primary h-5 w-5" />
          <Card.Title class="text-lg">Spending Patterns</Card.Title>
        </div>
        <Card.Description>
          Set spending priorities and seasonal patterns for better planning.
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Spending Priority -->
          <Form.Field {form} name="spendingPriority">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Spending Priority</Form.Label>
                <Select.Root type="single" bind:value={$formData.spendingPriority as string}>
                  <Select.Trigger {...props}>
                    <span
                      >{$formData.spendingPriority
                        ? spendingPriorityOptions.find(
                            (opt) => opt.value === $formData.spendingPriority
                          )?.label
                        : 'Select priority'}</span>
                  </Select.Trigger>
                  <Select.Content>
                    {#each spendingPriorityOptions as option}
                      <Select.Item value={option.value}>{option.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
                <input
                  type="hidden"
                  name="spendingPriority"
                  value={$formData.spendingPriority || ''} />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <!-- Seasonal Toggle -->
          <Form.Field
            {form}
            name="isSeasonal"
            class="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
            <Form.Control>
              {#snippet children({ props })}
                <Checkbox
                  {...props}
                  checked={isSeasonalValue}
                  onCheckedChange={(checked) => {
                    $formData.isSeasonal = checked === true;
                  }} />
                <div class="space-y-1 leading-none">
                  <Form.Label>Seasonal Category</Form.Label>
                  <Form.Description class="text-xs"
                    >This category has seasonal spending patterns</Form.Description>
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
              {#snippet children({ props })}
                <Form.Label>Seasonal Months</Form.Label>
                <Input
                  {...props}
                  bind:value={seasonalMonthsAccessors.get, seasonalMonthsAccessors.set}
                  placeholder="e.g., November, December" />
                <Form.Description class="text-xs"
                  >Months when spending is higher (comma-separated)</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        {/if}

        <!-- Expected Monthly Range -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field {form} name="expectedMonthlyMin">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Expected Monthly Min</Form.Label>
                <NumericInput {...props} bind:value={$formData.expectedMonthlyMin as number} />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <Form.Field {form} name="expectedMonthlyMax">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Expected Monthly Max</Form.Label>
                <NumericInput {...props} bind:value={$formData.expectedMonthlyMax as number} />
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
          <TrendingUp class="text-primary h-5 w-5" />
          <Card.Title class="text-lg">Income Patterns</Card.Title>
        </div>
        <Card.Description>
          Track income reliability and seasonal patterns for better planning.
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Income Reliability -->
          <Form.Field {form} name="incomeReliability">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Income Reliability</Form.Label>
                <Select.Root type="single" bind:value={$formData.incomeReliability as string}>
                  <Select.Trigger {...props}>
                    <span
                      >{$formData.incomeReliability
                        ? incomeReliabilityOptions.find(
                            (opt) => opt.value === $formData.incomeReliability
                          )?.label
                        : 'Select reliability'}</span>
                  </Select.Trigger>
                  <Select.Content>
                    {#each incomeReliabilityOptions as option}
                      <Select.Item value={option.value}>{option.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
                <input
                  type="hidden"
                  name="incomeReliability"
                  value={$formData.incomeReliability || ''} />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <!-- Seasonal Toggle -->
          <Form.Field
            {form}
            name="isSeasonal"
            class="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
            <Form.Control>
              {#snippet children({ props })}
                <Checkbox
                  {...props}
                  checked={isSeasonalValue}
                  onCheckedChange={(checked) => {
                    $formData.isSeasonal = checked === true;
                  }} />
                <div class="space-y-1 leading-none">
                  <Form.Label>Seasonal Income</Form.Label>
                  <Form.Description class="text-xs"
                    >This income has seasonal patterns</Form.Description>
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
              {#snippet children({ props })}
                <Form.Label>Seasonal Months</Form.Label>
                <Input
                  {...props}
                  bind:value={seasonalMonthsAccessors.get, seasonalMonthsAccessors.set}
                  placeholder="e.g., January (tax refund), December (bonus)" />
                <Form.Description class="text-xs"
                  >Months when this income is received (comma-separated)</Form.Description>
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>
        {/if}

        <!-- Expected Monthly Range -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field {form} name="expectedMonthlyMin">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Expected Monthly Min</Form.Label>
                <NumericInput {...props} bind:value={$formData.expectedMonthlyMin as number} />
                <Form.FieldErrors />
              {/snippet}
            </Form.Control>
          </Form.Field>

          <Form.Field {form} name="expectedMonthlyMax">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Expected Monthly Max</Form.Label>
                <NumericInput {...props} bind:value={$formData.expectedMonthlyMax as number} />
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
    {#if _id}
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
        onclick={() => deleteCategory(_id!)}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
