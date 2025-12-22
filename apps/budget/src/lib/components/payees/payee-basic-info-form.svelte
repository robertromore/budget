<script lang="ts">
import ManageCategoryForm from '$lib/components/forms/manage-category-form.svelte';
import ManagePayeeCategoryForm from '$lib/components/forms/manage-payee-category-form.svelte';
import EntityInput from '$lib/components/input/entity-input.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { IntelligenceModeToggle, type IntelligenceMode } from '$lib/components/intelligence';
import { intelligenceInput } from '$lib/components/intelligence-input';
import * as Card from '$lib/components/ui/card';
import * as Form from '$lib/components/ui/form';
import { Input } from '$lib/components/ui/input';
import * as Select from '$lib/components/ui/select';
import { Switch } from '$lib/components/ui/switch';
import { Textarea } from '$lib/components/ui/textarea';
import {
  recordEnhancement,
  type FieldEnhancementSummary,
} from '$lib/query/payee-enhancements';
import { enhancePayeeName, inferPayeeDetails, type PayeeDetailsSuggestions } from '$lib/query/payees';
import type { EnhanceableField, PayeeAiPreferences } from '$lib/schema';
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
  /** Payee ID for enhancement tracking (only for existing payees) */
  payeeId?: number;
  /** AI preferences loaded from the payee */
  aiPreferences?: PayeeAiPreferences | null;
  /** Enhancement summary for each field */
  enhancementSummary?: FieldEnhancementSummary[];
  /** Whether the global apply intelligence is in progress */
  isGlobalApplying?: boolean;
}

let { formData, entityForm, categories, payeeId, aiPreferences, enhancementSummary = [], isGlobalApplying = false }: Props = $props();

// Helper to get the mode for a field - check enhancementSummary first, then aiPreferences
function getFieldMode(fieldName: string): IntelligenceMode {
  // First check if we have enhancement info for this field
  const enhancementInfo = enhancementSummary.find((s) => s.fieldName === fieldName);
  if (enhancementInfo?.lastMode) {
    return enhancementInfo.lastMode;
  }
  // Fall back to aiPreferences
  return (aiPreferences?.fieldModes?.[fieldName] as IntelligenceMode) ?? 'none';
}

// Per-field intelligence mode state - initialize from aiPreferences/enhancementSummary
let fieldModes = $state<Record<string, IntelligenceMode>>({
  name: getFieldMode('name'),
  payeeType: getFieldMode('payeeType'),
  paymentFrequency: getFieldMode('paymentFrequency'),
  defaultCategoryId: getFieldMode('defaultCategoryId'),
  taxRelevant: getFieldMode('taxRelevant'),
  isSeasonal: getFieldMode('isSeasonal'),
});

// Update fieldModes when enhancementSummary changes (e.g., after global apply)
$effect(() => {
  // Track enhancementSummary changes
  const summary = enhancementSummary;
  if (summary.length > 0) {
    // Update each field mode based on the latest enhancement info
    for (const info of summary) {
      if (info.lastMode && info.fieldName in fieldModes) {
        fieldModes[info.fieldName] = info.lastMode;
      }
    }
  }
});

// Helper to get enhancement info for a field
function getEnhancementInfo(fieldName: string): FieldEnhancementSummary | undefined {
  return enhancementSummary.find((s) => s.fieldName === fieldName);
}

// Check if a field has been enhanced
function isFieldEnhanced(fieldName: string): boolean {
  const info = getEnhancementInfo(fieldName);
  return info?.isEnhanced ?? false;
}

// No modes are disabled - both ML and LLM are available via global apply
const disabledModes: { mode: IntelligenceMode; reason: string }[] = [];

// AI mutations
const enhanceMutation = enhancePayeeName().options();
const inferMutation = inferPayeeDetails().options();
const recordEnhancementMutation = recordEnhancement().options();

// Track which field is being enhanced
let enhancingField = $state<string | null>(null);

// Handle name enhancement (special case - uses different mutation)
// Returns a promise so intelligence input mode can track processing state
async function handleNameAction() {
  if (!$formData.name?.trim()) return;
  const originalValue = $formData.name;
  enhancingField = 'name';

  try {
    const result = await enhanceMutation.mutateAsync({ name: $formData.name });
    if (result.success && result.enhanced) {
      $formData.name = result.enhanced;
      // Record enhancement if we have a payee ID
      if (payeeId) {
        recordEnhancementMutation.mutate({
          payeeId,
          fieldName: 'name' as EnhanceableField,
          mode: 'llm',
          originalValue,
          suggestedValue: result.enhanced,
          appliedValue: result.enhanced,
          // enhanceName doesn't return confidence, leave undefined
        });
      }
    }
  } finally {
    enhancingField = null;
  }
}

// Handle field intelligence action
// Returns a promise so intelligence input mode can track processing state
async function handleFieldAction(field: string) {
  if (!$formData.name?.trim()) return;
  enhancingField = field;

  try {
    const result = await inferMutation.mutateAsync({
      name: $formData.name,
      currentCategoryId: $formData.defaultCategoryId ? Number($formData.defaultCategoryId) : undefined,
    });
    if (result.success && result.suggestions) {
      applySuggestions(result.suggestions, field);
    }
  } finally {
    enhancingField = null;
  }
}

// Record an enhancement for a field
function recordFieldEnhancement(
  fieldName: EnhanceableField,
  originalValue: unknown,
  suggestedValue: unknown,
  confidence?: number
) {
  if (!payeeId) return;
  recordEnhancementMutation.mutate({
    payeeId,
    fieldName,
    mode: 'llm',
    originalValue,
    suggestedValue,
    appliedValue: suggestedValue,
    confidence: confidence ?? undefined,
  });
}

// Apply suggestions to form fields
function applySuggestions(suggestions: PayeeDetailsSuggestions, scope: string | 'all') {
  const confidence = suggestions.confidence ?? undefined;

  if (scope === 'all' || scope === 'name') {
    if (suggestions.enhancedName) {
      const originalValue = $formData.name;
      $formData.name = suggestions.enhancedName;
      recordFieldEnhancement('name', originalValue, suggestions.enhancedName, confidence);
    }
  }
  if (scope === 'all' || scope === 'payeeType') {
    if (suggestions.payeeType) {
      const originalValue = $formData.payeeType;
      $formData.payeeType = suggestions.payeeType;
      recordFieldEnhancement('payeeType', originalValue, suggestions.payeeType, confidence);
    }
  }
  if (scope === 'all' || scope === 'paymentFrequency') {
    if (suggestions.paymentFrequency) {
      const originalValue = $formData.paymentFrequency;
      $formData.paymentFrequency = suggestions.paymentFrequency;
      recordFieldEnhancement('paymentFrequency', originalValue, suggestions.paymentFrequency, confidence);
    }
  }
  if (scope === 'all' || scope === 'defaultCategoryId') {
    if (suggestions.suggestedCategoryId) {
      const originalValue = $formData.defaultCategoryId;
      $formData.defaultCategoryId = suggestions.suggestedCategoryId.toString();
      recordFieldEnhancement('defaultCategoryId', originalValue, suggestions.suggestedCategoryId, confidence);
    }
  }
  if (scope === 'all' || scope === 'taxRelevant') {
    if (suggestions.taxRelevant !== null) {
      const originalValue = $formData.taxRelevant;
      $formData.taxRelevant = suggestions.taxRelevant;
      recordFieldEnhancement('taxRelevant', originalValue, suggestions.taxRelevant, confidence);
    }
  }
  if (scope === 'all' || scope === 'isSeasonal') {
    if (suggestions.isSeasonal !== null) {
      const originalValue = $formData.isSeasonal;
      $formData.isSeasonal = suggestions.isSeasonal;
      recordFieldEnhancement('isSeasonal', originalValue, suggestions.isSeasonal, confidence);
    }
  }
}

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
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'payee-name',
                  title: 'Enhance Name',
                  modes: ['llm'],
                  order: 1,
                  onTrigger: async () => handleNameAction()
                }}
              >
                <Input
                  {...props}
                  bind:value={$formData.name}
                  placeholder="e.g., Starbucks, Netflix, Electric Company"
                />
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.name}
                onModeChange={(m) => (fieldModes.name = m)}
                onAction={() => handleNameAction()}
                isPending={isGlobalApplying || enhancingField === 'name'}
                disabled={!$formData.name?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('name')}
                enhancedAt={getEnhancementInfo('name')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('name')?.lastConfidence}
              />
            </div>
            <Form.FieldErrors />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <!-- Payee Type -->
      <Form.Field form={entityForm} name="payeeType">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Payee Type</Form.Label>
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'payee-type',
                  title: 'Infer Type',
                  modes: ['llm'],
                  order: 2,
                  onTrigger: async () => handleFieldAction('payeeType')
                }}
              >
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
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.payeeType}
                onModeChange={(m) => (fieldModes.payeeType = m)}
                onAction={() => handleFieldAction('payeeType')}
                isPending={isGlobalApplying || enhancingField === 'payeeType'}
                disabled={!$formData.name?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('payeeType')}
                enhancedAt={getEnhancementInfo('payeeType')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('payeeType')?.lastConfidence}
              />
            </div>
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
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'payment-frequency',
                  title: 'Infer Frequency',
                  modes: ['llm'],
                  order: 3,
                  onTrigger: async () => handleFieldAction('paymentFrequency')
                }}
              >
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
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.paymentFrequency}
                onModeChange={(m) => (fieldModes.paymentFrequency = m)}
                onAction={() => handleFieldAction('paymentFrequency')}
                isPending={isGlobalApplying || enhancingField === 'paymentFrequency'}
                disabled={!$formData.name?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('paymentFrequency')}
                enhancedAt={getEnhancementInfo('paymentFrequency')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('paymentFrequency')?.lastConfidence}
              />
            </div>
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
            <div class="flex gap-2">
              <div
                class="flex-1"
                use:intelligenceInput={{
                  id: 'default-category',
                  title: 'Suggest Category',
                  modes: ['llm'],
                  order: 4,
                  onTrigger: async () => handleFieldAction('defaultCategoryId')
                }}
              >
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
              </div>
              <IntelligenceModeToggle
                mode={fieldModes.defaultCategoryId}
                onModeChange={(m) => (fieldModes.defaultCategoryId = m)}
                onAction={() => handleFieldAction('defaultCategoryId')}
                isPending={isGlobalApplying || enhancingField === 'defaultCategoryId'}
                disabled={!$formData.name?.trim()}
                disabledModes={disabledModes}
                variant="icon"
                isEnhanced={isFieldEnhanced('defaultCategoryId')}
                enhancedAt={getEnhancementInfo('defaultCategoryId')?.lastEnhancedAt}
                enhancedConfidence={getEnhancementInfo('defaultCategoryId')?.lastConfidence}
              />
            </div>
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
      <div
        class="hover:bg-accent/50 relative flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors"
        use:intelligenceInput={{
          id: 'tax-relevant',
          title: 'Infer Tax Relevance',
          modes: ['llm'],
          order: 5,
          onTrigger: async () => handleFieldAction('taxRelevant')
        }}
      >
        <div class="flex h-5 items-center">
          <Switch id="payee-tax-relevant" bind:checked={$formData.taxRelevant} />
        </div>
        <label for="payee-tax-relevant" class="flex-1 cursor-pointer">
          <div class="font-medium">Tax Relevant</div>
          <p class="text-muted-foreground mt-1 text-xs">
            Mark if expenses to this payee are tax-deductible or need to be reported
          </p>
        </label>
        <div class="shrink-0">
          <IntelligenceModeToggle
            mode={fieldModes.taxRelevant}
            onModeChange={(m) => (fieldModes.taxRelevant = m)}
            onAction={() => handleFieldAction('taxRelevant')}
            isPending={isGlobalApplying || enhancingField === 'taxRelevant'}
            disabled={!$formData.name?.trim()}
            disabledModes={disabledModes}
            variant="icon"
            isEnhanced={isFieldEnhanced('taxRelevant')}
            enhancedAt={getEnhancementInfo('taxRelevant')?.lastEnhancedAt}
            enhancedConfidence={getEnhancementInfo('taxRelevant')?.lastConfidence}
          />
        </div>
      </div>

      <!-- Seasonal -->
      <div
        class="hover:bg-accent/50 relative flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors"
        use:intelligenceInput={{
          id: 'is-seasonal',
          title: 'Infer Seasonality',
          modes: ['llm'],
          order: 6,
          onTrigger: async () => handleFieldAction('isSeasonal')
        }}
      >
        <div class="flex h-5 items-center">
          <Switch id="payee-seasonal" bind:checked={$formData.isSeasonal} />
        </div>
        <label for="payee-seasonal" class="flex-1 cursor-pointer">
          <div class="font-medium">Seasonal Payee</div>
          <p class="text-muted-foreground mt-1 text-xs">
            Payments only occur during specific times of year (e.g., landscaping, heating)
          </p>
        </label>
        <div class="shrink-0">
          <IntelligenceModeToggle
            mode={fieldModes.isSeasonal}
            onModeChange={(m) => (fieldModes.isSeasonal = m)}
            onAction={() => handleFieldAction('isSeasonal')}
            isPending={isGlobalApplying || enhancingField === 'isSeasonal'}
            disabled={!$formData.name?.trim()}
            disabledModes={disabledModes}
            variant="icon"
            isEnhanced={isFieldEnhanced('isSeasonal')}
            enhancedAt={getEnhancementInfo('isSeasonal')?.lastEnhancedAt}
            enhancedConfidence={getEnhancementInfo('isSeasonal')?.lastConfidence}
          />
        </div>
      </div>

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
